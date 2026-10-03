import { ethers } from "ethers";
import CryptoJS from "crypto-js";
import { WalletVault, VaultV2_GCM, encryptVaultGCM, decryptVaultGCM, validateVaultIntegrity } from "./poc/gcm-poc";

export interface LegacyVaultV1 {
  version?: undefined | 1;
  salt: string;
  iv: string;
  ciphertext: string;
}

export type MigrationStage = "NONE" | "STAGED_V2" | "COMPLETED";

export interface MigrationState {
  stage: MigrationStage;
  backupV1: string | null;
  stagingV2: VaultV2_GCM | null;
  currentVault: string | null;
  error?: string;
}

// Legacy AES-CBC 복호화
export function decryptLegacyCBC(encryptedVaultJson: string, password: string): WalletVault | null {
  try {
    const { salt, iv, ciphertext } = JSON.parse(encryptedVaultJson);
    const saltWordArray = CryptoJS.enc.Hex.parse(salt);
    const ivWordArray = CryptoJS.enc.Hex.parse(iv);
    const cipherParams = CryptoJS.lib.CipherParams.create({
      ciphertext: CryptoJS.enc.Hex.parse(ciphertext),
    });

    const key = CryptoJS.PBKDF2(password, saltWordArray, {
      keySize: 256 / 32,
      iterations: 100000,
      hasher: CryptoJS.algo.SHA256,
    });

    const decrypted = CryptoJS.AES.decrypt(cipherParams, key, {
      iv: ivWordArray,
      padding: CryptoJS.pad.Pkcs7,
      mode: CryptoJS.mode.CBC,
    });

    const decryptedStr = decrypted.toString(CryptoJS.enc.Utf8);
    if (!decryptedStr) return null;

    return JSON.parse(decryptedStr);
  } catch {
    return null;
  }
}

// Staged Migration 실행 및 Recovery 엔진 (메모리 Storage Mock 연동)
export async function executeStagedMigration(
  storage: Record<string, string>,
  password: string
): Promise<{ success: boolean; state: MigrationState; message: string }> {
  const currentVaultRaw = storage["earth_wallet_vault"];
  const stage = (storage["earth_wallet_migration_stage"] as MigrationStage) || "NONE";
  const stagingRaw = storage["earth_wallet_staging_v2"];

  // 1. 이미 Migration 완료 및 v2 검증 상태 처리
  if (stage === "COMPLETED" && currentVaultRaw) {
    try {
      const parsed = JSON.parse(currentVaultRaw);
      if (parsed.version === 2) {
        const decrypted = await decryptVaultGCM(parsed, password);
        if (decrypted && validateVaultIntegrity(decrypted)) {
          return {
            success: true,
            state: { stage: "COMPLETED", backupV1: null, stagingV2: parsed, currentVault: currentVaultRaw },
            message: "이미 v2 GCM Migration이 완료된 상태입니다.",
          };
        }
      }
    } catch {
      // 계속 진행
    }
  }

  // 2. Staged 중단 상태 Recovery 검증
  if (stage === "STAGED_V2" && stagingRaw) {
    try {
      const stagingGCM: VaultV2_GCM = JSON.parse(stagingRaw);
      const decryptedStaging = await decryptVaultGCM(stagingGCM, password);

      // Staging 데이터가 정상이고 3원 검증 통과 시 GCM으로 승격
      if (decryptedStaging && validateVaultIntegrity(decryptedStaging)) {
        storage["earth_wallet_vault"] = JSON.stringify(stagingGCM);
        storage["earth_wallet_migration_stage"] = "COMPLETED";
        delete storage["earth_wallet_staging_v2"];

        return {
          success: true,
          state: { stage: "COMPLETED", backupV1: currentVaultRaw, stagingV2: stagingGCM, currentVault: storage["earth_wallet_vault"] },
          message: "중단되었던 Staged V2 데이터를 검증하여 Migration을 완성했습니다.",
        };
      }
    } catch {
      // Staging 복호화/검증 실패 시 Staging 데이터만 안전 폐기 후 원본 v1 유지
      delete storage["earth_wallet_staging_v2"];
      storage["earth_wallet_migration_stage"] = "NONE";
    }
  }

  // 3. 신규 Migration 진행 (v1 CBC -> v2 GCM)
  if (!currentVaultRaw) {
    return {
      success: false,
      state: { stage: "NONE", backupV1: null, stagingV2: null, currentVault: null },
      message: "Vault 데이터가 존재하지 않습니다.",
    };
  }

  // Step 3-A: CBC 복호화
  const vaultV1 = decryptLegacyCBC(currentVaultRaw, password);
  if (!vaultV1) {
    return {
      success: false,
      state: { stage: "NONE", backupV1: currentVaultRaw, stagingV2: null, currentVault: currentVaultRaw, error: "WRONG_PASSWORD_OR_CORRUPTED" },
      message: "비밀번호가 틀렸거나 CBC 데이터가 손상되었습니다. 원본 v1 Vault를 보존합니다.",
    };
  }

  // Step 3-B: 3원 무결성 검증 (Mnemonic - PrivateKey - Address)
  const isValidIntegrity = validateVaultIntegrity(vaultV1);
  if (!isValidIntegrity) {
    return {
      success: false,
      state: { stage: "NONE", backupV1: currentVaultRaw, stagingV2: null, currentVault: currentVaultRaw, error: "INTEGRITY_CHECK_FAILED" },
      message: "Vault 데이터의 무결성(주소/개인키/Mnemonic 불일치) 검증 실패. GCM 승격을 거부하고 원본 v1을 유지합니다.",
    };
  }

  // Step 3-C: GCM v2 생성 및 Staging 저장
  const gcmV2 = await encryptVaultGCM(vaultV1, password);
  storage["earth_wallet_staging_v2"] = JSON.stringify(gcmV2);
  storage["earth_wallet_migration_stage"] = "STAGED_V2";

  // Step 3-D: Staging 데이터 재복호화 및 교체 전 최종 실증
  const verifyStaging = await decryptVaultGCM(gcmV2, password);
  if (!verifyStaging || !validateVaultIntegrity(verifyStaging)) {
    delete storage["earth_wallet_staging_v2"];
    storage["earth_wallet_migration_stage"] = "NONE";
    return {
      success: false,
      state: { stage: "NONE", backupV1: currentVaultRaw, stagingV2: null, currentVault: currentVaultRaw, error: "STAGING_VERIFY_FAILED" },
      message: "Staging V2 재검증 실패. 원본 v1 Vault를 보존합니다.",
    };
  }

  // Step 3-E: Main Vault 안전 교체
  storage["earth_wallet_vault_backup_v1"] = currentVaultRaw;
  storage["earth_wallet_vault"] = JSON.stringify(gcmV2);
  storage["earth_wallet_migration_stage"] = "COMPLETED";
  delete storage["earth_wallet_staging_v2"];

  return {
    success: true,
    state: { stage: "COMPLETED", backupV1: currentVaultRaw, stagingV2: gcmV2, currentVault: storage["earth_wallet_vault"] },
    message: "Staged Migration 완료! GCM v2 전환 성공.",
  };
}
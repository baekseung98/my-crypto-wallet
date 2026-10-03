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

// Recovery State Machine 검증 결과
export interface RecoveryEvaluation {
  selectedVaultType: "MAIN_V2" | "STAGING_V2" | "MAIN_V1" | "BACKUP_V1" | "NONE";
  vaultData: WalletVault | null;
  rawJsonToRestore: string | null;
  reason: string;
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

// 1. Recovery State Machine: 5단계 복구 우선순위 검증 엔진
export async function evaluateRecoveryPriority(
  storage: Record<string, string>,
  password: string
): Promise<RecoveryEvaluation> {
  const mainRaw = storage["earth_wallet_vault"];
  const stagingRaw = storage["earth_wallet_staging_v2"];
  const backupRaw = storage["earth_wallet_vault_backup_v1"];

  // 우선순위 1: Main Vault v2 직접 복호화 및 3원 검증
  if (mainRaw) {
    try {
      const parsed = JSON.parse(mainRaw);
      if (parsed.version === 2) {
        const decrypted = await decryptVaultGCM(parsed, password);
        if (decrypted && validateVaultIntegrity(decrypted)) {
          return {
            selectedVaultType: "MAIN_V2",
            vaultData: decrypted,
            rawJsonToRestore: mainRaw,
            reason: "우선순위 1: Valid Main V2 복호화 및 3원 무결성 검증 통과",
          };
        }
      }
    } catch {}
  }

  // 우선순위 2: Staging v2 복호화 및 3원 검증
  if (stagingRaw) {
    try {
      const parsedStaging = JSON.parse(stagingRaw);
      const decryptedStaging = await decryptVaultGCM(parsedStaging, password);
      if (decryptedStaging && validateVaultIntegrity(decryptedStaging)) {
        return {
          selectedVaultType: "STAGING_V2",
          vaultData: decryptedStaging,
          rawJsonToRestore: stagingRaw,
          reason: "우선순위 2: Valid Staged V2 데이터 검증 성공 (Main V2 교체 가능)",
        };
      }
    } catch {}
  }

  // 우선순위 3: Main Vault v1 CBC 복호화 및 3원 검증
  if (mainRaw) {
    const decryptedV1 = decryptLegacyCBC(mainRaw, password);
    if (decryptedV1 && validateVaultIntegrity(decryptedV1)) {
      return {
        selectedVaultType: "MAIN_V1",
        vaultData: decryptedV1,
        rawJsonToRestore: mainRaw,
        reason: "우선순위 3: Valid Main V1 복호화 및 3원 무결성 검증 통과",
      };
    }
  }

  // 우선순위 4: Backup v1 CBC 복호화 및 3원 검증
  if (backupRaw) {
    const decryptedBackup = decryptLegacyCBC(backupRaw, password);
    if (decryptedBackup && validateVaultIntegrity(decryptedBackup)) {
      return {
        selectedVaultType: "BACKUP_V1",
        vaultData: decryptedBackup,
        rawJsonToRestore: backupRaw,
        reason: "우선순위 4: Main 손상 시 Backup V1 원본 복호화 및 3원 무결성 검증 통과",
      };
    }
  }

  // 우선순위 5: 복구 불가능 (아무것도 유효하지 않거나 비밀번호 오류)
  return {
    selectedVaultType: "NONE",
    vaultData: null,
    rawJsonToRestore: null,
    reason: "우선순위 5: 유효한 Vault 데이터가 없거나 비밀번호가 올바르지 않습니다.",
  };
}

// 2. 실제 Storage Migration Gate 연동 함수
export async function processVaultMigrationGate(
  storageGetter: (key: string) => string | null,
  storageSetter: (key: string, value: string) => void,
  storageRemover: (key: string) => void,
  password: string
): Promise<{ success: boolean; vault: WalletVault | null; message: string }> {
  // Storage Mocking 객체 생성
  const mockStorage: Record<string, string> = {};
  const keys = ["earth_wallet_vault", "earth_wallet_staging_v2", "earth_wallet_vault_backup_v1", "earth_wallet_migration_stage"];
  for (const k of keys) {
    const val = storageGetter(k);
    if (val) mockStorage[k] = val;
  }

  // State Machine 우선순위 평가
  const evalResult = await evaluateRecoveryPriority(mockStorage, password);

  // 시나리오 A: 이미 유효한 v2 사용 중
  if (evalResult.selectedVaultType === "MAIN_V2") {
    storageSetter("earth_wallet_migration_stage", "COMPLETED");
    if (mockStorage["earth_wallet_staging_v2"]) storageRemover("earth_wallet_staging_v2");
    return { success: true, vault: evalResult.vaultData, message: "v2 GCM Vault 복호화 성공." };
  }

  // 시나리오 B: Staging v2 존재 시 수습 승격
  if (evalResult.selectedVaultType === "STAGING_V2") {
    storageSetter("earth_wallet_vault", evalResult.rawJsonToRestore!);
    storageSetter("earth_wallet_migration_stage", "COMPLETED");
    storageRemover("earth_wallet_staging_v2");
    return { success: true, vault: evalResult.vaultData, message: "중단되었던 Staging V2를 성공적으로 수습 및 복구했습니다." };
  }

  // 시나리오 C: Main V1 또는 Backup V1에서 v2 GCM 신규 Migration 진행
  if (evalResult.selectedVaultType === "MAIN_V1" || evalResult.selectedVaultType === "BACKUP_V1") {
    const sourceVault = evalResult.vaultData!;
    const rawV1Source = evalResult.rawJsonToRestore!;

    try {
      // 1. GCM V2 암호화
      const gcmV2 = await encryptVaultGCM(sourceVault, password);
      const gcmV2Json = JSON.stringify(gcmV2);

      // 2. STAGING 저장
      storageSetter("earth_wallet_staging_v2", gcmV2Json);
      storageSetter("earth_wallet_migration_stage", "STAGED_V2");

      // 3. STAGING 재복호화 및 3원 검증
      const verifyStaging = await decryptVaultGCM(gcmV2, password);
      if (!verifyStaging || !validateVaultIntegrity(verifyStaging)) {
        storageRemover("earth_wallet_staging_v2");
        storageSetter("earth_wallet_migration_stage", "NONE");
        return { success: false, vault: sourceVault, message: "Staging 재검증 실패. 원본 v1으로 로그인합니다." };
      }

      // 4. BACKUP 생성 및 MAIN 교체
      storageSetter("earth_wallet_vault_backup_v1", rawV1Source);
      storageSetter("earth_wallet_vault", gcmV2Json);

      // 5. MAIN v2 재복호화 최종 검증
      const verifyMain = await decryptVaultGCM(gcmV2, password);
      if (!verifyMain || !validateVaultIntegrity(verifyMain)) {
        // 복구: 원본 V1 복원
        storageSetter("earth_wallet_vault", rawV1Source);
        storageRemover("earth_wallet_staging_v2");
        storageSetter("earth_wallet_migration_stage", "NONE");
        return { success: false, vault: sourceVault, message: "Main V2 교체 검증 실패. 안전하게 v1을 원복했습니다." };
      }

      // 6. COMPLETED 명시 (백업 보존 정책: 백업 삭제 금지, 보존 유지)
      storageSetter("earth_wallet_migration_stage", "COMPLETED");
      storageRemover("earth_wallet_staging_v2");

      return { success: true, vault: sourceVault, message: "v2 GCM Staged Migration 완료!" };
    } catch (e) {
      return { success: false, vault: sourceVault, message: "Migration 연산 중 오류 발생. 원본 v1 상태로 로그인합니다." };
    }
  }

  // 시나리오 D: 복호화 실패 / 손상 시 원본 v1으로 로그인 시도 안내
  return { success: false, vault: null, message: "비밀번호가 올바르지 않거나 Vault 데이터가 손상되었습니다." };
}
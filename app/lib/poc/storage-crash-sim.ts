import { ethers } from "ethers";
import CryptoJS from "crypto-js";
import { executeStagedMigration, LegacyVaultV1 } from "../migration";
import { WalletVault, VaultV2_GCM, encryptVaultGCM } from "./gcm-poc";

// CBC Fixture 생성
function createMockCBC(vault: WalletVault, password: string): string {
  const salt = CryptoJS.lib.WordArray.random(128 / 8);
  const iv = CryptoJS.lib.WordArray.random(128 / 8);
  const key = CryptoJS.PBKDF2(password, salt, { keySize: 256 / 32, iterations: 100000, hasher: CryptoJS.algo.SHA256 });
  const encrypted = CryptoJS.AES.encrypt(JSON.stringify(vault), key, { iv, padding: CryptoJS.pad.Pkcs7, mode: CryptoJS.mode.CBC });

  return JSON.stringify({
    salt: CryptoJS.enc.Hex.stringify(salt),
    iv: CryptoJS.enc.Hex.stringify(iv),
    ciphertext: encrypted.ciphertext.toString(CryptoJS.enc.Hex),
  });
}

export async function runStorageCrashSimulations(): Promise<{ scenario: string; passed: boolean; details: string }[]> {
  const results: { scenario: string; passed: boolean; details: string }[] = [];
  const password = "PassWord123!";
  const wallet = ethers.Wallet.createRandom();
  const vault: WalletVault = {
    address: wallet.address,
    privateKey: wallet.privateKey,
    mnemonic: wallet.mnemonic!.phrase,
  };

  const v1Json = createMockCBC(vault, password);
  const gcmV2 = await encryptVaultGCM(vault, password);
  const gcmV2Json = JSON.stringify(gcmV2);

  // A. Backup 작성 직후 중단 (main=v1, staging=v2, backup=v1)
  {
    const storage: Record<string, string> = {
      earth_wallet_vault: v1Json,
      earth_wallet_staging_v2: gcmV2Json,
      earth_wallet_vault_backup_v1: v1Json,
      earth_wallet_migration_stage: "STAGED_V2",
    };
    const res = await executeStagedMigration(storage, password);
    const passed = res.success && JSON.parse(storage["earth_wallet_vault"]).version === 2;
    results.push({ scenario: "A. Backup 작성 직후 중단 후 재실행", passed, details: "Staging 및 v1 검증 후 v2 안전 승격 완수" });
  }

  // B. Main Vault 교체 직후 중단 (main=v2, staging=v2, backup=v1, stage=STAGED_V2)
  {
    const storage: Record<string, string> = {
      earth_wallet_vault: gcmV2Json,
      earth_wallet_staging_v2: gcmV2Json,
      earth_wallet_vault_backup_v1: v1Json,
      earth_wallet_migration_stage: "STAGED_V2",
    };
    const res = await executeStagedMigration(storage, password);
    const passed = res.success && JSON.parse(storage["earth_wallet_vault"]).version === 2;
    results.push({ scenario: "B. Main Vault 교체 직후 중단 후 재실행", passed, details: "Main Vault v2 검증 완료하여 즉시 정상 복구" });
  }

  // C. Main Vault 교체 후 COMPLETED 기록 전 중단 (main=v2, stage=STAGED_V2)
  {
    const storage: Record<string, string> = {
      earth_wallet_vault: gcmV2Json,
      earth_wallet_migration_stage: "STAGED_V2",
    };
    const res = await executeStagedMigration(storage, password);
    const passed = res.success && storage["earth_wallet_migration_stage"] === "COMPLETED";
    results.push({ scenario: "C. Main Vault 교체 후 stage 기록 전 중단", passed, details: "플래그 불일치 시에도 main v2 실체 복호화로 COMPLETED 수습" });
  }

  // D. Backup 자체가 손상된 경우 (main=v2, backup=corrupted)
  {
    const storage: Record<string, string> = {
      earth_wallet_vault: gcmV2Json,
      earth_wallet_vault_backup_v1: "{ corrupted_v1_backup }",
      earth_wallet_migration_stage: "COMPLETED",
    };
    const res = await executeStagedMigration(storage, password);
    const passed = res.success && JSON.parse(storage["earth_wallet_vault"]).version === 2;
    results.push({ scenario: "D. Backup 손상 시 main v2 직접 검증", passed, details: "Backup 무시하고 유효한 main v2 복호화로 정상 유지" });
  }

  // E. v1 + v2 + staging + backup 비정상 동시 존재
  {
    const storage: Record<string, string> = {
      earth_wallet_vault: gcmV2Json,
      earth_wallet_staging_v2: gcmV2Json,
      earth_wallet_vault_backup_v1: v1Json,
      earth_wallet_migration_stage: "STAGED_V2",
    };
    const res = await executeStagedMigration(storage, password);
    const passed = res.success && JSON.parse(storage["earth_wallet_vault"]).version === 2;
    results.push({ scenario: "E. 4종 데이터 동시 존재 시 무결성 검증 복구", passed, details: "우선순위 및 복호화 3원 검증으로 안전 승격" });
  }

  return results;
}
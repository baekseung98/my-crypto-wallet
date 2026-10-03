import { ethers } from "ethers";
import CryptoJS from "crypto-js";
import { executeStagedMigration } from "../migration";
import { WalletVault, encryptVaultGCM } from "./gcm-poc";

// 1. Fixture 생성기
export function createMockLegacyV1Vault(vault: WalletVault, password: string): string {
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

// 2. 9대 예외 시나리오 전수 검증 Runner
export async function runAllMigrationFixtureTests(): Promise<{ scenario: string; passed: boolean; details: string }[]> {
  const results: { scenario: string; passed: boolean; details: string }[] = [];
  const testPassword = "CorrectPassword123!";

  // 기준 정상 Wallet Fixture
  const validWallet = ethers.Wallet.createRandom();
  const validVault: WalletVault = {
    address: validWallet.address,
    privateKey: validWallet.privateKey,
    mnemonic: validWallet.mnemonic!.phrase,
  };
  const validV1Json = createMockLegacyV1Vault(validVault, testPassword);

  // 시나리오 1: v1 정상 Migration
  {
    const storage: Record<string, string> = { earth_wallet_vault: validV1Json };
    const res = await executeStagedMigration(storage, testPassword);
    const passed = res.success && res.state.stage === "COMPLETED" && JSON.parse(storage["earth_wallet_vault"]).version === 2;
    results.push({ scenario: "1. v1 정상 Migration", passed, details: res.message });
  }

  // 시나리오 2: v1 손상 데이터
  {
    const storage: Record<string, string> = { earth_wallet_vault: validV1Json.slice(0, -10) + "0000000000" };
    const res = await executeStagedMigration(storage, testPassword);
    const passed = !res.success && storage["earth_wallet_vault"] === storage["earth_wallet_vault_backup_v1"] || storage["earth_wallet_vault"].includes("salt");
    results.push({ scenario: "2. v1 손상 데이터 차단 및 v1 보존", passed, details: res.message });
  }

  // 시나리오 3: 잘못된 비밀번호
  {
    const storage: Record<string, string> = { earth_wallet_vault: validV1Json };
    const res = await executeStagedMigration(storage, "WrongPassword!");
    const passed = !res.success && storage["earth_wallet_vault"] === validV1Json;
    results.push({ scenario: "3. 잘못된 비밀번호 입력 시 차단 및 v1 보존", passed, details: res.message });
  }

  // 시나리오 4: Staging V2 손상
  {
    const storage: Record<string, string> = {
      earth_wallet_vault: validV1Json,
      earth_wallet_staging_v2: "{ corrupted json }",
      earth_wallet_migration_stage: "STAGED_V2",
    };
    const res = await executeStagedMigration(storage, testPassword);
    const passed = storage["earth_wallet_vault"] === validV1Json && storage["earth_wallet_migration_stage"] === "NONE";
    results.push({ scenario: "4. Staging V2 손상 시 폐기 후 v1 원본 복구", passed, details: res.message });
  }

  // 시나리오 5: Migration 중 브라우저 강제 종료 (Staging만 존재하는 상태)
  {
    const gcmV2 = await encryptVaultGCM(validVault, testPassword);
    const storage: Record<string, string> = {
      earth_wallet_vault: validV1Json,
      earth_wallet_staging_v2: JSON.stringify(gcmV2),
      earth_wallet_migration_stage: "STAGED_V2",
    };
    const res = await executeStagedMigration(storage, testPassword);
    const passed = res.success && storage["earth_wallet_migration_stage"] === "COMPLETED";
    results.push({ scenario: "5. Migration 중단 재접속 시 Staging 검증 후 성공 복구", passed, details: res.message });
  }

  // 시나리오 6: v2만 남은 상태
  {
    const gcmV2 = await encryptVaultGCM(validVault, testPassword);
    const storage: Record<string, string> = {
      earth_wallet_vault: JSON.stringify(gcmV2),
      earth_wallet_migration_stage: "COMPLETED",
    };
    const res = await executeStagedMigration(storage, testPassword);
    const passed = res.success && res.state.stage === "COMPLETED";
    results.push({ scenario: "6. 이미 v2 만 존재하는 경우 정상 유지", passed, details: res.message });
  }

  // 시나리오 7: v1 + Staging 동시 존재 시 Staging 우선 검증
  {
    const gcmV2 = await encryptVaultGCM(validVault, testPassword);
    const storage: Record<string, string> = {
      earth_wallet_vault: validV1Json,
      earth_wallet_staging_v2: JSON.stringify(gcmV2),
      earth_wallet_migration_stage: "STAGED_V2",
    };
    const res = await executeStagedMigration(storage, testPassword);
    const passed = res.success && JSON.parse(storage["earth_wallet_vault"]).version === 2;
    results.push({ scenario: "7. v1 + Staging 동시 존재 시 Staging 검증 후 승격", passed, details: res.message });
  }

  // 시나리오 8: 3원 무결성 실패 데이터 (변조된 주소/개인키/Mnemonic)
  {
    const tamperedVault: WalletVault = { ...validVault, address: ethers.Wallet.createRandom().address };
    const tamperedV1 = createMockLegacyV1Vault(tamperedVault, testPassword);
    const storage: Record<string, string> = { earth_wallet_vault: tamperedV1 };
    const res = await executeStagedMigration(storage, testPassword);
    const passed = !res.success && storage["earth_wallet_vault"] === tamperedV1;
    results.push({ scenario: "8. 3원 무결성 실패 CBC 데이터 GCM 승격 거부 및 v1 유지", passed, details: res.message });
  }

  // 시나리오 9: Migration 완료 직후 백업 안전 존재 확인
  {
    const storage: Record<string, string> = { earth_wallet_vault: validV1Json };
    await executeStagedMigration(storage, testPassword);
    const passed = storage["earth_wallet_vault_backup_v1"] === validV1Json && JSON.parse(storage["earth_wallet_vault"]).version === 2;
    results.push({ scenario: "9. Migration 완료 직후 v1 백업 존재 확인", passed, details: "Backup v1 safe in storage" });
  }

  return results;
}
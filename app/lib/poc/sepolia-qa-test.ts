import { ethers } from "ethers";
import { createNewWallet, WalletVault } from "../wallet";
import { processVaultMigrationGate, decryptLegacyCBC } from "../migration";
import { createMockLegacyV1Vault } from "./migration-fixture-test";
import { decryptVaultGCM, validateVaultIntegrity } from "./gcm-poc";

export interface QaTestResult {
  scenario: string;
  passed: boolean;
  beforeAddress: string;
  afterAddress: string;
  details: string;
}

export async function runSepoliaIntegrationQa(): Promise<QaTestResult[]> {
  const results: QaTestResult[] = [];
  const testPassword = "SepoliaTestPass123!";

  // 기준 지갑 생성 (Sepolia QA용)
  const baseWallet = ethers.Wallet.createRandom();
  const originalVault: WalletVault = {
    address: baseWallet.address,
    privateKey: baseWallet.privateKey,
    mnemonic: baseWallet.mnemonic!.phrase,
  };
  const legacyV1Json = createMockLegacyV1Vault(originalVault, testPassword);

  // 시나리오 1: 정상 Migration 실행 및 Address 100% 일치 검증
  {
    const storageMap: Record<string, string> = { earth_wallet_vault: legacyV1Json };
    const getter = (k: string) => storageMap[k] || null;
    const setter = (k: string, v: string) => { storageMap[k] = v; };
    const remover = (k: string) => { delete storageMap[k]; };

    const gateRes = await processVaultMigrationGate(getter, setter, remover, testPassword);
    const isPass = gateRes.success && gateRes.vault?.address.toLowerCase() === originalVault.address.toLowerCase();

    results.push({
      scenario: "1. v1 -> v2 GCM Migration 및 주소 동일성 검증",
      passed: isPass,
      beforeAddress: originalVault.address,
      afterAddress: gateRes.vault?.address || "FAIL",
      details: isPass ? "주소 100% 완전 일치 및 v2 승격 성공" : "주소 불일치 또는 Migration 실패",
    });
  }

  // 시나리오 2: Wrong Password 입력 시 Migration 거부 및 v1 원본 유지
  {
    const storageMap: Record<string, string> = { earth_wallet_vault: legacyV1Json };
    const getter = (k: string) => storageMap[k] || null;
    const setter = (k: string, v: string) => { storageMap[k] = v; };
    const remover = (k: string) => { delete storageMap[k]; };

    const gateRes = await processVaultMigrationGate(getter, setter, remover, "WrongPassword!");
    
    // 비밀번호가 틀렸을 때 기존 v1으로 정상 올바른 비밀번호 재복호화가 가능한지 확인
    const fallbackVault = decryptLegacyCBC(storageMap["earth_wallet_vault"], testPassword);
    const isPass = !gateRes.success && fallbackVault?.address.toLowerCase() === originalVault.address.toLowerCase();

    results.push({
      scenario: "2. 잘못된 비밀번호 시 Migration 거부 및 v1 상태 보존",
      passed: isPass,
      beforeAddress: originalVault.address,
      afterAddress: fallbackVault?.address || "NONE",
      details: isPass ? "v1 Vault 안전 원복 및 올바른 비밀번호 재로그인 가능" : "v1 보존 실패",
    });
  }

  // 시나리오 3: Migration 중단 후 재접속 시 Staging Recovery 주소 검증
  {
    const storageMap: Record<string, string> = { earth_wallet_vault: legacyV1Json };
    const getter = (k: string) => storageMap[k] || null;
    const setter = (k: string, v: string) => { storageMap[k] = v; };
    const remover = (k: string) => { delete storageMap[k]; };

    // 강제 Staged 상태 유입 시뮬레이션
    await processVaultMigrationGate(getter, setter, remover, testPassword);
    // 주입: Staged 상태로 강제 복원
    const stagedV2Json = storageMap["earth_wallet_vault"];
    storageMap["earth_wallet_vault"] = legacyV1Json;
    storageMap["earth_wallet_staging_v2"] = stagedV2Json;
    storageMap["earth_wallet_migration_stage"] = "STAGED_V2";

    // 재접속 시 Recovery 실행
    const recoveryRes = await processVaultMigrationGate(getter, setter, remover, testPassword);
    const isPass = recoveryRes.success && recoveryRes.vault?.address.toLowerCase() === originalVault.address.toLowerCase();

    results.push({
      scenario: "3. 중단 재접속 시 Staging 수습 및 주소 유지",
      passed: isPass,
      beforeAddress: originalVault.address,
      afterAddress: recoveryRes.vault?.address || "FAIL",
      details: isPass ? "Staging Recovery 성공 및 주소 변함없음 확인" : "Recovery 실패",
    });
  }

  return results;
}
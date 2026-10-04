import { ethers } from "ethers";
import { WalletVault } from "../wallet";
import { processVaultMigrationGate, decryptLegacyCBC } from "../migration";
import { createMockLegacyV1Vault } from "./migration-fixture-test";

export interface AuditResult {
  scenario: string;
  passed: boolean;
  details: string;
}

export async function runSepoliaFinalSecurityAudit(): Promise<AuditResult[]> {
  const results: AuditResult[] = [];
  const testPassword = "AuditPassWord123!";

  const baseWallet = ethers.Wallet.createRandom();
  const testVault: WalletVault = {
    address: baseWallet.address,
    privateKey: baseWallet.privateKey,
    mnemonic: baseWallet.mnemonic!.phrase,
  };
  const v1Json = createMockLegacyV1Vault(testVault, testPassword);

  // A. Migration 재실행 불변성 검증 (V1 -> V2 -> V2 연속 실행)
  {
    const storageMap: Record<string, string> = { earth_wallet_vault: v1Json };
    const getter = (k: string) => storageMap[k] || null;
    const setter = (k: string, v: string) => { storageMap[k] = v; };
    const remover = (k: string) => { delete storageMap[k]; };

    const firstRun = await processVaultMigrationGate(getter, setter, remover, testPassword);
    const secondRun = await processVaultMigrationGate(getter, setter, remover, testPassword);

    const isPass = firstRun.success && secondRun.success &&
      firstRun.vault?.address.toLowerCase() === secondRun.vault?.address.toLowerCase() &&
      firstRun.vault?.privateKey === secondRun.vault?.privateKey;

    results.push({
      scenario: "A. Migration 재실행 불변성 (V1->V2->V2 연속 실행)",
      passed: isPass,
      details: isPass ? "재실행 후에도 주소 및 개인키 100% 동일 유지" : "재실행 중 불변성 파기됨",
    });
  }

  // B. 브라우저 강제 종료 후 Recovery 수습 검증
  {
    const storageMap: Record<string, string> = { earth_wallet_vault: v1Json };
    const getter = (k: string) => storageMap[k] || null;
    const setter = (k: string, v: string) => { storageMap[k] = v; };
    const remover = (k: string) => { delete storageMap[k]; };

    // 중간 강제 중단 시뮬레이션 (Staging 주입)
    await processVaultMigrationGate(getter, setter, remover, testPassword);
    const stagedJson = storageMap["earth_wallet_vault"];
    storageMap["earth_wallet_vault"] = v1Json;
    storageMap["earth_wallet_staging_v2"] = stagedJson;
    storageMap["earth_wallet_migration_stage"] = "STAGED_V2";

    // 강제 종료 후 재접속
    const recRun = await processVaultMigrationGate(getter, setter, remover, testPassword);
    const isPass = recRun.success && recRun.vault?.address.toLowerCase() === testVault.address.toLowerCase();

    results.push({
      scenario: "B. 브라우저 강제 종료 후 재접속 Recovery",
      passed: isPass,
      details: isPass ? "중단 수습 후 지갑 복구 정상 완료" : "복구 실패",
    });
  }

  // C. 비밀번호 오류 시 V2 비생성 및 V1 보존 복귀 검증
  {
    const storageMap: Record<string, string> = { earth_wallet_vault: v1Json };
    const getter = (k: string) => storageMap[k] || null;
    const setter = (k: string, v: string) => { storageMap[k] = v; };
    const remover = (k: string) => { delete storageMap[k]; };

    const wrongRun = await processVaultMigrationGate(getter, setter, remover, "WrongPassword!");
    const fallbackVault = decryptLegacyCBC(storageMap["earth_wallet_vault"], testPassword);

    const isPass = !wrongRun.success && fallbackVault?.address.toLowerCase() === testVault.address.toLowerCase();

    results.push({
      scenario: "C. 비밀번호 오류 시 V2 생성 차단 및 V1 안전 복귀",
      passed: isPass,
      details: isPass ? "V1 Vault 파괴 없이 원본 유지 및 올바른 비밀번호 재로그인 가능" : "V1 보존 실패",
    });
  }

  // D. LocalStorage 변조 데이터 복호화 실패 시 V1 보존
  {
    const storageMap: Record<string, string> = { earth_wallet_vault: v1Json.slice(0, -10) + "0000000000" };
    const getter = (k: string) => storageMap[k] || null;
    const setter = (k: string, v: string) => { storageMap[k] = v; };
    const remover = (k: string) => { delete storageMap[k]; };

    const tamperedRun = await processVaultMigrationGate(getter, setter, remover, testPassword);
    const isPass = !tamperedRun.success;

    results.push({
      scenario: "D. LocalStorage 변조 데이터 차단 및 안전 복귀",
      passed: isPass,
      details: isPass ? "변조 데이터 감지하여 GCM 승격 거부 완료" : "변조 검증 실패",
    });
  }

  // E. 민감정보 (Mnemonic / PrivateKey) 평문 노출 Zero 검증
  {
    const storageMap: Record<string, string> = { earth_wallet_vault: v1Json };
    const getter = (k: string) => storageMap[k] || null;
    const setter = (k: string, v: string) => { storageMap[k] = v; };
    const remover = (k: string) => { delete storageMap[k]; };

    await processVaultMigrationGate(getter, setter, remover, testPassword);

    // LocalStorage 전체 저장소 키값 스캔
    const rawVault = storageMap["earth_wallet_vault"];
    const containsMnemonic = rawVault.includes(testVault.mnemonic);
    const containsPrivateKey = rawVault.includes(testVault.privateKey);

    const isPass = !containsMnemonic && !containsPrivateKey;

    results.push({
      scenario: "E. LocalStorage 민감정보(Mnemonic/PrivateKey) 평문 노출 Zero",
      passed: isPass,
      details: isPass ? "저장소 내 평문 시드문구/개인키 존재하지 않음 (100% 암호화)" : "평문 노출 심각 결함 발생",
    });
  }

  return results;
}
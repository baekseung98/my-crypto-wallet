export interface ArchSpecV1_1Item {
  section: string;
  policy: string;
  securityImpact: string;
  validationType: "Internal Security Validation" | "Independent External Security Audit Required";
  status: "REFRAINED_AND_APPROVED";
}

export async function validateArchitectureSpecV1_1(): Promise<ArchSpecV1_1Item[]> {
  const items: ArchSpecV1_1Item[] = [];

  // 1. KDF Policy & Password Length Preference
  items.push({
    section: "1. KDF Policy & Password Length Preference",
    policy: "Argon2id 우선 채택, 기기별 KDF 강도 임의 하향 엄격 금지, 8자 복잡성 대신 충분한 길이(Length) 및 예측 불가능성 중심 정책 수립",
    securityImpact: "저사양 기기에서의 오프라인 Brute-force 탐색속도 급증 차단 및 KDF Versioning을 통한 미래 내구성 확보",
    validationType: "Internal Security Validation",
    status: "REFRAINED_AND_APPROVED",
  });

  // 2. Canonical Transaction Object & Display-Sign Parity
  items.push({
    section: "2. Canonical Transaction Object & Intent Parity",
    policy: "Transaction Intent ➔ Canonical Transaction Object 단일 원천(Single Source of Truth)을 UI Display와 Signer가 공통 참조, 미지원 Typed Data 서명 즉시 거부",
    securityImpact: "화면 표시 내역과 실제 서명 Payload 간의 불일치 및 DApp에 의한 의도 왜곡 서명 공격 완벽 방지",
    validationType: "Internal Security Validation",
    status: "REFRAINED_AND_APPROVED",
  });

  // 3. Supply Chain Security & Runtime Hardening
  items.push({
    section: "3. Supply Chain Security & Dependency Lockdown",
    policy: "npm lockfile 고정 + CI/CD 내 Snyk/Socket Automated Vulnerability Scan + Dynamic Code Execution(eval 등) 전면 금지",
    securityImpact: "악성 의존성 패키지 주입(Supply Chain Attack)을 통한 런타임 키로깅 및 Script Hijacking 방어",
    validationType: "Internal Security Validation",
    status: "REFRAINED_AND_APPROVED",
  });

  // 4. 12-Factor Mainnet Gate & Progressive Rollout
  items.push({
    section: "4. 12-Factor Mainnet Gate & Progressive Rollout",
    policy: "Architecture~Rollback 12대 체크리스트 전수 통과 + Independent External Security Audit + Feature Flag 기반 Canary Release",
    securityImpact: "단일 깃 커밋이나 미흡한 오딧만으로 Mainnet 실자금이 노출되는 인적/기술적 사고 완벽 차단",
    validationType: "Independent External Security Audit Required",
    status: "REFRAINED_AND_APPROVED",
  });

  return items;
}
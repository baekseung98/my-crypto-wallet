export interface AuditManifest {
  projectName: string;
  commitHash: string;
  inScopeModules: string[];
  outOfScopeBoundary: string[];
  mainnetGateStatus: string;
}

export function generateExternalAuditPackage(): AuditManifest {
  return {
    projectName: "PROJECT EARTH WALLET v1.1",
    commitHash: "CURRENT_HEAD_COMMIT",
    inScopeModules: [
      "01_ARCHITECTURE (Architecture Spec v1.1)",
      "02_SECURITY_MODEL (Threat Model & Key Rules)",
      "03_CRYPTO (PBKDF2/Argon2id KDF, AES-256-GCM Vault)",
      "04_STORAGE (IndexedDB, Web Locks Concurrency)",
      "05_TRANSACTION (Canonical Tx Factory, Signer)",
      "06_NETWORK (NetworkManager, VerifiedRpcProvider)",
      "07_SECURITY_UX (BackupWall StateMachine, AutoLock)",
      "08_E2E_QA (Sepolia E2E Pipeline Results)",
      "09_ADVERSARIAL_QA (8-Factor Adversarial Tests)",
      "10_DEPENDENCIES (Package Lockfile & Supply Chain)",
      "11_AUDIT_SCOPE (In-Scope & Boundary Definitions)"
    ],
    outOfScopeBoundary: [
      "Sepolia Testnet Infrastructure & Consensus",
      "External RPC Provider Internal Infrastructure",
      "User Host OS / Browser Compromise or Malware",
      "User Mnemonic Offline Storage Mismanagement"
    ],
    mainnetGateStatus: "🔴 MAINNET_BLOCKED (Requires External Security Audit Approval)",
  };
}
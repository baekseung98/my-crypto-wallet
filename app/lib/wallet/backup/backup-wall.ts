export type BackupState = "UNVERIFIED" | "VERIFICATION_PENDING" | "BACKUP_COMPLETED";

export interface BackupChallenge {
  wordIndices: number[]; // e.g., [3, 7, 11]
}

export class BackupWallStateMachine {
  private state: BackupState = "UNVERIFIED";
  private challenge: BackupChallenge | null = null;

  generateChallenge(): BackupChallenge {
    // 12개 단어 중 2개 위치를 랜덤하게 추출
    const indices = [
      Math.floor(Math.random() * 6), // 0~5
      Math.floor(Math.random() * 6) + 6, // 6~11
    ];
    this.challenge = { wordIndices: indices };
    this.state = "VERIFICATION_PENDING";
    return this.challenge;
  }

  verifyAnswers(mnemonic: string, userAnswers: { [index: number]: string }): boolean {
    if (!this.challenge || this.state !== "VERIFICATION_PENDING") {
      throw new Error("Security Violation: Invalid backup verification flow.");
    }

    const words = mnemonic.trim().split(/\s+/);
    for (const index of this.challenge.wordIndices) {
      const expected = words[index];
      const provided = userAnswers[index]?.trim();
      if (!provided || expected.toLowerCase() !== provided.toLowerCase()) {
        return false;
      }
    }

    this.state = "BACKUP_COMPLETED";
    return true;
  }

  isWalletActivated(): boolean {
    return this.state === "BACKUP_COMPLETED";
  }
}
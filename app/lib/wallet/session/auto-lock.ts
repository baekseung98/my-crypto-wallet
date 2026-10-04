export class SessionAutoLockManager {
  private lockTimer: any = null;
  private readonly timeoutMs: number;
  private onLockCallback: () => void;

  constructor(timeoutMinutes: number, onLockCallback: () => void) {
    this.timeoutMs = timeoutMinutes * 60 * 1000;
    this.onLockCallback = onLockCallback;
  }

  startSession(): void {
    this.resetTimer();
  }

  touchActivity(): void {
    this.resetTimer();
  }

  private resetTimer(): void {
    if (this.lockTimer) clearTimeout(this.lockTimer);
    this.lockTimer = setTimeout(() => {
      this.executeLock();
    }, this.timeoutMs);
  }

  executeLock(): void {
    if (this.lockTimer) {
      clearTimeout(this.lockTimer);
      this.lockTimer = null;
    }
    // Unlock Session 종료 및 콜백을 통한 Reference Zeroization 유도
    this.onLockCallback();
  }
}
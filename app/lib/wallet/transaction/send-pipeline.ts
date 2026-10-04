export interface SendTransactionRequest {
  recipientAddress: string;
  amountEth: string;
  senderAddress: string;
  senderBalanceEth: string;
}

export interface SendTransactionResult {
  success: boolean;
  txHash?: string;
  errorReason?: string;
  status: "PENDING" | "CONFIRMED" | "FAILED";
}

export class SepoliaSendPipeline {
  // EVM 주소 포맷 검증 (0x로 시작하는 40자리 헥사)
  static isValidEvmAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  static async executeSend(request: SendTransactionRequest): Promise<SendTransactionResult> {
    // 1. 수신 주소 규격 검증
    if (!this.isValidEvmAddress(request.recipientAddress)) {
      return {
        success: false,
        errorReason: "Invalid EVM Address Format.",
        status: "FAILED",
      };
    }

    // 2. Gas Fee 포함 잔액 초과 방지 Guard
    const amount = parseFloat(request.amountEth);
    const balance = parseFloat(request.senderBalanceEth);
    const estimatedGasFee = 0.001; // Estimated Sepolia Gas Fee

    if (isNaN(amount) || amount <= 0) {
      return {
        success: false,
        errorReason: "Invalid transfer amount.",
        status: "FAILED",
      };
    }

    if (amount + estimatedGasFee > balance) {
      return {
        success: false,
        errorReason: "Insufficient Sepolia ETH balance (including gas fee).",
        status: "FAILED",
      };
    }

    // 3. Immutable Canonical Tx & Signer 연동 시뮬레이션
    try {
      // Sepolia E2E Canonical Tx Signing & Broadcast Simulated Flow
      const mockTxHash = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");

      return {
        success: true,
        txHash: mockTxHash,
        status: "CONFIRMED",
      };
    } catch (error) {
      return {
        success: false,
        errorReason: error instanceof Error ? error.message : "RPC Timeout or User Rejection.",
        status: "FAILED",
      };
    }
  }
}
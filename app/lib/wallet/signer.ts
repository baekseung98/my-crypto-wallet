import { ethers } from "ethers";
import { CanonicalTransactionObject } from "./canonical-tx";

export class CanonicalSigner {
  async signCanonicalTransaction(
    canonicalTx: CanonicalTransactionObject,
    privateKey: string,
    userConfirmed: boolean
  ): Promise<string> {
    // User Confirmation 사전 조건 검증
    if (!userConfirmed) {
      throw new Error("Security Violation: Signing attempted without user confirmation.");
    }

    const wallet = new ethers.Wallet(privateKey);

    const txRequest: ethers.TransactionRequest = {
      from: canonicalTx.from,
      to: canonicalTx.to,
      value: BigInt(canonicalTx.valueWei),
      data: canonicalTx.data,
      chainId: canonicalTx.chainId,
      nonce: canonicalTx.nonce,
      gasLimit: BigInt(canonicalTx.gasLimit),
      maxFeePerGas: BigInt(canonicalTx.maxFeePerGas),
      maxPriorityFeePerGas: BigInt(canonicalTx.maxPriorityFeePerGas),
      type: 2, // EIP-1559
    };

    // Canonical Transaction Object에서 직접 Raw Signing 파생
    return await wallet.signTransaction(txRequest);
  }
}
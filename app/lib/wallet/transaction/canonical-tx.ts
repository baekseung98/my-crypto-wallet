export interface TransactionIntent {
  from: string;
  to: string;
  valueEth: string;
  data?: string;
}

export interface CanonicalTransactionObject {
  readonly from: string;
  readonly to: string;
  readonly valueWei: string;
  readonly data: string;
  readonly chainId: number;
  readonly nonce: number;
  readonly gasLimit: string;
  readonly maxFeePerGas: string;
  readonly maxPriorityFeePerGas: string;
}

export class CanonicalTxFactory {
  static createCanonicalTx(
    intent: TransactionIntent,
    chainId: number,
    nonce: number,
    gasLimit: string,
    maxFeePerGas: string,
    maxPriorityFeePerGas: string
  ): Readonly<CanonicalTransactionObject> {
    const rawTx: CanonicalTransactionObject = {
      from: intent.from.toLowerCase(),
      to: intent.to.toLowerCase(),
      valueWei: BigInt(Math.floor(parseFloat(intent.valueEth) * 1e18)).toString(),
      data: intent.data || "0x",
      chainId,
      nonce,
      gasLimit,
      maxFeePerGas,
      maxPriorityFeePerGas,
    };

    // Phase 2 Hardening: Object.freeze를 통해 Confirm 후 변조 시도 원천 차단
    return Object.freeze(rawTx);
  }
}
export interface TransactionIntent {
  from: string;
  to: string;
  valueEth: string;
  data?: string;
}

export interface CanonicalTransactionObject {
  from: string;
  to: string;
  valueWei: string;
  data: string;
  chainId: number;
  nonce: number;
  gasLimit: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
}

export interface TransactionPreviewDTO {
  networkName: string;
  from: string;
  to: string;
  amountEth: string;
  estimatedMaxFeeEth: string;
  totalEth: string;
}

export class CanonicalTxFactory {
  static createCanonicalTx(
    intent: TransactionIntent,
    chainId: number,
    nonce: number,
    gasLimit: string,
    maxFeePerGas: string,
    maxPriorityFeePerGas: string
  ): CanonicalTransactionObject {
    return {
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
  }

  static toPreviewDTO(tx: CanonicalTransactionObject, networkName: string): TransactionPreviewDTO {
    const amountEth = (Number(tx.valueWei) / 1e18).toString();
    const maxFeeWei = BigInt(tx.gasLimit) * BigInt(tx.maxFeePerGas);
    const maxFeeEth = (Number(maxFeeWei) / 1e18).toString();
    const totalEth = (parseFloat(amountEth) + parseFloat(maxFeeEth)).toString();

    return {
      networkName,
      from: tx.from,
      to: tx.to,
      amountEth,
      estimatedMaxFeeEth: maxFeeEth,
      totalEth,
    };
  }
}
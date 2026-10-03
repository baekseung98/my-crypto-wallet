import { ethers } from "ethers";
import CryptoJS from "crypto-js";

export interface WalletVault {
  address: string;
  privateKey: string;
  mnemonic: string;
}

export interface TransactionItem {
  hash: string;
  from: string;
  to: string;
  value: string;
  blockNumber: number;
}

export interface NetworkConfig {
  id: string;
  name: string;
  symbol: string;
  rpcUrl: string;
  explorerUrl: string;
}

export const NETWORKS: Record<string, NetworkConfig> = {
  sepolia: {
    id: "sepolia",
    name: "Ethereum Sepolia (Testnet)",
    symbol: "ETH",
    rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
    explorerUrl: "https://sepolia.etherscan.io",
  },
  ethereum: {
    id: "ethereum",
    name: "Ethereum Mainnet",
    symbol: "ETH",
    rpcUrl: "https://eth.llamarpc.com",
    explorerUrl: "https://etherscan.io",
  },
  polygon: {
    id: "polygon",
    name: "Polygon Mainnet",
    symbol: "POL",
    rpcUrl: "https://polygon-rpc.com",
    explorerUrl: "https://polygonscan.com",
  },
  arbitrum: {
    id: "arbitrum",
    name: "Arbitrum One",
    symbol: "ETH",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    explorerUrl: "https://arbiscan.io",
  },
};

// 🔐 [보안 1] 클라이언트 단 AES 암호화
export const encryptVault = (vault: WalletVault, password: string): string => {
  return CryptoJS.AES.encrypt(JSON.stringify(vault), password).toString();
};

export const decryptVault = (encryptedData: string, password: string): WalletVault | null => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, password);
    const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
    if (!decryptedText) return null;
    return JSON.parse(decryptedText);
  } catch (e) {
    return null;
  }
};

// 🔐 [보안 2] 클립보드 30초 후 자동 삭제 함수
export const copyToClipboardWithAutoClear = async (text: string, clearAfterMs: number = 30000): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    setTimeout(async () => {
      try {
        const currentText = await navigator.clipboard.readText();
        if (currentText === text) {
          await navigator.clipboard.writeText("");
        }
      } catch (e) {
        // 권한 제한 시 무시
      }
    }, clearAfterMs);
    return true;
  } catch (err) {
    console.error("Clipboard copy failed:", err);
    return false;
  }
};

export const createNewWallet = (): WalletVault => {
  const randomWallet = ethers.Wallet.createRandom();
  return {
    address: randomWallet.address,
    privateKey: randomWallet.privateKey,
    mnemonic: randomWallet.mnemonic?.phrase || "",
  };
};

export const restoreWalletFromMnemonic = (mnemonic: string): WalletVault => {
  const cleaned = mnemonic.trim();
  if (!ethers.Mnemonic.isValidMnemonic(cleaned)) {
    throw new Error("유효하지 않은 시드 구문(Seed Phrase)입니다.");
  }
  const restored = ethers.Wallet.fromPhrase(cleaned);
  return {
    address: restored.address,
    privateKey: restored.privateKey,
    mnemonic: restored.mnemonic?.phrase || cleaned,
  };
};

export const fetchBalance = async (address: string, rpcUrl: string): Promise<string> => {
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const balance = await provider.getBalance(address);
    return parseFloat(ethers.formatEther(balance)).toFixed(4);
  } catch (error) {
    console.error("Balance fetch failed:", error);
    return "0.0000";
  }
};

// 🧪 [검증 2] 송금 전 검증 및 예외 처리 강화
export const sendTransaction = async (
  privateKey: string,
  toAddress: string,
  amountEth: string,
  rpcUrl: string
): Promise<{ hash?: string; error?: string }> => {
  try {
    // 1. 주소 유효성 검사
    if (!ethers.isAddress(toAddress)) {
      return { error: "올바른 이더리움 지갑 주소 형식이 아닙니다." };
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    // 2. 입력 수량 검사
    const parsedAmount = ethers.parseEther(amountEth);
    if (parsedAmount <= 0n) {
      return { error: "송금 금액은 0보다 크여야 합니다." };
    }

    // 3. 잔액 및 가스비 검사
    const balance = await provider.getBalance(signer.address);
    const feeData = await provider.getFeeData();
    const gasLimit = 21000n; // 기본 이더리움 전송 가스
    const estimatedGasFee = (feeData.gasPrice || 0n) * gasLimit;

    if (balance < parsedAmount + estimatedGasFee) {
      return { error: "잔액 또는 가스비(수수료)가 부족합니다." };
    }

    const tx = await signer.sendTransaction({
      to: toAddress,
      value: parsedAmount,
    });

    return { hash: tx.hash };
  } catch (err: any) {
    console.error("Transaction failed:", err);
    return { error: err.message || "트랜잭션 전송 중 오류가 발생했습니다." };
  }
};

export const fetchTransactionHistory = async (
  address: string,
  rpcUrl: string
): Promise<TransactionItem[]> => {
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const currentBlock = await provider.getBlockNumber();
    const history: TransactionItem[] = [];

    const startBlock = Math.max(0, currentBlock - 20);

    for (let i = currentBlock; i >= startBlock && history.length < 5; i--) {
      const block = await provider.getBlock(i, true);
      if (block && block.prefetchedTransactions) {
        for (const tx of block.prefetchedTransactions) {
          if (
            tx.from.toLowerCase() === address.toLowerCase() ||
            (tx.to && tx.to.toLowerCase() === address.toLowerCase())
          ) {
            history.push({
              hash: tx.hash,
              from: tx.from,
              to: tx.to || "",
              value: ethers.formatEther(tx.value),
              blockNumber: tx.blockNumber || i,
            });
          }
        }
      }
    }
    return history;
  } catch (error) {
    console.error("Failed to fetch tx history:", error);
    return [];
  }
};
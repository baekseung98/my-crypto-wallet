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
  // --- 실제 메인넷 (Mainnet) ---
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
  // --- 테스트넷 (Testnet) ---
  sepolia: {
    id: "sepolia",
    name: "Ethereum Sepolia",
    symbol: "ETH",
    rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
    explorerUrl: "https://sepolia.etherscan.io",
  },
};

// 비밀번호 기반 지갑 데이터 암호화 함수
export const encryptVault = (vault: WalletVault, password: string): string => {
  return CryptoJS.AES.encrypt(JSON.stringify(vault), password).toString();
};

// 비밀번호 기반 지갑 데이터 복호화 함수
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
  const restored = ethers.Wallet.fromPhrase(cleaned);
  return {
    address: restored.address,
    privateKey: restored.privateKey,
    mnemonic: restored.mnemonic?.phrase || cleaned,
  };
};

export const fetchBalance = async (
  address: string,
  rpcUrl: string
): Promise<string> => {
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const balance = await provider.getBalance(address);
    return parseFloat(ethers.formatEther(balance)).toFixed(4);
  } catch (error) {
    console.error("Balance fetch failed:", error);
    return "0.0000";
  }
};

export const sendTransaction = async (
  privateKey: string,
  toAddress: string,
  amountEth: string,
  rpcUrl: string
): Promise<string> => {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const signer = new ethers.Wallet(privateKey, provider);

  const tx = await signer.sendTransaction({
    to: toAddress,
    value: ethers.parseEther(amountEth),
  });

  return tx.hash;
};

export const fetchTransactionHistory = async (
  address: string,
  rpcUrl: string
): Promise<TransactionItem[]> => {
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const currentBlock = await provider.getBlockNumber();
    const history: TransactionItem[] = [];

    const startBlock = Math.max(0, currentBlock - 30);

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
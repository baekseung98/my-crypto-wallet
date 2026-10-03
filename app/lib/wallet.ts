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
  isTestnet: boolean;
}

export const NETWORKS: Record<string, NetworkConfig> = {
  sepolia: {
    id: "sepolia",
    name: "Sepolia Testnet",
    symbol: "ETH",
    rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
    explorerUrl: "https://sepolia.etherscan.io",
    isTestnet: true,
  },
  ethereum: {
    id: "ethereum",
    name: "Ethereum Mainnet",
    symbol: "ETH",
    rpcUrl: "https://eth.llamarpc.com",
    explorerUrl: "https://etherscan.io",
    isTestnet: false,
  },
  polygon: {
    id: "polygon",
    name: "Polygon Mainnet",
    symbol: "POL",
    rpcUrl: "https://polygon-rpc.com",
    explorerUrl: "https://polygonscan.com",
    isTestnet: false,
  },
  arbitrum: {
    id: "arbitrum",
    name: "Arbitrum One",
    symbol: "ETH",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    explorerUrl: "https://arbiscan.io",
    isTestnet: false,
  },
};

// 🔐 [강화된 보안 1] PBKDF2 키 파생 + Salt/IV 명시적 생성 기반 AES-256 암호화
export const encryptVault = (vault: WalletVault, password: string): string => {
  const salt = CryptoJS.lib.WordArray.random(128 / 8);
  const iv = CryptoJS.lib.WordArray.random(128 / 8);

  const key = CryptoJS.PBKDF2(password, salt, {
    keySize: 256 / 32,
    iterations: 100000,
    hasher: CryptoJS.algo.SHA256,
  });

  const encrypted = CryptoJS.AES.encrypt(JSON.stringify(vault), key, {
    iv: iv,
    padding: CryptoJS.pad.Pkcs7,
    mode: CryptoJS.mode.CBC,
  });

  const combined = {
    salt: CryptoJS.enc.Hex.stringify(salt),
    iv: CryptoJS.enc.Hex.stringify(iv),
    ciphertext: encrypted.ciphertext.toString(CryptoJS.enc.Hex),
  };

  return JSON.stringify(combined);
};

export const decryptVault = (encryptedDataString: string, password: string): WalletVault | null => {
  try {
    const combined = JSON.parse(encryptedDataString);
    if (!combined.salt || !combined.iv || !combined.ciphertext) {
      // 구버전 하위 호환
      const bytes = CryptoJS.AES.decrypt(encryptedDataString, password);
      const text = bytes.toString(CryptoJS.enc.Utf8);
      return text ? JSON.parse(text) : null;
    }

    const salt = CryptoJS.enc.Hex.parse(combined.salt);
    const iv = CryptoJS.enc.Hex.parse(combined.iv);
    const ciphertext = CryptoJS.enc.Hex.parse(combined.ciphertext);

    const key = CryptoJS.PBKDF2(password, salt, {
      keySize: 256 / 32,
      iterations: 100000,
      hasher: CryptoJS.algo.SHA256,
    });

    const cipherParams = CryptoJS.lib.CipherParams.create({
      ciphertext: ciphertext,
    });

    const decrypted = CryptoJS.AES.decrypt(cipherParams, key, {
      iv: iv,
      padding: CryptoJS.pad.Pkcs7,
      mode: CryptoJS.mode.CBC,
    });

    const text = decrypted.toString(CryptoJS.enc.Utf8);
    if (!text) return null;
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
};

// 🔐 [보안 2] 클립보드 30초 후 자동 삭제
export const copyToClipboardWithAutoClear = async (text: string, clearAfterMs: number = 30000): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    setTimeout(async () => {
      try {
        const currentText = await navigator.clipboard.readText();
        if (currentText === text) {
          await navigator.clipboard.writeText("");
        }
      } catch (e) {}
    }, clearAfterMs);
    return true;
  } catch (err) {
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
    return "0.0000";
  }
};

// ⛽ [UX 1] 실시간 가스비 예측
export const estimateGasFee = async (rpcUrl: string): Promise<string> => {
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const feeData = await provider.getFeeData();
    const gasLimit = 21000n;
    const gasFee = (feeData.gasPrice || 0n) * gasLimit;
    return parseFloat(ethers.formatEther(gasFee)).toFixed(6);
  } catch (e) {
    return "0.000100";
  }
};

export const sendTransaction = async (
  privateKey: string,
  toAddress: string,
  amountEth: string,
  rpcUrl: string
): Promise<{ hash?: string; error?: string }> => {
  try {
    if (!ethers.isAddress(toAddress)) {
      return { error: "올바른 지갑 주소 형식이 아닙니다." };
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    const parsedAmount = ethers.parseEther(amountEth);
    if (parsedAmount <= 0n) {
      return { error: "송금 금액은 0보다 크여야 합니다." };
    }

    const balance = await provider.getBalance(signer.address);
    const feeData = await provider.getFeeData();
    const gasLimit = 21000n;
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
    return [];
  }
};
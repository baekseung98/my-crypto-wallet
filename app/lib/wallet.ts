import { ethers } from "ethers";
import CryptoJS from "crypto-js";

export interface WalletVault {
  address: string;
  privateKey: string;
  mnemonic: string;
}

export interface NetworkConfig {
  name: string;
  rpcUrl: string;
  chainId: number;
  symbol: string;
  explorerUrl: string;
  isTestnet: boolean;
}

// 지원 네트워크 명세
export const NETWORKS: Record<string, NetworkConfig> = {
  sepolia: {
    name: "Sepolia Testnet",
    rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
    chainId: 11155111,
    symbol: "ETH",
    explorerUrl: "https://sepolia.etherscan.io",
    isTestnet: true,
  },
  ethereum: {
    name: "Ethereum Mainnet",
    rpcUrl: "https://eth.llamarpc.com",
    chainId: 1,
    symbol: "ETH",
    explorerUrl: "https://etherscan.io",
    isTestnet: false,
  },
  polygon: {
    name: "Polygon Mainnet",
    rpcUrl: "https://polygon-rpc.com",
    chainId: 137,
    symbol: "MATIC",
    explorerUrl: "https://polygonscan.com",
    isTestnet: false,
  },
  arbitrum: {
    name: "Arbitrum One",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    chainId: 42161,
    symbol: "ETH",
    explorerUrl: "https://arbiscan.io",
    isTestnet: false,
  },
};

export interface TransactionItem {
  hash: string;
  from: string;
  to: string;
  value: string;
  blockNumber: number;
}

// 1. 신규 지갑 생성
export function createNewWallet(): WalletVault {
  const wallet = ethers.Wallet.createRandom();
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
    mnemonic: wallet.mnemonic?.phrase || "",
  };
}

// 2. 시드 구문 기반 지갑 복구 (입력 정제 및 상세 예외 처리 보완)
export function restoreWalletFromMnemonic(mnemonicInput: string): WalletVault {
  // 입력값 정제: 앞뒤 공백 제거, 소문자 변환, 다중 공백 단일 공백화
  const sanitizedMnemonic = mnemonicInput
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  if (!sanitizedMnemonic) {
    throw new Error("시드 구문(Mnemonic)을 입력해 주세요.");
  }

  const wordCount = sanitizedMnemonic.split(" ").length;
  if (wordCount !== 12 && wordCount !== 24) {
    throw new Error(
      `시드 구문은 12개 또는 24개 단어여야 합니다. (현재 입력: ${wordCount}개)`
    );
  }

  if (!ethers.Mnemonic.isValidMnemonic(sanitizedMnemonic)) {
    throw new Error(
      "유효하지 않은 시드 구문입니다. 단어 스펠링이나 순서를 확인해 주세요."
    );
  }

  const wallet = ethers.Wallet.fromPhrase(sanitizedMnemonic);
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
    mnemonic: sanitizedMnemonic,
  };
}

// 3. Vault 암호화 (PBKDF2 + AES-256-CBC)
export function encryptVault(vault: WalletVault, password: string): string {
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

  return JSON.stringify({
    salt: CryptoJS.enc.Hex.stringify(salt),
    iv: CryptoJS.enc.Hex.stringify(iv),
    ciphertext: encrypted.ciphertext.toString(CryptoJS.enc.Hex),
  });
}

// 4. Vault 복호화
export function decryptVault(
  encryptedVaultJson: string,
  password: string
): WalletVault | null {
  try {
    const { salt, iv, ciphertext } = JSON.parse(encryptedVaultJson);

    const saltWordArray = CryptoJS.enc.Hex.parse(salt);
    const ivWordArray = CryptoJS.enc.Hex.parse(iv);
    const cipherParams = CryptoJS.lib.CipherParams.create({
      ciphertext: CryptoJS.enc.Hex.parse(ciphertext),
    });

    const key = CryptoJS.PBKDF2(password, saltWordArray, {
      keySize: 256 / 32,
      iterations: 100000,
      hasher: CryptoJS.algo.SHA256,
    });

    const decrypted = CryptoJS.AES.decrypt(cipherParams, key, {
      iv: ivWordArray,
      padding: CryptoJS.pad.Pkcs7,
      mode: CryptoJS.mode.CBC,
    });

    const decryptedStr = decrypted.toString(CryptoJS.enc.Utf8);
    if (!decryptedStr) return null;

    return JSON.parse(decryptedStr);
  } catch {
    return null;
  }
}

// 5. 잔액 조회
export async function fetchBalance(
  address: string,
  rpcUrl: string
): Promise<string> {
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const balanceWei = await provider.getBalance(address);
    const ethVal = ethers.formatEther(balanceWei);
    return parseFloat(ethVal).toFixed(4);
  } catch (e) {
    console.error("Fetch Balance Error:", e);
    return "0.0000";
  }
}

// 6. 가스비 추정
export async function estimateGasFee(rpcUrl: string): Promise<string> {
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits("20", "gwei");
    const estimatedGas = 21000n; // Standard Transfer Gas Limit
    const totalGasFeeWei = gasPrice * estimatedGas;
    return parseFloat(ethers.formatEther(totalGasFeeWei)).toFixed(6);
  } catch (e) {
    console.error("Estimate Gas Error:", e);
    return "0.0001";
  }
}

// 7. 트랜잭션 전송
export async function sendTransaction(
  privateKey: string,
  toAddress: string,
  amountEth: string,
  rpcUrl: string
): Promise<{ hash?: string; error?: string }> {
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

    const balanceWei = await provider.getBalance(signer.address);
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits("20", "gwei");
    const estimatedGasFee = gasPrice * 21000n;

    if (balanceWei < parsedAmount + estimatedGasFee) {
      return { error: "잔액 또는 가스비(수수료)가 부족합니다." };
    }

    const txResponse = await signer.sendTransaction({
      to: toAddress,
      value: parsedAmount,
    });

    return { hash: txResponse.hash };
  } catch (e: any) {
    console.error("Send Transaction Error:", e);
    return { error: e?.reason || e?.message || "트랜잭션 전송에 실패했습니다." };
  }
}

// 8. 거래 내역 조회
export async function fetchTransactionHistory(
  address: string,
  rpcUrl: string
): Promise<TransactionItem[]> {
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const currentBlock = await provider.getBlockNumber();
    const history: TransactionItem[] = [];

    // 최근 20개 블록 검색
    const startBlock = Math.max(0, currentBlock - 20);

    for (let i = currentBlock; i >= startBlock && history.length < 5; i--) {
      const block = await provider.getBlock(i, true);
      if (!block || !block.prefetchedTransactions) continue;

      for (const tx of block.prefetchedTransactions) {
        if (
          tx.from.toLowerCase() === address.toLowerCase() ||
          (tx.to && tx.to.toLowerCase() === address.toLowerCase())
        ) {
          history.push({
            hash: tx.hash,
            from: tx.from,
            to: tx.to || "",
            value: parseFloat(ethers.formatEther(tx.value)).toFixed(4),
            blockNumber: i,
          });
        }
      }
    }
    return history;
  } catch (e) {
    console.error("Fetch History Error:", e);
    return [];
  }
}

// 9. 클립보드 복사 및 자동 삭제 (30초 후 초기화 시도)
export async function copyToClipboardWithAutoClear(
  text: string,
  autoClearMs = 30000
): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    setTimeout(async () => {
      try {
        await navigator.clipboard.writeText("");
      } catch {
        // 클립보드 접근 권한 상실 시 무시
      }
    }, autoClearMs);
    return true;
  } catch (e) {
    console.error("Clipboard Copy Error:", e);
    return false;
  }
}
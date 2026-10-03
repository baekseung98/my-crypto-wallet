import { ethers } from "ethers";

export interface WalletVault {
  address: string;
  privateKey: string;
  mnemonic: string;
}

export interface VaultV2_GCM {
  version: 2;
  algorithm: "AES-GCM";
  kdf: "PBKDF2";
  salt: string; // Hex
  iv: string;   // Hex (96-bit Nonce)
  ciphertext: string; // Hex (Ciphertext + 128-bit Auth Tag)
}

// 1. ArrayBuffer <-> Hex 변환 헬퍼
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

// 2. Web Crypto API KDF (PBKDF2 - 100,000 iterations)
async function deriveGcmKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordKey = await window.crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    passwordKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// 3. Web Crypto API AES-256-GCM 암호화
export async function encryptVaultGCM(vault: WalletVault, password: string): Promise<VaultV2_GCM> {
  const salt = window.crypto.getRandomValues(new Uint8Array(16)); // 128-bit
  const iv = window.crypto.getRandomValues(new Uint8Array(12));   // 96-bit Nonce
  const key = await deriveGcmKey(password, salt);

  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(vault));

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
      tagLength: 128,
    },
    key,
    data
  );

  return {
    version: 2,
    algorithm: "AES-GCM",
    kdf: "PBKDF2",
    salt: bufferToHex(salt),
    iv: bufferToHex(iv),
    ciphertext: bufferToHex(encryptedBuffer),
  };
}

// 4. Web Crypto API AES-256-GCM 복호화 (Auth Tag 검증)
export async function decryptVaultGCM(
  gcmVault: VaultV2_GCM,
  password: string
): Promise<WalletVault | null> {
  try {
    const salt = hexToBuffer(gcmVault.salt);
    const iv = hexToBuffer(gcmVault.iv);
    const ciphertext = hexToBuffer(gcmVault.ciphertext);
    const key = await deriveGcmKey(password, salt);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv,
        tagLength: 128,
      },
      key,
      ciphertext
    );

    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(decryptedBuffer));
  } catch (e) {
    // Auth Tag 불일치, 비밀번호 오류, 데이터 변조 시 OperationError
    return null;
  }
}

// 5. 3원 Cryptographic 검증 파이프라인 (Mnemonic - PrivateKey - Address)
export function validateVaultIntegrity(vault: WalletVault): boolean {
  try {
    if (!vault.address || !vault.privateKey || !vault.mnemonic) return false;
    if (!ethers.isAddress(vault.address)) return false;
    if (!ethers.Mnemonic.isValidMnemonic(vault.mnemonic)) return false;

    // 1) Mnemonic 파생 주소
    const addressFromMnemonic = ethers.Wallet.fromPhrase(vault.mnemonic).address.toLowerCase();
    // 2) PrivateKey 파생 주소
    const addressFromPrivateKey = new ethers.Wallet(vault.privateKey).address.toLowerCase();
    // 3) Vault 기록 주소
    const recordAddress = vault.address.toLowerCase();

    // 3자 완전 일치 검증
    return addressFromMnemonic === recordAddress && addressFromPrivateKey === recordAddress;
  } catch {
    return false;
  }
}
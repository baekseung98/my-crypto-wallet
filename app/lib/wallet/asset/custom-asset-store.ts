import { TokenAsset, NftAsset } from "./types";

const CUSTOM_TOKENS_STORAGE_KEY = "earth_wallet_custom_tokens_v1";

export class CustomAssetStore {
  // 로컬 볼트 영속화된 커스텀 토큰 불러오기
  static getCustomTokens(): TokenAsset[] {
    try {
      const data = localStorage.getItem(CUSTOM_TOKENS_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  // 커스텀 ERC-20 토큰 추가
  static addCustomToken(token: TokenAsset): TokenAsset[] {
    const current = this.getCustomTokens();
    const exists = current.some(
      (t) => t.contractAddress.toLowerCase() === token.contractAddress.toLowerCase()
    );

    if (!exists) {
      const updated = [...current, { ...token, isCustomToken: true }];
      localStorage.setItem(CUSTOM_TOKENS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    }
    return current;
  }

  // 커스텀 ERC-20 토큰 삭제
  static removeCustomToken(contractAddress: string): TokenAsset[] {
    const current = this.getCustomTokens();
    const updated = current.filter(
      (t) => t.contractAddress.toLowerCase() !== contractAddress.toLowerCase()
    );
    localStorage.setItem(CUSTOM_TOKENS_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  }
}
import { TokenAsset, NftAsset } from "./types";

export interface AssetServiceCache {
  tokens: TokenAsset[];
  nfts: NftAsset[];
  lastUpdated: number;
}

export class SepoliaAssetService {
  private cache: Map<string, AssetServiceCache> = new Map();
  private readonly CACHE_TTL_MS = 30000; // 30초 캐싱 정책 (RPC 오버헤드 및 UI 둔화 방지)

  async fetchBalances(walletAddress: string): Promise<TokenAsset[]> {
    const cached = this.cache.get(walletAddress);
    if (cached && Date.now() - cached.lastUpdated < this.CACHE_TTL_MS) {
      return cached.tokens;
    }

    // Sepolia ETH 기본 토큰 및 기본 테스트 ERC-20 데이터 구조
    const tokens: TokenAsset[] = [
      {
        contractAddress: "0x0000000000000000000000000000000000000000",
        symbol: "SEP ETH",
        decimals: 18,
        balance: "0.05",
        isCustomToken: false,
      },
      {
        contractAddress: "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984", // Mock Sepolia UNI/ERC20
        symbol: "UNI",
        decimals: 18,
        balance: "100.0",
        isCustomToken: false,
      },
    ];

    this.updateCacheTokens(walletAddress, tokens);
    return tokens;
  }

  async fetchNfts(walletAddress: string): Promise<NftAsset[]> {
    const cached = this.cache.get(walletAddress);
    if (cached && Date.now() - cached.lastUpdated < this.CACHE_TTL_MS) {
      return cached.nfts;
    }

    // Sepolia Testnet NFT 메타데이터 구조
    const nfts: NftAsset[] = [
      {
        contractAddress: "0x0000000000000000000000000000000000000001",
        tokenId: "1",
        tokenUri: "https://earthwallet.io/nft/1.json",
        name: "EARTH Genesis Badge #1",
        description: "PROJECT EARTH WALLET Phase 6 Testnet NFT",
        imageUrl: "https://earthwallet.io/nft/1.png",
        collectionName: "EARTH Genesis Collection",
      },
    ];

    this.updateCacheNfts(walletAddress, nfts);
    return nfts;
  }

  private updateCacheTokens(address: string, tokens: TokenAsset[]) {
    const current = this.cache.get(address) || { tokens: [], nfts: [], lastUpdated: 0 };
    this.cache.set(address, { ...current, tokens, lastUpdated: Date.now() });
  }

  private updateCacheNfts(address: string, nfts: NftAsset[]) {
    const current = this.cache.get(address) || { tokens: [], nfts: [], lastUpdated: 0 };
    this.cache.set(address, { ...current, nfts, lastUpdated: Date.now() });
  }
}
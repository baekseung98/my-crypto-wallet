export interface MarketplaceListing {
  listingId: string;
  nftContractAddress: string;
  tokenId: string;
  sellerAddress: string;
  priceSepEth: string;
  isSold: boolean;
}

export interface NftMarketplaceConfig {
  network: "sepolia";
  marketplaceContractAddress: string; // Sepolia NFT Marketplace Mock Contract
  fetchActiveListings(): Promise<MarketplaceListing[]>;
  buyNft(listingId: string, priceEth: string): Promise<{ success: boolean; txHash?: string }>;
}
import React, { useState, useEffect } from "react";
import { MarketplaceListing } from "../../lib/nft-marketplace/types";

interface NftMarketViewProps {
  walletAddress: string;
}

export const NftMarketView: React.FC<NftMarketViewProps> = ({ walletAddress }) => {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  // Sepolia 테스트넷 Mock 마켓플레이스 리스팅 조회
  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setListings([
        {
          listingId: "list_001",
          nftContractAddress: "0x1234567890abcdef1234567890abcdef12345678",
          tokenId: "101",
          sellerAddress: "0xAbCdEf1234567890AbCdEf1234567890AbCdEf12",
          priceSepEth: "0.05",
          isSold: false,
        },
        {
          listingId: "list_002",
          nftContractAddress: "0xabcdef1234567890abcdef1234567890abcdef12",
          tokenId: "404",
          sellerAddress: "0x9876543210FedCba9876543210FedCba98765432",
          priceSepEth: "0.12",
          isSold: false,
        },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  const handleBuyNft = async (listingId: string, price: string) => {
    setStatusMessage(`⏳ Processing purchase for listing ${listingId} (${price} SEP ETH)...`);
    
    setTimeout(() => {
      setStatusMessage(`✅ Successfully purchased NFT! TxHash: 0xnftbuy${Math.random().toString(16).substring(2)}`);
      setListings((prev) => prev.filter((item) => item.listingId !== listingId));
    }, 1000);
  };

  return (
    <div style={{ padding: "24px", fontFamily: "sans-serif", maxWidth: "600px", border: "1px solid #ccc", borderRadius: "8px" }}>
      <h3>🛒 EARTH NFT Marketplace (Sepolia Testnet)</h3>
      <p style={{ fontSize: "12px", color: "#666" }}>Connected Wallet: {walletAddress || "Not Connected"}</p>

      {loading ? (
        <p>Loading marketplace listings...</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px" }}>
          {listings.length === 0 ? (
            <p>No active listings available on Sepolia.</p>
          ) : (
            listings.map((item) => (
              <div key={item.listingId} style={{ border: "1px solid #ddd", padding: "12px", borderRadius: "6px", background: "#fdfdfd", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h4 style={{ margin: "0 0 4px 0" }}>NFT Token ID: #{item.tokenId}</h4>
                  <p style={{ fontSize: "11px", color: "#555", margin: "0 0 2px 0" }}>Contract: {item.nftContractAddress}</p>
                  <p style={{ fontSize: "12px", fontWeight: "bold", color: "#2e7d32", margin: "0" }}>Price: {item.priceSepEth} SEP ETH</p>
                </div>
                <button
                  onClick={() => handleBuyNft(item.listingId, item.priceSepEth)}
                  style={{ padding: "8px 16px", background: "#1976d2", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}
                >
                  Buy NFT
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {statusMessage && <p style={{ fontSize: "12px", background: "#e8f5e9", padding: "8px", marginTop: "16px", borderRadius: "4px" }}>{statusMessage}</p>}
    </div>
  );
};
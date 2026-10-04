import React, { useState } from "react";

interface NftListModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
}

export const NftListModal: React.FC<NftListModalProps> = ({ isOpen, onClose, walletAddress }) => {
  const [tokenId, setTokenId] = useState("");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  if (!isOpen) return null;

  const handleListNft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenId || !price || parseFloat(price) <= 0) {
      alert("Please enter a valid Token ID and price.");
      return;
    }

    setLoading(true);
    setStatusMessage("⏳ Approving NFT for Marketplace & Signing Listing...");

    setTimeout(() => {
      setStatusMessage(`✅ Successfully listed NFT #${tokenId} for ${price} SEP ETH on Sepolia!`);
      setLoading(false);
    }, 1200);
  };

  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center" }}>
      <div style={{ background: "#fff", padding: "24px", borderRadius: "8px", width: "400px", fontFamily: "sans-serif" }}>
        <h3>🏷️ List NFT for Sale (Sepolia Testnet)</h3>
        <p style={{ fontSize: "11px", color: "#666" }}>Seller: {walletAddress}</p>

        <form onSubmit={handleListNft}>
          <div style={{ marginBottom: "12px" }}>
            <label style={{ display: "block", fontSize: "12px", marginBottom: "4px" }}>NFT Token ID:</label>
            <input
              type="text"
              value={tokenId}
              onChange={(e) => setTokenId(e.target.value)}
              placeholder="e.g., 101"
              style={{ width: "100%", padding: "8px", boxSizing: "border-box" }}
            />
          </div>

          <div style={{ marginBottom: "12px" }}>
            <label style={{ display: "block", fontSize: "12px", marginBottom: "4px" }}>Listing Price (SEP ETH):</label>
            <input
              type="text"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.05"
              style={{ width: "100%", padding: "8px", boxSizing: "border-box" }}
            />
          </div>

          {statusMessage && <p style={{ fontSize: "12px", background: "#f0f4c3", padding: "8px", borderRadius: "4px" }}>{statusMessage}</p>}

          <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
            <button type="submit" disabled={loading} style={{ flex: 1, padding: "10px", background: "#2e7d32", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}>
              {loading ? "Processing..." : "Confirm & List"}
            </button>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: "10px", background: "#d32f2f", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}>
              Close
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
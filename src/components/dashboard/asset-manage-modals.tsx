import React, { useState } from "react";
import { TokenAsset, NftAsset } from "../../lib/wallet/asset/types";
import { CustomAssetStore } from "../../lib/wallet/asset/custom-asset-store";

interface AddTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTokenAdded: () => void;
}

export const AddTokenModal: React.FC<AddTokenModalProps> = ({ isOpen, onClose, onTokenAdded }) => {
  const [address, setAddress] = useState("");
  const [symbol, setSymbol] = useState("");
  const [decimals, setDecimals] = useState("18");

  if (!isOpen) return null;

  const handleAdd = () => {
    if (!address.startsWith("0x") || address.length !== 42 || !symbol) {
      alert("Invalid Contract Address or Symbol.");
      return;
    }

    CustomAssetStore.addCustomToken({
      contractAddress: address,
      symbol: symbol.toUpperCase(),
      decimals: parseInt(decimals, 10) || 18,
      balance: "0.0",
      isCustomToken: true,
    });

    onTokenAdded();
    onClose();
  };

  return (
    <div style={{ position: "fixed", top: "20%", left: "30%", background: "#fff", border: "2px solid #333", padding: "20px", zIndex: 1000, width: "360px" }}>
      <h3>➕ Add Custom Token</h3>
      <div style={{ marginBottom: "10px" }}>
        <label style={{ display: "block", fontSize: "12px" }}>Contract Address:</label>
        <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="0x..." style={{ width: "100%", padding: "6px" }} />
      </div>
      <div style={{ marginBottom: "10px" }}>
        <label style={{ display: "block", fontSize: "12px" }}>Symbol:</label>
        <input type="text" value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="e.g. TST" style={{ width: "100%", padding: "6px" }} />
      </div>
      <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
        <button onClick={handleAdd} style={{ padding: "8px 16px", cursor: "pointer" }}>Add Token</button>
        <button onClick={onClose} style={{ padding: "8px 16px", cursor: "pointer" }}>Close</button>
      </div>
    </div>
  );
};

interface NftDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  nft: NftAsset | null;
}

export const NftDetailModal: React.FC<NftDetailModalProps> = ({ isOpen, onClose, nft }) => {
  if (!isOpen || !nft) return null;

  return (
    <div style={{ position: "fixed", top: "20%", left: "30%", background: "#fff", border: "2px solid #333", padding: "20px", zIndex: 1000, width: "360px" }}>
      <h3>🎨 NFT Gallery Detail</h3>
      <div style={{ textAlign: "center", marginBottom: "12px" }}>
        <div style={{ width: "120px", height: "120px", background: "#f0f0f0", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", border: "1px dashed #666" }}>
          [ NFT IMAGE ]
        </div>
      </div>
      <h4>{nft.name}</h4>
      <p style={{ fontSize: "12px", color: "#666" }}>Collection: {nft.collectionName}</p>
      <p style={{ fontSize: "12px" }}>{nft.description}</p>
      <p style={{ fontSize: "11px", wordBreak: "break-all", background: "#eee", padding: "6px" }}>
        Contract: {nft.contractAddress}<br />Token ID: {nft.tokenId}
      </p>
      <button onClick={onClose} style={{ padding: "8px 16px", cursor: "pointer", width: "100%", marginTop: "12px" }}>Close</button>
    </div>
  );
};
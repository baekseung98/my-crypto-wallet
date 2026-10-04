import React, { useState } from "react";
import { TokenAsset, NftAsset } from "../../lib/wallet/asset/types";

interface DashboardViewProps {
  walletAddress: string;
  tokens: TokenAsset[];
  nfts: NftAsset[];
  onOpenSendModal: () => void;
  onOpenReceiveModal: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  walletAddress,
  tokens,
  nfts,
  onOpenSendModal,
  onOpenReceiveModal,
}) => {
  const [activeTab, setActiveTab] = useState<"tokens" | "nfts">("tokens");

  return (
    <div style={{ padding: "24px", fontFamily: "sans-serif" }}>
      {/* Top Header & Address Banner */}
      <header style={{ marginBottom: "20px" }}>
        <h2>🌍 PROJECT EARTH WALLET Dashboard</h2>
        <p style={{ fontSize: "14px", color: "#666" }}>
          Address: <code>{walletAddress}</code>
        </p>
      </header>

      {/* Action Buttons (Send / Receive) */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
        <button onClick={onOpenSendModal} style={{ padding: "10px 20px", cursor: "pointer" }}>
          📤 Send Asset
        </button>
        <button onClick={onOpenReceiveModal} style={{ padding: "10px 20px", cursor: "pointer" }}>
          📥 Receive Asset
        </button>
      </div>

      {/* Tab Navigation */}
      <div style={{ borderBottom: "1px solid #ccc", marginBottom: "16px" }}>
        <button
          onClick={() => setActiveTab("tokens")}
          style={{
            fontWeight: activeTab === "tokens" ? "bold" : "normal",
            marginRight: "16px",
            paddingBottom: "8px",
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          Tokens ({tokens.length})
        </button>
        <button
          onClick={() => setActiveTab("nfts")}
          style={{
            fontWeight: activeTab === "nfts" ? "bold" : "normal",
            paddingBottom: "8px",
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          NFTs ({nfts.length})
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === "tokens" ? (
        <ul>
          {tokens.map((token, idx) => (
            <li key={idx} style={{ marginBottom: "8px" }}>
              <strong>{token.symbol}</strong>: {token.balance}
            </li>
          ))}
        </ul>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }}>
          {nfts.map((nft, idx) => (
            <div key={idx} style={{ border: "1px solid #ddd", padding: "12px", borderRadius: "8px" }}>
              <h4>{nft.name}</h4>
              <p style={{ fontSize: "12px" }}>{nft.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
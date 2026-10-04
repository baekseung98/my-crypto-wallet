"use client";

import React, { useState } from "react";
import { NftMarketView } from "@/components/nft/nft-market-view";
import { NftListModal } from "@/components/nft/nft-list-modal";
import { LaunchpadView } from "@/components/launchpad/launchpad-view";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"wallet" | "dex" | "nft" | "launchpad">("wallet");
  const [walletAddress] = useState("0x8145e7a478f73441BD2978E4B76F618cc19C91D");
  const [balance] = useState("0.1000 ETH");
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", color: "#fff", fontFamily: "sans-serif" }}>
      
      {/* Top Header / Network Banner */}
      <header style={{ background: "#1e293b", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #334155" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "18px" }}>🌍 PROJECT EARTH WALLET</h1>
        </div>
        <div style={{ background: "#334155", padding: "6px 12px", borderRadius: "8px", fontSize: "12px", color: "#4ade80" }}>
          ● Ethereum Sepolia (Strictly Bound)
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav style={{ background: "#1e293b", padding: "0 24px", display: "flex", gap: "20px", borderBottom: "1px solid #334155" }}>
        <button
          onClick={() => setActiveTab("wallet")}
          style={{ padding: "12px 16px", background: "transparent", border: "none", color: activeTab === "wallet" ? "#60a5fa" : "#94a3b8", borderBottom: activeTab === "wallet" ? "2px solid #60a5fa" : "2px solid transparent", cursor: "pointer", fontWeight: "bold" }}
        >
          🔑 Wallet Core
        </button>
        <button
          onClick={() => setActiveTab("dex")}
          style={{ padding: "12px 16px", background: "transparent", border: "none", color: activeTab === "dex" ? "#60a5fa" : "#94a3b8", borderBottom: activeTab === "dex" ? "2px solid #60a5fa" : "2px solid transparent", cursor: "pointer", fontWeight: "bold" }}
        >
          🔄 DEX Swap
        </button>
        <button
          onClick={() => setActiveTab("nft")}
          style={{ padding: "12px 16px", background: "transparent", border: "none", color: activeTab === "nft" ? "#60a5fa" : "#94a3b8", borderBottom: activeTab === "nft" ? "2px solid #60a5fa" : "2px solid transparent", cursor: "pointer", fontWeight: "bold" }}
        >
          🖼️ NFT Marketplace
        </button>
        <button
          onClick={() => setActiveTab("launchpad")}
          style={{ padding: "12px 16px", background: "transparent", border: "none", color: activeTab === "launchpad" ? "#60a5fa" : "#94a3b8", borderBottom: activeTab === "launchpad" ? "2px solid #60a5fa" : "2px solid transparent", cursor: "pointer", fontWeight: "bold" }}
        >
          🚀 Token Launchpad
        </button>
      </nav>

      {/* Main Content Area */}
      <main style={{ padding: "30px 20px", maxWidth: "900px", margin: "0 auto" }}>
        
        {activeTab === "wallet" && (
          <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "12px", padding: "24px", maxWidth: "450px", margin: "40px auto", boxShadow: "0 4px 6px rgba(0,0,0,0.3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <span style={{ background: "#334155", padding: "4px 8px", borderRadius: "4px", fontSize: "12px" }}>🔒 Lock</span>
              <span style={{ fontSize: "12px", color: "#94a3b8" }}>Ethereum Sepolia ▾</span>
            </div>

            <div style={{ textAlign: "center", marginBottom: "24px" }}>
              <p style={{ margin: "0 0 8px 0", fontSize: "12px", color: "#94a3b8", letterSpacing: "1px" }}>TOTAL BALANCE (ETH)</p>
              <h2 style={{ margin: 0, fontSize: "32px", fontWeight: "bold" }}>{balance}</h2>
            </div>

            <div style={{ background: "#0f172a", padding: "12px", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", fontSize: "13px" }}>
              <span style={{ color: "#cbd5e1", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "330px" }}>{walletAddress}</span>
              <button onClick={() => navigator.clipboard.writeText(walletAddress)} style={{ background: "transparent", border: "none", color: "#60a5fa", cursor: "pointer", fontSize: "12px" }}>Copy</button>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button style={{ flex: 1, background: "#4f46e5", color: "#fff", border: "none", padding: "12px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}>Send</button>
              <button style={{ flex: 1, background: "#7f1d1d", color: "#fca5a5", border: "none", padding: "12px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}>Remove Wallet</button>
            </div>
          </div>
        )}

        {activeTab === "dex" && (
          <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "12px", padding: "24px" }}>
            <h2>🔄 Sepolia Swap Engine (DEX)</h2>
            <p style={{ color: "#94a3b8", fontSize: "14px" }}>Trade tokens securely on the Sepolia testnet liquidity pool with strict invariant controls.</p>
            <div style={{ background: "#0f172a", border: "1px dashed #334155", padding: "30px", textAlign: "center", borderRadius: "8px", color: "#cbd5e1", marginTop: "20px" }}>
              SepoliaSwapEngine Module is Active & Ready.
            </div>
          </div>
        )}

        {activeTab === "nft" && (
          <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "12px", padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2>🖼️ NFT Marketplace</h2>
              <button
                onClick={() => setIsModalOpen(true)}
                style={{ background: "#7c3aed", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "bold" }}
              >
                + List New NFT
              </button>
            </div>
            <NftMarketView />
            <NftListModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
          </div>
        )}

        {activeTab === "launchpad" && (
          <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "12px", padding: "24px" }}>
            <LaunchpadView walletAddress={walletAddress} />
          </div>
        )}

      </main>
    </div>
  );
}
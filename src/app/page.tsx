"use client";

import React, { useState } from "react";
import { NftMarketView } from "@/components/nft/nft-market-view";
import { NftListModal } from "@/components/nft/nft-list-modal";
import { LaunchpadView } from "@/components/launchpad/launchpad-view";

export default function EarthWalletDashboard() {
  const [activeTab, setActiveTab] = useState<"wallet" | "dex" | "nft" | "launchpad">("wallet");
  const [walletCreated, setWalletCreated] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [mnemonic, setMnemonic] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCreateWallet = () => {
    const mockAddress = "0x71C...38a9 (Sepolia Testnet)";
    const mockMnemonic = "earth anchor protocol secure testnet mnemonic phrase dummy seed";
    setWalletAddress(mockAddress);
    setMnemonic(mockMnemonic);
    setWalletCreated(true);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f4f6f8", fontFamily: "sans-serif", paddingBottom: "40px" }}>
      <header style={{ background: "#111827", color: "#fff", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "20px" }}>🌍 PROJECT EARTH WALLET</h1>
          <span style={{ fontSize: "11px", color: "#4ade80" }}>● Network: Sepolia Testnet (Strictly Bound)</span>
        </div>
        {walletCreated && (
          <div style={{ fontSize: "12px", background: "#1f2937", padding: "6px 12px", borderRadius: "6px" }}>
            Connected: <strong>{walletAddress}</strong>
          </div>
        )}
      </header>

      <nav style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 24px", display: "flex", gap: "16px" }}>
        <button
          onClick={() => setActiveTab("wallet")}
          style={{ padding: "12px 16px", background: "transparent", border: "none", borderBottom: activeTab === "wallet" ? "2px solid #2563eb" : "2px solid transparent", fontWeight: activeTab === "wallet" ? "bold" : "normal", cursor: "pointer" }}
        >
          🔑 Wallet Core
        </button>
        <button
          onClick={() => setActiveTab("dex")}
          style={{ padding: "12px 16px", background: "transparent", border: "none", borderBottom: activeTab === "dex" ? "2px solid #2563eb" : "2px solid transparent", fontWeight: activeTab === "dex" ? "bold" : "normal", cursor: "pointer" }}
        >
          🔄 DEX Swap
        </button>
        <button
          onClick={() => setActiveTab("nft")}
          style={{ padding: "12px 16px", background: "transparent", border: "none", borderBottom: activeTab === "nft" ? "2px solid #2563eb" : "2px solid transparent", fontWeight: activeTab === "nft" ? "bold" : "normal", cursor: "pointer" }}
        >
          🖼️ NFT Marketplace
        </button>
        <button
          onClick={() => setActiveTab("launchpad")}
          style={{ padding: "12px 16px", background: "transparent", border: "none", borderBottom: activeTab === "launchpad" ? "2px solid #2563eb" : "2px solid transparent", fontWeight: activeTab === "launchpad" ? "bold" : "normal", cursor: "pointer" }}
        >
          🚀 Token Launchpad
        </button>
      </nav>

      <main style={{ maxWidth: "900px", margin: "24px auto", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", padding: "24px" }}>
        {activeTab === "wallet" && (
          <div>
            <h2>Non-Custodial Wallet Management</h2>
            {!walletCreated ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <p style={{ color: "#6b7280", marginBottom: "20px" }}>Create your secure Sepolia testnet vault to get started.</p>
                <button
                  onClick={handleCreateWallet}
                  style={{ background: "#2563eb", color: "#fff", border: "none", padding: "12px 24px", borderRadius: "6px", fontSize: "14px", fontWeight: "bold", cursor: "pointer" }}
                >
                  Create New Wallet Vault
                </button>
              </div>
            ) : (
              <div>
                <div style={{ background: "#ecfdf5", border: "1px solid #10b981", padding: "16px", borderRadius: "6px", marginBottom: "16px" }}>
                  <p style={{ margin: "0 0 8px 0", color: "#065f46", fontWeight: "bold" }}>✅ Vault Active & Secured</p>
                  <p style={{ margin: 0, fontSize: "13px", color: "#047857" }}>Address: {walletAddress}</p>
                </div>
                <div style={{ background: "#fef2f2", border: "1px solid #f87171", padding: "16px", borderRadius: "6px" }}>
                  <p style={{ margin: "0 0 4px 0", color: "#991b1b", fontWeight: "bold" }}>🔒 Isolated Mnemonic Backup</p>
                  <p style={{ margin: 0, fontSize: "12px", fontFamily: "monospace", color: "#7f1d1d" }}>{mnemonic}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "dex" && (
          <div>
            <h2>Sepolia Swap Engine (DEX)</h2>
            <p style={{ color: "#6b7280", fontSize: "13px" }}>Trade tokens securely on the Sepolia testnet liquidity pool.</p>
            <div style={{ background: "#f9fafb", border: "1px dashed #d1d5db", padding: "30px", textAlign: "center", borderRadius: "6px", color: "#4b5563" }}>
              🔄 SepoliaSwapEngine Module Active (Ready for Testnet Swaps)
            </div>
          </div>
        )}

        {activeTab === "nft" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2>NFT Marketplace</h2>
              <button
                onClick={() => setIsModalOpen(true)}
                style={{ background: "#7c3aed", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}
              >
                + List New NFT
              </button>
            </div>
            <NftMarketView />
            <NftListModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
          </div>
        )}

        {activeTab === "launchpad" && (
          <div>
            <LaunchpadView walletAddress={walletAddress || "0x71C...38a9 (Guest)"} />
          </div>
        )}
      </main>
    </div>
  );
}
import React, { useState } from "react";

interface LaunchpadViewProps {
  walletAddress: string;
}

export const LaunchpadView: React.FC<LaunchpadViewProps> = ({ walletAddress }) => {
  const [commitAmount, setCommitAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const handleCommit = (projectId: string) => {
    if (!commitAmount || parseFloat(commitAmount) <= 0) {
      alert("Please enter a valid Sepolia ETH amount to commit.");
      return;
    }

    setLoading(true);
    setStatusMessage("⏳ Committing funds to Sepolia Launchpad...");

    setTimeout(() => {
      setStatusMessage(`✅ Successfully committed ${commitAmount} SEP ETH to Project #${projectId}!`);
      setLoading(false);
    }, 1200);
  };

  const handleClaim = (projectId: string) => {
    setLoading(true);
    setStatusMessage("⏳ Claiming project tokens...");

    setTimeout(() => {
      setStatusMessage(`🎉 Successfully claimed tokens for Project #${projectId}!`);
      setLoading(false);
    }, 1200);
  };

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif", maxWidth: "800px", margin: "0 auto" }}>
      <h2>🚀 Sepolia Token Launchpad (IDO)</h2>
      <p style={{ fontSize: "12px", color: "#666" }}>Connected Account: {walletAddress}</p>

      {statusMessage && (
        <div style={{ background: "#e8f5e9", padding: "10px", borderRadius: "6px", marginBottom: "16px", fontSize: "13px" }}>
          {statusMessage}
        </div>
      )}

      <div style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "16px", marginBottom: "16px", background: "#fafafa" }}>
        <h3>Earth Protocol (EARTH)</h3>
        <p style={{ fontSize: "13px", color: "#444" }}>Decentralized Green Energy Yield & Data Network on Sepolia Testnet.</p>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "13px", margin: "12px 0" }}>
          <div><strong>Total Raise Goal:</strong> 10.0 SEP ETH</div>
          <div><strong>Current Raised:</strong> 7.5 SEP ETH (75%)</div>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "12px" }}>
          <input
            type="text"
            placeholder="0.1 SEP ETH"
            value={commitAmount}
            onChange={(e) => setCommitAmount(e.target.value)}
            style={{ padding: "8px", width: "140px", boxSizing: "border-box" }}
          />
          <button
            onClick={() => handleCommit("earth-01")}
            disabled={loading}
            style={{ padding: "8px 16px", background: "#1976d2", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}
          >
            Commit Funds
          </button>
          <button
            onClick={() => handleClaim("earth-01")}
            disabled={loading}
            style={{ padding: "8px 16px", background: "#388e3c", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}
          >
            Claim Tokens
          </button>
        </div>
      </div>
    </div>
  );
};
import React, { useState } from "react";
import { SepoliaSwapEngine } from "../../lib/wallet/swap/swap-engine";
import { SwapQuoteResponse } from "../../lib/wallet/swap/types";

interface SwapViewProps {
  walletAddress: string;
}

export const SwapView: React.FC<SwapViewProps> = ({ walletAddress }) => {
  const [fromAmount, setFromAmount] = useState("");
  const [slippage, setSlippage] = useState<number>(0.5);
  const [quote, setQuote] = useState<SwapQuoteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const handleFetchQuote = async () => {
    if (!fromAmount || parseFloat(fromAmount) <= 0) {
      alert("Please enter a valid swap amount.");
      return;
    }

    setLoading(true);
    setStatusMessage("⏳ Fetching Sepolia DEX Quote...");

    try {
      const result = await SepoliaSwapEngine.getSwapQuote({
        tokenInAddress: "0x0000000000000000000000000000000000000000", // SEP ETH
        tokenOutAddress: "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984", // Mock Token
        amountIn: fromAmount,
        slippageTolerancePercent: slippage,
      });

      setQuote(result);
      setStatusMessage("✅ Quote received successfully.");
    } catch {
      setStatusMessage("❌ Failed to fetch quote from Sepolia Router.");
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteSwap = () => {
    if (!quote) return;
    const payload = SepoliaSwapEngine.generateSwapPayload(
      {
        tokenInAddress: "0x0000000000000000000000000000000000000000",
        tokenOutAddress: "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984",
        amountIn: fromAmount,
        slippageTolerancePercent: slippage,
      },
      quote.minimumAmountOut
    );

    setStatusMessage(`🚀 Swap Executed via Sepolia Router! Deadline: ${payload.deadline}`);
  };

  return (
    <div style={{ padding: "24px", fontFamily: "sans-serif", maxWidth: "420px", border: "1px solid #ccc", borderRadius: "8px" }}>
      <h3>💱 EARTH DEX Swap (Sepolia Testnet)</h3>
      
      <div style={{ marginBottom: "12px" }}>
        <label style={{ display: "block", fontSize: "12px", marginBottom: "4px" }}>You Pay (SEP ETH):</label>
        <input
          type="text"
          value={fromAmount}
          onChange={(e) => setFromAmount(e.target.value)}
          placeholder="0.0"
          style={{ width: "100%", padding: "8px" }}
        />
      </div>

      <div style={{ marginBottom: "12px" }}>
        <label style={{ display: "block", fontSize: "12px", marginBottom: "4px" }}>Slippage Tolerance:</label>
        <div style={{ display: "flex", gap: "8px" }}>
          {[0.1, 0.5, 1.0].map((s) => (
            <button
              key={s}
              onClick={() => setSlippage(s)}
              style={{
                padding: "4px 10px",
                background: slippage === s ? "#333" : "#eee",
                color: slippage === s ? "#fff" : "#000",
                border: "none",
                cursor: "pointer",
              }}
            >
              {s}%
            </button>
          ))}
        </div>
      </div>

      <button onClick={handleFetchQuote} disabled={loading} style={{ width: "100%", padding: "10px", cursor: "pointer", marginBottom: "12px" }}>
        {loading ? "Calculating..." : "Get Swap Quote"}
      </button>

      {quote && (
        <div style={{ background: "#f9f9f9", padding: "10px", fontSize: "12px", marginBottom: "12px", border: "1px solid #ddd" }}>
          <p>Expected Output: <strong>{quote.expectedAmountOut} TOKENS</strong></p>
          <p>Minimum Received (Slippage {slippage}%): <strong>{quote.minimumAmountOut} TOKENS</strong></p>
          <p>Estimated Gas: {quote.estimatedGasFeeEth} ETH</p>
          <p>Price Impact: {quote.priceImpactPercent}%</p>
        </div>
      )}

      {statusMessage && <p style={{ fontSize: "12px", background: "#eee", padding: "8px" }}>{statusMessage}</p>}

      {quote && (
        <button onClick={handleExecuteSwap} style={{ width: "100%", padding: "10px", background: "green", color: "#fff", border: "none", cursor: "pointer" }}>
          Confirm Swap
        </button>
      )}
    </div>
  );
};
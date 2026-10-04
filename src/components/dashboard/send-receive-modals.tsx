import React, { useState } from "react";
import { SepoliaSendPipeline } from "../../lib/wallet/transaction/send-pipeline";

interface SendModalProps {
  isOpen: boolean;
  onClose: () => void;
  senderAddress: string;
  senderBalanceEth: string;
}

export const SendModal: React.FC<SendModalProps> = ({
  isOpen,
  onClose,
  senderAddress,
  senderBalanceEth,
}) => {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleSend = async () => {
    setIsProcessing(true);
    setStatusMessage("⏳ Validating & Signing Transaction...");

    const result = await SepoliaSendPipeline.executeSend({
      recipientAddress: recipient,
      amountEth: amount,
      senderAddress,
      senderBalanceEth,
    });

    setIsProcessing(false);
    if (result.success) {
      setStatusMessage(`✅ Tx Confirmed! Hash: ${result.txHash?.substring(0, 10)}...`);
    } else {
      setStatusMessage(`❌ Transfer Failed: ${result.errorReason}`);
    }
  };

  return (
    <div style={{ position: "fixed", top: "20%", left: "30%", background: "#fff", border: "2px solid #333", padding: "20px", zIndex: 1000, width: "360px" }}>
      <h3>📤 Send Sepolia ETH</h3>
      <div style={{ marginBottom: "10px" }}>
        <label style={{ display: "block", fontSize: "12px" }}>Recipient EVM Address:</label>
        <input
          type="text"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="0x..."
          style={{ width: "100%", padding: "6px" }}
        />
      </div>
      <div style={{ marginBottom: "10px" }}>
        <label style={{ display: "block", fontSize: "12px" }}>Amount (SEP ETH):</label>
        <input
          type="text"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.01"
          style={{ width: "100%", padding: "6px" }}
        />
      </div>
      {statusMessage && <p style={{ fontSize: "12px", color: "#333", background: "#eee", padding: "8px" }}>{statusMessage}</p>}
      <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
        <button onClick={handleSend} disabled={isProcessing} style={{ padding: "8px 16px", cursor: "pointer" }}>
          Confirm & Send
        </button>
        <button onClick={onClose} style={{ padding: "8px 16px", cursor: "pointer" }}>
          Close
        </button>
      </div>
    </div>
  );
};

interface ReceiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
}

export const ReceiveModal: React.FC<ReceiveModalProps> = ({
  isOpen,
  onClose,
  walletAddress,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ position: "fixed", top: "20%", left: "30%", background: "#fff", border: "2px solid #333", padding: "20px", zIndex: 1000, width: "360px" }}>
      <h3>📥 Receive Assets</h3>
      <p style={{ fontSize: "12px", color: "#666" }}>Sepolia Testnet Only</p>
      
      {/* Simulated QR Code Box */}
      <div style={{ width: "150px", height: "150px", background: "#f0f0f0", border: "1px dashed #666", margin: "10px auto", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px" }}>
        [ QR CODE ]
      </div>

      <div style={{ background: "#eee", padding: "8px", wordBreak: "break-all", fontSize: "12px", marginBottom: "12px" }}>
        {walletAddress}
      </div>

      <div style={{ display: "flex", gap: "8px" }}>
        <button onClick={handleCopy} style={{ padding: "8px 16px", cursor: "pointer", flex: 1 }}>
          {copied ? "✅ Copied!" : "📋 Copy Address"}
        </button>
        <button onClick={onClose} style={{ padding: "8px 16px", cursor: "pointer" }}>
          Close
        </button>
      </div>
    </div>
  );
};
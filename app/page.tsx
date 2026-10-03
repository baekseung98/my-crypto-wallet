"use client";

import { useState, useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  WalletVault,
  NETWORKS,
  createNewWallet,
  restoreWalletFromMnemonic,
  encryptVault,
  decryptVault,
  fetchBalance,
  estimateGasFee,
  sendTransaction,
  fetchTransactionHistory,
  TransactionItem,
  copyToClipboardWithAutoClear,
} from "@/lib/wallet";

export default function Home() {
  const [password, setPassword] = useState("");
  const [inputPassword, setInputPassword] = useState("");
  const [mnemonicInput, setMnemonicInput] = useState("");
  const [vault, setVault] = useState<WalletVault | null>(null);
  const [encryptedStorage, setEncryptedStorage] = useState<string | null>(null);
  const [selectedNetworkKey, setSelectedNetworkKey] = useState<string>("sepolia");

  const [balance, setBalance] = useState<string>("0.0000");
  const [txHistory, setTxHistory] = useState<TransactionItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string>("");

  // 💸 송금 모달 state
  const [toAddress, setToAddress] = useState<string>("");
  const [sendAmount, setSendAmount] = useState<string>("");
  const [estimatedGas, setEstimatedGas] = useState<string>("0.0001");
  const [showSendModal, setShowSendModal] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  // 📥 Receive 모달 state
  const [showReceiveModal, setShowReceiveModal] = useState<boolean>(false);

  // 📜 Transaction Detail 모달 state
  const [selectedTx, setSelectedTx] = useState<TransactionItem | null>(null);

  // 복사 안내 메시지
  const [copyNotice, setCopyNotice] = useState<string>("");

  // 🔒 자동 잠금 (3분)
  const AUTO_LOCK_MS = 3 * 60 * 1000;
  const lockTimerRef = useRef<NodeJS.Timeout | null>(null);

  const currentNetwork = NETWORKS[selectedNetworkKey];

  // 🔒 P0: Auto-Lock 및 다중 탭 신호 감지
  const resetLockTimer = () => {
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    if (vault) {
      lockTimerRef.current = setTimeout(() => {
        // P0: 트랜잭션 실행 중일 때는 대기 후 진행
        if (isLoading) {
          resetLockTimer();
          return;
        }
        handleLockWithSignal();
        setStatusMsg("🔒 3분간 미활동으로 vault 참조 제거 및 잠금 처리되었습니다.");
      }, AUTO_LOCK_MS);
    }
  };

  // P0: 타 탭 잠금 이벤트 동기화 (storage 이벤트를 통한 비민감 신호 수신)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "earth_wallet_lock_event") {
        setVault(null);
        setInputPassword("");
        setShowReceiveModal(false);
        setShowSendModal(false);
        setShowConfirmModal(false);
        setSelectedTx(null);
        setStatusMsg("🔒 다른 탭에서 잠금 이벤트가 발생하여 현재 탭도 잠금 처리되었습니다.");
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  useEffect(() => {
    const handleActivity = () => resetLockTimer();
    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("click", handleActivity);

    resetLockTimer();

    return () => {
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("click", handleActivity);
    };
  }, [vault, isLoading]);

  useEffect(() => {
    const saved = localStorage.getItem("earth_wallet_vault");
    if (saved) {
      setEncryptedStorage(saved);
    }
  }, []);

  useEffect(() => {
    if (vault) {
      loadBalanceAndHistory();
      updateGasFee();
    }
  }, [vault, selectedNetworkKey]);

  const updateGasFee = async () => {
    const fee = await estimateGasFee(currentNetwork.rpcUrl);
    setEstimatedGas(fee);
  };

  const loadBalanceAndHistory = async () => {
    if (!vault) return;
    setIsLoading(true);
    const bal = await fetchBalance(vault.address, currentNetwork.rpcUrl);
    setBalance(bal);
    const history = await fetchTransactionHistory(vault.address, currentNetwork.rpcUrl);
    setTxHistory(history);
    setIsLoading(false);
  };

  const handleCreateWallet = () => {
    if (!password) {
      alert("지갑 암호화를 위한 비밀번호를 입력해주세요.");
      return;
    }
    const newV = createNewWallet();
    const enc = encryptVault(newV, password);
    localStorage.setItem("earth_wallet_vault", enc);
    setEncryptedStorage(enc);
    setVault(newV);
    setStatusMsg("새로운 Earth Wallet 지갑이 생성되었습니다!");
  };

  const handleRestoreWallet = () => {
    if (!password || !mnemonicInput) {
      alert("비밀번호와 시드 구문을 입력해주세요.");
      return;
    }
    try {
      const restored = restoreWalletFromMnemonic(mnemonicInput);
      const enc = encryptVault(restored, password);
      localStorage.setItem("earth_wallet_vault", enc);
      setEncryptedStorage(enc);
      setVault(restored);
      setStatusMsg("시드 구문으로 지갑 복구가 완료되었습니다.");
    } catch (e: any) {
      alert(e.message || "지갑 복구 실패");
    }
  };

  const handleUnlock = () => {
    if (!encryptedStorage || !inputPassword) return;
    const decrypted = decryptVault(encryptedStorage, inputPassword);
    if (decrypted) {
      setVault(decrypted);
      setStatusMsg("지갑 잠금이 해제되었습니다.");
    } else {
      alert("비밀번호가 일치하지 않습니다.");
    }
  };

  // P0: 잠금 시 타 탭 동기화 신호 방출 (민감정보 없이 타임스탬프 단독 전송)
  const handleLockWithSignal = () => {
    handleLock();
    localStorage.setItem("earth_wallet_lock_event", Date.now().toString());
  };

  const handleLock = () => {
    setVault(null);
    setInputPassword("");
    setShowReceiveModal(false);
    setShowSendModal(false);
    setShowConfirmModal(false);
    setSelectedTx(null);
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
  };

  const handleOpenSendModal = () => {
    if (!toAddress || !sendAmount) {
      alert("수신 주소와 송금 금액을 입력해 주세요.");
      return;
    }
    updateGasFee();
    setShowConfirmModal(true);
  };

  const handleExecuteSend = async () => {
    if (!vault) return;
    setShowConfirmModal(false);
    setShowSendModal(false);
    setIsLoading(true);
    setStatusMsg("트랜잭션 전송 중...");

    const res = await sendTransaction(
      vault.privateKey,
      toAddress,
      sendAmount,
      currentNetwork.rpcUrl
    );

    setIsLoading(false);
    if (res.error) {
      alert(`송금 실패: ${res.error}`);
      setStatusMsg(`오류: ${res.error}`);
    } else {
      alert(`송금 성공! Hash: ${res.hash}`);
      setStatusMsg(`송금 완료! Hash: ${res.hash?.slice(0, 10)}...`);
      setToAddress("");
      setSendAmount("");
      loadBalanceAndHistory();
    }
  };

  const handleCopy = async (text: string, label: string) => {
    const ok = await copyToClipboardWithAutoClear(text, 30000);
    if (ok) {
      setCopyNotice(`${label} 복사됨 (30초 후 클립보드 초기화 시도)`);
      setTimeout(() => setCopyNotice(""), 4000);
    }
  };

  const totalAmountNeeded = (parseFloat(sendAmount || "0") + parseFloat(estimatedGas)).toFixed(6);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 flex flex-col items-center">
      {/* 🌍 Earth Wallet Dashboard 상단 헤더 */}
      <header className="w-full max-w-2xl flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌍</span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              Earth Wallet
            </h1>
            <span className="text-[10px] text-slate-400 block -mt-1 font-mono">
              Dashboard (v0.2.0-Hardened)
            </span>
          </div>
        </div>

        {/* 네트워크 및 잠금 버튼 */}
        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 text-xs font-semibold rounded-full border ${
              currentNetwork.isTestnet
                ? "bg-purple-950/80 text-purple-300 border-purple-500/50"
                : "bg-emerald-950/80 text-emerald-300 border-emerald-500/50"
            }`}
          >
            {currentNetwork.isTestnet ? "🟣 Testnet" : "🟢 Mainnet"}
          </span>
          <select
            value={selectedNetworkKey}
            onChange={(e) => setSelectedNetworkKey(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
          >
            {Object.entries(NETWORKS).map(([key, net]) => (
              <option key={key} value={key}>
                {net.name}
              </option>
            ))}
          </select>

          {vault && (
            <button
              onClick={handleLockWithSignal}
              className="text-xs bg-slate-900 hover:bg-red-950 hover:text-red-300 px-3 py-1.5 rounded-lg text-slate-400 border border-slate-800 transition"
            >
              🔒 Lock
            </button>
          )}
        </div>
      </header>

      {/* 안내 메시지 */}
      {statusMsg && (
        <div className="w-full max-w-2xl mb-4 p-3 rounded-lg bg-teal-950/50 border border-teal-500/30 text-teal-200 text-xs text-center">
          {statusMsg}
        </div>
      )}

      {copyNotice && (
        <div className="w-full max-w-2xl mb-4 p-3 rounded-lg bg-amber-950/50 border border-amber-500/30 text-amber-200 text-xs text-center">
          {copyNotice}
        </div>
      )}

      {/* 1. 지갑 미보유 */}
      {!vault && !encryptedStorage && (
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-lg font-bold text-center text-slate-200">Earth Wallet 시작하기</h2>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              보안 암호화 비밀번호
            </label>
            <input
              type="password"
              placeholder="비밀번호 설정"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-teal-500 outline-none"
            />
          </div>

          <button
            onClick={handleCreateWallet}
            className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-slate-950 font-bold py-2.5 rounded-lg text-sm transition"
          >
            신규 지갑 생성
          </button>

          <div className="pt-4 border-t border-slate-800">
            <label className="block text-xs font-medium text-slate-400 mb-1">시드 구문 복구</label>
            <textarea
              placeholder="12개 단어 입력"
              value={mnemonicInput}
              onChange={(e) => setMnemonicInput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-100 h-16 focus:border-teal-500 outline-none mb-2"
            />
            <button
              onClick={handleRestoreWallet}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-2 rounded-lg text-xs transition"
            >
              시드 구문으로 복구
            </button>
          </div>
        </div>
      )}

      {/* 2. 지갑 잠김 */}
      {!vault && encryptedStorage && (
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 text-center">
          <span className="text-4xl">🔐</span>
          <h2 className="text-lg font-bold text-slate-200">Earth Wallet 잠김</h2>
          <p className="text-xs text-slate-400">설정하신 비밀번호를 입력하여 해제하세요.</p>

          <input
            type="password"
            placeholder="비밀번호 입력"
            value={inputPassword}
            onChange={(e) => setInputPassword(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-teal-500 outline-none"
          />

          <button
            onClick={handleUnlock}
            className="w-full bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold py-2.5 rounded-lg text-sm transition"
          >
            지갑 잠금 해제
          </button>
        </div>
      )}

      {/* 3. 대시보드 */}
      {vault && (
        <div className="w-full max-w-2xl space-y-6">
          {/* Main Balance 카드 */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative">
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="text-xs text-slate-400 font-mono">My Address</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-sm font-semibold text-slate-200">
                    {vault.address.slice(0, 8)}...{vault.address.slice(-6)}
                  </span>
                  <button
                    onClick={() => handleCopy(vault.address, "주소")}
                    className="text-xs bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded text-slate-300"
                  >
                    복사
                  </button>
                </div>
              </div>
            </div>

            {/* 메인 잔액 */}
            <div className="my-5 text-center py-5 bg-slate-950/70 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 block mb-1">
                Main Balance ({currentNetwork.name})
              </span>
              <div className="text-3xl font-black text-emerald-400 tracking-tight">
                {isLoading ? "조회 중..." : `${balance} ${currentNetwork.symbol}`}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                onClick={() => setShowSendModal(true)}
                className="bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-slate-950 font-bold py-3 rounded-xl text-sm transition flex items-center justify-center gap-2"
              >
                <span>💸</span> Send
              </button>
              <button
                onClick={() => setShowReceiveModal(true)}
                className="bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/30 font-bold py-3 rounded-xl text-sm transition flex items-center justify-center gap-2"
              >
                <span>📥</span> Receive
              </button>
            </div>

            {/* 시드 및 개인키 복사 */}
            <div className="flex gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => handleCopy(vault.mnemonic, "시드 구문")}
                className="flex-1 py-1.5 text-xs bg-slate-950 hover:bg-slate-800 rounded text-slate-400 border border-slate-800"
              >
                Seed Phrase 🔑
              </button>
              <button
                onClick={() => handleCopy(vault.privateKey, "개인키")}
                className="flex-1 py-1.5 text-xs bg-slate-950 hover:bg-slate-800 rounded text-slate-400 border border-slate-800"
              >
                Private Key 🛡️
              </button>
            </div>
          </div>

          {/* Assets */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-1.5">
              <span>💎</span> Assets (보유 자산)
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-teal-950 border border-teal-500/30 flex items-center justify-center font-bold text-xs text-teal-300">
                    {currentNetwork.symbol}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-200">{currentNetwork.symbol}</div>
                    <div className="text-[10px] text-slate-500">{currentNetwork.name} Native Token</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-emerald-400">{balance} {currentNetwork.symbol}</div>
                  <div className="text-[10px] text-slate-500">Native Asset</div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-1.5">
              <span>📜</span> Recent Activity (최근 거래)
            </h3>
            {txHistory.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">최근 거래 내역이 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {txHistory.map((tx) => (
                  <div
                    key={tx.hash}
                    onClick={() => setSelectedTx(tx)}
                    className="flex justify-between items-center bg-slate-950 hover:bg-slate-800/80 p-3 rounded-xl text-xs font-mono border border-slate-800 cursor-pointer transition"
                  >
                    <div>
                      <div className="text-teal-400 font-semibold">
                        Tx: {tx.hash.slice(0, 10)}...{tx.hash.slice(-6)}
                      </div>
                      <div className="text-slate-500 text-[10px] mt-0.5">
                        To: {tx.to.slice(0, 6)}...{tx.to.slice(-4)} | Block #{tx.blockNumber}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-emerald-400 font-semibold block">{tx.value} ETH</span>
                      <span className="text-[10px] text-teal-300/80">Confirmed</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Transaction Detail 모달 */}
      {selectedTx && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>🔍</span> Transaction Detail
              </h3>
              <button
                onClick={() => setSelectedTx(null)}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <span className="text-slate-500 block text-[10px]">Status</span>
                <span className="inline-block px-2 py-0.5 mt-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                  Confirmed (Success)
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px]">Network</span>
                <span className="text-slate-300">{currentNetwork.name}</span>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px]">Transaction Hash</span>
                <div className="flex justify-between items-center bg-slate-950 p-2 rounded border border-slate-800 mt-0.5">
                  <span className="text-teal-400 break-all text-[11px]">{selectedTx.hash}</span>
                  <button
                    onClick={() => handleCopy(selectedTx.hash, "Tx Hash")}
                    className="ml-2 text-[10px] bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded text-slate-300 shrink-0"
                  >
                    복사
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500 block text-[10px]">From</span>
                  <p className="text-slate-300 bg-slate-950 p-2 rounded border border-slate-800 break-all text-[10px] mt-0.5">
                    {selectedTx.from}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">To</span>
                  <p className="text-slate-300 bg-slate-950 p-2 rounded border border-slate-800 break-all text-[10px] mt-0.5">
                    {selectedTx.to}
                  </p>
                </div>
              </div>

              <div className="flex justify-between py-2 bg-slate-950 px-3 rounded border border-slate-800">
                <span className="text-slate-400">Amount Sent:</span>
                <span className="text-emerald-400 font-bold">{selectedTx.value} ETH</span>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px]">Block Number</span>
                <span className="text-slate-300">#{selectedTx.blockNumber}</span>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <a
                href={`${currentNetwork.explorerUrl}/tx/${selectedTx.hash}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 bg-teal-500 hover:bg-teal-600 text-slate-950 text-center font-bold py-2.5 rounded-lg text-xs transition block"
              >
                View on Etherscan ↗
              </a>
              <button
                onClick={() => setSelectedTx(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2.5 rounded-lg text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receive 모달 */}
      {showReceiveModal && vault && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4 text-center">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-1.5">
                <span>📥</span> Receive Assets
              </h3>
              <button
                onClick={() => setShowReceiveModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="text-xs bg-slate-950 py-1.5 px-3 rounded-full inline-block text-purple-300 border border-purple-500/30">
              네트워크: {currentNetwork.name}
            </div>

            <div className="bg-white p-4 rounded-xl inline-block shadow-inner">
              <QRCodeSVG value={vault.address} size={180} level="H" />
            </div>

            <div>
              <span className="text-[11px] text-slate-400 block mb-1">지갑 주소</span>
              <p className="text-xs font-mono font-semibold text-slate-200 bg-slate-950 p-2.5 rounded-lg border border-slate-800 break-all">
                {vault.address}
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={() => handleCopy(vault.address, "지갑 주소")}
                className="w-full bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold py-2.5 rounded-lg text-xs transition"
              >
                Copy Address (주소 복사)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send 모달 */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>💸</span> Send Asset
              </h3>
              <button
                onClick={() => setShowSendModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">수신 주소 (To Address)</label>
                <input
                  type="text"
                  placeholder="0x..."
                  value={toAddress}
                  onChange={(e) => setToAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:border-teal-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">송금 수량 (Amount)</label>
                <input
                  type="number"
                  step="0.0001"
                  placeholder="0.0"
                  value={sendAmount}
                  onChange={(e) => setSendAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:border-teal-500 outline-none"
                />
              </div>

              <div className="text-xs text-teal-400 font-mono text-right">
                예상 가스비: ~{estimatedGas} {currentNetwork.symbol}
              </div>

              <button
                onClick={handleOpenSendModal}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-slate-950 font-bold py-2.5 rounded-lg text-sm transition"
              >
                송금 내역 확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Confirm 모달 */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-100 border-b border-slate-800 pb-3">
              Send {currentNetwork.symbol} 최종 확인
            </h3>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-slate-800/50">
                <span className="text-slate-400">To:</span>
                <span className="text-slate-200">
                  {toAddress.slice(0, 10)}...{toAddress.slice(-6)}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-800/50">
                <span className="text-slate-400">Amount:</span>
                <span className="text-teal-400 font-bold">
                  {sendAmount} {currentNetwork.symbol}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-800/50">
                <span className="text-slate-400">Estimated Gas:</span>
                <span className="text-slate-300">
                  {estimatedGas} {currentNetwork.symbol}
                </span>
              </div>

              <div className="flex justify-between py-2 bg-slate-950 px-3 rounded-lg border border-slate-800">
                <span className="text-slate-300 font-bold">Total Needed:</span>
                <span className="text-emerald-400 font-black">
                  {totalAmountNeeded} {currentNetwork.symbol}
                </span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-lg text-xs transition"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteSend}
                className="flex-1 bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold py-2.5 rounded-lg text-xs transition"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
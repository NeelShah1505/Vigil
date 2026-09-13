"use client";

import { useEffect, useState, useMemo } from "react";
import type { AgentState } from "@fatera/types";
import {
  Activity,
  ArrowRightLeft,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Cpu,
  ExternalLink,
  Layers,
  Play,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Volume2,
  VolumeX,
  Wallet,
  X,
  Zap,
} from "lucide-react";

// Web Audio sound synthesizer for realistic terminal audio cues
function playSound(type: "click" | "success" | "chime" | "warn") {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === "click") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.04);
      osc.start(now);
      osc.stop(now + 0.04);
    } else if (type === "success") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.08);
      osc.frequency.setValueAtTime(783.99, now + 0.16);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === "chime") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.15);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === "warn") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.linearRampToValueAtTime(200, now + 0.12);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    }
  } catch {
    // AudioContext silenced if unpermitted
  }
}

export default function Dashboard() {
  const [data, setData] = useState<{
    state: AgentState | null;
    events: any[];
    online: boolean;
  }>({
    state: null,
    events: [],
    online: false,
  });

  const [isRunning, setIsRunning] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Inspector modal states
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);
  const [showIdentityModal, setShowIdentityModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Filter states
  const [eventFilter, setEventFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const triggerSound = (type: "click" | "success" | "chime" | "warn") => {
    if (soundEnabled) playSound(type);
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    triggerSound("chime");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const fetchState = async () => {
    try {
      const res = await fetch("/api/state");
      if (res.ok) {
        const json = await res.json();
        setData({
          state: json.state,
          events: json.events || [],
          online: json.online,
        });
      }
    } catch {
      // ignore poll glitches
    }
  };

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleRunDemo = async () => {
    triggerSound("click");
    setIsRunning(true);
    setActionMessage("Initiating autonomous working capital cycle on Hedera Testnet...");
    try {
      const res = await fetch("/api/demo/start", { method: "POST" });
      const json = await res.json();
      setActionMessage(json.message || "Autonomous demo execution triggered.");
      triggerSound("success");
      setTimeout(fetchState, 1500);
    } catch (err: any) {
      setActionMessage(`Error starting demo: ${err.message}`);
      triggerSound("warn");
    } finally {
      setTimeout(() => setIsRunning(false), 5000);
    }
  };

  const handleResetDemo = async () => {
    triggerSound("click");
    setIsResetting(true);
    setActionMessage("Resetting balances to initial state (100 HBAR / 0 FUSDC)...");
    try {
      const res = await fetch("/api/demo/reset", { method: "POST" });
      const json = await res.json();
      setActionMessage(json.message || "Reset completed.");
      triggerSound("success");
      setTimeout(fetchState, 1500);
    } catch (err: any) {
      setActionMessage(`Error resetting: ${err.message}`);
      triggerSound("warn");
    } finally {
      setIsResetting(false);
    }
  };

  const state = data.state;
  const config = state?.config;
  const hashscanBase = config?.hashscanBase || "https://hashscan.io/testnet";

  const hbarBalanceNum = state ? Number(state.balances.hbarTinybars) / 100_000_000 : 0;
  const hbarBalance = hbarBalanceNum.toFixed(4);
  const hbarUsdEstimate = (hbarBalanceNum * 0.115).toFixed(2);

  const fusdcBalanceNum = state ? Number(state.balances.fusdcBaseUnits) / 1_000_000 : 0;
  const fusdcBalance = fusdcBalanceNum.toFixed(4);

  const forecast = state?.latestForecast;
  const pcr = forecast ? Math.min(200, Math.max(0, forecast.pcrPct)) : 0;
  const pcrState = forecast?.state || (fusdcBalanceNum > 0 ? "HEALTHY" : "CRITICAL");

  const obligation = state?.obligations?.[0];
  const payments = state?.payments || [];
  const routeEval = state?.latestRouteEvaluation;

  // Filtered payments
  const filteredPayments = useMemo(() => {
    if (!searchQuery) return payments;
    return payments.filter(
      (p) =>
        p.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.txId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(p.callIndex).includes(searchQuery)
    );
  }, [payments, searchQuery]);

  // Filtered HCS events
  const filteredEvents = useMemo(() => {
    if (eventFilter === "ALL") return data.events;
    return data.events.filter((evt) => {
      const type = (evt.type || "").toUpperCase();
      if (eventFilter === "SWAP") return type.includes("SWAP");
      if (eventFilter === "PAYMENT") return type.includes("PAYMENT");
      if (eventFilter === "SHORTFALL") return type.includes("SHORTFALL");
      return true;
    });
  }, [data.events, eventFilter]);

  // Gauge calculation
  const gaugePct = Math.min(100, Math.max(0, pcr));
  const gaugeColor =
    pcrState === "HEALTHY" ? "#22D3A7" : pcrState === "WARN" ? "#F5A623" : "#F43F5E";

  return (
    <div className="min-h-screen bg-[#060A12] text-slate-100 flex flex-col font-sans selection:bg-teal-400/20 selection:text-teal-300 relative">
      {/* Background ambient lighting halos */}
      <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse-slow"></div>
      <div className="fixed top-1/3 right-1/4 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>

      {/* Top Header Navbar */}
      <header className="border-b border-white/[0.08] bg-[#070D1A]/90 backdrop-blur-xl sticky top-0 z-40 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo & Title */}
          <div className="flex items-center gap-3.5">
            <div className="relative group cursor-pointer">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-400 via-emerald-400 to-cyan-400 p-[1.5px] shadow-[0_0_20px_rgba(34,211,167,0.3)] flex items-center justify-center">
                <div className="w-full h-full bg-[#070D1A] rounded-[10px] flex items-center justify-center">
                  <Zap className="w-5 h-5 text-teal-400 fill-teal-400" />
                </div>
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-400"></span>
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <span className="font-heading font-extrabold tracking-wider text-white text-xl">
                  FATERA
                </span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-teal-400/15 text-teal-300 font-mono font-bold border border-teal-400/30 tracking-widest shadow-sm">
                  WORKING CAPITAL OS
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span className="text-slate-300 font-medium">Hedera Testnet</span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-400">x402 Agentic Payment & Solvency Engine</span>
              </div>
            </div>
          </div>

          {/* Quick Telemetry & Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap justify-end">
            {/* Audio Toggle */}
            <button
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                if (!soundEnabled) playSound("chime");
              }}
              className={`p-2 rounded-xl border transition-all text-xs flex items-center gap-1.5 ${
                soundEnabled
                  ? "bg-teal-500/15 border-teal-500/40 text-teal-300 shadow-[0_0_12px_rgba(34,211,167,0.2)]"
                  : "bg-white/[0.04] border-white/10 text-slate-400 hover:text-slate-200"
              }`}
              title={soundEnabled ? "Mute audio cues" : "Enable futuristic terminal sound effects"}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Agent Identity Modal Trigger */}
            <button
              onClick={() => {
                setShowIdentityModal(true);
                triggerSound("click");
              }}
              className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs text-slate-300 hover:text-white transition-all group"
            >
              <Cpu className="w-3.5 h-3.5 text-purple-400 group-hover:text-purple-300 transition-colors" />
              <span>Identity:</span>
              <span className="font-mono text-teal-300 font-semibold">0.0.10510026</span>
              <span className="text-[9px] px-1 rounded bg-purple-500/20 text-purple-200 font-bold border border-purple-500/30">
                HCS-14
              </span>
            </button>

            {/* Scheduled Forward Renewal Badge */}
            <button
              onClick={() => {
                setShowScheduleModal(true);
                triggerSound("click");
              }}
              className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-500/10 hover:bg-sky-500/15 border border-sky-500/25 text-xs text-sky-300 transition-all"
            >
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <span>Schedule:</span>
              <span className="font-mono font-semibold">0.0.10521550</span>
              <span className="text-[9px] px-1 rounded bg-sky-400/20 text-sky-200 font-bold">
                AUTO
              </span>
            </button>

            {/* Reset Button */}
            <button
              onClick={handleResetDemo}
              disabled={isResetting || isRunning}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-700/80 bg-slate-800/80 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-all disabled:opacity-50 hover:border-slate-500 active:scale-95 cursor-pointer"
              title="Reset balances to 100 HBAR & 0 FUSDC"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? "animate-spin text-amber-400" : ""}`} />
              <span className="hidden sm:inline">Reset</span>
            </button>

            {/* Primary Action Button: Run Demo */}
            <button
              onClick={handleRunDemo}
              disabled={isRunning}
              className="relative group overflow-hidden flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-400 via-emerald-400 to-cyan-400 hover:from-teal-300 hover:to-cyan-300 text-slate-950 font-black text-xs shadow-[0_0_25px_rgba(34,211,167,0.4)] transition-all disabled:opacity-50 active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <Play className={`w-3.5 h-3.5 fill-slate-950 ${isRunning ? "animate-spin" : ""}`} />
              <span>{isRunning ? "Executing Run..." : "Run Autonomous Demo"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Notification / Toast Banner */}
      {actionMessage && (
        <div className="bg-gradient-to-r from-teal-950/90 via-slate-900/90 to-teal-950/90 border-b border-teal-500/30 px-4 py-2.5 text-center text-xs text-teal-300 flex items-center justify-center gap-2.5 backdrop-blur-md">
          <Activity className="w-4 h-4 text-teal-400 animate-spin" />
          <span className="font-medium tracking-wide">{actionMessage}</span>
          <button
            onClick={() => setActionMessage(null)}
            className="ml-4 text-slate-400 hover:text-white text-xs underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Workspace Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 space-y-8 w-full">
        {/* =========================================================================
            SECTION 1: Interactive Agentic Workflow Pipeline
            ========================================================================= */}
        <section className="glass-card rounded-2xl p-5 border border-white/[0.08] shadow-glass relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-400" />
              <span className="font-heading text-xs font-bold uppercase tracking-wider text-slate-300">
                Autonomous Working Capital Pipeline
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-radar"></span>
              <span>Hedera Consensus Finality: ~2.3s</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
            {/* Step 1: Agent Treasury */}
            <div className="bg-[#09101F]/80 rounded-xl p-4 border border-white/[0.06] flex flex-col justify-between relative group hover:border-teal-400/40 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 font-bold border border-teal-500/20">
                  Node 01 • Agent
                </span>
                <Wallet className="w-4 h-4 text-slate-400 group-hover:text-teal-400 transition-colors" />
              </div>
              <div className="mt-3">
                <div className="text-sm font-heading font-bold text-white">Autonomous Treasury</div>
                <div className="text-xs font-mono text-slate-400 mt-0.5">Account: 0.0.10510026</div>
              </div>
              <div className="mt-3 pt-2 border-t border-white/[0.05] text-[11px] text-slate-400 flex items-center justify-between">
                <span>Holdings:</span>
                <span className="font-mono text-teal-300">{hbarBalance} ℏ</span>
              </div>
            </div>

            {/* Step 2: FateraRouter LP */}
            <div className="bg-[#09101F]/80 rounded-xl p-4 border border-white/[0.06] flex flex-col justify-between relative group hover:border-purple-400/40 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 font-bold border border-purple-500/30">
                  Node 02 • Router
                </span>
                <ArrowRightLeft className="w-4 h-4 text-slate-400 group-hover:text-purple-300 transition-colors" />
              </div>
              <div className="mt-3">
                <div className="text-sm font-heading font-bold text-white">FateraRouter LP</div>
                <div className="text-xs font-mono text-slate-400 mt-0.5">Rate: 2 HBAR/FUSDC + 30bps</div>
              </div>
              <div className="mt-3 pt-2 border-t border-white/[0.05] text-[11px] text-slate-400 flex items-center justify-between">
                <span>Liquidity:</span>
                <span className="font-mono text-purple-300">2-Leg Mirror Settle</span>
              </div>
            </div>

            {/* Step 3: Merchant x402 Service */}
            <div className="bg-[#09101F]/80 rounded-xl p-4 border border-white/[0.06] flex flex-col justify-between relative group hover:border-sky-400/40 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 font-bold border border-sky-500/30">
                  Node 03 • Merchant
                </span>
                <Cpu className="w-4 h-4 text-slate-400 group-hover:text-sky-400 transition-colors" />
              </div>
              <div className="mt-3">
                <div className="text-sm font-heading font-bold text-white">Market Intel API</div>
                <div className="text-xs font-mono text-slate-400 mt-0.5">x402 Metered Gate</div>
              </div>
              <div className="mt-3 pt-2 border-t border-white/[0.05] text-[11px] text-slate-400 flex items-center justify-between">
                <span>Pricing:</span>
                <span className="font-mono text-sky-300">1.00 FUSDC/call</span>
              </div>
            </div>

            {/* Step 4: Hedera Consensus Topic */}
            <div className="bg-[#09101F]/80 rounded-xl p-4 border border-white/[0.06] flex flex-col justify-between relative group hover:border-emerald-400/40 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/30">
                  Node 04 • HCS
                </span>
                <Layers className="w-4 h-4 text-slate-400 group-hover:text-emerald-400 transition-colors" />
              </div>
              <div className="mt-3">
                <div className="text-sm font-heading font-bold text-white">Consensus Audit</div>
                <div className="text-xs font-mono text-slate-400 mt-0.5">Topic: 0.0.10510035</div>
              </div>
              <div className="mt-3 pt-2 border-t border-white/[0.05] text-[11px] text-slate-400 flex items-center justify-between">
                <span>Security:</span>
                <span className="font-mono text-emerald-400">Verifiable Ledger</span>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            SECTION 2: Solvency Command Center (KPI Bento Grid)
            ========================================================================= */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: HBAR Reserve Asset */}
          <div className="glass-card rounded-2xl p-6 border border-white/[0.08] shadow-glass flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-heading font-bold uppercase tracking-wider text-slate-400">
                  HBAR Treasury Reserve
                </span>
                <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-sm shadow-sm">
                  ℏ
                </div>
              </div>
              <div className="mt-4">
                <div className="text-3xl font-heading font-extrabold text-white tracking-tight tabular-nums flex items-baseline gap-2">
                  <span>{hbarBalance}</span>
                  <span className="text-sm font-medium text-slate-400 font-mono">HBAR</span>
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xs font-mono text-slate-400">
                    ≈ ${hbarUsdEstimate} USD
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {state?.balances?.hbarTinybars || "0"} tb
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-6 pt-3.5 border-t border-white/[0.06] flex items-center justify-between text-xs">
              <span className="text-slate-400">Collateral Status</span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-medium border border-emerald-500/25 text-[11px]">
                Unencumbered
              </span>
            </div>
          </div>

          {/* Card 2: FUSDC Operating Liquidity */}
          <div className="glass-card rounded-2xl p-6 border border-white/[0.08] shadow-glass flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-heading font-bold uppercase tracking-wider text-slate-400">
                  FUSDC Working Capital
                </span>
                <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center font-bold text-sm shadow-sm">
                  $
                </div>
              </div>
              <div className="mt-4">
                <div className="text-3xl font-heading font-extrabold text-teal-300 text-glow-teal tracking-tight tabular-nums flex items-baseline gap-2">
                  <span>{fusdcBalance}</span>
                  <span className="text-sm font-medium text-slate-400 font-mono">FUSDC</span>
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <a
                    href={`${hashscanBase}/token/${config?.tokenId || "0.0.10510032"}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-mono text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                  >
                    <span>ID: {config?.tokenId || "0.0.10510032"}</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </a>
                </div>
              </div>
            </div>
            <div className="mt-6 pt-3.5 border-t border-white/[0.06] flex items-center justify-between text-xs">
              <span className="text-slate-400">HTS Fixed Fee</span>
              <span className="font-mono text-purple-300 font-semibold bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 text-[11px]">
                0.01 FUSDC
              </span>
            </div>
          </div>

          {/* Card 3: Solvency Coverage Ratio (PCR) */}
          <div className="glass-card rounded-2xl p-6 border border-white/[0.08] shadow-glass flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-heading font-bold uppercase tracking-wider text-slate-400">
                  Payment Coverage (PCR)
                </span>
                <span
                  className={`text-[10px] px-2.5 py-0.5 rounded-full font-heading font-bold uppercase tracking-wider ${
                    pcrState === "HEALTHY"
                      ? "bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-[0_0_12px_rgba(34,211,167,0.3)]"
                      : pcrState === "WARN"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      : "bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.3)]"
                  }`}
                >
                  {pcrState}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-4">
                {/* Properly Constrained SVG Circular Gauge */}
                <div className="relative w-16 h-16 flex-shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-slate-800"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      stroke={gaugeColor}
                      strokeDasharray={`${gaugePct}, 100`}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      fill="none"
                      className="transition-all duration-700 ease-out"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center font-mono font-bold text-xs text-white">
                    {pcr.toFixed(0)}%
                  </div>
                </div>

                <div>
                  <div className="text-2xl font-heading font-extrabold text-white tabular-nums">
                    {pcr.toFixed(1)}%
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 font-sans">
                    {forecast && forecast.shortfallFusdc > 0 ? (
                      <span className="text-rose-400 font-medium">
                        Shortfall: {forecast.shortfallFusdc.toFixed(2)} FUSDC
                      </span>
                    ) : (
                      <span className="text-teal-300 font-medium">Solvent & Fully Funded</span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3.5 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
              <span>Safety Target</span>
              <span className="font-mono text-slate-300 font-medium">≥ 110.0%</span>
            </div>
          </div>

          {/* Card 4: Obligation Horizon */}
          <div className="glass-card rounded-2xl p-6 border border-white/[0.08] shadow-glass flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-heading font-bold uppercase tracking-wider text-slate-400">
                  Active Obligation
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold uppercase bg-sky-500/15 text-sky-300 border border-sky-500/30">
                  {obligation?.status || "FULFILLED"}
                </span>
              </div>

              <div className="mt-4">
                <div className="text-3xl font-heading font-extrabold text-white tracking-tight tabular-nums flex items-baseline gap-2">
                  <span>
                    {obligation?.requiredFusdc ? obligation.requiredFusdc.toFixed(2) : "10.30"}
                  </span>
                  <span className="text-sm font-medium text-slate-400 font-mono">FUSDC</span>
                </div>
                <div className="text-xs text-slate-400 mt-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>SLA Horizon: ~30 min window</span>
                </div>
              </div>
            </div>

            {/* Segmented 10-call progress indicators */}
            <div className="mt-4 pt-3.5 border-t border-white/[0.06]">
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
                <span>Progress</span>
                <span className="font-mono text-slate-200">
                  {payments.length} / 10 settled
                </span>
              </div>
              <div className="grid grid-cols-10 gap-1">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${
                      i < payments.length
                        ? "bg-teal-400 shadow-[0_0_8px_rgba(34,211,167,0.6)]"
                        : "bg-white/[0.08]"
                    }`}
                  ></div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            SECTION 3: Autonomous Liquidity Route Matrix (DEX vs LP Comparison)
            ========================================================================= */}
        <section className="glass-card rounded-2xl border border-white/[0.08] p-6 shadow-glass">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.06]">
            <div>
              <div className="flex items-center gap-2.5">
                <ArrowRightLeft className="w-5 h-5 text-teal-400" />
                <h2 className="text-lg font-heading font-bold text-white">
                  Autonomous Liquidity Route Matrix
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Real-time algorithmic venue evaluation comparing FateraRouter LP, SaucerSwap AMM, and secondary liquidity paths.
              </p>
            </div>

            {routeEval?.selected && (
              <div className="self-start sm:self-auto flex items-center gap-2 px-3 py-1.5 rounded-xl bg-teal-500/15 text-teal-300 font-mono font-bold border border-teal-500/30 shadow-[0_0_12px_rgba(34,211,167,0.2)] text-xs">
                <CheckCircle2 className="w-4 h-4 text-teal-400" />
                <span>Selected: {routeEval.selected}</span>
              </div>
            )}
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase text-slate-400 border-b border-white/[0.06] font-mono tracking-wider">
                  <th className="py-3 px-4">Route ID</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Cost (HBAR)</th>
                  <th className="py-3 px-4">Fee (bps)</th>
                  <th className="py-3 px-4">Risk Penalty</th>
                  <th className="py-3 px-4">Protocol Mechanism</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] font-mono text-xs">
                {routeEval?.quotes?.map((q) => {
                  const isSelected = q.id === routeEval.selected;
                  return (
                    <tr
                      key={q.id}
                      className={`transition-colors ${
                        isSelected
                          ? "bg-teal-500/[0.08] text-white font-medium hover:bg-teal-500/[0.12]"
                          : "text-slate-400 hover:bg-white/[0.02]"
                      }`}
                    >
                      <td className="py-4 px-4 font-bold flex items-center gap-2.5 text-white">
                        {isSelected ? (
                          <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping"></span>
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-slate-600"></span>
                        )}
                        <span className="font-heading tracking-wide text-sm">{q.id}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${
                            q.available
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : "bg-slate-800/80 text-slate-400 border border-slate-700"
                          }`}
                        >
                          {q.available ? "AVAILABLE" : "UNAVAILABLE"}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-white font-bold text-sm tabular-nums">
                        {q.available ? `${q.costHbar.toFixed(4)} ℏ` : "—"}
                      </td>
                      <td className="py-4 px-4 tabular-nums">{q.feeBps} bps</td>
                      <td className="py-4 px-4 tabular-nums text-slate-300">
                        {q.riskPenaltyHbar.toFixed(2)} ℏ
                      </td>
                      <td className="py-4 px-4 text-slate-300 font-sans text-xs max-w-xs">
                        {q.detail}
                      </td>
                      <td className="py-4 px-4 text-right">
                        {isSelected ? (
                          <span className="px-2.5 py-1 rounded-md bg-teal-400 text-slate-950 font-black text-[10px] uppercase tracking-wider">
                            EXECUTED
                          </span>
                        ) : (
                          <span className="text-slate-500 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                }) || (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500 font-sans">
                      No route evaluation on record. Run the demo to trigger algorithmic routing.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {routeEval?.reason && (
            <div className="mt-4 p-4 rounded-xl bg-[#09101F] border border-white/[0.06] text-xs text-slate-300 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-teal-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-heading font-bold text-white text-sm">
                  Autonomous Decision Rationale:
                </span>
                <p className="mt-0.5 text-slate-300 leading-relaxed font-sans">{routeEval.reason}</p>
              </div>
            </div>
          )}
        </section>

        {/* =========================================================================
            SECTION 4: Two-Column Live Terminal (Settlements & HCS Feed)
            ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: On-Chain x402 Settlements (7 cols) */}
          <section className="lg:col-span-7 glass-card rounded-2xl border border-white/[0.08] p-6 shadow-glass flex flex-col justify-between">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.06]">
                <div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-teal-400" />
                    <h2 className="text-base font-heading font-bold text-white">
                      On-Chain x402 Settlements
                    </h2>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Click any record to inspect the complete cryptographic proof & fee ledger
                  </p>
                </div>

                {/* Search / Filter Input */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by Tx or Call #..."
                    className="pl-8 pr-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-400 font-mono w-48"
                  />
                </div>
              </div>

              <div className="overflow-x-auto mt-4 max-h-[380px] overflow-y-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="sticky top-0 bg-[#0A101D] text-slate-400 border-b border-white/[0.06] uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-3">Call</th>
                      <th className="py-3 px-3">Asset</th>
                      <th className="py-3 px-3">Paid (FUSDC)</th>
                      <th className="py-3 px-3">Custom Fee</th>
                      <th className="py-3 px-3">Transaction ID</th>
                      <th className="py-3 px-3">Proof</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {filteredPayments.length > 0 ? (
                      filteredPayments.map((p, idx) => (
                        <tr
                          key={idx}
                          onClick={() => {
                            setSelectedPayment(p);
                            triggerSound("click");
                          }}
                          className="hover:bg-teal-500/[0.05] transition-colors cursor-pointer group"
                        >
                          <td className="py-3 px-3 text-slate-400 font-semibold group-hover:text-white">
                            #{p.callIndex}
                          </td>
                          <td className="py-3 px-3 font-bold text-white">{p.symbol}</td>
                          <td className="py-3 px-3 text-teal-300 font-bold tabular-nums">
                            {p.amountFusdc.toFixed(2)}
                          </td>
                          <td className="py-3 px-3 text-purple-300 tabular-nums">0.01</td>
                          <td className="py-3 px-3 text-sky-400 group-hover:text-sky-300">
                            <span className="flex items-center gap-1">
                              <span>{p.txId.slice(0, 14)}...</span>
                              <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-14 text-center text-slate-500 font-sans">
                          {searchQuery
                            ? "No matching settlement records found."
                            : "No settled calls yet. Click 'Run Autonomous Demo' to initiate 10 x402 payments."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/[0.06] text-[11px] text-slate-400 flex items-center justify-between font-mono">
              <span>Executed: {payments.length} of 10</span>
              <span>Payee: {config?.merchantAccount || "0.0.10510028"}</span>
            </div>
          </section>

          {/* Right Column: Live Consensus Audit Stream (5 cols) */}
          <section className="lg:col-span-5 glass-card rounded-2xl border border-white/[0.08] p-6 shadow-glass flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
                <div>
                  <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-cyan-400" />
                    <h2 className="text-base font-heading font-bold text-white">
                      HCS Consensus Trail
                    </h2>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Immutable sequence on Topic {config?.topicId || "0.0.10510035"}
                  </p>
                </div>
                <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-radar"></span>
              </div>

              {/* Event Filter Pills */}
              <div className="flex items-center gap-1.5 mt-3 overflow-x-auto pb-1 text-xs">
                {["ALL", "PAYMENT", "SWAP", "SHORTFALL"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setEventFilter(cat);
                      triggerSound("click");
                    }}
                    className={`px-2.5 py-1 rounded-md font-mono text-[10px] font-bold transition-all ${
                      eventFilter === cat
                        ? "bg-teal-500/20 text-teal-300 border border-teal-500/40"
                        : "bg-white/[0.04] text-slate-400 hover:text-slate-200 border border-white/5"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Event Stream Cards */}
              <div className="mt-4 space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                {filteredEvents.length > 0 ? (
                  filteredEvents.map((evt, index) => {
                    const isSwap = evt.type?.includes("SWAP");
                    const isPay = evt.type?.includes("PAYMENT");
                    const isShortfall = evt.type?.includes("SHORTFALL");
                    const isRoute = evt.type?.includes("ROUTE");
                    const isFulfilled = evt.type?.includes("FULFILLED");

                    const badgeColor = isSwap
                      ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                      : isPay
                      ? "bg-teal-500/20 text-teal-300 border-teal-500/30"
                      : isShortfall
                      ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                      : isRoute
                      ? "bg-sky-500/20 text-sky-300 border-sky-500/30"
                      : isFulfilled
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                      : "bg-slate-800 text-slate-300 border-slate-700";

                    return (
                      <div
                        key={evt.id || index}
                        className="p-3.5 rounded-xl bg-[#080E1B] border border-white/[0.06] hover:border-white/10 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold border ${badgeColor}`}>
                            {evt.type}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(evt.ts).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="mt-2 text-[11px] text-slate-300 font-mono bg-black/40 p-2.5 rounded-lg border border-white/[0.04] overflow-x-auto flex items-center justify-between">
                          <span className="truncate max-w-[280px]">
                            {JSON.stringify(evt.data)}
                          </span>
                          <button
                            onClick={() => copyToClipboard(JSON.stringify(evt.data), `evt-${index}`)}
                            className="ml-2 p-1 text-slate-400 hover:text-white"
                            title="Copy event payload"
                          >
                            {copiedKey === `evt-${index}` ? (
                              <Check className="w-3 h-3 text-teal-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-16 text-center text-slate-500 text-xs font-sans">
                    Listening for consensus messages from Hedera Mirror Node...
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
              <a
                href={`${hashscanBase}/topic/${config?.topicId}`}
                target="_blank"
                rel="noreferrer"
                className="text-teal-300 hover:underline flex items-center gap-1 font-semibold"
              >
                <span>View Full Topic on HashScan</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <span className="font-mono text-slate-400">Mirror Node Synced</span>
            </div>
          </section>
        </div>
      </main>

      {/* =========================================================================
          MODAL 1: Transaction Inspector Modal
          ========================================================================= */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#09101F] border border-white/10 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-300 flex items-center justify-center font-bold">
                  #{selectedPayment.callIndex}
                </div>
                <div>
                  <h3 className="font-heading font-bold text-white text-base">
                    x402 Transaction Inspector
                  </h3>
                  <p className="text-xs text-slate-400">Hedera Testnet Token Transfer Verification</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPayment(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div className="bg-black/40 p-3 rounded-xl border border-white/5 space-y-2">
                <div className="flex justify-between items-center text-slate-400">
                  <span>Hedera Transaction ID:</span>
                  <button
                    onClick={() => copyToClipboard(selectedPayment.txId, "tx-modal")}
                    className="flex items-center gap-1 text-teal-300 hover:underline"
                  >
                    {copiedKey === "tx-modal" ? "Copied!" : "Copy"}
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
                <div className="text-white break-all font-semibold">{selectedPayment.txId}</div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                  <span className="text-slate-400 block text-[11px]">Gross Amount:</span>
                  <span className="text-teal-300 text-base font-bold font-heading">
                    {selectedPayment.amountFusdc.toFixed(2)} FUSDC
                  </span>
                </div>
                <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                  <span className="text-slate-400 block text-[11px]">HTS Fixed Fee:</span>
                  <span className="text-purple-300 text-base font-bold font-heading">
                    0.01 FUSDC
                  </span>
                </div>
              </div>

              <div className="bg-black/40 p-3 rounded-xl border border-white/5 space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Payer (Agent):</span>
                  <span className="text-slate-200">{config?.agentAccount || "0.0.10510026"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Payee (Merchant):</span>
                  <span className="text-slate-200">{config?.merchantAccount || "0.0.10510028"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Collector (HIP-18):</span>
                  <span className="text-slate-200">0.0.10510030</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Verification Engine:</span>
                  <span className="text-emerald-400 font-bold">Native Hedera Mirror Node</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <a
                href={`${hashscanBase}/transaction/${selectedPayment.txId}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-400 text-slate-950 font-black text-xs hover:bg-emerald-300 transition-colors"
              >
                <span>View on HashScan</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: Agent Identity & Charter Modal (HCS-14)
          ========================================================================= */}
      {showIdentityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#09101F] border border-white/10 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-300 flex items-center justify-center">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-white text-base">
                    Agent Identity & Capability Vault
                  </h3>
                  <p className="text-xs text-slate-400">HCS-14 Standard Identity Anchor</p>
                </div>
              </div>
              <button
                onClick={() => setShowIdentityModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div className="bg-black/40 p-3 rounded-xl border border-white/5 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Agent Identifier:</span>
                  <span className="text-teal-300 font-bold">fatera-agent-01</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Hedera Account:</span>
                  <span className="text-white">{config?.agentAccount || "0.0.10510026"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Identity Topic:</span>
                  <span className="text-sky-300">0.0.10510037</span>
                </div>
              </div>

              <div className="bg-black/40 p-3 rounded-xl border border-white/5 space-y-2">
                <span className="text-slate-400 font-sans font-semibold block">
                  Autonomous Solvency Policy Bounds:
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded bg-white/[0.03] border border-white/5">
                    <span className="text-slate-400 block">Max Spend Rate:</span>
                    <span className="text-white font-bold">2.00 FUSDC/call</span>
                  </div>
                  <div className="p-2 rounded bg-white/[0.03] border border-white/5">
                    <span className="text-slate-400 block">Slippage Bound:</span>
                    <span className="text-white font-bold">100 bps (1.0%)</span>
                  </div>
                  <div className="p-2 rounded bg-white/[0.03] border border-white/5">
                    <span className="text-slate-400 block">Minimum Solvency (PCR):</span>
                    <span className="text-teal-300 font-bold">110.0%</span>
                  </div>
                  <div className="p-2 rounded bg-white/[0.03] border border-white/5">
                    <span className="text-slate-400 block">Settlement Strategy:</span>
                    <span className="text-purple-300 font-bold">HTS Pre-Funded</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <a
                href={`${hashscanBase}/topic/0.0.10510037`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 text-white font-extrabold text-xs hover:bg-purple-500 transition-colors"
              >
                <span>View Identity Topic on HashScan</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: Scheduled Renewal Modal
          ========================================================================= */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#09101F] border border-white/10 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-white text-base">
                    Scheduled Forward Renewal
                  </h3>
                  <p className="text-xs text-slate-400">Hedera Schedule Service (HSS)</p>
                </div>
              </div>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div className="bg-black/40 p-3 rounded-xl border border-white/5 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Schedule Entity ID:</span>
                  <span className="text-sky-300 font-bold">0.0.10521550</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Execution Mode:</span>
                  <span className="text-teal-300 font-bold">waitForExpiry=true</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Forward Amount:</span>
                  <span className="text-white">1.000000 FUSDC</span>
                </div>
              </div>

              <p className="text-slate-300 font-sans leading-relaxed text-xs">
                To guarantee continuity without human intervention, Fatera schedules renewal transfers on Hedera using <code className="text-sky-300 font-mono">ScheduleCreateTransaction</code> with <code className="text-sky-300 font-mono">waitForExpiry=true</code>. The Hedera consensus network executes the payment at the scheduled expiration time.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <a
                href={`${hashscanBase}/schedule/0.0.10521550`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500 text-slate-950 font-black text-xs hover:bg-sky-400 transition-colors"
              >
                <span>View Schedule on HashScan</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-white/[0.08] py-8 mt-16 bg-[#04070D]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div>
            <span className="font-heading font-extrabold text-slate-200">FATERA</span> — Autonomous Working Capital OS on Hedera. Built for ETHOnline 2026.
          </div>
          <div className="flex items-center gap-5">
            <a
              href={`${hashscanBase}/token/${config?.tokenId || "0.0.10510032"}`}
              target="_blank"
              rel="noreferrer"
              className="hover:text-teal-300 transition-colors"
            >
              FUSDC Token
            </a>
            <a
              href={`${hashscanBase}/topic/${config?.topicId || "0.0.10510035"}`}
              target="_blank"
              rel="noreferrer"
              className="hover:text-teal-300 transition-colors"
            >
              Audit Topic
            </a>
            <a
              href={`${hashscanBase}/account/${config?.agentAccount || "0.0.10510026"}`}
              target="_blank"
              rel="noreferrer"
              className="hover:text-teal-300 transition-colors"
            >
              Agent Account
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

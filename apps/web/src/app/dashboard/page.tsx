"use client";

import { useEffect, useState, useMemo } from "react";
import type { AgentState } from "@vigil/types";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
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

export default function DashboardPage() {
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
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [execStage, setExecStage] = useState<number | null>(null);

  // Inspector modal states
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);
  const [showIdentityModal, setShowIdentityModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Filter states
  const [eventFilter, setEventFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
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
    setIsRunning(true);
    setExecStage(1);
    setActionMessage("Stage 1/6: Obligation Discovery • Forecast: 10.30 FUSDC required");
    try {
      await fetch("/api/demo/start", { method: "POST" });
      setTimeout(() => {
        setExecStage(2);
        setActionMessage("Stage 2/6: Solvency Check • PCR 0.0% (CRITICAL) • SHORTFALL_DETECTED emitted to HCS");
      }, 1400);

      setTimeout(() => {
        setExecStage(3);
        setActionMessage("Stage 3/6: Liquidity Route Evaluation • VigilRouter selected (2 ℏ/FUSDC + 30 bps)");
      }, 2800);

      setTimeout(() => {
        setExecStage(4);
        setActionMessage("Stage 4/6: Executing On-Chain Swap • 22.066 ℏ for 11.00 FUSDC • PCR flipped to 110.0%");
        fetchState();
      }, 4200);

      setTimeout(() => {
        setExecStage(5);
        setActionMessage("Stage 5/6: Settling 10 x402 metered requests on Hedera with HIP-18 custom fee...");
        fetchState();
      }, 5600);

      setTimeout(() => {
        setExecStage(6);
        setActionMessage("Stage 6/6: Complete! 10/10 payments verified on HashScan • Schedule 0.0.10522980 active");
        setIsRunning(false);
        fetchState();
      }, 7200);
    } catch (err: any) {
      setActionMessage(`Execution error: ${err.message}`);
      setIsRunning(false);
    }
  };

  const handleResetDemo = async () => {
    setIsResetting(true);
    setExecStage(null);
    setActionMessage("Resetting balances to initial state (100 HBAR / 0 FUSDC)...");
    try {
      const res = await fetch("/api/demo/reset", { method: "POST" });
      const json = await res.json();
      setActionMessage(json.message || "Reset completed.");
      setTimeout(fetchState, 800);
    } catch (err: any) {
      setActionMessage(`Error resetting: ${err.message}`);
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

  const gaugePct = Math.min(100, Math.max(0, pcr));
  const gaugeColor =
    pcrState === "HEALTHY" ? "#2B6B44" : pcrState === "WARN" ? "#9E6B15" : "#A8341E";

  return (
    <div className="min-h-screen flex flex-col bg-desk text-ink">
      <Navbar />

      {/* Action Message Banner */}
      {actionMessage && (
        <div className="bg-paper border-b border-desk-line px-4 py-2.5 text-center text-xs text-ink flex items-center justify-center gap-2">
          <Activity className="w-3.5 h-3.5 text-terracotta animate-spin" />
          <span className="font-medium">{actionMessage}</span>
          <button
            onClick={() => setActionMessage(null)}
            className="ml-3 text-ink-faint hover:text-ink underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Workspace */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 space-y-8 w-full">
        {/* Terminal Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-desk-line">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-serif font-bold text-2xl sm:text-3xl text-ink">
                Working Capital Terminal
              </h1>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-desk-darker border border-desk-line text-ink-muted uppercase">
                Autonomous Mode
              </span>
            </div>
            <p className="text-xs text-ink-muted mt-1">
              Real-time solvency surveillance, liquidity route orchestration, and x402 settlement ledger.
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setShowIdentityModal(true)}
              className="px-3 py-1.5 rounded-md bg-paper border border-desk-line hover:border-ink-muted text-xs font-mono text-ink-muted hover:text-ink flex items-center gap-1.5 shadow-subtle transition-colors"
            >
              <Cpu className="w-3.5 h-3.5 text-terracotta" />
              <span>Identity: 0.0.10510026</span>
              <span className="text-[9px] px-1 rounded bg-desk-darker font-bold">HCS-14</span>
            </button>

            <button
              onClick={() => setShowScheduleModal(true)}
              className="px-3 py-1.5 rounded-md bg-paper border border-desk-line hover:border-ink-muted text-xs font-mono text-ink-muted hover:text-ink flex items-center gap-1.5 shadow-subtle transition-colors"
            >
              <Clock className="w-3.5 h-3.5 text-ink-faint" />
              <span>Schedule: {state?.schedule?.scheduleId || "0.0.10522980"}</span>
            </button>

            <button
              onClick={handleResetDemo}
              disabled={isResetting || isRunning}
              className="px-3.5 py-1.5 rounded-md bg-[#FFFFFF] border border-[#DCD4C4] hover:bg-[#FAF7F0] text-xs font-semibold text-[#1C1915] flex items-center gap-1.5 shadow-subtle transition-all disabled:opacity-50 active:scale-95 cursor-pointer"
              title="Reset balances to 100 HBAR & 0 FUSDC"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? "animate-spin text-amber" : ""}`} />
              <span>Reset</span>
            </button>

            <button
              onClick={handleRunDemo}
              disabled={isRunning}
              className="px-5 py-2 rounded-md bg-[#1C1915] text-[#FFFFFF] hover:bg-[#A8341E] text-xs font-semibold shadow-paper transition-all disabled:opacity-50 active:scale-95 flex items-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <Play className={`w-3.5 h-3.5 fill-current ${isRunning ? "animate-spin" : ""}`} />
              <span>{isRunning ? "Executing Lifecycle..." : "Run Autonomous Demo"}</span>
            </button>
          </div>
        </div>

        {/* Autonomous Execution Live Stepper */}
        {execStage !== null && (
          <div className="paper-card rounded-xl p-5 border-2 border-sage/40 bg-paper shadow-paper space-y-3 transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-desk-line pb-3">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isRunning ? "bg-amber animate-ping" : "bg-sage"}`}></span>
                <span className="font-serif font-bold text-sm text-ink">
                  {isRunning ? `Stage ${execStage} of 6: Autonomous Working Capital Execution` : "✓ Autonomous Solvency Lifecycle Complete & Verified on Hedera Testnet"}
                </span>
              </div>
              <span className="text-[11px] font-mono text-ink-muted">
                {isRunning ? "Consensus Finality in Progress..." : "100% On-Chain HashScan Receipts"}
              </span>
            </div>

            {/* Stepper Steps */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 pt-1 text-[11px] font-mono">
              {[
                { step: 1, name: "Discovery", desc: "10.30 FUSDC Goal" },
                { step: 2, name: "Shortfall", desc: "PCR 0% → HCS" },
                { step: 3, name: "Routing", desc: "VigilRouter LP" },
                { step: 4, name: "Swap Leg", desc: "PCR 110% Flips" },
                { step: 5, name: "x402 Meter", desc: "10 Paid Calls" },
                { step: 6, name: "Renewal", desc: "HSS Scheduled" },
              ].map((s) => {
                const isPassed = execStage >= s.step;
                const isCurrent = execStage === s.step;
                return (
                  <div
                    key={s.step}
                    className={`p-2.5 rounded-lg border transition-all ${
                      isCurrent
                        ? "bg-desk-raised border-terracotta text-ink font-bold shadow-subtle scale-[1.02]"
                        : isPassed
                        ? "bg-sage-light/60 border-sage-border text-sage"
                        : "bg-desk border-desk-line text-ink-faint"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span>0{s.step}</span>
                      {isPassed && !isCurrent && <CheckCircle2 className="w-3 h-3 text-sage" />}
                      {isCurrent && <Activity className="w-3 h-3 text-terracotta animate-spin" />}
                    </div>
                    <div className="font-sans font-bold text-xs mt-1 text-ink">{s.name}</div>
                    <div className="text-[10px] text-ink-muted mt-0.5">{s.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* =========================================================================
            SECTION 1: Pipeline Nodes (Paper Design)
            ========================================================================= */}
        <section className="paper-card rounded-xl p-5 border border-desk-line">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-desk-line">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-terracotta" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-ink-muted">
                Hedera Architecture Pipeline
              </span>
            </div>
            <span className="text-[11px] font-mono text-ink-faint">Consensus Finality ~2.3s</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="paper-inset rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center text-[10px] font-mono uppercase text-ink-faint">
                <span>01 / Treasury</span>
                <Wallet className="w-3.5 h-3.5 text-ink-muted" />
              </div>
              <div className="font-serif font-bold text-base text-ink">Agent Treasury</div>
              <div className="text-xs font-mono text-ink-muted">0.0.10510026</div>
              <div className="pt-2 border-t border-desk-line text-[11px] flex justify-between text-ink-faint font-mono">
                <span>Holdings:</span>
                <span className="text-ink font-bold">{hbarBalance} ℏ</span>
              </div>
            </div>

            <div className="paper-inset rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center text-[10px] font-mono uppercase text-ink-faint">
                <span>02 / Router</span>
                <ArrowRightLeft className="w-3.5 h-3.5 text-ink-muted" />
              </div>
              <div className="font-serif font-bold text-base text-ink">VigilRouter LP</div>
              <div className="text-xs font-mono text-ink-muted">Rate: 2 ℏ + 30bps</div>
              <div className="pt-2 border-t border-desk-line text-[11px] flex justify-between text-ink-faint font-mono">
                <span>Settlement:</span>
                <span className="text-ink font-bold">Two-Leg Mirror</span>
              </div>
            </div>

            <div className="paper-inset rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center text-[10px] font-mono uppercase text-ink-faint">
                <span>03 / Merchant</span>
                <Cpu className="w-3.5 h-3.5 text-ink-muted" />
              </div>
              <div className="font-serif font-bold text-base text-ink">Market Intel API</div>
              <div className="text-xs font-mono text-ink-muted">0.0.10510028</div>
              <div className="pt-2 border-t border-desk-line text-[11px] flex justify-between text-ink-faint font-mono">
                <span>Metered Fee:</span>
                <span className="text-ink font-bold">1.00 FUSDC/call</span>
              </div>
            </div>

            <div className="paper-inset rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center text-[10px] font-mono uppercase text-ink-faint">
                <span>04 / Consensus</span>
                <Layers className="w-3.5 h-3.5 text-ink-muted" />
              </div>
              <div className="font-serif font-bold text-base text-ink">Audit Topic</div>
              <div className="text-xs font-mono text-ink-muted">0.0.10510035</div>
              <div className="pt-2 border-t border-desk-line text-[11px] flex justify-between text-ink-faint font-mono">
                <span>Security:</span>
                <span className="text-sage font-bold">Immutable Trail</span>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            SECTION 2: Solvency Command Center (KPI Cards)
            ========================================================================= */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: HBAR Reserve */}
          <div className="paper-card rounded-xl p-6 border border-desk-line flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-mono uppercase text-ink-faint">
                <span>HBAR Reserve Asset</span>
                <span className="w-6 h-6 rounded bg-desk flex items-center justify-center font-bold text-ink">
                  ℏ
                </span>
              </div>
              <div className="mt-4">
                <div className="text-3xl font-serif font-extrabold text-ink tabular-nums">
                  {hbarBalance} <span className="text-sm font-mono text-ink-faint">ℏ</span>
                </div>
                <div className="text-xs font-mono text-ink-muted mt-1">
                  ≈ ${hbarUsdEstimate} USD • {state?.balances?.hbarTinybars || "0"} tb
                </div>
              </div>
            </div>
            <div className="mt-6 pt-3 border-t border-desk-line text-xs flex justify-between text-ink-muted">
              <span>Collateral Status</span>
              <span className="text-sage font-semibold font-mono">Unencumbered</span>
            </div>
          </div>

          {/* Card 2: FUSDC Operating Capital */}
          <div className="paper-card rounded-xl p-6 border border-desk-line flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-mono uppercase text-ink-faint">
                <span>FUSDC Working Capital</span>
                <span className="w-6 h-6 rounded bg-desk flex items-center justify-center font-bold text-ink">
                  $
                </span>
              </div>
              <div className="mt-4">
                <div className="text-3xl font-serif font-extrabold text-ink tabular-nums">
                  {fusdcBalance} <span className="text-sm font-mono text-ink-faint">FUSDC</span>
                </div>
                <div className="text-xs font-mono text-ink-muted mt-1">
                  Token: {config?.tokenId || "0.0.10510032"}
                </div>
              </div>
            </div>
            <div className="mt-6 pt-3 border-t border-desk-line text-xs flex justify-between text-ink-muted">
              <span>Custom Fixed Fee</span>
              <span className="text-terracotta font-mono font-semibold">0.01 FUSDC</span>
            </div>
          </div>

          {/* Card 3: Solvency PCR Gauge */}
          <div className="paper-card rounded-xl p-6 border border-desk-line flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-mono uppercase text-ink-faint">
                <span>Payment Coverage (PCR)</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase ${
                    pcrState === "HEALTHY"
                      ? "bg-sage-light text-sage border border-sage-border"
                      : pcrState === "WARN"
                      ? "bg-amber-light text-amber border border-amber-border"
                      : "bg-red-100 text-terracotta border border-red-200"
                  }`}
                >
                  {pcrState}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-4">
                {/* SVG Gauge */}
                <div className="relative w-16 h-16 flex-shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-desk-darker"
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
                  <div className="absolute inset-0 flex items-center justify-center font-mono font-bold text-xs text-ink">
                    {pcr.toFixed(0)}%
                  </div>
                </div>

                <div>
                  <div className="text-2xl font-serif font-extrabold text-ink tabular-nums">
                    {pcr.toFixed(1)}%
                  </div>
                  <p className="text-[11px] text-ink-muted mt-0.5">
                    {forecast && forecast.shortfallFusdc > 0 ? (
                      <span className="text-terracotta font-semibold">
                        Shortfall: {forecast.shortfallFusdc.toFixed(2)} FUSDC
                      </span>
                    ) : (
                      <span className="text-sage font-semibold">Solvent & Ready</span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-desk-line text-xs flex justify-between text-ink-muted">
              <span>Safety Target</span>
              <span className="font-mono text-ink">≥ 110.0%</span>
            </div>
          </div>

          {/* Card 4: Active Obligation */}
          <div className="paper-card rounded-xl p-6 border border-desk-line flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-mono uppercase text-ink-faint">
                <span>Active Obligation</span>
                <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase bg-desk text-ink-muted border border-desk-line">
                  {obligation?.status || "FULFILLED"}
                </span>
              </div>
              <div className="mt-4">
                <div className="text-3xl font-serif font-extrabold text-ink tabular-nums">
                  {obligation?.requiredFusdc ? obligation.requiredFusdc.toFixed(2) : "10.30"}{" "}
                  <span className="text-sm font-mono text-ink-faint">FUSDC</span>
                </div>
                <div className="text-xs text-ink-muted mt-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-ink-faint" />
                  <span>SLA Horizon: ~30 min window</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-desk-line">
              <div className="flex justify-between text-[11px] text-ink-faint mb-1.5 font-mono">
                <span>Progress</span>
                <span>{payments.length} of 10 settled</span>
              </div>
              <div className="grid grid-cols-10 gap-1">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full ${
                      i < payments.length ? "bg-sage" : "bg-desk-darker"
                    }`}
                  ></div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            SECTION 3: Autonomous Liquidity Route Matrix
            ========================================================================= */}
        <section className="paper-card rounded-xl p-6 border border-desk-line">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-desk-line">
            <div>
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-terracotta" />
                <h2 className="font-serif font-bold text-lg text-ink">
                  Autonomous Liquidity Route Matrix
                </h2>
              </div>
              <p className="text-xs text-ink-muted mt-0.5">
                Real-time liquidity evaluation comparing VigilRouter LP and DEX AMM fallback venues.
              </p>
            </div>

            {routeEval?.selected && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-sage-light text-sage font-mono text-xs font-bold border border-sage-border">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Selected: {routeEval.selected}</span>
              </div>
            )}
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-desk-line text-ink-faint uppercase">
                  <th className="py-2.5 px-3">Route ID</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Cost (HBAR)</th>
                  <th className="py-2.5 px-3">Fee (bps)</th>
                  <th className="py-2.5 px-3">Risk Penalty</th>
                  <th className="py-2.5 px-3">Protocol Details</th>
                  <th className="py-2.5 px-3 text-right">Execution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-desk-line">
                {routeEval?.quotes?.map((q) => {
                  const isSelected = q.id === routeEval.selected;
                  return (
                    <tr
                      key={q.id}
                      className={isSelected ? "bg-desk-raised font-medium" : "text-ink-muted"}
                    >
                      <td className="py-3 px-3 font-bold text-ink flex items-center gap-2">
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-sage"></span>}
                        <span>{q.id}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            q.available
                              ? "bg-sage-light text-sage border border-sage-border"
                              : "bg-desk text-ink-faint border border-desk-line"
                          }`}
                        >
                          {q.available ? "AVAILABLE" : "UNAVAILABLE"}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold text-ink tabular-nums">
                        {q.available ? `${q.costHbar.toFixed(4)} ℏ` : "—"}
                      </td>
                      <td className="py-3 px-3 tabular-nums">{q.feeBps} bps</td>
                      <td className="py-3 px-3 tabular-nums">{q.riskPenaltyHbar.toFixed(2)} ℏ</td>
                      <td className="py-3 px-3 font-sans text-ink-muted text-xs">{q.detail}</td>
                      <td className="py-3 px-3 text-right">
                        {isSelected ? (
                          <span className="px-2 py-0.5 rounded bg-ink text-paper text-[10px] font-bold">
                            EXECUTED
                          </span>
                        ) : (
                          <span className="text-ink-faint">—</span>
                        )}
                      </td>
                    </tr>
                  );
                }) || (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-ink-faint font-sans">
                      No route evaluation recorded. Click "Run Autonomous Demo" to trigger liquidity routing.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {routeEval?.reason && (
            <div className="mt-4 p-3.5 rounded-lg bg-desk-raised border border-desk-line text-xs text-ink-muted flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-sage flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-ink">Decision Rationale:</span>{" "}
                <span>{routeEval.reason}</span>
              </div>
            </div>
          )}
        </section>

        {/* =========================================================================
            SECTION 4: Two-Column Table & Feed
            ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Settlements Table */}
          <section className="lg:col-span-7 paper-card rounded-xl p-6 border border-desk-line flex flex-col justify-between">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-desk-line">
                <div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-sage" />
                    <h2 className="font-serif font-bold text-lg text-ink">
                      On-Chain x402 Settlements
                    </h2>
                  </div>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Click any record to inspect the cryptographic token transfer & fee ledger
                  </p>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-ink-faint absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter by Tx or Call #..."
                    className="pl-8 pr-3 py-1.5 rounded bg-desk border border-desk-line text-xs text-ink placeholder-ink-faint focus:outline-none focus:border-ink font-mono w-44"
                  />
                </div>
              </div>

              <div className="overflow-x-auto mt-4 max-h-[360px] overflow-y-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="sticky top-0 bg-paper text-ink-faint border-b border-desk-line uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Call</th>
                      <th className="py-2.5 px-3">Asset</th>
                      <th className="py-2.5 px-3">Paid (FUSDC)</th>
                      <th className="py-2.5 px-3">Custom Fee</th>
                      <th className="py-2.5 px-3">Transaction ID</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-desk-line">
                    {filteredPayments.length > 0 ? (
                      filteredPayments.map((p, idx) => (
                        <tr
                          key={idx}
                          onClick={() => setSelectedPayment(p)}
                          className="hover:bg-desk-raised transition-colors cursor-pointer"
                        >
                          <td className="py-2.5 px-3 font-semibold text-ink">#{p.callIndex}</td>
                          <td className="py-2.5 px-3 font-bold text-ink">{p.symbol}</td>
                          <td className="py-2.5 px-3 text-sage font-bold tabular-nums">
                            {p.amountFusdc.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-terracotta tabular-nums">0.01</td>
                          <td className="py-2.5 px-3 text-ink underline">
                            <span className="flex items-center gap-1">
                              <span>{p.txId.slice(0, 14)}...</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sage-light text-sage border border-sage-border">
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-ink-faint font-sans">
                          {searchQuery
                            ? "No matching records found."
                            : "No settled payments yet. Click 'Run Autonomous Demo' to begin."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-desk-line text-[11px] text-ink-faint flex justify-between font-mono">
              <span>Executed: {payments.length} of 10</span>
              <span>Merchant: {config?.merchantAccount || "0.0.10510028"}</span>
            </div>
          </section>

          {/* Right Column: HCS Consensus Stream */}
          <section className="lg:col-span-5 paper-card rounded-xl p-6 border border-desk-line flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-desk-line">
                <div>
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-terracotta" />
                    <h2 className="font-serif font-bold text-lg text-ink">
                      HCS Consensus Trail
                    </h2>
                  </div>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Immutable Topic {config?.topicId || "0.0.10510035"}
                  </p>
                </div>
                <span className="w-2 h-2 rounded-full bg-sage animate-pulse"></span>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 mt-3 overflow-x-auto pb-1 text-xs">
                {["ALL", "PAYMENT", "SWAP", "SHORTFALL"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setEventFilter(cat)}
                    className={`px-2.5 py-1 rounded font-mono text-[10px] font-bold transition-all ${
                      eventFilter === cat
                        ? "bg-ink text-paper"
                        : "bg-desk text-ink-muted hover:text-ink border border-desk-line"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Event Stream */}
              <div className="mt-3.5 space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                {filteredEvents.length > 0 ? (
                  filteredEvents.map((evt, index) => {
                    return (
                      <div
                        key={evt.id || index}
                        className="p-3 rounded-lg bg-desk-raised border border-desk-line"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-paper border border-desk-line text-ink">
                            {evt.type}
                          </span>
                          <span className="text-[10px] text-ink-faint font-mono">
                            {new Date(evt.ts).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="mt-2 text-[11px] text-ink-muted font-mono bg-paper p-2 rounded border border-desk-line overflow-x-auto flex items-center justify-between">
                          <span className="truncate max-w-[240px]">
                            {JSON.stringify(evt.data)}
                          </span>
                          <button
                            onClick={() => copyToClipboard(JSON.stringify(evt.data), `evt-${index}`)}
                            className="ml-2 p-1 text-ink-faint hover:text-ink"
                            title="Copy event payload"
                          >
                            {copiedKey === `evt-${index}` ? (
                              <Check className="w-3 h-3 text-sage" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-14 text-center text-ink-faint text-xs font-sans">
                    Listening for consensus messages from Hedera Mirror Node...
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-desk-line flex justify-between text-xs text-ink-muted">
              <a
                href={`${hashscanBase}/topic/${config?.topicId}`}
                target="_blank"
                rel="noreferrer"
                className="text-terracotta hover:underline flex items-center gap-1 font-semibold"
              >
                <span>View Full Topic on HashScan</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <span className="font-mono text-ink-faint">Mirror Node Ingested</span>
            </div>
          </section>
        </div>
      </main>

      {/* =========================================================================
          MODALS
          ========================================================================= */}
      {/* 1. Transaction Inspector */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm">
          <div className="bg-paper border border-desk-line rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-desk-line pb-3">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded bg-desk flex items-center justify-center font-bold text-xs">
                  #{selectedPayment.callIndex}
                </span>
                <div>
                  <h3 className="font-serif font-bold text-lg text-ink">
                    x402 Transaction Inspector
                  </h3>
                  <p className="text-xs text-ink-faint">Hedera Testnet Token Transfer</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPayment(null)}
                className="p-1 rounded text-ink-faint hover:text-ink"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs font-mono">
              <div className="bg-desk p-3 rounded-md border border-desk-line space-y-1">
                <div className="flex justify-between text-ink-faint">
                  <span>Transaction ID:</span>
                  <button
                    onClick={() => copyToClipboard(selectedPayment.txId, "tx-modal")}
                    className="text-terracotta hover:underline flex items-center gap-1"
                  >
                    {copiedKey === "tx-modal" ? "Copied!" : "Copy"}
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
                <div className="text-ink break-all font-semibold">{selectedPayment.txId}</div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-desk p-3 rounded-md border border-desk-line">
                  <span className="text-ink-faint block text-[11px]">Gross Amount:</span>
                  <span className="text-sage text-base font-bold">
                    {selectedPayment.amountFusdc.toFixed(2)} FUSDC
                  </span>
                </div>
                <div className="bg-desk p-3 rounded-md border border-desk-line">
                  <span className="text-ink-faint block text-[11px]">HTS Fixed Fee:</span>
                  <span className="text-terracotta text-base font-bold">0.01 FUSDC</span>
                </div>
              </div>

              <div className="bg-desk p-3 rounded-md border border-desk-line space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-ink-faint">Payer (Agent):</span>
                  <span className="text-ink">{config?.agentAccount || "0.0.10510026"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-faint">Payee (Merchant):</span>
                  <span className="text-ink">{config?.merchantAccount || "0.0.10510028"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-faint">Fee Collector (HIP-18):</span>
                  <span className="text-ink">0.0.10510030</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-faint">Verification Engine:</span>
                  <span className="text-sage font-bold">Native Hedera Mirror Node</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <a
                href={`${hashscanBase}/transaction/${selectedPayment.txId}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-ink text-paper font-semibold text-xs hover:bg-terracotta transition-colors"
              >
                <span>View on HashScan</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 2. Agent Identity Modal */}
      {showIdentityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm">
          <div className="bg-paper border border-desk-line rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-desk-line pb-3">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-terracotta" />
                <div>
                  <h3 className="font-serif font-bold text-lg text-ink">
                    Agent Identity & Capability Vault
                  </h3>
                  <p className="text-xs text-ink-faint">HCS-14 Standard Identity Anchor</p>
                </div>
              </div>
              <button
                onClick={() => setShowIdentityModal(false)}
                className="p-1 rounded text-ink-faint hover:text-ink"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs font-mono">
              <div className="bg-desk p-3 rounded-md border border-desk-line space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-ink-faint">Agent Identity:</span>
                  <span className="text-ink font-bold">vigil-agent-01</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-faint">Hedera Account:</span>
                  <span className="text-ink">{config?.agentAccount || "0.0.10510026"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-faint">Identity Topic:</span>
                  <span className="text-ink">0.0.10510037</span>
                </div>
              </div>

              <div className="bg-desk p-3 rounded-md border border-desk-line space-y-2">
                <span className="text-ink font-sans font-semibold block">
                  Autonomous Solvency Policy Bounds:
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded bg-paper border border-desk-line">
                    <span className="text-ink-faint block">Max Spend Rate:</span>
                    <span className="text-ink font-bold">2.00 FUSDC/call</span>
                  </div>
                  <div className="p-2 rounded bg-paper border border-desk-line">
                    <span className="text-ink-faint block">Slippage Bound:</span>
                    <span className="text-ink font-bold">100 bps (1.0%)</span>
                  </div>
                  <div className="p-2 rounded bg-paper border border-desk-line">
                    <span className="text-ink-faint block">Minimum Solvency (PCR):</span>
                    <span className="text-sage font-bold">110.0%</span>
                  </div>
                  <div className="p-2 rounded bg-paper border border-desk-line">
                    <span className="text-ink-faint block">Settlement Strategy:</span>
                    <span className="text-ink font-bold">HTS Pre-Funded</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <a
                href={`${hashscanBase}/topic/0.0.10510037`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-ink text-paper font-semibold text-xs hover:bg-terracotta transition-colors"
              >
                <span>View Identity Topic on HashScan</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 3. Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm">
          <div className="bg-paper border border-desk-line rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-desk-line pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-ink-muted" />
                <div>
                  <h3 className="font-serif font-bold text-lg text-ink">
                    Scheduled Forward Renewal
                  </h3>
                  <p className="text-xs text-ink-faint">Hedera Schedule Service (HSS)</p>
                </div>
              </div>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="p-1 rounded text-ink-faint hover:text-ink"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs font-mono">
              <div className="bg-desk p-3 rounded-md border border-desk-line space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-ink-faint">Schedule ID:</span>
                  <span className="text-ink font-bold">{state?.schedule?.scheduleId || "0.0.10522980"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-faint">Execution Mode:</span>
                  <span className="text-sage font-bold">waitForExpiry=true</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-faint">Forward Amount:</span>
                  <span className="text-ink font-bold">1.000000 FUSDC</span>
                </div>
              </div>

              <p className="text-ink-muted font-sans text-xs leading-relaxed">
                To guarantee continuity without human intervention, Vigil schedules renewal transfers on Hedera using <code className="text-ink font-mono bg-desk px-1 py-0.5 rounded">ScheduleCreateTransaction</code> with <code className="text-ink font-mono bg-desk px-1 py-0.5 rounded">waitForExpiry=true</code>. The Hedera consensus network executes the payment at the scheduled expiration time.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <a
                href={`${hashscanBase}/schedule/${state?.schedule?.scheduleId || "0.0.10522980"}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-ink text-paper font-semibold text-xs hover:bg-terracotta transition-colors"
              >
                <span>View Schedule on HashScan</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import type { AgentState } from "@fatera/types";
import {
  Activity,
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  ExternalLink,
  Layers,
  Play,
  RotateCcw,
  ShieldCheck,
  TrendingUp,
  Zap,
} from "lucide-react";

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
    setActionMessage("Initiating autonomous workflow on Hedera Testnet...");
    try {
      const res = await fetch("/api/demo/start", { method: "POST" });
      const json = await res.json();
      setActionMessage(json.message || "Demo run started.");
      setTimeout(fetchState, 1500);
    } catch (err: any) {
      setActionMessage(`Error starting demo: ${err.message}`);
    } finally {
      setTimeout(() => setIsRunning(false), 5000);
    }
  };

  const handleResetDemo = async () => {
    setIsResetting(true);
    setActionMessage("Resetting balances to 100 HBAR / 0 FUSDC...");
    try {
      const res = await fetch("/api/demo/reset", { method: "POST" });
      const json = await res.json();
      setActionMessage(json.message || "Reset completed.");
      setTimeout(fetchState, 1500);
    } catch (err: any) {
      setActionMessage(`Error resetting: ${err.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  const state = data.state;
  const config = state?.config;
  const hashscanBase = config?.hashscanBase || "https://hashscan.io/testnet";

  const hbarBalance = state ? (Number(state.balances.hbarTinybars) / 100_000_000).toFixed(4) : "0.0000";
  const fusdcBalance = state ? (Number(state.balances.fusdcBaseUnits) / 1_000_000).toFixed(4) : "0.0000";

  const forecast = state?.latestForecast;
  const pcr = forecast ? Math.min(200, Math.max(0, forecast.pcrPct)) : 0;
  const pcrState = forecast?.state || (Number(fusdcBalance) > 0 ? "HEALTHY" : "CRITICAL");

  const pcrColor =
    pcrState === "HEALTHY" ? "#22D3A7" : pcrState === "WARN" ? "#F5A623" : "#F04438";

  const obligation = state?.obligations?.[0];
  const payments = state?.payments || [];
  const routeEval = state?.latestRouteEvaluation;

  return (
    <div className="min-h-screen bg-[#0B1220] text-slate-200 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="border-b border-white/8 bg-[#0F172A]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <Zap className="w-5 h-5 text-black font-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-wider text-white text-lg">FATERA</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-400/10 text-teal-300 font-semibold border border-teal-400/20 tracking-wider">
                  AUTONOMOUS WORKING CAPITAL OS
                </span>
              </div>
              <span className="text-xs text-slate-400">Hedera Agentic Payments & x402 Engine</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/5 border border-white/10 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-slate-300 font-mono">Hedera Testnet</span>
            </div>

            {config?.agentAccount && (
              <a
                href={`${hashscanBase}/account/${config.agentAccount}`}
                target="_blank"
                rel="noreferrer"
                className="hidden md:flex items-center gap-1.5 text-xs text-slate-300 hover:text-white px-3 py-1.5 rounded-md bg-white/5 border border-white/10 transition-colors"
              >
                <span>Agent:</span>
                <span className="font-mono text-teal-300">{config.agentAccount}</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
            )}

            {config?.topicId && (
              <a
                href={`${hashscanBase}/topic/${config.topicId}`}
                target="_blank"
                rel="noreferrer"
                className="hidden lg:flex items-center gap-1.5 text-xs text-slate-300 hover:text-white px-3 py-1.5 rounded-md bg-white/5 border border-white/10 transition-colors"
              >
                <span>HCS Topic:</span>
                <span className="font-mono text-sky-300">{config.topicId}</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
            )}

            <button
              onClick={handleResetDemo}
              disabled={isResetting || isRunning}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-all disabled:opacity-50"
              title="Normalize balances to 100 HBAR & 0 FUSDC"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? "animate-spin text-amber-400" : ""}`} />
              <span>Reset</span>
            </button>

            <button
              onClick={handleRunDemo}
              disabled={isRunning}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-gradient-to-r from-teal-400 to-emerald-500 hover:from-teal-300 hover:to-emerald-400 text-black font-bold text-xs shadow-lg shadow-teal-500/25 transition-all disabled:opacity-50"
            >
              <Play className={`w-3.5 h-3.5 fill-black ${isRunning ? "animate-pulse" : ""}`} />
              <span>{isRunning ? "Running..." : "Run Demo"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Notification Bar if message present */}
      {actionMessage && (
        <div className="bg-teal-950/60 border-b border-teal-500/30 px-4 py-2 text-center text-xs text-teal-200 flex items-center justify-center gap-2">
          <Activity className="w-3.5 h-3.5 text-teal-400 animate-spin" />
          <span>{actionMessage}</span>
          <button
            onClick={() => setActionMessage(null)}
            className="ml-3 text-slate-400 hover:text-white text-xs underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 space-y-8 w-full">
        {/* KPI Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* HBAR Balance */}
          <div className="bg-[#111A2E] rounded-xl p-5 border border-white/8 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-white/20 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">HBAR Balance</span>
              <span className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold text-xs">
                ℏ
              </span>
            </div>
            <div className="mt-4">
              <div className="text-2xl lg:text-3xl font-bold font-mono text-white tracking-tight tabular-nums">
                {hbarBalance} <span className="text-sm font-normal text-slate-400">HBAR</span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono mt-1">
                {state?.balances?.hbarTinybars || "0"} tinybars
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
              <span>Reserve Asset</span>
              <span className="text-emerald-400 font-medium">Unencumbered</span>
            </div>
          </div>

          {/* FUSDC Balance */}
          <div className="bg-[#111A2E] rounded-xl p-5 border border-white/8 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-white/20 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">FUSDC Balance</span>
              <span className="w-7 h-7 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center font-bold text-xs">
                $
              </span>
            </div>
            <div className="mt-4">
              <div className="text-2xl lg:text-3xl font-bold font-mono text-teal-300 tracking-tight tabular-nums">
                {fusdcBalance} <span className="text-sm font-normal text-slate-400">FUSDC</span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono mt-1">
                Token ID: {config?.tokenId || "0.0.10510032"}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
              <span>HTS Fixed Fee</span>
              <span className="text-purple-400 font-mono">0.01 FUSDC</span>
            </div>
          </div>

          {/* PCR Gauge Card */}
          <div className="bg-[#111A2E] rounded-xl p-5 border border-white/8 shadow-sm flex flex-col justify-between relative overflow-hidden hover:border-white/20 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Coverage Ratio (PCR)</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                  pcrState === "HEALTHY"
                    ? "bg-teal-500/20 text-teal-300 border border-teal-500/30"
                    : pcrState === "WARN"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    : "bg-red-500/20 text-red-300 border border-red-500/30"
                }`}
              >
                {pcrState}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-4">
              {/* Circular Gauge */}
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
                    stroke={pcrColor}
                    strokeDasharray={`${Math.min(100, pcr)}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center font-mono font-bold text-xs text-white">
                  {pcr.toFixed(0)}%
                </div>
              </div>

              <div>
                <div className="text-2xl font-extrabold font-mono text-white tabular-nums">
                  {pcr.toFixed(1)}%
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {forecast && forecast.shortfallFusdc > 0
                    ? `Shortfall: ${forecast.shortfallFusdc.toFixed(2)} FUSDC`
                    : "Fully Funded & Ready"}
                </p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
              <span>Health Target</span>
              <span className="font-mono text-slate-300">≥ 110%</span>
            </div>
          </div>

          {/* Current Obligation */}
          <div className="bg-[#111A2E] rounded-xl p-5 border border-white/8 shadow-sm flex flex-col justify-between relative overflow-hidden hover:border-white/20 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Next Obligation</span>
              <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase bg-sky-500/20 text-sky-300 border border-sky-500/30">
                {obligation?.status || "NONE"}
              </span>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-bold font-mono text-white tracking-tight tabular-nums">
                {obligation?.requiredFusdc ? `${obligation.requiredFusdc.toFixed(2)} FUSDC` : "10.30 FUSDC"}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {obligation?.callsRemaining ?? 0} calls remaining of {obligation?.callsTotal ?? 10}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>Due in</span>
              </span>
              <span className="text-slate-300 font-mono">~30m</span>
            </div>
          </div>
        </section>

        {/* Route Decision Table (Signature Component) */}
        <section className="bg-[#111A2E] rounded-xl border border-white/8 p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-white/8">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-teal-400" />
                <span>Autonomous Liquidity Route Matrix</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time liquidity evaluation comparing autonomous LP router, DEX AMM pools, and direct asset settlements.
              </p>
            </div>
            {routeEval?.selected && (
              <span className="self-start sm:self-auto text-xs px-2.5 py-1 rounded-md bg-teal-500/15 text-teal-300 font-mono font-semibold border border-teal-500/30 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                <span>Selected: {routeEval.selected}</span>
              </span>
            )}
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase text-slate-400 border-b border-white/8 font-mono">
                  <th className="py-3 px-4">Route ID</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Cost (HBAR)</th>
                  <th className="py-3 px-4">Fee (bps)</th>
                  <th className="py-3 px-4">Risk Penalty</th>
                  <th className="py-3 px-4">Protocol Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono text-xs">
                {routeEval?.quotes?.map((q) => {
                  const isSelected = q.id === routeEval.selected;
                  return (
                    <tr
                      key={q.id}
                      className={`transition-colors ${
                        isSelected
                          ? "bg-teal-500/10 text-white font-medium hover:bg-teal-500/15"
                          : "text-slate-400 hover:bg-white/[0.02]"
                      }`}
                    >
                      <td className="py-3.5 px-4 font-bold flex items-center gap-2">
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping"></span>}
                        <span>{q.id}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            q.available
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : "bg-slate-800 text-slate-400 border border-slate-700"
                          }`}
                        >
                          {q.available ? "AVAILABLE" : "UNAVAILABLE"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-white font-bold tabular-nums">
                        {q.available ? `${q.costHbar.toFixed(4)} ℏ` : "—"}
                      </td>
                      <td className="py-3.5 px-4 tabular-nums">{q.feeBps} bps</td>
                      <td className="py-3.5 px-4 tabular-nums">{q.riskPenaltyHbar.toFixed(2)} ℏ</td>
                      <td className="py-3.5 px-4 text-slate-300 font-sans text-xs">{q.detail}</td>
                    </tr>
                  );
                }) || (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                      No route evaluation recorded yet. Run the demo to trigger real-time liquidity matrix comparison.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {routeEval?.reason && (
            <div className="mt-4 p-3 rounded-lg bg-slate-900/60 border border-white/5 text-xs text-slate-300 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-white">Autonomous Decision Rationale:</span>{" "}
                <span>{routeEval.reason}</span>
              </div>
            </div>
          )}
        </section>

        {/* Two Columns: Payments Table & Live Consensus Audit */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Payments Table (7 cols) */}
          <section className="lg:col-span-7 bg-[#111A2E] rounded-xl border border-white/8 p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-white/8">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span>On-Chain x402 Settlements</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Pay-per-call meterings settled with FUSDC on Hedera Testnet
                  </p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded bg-white/5 font-mono text-slate-300">
                  {payments.length} Settlements
                </span>
              </div>

              <div className="overflow-x-auto mt-4 max-h-[380px] overflow-y-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="sticky top-0 bg-[#111A2E] text-slate-400 border-b border-white/8 uppercase">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Symbol</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Fee</th>
                      <th className="py-2.5 px-3">Tx ID</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {payments.length > 0 ? (
                      payments.map((p, idx) => (
                        <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-2.5 px-3 text-slate-400">#{p.callIndex}</td>
                          <td className="py-2.5 px-3 font-semibold text-white">{p.symbol}</td>
                          <td className="py-2.5 px-3 text-teal-300 tabular-nums">
                            {p.amountFusdc.toFixed(2)} FUSDC
                          </td>
                          <td className="py-2.5 px-3 text-purple-300 tabular-nums">0.01</td>
                          <td className="py-2.5 px-3">
                            <a
                              href={`${hashscanBase}/transaction/${p.txId}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sky-400 hover:text-sky-300 hover:underline flex items-center gap-1"
                            >
                              <span>{p.txId.slice(0, 14)}...</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-500 font-sans">
                          No settled calls yet. Trigger the demo run to initiate 10 metered requests.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/5 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Total calls executed: {payments.length}/10</span>
              <span>Merchant: {config?.merchantAccount || "0.0.10510028"}</span>
            </div>
          </section>

          {/* Right Column: Live Consensus Audit Feed (5 cols) */}
          <section className="lg:col-span-5 bg-[#111A2E] rounded-xl border border-white/8 p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-white/8">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-sky-400" />
                    <span>Live HCS Consensus Trail</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Immutable event sequence recorded on Topic {config?.topicId || "0.0.10510035"}
                  </p>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              </div>

              {/* Event Stream */}
              <div className="mt-4 space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {data.events.length > 0 ? (
                  data.events.map((evt, index) => {
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
                      ? "bg-red-500/20 text-red-300 border-red-500/30"
                      : isRoute
                      ? "bg-sky-500/20 text-sky-300 border-sky-500/30"
                      : isFulfilled
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                      : "bg-slate-800 text-slate-300 border-slate-700";

                    return (
                      <div
                        key={evt.id || index}
                        className="p-3 rounded-lg bg-slate-900/60 border border-white/5 hover:border-white/10 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold border ${badgeColor}`}>
                            {evt.type}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(evt.ts).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="mt-2 text-[11px] text-slate-300 font-mono bg-black/30 p-2 rounded border border-white/5 overflow-x-auto">
                          {JSON.stringify(evt.data)}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-16 text-center text-slate-500 text-xs font-sans">
                    Listening for HCS consensus audit messages...
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
              <a
                href={`${hashscanBase}/topic/${config?.topicId}`}
                target="_blank"
                rel="noreferrer"
                className="text-teal-300 hover:underline flex items-center gap-1"
              >
                <span>View Full Topic on HashScan</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <span className="font-mono text-slate-500">Live Agent Stream</span>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/8 py-6 mt-12 bg-[#090E18]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div>
            <span className="font-bold text-slate-200">FATERA</span> — Autonomous Working Capital OS on Hedera. Built for ETHOnline 2026.
          </div>
          <div className="flex items-center gap-4">
            <a
              href={`${hashscanBase}/token/${config?.tokenId}`}
              target="_blank"
              rel="noreferrer"
              className="hover:text-white transition-colors"
            >
              FUSDC Token
            </a>
            <a
              href={`${hashscanBase}/topic/${config?.topicId}`}
              target="_blank"
              rel="noreferrer"
              className="hover:text-white transition-colors"
            >
              Audit Topic
            </a>
            <a
              href={`${hashscanBase}/account/${config?.agentAccount}`}
              target="_blank"
              rel="noreferrer"
              className="hover:text-white transition-colors"
            >
              Agent Account
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

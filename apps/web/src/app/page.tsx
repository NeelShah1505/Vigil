import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Cpu,
  ExternalLink,
  Layers,
  Play,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Zap,
} from "lucide-react";

export default function HomePage() {
  const hashscanBase = "https://hashscan.io/testnet";

  return (
    <div className="min-h-screen flex flex-col bg-desk text-ink">
      <Navbar />

      <main className="flex-1">
        {/* =========================================================================
            HERO SECTION
            ========================================================================= */}
        <section className="pt-16 pb-20 border-b border-desk-line">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl space-y-6">
              {/* Eyebrow badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-paper border border-desk-line text-xs font-mono text-ink-muted shadow-subtle">
                <span className="w-2 h-2 rounded-full bg-terracotta"></span>
                <span>ETHOnline 2026 • AI & Agentic Payments on Hedera</span>
              </div>

              {/* Title */}
              <h1 className="font-serif font-extrabold text-4xl sm:text-5xl lg:text-6xl text-ink leading-[1.12] tracking-tight">
                Autonomous Working Capital for AI Agents.
              </h1>

              {/* Thesis */}
              <p className="text-lg sm:text-xl text-ink-muted leading-relaxed font-sans font-normal">
                Agents shouldn't just know how to pay with x402. They should know how to stay solvent.
                Fatera forecasts upcoming obligations, detects liquidity shortfalls before default, and executes autonomous swaps and metered settlements on Hedera.
              </p>

              {/* CTAs */}
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 px-6 py-3 rounded-md bg-ink text-paper hover:bg-terracotta text-sm font-semibold shadow-paper transition-all active:scale-95"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Launch Working Capital Terminal</span>
                </Link>

                <Link
                  href="/architecture"
                  className="flex items-center gap-1.5 px-5 py-3 rounded-md bg-paper border border-desk-line hover:border-ink-muted text-sm font-semibold text-ink shadow-subtle transition-all"
                >
                  <span>Protocol Architecture</span>
                  <ArrowRight className="w-4 h-4 text-ink-muted" />
                </Link>

                <Link
                  href="/explorer"
                  className="flex items-center gap-1.5 px-5 py-3 rounded-md text-sm font-medium text-ink-muted hover:text-ink transition-colors"
                >
                  <span>Testnet Proofs</span>
                  <ArrowUpRight className="w-4 h-4 opacity-70" />
                </Link>
              </div>
            </div>

            {/* Hero Proof Matrix Bento */}
            <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="paper-card rounded-xl p-5 border border-desk-line">
                <span className="text-[11px] font-mono uppercase text-ink-faint font-semibold block">
                  Initial Reserve
                </span>
                <div className="text-2xl font-serif font-bold text-ink mt-2">100.00 ℏ</div>
                <p className="text-xs text-ink-muted mt-1">Unencumbered gas & collateral</p>
              </div>

              <div className="paper-card rounded-xl p-5 border border-desk-line">
                <span className="text-[11px] font-mono uppercase text-ink-faint font-semibold block">
                  Obligation Forecast
                </span>
                <div className="text-2xl font-serif font-bold text-ink mt-2">10.30 FUSDC</div>
                <p className="text-xs text-ink-muted mt-1">10 metered calls + fees & buffer</p>
              </div>

              <div className="paper-card rounded-xl p-5 border border-desk-line">
                <span className="text-[11px] font-mono uppercase text-ink-faint font-semibold block">
                  Coverage Ratio (PCR)
                </span>
                <div className="text-2xl font-serif font-bold text-sage mt-2">0% → 110%</div>
                <p className="text-xs text-ink-muted mt-1">Flipped by FateraRouter swap</p>
              </div>

              <div className="paper-card rounded-xl p-5 border border-desk-line">
                <span className="text-[11px] font-mono uppercase text-ink-faint font-semibold block">
                  Audit Trail (HCS)
                </span>
                <div className="text-2xl font-serif font-bold text-ink mt-2">100% On-Chain</div>
                <p className="text-xs text-ink-muted mt-1">Consensus Topic 0.0.10510035</p>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            THE PROBLEM VS THE SOLUTION
            ========================================================================= */}
        <section className="py-20 border-b border-desk-line bg-paper">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <span className="text-xs font-mono uppercase tracking-wider text-terracotta font-bold">
                The Economic Gap
              </span>
              <h2 className="font-serif font-bold text-3xl sm:text-4xl text-ink mt-2">
                Why wallets don't prevent agent defaults.
              </h2>
              <p className="text-ink-muted text-base mt-3 leading-relaxed">
                An AI agent holding 100 HBAR can still default on a FUSDC-denominated API obligation due in 30 minutes. Traditional DeFi optimizes for yield; Fatera optimizes for <strong>guaranteed continuous solvency</strong>.
              </p>
            </div>

            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Problem Card */}
              <div className="rounded-2xl p-8 bg-desk border border-desk-line space-y-4">
                <div className="w-10 h-10 rounded-lg bg-red-100 border border-red-200 text-terracotta flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <h3 className="font-serif font-bold text-xl text-ink">
                  The Naive Agent (Status Quo)
                </h3>
                <ul className="space-y-3 text-sm text-ink-muted">
                  <li className="flex items-start gap-2.5">
                    <span className="text-terracotta font-bold mt-0.5">✕</span>
                    <span><strong>Reactive default:</strong> Waits until receiving an HTTP 402 challenge before realizing it has zero settlement tokens.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-terracotta font-bold mt-0.5">✕</span>
                    <span><strong>No fee awareness:</strong> Unaware of HTS custom transfer fees or gas slippage, causing transactions to revert.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-terracotta font-bold mt-0.5">✕</span>
                    <span><strong>No execution audit trail:</strong> Decisions happen off-chain in private memory without verifiable receipts.</span>
                  </li>
                </ul>
              </div>

              {/* Solution Card */}
              <div className="rounded-2xl p-8 bg-paper border-2 border-sage/30 shadow-paper space-y-4">
                <div className="w-10 h-10 rounded-lg bg-sage-light border border-sage-border text-sage flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="font-serif font-bold text-xl text-ink">
                  The Fatera Agent (Solvency OS)
                </h3>
                <ul className="space-y-3 text-sm text-ink-muted">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-sage mt-0.5 flex-shrink-0" />
                    <span><strong>Forward obligation forecast:</strong> Calculates required working capital across upcoming metered tasks with safety buffer.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-sage mt-0.5 flex-shrink-0" />
                    <span><strong>Payment Coverage Ratio (PCR):</strong> Maintains solvency above 110%, triggering automatic FateraRouter LP swaps when low.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-sage mt-0.5 flex-shrink-0" />
                    <span><strong>Verifiable HCS consensus:</strong> Every state transition, quote evaluation, and settlement is anchored immutably to Hedera.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            HOW IT WORKS — 4 ARCHITECTURAL PILLARS
            ========================================================================= */}
        <section className="py-20 border-b border-desk-line">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto">
              <span className="text-xs font-mono uppercase tracking-wider text-terracotta font-bold">
                System Lifecycle
              </span>
              <h2 className="font-serif font-bold text-3xl sm:text-4xl text-ink mt-2">
                How Fatera operates autonomously on Hedera.
              </h2>
              <p className="text-ink-muted text-sm sm:text-base mt-3">
                From requirement discovery to on-chain settlement, Fatera executes every phase with cryptographic verification.
              </p>
            </div>

            <div className="mt-16 grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Step 1 */}
              <div className="paper-card rounded-xl p-6 border border-desk-line space-y-3">
                <span className="text-[11px] font-mono font-bold text-terracotta">01 / FORECAST</span>
                <h4 className="font-serif font-bold text-lg text-ink">Obligation Model</h4>
                <p className="text-xs text-ink-muted leading-relaxed">
                  Agent discovers service on the Fatera Directory, requests quotation (0.50 base + 0.10/field × 5 fields = 1.00 FUSDC), adds HTS custom fee (0.10) + safety buffer (0.20), totaling <strong>10.30 FUSDC</strong>.
                </p>
              </div>

              {/* Step 2 */}
              <div className="paper-card rounded-xl p-6 border border-desk-line space-y-3">
                <span className="text-[11px] font-mono font-bold text-terracotta">02 / SOLVENCY</span>
                <h4 className="font-serif font-bold text-lg text-ink">PCR Evaluation</h4>
                <p className="text-xs text-ink-muted leading-relaxed">
                  With 0 FUSDC held, Payment Coverage Ratio is <strong>0.0% (CRITICAL)</strong>. Fatera emits <code>SHORTFALL_DETECTED</code> to HCS and activates the algorithmic treasury desk.
                </p>
              </div>

              {/* Step 3 */}
              <div className="paper-card rounded-xl p-6 border border-desk-line space-y-3">
                <span className="text-[11px] font-mono font-bold text-terracotta">03 / ROUTING</span>
                <h4 className="font-serif font-bold text-lg text-ink">Two-Leg Swap</h4>
                <p className="text-xs text-ink-muted leading-relaxed">
                  Evaluates FateraRouter (2 HBAR/FUSDC + 30 bps) vs DEX AMMs. Executes on-chain swap of 22.066 HBAR for 11.00 FUSDC. PCR flips to <strong>110.0% (HEALTHY)</strong>.
                </p>
              </div>

              {/* Step 4 */}
              <div className="paper-card rounded-xl p-6 border border-desk-line space-y-3">
                <span className="text-[11px] font-mono font-bold text-terracotta">04 / SETTLEMENT</span>
                <h4 className="font-serif font-bold text-lg text-ink">x402 Metering</h4>
                <p className="text-xs text-ink-muted leading-relaxed">
                  Executes 10 metered requests. Each payment assesses the 0.01 FUSDC fixed custom fee to the collector. Replay stores prevent duplicate attacks; receipts stream to HCS.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            TESTNET REGISTRY OVERVIEW
            ========================================================================= */}
        <section className="py-20 border-b border-desk-line bg-paper">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-8 border-b border-desk-line">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-terracotta font-bold">
                  On-Chain Registry
                </span>
                <h2 className="font-serif font-bold text-3xl text-ink mt-1">
                  Live Hedera Testnet Verified Anchors
                </h2>
              </div>
              <Link
                href="/explorer"
                className="text-xs font-semibold text-terracotta hover:underline flex items-center gap-1 self-start md:self-auto"
              >
                <span>View Full Testnet Explorer</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="mt-8 overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-desk-line text-ink-faint uppercase">
                    <th className="py-3 px-4">Entity</th>
                    <th className="py-3 px-4">Hedera ID</th>
                    <th className="py-3 px-4">Role in Working Capital Lifecycle</th>
                    <th className="py-3 px-4 text-right">HashScan Explorer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-desk-line font-sans">
                  <tr>
                    <td className="py-3.5 px-4 font-bold text-ink">Agent Account</td>
                    <td className="py-3.5 px-4 font-mono text-terracotta font-semibold">0.0.10510026</td>
                    <td className="py-3.5 px-4 text-ink-muted">Autonomous agent holding reserve HBAR & operating FUSDC</td>
                    <td className="py-3.5 px-4 text-right font-mono">
                      <a
                        href={`${hashscanBase}/account/0.0.10510026`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-ink hover:text-terracotta underline inline-flex items-center gap-1"
                      >
                        <span>View</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-4 font-bold text-ink">Merchant Account</td>
                    <td className="py-3.5 px-4 font-mono text-terracotta font-semibold">0.0.10510028</td>
                    <td className="py-3.5 px-4 text-ink-muted">Provider of x402-gated Market Intelligence API</td>
                    <td className="py-3.5 px-4 text-right font-mono">
                      <a
                        href={`${hashscanBase}/account/0.0.10510028`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-ink hover:text-terracotta underline inline-flex items-center gap-1"
                      >
                        <span>View</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-4 font-bold text-ink">FUSDC Token</td>
                    <td className="py-3.5 px-4 font-mono text-terracotta font-semibold">0.0.10510032</td>
                    <td className="py-3.5 px-4 text-ink-muted">HTS token configured with 0.01 fixed custom fee (HIP-18)</td>
                    <td className="py-3.5 px-4 text-right font-mono">
                      <a
                        href={`${hashscanBase}/token/0.0.10510032`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-ink hover:text-terracotta underline inline-flex items-center gap-1"
                      >
                        <span>View</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-4 font-bold text-ink">HCS Audit Topic</td>
                    <td className="py-3.5 px-4 font-mono text-terracotta font-semibold">0.0.10510035</td>
                    <td className="py-3.5 px-4 text-ink-muted">Consensus stream of shortfall, routing, swap, and payment events</td>
                    <td className="py-3.5 px-4 text-right font-mono">
                      <a
                        href={`${hashscanBase}/topic/0.0.10510035`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-ink hover:text-terracotta underline inline-flex items-center gap-1"
                      >
                        <span>View</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* =========================================================================
            BOTTOM CALL TO ACTION
            ========================================================================= */}
        <section className="py-20 text-center">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            <h2 className="font-serif font-extrabold text-3xl sm:text-4xl text-ink">
              Ready to witness autonomous solvency?
            </h2>
            <p className="text-ink-muted text-base leading-relaxed">
              Experience the full working capital lifecycle in real time: trigger liquidity forecasts, watch the route matrix pick FateraRouter, and observe on-chain metered settlements with HCS receipts.
            </p>
            <div className="pt-2 flex justify-center gap-4">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-6 py-3 rounded-md bg-ink text-paper hover:bg-terracotta text-sm font-semibold shadow-paper transition-all active:scale-95"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Open Working Capital Terminal</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

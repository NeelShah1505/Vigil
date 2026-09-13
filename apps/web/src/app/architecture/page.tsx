import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Cpu,
  ExternalLink,
  Layers,
  Play,
  ShieldCheck,
  TrendingUp,
  Zap,
} from "lucide-react";

export default function ArchitecturePage() {
  const hashscanBase = "https://hashscan.io/testnet";

  return (
    <div className="min-h-screen flex flex-col bg-desk text-ink">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex-1 space-y-16">
        {/* Header */}
        <div className="space-y-4 max-w-3xl">
          <span className="text-xs font-mono uppercase tracking-wider text-terracotta font-bold">
            Technical Specification
          </span>
          <h1 className="font-serif font-extrabold text-4xl sm:text-5xl text-ink tracking-tight">
            System Architecture & Protocol Design
          </h1>
          <p className="text-base text-ink-muted leading-relaxed font-sans">
            How Vigil orchestrates forward obligation modeling, liquidity route selection, metered x402 settlements, and verifiable HCS consensus logs.
          </p>
        </div>

        {/* High-Level ASCII Diagram in Paper Inset */}
        <section className="paper-card rounded-xl p-8 border border-desk-line space-y-4">
          <div className="flex items-center justify-between border-b border-desk-line pb-3">
            <h3 className="font-serif font-bold text-lg text-ink">Protocol Interaction Diagram</h3>
            <span className="text-[11px] font-mono text-ink-faint">Mirror-Node Verified Architecture</span>
          </div>

          <pre className="p-4 rounded bg-desk font-mono text-xs text-ink overflow-x-auto leading-relaxed">
{`┌───────────────────────────────────────────────────────────────────────────┐
│                            VIGIL ARCHITECTURE                             │
└───────────────────────────────────────────────────────────────────────────┘

           ┌──────────────────────────────────────────────┐
           │    Vigil Discovery Registry (:3004)          │
           │   (Machine Discovery & HCS Registered)       │
           └──────────────────────┬───────────────────────┘
                                  │ GET /services
                                  ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                          Vigil Agent (:3002)                              │
│  ┌────────────────┐  ┌──────────────────┐  ┌───────────────────────────┐  │
│  │ Treasury Core  │  │ Solvency Engine  │  │ Autonomous Router Matrix  │  │
│  │ (HBAR & FUSDC) │  │ (PCR & Shortfall)│  │ (VigilRouter vs DEX)      │  │
│  └───────┬────────┘  └────────┬─────────┘  └─────────────┬─────────────┘  │
└──────────┼────────────────────┼──────────────────────────┼────────────────┘
           │                    │                          │
           │                    │ Swap Leg 1: HBAR         │ POST /settle
           │                    ▼                          ▼
           │           ┌─────────────────────────────────────────────────┐
           │           │    VigilRouter LP Service (:3003)               │
           │           │   Rate: 2 HBAR/FUSDC + 30 bps · Mirror Verified │
           │           └────────────────────────┬────────────────────────┘
           │                                    │ Swap Leg 2: FUSDC
           │ 402 → Pay FUSDC → Proof 200        ▼
           ▼                               ┌─────────────────────────────┐
┌───────────────────────────────────────┐  │    Hedera Token Service     │
│   Merchant API Service (:3001)        │  │       (0.0.10510032)        │
│   • /market-data (x402 metered)       │  │ Fixed Fee: 0.01 FUSDC/tx    │
│   • /refund (safety fallback)         │  └──────────────┬──────────────┘
│   • Replay Protection Store           │                 │
└──────────────────┬────────────────────┘                 │
                   │                                      │
                   ▼                                      ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                    Hedera Consensus Service (HCS)                         │
│   • Audit Topic:    0.0.10524552  (Immutable State Machine Log)           │
│   • Identity Topic: 0.0.10524553  (HCS-14 Agent Identity & Policy Vault)  │
└───────────────────────────────────────────────────────────────────────────┘`}
          </pre>
        </section>

        {/* 4 Core Pillars Detail */}
        <div className="space-y-12">
          {/* Pillar 1 */}
          <section className="space-y-3">
            <span className="text-xs font-mono font-bold text-terracotta">COMPONENT 01</span>
            <h2 className="font-serif font-bold text-2xl text-ink">
              Autonomous Agent Treasury & Solvency Engine
            </h2>
            <p className="text-sm text-ink-muted leading-relaxed">
              Located in <code className="font-mono text-xs bg-desk px-1.5 py-0.5 rounded">apps/agent</code>. The agent monitors its native balances and evaluates forward obligations across scheduled tasks.
            </p>
            <div className="paper-card rounded-xl p-6 border border-desk-line space-y-3 mt-4 text-xs font-mono">
              <div className="flex justify-between border-b border-desk-line pb-2">
                <span className="font-bold text-ink">Payment Coverage Ratio (PCR) Formula:</span>
                <span className="text-terracotta font-semibold">PCR = (Available FUSDC / Required FUSDC) × 100%</span>
              </div>
              <p className="text-ink-muted font-sans text-xs leading-relaxed">
                When PCR is below 110.0%, a <code>SHORTFALL_DETECTED</code> event is emitted to the HCS audit topic. The agent calculates the exact shortfall (e.g., 10.30 FUSDC) and formulates an acquisition order for 11.00 FUSDC.
              </p>
            </div>
          </section>

          {/* Pillar 2 */}
          <section className="space-y-3">
            <span className="text-xs font-mono font-bold text-terracotta">COMPONENT 02</span>
            <h2 className="font-serif font-bold text-2xl text-ink">
              VigilRouter LP Service (Two-Leg Settlement)
            </h2>
            <p className="text-sm text-ink-muted leading-relaxed">
              Located in <code className="font-mono text-xs bg-desk px-1.5 py-0.5 rounded">apps/router</code>. Vigil provides an automated liquidity venue that swaps HBAR for FUSDC at a deterministic rate of 2 HBAR per FUSDC plus 30 bps LP fee.
            </p>
            <div className="paper-card rounded-xl p-6 border border-desk-line space-y-3 mt-4 text-xs">
              <h4 className="font-serif font-bold text-sm text-ink">Two-Leg Settlement Sequence:</h4>
              <ol className="space-y-2 text-ink-muted list-decimal list-inside font-mono text-[11px]">
                <li><strong>Leg 1 (HBAR Deposit):</strong> Agent transfers 22.066 HBAR to the Router LP account on Hedera.</li>
                <li><strong>Mirror Verification:</strong> Router queries the Hedera Mirror Node to confirm the transfer succeeded within freshness bounds (&lt; 120s) and checks replay store.</li>
                <li><strong>Leg 2 (FUSDC Payout):</strong> Router transfers 11.00 FUSDC to the Agent account and logs <code>SWAP_SETTLED</code> to HCS topic <code>0.0.10524552</code>.</li>
              </ol>
            </div>
          </section>

          {/* Pillar 3 */}
          <section className="space-y-3">
            <span className="text-xs font-mono font-bold text-terracotta">COMPONENT 03</span>
            <h2 className="font-serif font-bold text-2xl text-ink">
              x402 Protocol & Metered API Service
            </h2>
            <p className="text-sm text-ink-muted leading-relaxed">
              Located in <code className="font-mono text-xs bg-desk px-1.5 py-0.5 rounded">apps/api-service</code>. The Merchant operates a market intelligence API gated behind the HTTP 402 Payment Required standard.
            </p>
            <div className="paper-card rounded-xl p-6 border border-desk-line space-y-3 mt-4 text-xs">
              <h4 className="font-serif font-bold text-sm text-ink">Metering & Fee Assessment:</h4>
              <p className="text-ink-muted leading-relaxed">
                Queries are priced dynamically: <strong>0.50 FUSDC base + 0.10 FUSDC per field requested</strong> (price, volume, sentiment, volatility, trend = 1.00 FUSDC). Every transfer is assessed a <strong>0.01 FUSDC fixed custom fee</strong> directly to the fee collector under HIP-18.
              </p>
            </div>
          </section>

          {/* Pillar 4 */}
          <section className="space-y-3">
            <span className="text-xs font-mono font-bold text-terracotta">COMPONENT 04</span>
            <h2 className="font-serif font-bold text-2xl text-ink">
              Hedera Consensus Service (HCS-14 Identity & Audit)
            </h2>
            <p className="text-sm text-ink-muted leading-relaxed">
              Every critical lifecycle event is published to HCS topic <code className="font-mono text-xs bg-desk px-1.5 py-0.5 rounded">0.0.10524552</code>. In addition, the agent anchors its capabilities, public keys, and solvency policy bounds to HCS Identity Topic <code className="font-mono text-xs bg-desk px-1.5 py-0.5 rounded">0.0.10524553</code> under an HCS-14-inspired standard.
            </p>
          </section>
        </div>

        {/* CTA */}
        <div className="paper-card rounded-xl p-8 border border-desk-line text-center space-y-4">
          <h3 className="font-serif font-bold text-2xl text-ink">
            Observe the Protocol in Action
          </h3>
          <p className="text-xs text-ink-muted max-w-md mx-auto">
            Test the live router quotes, solvency transitions, and metered x402 calls on Hedera Testnet.
          </p>
          <div className="pt-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-ink text-paper hover:bg-terracotta text-xs font-semibold shadow-paper transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Launch Terminal</span>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

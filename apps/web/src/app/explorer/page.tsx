import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  ExternalLink,
  Layers,
  ShieldCheck,
  Zap,
} from "lucide-react";

export default function ExplorerPage() {
  const hashscanBase = "https://hashscan.io/testnet";

  const entities = [
    {
      role: "Autonomous Agent Account",
      id: "0.0.10510026",
      desc: "Autonomous AI agent possessing native HBAR reserves and operating FUSDC balance.",
      url: `${hashscanBase}/account/0.0.10510026`,
      badge: "AGENT",
    },
    {
      role: "Merchant Intelligence Account",
      id: "0.0.10510028",
      desc: "Receives FUSDC micropayments for metered x402 market intelligence queries.",
      url: `${hashscanBase}/account/0.0.10510028`,
      badge: "MERCHANT",
    },
    {
      role: "VigilRouter LP Treasury Account",
      id: "0.0.10510029",
      desc: "Liquidity provider account for autonomous two-leg swaps (HBAR to FUSDC).",
      url: `${hashscanBase}/account/0.0.10510029`,
      badge: "ROUTER_LP",
    },
    {
      role: "HIP-18 Fee Collector Account",
      id: "0.0.10510030",
      desc: "Recipient of the 0.01 FUSDC fixed custom fee assessed on every non-treasury transfer.",
      url: `${hashscanBase}/account/0.0.10510030`,
      badge: "FEE_COLLECTOR",
    },
    {
      role: "FUSDC Hedera Token Service (HTS)",
      id: "0.0.10510032",
      desc: "HTS Token (6 decimals) configured with on-chain custom fixed fee schedule.",
      url: `${hashscanBase}/token/0.0.10510032`,
      badge: "HTS_TOKEN",
    },
    {
      role: "HCS Consensus Audit Topic",
      id: "0.0.10510035",
      desc: "Immutable state machine sequence recording shortfall, routing, and settlements.",
      url: `${hashscanBase}/topic/0.0.10510035`,
      badge: "HCS_AUDIT",
    },
    {
      role: "HCS Agent Identity Topic",
      id: "0.0.10510037",
      desc: "HCS-14-inspired identity registration anchoring agent capabilities and policy limits.",
      url: `${hashscanBase}/topic/0.0.10510037`,
      badge: "HCS_IDENTITY",
    },
    {
      role: "Scheduled Forward Renewal Transaction",
      id: "0.0.10522980",
      desc: "Time-based scheduled transfer created with waitForExpiry=true for autonomous renewal.",
      url: `${hashscanBase}/schedule/0.0.10522980`,
      badge: "SCHEDULE_TX",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-desk text-ink">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex-1 space-y-12">
        {/* Header */}
        <div className="space-y-3 max-w-2xl">
          <span className="text-xs font-mono uppercase tracking-wider text-terracotta font-bold">
            Hedera Testnet Verification
          </span>
          <h1 className="font-serif font-extrabold text-4xl text-ink tracking-tight">
            On-Chain Entity Registry
          </h1>
          <p className="text-sm text-ink-muted leading-relaxed font-sans">
            Every account, token, consensus topic, and schedule in Vigil is live on the Hedera Testnet. You can verify every transaction and state change independently on HashScan.
          </p>
        </div>

        {/* Entities Table */}
        <section className="paper-card rounded-xl border border-desk-line overflow-hidden">
          <div className="p-5 border-b border-desk-line flex items-center justify-between">
            <h3 className="font-serif font-bold text-base text-ink">
              Verified On-Chain Identifiers
            </h3>
            <span className="text-[11px] font-mono text-sage font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Network: Hedera Testnet</span>
            </span>
          </div>

          <div className="divide-y divide-desk-line font-mono text-xs">
            {entities.map((e) => (
              <div
                key={e.id}
                className="p-5 hover:bg-desk-raised transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="font-sans font-bold text-sm text-ink">{e.role}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-desk text-ink-muted border border-desk-line">
                      {e.badge}
                    </span>
                  </div>
                  <p className="font-sans text-xs text-ink-muted leading-relaxed">{e.desc}</p>
                  <div className="text-terracotta font-bold text-xs pt-1">{e.id}</div>
                </div>

                <a
                  href={e.url}
                  target="_blank"
                  rel="noreferrer"
                  className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded bg-paper border border-desk-line hover:border-ink-muted text-xs font-sans font-semibold text-ink shadow-subtle transition-all"
                >
                  <span>Inspect on HashScan</span>
                  <ExternalLink className="w-3 h-3 text-ink-muted" />
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* Real Sample Transaction Card */}
        <section className="paper-card rounded-xl p-6 border border-desk-line space-y-4">
          <div className="flex items-center justify-between border-b border-desk-line pb-3">
            <h3 className="font-serif font-bold text-base text-ink">
              Example Verified Settlement Transaction
            </h3>
            <span className="text-[11px] font-mono text-sage font-bold">SUCCESS</span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="bg-desk p-3 rounded border border-desk-line flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-ink-faint">Transaction ID:</span>
              <span className="font-bold text-ink">0.0.6914535@1789291847.058661565</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-desk p-3 rounded border border-desk-line">
                <span className="text-ink-faint block text-[11px]">Net Paid:</span>
                <span className="font-bold text-sage text-sm">1.000000 FUSDC</span>
              </div>
              <div className="bg-desk p-3 rounded border border-desk-line">
                <span className="text-ink-faint block text-[11px]">HIP-18 Custom Fee:</span>
                <span className="font-bold text-terracotta text-sm">0.010000 FUSDC</span>
              </div>
              <div className="bg-desk p-3 rounded border border-desk-line">
                <span className="text-ink-faint block text-[11px]">Consensus Time:</span>
                <span className="font-bold text-ink text-sm">1789291847.058661565</span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <a
              href={`${hashscanBase}/transaction/0.0.6914535@1789291847.058661565`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 rounded bg-ink text-paper text-xs font-sans font-semibold hover:bg-terracotta transition-colors"
            >
              <span>View Full Ledger on HashScan</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

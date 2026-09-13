import Link from "next/link";
import { ExternalLink } from "lucide-react";

export default function Footer() {
  const hashscanBase = "https://hashscan.io/testnet";

  return (
    <footer className="border-t border-desk-line bg-desk-darker py-12 mt-20 text-ink">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-desk-line text-xs">
          {/* Col 1 */}
          <div className="md:col-span-1 space-y-3">
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-xl tracking-tight">VIGIL</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-desk text-ink-muted border border-desk-line">
                v0.1
              </span>
            </div>
            <p className="text-ink-muted leading-relaxed">
              Autonomous Working Capital Operating System for AI agents on Hedera Testnet.
            </p>
            <p className="text-ink-faint font-serif italic">
              "Agents shouldn't just know how to pay. They should know how to stay solvent."
            </p>
          </div>

          {/* Col 2: Navigation */}
          <div className="space-y-2.5">
            <h4 className="font-mono uppercase text-[11px] font-bold text-ink-faint tracking-wider">
              Navigation
            </h4>
            <ul className="space-y-2 text-ink-muted">
              <li>
                <Link href="/" className="hover:text-terracotta transition-colors">
                  Overview & Thesis
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-terracotta transition-colors">
                  Working Capital Terminal
                </Link>
              </li>
              <li>
                <Link href="/architecture" className="hover:text-terracotta transition-colors">
                  Architecture & Protocol
                </Link>
              </li>
              <li>
                <Link href="/explorer" className="hover:text-terracotta transition-colors">
                  Hedera Testnet Explorer
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Hedera On-Chain Anchors */}
          <div className="space-y-2.5">
            <h4 className="font-mono uppercase text-[11px] font-bold text-ink-faint tracking-wider">
              On-Chain Proofs (HashScan)
            </h4>
            <ul className="space-y-2 text-ink-muted font-mono text-[11px]">
              <li>
                <a
                  href={`${hashscanBase}/account/0.0.10510026`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-terracotta flex items-center gap-1 transition-colors"
                >
                  <span>Agent: 0.0.10510026</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                </a>
              </li>
              <li>
                <a
                  href={`${hashscanBase}/token/0.0.10510032`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-terracotta flex items-center gap-1 transition-colors"
                >
                  <span>FUSDC Token: 0.0.10510032</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                </a>
              </li>
              <li>
                <a
                  href={`${hashscanBase}/topic/0.0.10524552`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-terracotta flex items-center gap-1 transition-colors"
                >
                  <span>Audit Topic: 0.0.10524552</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                </a>
              </li>
              <li>
                <a
                  href={`${hashscanBase}/topic/0.0.10524553`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-terracotta flex items-center gap-1 transition-colors"
                >
                  <span>Identity: 0.0.10524553</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                </a>
              </li>
              <li>
                <a
                  href={`${hashscanBase}/schedule/0.0.10524570`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-terracotta flex items-center gap-1 transition-colors"
                >
                  <span>Schedule: 0.0.10524570</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                </a>
              </li>
            </ul>
          </div>

          {/* Col 4: Track & Rubric */}
          <div className="space-y-2.5">
            <h4 className="font-mono uppercase text-[11px] font-bold text-ink-faint tracking-wider">
              Bounty Submission
            </h4>
            <p className="text-ink-muted leading-relaxed">
              Built for ETHOnline 2026 — <em>"AI & Agentic Payments on Hedera"</em> track ($6,000).
            </p>
            <div className="pt-2">
              <span className="inline-block px-2.5 py-1 rounded bg-paper border border-desk-line text-[11px] font-mono text-sage font-semibold">
                7 of 8 Bonus Points Shipped
              </span>
            </div>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-ink-faint">
          <div>© 2026 Vigil Project • Open Source under MIT License</div>
          <div className="font-mono">Hedera Testnet Consensus Finality ~2.3s</div>
        </div>
      </div>
    </footer>
  );
}

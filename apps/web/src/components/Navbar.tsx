"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, ShieldCheck, Sparkles } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Overview" },
    { href: "/dashboard", label: "Dashboard" },
    { href: "/architecture", label: "Architecture" },
    { href: "/explorer", label: "Testnet Explorer" },
  ];

  return (
    <header className="border-b border-desk-line bg-desk/95 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-lg bg-ink text-paper flex items-center justify-center font-serif font-bold text-lg shadow-sm group-hover:bg-terracotta transition-colors">
              F
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif font-bold text-xl tracking-tight text-ink">
                  FATERA
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-desk-darker text-ink-muted border border-desk-line uppercase tracking-wider">
                  OS
                </span>
              </div>
              <p className="text-[11px] text-ink-faint hidden sm:block">
                Autonomous Working Capital on Hedera
              </p>
            </div>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-paper text-ink shadow-subtle border border-desk-line font-semibold"
                    : "text-ink-muted hover:text-ink hover:bg-desk-raised"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Status & CTA */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-paper border border-desk-line text-[11px] text-ink-muted">
            <span className="w-2 h-2 rounded-full bg-sage animate-pulse"></span>
            <span className="font-mono">Hedera Testnet</span>
          </div>

          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-ink text-paper hover:bg-terracotta text-xs font-semibold shadow-subtle transition-all active:scale-95"
          >
            <span>Open Terminal</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}

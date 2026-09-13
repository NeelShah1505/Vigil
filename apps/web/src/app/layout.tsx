import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FATERA — Autonomous Working Capital OS",
  description: "Autonomous Working Capital OS for AI agents on Hedera Testnet (x402 protocol, HTS custom fees, HCS auditability)",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-slate-100 min-h-screen antialiased selection:bg-accent-healthy/20 selection:text-accent-healthy">
        {children}
      </body>
    </html>
  );
}

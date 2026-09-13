import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://vigil-web-pi.vercel.app"),
  title: "VIGIL — Autonomous Working Capital OS",
  description: "Autonomous Working Capital & Solvency Surveillance OS for AI agents on Hedera Testnet (x402 protocol, HTS custom fees, HCS auditability)",
  icons: {
    icon: "/logo.jpg",
    apple: "/logo.jpg",
  },
  openGraph: {
    title: "VIGIL — Autonomous Working Capital OS",
    description: "Autonomous Working Capital & Solvency Surveillance OS for AI agents on Hedera Testnet",
    images: ["/banner.jpg"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-desk text-ink min-h-screen antialiased selection:bg-terracotta/15 selection:text-terracotta">
        {children}
      </body>
    </html>
  );
}

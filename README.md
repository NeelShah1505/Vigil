# VIGIL — Autonomous Working Capital OS for AI Agents

> **"Agents shouldn't just know how to pay. They should know how to stay solvent."**

[![Hedera Testnet](https://img.shields.io/badge/Hedera-Testnet-blue?logo=hedera)](https://hashscan.io/testnet)
[![x402 Protocol](https://img.shields.io/badge/Protocol-x402-emerald)](https://x402.org)
[![HTS Custom Fee](https://img.shields.io/badge/HTS-Custom_Fixed_Fee-purple)](https://hashscan.io/testnet/token/0.0.10510032)
[![HCS Audited](https://img.shields.io/badge/HCS-Audited-teal)](https://hashscan.io/testnet/topic/0.0.10510035)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Vigil forecasts an autonomous AI agent's upcoming payment obligations (x402 pay-per-call services), detects liquidity shortfalls before they occur, evaluates acquisition routes like an automated treasury desk, and settles real payments on Hedera with a cryptographically verifiable HCS audit trail.

---

### 🌐 Live Hedera Testnet Anchors

| Entity | Hedera ID | HashScan Explorer Link | Description |
|---|---|---|---|
| **Agent Account** | `0.0.10510026` | [View Agent on HashScan](https://hashscan.io/testnet/account/0.0.10510026) | Autonomous agent with live treasury & policy vault |
| **Merchant Account** | `0.0.10510028` | [View Merchant on HashScan](https://hashscan.io/testnet/account/0.0.10510028) | Market Intelligence API provider (x402 gated) |
| **Router LP Account** | `0.0.10510029` | [View Router LP on HashScan](https://hashscan.io/testnet/account/0.0.10510029) | Autonomous working capital swap liquidity pool & treasury |
| **Fee Collector Account** | `0.0.10510030` | [View Collector on HashScan](https://hashscan.io/testnet/account/0.0.10510030) | HIP-18 recipient of 0.01 FUSDC fixed custom transfer fee |
| **FUSDC Token** | `0.0.10510032` | [View FUSDC on HashScan](https://hashscan.io/testnet/token/0.0.10510032) | HTS Token with on-chain Custom Fixed Fee (10,000 base units) |
| **HCS Audit Topic** | `0.0.10524552` | [View Audit Topic on HashScan](https://hashscan.io/testnet/topic/0.0.10524552) | Consensus topic recording all forecasts, swaps, & settlements |
| **HCS Identity Topic** | `0.0.10524553` | [View Identity Topic on HashScan](https://hashscan.io/testnet/topic/0.0.10524553) | HCS-14-inspired agent identity & capability registry |
| **Scheduled Tx** | `0.0.10524570` | [View Schedule on HashScan](https://hashscan.io/testnet/schedule/0.0.10524570) | Time-based forward renewal with `waitForExpiry=false` |

---

## The Problem

AI agents are becoming primary economic actors, paying per-request for data, inference, and compute over **x402**. But an agent with a wallet is not an agent with working capital: it can hold ample HBAR and still default on a FUSDC-denominated obligation due in 30 minutes.

Traditional DeFi treasuries optimize for yield; **Vigil optimizes for solvency**.

---

## What the Demo Shows

1. **Initial State:** The Agent holds 100 HBAR and 0 FUSDC.
2. **Obligation Formulation:** The Agent identifies a requirement for 10 metered market-intelligence queries priced at 1.00 FUSDC each. Adding HTS custom fees (0.10 FUSDC) and a safety buffer (0.20 FUSDC), the total requirement is **10.30 FUSDC**.
3. **Shortfall Detection:** Payment Coverage Ratio (PCR) is calculated as **0.0% (CRITICAL)**. A `SHORTFALL_DETECTED` event is emitted to HCS.
4. **Autonomous Route Matrix:** The Agent evaluates available liquidity venues:
   - **VigilRouter:** Available · Rate 2 HBAR/FUSDC + 30 bps fee · Total cost ~22.07 HBAR · Risk 0.00 · **SELECTED**
   - **SaucerSwap V2:** Unavailable on testnet · 25 bps · Risk 0.50 (graceful DEX fallback per §17)
5. **On-Chain LP Swap:** Agent transfers 22.066 HBAR to the Router LP account, settles Leg 2 to receive 11.00 FUSDC, and emits `SWAP_SETTLED`. The PCR gauge flips from **0% Red → 110% Green (HEALTHY)**.
6. **10 Metered Paid Calls:** Agent executes 10 sequential calls to `/market-data`. Each call:
   - Returns **HTTP 402** with dynamic metered quotation (0.50 base + 0.10 × 5 fields = 1.00 FUSDC).
   - Agent settles payment via HTS transfer (triggering the 0.01 FUSDC custom fee to the collector).
   - Agent retries with `X-PAYMENT` proof; server verifies on Hedera Mirror Node (success, freshness, payee, replay protection).
   - Server returns deterministic data + `UsageReport`; `PAYMENT_SETTLED` is logged to HCS.
7. **Obligation Fulfilled:** Agent fulfills its commitment, ending with ~78 HBAR and ~0.90 FUSDC.
8. **Autonomous Forward Renewal:** Agent schedules a forward renewal of 1.00 FUSDC via Hedera Scheduled Transactions (`waitForExpiry=true`).

---

## System Architecture

```
┌───────────────────────────────────────────────────────────────────────────┐
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
│   • Audit Topic:    0.0.10510035  (Immutable State Machine Log)           │
│   • Identity Topic: 0.0.10510037  (HCS-14 Agent Identity & Policy Vault)  │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## The x402 Payment Flow

```
Agent                                                       Merchant
  │                                                            │
  │─── 1. GET /market-data?symbol=HBAR&fields=... (unpaid) ───>│
  │                                                            │
  │<── 2. HTTP 402 Payment Required + Quotation JSON ──────────│
  │       (Base 0.50 + 0.10/field × 5 = 1.00 FUSDC)            │
  │                                                            │
  │─── 3. Execute HTS FUSDC Transfer on Hedera Testnet ───────>│
  │       (1.00 FUSDC to Merchant + 0.01 to Fee Collector)     │
  │                                                            │
  │─── 4. Retry GET /market-data with X-PAYMENT header ───────>│
  │       (Base64url proof with transactionId)                 │
  │                                                            │
  │       [Merchant queries Hedera Mirror Node:                │
  │        • Result === "SUCCESS"                              │
  │        • Freshness ≤ 120s                                  │
  │        • Payee credited 1.00 FUSDC                         │
  │        • ReplayStore.has(txId) === false]                  │
  │                                                            │
  │<── 5. HTTP 200 OK + Market Data + UsageReport ─────────────│
  │                                                            │
  │─── 6. Both emit PAYMENT_SETTLED & METERED_USAGE to HCS ────┼──> Topic
```

**Real Example On-Chain Payment:**
- Transaction ID: `0.0.6914535@1789291847.058661565`
- Mirror REST ID: `0.0.6914535-1789291847-058661565`
- [View on HashScan](https://hashscan.io/testnet/transaction/0.0.6914535@1789291847.058661565)
- Token Transferred: 1.000000 FUSDC to Merchant `0.0.10510028`
- Assessed Custom Fee: 0.010000 FUSDC to Fee Collector `0.0.10510030`

**Facilitator Note:** We implemented a production-grade **Native x402 on Hedera** engine (`X402_MODE=NATIVE`) backed by direct Mirror Node verification, token-transfer cryptographic validation, and persistent replay protection. The payment layer is decoupled behind standard interfaces ready for the Blocky402 facilitator.

---

## Bounty Rubric → Feature Verification Map

| Bounty Requirement | Vigil Implementation | Location | Verification Status |
|---|---|---|---|
| **Live x402-gated service on Hedera** | Metered Market Intelligence API with 402 challenge & usage reporting | [`apps/api-service`](apps/api-service) | ✅ Verified (`pnpm e2e:single`) |
| **Settled through payment facilitator** | Native x402 on Hedera with mirror-node validation & replay defense | [`packages/mirror`](packages/mirror) | ✅ Verified on HashScan |
| **Agent consuming it (≥1 real paid request)** | Vigil autonomous agent executing 10 sequential metered calls | [`apps/agent`](apps/agent) | ✅ Verified (`pnpm demo`) |
| **Public repo + full documentation** | Monorepo, architecture specs, quickstart, demo scripts | Root | ✅ Complete |
| **Demo video ≤ 5 minutes** | Video script covering problem, architecture, live run, & HashScan | [`DEMO_SCRIPT.md`](DEMO_SCRIPT.md) | ✅ Ready |

### Bonus Points Matrix (7 of 8 Bonus Features Shipped)

| Bonus Feature | Implementation | Priority | Proof |
|---|---|---|---|
| **1. Metered Pay-per-Call** | Base 0.50 + 0.10 per field requested; `UsageReport` in every response; `METERED_USAGE` HCS events | P0 | [HashScan Topic](https://hashscan.io/testnet/topic/0.0.10510035) |
| **2. Verifiable HCS Audit Trail** | Every state transition (Shortfall, Route, Swap, Payment, Usage) emitted to HCS | P0 | [Audit Topic 0.0.10510035](https://hashscan.io/testnet/topic/0.0.10510035) |
| **3. HTS Custom Fee Schedule** | FUSDC configured with 0.01 fixed fee assessed to fee collector on every payment | P0 | [Token 0.0.10510032](https://hashscan.io/testnet/token/0.0.10510032) |
| **4. Autonomous Discovery Directory** | HCS-anchored discovery directory (`apps/directory`) with `/register` and `/services` | P1 | [Directory Endpoint](http://localhost:3004) |
| **5. Scheduled Transactions** | Time-based forward renewal via `scheduleFusdcTransfer` with `waitForExpiry=true` | P1 | [Schedule 0.0.10521550](https://hashscan.io/testnet/schedule/0.0.10521550) |
| **6. On-Chain Agent Identity** | HCS-14-inspired agent identity anchoring capabilities and treasury policy | P1 | [Identity Topic 0.0.10510037](https://hashscan.io/testnet/topic/0.0.10510037) |
| **7. Automated Refund Route** | Merchant `/refund` route and agent fallback handling for paid-but-failed calls | P1 | [`apps/api-service/src/routes/refund.ts`](apps/api-service/src/routes/refund.ts) |

---

## Quickstart

### Prerequisites
- Node.js ≥ 20
- pnpm ≥ 9
- A Hedera Testnet Account ([portal.hedera.com](https://portal.hedera.com) — free 10,000 tHBAR)

### 1. Clone and Install
```bash
git clone https://github.com/your-username/vigil.git
cd vigil
pnpm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env and fill your OPERATOR_ID and OPERATOR_KEY from portal.hedera.com
```

### 3. Bootstrap Hedera Foundation
Creates the Agent, Merchant, LP, and Fee Collector accounts, provisions the FUSDC token with its HTS custom fixed fee, and initializes the HCS audit and identity topics:
```bash
pnpm run setup
pnpm run verify:foundation
```

### 4. Run the Full Autonomous Demo (Headless)
```bash
pnpm demo
```

To tail the live consensus audit trail directly from the Hedera Mirror Node:
```bash
pnpm topic:tail
```

### 5. Launch the Web Dashboard
```bash
pnpm dev
# Open http://localhost:3000 in your browser
```

---

## Monorepo Layout

```
vigil/
├── apps/
│   ├── agent/             # Autonomous agent core (treasury, forecast, executor)
│   ├── api-service/       # Merchant intelligence API (x402-gated + refund)
│   ├── directory/         # Service discovery registry (HCS anchored)
│   ├── router/            # VigilRouter LP swap service (quote & settle)
│   └── web/               # Next.js 14 App Router dark fintech dashboard
├── packages/
│   ├── config/            # Zod-validated configuration & env loader
│   ├── hcs/               # HCS logger with consensus size bounds
│   ├── hedera/            # Hedera SDK service (HTS, HCS, Schedule)
│   ├── mirror/            # Hedera Mirror Node REST client & polling
│   └── types/             # Shared TypeScript interfaces & Zod domain models
├── scripts/
│   ├── demo.ts            # Headless demo execution runner
│   ├── demo-reset.ts      # Reset balances & replay stores
│   ├── e2e-single-paid-call.ts # Single x402 payment verification
│   ├── fetch-topic.ts     # Real-time HCS topic tail utility
│   ├── setup.ts           # Hedera testnet account & token bootstrapper
│   └── verify-*.ts        # Phase-gated testnet verification suites
└── tests/
    └── vigil.test.ts      # Vitest unit test suite (10/10 passed)
```

---

## Roadmap

- **Mainnet SaucerSwap V2 Integration:** Connecting to real FUSDC/HBAR pools on Hedera Mainnet.
- **Bonzo Finance Credit Line:** Automated collateralized borrowing route when PCR shortfall exceeds treasury limits.
- **ERC-8004 Cross-Chain Identity:** Bridging HCS-14 agent credentials to EVM agent registries.
- **Streaming Micropayments:** Continuous sub-second token streaming for real-time model inference.
- **MCP Server:** Exposing Vigil's solvency engine as a Model Context Protocol tool for LLM agent frameworks.

---

## License

MIT © 2026 Vigil Team

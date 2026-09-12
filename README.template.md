# FATERA — Autonomous Working Capital OS for AI Agents

> **Agents shouldn't just know how to pay. They should know how to stay solvent.**

<!-- TODO: demo GIF (10s screen capture of PCR flipping red→green) -->

Fatera forecasts an AI agent's upcoming payment obligations (x402 pay-per-call services),
detects liquidity shortfalls before they happen, evaluates acquisition routes like a
treasury desk, and executes the cheapest one — settling real payments on Hedera with a
verifiable HCS audit trail.

**Demo video:** TODO (≤5 min) · **Live proof:** HCS audit topic: TODO (HashScan link) ·
FUSDC token: TODO (HashScan link)

## The problem
AI agents are becoming economic actors, paying per-request for data, inference and compute
(x402). But an agent with a wallet isn't an agent with working capital: it can be rich in
HBAR and still default on a USDC-denominated bill due in an hour. Treasuries optimize yield;
**Fatera optimizes solvency.**

## What the demo shows
Agent holds 100 HBAR and 0 FUSDC. Its task needs 10 metered API calls at 1.00 FUSDC each.
Fatera computes PCR = 0%, forecasts the shortfall, evaluates liquidity routes, swaps
HBAR→FUSDC through the FateraRouter (cheapest route), executes all 10 x402 payments with
per-call usage metering and a custom HTS fee in the settlement path, then schedules its
next renewal with a Hedera scheduled transaction. Every decision is receipted on HCS.

## Architecture
<!-- TODO: paste ARCHITECTURE.md system diagram, adapted/cleaned -->

| Component | Role |
|---|---|
| `apps/api-service` | x402-gated metered Market Intelligence API (the merchant) |
| `apps/agent` | Fatera agent: treasury, forecast, route evaluation, execution, HCS audit |
| `apps/router` | FateraRouter — x402-style HBAR→FUSDC liquidity service |
| `apps/directory` | HCS-anchored service registry (agent discovery) |
| `apps/web` | Live dashboard: balances, PCR gauge, route table, audit feed |

## The x402 payment flow (this is the core — read this twice)
1. Agent calls `GET /market-data` without payment → server replies **HTTP 402** with exact
   `paymentRequirements` (metered quote: base 0.50 + 0.10/field).
2. Agent settles the quote on-chain: FUSDC HTS transfer agent→merchant (custom fixed fee
   0.01 FUSDC/transfer flows to the fee collector — an HTS custom fee schedule in the
   settlement path).
3. Agent retries with `X-PAYMENT` proof; the server verifies the transaction against the
   Hedera Mirror Node: SUCCESS, correct token/payee/amount, fresh, **replay-protected**.
4. Server returns data + a per-call `UsageReport`; a `PAYMENT_SETTLED` event is written to
   the HCS audit topic.
<!-- TODO: real example — paste one actual transaction ID + its HashScan link -->

**Facilitator note:** we first attempted official x402/Blocky402 facilitator integration
(see `packages/…`); <TODO: state what shipped — e.g. "shipped native x402 on Hedera with
mirror-node verification; the payment layer is behind a swappable PaymentExecutor interface">
— see MEMORY.md for the exact blocker.

## Quickstart
```bash
# Prereqs: Node ≥20, pnpm ≥9, a Hedera testnet account (https://portal.prd.hedera.com, free 10k tHBAR)
git clone <REPO_URL> && cd fatera
cp .env.example .env        # fill OPERATOR_ID + OPERATOR_KEY from the portal
pnpm install
pnpm setup                  # creates agent/merchant/LP/fee-collector accounts, FUSDC token
                            # (custom fee), HCS topics; writes the rest of .env automatically
pnpm dev                    # dashboard on http://localhost:3000 → click "Run Demo"
# or headless:
pnpm demo                   # full loop in your terminal; pnpm topic:tail shows the audit trail
```

## How this maps to the Hedera bounty
<!-- TODO: copy MASTER_PROMPT §2 tables and mark each ✓ with a one-line proof/link -->

## Tech
Hedera testnet (HTS, HCS, scheduled transactions) · @hashgraph/sdk · Mirror Node REST ·
Express · Next.js + Tailwind · TypeScript strict · pnpm/turborepo monorepo. No smart
contracts — native token operations only, per the track's design intent.

## Roadmap
SaucerSwap route on mainnet pools · Bonzo borrow route · streaming micropayments · MCP server
for LLM-driven agents · A2A/ACP negotiation · ERC-8004/HCS-14 identity · on-chain policy vault.

## License
MIT

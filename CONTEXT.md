# VIGIL — Project Context

## The one-liner
**Vigil is an Autonomous Working Capital OS for AI agents: it forecasts an agent's upcoming
payment obligations and autonomously acquires the right capital, at the right time, at the
lowest cost — on Hedera.**

Closing line for every demo/submission: *"Agents shouldn't just know how to pay.
They should know how to stay solvent."*

## The hackathon target
ETHOnline — Hedera track: **"AI & Agentic Payments on Hedera" ($6,000, up to 3 teams @ $2,000)**.
The bounty's own words: *"x402 on Hedera is still short of one thing: actual services you can
pay for. Stand up a real x402-gated service on Hedera and build the platform that consumes it."*

Hard requirements (from the bounty page — we must hit ALL):
1. Live x402-gated service on Hedera testnet/mainnet, settled via the Blocky402 facilitator
   (attempt officially; our native-x402 fallback is specified and honest — see README).
2. A platform/agent that consumes it with ≥1 real paid request end-to-end.
3. Public repo + README (setup, architecture, payment flow).
4. Demo video ≤ 5 minutes showing the paid request executing.

Bonus points we deliberately hit: metered pay-per-call pricing · HCS audit trail · HTS token
+ custom fee schedule in the settlement path · discovery directory · scheduled transactions
(recurring) · HCS-anchored agent identity · refunds. Skipped (roadmap): A2A/ACP negotiation.

## Why this wins (differentiation)
Most submissions will be "agent pays an API" — the literal reading of the bounty. Vigil's
reading is deeper: **the economically interesting agent is one that stays solvent.** Our demo
shows an agent with a currency mismatch (rich in HBAR, broke in FUSDC) that forecasts
shortfall, evaluates liquidity routes like a mini-treasury desk, executes the cheapest route,
and pays per-call — every step receipted on HCS. That's a *category* (working capital), not a
*feature* (pay-per-call). The crowded "agent treasury/yield" space (Agent Treasury, AgentBank,
Orbit, Robot Money on Base/Solana) optimizes returns; nobody optimizes **solvency**.

## The demo narrative (the product IS the demo)
1. Agent treasury: 100 HBAR, 0 FUSDC. Goal: fetch 10 metered market reports @ 1.00 FUSDC.
2. PCR = 0% → dashboard red → SHORTFALL_DETECTED on HCS.
3. Route evaluation table (router swap 0.3% vs SaucerSwap unavailable vs HBAR premium) →
   ROUTE_SELECTED on HCS.
4. Swap executes (two verified on-chain legs) → PCR 110% → green.
5. 10 x402 payments settle, each with a usage report (metering) and custom-fee receipt.
6. OBLIGATION_FULFILLED; agent schedules its next renewal via a scheduled transaction.

## Constraints (deliberate)
- Deterministic agent logic, no LLM calls at runtime (demo reliability > AI theater; MCP/LLM
  integration is roadmap).
- No smart contracts (the bounty explicitly rewards "native token operations without smart
  contract overhead" — use HTS/HCS natively).
- Everything on testnet, real transactions, verifiable on HashScan.
- Buildable by one person + agentic IDE in ~2–3 focused days.

## Glossary (minimum viable)
x402 = HTTP-402-turned-payment-protocol (server quotes a price; client pays on-chain; server
verifies; data flows). HTS = Hedera's native token service. HCS = Hedera's consensus
messaging (immutable, timestamped audit log). Mirror node = free read API of chain state.
Facilitator (Blocky402) = service that settles/verifies x402 payments on Hedera. PCR =
payment coverage ratio. HBAR = Hedera's native coin (10^8 tinybars).

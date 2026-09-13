# FATERA — Build Memory (the IDE agent MUST update this file after every phase)

## Meta
- Project: Fatera — Autonomous Working Capital OS (ETHOnline / Hedera x402 bounty)
- Master spec: MASTER_PROMPT.md (authoritative)
- Started: 2026-09-13 · Deadline: check ETHOnline dates — submit EARLY

## Current phase
Phase 7 — Web Dashboard (Next.js dark fintech UI)

## Completed phases
- Phase 0 ✅ checkpoint passed: `pnpm install && pnpm -r build` exited 0. Workspace scaffolded with turbo, tsconfig.base, packages/types, packages/config.
- Phase 1 ✅ checkpoint passed: `pnpm setup` & `pnpm verify:foundation` passed. AGENT (100 HBAR / 0 FUSDC); FUSDC Token 0.0.10510032 with custom fixed fee (0.01 FUSDC); HCS Audit Topic 0.0.10510035; HCS Identity Topic 0.0.10510037. Checkpoint event verified on mirror node.
- Phase 2 ✅ checkpoint passed: `pnpm topic:tail` decoded and printed HCS Audit Topic events from the mirror node as structured JSON.
- Phase 3 ✅ checkpoint passed: `pnpm e2e:single` executed full 402 -> pay -> retry -> 200 loop on Hedera testnet. Metered pricing validated, mirror-node verification passed, replay protection verified, and PAYMENT_SETTLED HCS audit event verified on-chain.
- Phase 4 ✅ checkpoint passed: `pnpm verify:router` verified quote (2 FUSDC for 4.012 HBAR), settled Leg 1 (HBAR transfer to ROUTER_LP), settled Leg 2 (FUSDC transfer from ROUTER_LP to AGENT), verified replay protection rejection, verified both legs on mirror node, and confirmed SWAP_SETTLED event on HCS topic.
- Phase 5 ✅ checkpoint passed: `pnpm demo:dry` verified discovery directory (`apps/directory`), balance polling, obligation formulation (10.30 FUSDC), forecast (PCR 0%, shortfall 10.30 FUSDC), route decision matrix selecting FATERA_ROUTER (~22.07 HBAR) over SAUCERSWAP_V2, policy validation, and State API `GET /state`.
- Phase 6 ✅ checkpoint passed: `pnpm demo` executed full autonomous working capital lifecycle on Hedera Testnet: discovered merchant service via directory, forecasted shortfall (PCR 0%, 10.30 FUSDC required), routed through FateraRouter to swap 22.066 HBAR for 11.00 FUSDC, refreshed treasury to flip PCR to 110.0% (HEALTHY), executed 10 sequential metered x402 paid calls to /market-data with on-chain settlement, replay protection, and mirror verification, fulfilled obligation, and ended with 77.933 HBAR and 1.000 FUSDC. Full event sequence logged to HCS topic 0.0.10510035.

## Live environment (fill during Phase 1 — NEVER commit real keys here, IDs only)
- AGENT_ACCOUNT_ID: 0.0.10510026
- MERCHANT_ACCOUNT_ID: 0.0.10510028
- ROUTER_LP_ACCOUNT_ID: 0.0.10510029
- FEE_COLLECTOR_ACCOUNT_ID: 0.0.10510030
- FUSDC_TOKEN_ID: 0.0.10510032
- HCS_TOPIC_ID (audit): 0.0.10510035
- HCS_IDENTITY_TOPIC_ID: 0.0.10510037
- HashScan topic link: https://hashscan.io/testnet/topic/0.0.10510035
- HashScan token link: https://hashscan.io/testnet/token/0.0.10510032
- X402_MODE: NATIVE
- Custom-fee empirical result (Phase 1 step 6): Custom fixed fee 10,000 base units (0.01 FUSDC) verified on token; treasury transfers are exempt per HIP-18; non-treasury transfers assess 0.01 FUSDC to FEE_COLLECTOR.

## Decisions log
- [Phase 0] Workspace initialized at `/Users/neelshah/Documents/other/Fatera` with pnpm workspace + turborepo + TypeScript strict mode.
- [Phase 0] Created full domain models and Zod schemas in `@fatera/types` matching §7 and §10.
- [Phase 0] Implemented `loadConfig()` with Zod validation and `.env` directory discovery in `@fatera/config`.
- [Phase 1] Configured operator from Hedera Developer Portal account `0.0.6914535`.
- [Phase 1] Fixed Hedera SDK method naming: `setTokenSymbol` (instead of `setSymbol`).
- [Phase 1] `TokenCreateTransaction` requires signatures from both `adminKey` and `routerLpKey` (treasury); both signed with `await tx.sign()`.
- [Phase 1] Successfully created child accounts, FUSDC token with custom fixed fee, associated accounts, and created HCS topics.
- [Phase 2] HcsLogger wraps messages ≤ 1000 bytes with automatic payload trimming for payloads approaching the 1024-byte HCS consensus limit.
- [Phase 3] Built `apps/api-service` with endpoints `/market-data`, `/price`, `/.well-known/x402`, `/refund`, and `/health`.
- [Phase 3] Refined `parsePrivateKey` to disambiguate 64-character raw hex keys: prefix `0x` denotes ECDSA, whereas raw 64 hex characters denote ED25519.
- [Phase 4] Implemented `apps/router` with deterministic quote (HBAR/FUSDC + feeBps), two-leg settlement verification via Mirror Node, replay protection, and `SWAP_SETTLED` HCS logging. Verified with `scripts/verify-router-swap.ts`.
- [Phase 5] Built `apps/directory` machine service registry with `/register`, `/services`, HTML overview, and HCS logging.
- [Phase 5] Implemented `apps/agent` core: `treasury`, `obligations`, `forecast` (PCR & shortfall math), `router` (route matrix evaluation), `discovery`, and `StateStore` + State API (`GET /state`, `GET /events`). Verified with `pnpm demo:dry`.
- [Phase 6] Built `apps/agent` executor (`executeSwap`, `x402Fetch`, refund handling). Verified autonomous end-to-end execution of 10 paid calls on Hedera Testnet via `pnpm demo`.

## Blockers & fallbacks used
- [Phase 1] Portal URL corrected from outdated `portal.prd.hedera.com` to `portal.hedera.com`.
- [Phase 1] Fixed async signature call in `@hashgraph/sdk` (`await tx.sign(key)`).
- [Phase 3] Refined `parsePrivateKey` to disambiguate 64-character raw hex keys: prefix `0x` denotes ECDSA, whereas raw 64 hex characters denote ED25519.

## Risk register

## Next actions
1. Build Phase 7: `apps/web` (Next.js dark fintech dashboard §15: PCR gauge, Route Decision Matrix, Payments Table, Live HCS Audit Feed with clickable HashScan links).
2. Verify dashboard locally with live agent state feed (`pnpm dev`).
3. Commit Phase 7 and advance to Phase 8 (Bonus layer: scheduled transaction & identity).

## Submission status
- [ ] repo public  [ ] README complete  [ ] video recorded  [ ] submitted on platform

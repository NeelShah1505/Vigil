# FATERA — Implementation Plan (phases, checkpoints, gates)

> The authoritative, fully-detailed phase specs live in MASTER_PROMPT.md §16. This file is the
> execution checklist you (and the IDE agent) track against. Update MEMORY.md after each phase.

## Time budget (solo + agentic IDE)

| Phase | Scope | Budget | Gate |
|---|---|---|---|
| 0 | scaffold, tooling | 30m | `pnpm -r build` clean |
| 1 | hedera/mirror pkgs, setup script, accounts+token+topic | 90m | `pnpm verify:foundation` prints balances + HCS readback |
| 2 | HcsLogger, topic tail script | 45m | `pnpm topic:tail` decodes events |
| 3 | api-service (402 + verify + replay + refund) | 2h | `curl` 402 exact JSON; e2e single paid call exits 0 |
| 4 | router (quote/settle) | 1h | scripted swap, both legs verified |
| 5 | directory + agent core (dry run) | 90m | `pnpm demo:dry` prints forecast + route table |
| 6 | agent execution loop | 90m | `pnpm demo`: 10 settled payments, full HCS sequence |
| 7 | dashboard | 2h | live red→green demo, HashScan links, no errors |
| 8 | scheduler + identity (+optional multi-asset) | 90m | SCHEDULE_EXECUTED verified; identity event |
| 9 | README, QA, video, submission | 1h | §19 checklist all green |

Total ≈ 11.5 hours of focused building. Budget 2–3 days with slack.

## Go/No-Go gates
- End of Phase 3: if the paid call doesn't settle on testnet, STOP and fix before anything
  else — nothing downstream matters without it.
- End of Phase 6: this is the minimum viable submission (repo + headless demo + HCS proof).
  From here, everything is upside.
- Deadline −6h: freeze features; only README/video/submission polish.

## Cut plan (in order, if behind)
1. MULTI_ASSET direct-HBAR route → 2. /refund endpoint → 3. scheduler → 4. identity →
5. Path A (official facilitator) attempt. NEVER cut Phases 1–7.

## Verification commands (root package.json — create these scripts)
- `pnpm setup` — bootstrap accounts/token/topics, write .env
- `pnpm verify:foundation` — balances + HCS ping
- `pnpm topic:tail` — last 25 HCS events decoded
- `pnpm demo:dry` — plan-only run
- `pnpm demo` — full headless demo
- `pnpm demo:reset` — normalize balances for repeat demos
- `pnpm dev` — all services + dashboard
- `pnpm test` — vitest units

## Definition of Done (submission)
Bounty requirements 1–4 + bonus map all ✓, QA checklist (MASTER_PROMPT §19) green, video
recorded (DEMO_SCRIPT.md), repo public, project submitted on the ETHOnline platform.

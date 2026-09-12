# FATERA — 5-Minute Demo Video Script

**Setup before recording:** `pnpm demo:reset` (agent = exactly 100 HBAR / 0 FUSDC) →
`pnpm dev` → dashboard open → `pnpm topic:tail` running in a second terminal (nice for cut
shots) → HashScan topic page open in a tab. Record 1600×900+, OBS, ~30fps is fine.

| Time | Screen | Say / do |
|---|---|---|
| 0:00–0:20 | Dashboard idle (PCR 0%, red) | "AI agents can now pay per request with x402. But an agent that can pay isn't an agent that can *stay* solvent. This is Fatera: working capital for autonomous agents." |
| 0:20–0:50 | Architecture diagram (README) | "A metered API behind x402, a Fatera agent with its own treasury, a liquidity router, and a Hedera Consensus Service audit trail. Everything settles on testnet — verify every claim on HashScan." |
| 0:50–1:10 | Dashboard, click **Run Demo** | "The task: ten metered market reports at one FUSDC each. The agent holds one hundred HBAR — and zero FUSDC. Coverage ratio: zero percent." |
| 1:10–1:40 | Forecast + shortfall events appear | "Fatera forecasts the shortfall *before* it happens: it needs 10.3 FUSDC including custom fees and buffer. Shortfall detected — logged to HCS." |
| 1:40–2:10 | Route decision table renders | "Now the treasury-desk moment: it evaluates liquidity routes — the FateraRouter swap at 0.3 percent, SaucerSwap, unavailable for this token on testnet. It picks the cheapest and executes. Two on-chain legs, both verified." |
| 2:10–2:30 | PCR gauge flips green | "Coverage ratio: 110 percent. The agent is solvent again — it did that itself." |
| 2:30–3:10 | Payments table filling, audit feed streaming | "Ten x402 payments, each one metered — base fee plus per-field pricing, usage reported on every call. Each payment: HTTP 402, on-chain transfer, mirror-node verification, replay-protected, receipted on HCS." |
| 3:10–3:40 | HashScan topic tab | "The entire decision history is on the Hedera Consensus Service — shortfall, route selection, every settlement, in order, immutable." (scroll slowly) |
| 3:40–4:10 | Scheduled payment card (Phase 8) | "And because bills recur, the agent just scheduled its next renewal — a Hedera scheduled transaction that executes on its own." |
| 4:10–4:40 | Repo/README quick scroll | "Open source — setup, architecture, the payment flow documented, one command to run the whole demo." |
| 4:40–5:00 | Dashboard, closing | "Agents shouldn't just know how to pay. They should know how to stay solvent. Fatera." |

**Contingencies:**
- Swap/payment stalls on camera → narrate from the audit feed + HashScan ("it's settling
  on-chain — here's the receipt"), keep rolling, edit tight afterwards.
- Worst case: narrate over a pre-recorded run. Practice the live run twice before recording.
- Keep the video ≤ 5:00 hard cut (bounty rule). Re-watch once for audio glitches.

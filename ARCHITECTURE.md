# VIGIL — Architecture

## System diagram

```
                     ┌─────────────────────────── HEDERA TESTNET ───────────────────────────┐
                     │   HBAR · FUSDC (HTS, custom fee 0.01/tx) · HCS Audit Topic           │
                     │   HCS Identity Topic · Scheduled Transactions · Mirror Node REST     │
                     └─────────▲───────────────────────▲───────────────────▲────────────────┘
                               │ txs + topic msgs      │ verify           │ verify
 ┌──────────┐  polls /state    │                       │                  │
 │  WEB UI  │◄────┐            │                       │                  │
 │ (Next)   │     │      ┌─────┴─────┐   402/pay    ┌──┴──────────┐  ┌────┴─────────┐
 └──────────┘     │      │  AGENT    │◄────────────►│ API SERVICE │  │  VIGILROUTER │
                  └──────┤ treasury  │  X-PAYMENT   │ (merchant)  │  │  (LP swap)   │
                         │ forecast  │              │ metered x402│  │ quote/settle │
                         │ router    │  discover    └─────────────┘  └──────────────┘
                         │ executor  │◄──────┐
                         └───────────┘       │      ┌────────────┐
                                  register / query  │ DIRECTORY  │ (HCS-anchored registry)
                                             └─────►└────────────┘
```

## The x402 payment sequence (native mode)

```
Agent                         API Service                    Hedera / Mirror
  │  GET /market-data?fields=...  │                               │
  │◄───── 402 + paymentRequirements (exact metered quote) ───────│
  │                               │                               │
  │  TransferTransaction FUSDC agent→merchant 1.00 (+0.01 fee) ──►│  (tx settles)
  │  GET /market-data (X-PAYMENT: b64 proof) │                   │
  │                               │── waitForTransaction(txId) ──►│
  │                               │◄─ SUCCESS, transfers OK ──────│
  │                               │  replay check ✓  mark used ✓  │
  │◄──── 200 + data + usage + settlement{txId} ───────────────────│
  │                               │── PAYMENT_SETTLED → HCS ─────►│
```

## Swap sequence (VigilRouter)

```
Agent → GET /quote?amountFusdc=11 → {amountHbar: "22.066", payee: ROUTER_LP}
Agent → HBAR transfer agent→ROUTER_LP (tx recorded on-chain)
Agent → POST /settle {transactionId, amountFusdc}
Router → mirror-verify HBAR leg (amount, payee, fresh, unused)
Router → FUSDC transfer ROUTER_LP→agent (tx recorded on-chain)
Router → 200 {fusdcTxId} + SWAP_SETTLED → HCS
```

## Component responsibilities

| Component | Owns | Never does |
|---|---|---|
| api-service | pricing, 402 quoting, payment verification, replay store, refunds, data gen | hold agent keys |
| agent | treasury, obligations, forecast, route eval, execution, HCS logging, state API | LLM calls, custody of merchant keys |
| router | quotes, swap settlement, LP balances | price randomness |
| directory | service registry + HCS anchoring | payment verification |
| web | presentation only | chain calls (all data via agent /state) |

## Data contracts
See MASTER_PROMPT §7 for the exact TypeScript domain model (Balance, Obligation, Forecast,
RouteQuote, RouteEvaluation, PaymentRecord, HcsEvent, AgentState, ServiceDescriptor). HCS
messages are ≤1000 bytes, JSON, `{v, seq, ts, type, agent, data}`.

## Trust & security model
- Keys: each account's key lives only in `.env` (gitignored) on the machine running its
  service. The agent never touches merchant/LP keys and vice versa.
- Payment integrity: amount + payee + token + freshness + replay-protected, all verified
  against the mirror node (chain truth), not client claims.
- Audit: state changes are only "real" if the HCS event exists on-chain — the dashboard's
  event feed is backed by `GET /api/v1/topics/{id}/messages`.

## Failure policies
Retries: 3×/backoff on network; refund path when paid-but-unserved; scheduler is droppable
(bonus); SaucerSwap expected-unavailable on testnet (route row shows why). Full tree in
MASTER_PROMPT §17.

## Roadmap (README "what's next")
SaucerSwap mainnet pools as a real route · Bonzo borrow route in the route matrix ·
streaming micropayments · MCP server exposing Vigil to LLM agents · A2A/ACP negotiation ·
ERC-8004 identity · on-chain policy enforcement contract.

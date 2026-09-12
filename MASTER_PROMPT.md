# FATERA — MASTER BUILD PROMPT v1.0
## Autonomous Working Capital OS for AI Agents · ETHOnline · Hedera "AI & Agentic Payments" Track

> You are an expert full-stack blockchain engineer building a hackathon submission.
> This document is your single source of truth. Read it fully before writing any code.
> Supporting docs in this folder: CONTEXT.md, ARCHITECTURE.md, IMPLEMENTATION.md, MEMORY.md,
> README.template.md, DEMO_SCRIPT.md. If this file and another file conflict, THIS file wins.

---

## §0 — HOW TO USE THIS FILE (EXECUTION PROTOCOL)

1. Read this file top to bottom. Then read CONTEXT.md, ARCHITECTURE.md, IMPLEMENTATION.md, MEMORY.md.
2. Execute phases §16 (Phase 0 → Phase 9) strictly in order. Never start a phase before the
   previous phase's CHECKPOINT passes.
3. After every phase:
   a. Run the checkpoint command(s) and capture the output.
   b. Update MEMORY.md (log what was done, decisions made, IDs created, blockers hit).
   c. `git add -A && git commit -m "phase(N): <summary>"`.
4. NEVER ask the human questions. Make reasonable assumptions, record them in MEMORY.md
   under "Decisions", and keep building.
5. If a step fails, follow the fallback tree in §17. If no fallback exists, implement the
   simplest working alternative, log it in MEMORY.md, and continue. Momentum > perfection.
6. Never print or commit private keys. `.env` is gitignored. Only `.env.example` is committed.
7. All amounts must be deterministic. No `Math.random()` without a seeded generator.
8. TypeScript strict mode everywhere. No `any` unless unavoidable (mark with `// eslint-disable`).

---

## §1 — MISSION & NON-NEGOTIABLES

**Mission:** Build Fatera — an Autonomous Working Capital OS for AI agents — and win the
"AI & Agentic Payments on Hedera" bounty ($6,000) at ETHOnline.

**Non-negotiables (bounty qualification):**
1. A **live x402-gated service** running on Hedera **testnet**, settled in real on-chain
   transactions (attempt official Blocky402 facilitator first; native x402 fallback is
   fully specified in §10 and is acceptable — document which path shipped).
2. An **agent that consumes the service end-to-end**: it discovers the service, forecasts
   a liquidity shortfall, acquires the payment asset, and completes **10 real paid requests**.
3. **HCS audit trail**: every financial state change is written to a Hedera Consensus
   Service topic, verifiable on HashScan.
4. **Public GitHub repo** with a README covering setup, architecture, and the payment flow.
5. A **≤5 minute demo video** showing the paid request executing (script in DEMO_SCRIPT.md).

**The demo story (memorize this):**
An AI agent holds 100 HBAR and 0 USDC-equivalent. Its task requires 10 paid API calls at
1.00 FUSDC each. Fatera forecasts the shortfall (PCR = 0%), evaluates liquidity routes,
autonomously swaps HBAR→FUSDC, executes all 10 x402 payments, and logs everything to HCS.
The agent stays solvent by design. Closing line: **"Agents shouldn't just know how to pay.
They should know how to stay solvent."**

---

## §2 — HACKATHON RUBRIC → FEATURE MAP

| Bounty requirement | Fatera feature | Where | Verified by |
|---|---|---|---|
| Live x402-gated service on Hedera | `apps/api-service` (Market Intelligence API) | §11 | `curl -i` returns 402 + payment requirements; paid call returns 200 |
| Settled through Blocky402 facilitator | Path A integration attempt; Path B native settlement w/ mirror-node verification | §10 | README documents which path shipped; tx on HashScan |
| Platform/agent consuming it, ≥1 real paid request end-to-end | Fatera agent executes 10 paid requests | §14 | `pnpm demo` full run; HCS events on HashScan |
| Public repo + README (setup/architecture/payment flow) | README from README.template.md | §20 | Phase 9 checkpoint |
| Demo video ≤5 min | DEMO_SCRIPT.md | §21 | Recording |

**Extra points (bonus):**

| Bonus item | Fatera feature | Priority |
|---|---|---|
| Metered pay-per-call (not flat fee) | Base fee 0.50 + 0.10 per data field; usage report on every response; METERED_USAGE HCS events | P0 |
| Verifiable payment audit trails on HCS | Every event → HCS topic → HashScan | P0 |
| HTS tokens / custom fee schedules in settlement path | FUSDC HTS token with 0.01 custom fixed fee per transfer, fee-aware routing | P0 |
| Agent discovery (UCP or directory) | `apps/directory` — HCS-anchored service registry; agent discovers service at runtime | P1 |
| Recurring/streamed payments via Scheduled Transactions | Agent schedules a renewal payment with `waitForExpiry(true)` that auto-executes on-chain | P1 |
| On-chain agent identity (ERC-8004 / HCS-14) | HCS-anchored agent identity registration with payment policy profile | P1 |
| Refunds | Merchant `/refund` endpoint; agent uses it if payment settles without service delivery | P1 |
| Multi-agent negotiation (A2A/ACP) | NOT built — listed as roadmap in README | skip |

---

## §3 — PRODUCT CONTEXT (CONDENSED)

Read CONTEXT.md for the full narrative. Summary:

- **Problem:** AI agents are becoming economic actors, but nobody guarantees they can *pay
  their future bills*. Wallets answer "where is my money", treasuries answer "where should
  it earn" — Fatera answers "will I stay solvent through my upcoming obligations?"
- **Key metric:** PCR (Payment Coverage Ratio) = available payment-asset balance ÷
  outstanding upcoming obligations. Healthy ≥ 110%.
- **Key mechanic:** liquidity-aware payment routing — the agent evaluates multiple ways to
  meet an obligation (swap via router, real DEX, direct premium asset) and picks the cheapest.
- **Differentiation vs. crowded "agent treasury" projects:** we are not a yield optimizer;
  we are a **solvency engine**. The hackathon demo is the solvency loop, live.

---

## §4 — TECH STACK & CODING STANDARDS

| Layer | Choice |
|---|---|
| Runtime | Node.js ≥ 20, TypeScript ≥ 5.3, `strict: true` |
| Monorepo | pnpm workspaces + turborepo |
| Blockchain | Hedera **testnet** via `@hashgraph/sdk` ^2.x |
| Mirror node | Hedera testnet Mirror Node REST API (default `https://testnet.mirrornode.hedera.com`) |
| Payments | x402 semantics over HTTP (402 → pay → retry with proof). Path A: official x402/Blocky402 packages if installable. Path B: native implementation (default build) |
| API service | Express 4 + zod |
| Agent | Node + Express (state API), pure TypeScript decision logic, **no LLM calls** (deterministic agent — deliberate, for demo reliability) |
| Frontend | Next.js (App Router) + Tailwind, dark fintech design |
| Tests | vitest (unit) + `scripts/e2e*.ts` (integration) |
| Scripts runner | `tsx` |

**Standards:**
- Every module has a single responsibility and a named export class/function.
- All env access goes through a typed `loadConfig()` (zod-validated) in `packages/config`.
- All network calls to Hedera/Mirror use retry-with-backoff (3 attempts, 700ms→2s).
- All timestamps stored as ISO-8601 UTC strings; on-chain times as mirror consensus timestamps.
- Logging: `pino`-style JSON lines to stdout AND appended to `logs/<app>.log`. Never log secrets.
- Ports: web 3000 · api-service 3001 · agent 3002 · router 3003 · directory 3004.

---

## §5 — REPOSITORY STRUCTURE (BUILD EXACTLY THIS)

```
fatera/
├── MASTER_PROMPT.md / CONTEXT.md / ARCHITECTURE.md / IMPLEMENTATION.md / MEMORY.md   (this docs set)
├── README.md                        # generated in Phase 9 from README.template.md
├── README.template.md
├── DEMO_SCRIPT.md
├── package.json                     # root scripts: setup, dev, demo, demo:reset, verify:*
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
├── .env.example
├── .gitignore                       # .env, node_modules, dist, logs, config/state.json, used-payments.json
├── apps/
│   ├── api-service/                 # THE MERCHANT: x402-gated Market Intelligence API
│   │   ├── src/server.ts            # express bootstrap
│   │   ├── src/routes/marketData.ts # 402 flow + metering
│   │   ├── src/routes/refund.ts     # refund endpoint
│   │   ├── src/routes/wellKnown.ts  # /.well-known/x402 discovery + /price
│   │   ├── src/verify/verifyPayment.ts   # mirror-node payment verification
│   │   ├── src/verify/replayStore.ts     # used tx-id persistence
│   │   ├── src/pricing.ts           # metered pricing function
│   │   └── src/register.ts          # register into directory at startup
│   ├── agent/                       # THE CONSUMER: Fatera Agent
│   │   ├── src/index.ts             # bootstrap: identity, state API, demo runner
│   │   ├── src/core/treasury.ts     # balances (SDK + mirror)
│   │   ├── src/core/obligations.ts  # obligation model
│   │   ├── src/core/forecast.ts     # PCR, shortfall, runway
│   │   ├── src/core/router.ts       # route evaluation + selection
│   │   ├── src/core/executor.ts     # swap execution + x402 payment execution
│   │   ├── src/core/scheduler.ts    # scheduled renewal tx (Phase 8)
│   │   ├── src/core/identity.ts     # HCS agent registration (Phase 8)
│   │   ├── src/state.ts             # in-memory event-sourced state + GET /state + GET /events
│   │   └── src/discovery.ts         # query directory, pick service
│   ├── router/                      # THE LP: FateraRouter swap service (HBAR→FUSDC)
│   │   ├── src/server.ts
│   │   ├── src/routes/quote.ts
│   │   ├── src/routes/settle.ts     # verify HBAR leg, pay FUSDC leg
│   │   └── src/register.ts
│   ├── directory/                   # Discovery registry (HCS-anchored)
│   │   └── src/server.ts            # POST /register, GET /services, GET /
│   └── web/                         # Next.js dashboard
│       ├── app/page.tsx             # main dashboard
│       ├── app/api/state/route.ts   # proxy to agent /state (avoids CORS)
│       ├── components/KpiCards.tsx  # balances, PCR gauge, obligation card
│       ├── components/RouteTable.tsx
│       ├── components/AuditFeed.tsx# HCS events, live
│       ├── components/PaymentsTable.tsx
│       └── components/DemoControls.tsx
├── packages/
│   ├── types/                       # shared TS types + zod schemas (§7)
│   ├── config/                      # loadConfig() from .env, zod-validated
│   ├── hedera/                      # HederaService: SDK wrapper (§8)
│   ├── mirror/                      # MirrorClient: REST wrapper + tx-id helpers (§8)
│   └── hcs/                         # HcsLogger: event schemas + emit + fetch (§8)
├── scripts/
│   ├── setup.ts                     # create accounts/token/topic, fund, write .env (§9)
│   ├── verify-foundation.ts         # balances + HCS ping
│   ├── e2e-single-paid-call.ts      # one paid request, asserts everything
│   ├── demo.ts                      # headless full demo run
│   ├── demo-reset.ts                # normalize agent balances for repeat demos
│   └── fetch-topic.ts               # print last N HCS events from mirror
└── config/
    └── state.json                   # generated: created IDs (gitignored)
```

---

## §6 — ENVIRONMENT & CONFIGURATION

`.env.example` (committed; `pnpm setup` fills the GENERATED keys into `.env`):

```
# --- Hedera ---
HEDERA_NETWORK=testnet
MIRROR_NODE_URL=https://testnet.mirrornode.hedera.com

# --- Bootstrap operator (YOU create this via https://portal.prd.hedera.com) ---
OPERATOR_ID=0.0.XXX
OPERATOR_KEY=302e...   # ECDSA/ED25519 private key string from portal

# --- GENERATED by `pnpm setup` (do not hand-edit) ---
AGENT_ACCOUNT_ID=
AGENT_PRIVATE_KEY=
MERCHANT_ACCOUNT_ID=
MERCHANT_PRIVATE_KEY=
ROUTER_LP_ACCOUNT_ID=
ROUTER_LP_PRIVATE_KEY=
FEE_COLLECTOR_ACCOUNT_ID=
FEE_COLLECTOR_PRIVATE_KEY=
FUSDC_TOKEN_ID=
HCS_TOPIC_ID=
HCS_IDENTITY_TOPIC_ID=

# --- Economics (tuneable) ---
HBAR_PER_FUSDC=2            # router quoted rate
ROUTER_FEE_BPS=30           # 0.30% swap fee
BASE_FEE_FUSDC=0.50         # per-call base
PER_FIELD_FUSDC=0.10        # per data field
CUSTOM_FEE_BASE_UNITS=10000 # 0.01 FUSDC per transfer (6 decimals)
MULTI_ASSET=false           # optional: merchant also accepts HBAR at +5% premium

# --- Ports/URLs ---
PORT_API=3001
PORT_AGENT=3002
PORT_ROUTER=3003
PORT_DIRECTORY=3004
```

**Accounts topology:**

| Account | Role | Starting state |
|---|---|---|
| AGENT | Fatera agent treasury | exactly 100 HBAR, 0 FUSDC |
| MERCHANT | api-service payee | 5 HBAR (gas), 0 FUSDC |
| ROUTER_LP | liquidity provider | 500 HBAR, ≥ 1000 FUSDC |
| FEE_COLLECTOR | receives custom fees | 5 HBAR |
| OPERATOR | bootstrap/deployer (yours) | faucet-funded |

**Token:** `FUSDC` ("Fatera USD"), decimals 6, custom fixed fee `0.01 FUSDC` per transfer
to FEE_COLLECTOR (assessed on agent→merchant payments — this is the "custom fee schedule
in the settlement path" bonus; the router must budget for it, §14).

---

## §7 — DOMAIN MODEL (packages/types — build these exactly)

```ts
// ---------- money ----------
type Asset = "HBAR" | "FUSDC";
interface Balance { hbarTinybars: string; fusdcBaseUnits: string; } // strings = big-safe

// ---------- pricing / metering ----------
const FIELDS = ["price", "volume", "sentiment", "volatility", "trend"] as const;
type Field = typeof FIELDS[number];
interface UsageReport {
  sessionId: string; symbol: string; fields: Field[];
  baseFeeFusdc: number; perFieldFusdc: number; fieldsCount: number;
  totalFusdc: number; timestamp: string;
}

// ---------- obligations ----------
interface Obligation {
  id: string; description: string; asset: "FUSDC";
  callsTotal: number; callsRemaining: number; costPerCallFusdc: number;
  amountFusdc: number;        // callsTotal * costPerCallFusdc
  feeEstimateFusdc: number;   // callsTotal * 0.01 custom fee
  bufferFusdc: number;        // 0.20 default
  requiredFusdc: number;      // amount + feeEstimate + buffer
  dueAt: string;              // ISO
  status: "PENDING" | "SHORTFALL" | "FUNDED" | "IN_PROGRESS" | "FULFILLED";
}

// ---------- forecast ----------
interface Forecast {
  pcrPct: number;                     // fusdc / (calls * costPerCall) * 100
  availableFusdc: number; requiredFusdc: number; shortfallFusdc: number;
  hbarNeededEstimate: number;         // shortfall-ish * rate, pre-quote
  state: "HEALTHY" | "WARN" | "CRITICAL";  // ≥110 / 80-110 / <80
  ts: string;
}

// ---------- routing ----------
interface RouteQuote {
  id: "FATERA_ROUTER" | "SAUCERSWAP_V2" | "DIRECT_HBAR_PREMIUM";
  available: boolean; costHbar: number; feeBps: number;
  latencyNote: string; riskPenaltyHbar: number; detail: string;
}
interface RouteEvaluation { ts: string; quotes: RouteQuote[]; selected: RouteQuote["id"] | null; reason: string; }

// ---------- payments ----------
interface PaymentRecord {
  callIndex: number; symbol: string; amountFusdc: number; feeFusdc: number;
  txId: string; mirrorTxId: string; status: "INITIATED" | "SETTLED" | "FAILED" | "REFUNDED";
  settledAt?: string;
}

// ---------- HCS events (message ≤ 1000 bytes!) ----------
interface HcsEvent {
  v: 1; seq: number; ts: string; type: HcsEventType; agent: string; data: Record<string, unknown>;
}
type HcsEventType =
  | "AGENT_REGISTERED" | "SERVICE_REGISTERED" | "SHORTFALL_DETECTED" | "FORECAST_UPDATED"
  | "ROUTE_EVALUATED" | "ROUTE_SELECTED" | "SWAP_INITIATED" | "SWAP_SETTLED"
  | "PAYMENT_INITIATED" | "PAYMENT_SETTLED" | "PAYMENT_FAILED" | "METERED_USAGE"
  | "REFUND_ISSUED" | "CHECKPOINT" | "OBLIGATION_FULFILLED"
  | "SCHEDULE_CREATED" | "SCHEDULE_EXECUTED" | "DEMO_RESET" | "ERROR";

// ---------- agent state (GET /state) ----------
interface AgentState {
  phase: "IDLE" | "PLANNING" | "SHORTFALL" | "ROUTING" | "SWAPPING" | "EXECUTING"
       | "FULFILLED" | "SCHEDULING" | "ERROR";
  balances: Balance; obligations: Obligation[]; latestForecast: Forecast | null;
  latestRouteEvaluation: RouteEvaluation | null; payments: PaymentRecord[];
  swap: { status: "NONE" | "PENDING" | "DONE"; hbarSpent?: number; fusdcReceived?: number;
          hbarTxId?: string; fusdcTxId?: string } ;
  schedule: { scheduleId: string; executeAt: string; status: "PENDING" | "EXECUTED" } | null;
  config: { network: string; topicId: string; tokenId: string; agentAccount: string;
            merchantAccount: string; hashscanBase: string };
  eventsSeen: number; ts: string;
}

// ---------- directory ----------
interface ServiceDescriptor {
  id: string; name: string; baseUrl: string; kind: "DATA" | "SWAP" | "OTHER";
  pricing: { asset: Asset; baseFusdc?: number; perFieldFusdc?: number; feeBps?: number };
  metered: boolean; ownerAccount: string; registeredAt: string;
}
```

---

## §8 — HEDERA FOUNDATION (packages/hedera + packages/mirror + packages/hcs)

### 8.1 HederaService (packages/hedera)

```ts
import { Client, AccountBalanceQuery, TransferTransaction, TopicCreateTransaction,
         TopicMessageSubmitTransaction, TokenId, AccountId, Hbar, Status,
         ScheduleCreateTransaction } from "@hashgraph/sdk";

class HederaService {
  constructor(private client: Client) {}
  static fromEnv(id: string, key: string, network = "testnet"): HederaService;

  async getHbarBalanceTinybars(account: string): Promise<string>;   // AccountBalanceQuery → hbars.toTinybars().toString()
  async getFusdcBalanceBaseUnits(account: string, tokenId: string): Promise<string>; // balance.tokens.get(TokenId) → toString() (missing → "0")
  async getBalances(account: string, tokenId: string): Promise<Balance>;

  // CRITICAL pattern — capture the tx id BEFORE execute, for the X-PAYMENT header:
  async transferFusdc(from: AccountId, to: AccountId, tokenId: string,
                      amountBaseUnits: number, memo: string): Promise<{ txId: string }> {
    const tx = new TransferTransaction()
      .addTokenTransfer(TokenId.fromString(tokenId), from, -amountBaseUnits)
      .addTokenTransfer(TokenId.fromString(tokenId), to,  amountBaseUnits)
      .setTransactionMemo(memo)
      .freezeWith(this.client);
    const txId = tx.transactionId!.toString();        // "0.0.x@secs.nanos"
    const resp = await tx.execute(this.client);
    const receipt = await resp.getReceipt(this.client);
    if (receipt.status !== Status.Success) throw new Error(`FUSDC transfer failed: ${receipt.status}`);
    return { txId };
  }
  async transferHbar(from: AccountId, to: AccountId, hbarAmount: number, memo: string)
    : Promise<{ txId: string }>;  // same pattern with Hbar.fromString(amount.toFixed(8))

  async createTopic(memo: string): Promise<string>;  // TopicCreateTransaction → receipt.topicId.toString()
  async submitTopicMessage(topicId: string, message: string): Promise<void>; // assert receipt SUCCESS; enforce ≤1000 bytes

  async scheduleFusdcTransfer(opts: { from: AccountId; to: AccountId; tokenId: string;
      amountBaseUnits: number; executeInMs: number; memo: string })
    : Promise<{ scheduleId: string }> {
    const inner = new TransferTransaction()
      .addTokenTransfer(TokenId.fromString(opts.tokenId), opts.from, -opts.amountBaseUnits)
      .addTokenTransfer(TokenId.fromString(opts.tokenId), opts.to, opts.amountBaseUnits);
    const tx = await new ScheduleCreateTransaction()
      .setScheduledTransaction(inner)
      .setWaitForExpiry(true)                                   // << time-based execution
      .setExpirationTime(new Date(Date.now() + opts.executeInMs))
      .setScheduleMemo(opts.memo)
      .execute(this.client);
    const receipt = await tx.getReceipt(this.client);
    return { scheduleId: receipt.scheduleId!.toString() };
  }
}
```

### 8.2 MirrorClient (packages/mirror)

```ts
// CRITICAL — transaction id format conversion (this WILL bite you):
// SDK txId:      "0.0.14885@1651151400.123456789"
// Mirror REST:   "0.0.14885-1651151400-123456789"
export function toMirrorTxId(txId: string): string {
  const [acct, rest] = txId.split("@");       // rest = "secs.nanos"
  return `${acct}-${rest.replace(".", "-")}`; // keep the dots inside the account part!
}

class MirrorClient {
  constructor(private baseUrl: string) {}

  // Mirror node is eventually consistent — ALWAYS poll, never fetch once:
  async waitForTransaction(txId: string, maxMs = 20000): Promise<any> {
    const url = `${this.baseUrl}/api/v1/transactions/${toMirrorTxId(txId)}`;
    const start = Date.now();
    while (Date.now() - start < maxMs) {
      const res = await fetch(url);
      if (res.status === 200) {
        const body = await res.json();
        const tx = body.transactions?.[0];
        if (tx?.result === "SUCCESS") return tx;
        if (tx && tx.result !== "SUCCESS") throw new Error(`tx failed: ${tx.result}`);
      }
      await new Promise(r => setTimeout(r, 700));
    }
    throw new Error(`tx ${txId} not found on mirror node within ${maxMs}ms`);
  }

  async getAccountHbarTinybars(account: string): Promise<string>;  // GET /api/v1/accounts/{id} → balance.balance
  async getAccountTokenBalance(account: string, tokenId: string): Promise<string>; // GET /api/v1/accounts/{id}/tokens?token.id={tid}
  async getTopicMessages(topicId: string, limit = 25): Promise<{ seq: number; ts: string; message: string }[]>; // GET /api/v1/topics/{id}/messages?order=desc&limit=N → base64-decode message
  async getSchedule(scheduleId: string): Promise<any>;             // GET /api/v1/schedules/{id} → executed_at when done
}
```

### 8.3 HcsLogger (packages/hcs)

```ts
class HcsLogger {
  private seq = 0;
  constructor(private hedera: HederaService, private topicId: string) {}
  async emit(type: HcsEventType, data: Record<string, unknown>): Promise<void> {
    const evt: HcsEvent = { v: 1, seq: ++this.seq, ts: new Date().toISOString(), type,
                            agent: "fatera-agent-001", data };
    const msg = JSON.stringify(evt);
    if (Buffer.byteLength(msg) > 1000) {  // HCS hard limit 1024 — trim `data` keys and retry once
      const slim = { ...evt, data: { note: "payload-trimmed", type } };
      return this.hedera.submitTopicMessage(this.topicId, JSON.stringify(slim));
    }
    await this.hedera.submitTopicMessage(this.topicId, msg);
  }
}
```

---

## §9 — ASSET SETUP SCRIPTS (scripts/setup.ts)

Run with the operator env only. Steps (in order, each printed to stdout):

1. **Create child accounts** via `AccountCreateTransaction` with fresh `PrivateKey.generateED25519()`:
   AGENT (initial 100 HBAR — the deterministic demo start), MERCHANT (5), ROUTER_LP (500),
   FEE_COLLECTOR (5). Print each `accountId`.
2. **Create FUSDC token:**

```ts
import { TokenCreateTransaction, CustomFixedFee, PrivateKey, TokenSupplyType } from "@hashgraph/sdk";
const adminKey = PrivateKey.generateED25519(); // persist in .env-derived config only, never in repo
const fee = new CustomFixedFee()
  .setFeeCollectorAccountId(feeCollectorId)
  .setAllCollectorsIsExempt(true)   // NOTE: verify exact SDK method name; older SDKs: setAllCollectorsAreExempt(true)
  .setAmount(10_000);                // 0.01 FUSDC (6 decimals); denominating token omitted ⇒ the token itself
const tx = await new TokenCreateTransaction()
  .setTokenName("Fatera USD").setSymbol("FUSDC").setDecimals(6)
  .setInitialSupply(1_000_000_000_000)           // 1,000,000 FUSDC in base units, treasury = ROUTER_LP
  .setTreasuryAccountId(routerLpId)
  .setAdminKey(adminKey.publicKey).setSupplyKey(adminKey.publicKey)
  .setFeeScheduleKey(adminKey.publicKey)
  .setSupplyType(TokenSupplyType.Infinite)
  .setCustomFees([fee])
  .execute(client);
const { tokenId } = await tx.getReceipt(client);
// FALLBACK if custom-fee-at-create errors: create WITHOUT fees, then
// TokenFeeScheduleUpdateTransaction().setTokenId(tokenId).setCustomFees([feeWithExplicit
// .setDenominatingTokenId(tokenId)]). If that also fails: ship without custom fee, log in
// MEMORY.md, and set CUSTOM_FEE_BASE_UNITS=0 (everything else still works).
```

3. **Associate FUSDC** to AGENT, MERCHANT, FEE_COLLECTOR (`TokenAssociateTransaction`,
   signed by each account's key). (Treasury is associated by creation.)
4. **Create HCS topic** `Fatera Audit Trail v1` (main) and `Fatera Agent Identity v1` (identity).
5. **Write all generated IDs/keys into `.env`** (append/replace keys; keep OPERATOR_* intact)
   and mirror them into `config/state.json` (gitignored). Print a summary table.
6. **Empirically verify the custom fee** (IMPORTANT — see §26 pitfalls): transfer 1.00 FUSDC
   ROUTER_LP→MERCHANT; query mirror token_transfers; print the actual fee entries; set
   `CUSTOM_FEE_BASE_UNITS` accordingly and note actual behavior in MEMORY.md.

`scripts/demo-reset.ts`: transfer agent's FUSDC balance back to ROUTER_LP (if any), top agent
up to exactly 100 HBAR from ROUTER_LP (or operator), emit `DEMO_RESET` HCS event, reset
`used-payments.json`, print normalized balances.

`scripts/verify-foundation.ts`: print all 4 account balances (HBAR+FUSDC), FUSDC token info,
submit+readback one HCS `CHECKPOINT` message. **This is the Phase 1 checkpoint.**

---

## §10 — THE X402 PAYMENT LAYER (READ TWICE)

### 10.1 Protocol semantics (both paths implement this exact flow)

```
1. Client  → GET /market-data?symbol=HBAR&fields=price,volume,sentiment,volatility,trend
2. Server  → HTTP 402, JSON body { error:"X402_PAYMENT_REQUIRED", paymentRequirements:[{...}] }
             (this response QUOTES the exact metered amount for THIS request)
3. Client  → executes an on-chain payment matching requirements[0]
             (FUSDC transfer, agent→merchant, exact amountBaseUnits; custom fee auto-assessed)
4. Client  → retries the SAME request with header  X-PAYMENT: <base64url(JSON proof)>
5. Server  → verifies proof against the Hedera Mirror Node:
             result=SUCCESS, correct token, correct payee, exact amount,
             payer = claimed payer, within maxAgeSeconds, txId NOT previously used (replay)
6. Server  → marks txId used, logs PAYMENT_SETTLED to HCS, returns 200 + data + UsageReport
```

### 10.2 PATH A — official packages (attempt FIRST, 45-minute timebox)

Goal: satisfy "settled through the Blocky402 facilitator" literally.
1. Consult (internet if available, else your knowledge): the repo
   `x402-foundation/x402` (client/server TS packages, e.g. `x402-fetch`), the PoC
   `hedera-dev/x402-inference-pay-per-request-poc` (the canonical Hedera x402 example),
   `https://blocky402.com` (Hedera facilitator), the blog
   `https://hedera.com/blog/hedera-and-the-x402-payment-standard/`.
2. Install what exists (e.g. `pnpm add x402-fetch` + any hedera/x402 helper the PoC uses).
3. Wire: client wraps fetch; server uses the facilitator/verification middleware per the PoC.
4. Run one paid call end-to-end. If it works: keep it as the primary executor, document in
   README ("settled via Blocky402"), and keep Path B code behind a feature flag
   `X402_MODE=OFFICIAL|NATIVE` in config.
5. If ANY step fails after 45 minutes total: switch to `X402_MODE=NATIVE`, log the exact
   failure in MEMORY.md, and move on WITHOUT further attempts. The architecture below makes
   both modes interchangeable (interface `PaymentExecutor`).

### 10.3 PATH B — native x402 on Hedera (the guaranteed default build)

**Server 402 response (exact shape):**

```json
{
  "error": "X402_PAYMENT_REQUIRED",
  "x402": { "version": 1, "mode": "native-hedera" },
  "paymentRequirements": [{
    "scheme": "hedera-native",
    "network": "testnet",
    "asset": "FUSDC",
    "tokenId": "<FUSDC_TOKEN_ID>",
    "amountBaseUnits": "1000000",
    "payeeAccountId": "<MERCHANT_ACCOUNT_ID>",
    "resource": "/market-data",
    "maxAgeSeconds": 300,
    "sessionId": "<uuid-per-402>",
    "description": "Metered market data: base 0.50 + 0.10/field × 5 fields = 1.00 FUSDC"
  }],
  "usagePreview": { "baseFeeFusdc": 0.5, "perFieldFusdc": 0.1, "fields": 5, "totalFusdc": 1.0 }
}
```

**X-PAYMENT header (client → server):** base64url of

```json
{ "scheme": "hedera-native", "network": "testnet", "transactionId": "0.0.agent@secs.nanos",
  "payerAccountId": "0.0.agent", "tokenId": "0.0.fusdc", "amountBaseUnits": "1000000" }
```

**Server verification algorithm (src/verify/verifyPayment.ts):**

```
function verifyPayment(tx, req):   // tx from MirrorClient.waitForTransaction(proof.transactionId)
  1. tx.result === "SUCCESS"
  2. |now − tx.consensus_timestamp| ≤ maxAgeSeconds (use mirror timestamps, never local clock)
  3. tx.token_transfers contains { token_id === req.tokenId, account === payeeAccountId,
     amount === +amountBaseUnits } and a negative entry for payerAccountId
     (extra fee transfers to FEE_COLLECTOR are expected and allowed)
  4. proof.payerAccountId === the account that signed (the negative transfer's account)
  5. replayStore.has(txId) === false  →  replayStore.add(txId)   // persisted to used-payments.json
  6. If MULTI_ASSET=true and scheme === "hedera-hbar": same checks against tx.transfers (tinybars)
```

**Replay store:** in-memory `Set` + JSON file (`used-payments.json`), loaded at boot, appended
on use. Gitignored.

**Client executor (apps/agent/src/core/executor.ts):**

```ts
async function x402Fetch(url: string, params: URLSearchParams, pay: (req) => Promise<string>):
    Promise<{ data: any; usage: UsageReport }> {
  // 1) unpaid request
  let res = await fetch(`${url}?${params}`);
  if (res.status !== 402) throw new Error(`expected 402, got ${res.status}`);
  const reqs = (await res.json()).paymentRequirements;
  // 2) pay on-chain exactly as quoted
  const { txId } = await pay(reqs[0]);
  // 3) retry with proof
  const proof = b64url(JSON.stringify({ scheme: "hedera-native", network: "testnet",
    transactionId: txId, payerAccountId: cfg.agentAccount, tokenId: reqs[0].tokenId,
    amountBaseUnits: reqs[0].amountBaseUnits }));
  res = await fetch(`${url}?${params}`, { headers: { "X-PAYMENT": proof } });
  if (res.status === 200) return res.json();
  // 4) paid-but-failed → one retry of the REQUEST (same proof), then REFUND flow (§11.3)
  throw new PaymentFailedAfterSettlement(txId);
}
```

---

## §11 — COMPONENT SPEC: apps/api-service (THE MERCHANT)

**Endpoints:**

| Method/Path | Behavior |
|---|---|
| `GET /market-data?symbol&fields` | Full x402 flow (§10.1). On success returns `{ status:"success", symbol, data:{ per-field mock values }, usage: UsageReport, settlement:{ txId, mirrorTxId } }` |
| `GET /price?fields=...` | No payment; returns the quote JSON (agent uses for forecasting) |
| `GET /.well-known/x402` | Service descriptor + payment requirements template (machine discovery) |
| `POST /refund` | `{ transactionId }` → if that tx paid merchant, is <10 min old, and was never settled → transfer amount back, log REFUND_ISSUED to HCS |
| `GET /health` | `{ ok:true, topicId, tokenId, paid: <count> }` |

**Pricing (src/pricing.ts):**

```ts
export function priceCall(fields: Field[]): number {
  return BASE_FEE_FUSDC + PER_FIELD_FUSDC * fields.length;   // 5 fields ⇒ 1.00 FUSDC
}
```

**Data generation (deterministic):** mock market data per symbol derived from a seeded hash
of `(symbol, dayIndex)` — e.g. price = 0.20 + (hash % 400)/100. Deterministic = forecastable.

**Startup:** register descriptor into `apps/directory` (POST /register), emit
`SERVICE_REGISTERED` to HCS. Retry directory registration 5× with backoff; proceed if directory is down.

---

## §12 — COMPONENT SPEC: apps/router (FateraRouter LP swap service)

An x402-style swap settlement service — itself a machine-to-machine service (nice narrative).

| Method/Path | Behavior |
|---|---|
| `GET /quote?amountFusdc=11` | → `{ rate: 2, feeBps: 30, amountHbar: "22.066", expiresInSeconds: 60, payeeAccountId: ROUTER_LP }` (amountHbar = amountFusdc × rate × (1+feeBps/10000), rounded up to 8 dp) |
| `POST /settle` | body `{ transactionId, payerAccountId, amountFusdc }` → verify HBAR transfer via MirrorClient (SUCCESS, correct payee, ≥ quoted amount, fresh, not reused) → transfer FUSDC `amountFusdc` LP→payer → respond `{ status:"settled", fusdcTxId }` and emit `SWAP_SETTLED` to HCS |

Deterministic quotes (no randomness). Startup: register into directory.

---

## §13 — COMPONENT SPEC: apps/directory (discovery, bonus)

- `POST /register` (ServiceDescriptor, zod-validated) → store in memory; emit
  `SERVICE_REGISTERED` to HCS (descriptor hash — keep under 1000 bytes).
- `GET /services` → list.
- `GET /` → minimal HTML list (title, name, pricing, metered badge) — humans can read it too.
- The AGENT consumes `GET /services` at planning time (§14): picks kind="DATA" service,
  fetches its `/.well-known/x402` for requirements. This is "agent discovery via a directory".

---

## §14 — COMPONENT SPEC: apps/agent (THE CORE)

### 14.1 Modules → files (per §5 tree). Single orchestration entry `runDemoGoal()`.

### 14.2 Forecast (src/core/forecast.ts)

```
pcrPct            = fusdcBalance / (callsRemaining × costPerCallFusdc) × 100
feeEstimateFusdc  = callsRemaining × CUSTOM_FEE
requiredFusdc     = callsRemaining × costPerCall + feeEstimate + 0.20 buffer
shortfallFusdc    = max(0, requiredFusdc − fusdcBalance)
state             = pcr ≥ 110 ? HEALTHY : pcr ≥ 80 ? WARN : CRITICAL
hbarNeededEstimate= ceil(shortfallFusdc × HBAR_PER_FUSDC × 1.01)
```

### 14.3 Route evaluation (src/core/router.ts)

```
quotes = []
1. FATERA_ROUTER:     GET router /quote (shortfallRoundedUp) → available, costHbar=quote.amountHbar, riskPenalty=0
2. SAUCERSWAP_V2:     try quote via @saucerswaplabs/saucerswap-core-sdk (TESTNET) if installable
                      in ≤30 min; on any failure → available=false, detail="no FUSDC pool on testnet" (EXPECTED)
3. DIRECT_HBAR_PREMIUM (only if MULTI_ASSET=true): costHbar = shortfall × rate × 1.05, detail="+5% merchant premium"
select = min over available of (costHbar + riskPenalty); reason = one sentence with numbers.
```
Emit `ROUTE_EVALUATED` (the full table) and `ROUTE_SELECTED` — the dashboard renders this table;
it is Fatera's signature moment.

### 14.4 The demo loop (src/index.ts — exact control flow)

```
runDemoGoal():
  1. identity.register()  (Phase 8; no-op before)        → AGENT_REGISTERED
  2. service = discovery.findDataService()               // directory GET /services → pick → /.well-known/x402
  3. quote   = GET /price?fields=all → costPerCallFusdc=1.0
     obligation = buildObligation(calls=10, costPerCall, dueAt=now+30min)
     emit CHECKPOINT "PLANNING"
  4. loop (max 5 iterations):
       balances = treasury.getBalances()
       forecast = forecast(balances, obligation)          → emit FORECAST_UPDATED
       if forecast.shortfallFusdc <= 0: break
       emit SHORTFALL_DETECTED {shortfall, required, pcr}
       routeEval = evaluateRoutes(...)                    → emit ROUTE_EVALUATED, ROUTE_SELECTED
       emit SWAP_INITIATED; swapResult = executeSwap(selected, shortfall)
          // FATERA_ROUTER: quote → transferHbar(agent→LP) → POST /settle → verify FUSDC leg on mirror
       emit SWAP_SETTLED {hbarSpent, fusdcReceived, txIds}
  5. emit CHECKPOINT "EXECUTING"
     for i in 1..10:
       emit PAYMENT_INITIATED {call:i}
       try { r = x402Fetch(market-data, fields=all)
             emit PAYMENT_SETTLED {txId, amount, fee} ; emit METERED_USAGE r.usage }
       catch paid-but-failed → merchant /refund → emit REFUND_ISSUED → retry once
       treasury.refresh(); state persist
  6. emit OBLIGATION_FULFILLED {paid:10, totalFusdc:10.0, feesFusdc:0.10}
  7. scheduler.scheduleRenewal() (Phase 8): 1.00 FUSDC agent→merchant at now+120s
     → SCHEDULE_CREATED; poll mirror GET /api/v1/schedules/{id} → SCHEDULE_EXECUTED
```

**Policy enforcement (hard-coded treasury policy, shown in UI):** maxPerCallFusdc=2,
maxSessionFusdc=25, maxHbarPerSwap=50 — executor REFUSES and emits ERROR if a quote exceeds policy.

### 14.5 State API (port 3002, CORS enabled)

- `GET /state` → full `AgentState` (§7). The dashboard's single source of truth.
- `GET /events?limit=50` → agent-side event log (instant; mirror is the proof-of-truth, this is UX).
- `POST /demo/start` → kicks `runDemoGoal()` (dashboard "Run Demo" button; also auto-start on
  boot if `AUTO_START=true`).
- State is event-sourced in memory + snapshot to `config/state.json` on every change.

---

## §15 — COMPONENT SPEC: apps/web (DASHBOARD)

Next.js App Router + Tailwind. Single page. Dark fintech: bg `#0B1220`, cards `#111A2E`,
accent `#22D3A7` (healthy) / `#F04438` (critical) / `#F5A623` (warn), mono numerals
(`tabular-nums`), generous spacing, subtle borders (`border-white/8`).

**Layout:**
- Header: "FATERA — Autonomous Working Capital OS" · network badge · agent account
  (HashScan link) · HCS topic (HashScan link) · "Run Demo" button.
- KPI row: HBAR balance · FUSDC balance · **PCR gauge** (number + colored ring; red <80,
  amber 80–110, green ≥110) · Next obligation card (amount, calls remaining, due-in).
- **Route Decision table** (signature component): rows = FATERA_ROUTER / SAUCERSWAP_V2 /
  (DIRECT_HBAR) with cost in HBAR, fee, availability; selected row highlighted with reason.
- Payments table: #, symbol, amount, fee, tx (HashScan link), status chip.
- **Live Audit Trail**: vertical feed of HCS events (type icon, ts, payload summary); poll
  `GET /api/state` (Next proxy → agent `/state` + `/events`) every 2s.
- Footer: links (repo, video, HashScan topic/token).

Poll via the Next API route only (no CORS pain, no direct mirror hammering from the browser).

---

## §16 — PHASE-BY-PHASE EXECUTION PLAN

> After each phase: run checkpoint, update MEMORY.md, git commit. Never skip a checkpoint.

**Phase 0 — Scaffold (30 min)**
Tasks: pnpm workspace + turbo + tsconfig.base (strict) + eslint flat config + .gitignore +
.env.example + empty packages/types with §7 + packages/config loadConfig() (zod).
✅ CHECKPOINT: `pnpm install && pnpm -r build` exits 0.

**Phase 1 — Hedera foundation (90 min)**
Tasks: packages/hedera + packages/mirror (§8, incl. `toMirrorTxId`) + scripts/setup.ts (§9,
accounts/token/topic/.env-writer + custom-fee empirical verification) + scripts/verify-foundation.ts.
✅ CHECKPOINT: `pnpm setup` then `pnpm verify:foundation` → prints balances for 4 accounts
(agent=100 HBAR/0 FUSDC), FUSDC token id, and reads back the CHECKPOINT HCS message from the
mirror node. All HashScan links printed.

**Phase 2 — HCS + packages/hcs (45 min)**
Tasks: HcsLogger + scripts/fetch-topic.ts.
✅ CHECKPOINT: `pnpm topic:tail` prints the Phase-1 CHECKPOINT event as decoded JSON.

**Phase 3 — x402 API service (2 h)**
Tasks: apps/api-service full spec §11 with NATIVE mode (Path B) + replay store + refund route;
`X402_MODE` config. Attempt Path A only AFTER Path B works (§10.2, timeboxed).
✅ CHECKPOINT: `curl -i "localhost:3001/market-data?symbol=HBAR&fields=price,volume,sentiment,volatility,trend"`
→ 402 + paymentRequirements JSON exactly per §10.3. Then `scripts/e2e-single-paid-call.ts`
(uses operator-funded payer): performs the full 402→pay→retry→200 loop, asserts 200 + usage
report, asserts the tx on the mirror node, asserts PAYMENT_SETTLED in HCS. Exit 0.

**Phase 4 — FateraRouter (60 min)**
Tasks: apps/router per §12 (quote, settle, verify HBAR leg, pay FUSDC leg, HCS events).
✅ CHECKPOINT: script swaps 2 FUSDC for ~4.012 HBAR LP-side; both legs verified on mirror;
SWAP_SETTLED event exists.

**Phase 5 — Directory + agent core (90 min)**
Tasks: apps/directory (§13); agent: treasury, obligations, forecast, route evaluation,
discovery, state API, `pnpm demo:dry` (plans without executing).
✅ CHECKPOINT: `pnpm demo:dry` prints: balances, obligation (required 10.30 FUSDC), forecast
(PCR 0%, shortfall 10.30), route table with FATERA_ROUTER selected (~22.07 HBAR) and
SAUCERSWAP_V2 unavailable, policy check pass. `curl localhost:3002/state` returns valid JSON.

**Phase 6 — End-to-end agent execution (90 min)**
Tasks: executor (swap via router, 10 × x402Fetch), refund path, event flow, persistence.
✅ CHECKPOINT: `pnpm demo` (headless full run): all 10 payments settle; agent ends ≈78 HBAR
and ≈0.90 FUSDC (modulo custom-fee behavior noted in Phase 1); `pnpm topic:tail` shows the
full event sequence: AGENT… → SHORTFALL_DETECTED → ROUTE_EVALUATED → ROUTE_SELECTED →
SWAP_INITIATED → SWAP_SETTLED → 10×(PAYMENT_INITIATED→PAYMENT_SETTLED→METERED_USAGE) →
OBLIGATION_FULFILLED.

**Phase 7 — Dashboard (2 h)**
Tasks: apps/web per §15.
✅ CHECKPOINT: `pnpm dev` → dashboard live: PCR 0% red at boot → run demo → gauge flips green
after swap → payments table fills → audit feed streams events; every tx/topic is a clickable
HashScan link. No console errors.

**Phase 8 — Bonus layer (90 min)**
Tasks: scheduler (§8.1 scheduleFusdcTransfer, waitForExpiry=true, 120s) + mirror schedule
poll; identity.register() → AGENT_REGISTERED on identity topic (profile: id, account,
capabilities, policy) — describe in README as "HCS-anchored agent identity (HCS-14-inspired)";
optional MULTI_ASSET direct-HBAR route.
✅ CHECKPOINT: `pnpm demo` now also shows SCHEDULE_CREATED and, ~2 min later, SCHEDULE_EXECUTED
verified via `GET /api/v1/schedules/{id}`. Identity event on HashScan.

**Phase 9 — README, QA, submission (60 min)**
Tasks: generate README.md from README.template.md (fill ALL TODOs with the real IDs/links);
run QA checklist §19; record demo video per DEMO_SCRIPT.md; verify repo is public, .env
NOT committed (`git ls-files | grep .env` must show only .env.example).
✅ CHECKPOINT: every §19 line passes; README renders correctly on GitHub; video ≤ 5:00.

---

## §17 — FALLBACK & ERROR-HANDLING DECISION TREES

```
official x402/Blocky402 install/integration fails (45 min)
  └→ X402_MODE=NATIVE (§10.3). README: "native x402 on Hedera; official facilitator attempted,
      blocked by <reason>; swap-in interface provided (PaymentExecutor)".
custom fee at token creation fails
  └→ TokenFeeScheduleUpdateTransaction fallback → else CUSTOM_FEE_BASE_UNITS=0; README notes it.
SaucerSwap quote fails (EXPECTED on testnet — no FUSDC pool)
  └→ route row shown as unavailable with reason. Not a blocker, ever.
mirror node slow/5xx
  └→ retry ×5 (700ms backoff ×2). If still failing, abort phase checkpoint and retry whole
     command once; log to MEMORY.md. Never busy-poll faster than 700ms.
scheduled tx doesn't execute at expiry
  └→ check waitForExpiry(true) actually set; check schedule status via mirror; if flaky,
     drop Phase 8 scheduling (it's bonus) and note in README roadmap.
dashboard shows stale state
  └→ ensure agent state snapshot after EVERY event; verify /state ts updates.
agent pays but 200 fails twice
  └→ POST /refund; if refund fails: emit ERROR with txId (do not loop).
ANY unknown failure
  └→ simplest working alternative + MEMORY.md entry + continue.
```

**Cut plan (if time-boxed):** drop in order — (1) MULTI_ASSET direct-HBAR route, (2) refund
endpoint, (3) scheduler, (4) identity, (5) Path A attempt. NEVER cut: Phases 1–7 (qualification).

---

## §18 — TESTING

- **Unit (vitest):** pricing (base+per-field math), forecast (PCR/shortfall/buffer math with
  exact expected numbers), route selection (min-cost among available), toMirrorTxId format
  ("0.0.5@1.2" → "0.0.5-1-2"), HCS size trim.
- **Integration scripts** (the real QA): `e2e-single-paid-call.ts`, `demo.ts`, `demo-reset.ts`
  + re-run `demo.ts` to prove repeatability.
- Mirror-node responses: NEVER mocked in integration scripts (real testnet truth).

---

## §19 — PRE-SUBMISSION QA CHECKLIST

- [ ] `curl -i` on /market-data returns 402 with exact paymentRequirements JSON
- [ ] `pnpm demo` completes: 10 SETTLED payments, 0 failures, OBLIGATION_FULFILLED
- [ ] HCS topic on HashScan shows the full ordered event sequence
- [ ] FUSDC token page on HashScan shows custom fee + fee transfers to collector
- [ ] Dashboard PCR transitions red→green during demo; route table visible
- [ ] Scheduled renewal executed on-chain (if Phase 8 shipped)
- [ ] `.env` not in git; `.env.example` complete; README quickstart works from a clean clone
      (minus operator key setup)
- [ ] Demo video ≤ 5:00, shows a paid request executing + HashScan proof
- [ ] Repo public; README has: problem, architecture diagram, setup, payment-flow section,
      rubric-mapping table, links (video, HashScan topic/token)

---

## §20 — README GENERATION REQUIREMENTS

Generate from README.template.md. Must contain, in order: name+tagline, demo GIF/video link,
problem/solution (use CONTEXT.md §1–3), architecture ASCII diagram, **"The x402 payment flow"
numbered walkthrough (§10.1) with a real example tx + HashScan link**, quickstart (prereqs →
portal account → `pnpm install && pnpm setup && pnpm dev` → `pnpm demo`), rubric mapping table
(§2 with ✓ marks), repo structure, roadmap (SaucerSwap mainnet pools, Bonzo borrowing route,
MCP integration, A2A negotiation, ERC-8004 identity, streaming micropayments), license MIT.
Fill every TODO with REAL ids/links from `config/state.json`.

---

## §21 — DEMO VIDEO (summary)

Full script in DEMO_SCRIPT.md. 5 beats: (1) problem 20s, (2) architecture 30s, (3) live demo
2:40 — run goal → red PCR → shortfall → route table → swap → green → 10 metered payments →
audit trail + HashScan, (4) repo/code 40s, (5) rubric + closing line 20s.

---

## §22 — SUBMISSION CHECKLIST

- [ ] Public GitHub repo URL
- [ ] 5-min video (YouTube unlisted is fine) linked in README + submission form
- [ ] Submit on the ETHOnline/ETHGlobal project page BEFORE the deadline; select the Hedera
      track ("AI & Agentic Payments"); paste the requested links
- [ ] Optional: post the demo in the Hedera Discord hackathon channel for visibility

---

## §23 — RULES OF ENGAGEMENT (READ LAST, OBEY FIRST)

1. Build phases in order. Checkpoints are gates, not suggestions.
2. No questions to the human. Assumptions → MEMORY.md "Decisions".
3. After every phase: checkpoint output + MEMORY.md update + git commit.
4. Never commit secrets. Never log keys. `.env` stays gitignored.
5. Deterministic everything (no unseeded randomness; mock data from seeded hash).
6. If you are unsure about an exact SDK method name (SDKs evolve), write the best-known
   call, wrap risky SDK usage in small adapters, and verify at the phase checkpoint — the
   checkpoint exists precisely to catch drift early.
7. When this prompt and reality conflict: reality wins, MEMORY.md records the delta, the
   build continues.

---

## §24 — APPENDIX A: HEDERA SDK CHEAT SHEET (@hashgraph/sdk v2)

```
Client.forTestnet().setOperator(accountIdStr, privateKeyStr)
new AccountBalanceQuery().setAccountId(id).execute(client)
  → .hbars.toTinybars() ; .tokens.get(TokenId.fromString(x))
TransferTransaction().addTokenTransfer(tid, acct, ±baseUnits).addHbarTransfer(acct, Hbar.fromString("1.5"))
  → freezeWith(client) → tx.transactionId.toString() (capture BEFORE execute!) → execute → getReceipt
TopicCreateTransaction().setTopicMemo(m).execute → getReceipt → receipt.topicId
TopicMessageSubmitTransaction().setTopicId(t).setMessage(str)  // ≤1024 bytes, aim ≤1000
TokenCreateTransaction / TokenAssociateTransaction (sign with account key via freezeWith+sign)
AccountCreateTransaction().setKey(pub).setInitialBalance(Hbar.fromString("5"))
ScheduleCreateTransaction().setScheduledTransaction(tx).setWaitForExpiry(true).setExpirationTime(date)
Status.Success is the receipt success sentinel.
```

## §25 — APPENDIX B: MIRROR NODE REST CHEAT SHEET (testnet)

```
GET /api/v1/transactions/{acct-secs-nanos}        → { transactions: [ { result, consensus_timestamp,
                                                      transfers, token_transfers, ... } ] }
GET /api/v1/accounts/{id}                         → { balance: { balance: tinybars } }
GET /api/v1/accounts/{id}/tokens?token.id={tid}   → { tokens: [ { token_id, balance } ] }
GET /api/v1/topics/{id}/messages?order=desc&limit=25 → [ { message(base64), consensus_timestamp,
                                                      sequence_number } ]
GET /api/v1/schedules/{id}                        → { executed_at, ... }
HashScan links: https://hashscan.io/testnet/transaction/{mirrorTxId} · /topic/{id} ·
/token/{id} · /account/{id}
Poll interval ≥ 700ms. Eventual consistency: 404 now ≠ failed.
```

## §26 — APPENDIX C: KNOWN PITFALLS (avoid these — they cost teams hours)

1. **Tx-ID format**: SDK `@` vs mirror `-`. Use §8.2 `toMirrorTxId` everywhere, once.
2. **Capture txId before execute** — otherwise you cannot build the X-PAYMENT proof.
3. **HCS 1024-byte limit** — trim event payloads; never send a big blob.
4. **Custom-fee behavior varies** (exclusive vs inclusive assessment) — hence the empirical
   Phase 1 test; adjust `CUSTOM_FEE_BASE_UNITS`/router budget to observed reality.
5. **Token association** — every receiving account must associate FUSDC first, or transfers fail.
6. **Mirror eventual consistency** — always poll-with-backoff; never one-shot fetch.
7. **Scheduled transactions execute immediately unless `waitForExpiry(true)`** — set it.
8. **Clock skew** — validate payment freshness using mirror `consensus_timestamp`, not local time.
9. **Replay** — without the used-tx store, one payment unlocks infinite requests. Test it
   (pay once, replay the header, expect 402 again).
10. **Testnet faucet limits** — one portal account is enough; `setup` creates children.
11. **Windows shells** — scripts must run under both bash and PowerShell (avoid `&&` chains
    inside npm scripts; use separate script entries).

## §27 — APPENDIX D: GLOSSARY (for README and demo narration)

x402 · HTTP 402 Payment Required · payment rail · HTS (Hedera Token Service) · HCS (Hedera
Consensus Service) · facilitator (Blocky402) · mirror node · HashScan · HBAR/tinybar ·
custom fee schedule · scheduled transaction (waitForExpiry) · PCR · liquidity route ·
metered pay-per-call · agent discovery directory · replay protection · agent treasury.

--- END OF MASTER_PROMPT.md — BEGIN PHASE 0 NOW. ---

import { z } from "zod";

// ---------- money ----------
export type Asset = "HBAR" | "FUSDC";
export const AssetSchema = z.enum(["HBAR", "FUSDC"]);

export interface Balance {
  hbarTinybars: string;
  fusdcBaseUnits: string;
}
export const BalanceSchema = z.object({
  hbarTinybars: z.string(),
  fusdcBaseUnits: z.string(),
});

// ---------- pricing / metering ----------
export const FIELDS = ["price", "volume", "sentiment", "volatility", "trend"] as const;
export type Field = (typeof FIELDS)[number];
export const FieldSchema = z.enum(FIELDS);

export interface UsageReport {
  sessionId: string;
  symbol: string;
  fields: Field[];
  baseFeeFusdc: number;
  perFieldFusdc: number;
  fieldsCount: number;
  totalFusdc: number;
  timestamp: string;
}
export const UsageReportSchema = z.object({
  sessionId: z.string(),
  symbol: z.string(),
  fields: z.array(FieldSchema),
  baseFeeFusdc: z.number(),
  perFieldFusdc: z.number(),
  fieldsCount: z.number(),
  totalFusdc: z.number(),
  timestamp: z.string(),
});

// ---------- obligations ----------
export type ObligationStatus = "PENDING" | "SHORTFALL" | "FUNDED" | "IN_PROGRESS" | "FULFILLED";
export const ObligationStatusSchema = z.enum(["PENDING", "SHORTFALL", "FUNDED", "IN_PROGRESS", "FULFILLED"]);

export interface Obligation {
  id: string;
  description: string;
  asset: "FUSDC";
  callsTotal: number;
  callsRemaining: number;
  costPerCallFusdc: number;
  amountFusdc: number;        // callsTotal * costPerCallFusdc
  feeEstimateFusdc: number;   // callsTotal * 0.01 custom fee
  bufferFusdc: number;        // 0.20 default
  requiredFusdc: number;      // amount + feeEstimate + buffer
  dueAt: string;              // ISO
  status: ObligationStatus;
}
export const ObligationSchema = z.object({
  id: z.string(),
  description: z.string(),
  asset: z.literal("FUSDC"),
  callsTotal: z.number(),
  callsRemaining: z.number(),
  costPerCallFusdc: z.number(),
  amountFusdc: z.number(),
  feeEstimateFusdc: z.number(),
  bufferFusdc: z.number(),
  requiredFusdc: z.number(),
  dueAt: z.string(),
  status: ObligationStatusSchema,
});

// ---------- forecast ----------
export type ForecastState = "HEALTHY" | "WARN" | "CRITICAL";
export const ForecastStateSchema = z.enum(["HEALTHY", "WARN", "CRITICAL"]);

export interface Forecast {
  pcrPct: number;                     // fusdc / (calls * costPerCall) * 100
  availableFusdc: number;
  requiredFusdc: number;
  shortfallFusdc: number;
  hbarNeededEstimate: number;         // shortfall-ish * rate, pre-quote
  state: ForecastState;               // ≥110 / 80-110 / <80
  ts: string;
}
export const ForecastSchema = z.object({
  pcrPct: z.number(),
  availableFusdc: z.number(),
  requiredFusdc: z.number(),
  shortfallFusdc: z.number(),
  hbarNeededEstimate: z.number(),
  state: ForecastStateSchema,
  ts: z.string(),
});

// ---------- routing ----------
export type RouteId = "VIGIL_ROUTER" | "FATERA_ROUTER" | "SAUCERSWAP_V2" | "DIRECT_HBAR_PREMIUM";
export const RouteIdSchema = z.enum(["VIGIL_ROUTER", "FATERA_ROUTER", "SAUCERSWAP_V2", "DIRECT_HBAR_PREMIUM"]);

export interface RouteQuote {
  id: RouteId;
  available: boolean;
  costHbar: number;
  feeBps: number;
  latencyNote: string;
  riskPenaltyHbar: number;
  detail: string;
}
export const RouteQuoteSchema = z.object({
  id: RouteIdSchema,
  available: z.boolean(),
  costHbar: z.number(),
  feeBps: z.number(),
  latencyNote: z.string(),
  riskPenaltyHbar: z.number(),
  detail: z.string(),
});

export interface RouteEvaluation {
  ts: string;
  quotes: RouteQuote[];
  selected: RouteId | null;
  reason: string;
}
export const RouteEvaluationSchema = z.object({
  ts: z.string(),
  quotes: z.array(RouteQuoteSchema),
  selected: RouteIdSchema.nullable(),
  reason: z.string(),
});

// ---------- payments ----------
export type PaymentStatus = "INITIATED" | "SETTLED" | "FAILED" | "REFUNDED";
export const PaymentStatusSchema = z.enum(["INITIATED", "SETTLED", "FAILED", "REFUNDED"]);

export interface PaymentRecord {
  callIndex: number;
  symbol: string;
  amountFusdc: number;
  feeFusdc: number;
  txId: string;
  mirrorTxId: string;
  status: PaymentStatus;
  settledAt?: string;
}
export const PaymentRecordSchema = z.object({
  callIndex: z.number(),
  symbol: z.string(),
  amountFusdc: z.number(),
  feeFusdc: z.number(),
  txId: z.string(),
  mirrorTxId: z.string(),
  status: PaymentStatusSchema,
  settledAt: z.string().optional(),
});

// ---------- HCS events (message ≤ 1000 bytes!) ----------
export type HcsEventType =
  | "AGENT_REGISTERED"
  | "SERVICE_REGISTERED"
  | "SHORTFALL_DETECTED"
  | "FORECAST_UPDATED"
  | "ROUTE_EVALUATED"
  | "ROUTE_SELECTED"
  | "SWAP_INITIATED"
  | "SWAP_SETTLED"
  | "PAYMENT_INITIATED"
  | "PAYMENT_SETTLED"
  | "PAYMENT_FAILED"
  | "METERED_USAGE"
  | "REFUND_ISSUED"
  | "CHECKPOINT"
  | "OBLIGATION_FULFILLED"
  | "SCHEDULE_CREATED"
  | "SCHEDULE_EXECUTED"
  | "DEMO_RESET"
  | "ERROR";

export const HcsEventTypeSchema = z.enum([
  "AGENT_REGISTERED",
  "SERVICE_REGISTERED",
  "SHORTFALL_DETECTED",
  "FORECAST_UPDATED",
  "ROUTE_EVALUATED",
  "ROUTE_SELECTED",
  "SWAP_INITIATED",
  "SWAP_SETTLED",
  "PAYMENT_INITIATED",
  "PAYMENT_SETTLED",
  "PAYMENT_FAILED",
  "METERED_USAGE",
  "REFUND_ISSUED",
  "CHECKPOINT",
  "OBLIGATION_FULFILLED",
  "SCHEDULE_CREATED",
  "SCHEDULE_EXECUTED",
  "DEMO_RESET",
  "ERROR",
]);

export interface HcsEvent {
  v: 1;
  seq: number;
  ts: string;
  type: HcsEventType;
  agent: string;
  data: Record<string, unknown>;
}
export const HcsEventSchema = z.object({
  v: z.literal(1),
  seq: z.number(),
  ts: z.string(),
  type: HcsEventTypeSchema,
  agent: z.string(),
  data: z.record(z.unknown()),
});

// ---------- agent state (GET /state) ----------
export type AgentPhase =
  | "IDLE"
  | "PLANNING"
  | "SHORTFALL"
  | "ROUTING"
  | "SWAPPING"
  | "EXECUTING"
  | "FULFILLED"
  | "SCHEDULING"
  | "ERROR";

export const AgentPhaseSchema = z.enum([
  "IDLE",
  "PLANNING",
  "SHORTFALL",
  "ROUTING",
  "SWAPPING",
  "EXECUTING",
  "FULFILLED",
  "SCHEDULING",
  "ERROR",
]);

export interface AgentState {
  phase: AgentPhase;
  balances: Balance;
  obligations: Obligation[];
  latestForecast: Forecast | null;
  latestRouteEvaluation: RouteEvaluation | null;
  payments: PaymentRecord[];
  swap: {
    status: "NONE" | "PENDING" | "DONE";
    hbarSpent?: number;
    fusdcReceived?: number;
    hbarTxId?: string;
    fusdcTxId?: string;
  };
  schedule: {
    scheduleId: string;
    executeAt: string;
    status: "PENDING" | "EXECUTED";
  } | null;
  config: {
    network: string;
    topicId: string;
    tokenId: string;
    agentAccount: string;
    merchantAccount: string;
    hashscanBase: string;
  };
  eventsSeen: number;
  ts: string;
}

// ---------- directory ----------
export interface ServiceDescriptor {
  id: string;
  name: string;
  baseUrl: string;
  kind: "DATA" | "SWAP" | "OTHER";
  pricing: {
    asset: Asset;
    baseFusdc?: number;
    perFieldFusdc?: number;
    feeBps?: number;
  };
  metered: boolean;
  ownerAccount: string;
  registeredAt: string;
}
export const ServiceDescriptorSchema = z.object({
  id: z.string(),
  name: z.string(),
  baseUrl: z.string().url(),
  kind: z.enum(["DATA", "SWAP", "OTHER"]),
  pricing: z.object({
    asset: AssetSchema,
    baseFusdc: z.number().optional(),
    perFieldFusdc: z.number().optional(),
    feeBps: z.number().optional(),
  }),
  metered: z.boolean(),
  ownerAccount: z.string(),
  registeredAt: z.string(),
});

// ---------- x402 payment requirements & proof ----------
export interface X402PaymentRequirement {
  scheme: "hedera-native" | "hedera-hbar";
  network: string;
  asset: Asset;
  tokenId: string;
  amountBaseUnits: string;
  payeeAccountId: string;
  resource: string;
  maxAgeSeconds: number;
  sessionId: string;
  description: string;
}
export const X402PaymentRequirementSchema = z.object({
  scheme: z.enum(["hedera-native", "hedera-hbar"]),
  network: z.string(),
  asset: AssetSchema,
  tokenId: z.string(),
  amountBaseUnits: z.string(),
  payeeAccountId: z.string(),
  resource: z.string(),
  maxAgeSeconds: z.number(),
  sessionId: z.string(),
  description: z.string(),
});

export interface X402PaymentProof {
  scheme: "hedera-native" | "hedera-hbar";
  network: string;
  transactionId: string;
  payerAccountId: string;
  tokenId?: string;
  amountBaseUnits?: string;
  amountTinybars?: string;
}
export const X402PaymentProofSchema = z.object({
  scheme: z.enum(["hedera-native", "hedera-hbar"]),
  network: z.string(),
  transactionId: z.string(),
  payerAccountId: z.string(),
  tokenId: z.string().optional(),
  amountBaseUnits: z.string().optional(),
  amountTinybars: z.string().optional(),
});

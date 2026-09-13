import type { Obligation } from "@fatera/types";

export function buildObligation(
  callsTotal = 10,
  costPerCallFusdc = 1.0,
  dueInMinutes = 30,
  customFeeFusdc = 0.01
): Obligation {
  const dueAt = new Date(Date.now() + dueInMinutes * 60 * 1000).toISOString();
  const amountFusdc = Math.round(callsTotal * costPerCallFusdc * 100) / 100;
  const feeEstimateFusdc = Math.round(callsTotal * customFeeFusdc * 100) / 100;
  const bufferFusdc = 0.20;
  const requiredFusdc = Math.round((amountFusdc + feeEstimateFusdc + bufferFusdc) * 100) / 100;

  return {
    id: `ob-${Date.now().toString(36)}`,
    description: `${callsTotal} metered market data queries (base 0.50 + 0.10/field × 5 fields = 1.00 FUSDC/call)`,
    asset: "FUSDC",
    callsTotal,
    callsRemaining: callsTotal,
    costPerCallFusdc,
    amountFusdc,
    feeEstimateFusdc,
    bufferFusdc,
    requiredFusdc,
    dueAt,
    status: "SHORTFALL",
  };
}

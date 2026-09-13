import type { Forecast, ForecastState, Obligation } from "@fatera/types";

export function calculateForecast(
  availableFusdc: number,
  obligation: Obligation,
  hbarPerFusdc = 2,
  customFeeFusdc = 0.01
): Forecast {
  const callsRemaining = obligation.callsRemaining;
  const costPerCallFusdc = obligation.costPerCallFusdc;
  const commitmentFusdc = callsRemaining * costPerCallFusdc;

  let pcrPct = 0;
  if (commitmentFusdc > 0) {
    pcrPct = Math.round((availableFusdc / commitmentFusdc) * 10000) / 100;
  } else {
    pcrPct = 100;
  }

  const feeEstimateFusdc = callsRemaining * customFeeFusdc;
  const bufferFusdc = 0.20;
  const requiredFusdc = Math.round((commitmentFusdc + feeEstimateFusdc + bufferFusdc) * 100) / 100;
  const shortfallFusdc = Math.max(0, Math.round((requiredFusdc - availableFusdc) * 100) / 100);

  let state: ForecastState = "CRITICAL";
  if (pcrPct >= 110) {
    state = "HEALTHY";
  } else if (pcrPct >= 80) {
    state = "WARN";
  } else {
    state = "CRITICAL";
  }

  const hbarNeededEstimate = Math.ceil(shortfallFusdc * hbarPerFusdc * 1.01);

  return {
    pcrPct,
    availableFusdc,
    requiredFusdc,
    shortfallFusdc,
    hbarNeededEstimate,
    state,
    ts: new Date().toISOString(),
  };
}

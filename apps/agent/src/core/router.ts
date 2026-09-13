import type { RouteEvaluation, RouteQuote, RouteId } from "@fatera/types";

export interface EvaluateRoutesOptions {
  shortfallFusdc: number;
  routerUrl: string;
  multiAssetEnabled?: boolean;
}

export async function evaluateRoutes(options: EvaluateRoutesOptions): Promise<RouteEvaluation> {
  const { shortfallFusdc, routerUrl, multiAssetEnabled = false } = options;
  const quotes: RouteQuote[] = [];

  // Shortfall rounded up to whole units for LP swap acquisition
  const swapAmountFusdc = Math.max(1, Math.ceil(shortfallFusdc));

  // 1. VIGIL_ROUTER
  try {
    const res = await fetch(`${routerUrl}/quote?amountFusdc=${swapAmountFusdc}`);
    if (res.ok) {
      const data = (await res.json()) as any;
      const costHbar = parseFloat(data.amountHbar);
      quotes.push({
        id: "VIGIL_ROUTER",
        available: true,
        costHbar,
        feeBps: data.feeBps ?? 30,
        latencyNote: "1 sub-block (native mirror settle)",
        riskPenaltyHbar: 0,
        detail: `Autonomous LP swap: rate ${data.rate} HBAR/FUSDC + ${data.feeBps} bps fee`,
      });
    } else {
      quotes.push({
        id: "VIGIL_ROUTER",
        available: false,
        costHbar: 0,
        feeBps: 30,
        latencyNote: "N/A",
        riskPenaltyHbar: 0,
        detail: `Router returned HTTP ${res.status}`,
      });
    }
  } catch (err: any) {
    quotes.push({
      id: "VIGIL_ROUTER",
      available: false,
      costHbar: 0,
      feeBps: 30,
      latencyNote: "N/A",
      riskPenaltyHbar: 0,
      detail: `Failed to connect to VigilRouter: ${err.message}`,
    });
  }

  // 2. SAUCERSWAP_V2 (DEX route on testnet - expected unavailable per §14.3 / §17)
  quotes.push({
    id: "SAUCERSWAP_V2",
    available: false,
    costHbar: 0,
    feeBps: 25,
    latencyNote: "EVM contract execution (~3-5s)",
    riskPenaltyHbar: 0.5,
    detail: "No FUSDC pool deployed on Hedera Testnet (graceful fallback per §17)",
  });

  // 3. DIRECT_HBAR_PREMIUM (Optional multi-asset merchant premium route)
  if (multiAssetEnabled) {
    const directCost = swapAmountFusdc * 2 * 1.05;
    quotes.push({
      id: "DIRECT_HBAR_PREMIUM",
      available: true,
      costHbar: directCost,
      feeBps: 500,
      latencyNote: "Direct settlement",
      riskPenaltyHbar: 1.0,
      detail: "+5% merchant direct-HBAR payment premium",
    });
  }

  // Selection: Minimum effective cost (costHbar + riskPenaltyHbar) among available
  const availableQuotes = quotes.filter((q) => q.available);
  let selected: RouteId | null = null;
  let reason = "No liquidity route available to fulfill shortfall.";

  if (availableQuotes.length > 0) {
    availableQuotes.sort((a, b) => a.costHbar + a.riskPenaltyHbar - (b.costHbar + b.riskPenaltyHbar));
    selected = availableQuotes[0].id;
    const best = availableQuotes[0];
    reason = `Selected ${best.id}: lowest total cost (${best.costHbar.toFixed(3)} HBAR) with zero execution risk penalty.`;
  }

  return {
    ts: new Date().toISOString(),
    quotes,
    selected,
    reason,
  };
}

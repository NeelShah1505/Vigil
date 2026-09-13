import { Router } from "express";
import type { AppConfig } from "@vigil/config";

export function createQuoteRouter(config: AppConfig): Router {
  const router = Router();

  router.get("/", (req, res) => {
    const amountFusdcStr = (req.query.amountFusdc as string) || "1";
    const amountFusdc = Math.max(0.01, parseFloat(amountFusdcStr));

    const rate = config.HBAR_PER_FUSDC;
    const feeBps = config.ROUTER_FEE_BPS;
    const multiplier = 1 + feeBps / 10000;

    // Exact amount in HBAR: amountFusdc * rate * (1 + feeBps/10000), rounded up to 8 dp
    const exactHbar = amountFusdc * rate * multiplier;
    const amountHbar = (Math.ceil(exactHbar * 100_000_000) / 100_000_000).toFixed(8);

    return res.json({
      rate,
      feeBps,
      amountFusdc,
      amountHbar,
      amountTinybars: Math.round(parseFloat(amountHbar) * 100_000_000).toString(),
      expiresInSeconds: 60,
      payeeAccountId: config.routerLpAccount,
      ts: new Date().toISOString(),
    });
  });

  return router;
}

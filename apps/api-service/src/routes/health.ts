import { Router } from "express";
import type { AppConfig } from "@fatera/config";
import type { ReplayStore } from "../verify/replayStore.js";

export function createHealthRouter(config: AppConfig, replayStore: ReplayStore): Router {
  const router = Router();

  router.get("/", (_req, res) => {
    return res.json({
      ok: true,
      service: "fatera-api-service",
      network: config.network,
      topicId: config.topicId,
      tokenId: config.fusdcTokenId,
      merchantAccount: config.merchantAccount,
      paymentsServed: replayStore.size(),
      x402Mode: config.X402_MODE,
      ts: new Date().toISOString(),
    });
  });

  return router;
}

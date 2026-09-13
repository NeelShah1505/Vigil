import { Router } from "express";
import type { AppConfig } from "@vigil/config";
import type { RouterReplayStore } from "../verify/routerReplayStore.js";

export function createHealthRouter(config: AppConfig, replayStore: RouterReplayStore): Router {
  const router = Router();

  router.get("/", (_req, res) => {
    return res.json({
      ok: true,
      service: "vigil-router",
      network: config.network,
      routerLpAccount: config.routerLpAccount,
      rate: config.HBAR_PER_FUSDC,
      feeBps: config.ROUTER_FEE_BPS,
      swapsSettled: replayStore.size(),
      ts: new Date().toISOString(),
    });
  });

  return router;
}

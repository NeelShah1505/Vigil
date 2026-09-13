import { Router } from "express";
import type { AppConfig } from "@vigil/config";
import type { ServiceDescriptor } from "@vigil/types";

export function createWellKnownRouter(config: AppConfig): Router {
  const router = Router();

  router.get("/x402", (_req, res) => {
    const descriptor: ServiceDescriptor = {
      id: "vigil-market-intelligence",
      name: "Vigil Market Intelligence API",
      baseUrl: `http://localhost:${config.PORT_API}`,
      kind: "DATA",
      pricing: {
        asset: "FUSDC",
        baseFusdc: config.BASE_FEE_FUSDC,
        perFieldFusdc: config.PER_FIELD_FUSDC,
      },
      metered: true,
      ownerAccount: config.merchantAccount,
      registeredAt: new Date().toISOString(),
    };

    return res.json({
      service: descriptor,
      requirementsTemplate: {
        scheme: "hedera-native",
        network: config.network,
        asset: "FUSDC",
        tokenId: config.fusdcTokenId,
        payeeAccountId: config.merchantAccount,
        resource: "/market-data",
        maxAgeSeconds: 300,
      },
    });
  });

  return router;
}

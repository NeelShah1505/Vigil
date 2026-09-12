import { Router } from "express";
import type { AppConfig } from "@fatera/config";
import type { ServiceDescriptor } from "@fatera/types";

export function createWellKnownRouter(config: AppConfig): Router {
  const router = Router();

  router.get("/x402", (_req, res) => {
    const descriptor: ServiceDescriptor = {
      id: "fatera-market-intelligence",
      name: "Fatera Market Intelligence API",
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

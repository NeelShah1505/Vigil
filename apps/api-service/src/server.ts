import express, { type Express } from "express";
import cors from "cors";
import { loadConfig, type AppConfig } from "@vigil/config";
import { MirrorClient } from "@vigil/mirror";
import { HederaService } from "@vigil/hedera";
import { HcsLogger } from "@vigil/hcs";
import { ReplayStore } from "./verify/replayStore.js";
import { createMarketDataRouter } from "./routes/marketData.js";
import { createPriceRouter } from "./routes/price.js";
import { createWellKnownRouter } from "./routes/wellKnown.js";
import { createRefundRouter } from "./routes/refund.js";
import { createHealthRouter } from "./routes/health.js";
import { registerService } from "./register.js";

export function createApp(): { app: Express; config: AppConfig; hcs: HcsLogger } {
  const config = loadConfig();
  const app: Express = express();

  app.use(cors());
  app.use(express.json());

  const mirror = new MirrorClient(config.mirrorNodeUrl);
  const hedera = HederaService.fromEnv(config.operatorId, config.operatorKey, config.network);
  const hcs = new HcsLogger(hedera, config.topicId, "vigil-api-service");
  const replayStore = new ReplayStore();

  app.use("/market-data", createMarketDataRouter(config, mirror, replayStore, hcs));
  app.use("/price", createPriceRouter(config));
  app.use("/.well-known", createWellKnownRouter(config));
  app.use("/refund", createRefundRouter(config, mirror, hedera, replayStore, hcs));
  app.use("/health", createHealthRouter(config, replayStore));

  return { app, config, hcs };
}

async function start() {
  const { app, config, hcs } = createApp();
  const port = config.PORT_API;

  const server = app.listen(port, async () => {
    console.log(`\n==================================================`);
    console.log(`  VIGIL API SERVICE (Merchant) running on port ${port}`);
    console.log(`  x402 Market Data: http://localhost:${port}/market-data`);
    console.log(`  Price Quote:      http://localhost:${port}/price`);
    console.log(`  Discovery:        http://localhost:${port}/.well-known/x402`);
    console.log(`  Health Check:     http://localhost:${port}/health`);
    console.log(`==================================================\n`);

    // Asynchronously register with directory and HCS
    await registerService(config, hcs);
  });

  return server;
}

// Only auto-start if invoked directly
if (process.argv[1]?.endsWith("server.ts") || process.argv[1]?.endsWith("server.js")) {
  start().catch((err) => {
    console.error("Failed to start api-service:", err);
    process.exit(1);
  });
}

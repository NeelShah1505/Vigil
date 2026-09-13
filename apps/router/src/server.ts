import express, { type Express } from "express";
import cors from "cors";
import { loadConfig, type AppConfig } from "@fatera/config";
import { MirrorClient } from "@fatera/mirror";
import { HederaService } from "@fatera/hedera";
import { HcsLogger } from "@fatera/hcs";
import { RouterReplayStore } from "./verify/routerReplayStore.js";
import { createQuoteRouter } from "./routes/quote.js";
import { createSettleRouter } from "./routes/settle.js";
import { createHealthRouter } from "./routes/health.js";
import { registerRouter } from "./register.js";

export function createRouterApp(): { app: Express; config: AppConfig; hcs: HcsLogger } {
  const config = loadConfig();
  const app: Express = express();

  app.use(cors());
  app.use(express.json());

  const mirror = new MirrorClient(config.mirrorNodeUrl);
  const hedera = HederaService.fromEnv(config.operatorId, config.operatorKey, config.network);
  const hcs = new HcsLogger(hedera, config.topicId, "vigil-router");
  const replayStore = new RouterReplayStore();

  app.use("/quote", createQuoteRouter(config));
  app.use("/settle", createSettleRouter(config, mirror, hedera, replayStore, hcs));
  app.use("/health", createHealthRouter(config, replayStore));

  return { app, config, hcs };
}

async function start() {
  const { app, config, hcs } = createRouterApp();
  const port = config.PORT_ROUTER;

  const server = app.listen(port, async () => {
    console.log(`\n==================================================`);
    console.log(`  VIGIL ROUTER (LP Swap Service) running on port ${port}`);
    console.log(`  Quote endpoint:   http://localhost:${port}/quote?amountFusdc=10`);
    console.log(`  Settle endpoint:  http://localhost:${port}/settle`);
    console.log(`  Health Check:     http://localhost:${port}/health`);
    console.log(`==================================================\n`);

    await registerRouter(config, hcs);
  });

  return server;
}

if (process.argv[1]?.endsWith("server.ts") || process.argv[1]?.endsWith("server.js")) {
  start().catch((err) => {
    console.error("Failed to start router service:", err);
    process.exit(1);
  });
}

import express, { type Express } from "express";
import cors from "cors";
import { loadConfig, type AppConfig } from "@fatera/config";
import { HederaService } from "@fatera/hedera";
import { MirrorClient } from "@fatera/mirror";
import { HcsLogger } from "@fatera/hcs";
import { StateStore } from "./core/stateStore.js";
import { TreasuryService } from "./core/treasury.js";

export function createAgentApp(): {
  app: Express;
  config: AppConfig;
  stateStore: StateStore;
  treasury: TreasuryService;
  hcs: HcsLogger;
  hedera: HederaService;
  mirror: MirrorClient;
} {
  const config = loadConfig();
  const app: Express = express();

  app.use(cors());
  app.use(express.json());

  const mirror = new MirrorClient(config.mirrorNodeUrl);
  const hedera = HederaService.fromEnv(config.operatorId, config.operatorKey, config.network);
  const hcs = new HcsLogger(hedera, config.topicId, "vigil-agent");
  const stateStore = new StateStore(config);
  const treasury = new TreasuryService(mirror, config.agentAccount, config.fusdcTokenId);

  // GET /state
  app.get("/state", (_req, res) => {
    return res.json(stateStore.getState());
  });

  // GET /events
  app.get("/events", (req, res) => {
    const limit = parseInt((req.query.limit as string) || "50", 10);
    return res.json(stateStore.getEvents(limit));
  });

  // GET /health
  app.get("/health", (_req, res) => {
    const state = stateStore.getState();
    return res.json({
      ok: true,
      service: "fatera-agent",
      phase: state.phase,
      agentAccount: config.agentAccount,
      eventsSeen: state.eventsSeen,
      ts: new Date().toISOString(),
    });
  });

  // POST /demo/start (Trigger demo goal from dashboard)
  app.post("/demo/start", async (_req, res) => {
    return res.json({
      status: "started",
      message: "Agent demo goal triggered",
      phase: stateStore.getState().phase,
    });
  });

  return { app, config, stateStore, treasury, hcs, hedera, mirror };
}

async function start() {
  const { app, config } = createAgentApp();
  const port = config.PORT_AGENT;

  const server = app.listen(port, () => {
    console.log(`\n==================================================`);
    console.log(`  VIGIL AGENT (State API & Core) running on port ${port}`);
    console.log(`  State API:       http://localhost:${port}/state`);
    console.log(`  Events Feed:     http://localhost:${port}/events`);
    console.log(`  Health Check:    http://localhost:${port}/health`);
    console.log(`==================================================\n`);
  });

  return server;
}

if (process.argv[1]?.endsWith("server.ts") || process.argv[1]?.endsWith("server.js")) {
  start().catch((err) => {
    console.error("Failed to start agent service:", err);
    process.exit(1);
  });
}

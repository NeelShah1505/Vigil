import express, { type Express } from "express";
import cors from "cors";
import { loadConfig, type AppConfig } from "@vigil/config";
import { HederaService } from "@vigil/hedera";
import { HcsLogger } from "@vigil/hcs";
import { ServiceDescriptorSchema, type ServiceDescriptor } from "@vigil/types";

export function createDirectoryApp(): {
  app: Express;
  config: AppConfig;
  services: Map<string, ServiceDescriptor>;
  hcs: HcsLogger;
} {
  const config = loadConfig();
  const app: Express = express();

  app.use(cors());
  app.use(express.json());

  const services = new Map<string, ServiceDescriptor>();
  const hedera = HederaService.fromEnv(config.operatorId, config.operatorKey, config.network);
  const hcs = new HcsLogger(hedera, config.topicId, "vigil-directory");

  // POST /register
  app.post("/register", async (req, res) => {
    const parsed = ServiceDescriptorSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "INVALID_DESCRIPTOR",
        message: "Invalid ServiceDescriptor body",
        issues: parsed.error.issues,
      });
    }

    const descriptor = parsed.data;
    services.set(descriptor.id, descriptor);

    // Emit SERVICE_REGISTERED to HCS (under 1000 bytes)
    try {
      await hcs.emit("SERVICE_REGISTERED", {
        id: descriptor.id,
        name: descriptor.name,
        baseUrl: descriptor.baseUrl,
        kind: descriptor.kind,
        pricing: descriptor.pricing,
        metered: descriptor.metered,
        ownerAccount: descriptor.ownerAccount,
      });
    } catch (err: any) {
      console.warn(`[Directory] Failed to emit SERVICE_REGISTERED to HCS: ${err.message}`);
    }

    return res.status(201).json({
      status: "registered",
      descriptor,
    });
  });

  // GET /services
  app.get("/services", (_req, res) => {
    return res.json(Array.from(services.values()));
  });

  // GET /health
  app.get("/health", (_req, res) => {
    return res.json({
      ok: true,
      service: "vigil-directory",
      servicesCount: services.size,
      topicId: config.topicId,
      ts: new Date().toISOString(),
    });
  });

  // GET / -> Human-friendly HTML Directory
  app.get("/", (_req, res) => {
    const list = Array.from(services.values());
    const rows = list
      .map(
        (s) => `
        <tr>
          <td><strong>${s.name}</strong><br><span style="font-size: 11px; color: #5A544A;">${s.id}</span></td>
          <td><span class="badge ${s.kind.toLowerCase()}">${s.kind}</span></td>
          <td><code>${s.baseUrl}</code></td>
          <td>
            ${
              s.pricing.baseFusdc !== undefined
                ? `${s.pricing.baseFusdc} ${s.pricing.asset} base + ${s.pricing.perFieldFusdc}/field`
                : s.pricing.feeBps !== undefined
                ? `${s.pricing.feeBps} bps (${s.pricing.feeBps / 100}%)`
                : "Dynamic"
            }
          </td>
          <td>${s.metered ? '<span class="badge metered">METERED</span>' : '<span class="badge flat">FLAT</span>'}</td>
          <td><code>${s.ownerAccount}</code></td>
        </tr>
      `
      )
      .join("");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Vigil Service Directory (Hedera Testnet)</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #F4F0E8; color: #1C1915; padding: 2.5rem; }
    h1 { color: #1C1915; font-size: 1.8rem; margin-bottom: 0.25rem; font-family: Georgia, serif; }
    p { color: #5A544A; margin-bottom: 1.5rem; font-size: 0.95rem; }
    table { width: 100%; border-collapse: collapse; background: #FFFFFF; border-radius: 8px; overflow: hidden; border: 1px solid #DCD4C4; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #EFEAE0; font-size: 13px; }
    th { background: #FAF7F0; color: #5A544A; font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; font-family: monospace; }
    tr:last-child td { border-bottom: none; }
    code { background: #FAF7F0; border: 1px solid #EFEAE0; padding: 2px 6px; border-radius: 4px; font-family: monospace; color: #1C1915; font-size: 12px; }
    .badge { padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase; display: inline-block; font-family: monospace; }
    .badge.data { background: #E8F3EB; color: #2B6B44; border: 1px solid #B8DCBF; }
    .badge.swap { background: #FBF0ED; color: #A8341E; border: 1px solid #F0C4B8; }
    .badge.metered { background: #FAF0E6; color: #9E6B15; border: 1px solid #ECD7AF; }
    .badge.flat { background: #FAF7F0; color: #5A544A; border: 1px solid #DCD4C4; }
    .footer { margin-top: 1.5rem; font-size: 12px; color: #5A544A; font-family: monospace; }
    a { color: #A8341E; text-decoration: none; font-weight: 600; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>🌐 Vigil Machine Service Directory</h1>
  <p>Autonomous agent discovery & machine-to-machine x402 payment registry on Hedera Testnet. Topic: <code>${config.topicId}</code></p>
  <table>
    <thead>
      <tr>
        <th>Service</th>
        <th>Kind</th>
        <th>Endpoint</th>
        <th>Pricing</th>
        <th>Metering</th>
        <th>Owner Account</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="6" style="text-align: center; color: #5A544A; padding: 2rem;">No services registered yet</td></tr>'}
    </tbody>
  </table>
  <div class="footer">
    Machine JSON Feed: <a href="/services">/services</a> · Health Check: <a href="/health">/health</a>
  </div>
</body>
</html>`;

    return res.send(html);
  });

  return { app, config, services, hcs };
}

async function start() {
  const { app, config } = createDirectoryApp();
  const port = config.PORT_DIRECTORY;

  const server = app.listen(port, () => {
    console.log(`\n==================================================`);
    console.log(`  VIGIL DIRECTORY (Discovery Service) on port ${port}`);
    console.log(`  Web View:      http://localhost:${port}`);
    console.log(`  JSON Feed:     http://localhost:${port}/services`);
    console.log(`  Register API:  POST http://localhost:${port}/register`);
    console.log(`==================================================\n`);
  });

  return server;
}

if (process.argv[1]?.endsWith("server.ts") || process.argv[1]?.endsWith("server.js")) {
  start().catch((err) => {
    console.error("Failed to start directory service:", err);
    process.exit(1);
  });
}

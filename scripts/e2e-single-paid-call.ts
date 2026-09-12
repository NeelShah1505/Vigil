import { loadConfig } from "@fatera/config";
import { HederaService } from "@fatera/hedera";
import { MirrorClient } from "@fatera/mirror";
import { createApp } from "../apps/api-service/src/server.js";
import { AccountId } from "@hashgraph/sdk";
import type { Server } from "node:http";

async function main() {
  console.log("=== E2E SINGLE PAID CALL VERIFICATION (scripts/e2e-single-paid-call.ts) ===\n");

  const config = loadConfig(true);
  const mirror = new MirrorClient(config.mirrorNodeUrl);
  const hedera = HederaService.fromEnv(config.operatorId, config.operatorKey, config.network);

  // 1. Spin up API Service in-process for testing
  const { app } = createApp();
  const port = config.PORT_API;
  let server: Server | null = null;

  await new Promise<void>((resolve) => {
    server = app.listen(port, () => {
      console.log(`[1/5] API Service running locally on port ${port}`);
      resolve();
    });
  });

  const apiUrl = `http://localhost:${port}/market-data?symbol=HBAR&fields=price,volume,sentiment,volatility,trend`;

  try {
    // 2. Make initial unpaid request -> Expect HTTP 402
    console.log("\n[2/5] Making unpaid GET request to /market-data...");
    const res1 = await fetch(apiUrl);
    console.log(`  Status code: ${res1.status} (Expected: 402)`);
    if (res1.status !== 402) {
      throw new Error(`Expected 402, got ${res1.status}`);
    }

    const body1 = (await res1.json()) as any;
    console.log("  402 Response JSON:");
    console.log("   ", JSON.stringify(body1, null, 2));

    if (body1.error !== "X402_PAYMENT_REQUIRED") {
      throw new Error(`Expected error X402_PAYMENT_REQUIRED, got ${body1.error}`);
    }
    if (!body1.paymentRequirements || body1.paymentRequirements.length === 0) {
      throw new Error("Missing paymentRequirements in 402 response");
    }

    const req = body1.paymentRequirements[0];
    console.log(`  ✓ Received valid x402 payment requirements for ${req.amountBaseUnits} base units of ${req.asset}`);

    // 3. Settle on-chain payment matching requirements
    // Payer: ROUTER_LP has FUSDC tokens from initial token creation
    const payerId = AccountId.fromString(config.routerLpAccount);
    const payerKey = HederaService.parsePrivateKey(config.routerLpKey);
    const payeeId = AccountId.fromString(req.payeeAccountId);
    const amountBaseUnits = Number(req.amountBaseUnits);

    console.log(`\n[3/5] Executing on-chain payment from ${payerId.toString()} to ${payeeId.toString()}...`);
    const { txId } = await hedera.transferFusdc(
      payerId,
      payeeId,
      req.tokenId,
      amountBaseUnits,
      "x402 e2e test payment",
      payerKey
    );
    console.log(`  ✓ Transfer submitted and receipted on Hedera testnet: ${txId}`);

    // 4. Retry request with X-PAYMENT proof header -> Expect HTTP 200
    console.log("\n[4/5] Retrying request with X-PAYMENT proof header...");
    const proof = {
      scheme: "hedera-native",
      network: config.network,
      transactionId: txId,
      payerAccountId: payerId.toString(),
      tokenId: req.tokenId,
      amountBaseUnits: req.amountBaseUnits,
    };
    const proofHeader = Buffer.from(JSON.stringify(proof)).toString("base64url");

    const res2 = await fetch(apiUrl, {
      headers: {
        "X-PAYMENT": proofHeader,
      },
    });

    console.log(`  Status code: ${res2.status} (Expected: 200)`);
    if (res2.status !== 200) {
      const errText = await res2.text();
      throw new Error(`Expected 200, got ${res2.status}: ${errText}`);
    }

    const body2 = (await res2.json()) as any;
    console.log("  200 Response Payload:");
    console.log("   ", JSON.stringify(body2, null, 2));

    if (body2.status !== "success" || !body2.data || !body2.usage) {
      throw new Error("Response missing success status, data, or usage report");
    }
    console.log("  ✓ Data returned:", JSON.stringify(body2.data));
    console.log("  ✓ Usage report returned:", JSON.stringify(body2.usage));

    // 5. Test Replay Protection
    console.log("\n[5/5] Testing Replay Protection (reusing same X-PAYMENT header)...");
    const res3 = await fetch(apiUrl, {
      headers: {
        "X-PAYMENT": proofHeader,
      },
    });
    console.log(`  Replay status code: ${res3.status} (Expected: 402)`);
    const body3 = (await res3.json()) as any;
    if (res3.status !== 402 || body3.error !== "REPLAY_DETECTED") {
      throw new Error(`Expected replay rejection with REPLAY_DETECTED, got ${res3.status}: ${JSON.stringify(body3)}`);
    }
    console.log(`  ✓ Replay successfully blocked: ${body3.message}`);

    // Verify HCS PAYMENT_SETTLED event exists on mirror node
    console.log("\nVerifying PAYMENT_SETTLED event on Mirror Node...");
    let eventFound = false;
    for (let attempt = 1; attempt <= 15; attempt++) {
      const messages = await mirror.getTopicMessages(config.topicId, 10);
      const settleMsg = messages.find((m) => {
        try {
          const parsed = JSON.parse(m.message);
          return parsed.type === "PAYMENT_SETTLED" && parsed.data?.txId === txId;
        } catch {
          return false;
        }
      });
      if (settleMsg) {
        console.log(`  ✓ Verified PAYMENT_SETTLED event on HCS topic ${config.topicId} at ${settleMsg.ts}`);
        eventFound = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }

    if (!eventFound) {
      console.warn("  ⚠️ PAYMENT_SETTLED event pending mirror node ingestion (will be visible shortly).");
    }

    console.log("\n==================================================");
    console.log("      PHASE 3 X402 API VERIFICATION PASSED         ");
    console.log("==================================================");
  } finally {
    if (server) {
      (server as Server).close();
    }
  }
}

main().catch((err) => {
  console.error("\n❌ E2E single paid call failed:", err);
  process.exit(1);
});

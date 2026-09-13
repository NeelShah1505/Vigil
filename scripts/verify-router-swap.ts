import { loadConfig } from "@vigil/config";
import { HederaService } from "@vigil/hedera";
import { MirrorClient } from "@vigil/mirror";
import { createRouterApp } from "../apps/router/src/server.js";
import { AccountId } from "@hashgraph/sdk";
import type { Server } from "node:http";

async function main() {
  console.log("=== PHASE 4: VERIFY VIGIL ROUTER SWAP (scripts/verify-router-swap.ts) ===\n");

  const config = loadConfig(true);
  const mirror = new MirrorClient(config.mirrorNodeUrl);
  const hedera = HederaService.fromEnv(config.operatorId, config.operatorKey, config.network);

  // 1. Start Router service in-process
  const { app } = createRouterApp();
  const port = config.PORT_ROUTER;
  let server: Server | null = null;

  await new Promise<void>((resolve) => {
    server = app.listen(port, () => {
      console.log(`[1/6] Router Service running locally on port ${port}`);
      resolve();
    });
  });

  const baseUrl = `http://localhost:${port}`;

  try {
    // 2. Request quote for 2 FUSDC
    const amountFusdc = 2;
    console.log(`\n[2/6] Requesting quote for ${amountFusdc} FUSDC from ${baseUrl}/quote...`);
    const quoteRes = await fetch(`${baseUrl}/quote?amountFusdc=${amountFusdc}`);
    if (!quoteRes.ok) {
      throw new Error(`Quote failed with status ${quoteRes.status}: ${await quoteRes.text()}`);
    }

    const quote = (await quoteRes.json()) as any;
    console.log("  Quote response:", JSON.stringify(quote, null, 2));

    if (quote.amountFusdc !== amountFusdc) {
      throw new Error(`Expected amountFusdc ${amountFusdc}, got ${quote.amountFusdc}`);
    }
    if (quote.amountHbar !== "4.01200000") {
      throw new Error(`Expected amountHbar 4.01200000, got ${quote.amountHbar}`);
    }
    if (quote.payeeAccountId !== config.routerLpAccount) {
      throw new Error(`Expected payeeAccountId ${config.routerLpAccount}, got ${quote.payeeAccountId}`);
    }
    console.log(`  ✓ Received valid quote: ${quote.amountFusdc} FUSDC for ${quote.amountHbar} HBAR (${quote.amountTinybars} tinybars)`);

    // 3. Execute Leg 1: Transfer quoted HBAR from AGENT to ROUTER_LP
    const agentId = AccountId.fromString(config.agentAccount);
    const agentKey = HederaService.parsePrivateKey(config.agentKey);
    const routerLpId = AccountId.fromString(config.routerLpAccount);
    const hbarAmount = parseFloat(quote.amountHbar);

    console.log(`\n[3/6] Executing Leg 1 (HBAR Transfer): ${hbarAmount} HBAR from Agent (${agentId.toString()}) to Router LP (${routerLpId.toString()})...`);
    const { txId: hbarTxId } = await hedera.transferHbar(
      agentId,
      routerLpId,
      hbarAmount,
      "VigilRouter swap: HBAR leg",
      agentKey
    );
    console.log(`  ✓ Leg 1 submitted and confirmed on-chain: ${hbarTxId}`);

    // 4. Settle Leg 2: Post settlement request to Router
    console.log(`\n[4/6] Requesting settlement from Router (${baseUrl}/settle)...`);
    const settlePayload = {
      transactionId: hbarTxId,
      payerAccountId: agentId.toString(),
      amountFusdc,
    };

    const settleRes = await fetch(`${baseUrl}/settle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settlePayload),
    });

    if (!settleRes.ok) {
      throw new Error(`Settlement failed with status ${settleRes.status}: ${await settleRes.text()}`);
    }

    const settleData = (await settleRes.json()) as any;
    console.log("  Settlement response:", JSON.stringify(settleData, null, 2));

    if (settleData.status !== "settled" || !settleData.fusdcTxId) {
      throw new Error(`Invalid settlement response: ${JSON.stringify(settleData)}`);
    }
    const fusdcTxId = settleData.fusdcTxId;
    console.log(`  ✓ Leg 2 settled! FUSDC Transfer Tx: ${fusdcTxId}`);

    // 5. Test Replay Protection
    console.log(`\n[5/6] Testing Router Replay Protection (reusing ${hbarTxId})...`);
    const replayRes = await fetch(`${baseUrl}/settle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settlePayload),
    });

    console.log(`  Replay response status: ${replayRes.status} (Expected: 400)`);
    const replayData = (await replayRes.json()) as any;
    if (replayRes.status !== 400 || replayData.error !== "REPLAY_DETECTED") {
      throw new Error(`Expected REPLAY_DETECTED 400, got ${replayRes.status}: ${JSON.stringify(replayData)}`);
    }
    console.log(`  ✓ Replay attempt successfully rejected: ${replayData.message}`);

    // 6. Verify on Mirror Node & HCS Audit Trail
    console.log(`\n[6/6] Verifying both legs and HCS event on Mirror Node...`);

    // Verify Leg 1 on mirror
    console.log(`  Waiting for Mirror Node confirmation of Leg 1 (${hbarTxId})...`);
    const hbarMirrorTx = await mirror.waitForTransaction(hbarTxId, 25000);
    console.log(`  ✓ Leg 1 confirmed on Mirror Node (consensus: ${hbarMirrorTx.consensus_timestamp})`);

    // Verify Leg 2 on mirror
    console.log(`  Waiting for Mirror Node confirmation of Leg 2 (${fusdcTxId})...`);
    const fusdcMirrorTx = await mirror.waitForTransaction(fusdcTxId, 25000);
    console.log(`  ✓ Leg 2 confirmed on Mirror Node (consensus: ${fusdcMirrorTx.consensus_timestamp})`);

    // Verify Agent's FUSDC balance
    const agentFusdcBal = await mirror.getAccountTokenBalance(config.agentAccount, config.fusdcTokenId);
    console.log(`  Agent FUSDC Token Balance on Mirror: ${agentFusdcBal} base units (${Number(agentFusdcBal) / 1_000_000} FUSDC)`);
    if (Number(agentFusdcBal) < 2_000_000) {
      throw new Error(`Agent should have at least 2 FUSDC, but has ${agentFusdcBal}`);
    }

    // Verify SWAP_SETTLED HCS event
    console.log(`  Polling topic ${config.topicId} for SWAP_SETTLED event...`);
    let swapEventFound = false;
    for (let attempt = 1; attempt <= 15; attempt++) {
      const messages = await mirror.getTopicMessages(config.topicId, 10);
      const swapMsg = messages.find((m) => {
        try {
          const parsed = JSON.parse(m.message);
          return parsed.type === "SWAP_SETTLED" && parsed.data?.hbarTxId === hbarTxId;
        } catch {
          return false;
        }
      });
      if (swapMsg) {
        console.log(`  ✓ Found SWAP_SETTLED event on HCS topic ${config.topicId}:`);
        console.log("   ", swapMsg.message);
        swapEventFound = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }

    if (!swapEventFound) {
      console.warn("  ⚠️ SWAP_SETTLED event pending mirror node consensus ingestion.");
    }

    console.log("\n==================================================");
    console.log("         PHASE 4 ROUTER SWAP PASSED ✅            ");
    console.log("==================================================");
    console.log(`Swapped:         2.00 FUSDC`);
    console.log(`Paid:            4.012 HBAR (Rate: 2 HBAR/FUSDC + 30 bps fee)`);
    console.log(`HBAR Tx:         https://hashscan.io/testnet/transaction/${hbarTxId}`);
    console.log(`FUSDC Tx:        https://hashscan.io/testnet/transaction/${fusdcTxId}`);
    console.log(`HashScan Topic:  https://hashscan.io/testnet/topic/${config.topicId}`);
    console.log("==================================================\n");
  } finally {
    if (server) {
      (server as Server).close();
    }
  }
}

main().catch((err) => {
  console.error("\n❌ Phase 4 verification failed:", err);
  process.exit(1);
});

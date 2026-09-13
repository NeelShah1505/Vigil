import { loadConfig } from "@vigil/config";
import { HederaService } from "@vigil/hedera";
import { MirrorClient } from "@vigil/mirror";
import { HcsLogger } from "@vigil/hcs";

async function main() {
  console.log("=== VERIFY HEDERA FOUNDATION (scripts/verify-foundation.ts) ===\n");

  const config = loadConfig(true);

  if (!config.operatorId || !config.operatorKey) {
    console.error("❌ Error: OPERATOR_ID and OPERATOR_KEY are not set in .env");
    process.exit(1);
  }
  if (!config.agentAccount || !config.fusdcTokenId || !config.topicId) {
    console.error("❌ Error: Foundation not set up. Please run `pnpm setup` first.");
    process.exit(1);
  }

  const hedera = HederaService.fromEnv(config.operatorId, config.operatorKey, config.network);
  const mirror = new MirrorClient(config.mirrorNodeUrl);
  const hcs = new HcsLogger(hedera, config.topicId, "vigil-agent-001");

  console.log("[1/3] Verifying Account Balances & Token Association...");
  const accounts = [
    { name: "AGENT", id: config.agentAccount },
    { name: "MERCHANT", id: config.merchantAccount },
    { name: "ROUTER_LP", id: config.routerLpAccount },
    { name: "FEE_COLLECTOR", id: config.feeCollectorAccount },
  ];

  for (const acct of accounts) {
    const balances = await hedera.getBalances(acct.id, config.fusdcTokenId);
    const hbarDisplay = (Number(balances.hbarTinybars) / 100_000_000).toFixed(4);
    const fusdcDisplay = (Number(balances.fusdcBaseUnits) / 1_000_000).toFixed(4);

    console.log(`  ${acct.name.padEnd(14)} (${acct.id}):`);
    console.log(`    HBAR:  ${hbarDisplay} HBAR (${balances.hbarTinybars} tinybars)`);
    console.log(`    FUSDC: ${fusdcDisplay} FUSDC (${balances.fusdcBaseUnits} base units)`);
    console.log(`    HashScan: https://hashscan.io/${config.network}/account/${acct.id}`);
  }

  console.log("\n[2/3] Verifying FUSDC Token Info...");
  try {
    const tokenInfo = await mirror.getToken(config.fusdcTokenId);
    console.log(`  Name:         ${tokenInfo.name} (${tokenInfo.symbol})`);
    console.log(`  Decimals:     ${tokenInfo.decimals}`);
    console.log(`  Total Supply: ${tokenInfo.total_supply}`);
    console.log(`  Treasury:     ${tokenInfo.treasury_account_id}`);
    console.log(`  Custom Fees:  ${JSON.stringify(tokenInfo.custom_fees || {})}`);
    console.log(`  HashScan:     https://hashscan.io/${config.network}/token/${config.fusdcTokenId}`);
  } catch (err: any) {
    console.warn(`  Warning fetching token info from mirror node: ${err.message}`);
  }

  console.log("\n[3/3] Submitting and Verifying HCS CHECKPOINT Event...");
  console.log(`  Submitting CHECKPOINT event to topic ${config.topicId}...`);
  const emittedEvt = await hcs.emit("CHECKPOINT", {
    phase: 1,
    status: "FOUNDATION_VERIFIED",
    agentAccount: config.agentAccount,
    tokenId: config.fusdcTokenId,
    ts: new Date().toISOString(),
  });
  console.log(`  ✓ Message submitted to topic (seq: ${emittedEvt.seq})`);

  console.log("  Waiting for Mirror Node ingestion (polling topic messages)...");
  let found = false;
  const start = Date.now();
  while (Date.now() - start < 30000) {
    try {
      const messages = await mirror.getTopicMessages(config.topicId, 5);
      const match = messages.find((m) => {
        try {
          const parsed = JSON.parse(m.message);
          return parsed.type === "CHECKPOINT" && parsed.data?.status === "FOUNDATION_VERIFIED";
        } catch {
          return false;
        }
      });

      if (match) {
        console.log(`  ✓ Found HCS message on mirror node at consensus timestamp: ${match.ts}`);
        console.log(`  Decoded payload:`);
        console.log(`    ${match.message}`);
        console.log(`  HashScan Topic: https://hashscan.io/${config.network}/topic/${config.topicId}`);
        found = true;
        break;
      }
    } catch {
      // transient network wait
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  if (!found) {
    throw new Error("Timed out waiting for CHECKPOINT event to appear on mirror node");
  }

  console.log("\n==================================================");
  console.log("       PHASE 1 FOUNDATION VERIFICATION PASSED      ");
  console.log("==================================================");
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});

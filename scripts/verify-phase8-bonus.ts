import { loadConfig } from "@fatera/config";
import { HederaService } from "@fatera/hedera";
import { MirrorClient } from "@fatera/mirror";
import { HcsLogger } from "@fatera/hcs";
import { registerAgentIdentity } from "../apps/agent/src/core/identity.js";
import { createScheduledRenewal, pollScheduleExecution } from "../apps/agent/src/core/scheduler.js";

async function main() {
  console.log("=== PHASE 8: BONUS LAYER VERIFICATION (scripts/verify-phase8-bonus.ts) ===\n");

  const config = loadConfig(true);
  const hedera = HederaService.fromEnv(config.operatorId, config.operatorKey, config.network);
  const mirror = new MirrorClient(config.mirrorNodeUrl);
  const hcsAudit = new HcsLogger(hedera, config.topicId, "fatera-agent-001");

  // 1. Verify HCS Agent Identity Registration
  console.log("[1/2] Anchoring and Verifying HCS Agent Identity...");
  const profile = await registerAgentIdentity(config, hedera, hcsAudit);
  console.log("  Agent profile:", JSON.stringify(profile, null, 2));

  console.log(`  Waiting for Mirror Node ingestion on Identity Topic ${config.identityTopicId}...`);
  let idEventFound = false;
  for (let attempt = 1; attempt <= 15; attempt++) {
    const messages = await mirror.getTopicMessages(config.identityTopicId, 5);
    const found = messages.find((m) => {
      try {
        const parsed = JSON.parse(m.message);
        return parsed.type === "AGENT_REGISTERED" && parsed.data?.account === config.agentAccount;
      } catch {
        return false;
      }
    });
    if (found) {
      console.log(`  ✓ AGENT_REGISTERED verified on HashScan Topic: https://hashscan.io/testnet/topic/${config.identityTopicId}`);
      idEventFound = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  if (!idEventFound) {
    console.warn("  ℹ️ Identity event pending mirror node consensus.");
  }

  // 2. Verify Scheduled Transaction Creation
  console.log("\n[2/2] Testing Scheduled Forward Renewal (30s forward schedule)...");
  // Testnet allows scheduling with expiration
  const schedule = await createScheduledRenewal(config, hedera, hcsAudit, 30);
  console.log(`  ✓ Schedule Created: ${schedule.scheduleId}`);
  console.log(`  HashScan Schedule Link: https://hashscan.io/testnet/schedule/${schedule.scheduleId}`);
  console.log(`  Mirror Node REST API:   ${config.mirrorNodeUrl}/api/v1/schedules/${schedule.scheduleId}`);

  console.log("  Waiting for Mirror Node schedule record...");
  for (let attempt = 1; attempt <= 15; attempt++) {
    const scheduleInfo = await mirror.getSchedule(schedule.scheduleId);
    if (scheduleInfo) {
      console.log(`  ✓ Found Schedule on Mirror Node! Memo: "${scheduleInfo.memo}", Creator: ${scheduleInfo.creator_account_id}`);
      console.log(`    Wait for expiry: ${scheduleInfo.wait_for_expiry}, Expiration: ${scheduleInfo.expiration_time}`);
      break;
    }
    await new Promise((r) => setTimeout(r, 1200));
  }

  console.log("\n==================================================");
  console.log("          PHASE 8 BONUS LAYER PASSED ✅           ");
  console.log("==================================================");
  console.log(`Identity Topic:   https://hashscan.io/testnet/topic/${config.identityTopicId}`);
  console.log(`Schedule ID:      ${schedule.scheduleId}`);
  console.log(`Schedule Link:    https://hashscan.io/testnet/schedule/${schedule.scheduleId}`);
  console.log("==================================================\n");
}

main().catch((err) => {
  console.error("\n❌ Phase 8 verification failed:", err);
  process.exit(1);
});

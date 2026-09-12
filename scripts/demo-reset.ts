import fs from "node:fs";
import path from "node:path";
import { loadConfig } from "@fatera/config";
import { HederaService } from "@fatera/hedera";
import { HcsLogger } from "@fatera/hcs";
import { AccountId, PrivateKey } from "@hashgraph/sdk";

async function main() {
  console.log("=== FATERA DEMO RESET (scripts/demo-reset.ts) ===\n");

  const config = loadConfig(true);
  if (!config.operatorId || !config.agentAccount || !config.routerLpAccount) {
    console.error("❌ Required configuration missing in .env");
    process.exit(1);
  }

  const hedera = HederaService.fromEnv(config.operatorId, config.operatorKey, config.network);
  const hcs = new HcsLogger(hedera, config.topicId, "fatera-agent-001");

  console.log("1. Checking current balances...");
  const agentBal = await hedera.getBalances(config.agentAccount, config.fusdcTokenId);
  console.log(`  Agent HBAR: ${(Number(agentBal.hbarTinybars) / 100_000_000).toFixed(4)}`);
  console.log(`  Agent FUSDC: ${(Number(agentBal.fusdcBaseUnits) / 1_000_000).toFixed(4)}`);

  const agentKey = HederaService.parsePrivateKey(config.agentKey);
  const agentAccountId = AccountId.fromString(config.agentAccount);
  const routerLpAccountId = AccountId.fromString(config.routerLpAccount);

  // Transfer any remaining FUSDC back to router LP
  const fusdcUnits = Number(agentBal.fusdcBaseUnits);
  if (fusdcUnits > 0) {
    console.log(`  Returning ${fusdcUnits} base units of FUSDC to ROUTER_LP...`);
    await hedera.transferFusdc(
      agentAccountId,
      routerLpAccountId,
      config.fusdcTokenId,
      fusdcUnits,
      "Demo reset: return FUSDC",
      agentKey
    );
    console.log("  ✓ FUSDC returned");
  }

  // Normalize HBAR to exactly 100 HBAR (10,000,000,000 tinybars)
  const targetTinybars = 10_000_000_000n;
  const currentTinybars = BigInt(agentBal.hbarTinybars);
  const routerLpKey = HederaService.parsePrivateKey(config.routerLpKey);

  if (currentTinybars < targetTinybars) {
    const diffTinybars = targetTinybars - currentTinybars;
    const diffHbar = Number(diffTinybars) / 100_000_000;
    console.log(`  Topping up Agent with ${diffHbar.toFixed(4)} HBAR from ROUTER_LP...`);
    await hedera.transferHbar(
      routerLpAccountId,
      agentAccountId,
      diffHbar,
      "Demo reset: topup agent",
      routerLpKey
    );
    console.log("  ✓ Agent topped up to 100 HBAR");
  } else if (currentTinybars > targetTinybars + 100_000_000n) {
    const excessTinybars = currentTinybars - targetTinybars;
    const excessHbar = Number(excessTinybars) / 100_000_000;
    console.log(`  Returning excess ${excessHbar.toFixed(4)} HBAR from Agent to ROUTER_LP...`);
    await hedera.transferHbar(
      agentAccountId,
      routerLpAccountId,
      excessHbar,
      "Demo reset: refund excess HBAR",
      agentKey
    );
    console.log("  ✓ Excess HBAR refunded");
  }

  // Reset used-payments.json
  const usedPaymentsPath = path.join(process.cwd(), "used-payments.json");
  if (fs.existsSync(usedPaymentsPath)) {
    fs.writeFileSync(usedPaymentsPath, JSON.stringify([]), "utf8");
    console.log("  ✓ Cleared used-payments.json");
  }

  // Emit DEMO_RESET event to HCS
  if (config.topicId) {
    console.log("  Emitting DEMO_RESET event to HCS...");
    await hcs.emit("DEMO_RESET", {
      agentAccount: config.agentAccount,
      ts: new Date().toISOString(),
      resetTo: { hbar: 100, fusdc: 0 },
    });
    console.log("  ✓ DEMO_RESET event emitted");
  }

  const finalBal = await hedera.getBalances(config.agentAccount, config.fusdcTokenId);
  console.log("\nNormalized Agent Balances:");
  console.log(`  HBAR:  ${(Number(finalBal.hbarTinybars) / 100_000_000).toFixed(4)} HBAR`);
  console.log(`  FUSDC: ${(Number(finalBal.fusdcBaseUnits) / 1_000_000).toFixed(4)} FUSDC`);
  console.log("✓ Reset complete.\n");
}

main().catch((err) => {
  console.error("Demo reset failed:", err);
  process.exit(1);
});

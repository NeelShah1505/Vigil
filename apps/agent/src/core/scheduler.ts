import { HederaService } from "@vigil/hedera";
import type { MirrorClient } from "@vigil/mirror";
import type { HcsLogger } from "@vigil/hcs";
import type { AppConfig } from "@vigil/config";

export interface ScheduledRenewalResult {
  scheduleId: string;
  executeAt: string;
  amountFusdc: number;
}

export async function createScheduledRenewal(
  config: AppConfig,
  hedera: HederaService,
  hcs: HcsLogger,
  delaySeconds = 120
): Promise<ScheduledRenewalResult> {
  const executeInMs = delaySeconds * 1000;
  const executeAt = new Date(Date.now() + executeInMs).toISOString();
  const amountBaseUnits = 1_000_000; // 1.00 FUSDC forward renewal
  const agentKey = HederaService.parsePrivateKey(config.agentKey);

  console.log(`  Scheduling forward renewal of 1.00 FUSDC (executes in ${delaySeconds}s)...`);
  const { scheduleId } = await hedera.scheduleFusdcTransfer({
    from: config.agentAccount,
    to: config.merchantAccount,
    tokenId: config.fusdcTokenId,
    amountBaseUnits,
    executeInMs,
    memo: "Vigil Subscription Forward Renewal",
    signerKey: agentKey,
  });

  await hcs.emit("SCHEDULE_CREATED", {
    scheduleId,
    executeAt,
    amountFusdc: 1.0,
    payer: config.agentAccount,
    payee: config.merchantAccount,
    waitForExpiry: true,
  });

  return {
    scheduleId,
    executeAt,
    amountFusdc: 1.0,
  };
}

export async function pollScheduleExecution(
  mirror: MirrorClient,
  scheduleId: string,
  hcs: HcsLogger,
  maxWaitMs = 150_000
): Promise<{ executed: boolean; executedTimestamp?: string }> {
  const start = Date.now();
  console.log(`  Polling mirror node for schedule ${scheduleId} execution...`);

  while (Date.now() - start < maxWaitMs) {
    try {
      const schedule = await mirror.getSchedule(scheduleId);
      if (schedule && schedule.executed_timestamp) {
        console.log(`  ✓ Schedule ${scheduleId} executed on-chain at consensus ${schedule.executed_timestamp}!`);
        await hcs.emit("SCHEDULE_EXECUTED", {
          scheduleId,
          executedTimestamp: schedule.executed_timestamp,
        });
        return { executed: true, executedTimestamp: schedule.executed_timestamp };
      }
    } catch {
      // transient fetch error
    }
    await new Promise((r) => setTimeout(r, 4000));
  }

  console.log(`  ℹ️ Schedule ${scheduleId} pending future execution timestamp.`);
  return { executed: false };
}

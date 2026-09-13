import type { AppConfig } from "@fatera/config";
import { HederaService } from "@fatera/hedera";
import { HcsLogger } from "@fatera/hcs";
import { DEFAULT_POLICY } from "./treasury.js";

export interface AgentIdentityProfile {
  id: string;
  name: string;
  account: string;
  capabilities: string[];
  policy: {
    maxPerCallFusdc: number;
    maxSessionFusdc: number;
    maxHbarPerSwap: number;
  };
  protocol: string;
  registeredAt: string;
}

export async function registerAgentIdentity(
  config: AppConfig,
  hedera: HederaService,
  hcsAudit: HcsLogger
): Promise<AgentIdentityProfile> {
  const profile: AgentIdentityProfile = {
    id: "fatera-agent-001",
    name: "Fatera Autonomous Working Capital Agent",
    account: config.agentAccount,
    capabilities: [
      "x402-metered-client",
      "autonomous-lp-routing",
      "pcr-liquidity-forecasting",
      "hcs-audit-logging",
      "hts-custom-fee-settlement",
    ],
    policy: { ...DEFAULT_POLICY },
    protocol: "HCS-14-inspired-identity",
    registeredAt: new Date().toISOString(),
  };

  const identityTopicId = config.identityTopicId || config.topicId;
  const identityLogger = new HcsLogger(hedera, identityTopicId, profile.id);

  try {
    // 1. Submit AGENT_REGISTERED to Identity Topic
    await identityLogger.emit("AGENT_REGISTERED", profile as any);
    console.log(`  ✓ Agent identity anchored on HCS Identity Topic: ${identityTopicId}`);

    // 2. Also log to main Audit Topic
    await hcsAudit.emit("AGENT_REGISTERED", {
      agentId: profile.id,
      account: profile.account,
      identityTopicId,
    });
  } catch (err: any) {
    console.warn(`  ⚠️ Identity registration warning: ${err.message}`);
  }

  return profile;
}

import dotenv from "dotenv";
import path from "node:path";
import fs from "node:fs";
import { z } from "zod";

export const ConfigSchema = z.object({
  // Network
  HEDERA_NETWORK: z.string().default("testnet"),
  MIRROR_NODE_URL: z.string().default("https://testnet.mirrornode.hedera.com"),
  HASHSCAN_BASE_URL: z.string().default("https://hashscan.io/testnet"),

  // Bootstrap operator
  OPERATOR_ID: z.string().default(""),
  OPERATOR_KEY: z.string().default(""),

  // Generated accounts
  AGENT_ACCOUNT_ID: z.string().default(""),
  AGENT_PRIVATE_KEY: z.string().default(""),
  MERCHANT_ACCOUNT_ID: z.string().default(""),
  MERCHANT_PRIVATE_KEY: z.string().default(""),
  ROUTER_LP_ACCOUNT_ID: z.string().default(""),
  ROUTER_LP_PRIVATE_KEY: z.string().default(""),
  FEE_COLLECTOR_ACCOUNT_ID: z.string().default(""),
  FEE_COLLECTOR_PRIVATE_KEY: z.string().default(""),

  // Generated token & topics
  FUSDC_TOKEN_ID: z.string().default(""),
  HCS_TOPIC_ID: z.string().default(""),
  HCS_IDENTITY_TOPIC_ID: z.string().default(""),

  // Economics
  HBAR_PER_FUSDC: z.coerce.number().default(2),
  ROUTER_FEE_BPS: z.coerce.number().default(30),
  BASE_FEE_FUSDC: z.coerce.number().default(0.50),
  PER_FIELD_FUSDC: z.coerce.number().default(0.10),
  CUSTOM_FEE_BASE_UNITS: z.coerce.number().default(10000),
  MULTI_ASSET: z.preprocess((val) => val === "true" || val === true, z.boolean()).default(false),
  X402_MODE: z.enum(["OFFICIAL", "NATIVE"]).default("NATIVE"),

  // Ports
  PORT_API: z.coerce.number().default(3001),
  PORT_AGENT: z.coerce.number().default(3002),
  PORT_ROUTER: z.coerce.number().default(3003),
  PORT_DIRECTORY: z.coerce.number().default(3004),
  PORT_WEB: z.coerce.number().default(3000),
});

export type RawConfig = z.infer<typeof ConfigSchema>;

export interface AppConfig extends RawConfig {
  agentAccount: string;
  agentKey: string;
  merchantAccount: string;
  merchantKey: string;
  routerLpAccount: string;
  routerLpKey: string;
  feeCollectorAccount: string;
  feeCollectorKey: string;
  fusdcTokenId: string;
  topicId: string;
  identityTopicId: string;
  operatorId: string;
  operatorKey: string;
  network: string;
  mirrorNodeUrl: string;
  hashscanBase: string;
  customFeeBaseUnits: number;
}

let cachedConfig: AppConfig | null = null;

function findEnvFile(): string | undefined {
  let currentDir = process.cwd();
  while (currentDir !== path.dirname(currentDir)) {
    const candidate = path.join(currentDir, ".env");
    if (fs.existsSync(candidate)) {
      return candidate;
    }
    currentDir = path.dirname(currentDir);
  }
  return undefined;
}

export function loadConfig(forceReload = false): AppConfig {
  if (cachedConfig && !forceReload) {
    return cachedConfig;
  }

  const envPath = findEnvFile();
  if (envPath) {
    dotenv.config({ path: envPath });
  } else {
    dotenv.config();
  }

  const parsed = ConfigSchema.parse(process.env);

  cachedConfig = {
    ...parsed,
    agentAccount: parsed.AGENT_ACCOUNT_ID,
    agentKey: parsed.AGENT_PRIVATE_KEY,
    merchantAccount: parsed.MERCHANT_ACCOUNT_ID,
    merchantKey: parsed.MERCHANT_PRIVATE_KEY,
    routerLpAccount: parsed.ROUTER_LP_ACCOUNT_ID,
    routerLpKey: parsed.ROUTER_LP_PRIVATE_KEY,
    feeCollectorAccount: parsed.FEE_COLLECTOR_ACCOUNT_ID,
    feeCollectorKey: parsed.FEE_COLLECTOR_PRIVATE_KEY,
    fusdcTokenId: parsed.FUSDC_TOKEN_ID,
    topicId: parsed.HCS_TOPIC_ID,
    identityTopicId: parsed.HCS_IDENTITY_TOPIC_ID,
    operatorId: parsed.OPERATOR_ID,
    operatorKey: parsed.OPERATOR_KEY,
    network: parsed.HEDERA_NETWORK,
    mirrorNodeUrl: parsed.MIRROR_NODE_URL,
    hashscanBase: parsed.HASHSCAN_BASE_URL,
    customFeeBaseUnits: parsed.CUSTOM_FEE_BASE_UNITS,
  };

  return cachedConfig;
}

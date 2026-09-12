import fs from "node:fs";
import path from "node:path";
import {
  Client,
  AccountId,
  PrivateKey,
  AccountCreateTransaction,
  TokenCreateTransaction,
  TokenAssociateTransaction,
  TokenSupplyType,
  CustomFixedFee,
  Hbar,
  TransferTransaction,
  TokenId,
  Status,
} from "@hashgraph/sdk";
import { loadConfig } from "@fatera/config";
import { HederaService } from "@fatera/hedera";
import { MirrorClient } from "@fatera/mirror";

function updateEnvFile(envPath: string, updates: Record<string, string>) {
  let content = "";
  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, "utf8");
  } else {
    const examplePath = path.join(path.dirname(envPath), ".env.example");
    if (fs.existsSync(examplePath)) {
      content = fs.readFileSync(examplePath, "utf8");
    }
  }

  for (const [key, value] of Object.entries(updates)) {
    const regex = new RegExp(`^${key}=.*$`, "m");
    if (regex.test(content)) {
      content = content.replace(regex, `${key}=${value}`);
    } else {
      content += `\n${key}=${value}`;
    }
  }

  fs.writeFileSync(envPath, content, "utf8");
}

async function main() {
  console.log("=== FATERA TESTNET BOOTSTRAP (scripts/setup.ts) ===\n");

  const config = loadConfig(true);

  if (!config.operatorId || !config.operatorKey) {
    console.error(
      "❌ Error: OPERATOR_ID and OPERATOR_KEY must be set in .env before running setup."
    );
    console.error("Please add them to .env from https://portal.hedera.com");
    process.exit(1);
  }

  console.log(`Using Operator: ${config.operatorId} on ${config.network}`);
  const client =
    config.network === "mainnet" ? Client.forMainnet() : Client.forTestnet();
  const operatorKey = HederaService.parsePrivateKey(config.operatorKey);
  client.setOperator(AccountId.fromString(config.operatorId), operatorKey);

  const mirror = new MirrorClient(config.mirrorNodeUrl);
  const hedera = new HederaService(client);

  // Check operator balance
  const opBalTinybars = await hedera.getHbarBalanceTinybars(config.operatorId);
  const opHbar = Number(opBalTinybars) / 100_000_000;
  console.log(`  Operator balance: ${opHbar.toFixed(2)} HBAR`);
  const routerLpHbar = opHbar >= 620 ? 500 : (opHbar >= 380 ? 250 : 150);

  // 1. Generate keys and create child accounts
  console.log("\n[1/6] Creating Child Accounts...");
  const agentKey = PrivateKey.generateED25519();
  const merchantKey = PrivateKey.generateED25519();
  const routerLpKey = PrivateKey.generateED25519();
  const feeCollectorKey = PrivateKey.generateED25519();

  // Create AGENT account (initial 100 HBAR)
  console.log("  Creating AGENT account (100 HBAR)...");
  const agentTx = await new AccountCreateTransaction()
    .setKey(agentKey.publicKey)
    .setInitialBalance(new Hbar(100))
    .setAccountMemo("Fatera Agent Treasury")
    .execute(client);
  const agentReceipt = await agentTx.getReceipt(client);
  const agentId = agentReceipt.accountId!;
  console.log(`  ✓ AGENT Account: ${agentId.toString()}`);

  // Create MERCHANT account (initial 5 HBAR)
  console.log("  Creating MERCHANT account (5 HBAR)...");
  const merchantTx = await new AccountCreateTransaction()
    .setKey(merchantKey.publicKey)
    .setInitialBalance(new Hbar(5))
    .setAccountMemo("Fatera API Merchant")
    .execute(client);
  const merchantReceipt = await merchantTx.getReceipt(client);
  const merchantId = merchantReceipt.accountId!;
  console.log(`  ✓ MERCHANT Account: ${merchantId.toString()}`);

  // Create ROUTER_LP account
  console.log(`  Creating ROUTER_LP account (${routerLpHbar} HBAR)...`);
  const routerTx = await new AccountCreateTransaction()
    .setKey(routerLpKey.publicKey)
    .setInitialBalance(new Hbar(routerLpHbar))
    .setAccountMemo("Fatera Liquidity Router")
    .execute(client);
  const routerReceipt = await routerTx.getReceipt(client);
  const routerLpId = routerReceipt.accountId!;
  console.log(`  ✓ ROUTER_LP Account: ${routerLpId.toString()}`);

  // Create FEE_COLLECTOR account (initial 5 HBAR)
  console.log("  Creating FEE_COLLECTOR account (5 HBAR)...");
  const feeTx = await new AccountCreateTransaction()
    .setKey(feeCollectorKey.publicKey)
    .setInitialBalance(new Hbar(5))
    .setAccountMemo("Fatera Custom Fee Collector")
    .execute(client);
  const feeReceipt = await feeTx.getReceipt(client);
  const feeCollectorId = feeReceipt.accountId!;
  console.log(`  ✓ FEE_COLLECTOR Account: ${feeCollectorId.toString()}`);

  // 2. Create FUSDC Token with Custom Fixed Fee
  console.log("\n[2/6] Creating FUSDC Token...");
  const adminKey = PrivateKey.generateED25519();
  let tokenIdStr = "";
  let feeApplied = true;

  try {
    const fee = new CustomFixedFee()
      .setFeeCollectorAccountId(feeCollectorId)
      .setAllCollectorsAreExempt(true)
      .setAmount(10_000); // 0.01 FUSDC with 6 decimals

    let tokenTx = new TokenCreateTransaction()
      .setTokenName("Fatera USD")
      .setTokenSymbol("FUSDC")
      .setDecimals(6)
      .setInitialSupply(1_000_000_000_000) // 1,000,000 FUSDC in base units
      .setTreasuryAccountId(routerLpId)
      .setAdminKey(adminKey.publicKey)
      .setSupplyKey(adminKey.publicKey)
      .setFeeScheduleKey(adminKey.publicKey)
      .setSupplyType(TokenSupplyType.Infinite)
      .setCustomFees([fee])
      .freezeWith(client);
    tokenTx = await tokenTx.sign(adminKey);
    tokenTx = await tokenTx.sign(routerLpKey);

    const tokenExec = await tokenTx.execute(client);
    const tokenReceipt = await tokenExec.getReceipt(client);
    tokenIdStr = tokenReceipt.tokenId!.toString();
    console.log(`  ✓ Created FUSDC Token with Custom Fixed Fee: ${tokenIdStr}`);
  } catch (err: any) {
    console.warn(`  ⚠️ Custom fee at token create failed (${err.message}). Trying fallback without fee...`);
    feeApplied = false;
    let fallbackTx = new TokenCreateTransaction()
      .setTokenName("Fatera USD")
      .setTokenSymbol("FUSDC")
      .setDecimals(6)
      .setInitialSupply(1_000_000_000_000)
      .setTreasuryAccountId(routerLpId)
      .setAdminKey(adminKey.publicKey)
      .setSupplyKey(adminKey.publicKey)
      .setSupplyType(TokenSupplyType.Infinite)
      .freezeWith(client);
    fallbackTx = await fallbackTx.sign(adminKey);
    fallbackTx = await fallbackTx.sign(routerLpKey);
    const fallbackExec = await fallbackTx.execute(client);
    const fallbackReceipt = await fallbackExec.getReceipt(client);
    tokenIdStr = fallbackReceipt.tokenId!.toString();
    console.log(`  ✓ Created FUSDC Token (fallback without custom fee): ${tokenIdStr}`);
  }

  const tokenId = TokenId.fromString(tokenIdStr);

  // 3. Associate FUSDC with AGENT, MERCHANT, and FEE_COLLECTOR
  console.log("\n[3/6] Associating FUSDC with accounts...");
  for (const [name, acctId, key] of [
    ["AGENT", agentId, agentKey],
    ["MERCHANT", merchantId, merchantKey],
    ["FEE_COLLECTOR", feeCollectorId, feeCollectorKey],
  ] as const) {
    console.log(`  Associating ${name} (${acctId.toString()})...`);
    let assocTx = new TokenAssociateTransaction()
      .setAccountId(acctId)
      .setTokenIds([tokenId])
      .freezeWith(client);
    assocTx = await assocTx.sign(key);
    const assocExec = await assocTx.execute(client);
    const assocReceipt = await assocExec.getReceipt(client);
    if (assocReceipt.status !== Status.Success) {
      throw new Error(`Token associate failed for ${name}: ${assocReceipt.status}`);
    }
    console.log(`  ✓ ${name} associated with FUSDC`);
  }

  // 4. Create HCS Topics
  console.log("\n[4/6] Creating HCS Topics...");
  const auditTopicId = await hedera.createTopic("Fatera Audit Trail v1");
  console.log(`  ✓ Created HCS Audit Topic: ${auditTopicId}`);

  const identityTopicId = await hedera.createTopic("Fatera Agent Identity v1");
  console.log(`  ✓ Created HCS Identity Topic: ${identityTopicId}`);

  // 5. Save generated credentials to .env and config/state.json
  console.log("\n[5/6] Updating configuration...");
  const rootDir = process.cwd();
  const envPath = path.join(rootDir, ".env");
  const configDir = path.join(rootDir, "config");
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  const envUpdates = {
    AGENT_ACCOUNT_ID: agentId.toString(),
    AGENT_PRIVATE_KEY: agentKey.toStringRaw(),
    MERCHANT_ACCOUNT_ID: merchantId.toString(),
    MERCHANT_PRIVATE_KEY: merchantKey.toStringRaw(),
    ROUTER_LP_ACCOUNT_ID: routerLpId.toString(),
    ROUTER_LP_PRIVATE_KEY: routerLpKey.toStringRaw(),
    FEE_COLLECTOR_ACCOUNT_ID: feeCollectorId.toString(),
    FEE_COLLECTOR_PRIVATE_KEY: feeCollectorKey.toStringRaw(),
    FUSDC_TOKEN_ID: tokenIdStr,
    HCS_TOPIC_ID: auditTopicId,
    HCS_IDENTITY_TOPIC_ID: identityTopicId,
    CUSTOM_FEE_BASE_UNITS: feeApplied ? "10000" : "0",
  };

  updateEnvFile(envPath, envUpdates);
  console.log(`  ✓ Updated ${envPath}`);

  const stateData = {
    generatedAt: new Date().toISOString(),
    network: config.network,
    accounts: {
      agent: { id: agentId.toString() },
      merchant: { id: merchantId.toString() },
      routerLp: { id: routerLpId.toString() },
      feeCollector: { id: feeCollectorId.toString() },
    },
    fusdcTokenId: tokenIdStr,
    customFeeApplied: feeApplied,
    hcsAuditTopicId: auditTopicId,
    hcsIdentityTopicId: identityTopicId,
  };

  fs.writeFileSync(
    path.join(configDir, "state.json"),
    JSON.stringify(stateData, null, 2),
    "utf8"
  );
  console.log(`  ✓ Saved config/state.json`);

  // 6. Empirically verify custom fee behavior
  console.log("\n[6/6] Empirically verifying custom fee...");
  try {
    const testAmountBase = 1_000_000; // 1.00 FUSDC
    console.log("  Transferring 1.00 FUSDC from ROUTER_LP to MERCHANT...");
    let transferTx = new TransferTransaction()
      .addTokenTransfer(tokenId, routerLpId, -testAmountBase)
      .addTokenTransfer(tokenId, merchantId, testAmountBase)
      .setTransactionMemo("Empirical fee verification")
      .freezeWith(client);
    transferTx = await transferTx.sign(routerLpKey);

    const transferExec = await transferTx.execute(client);
    const transferReceipt = await transferExec.getReceipt(client);
    const txIdStr = transferTx.transactionId!.toString();
    console.log(`  ✓ Transfer settled (${transferReceipt.status.toString()}), txId: ${txIdStr}`);

    console.log("  Waiting for mirror node to ingest transaction...");
    const mirrorTx = await mirror.waitForTransaction(txIdStr);
    console.log("  Mirror node transaction transfers:");
    console.log("    Token transfers:", JSON.stringify(mirrorTx.token_transfers, null, 2));

    const feeTransfer = mirrorTx.token_transfers?.find(
      (t: any) => t.account === feeCollectorId.toString()
    );
    if (feeTransfer) {
      console.log(`  ✓ Custom fee empirically verified! Collector received ${feeTransfer.amount} base units.`);
    } else {
      console.log("  ℹ️ No fee transfer to collector observed (standard transfer or fee exempt).");
    }
  } catch (err: any) {
    console.warn(`  ⚠️ Custom fee verification note: ${err.message}`);
  }

  console.log("\n==================================================");
  console.log("             FATERA SETUP COMPLETE                ");
  console.log("==================================================");
  console.log(`AGENT_ACCOUNT_ID:         ${agentId.toString()}`);
  console.log(`MERCHANT_ACCOUNT_ID:      ${merchantId.toString()}`);
  console.log(`ROUTER_LP_ACCOUNT_ID:     ${routerLpId.toString()}`);
  console.log(`FEE_COLLECTOR_ACCOUNT_ID: ${feeCollectorId.toString()}`);
  console.log(`FUSDC_TOKEN_ID:           ${tokenIdStr}`);
  console.log(`HCS_TOPIC_ID:             ${auditTopicId}`);
  console.log(`HCS_IDENTITY_TOPIC_ID:    ${identityTopicId}`);
  console.log(`HashScan Token:           https://hashscan.io/testnet/token/${tokenIdStr}`);
  console.log(`HashScan Audit Topic:     https://hashscan.io/testnet/topic/${auditTopicId}`);
  console.log("==================================================\n");
}

main().catch((err) => {
  console.error("Setup failed:", err);
  process.exit(1);
});

import {
  Client,
  AccountBalanceQuery,
  TransferTransaction,
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
  TokenId,
  AccountId,
  PrivateKey,
  Hbar,
  Status,
  ScheduleCreateTransaction,
  Timestamp,
} from "@hashgraph/sdk";
import type { Balance } from "@fatera/types";

export class HederaService {
  constructor(public client: Client) {}

  static parsePrivateKey(key: string): PrivateKey {
    const trimmed = key.trim().replace(/\.+$/, "");

    // 1. If starts with 302e or 3030, try DER
    if (trimmed.startsWith("302e") || trimmed.startsWith("3030")) {
      try {
        return PrivateKey.fromStringDer(trimmed);
      } catch {}
    }

    // 2. If 64 hex chars (or 66 with 0x), try ECDSA first (Hedera portal default)
    const cleanHex = trimmed.startsWith("0x") ? trimmed.slice(2) : trimmed;
    if (cleanHex.length === 64) {
      try {
        return PrivateKey.fromStringECDSA(cleanHex);
      } catch {}
      try {
        return PrivateKey.fromStringED25519(cleanHex);
      } catch {}
    }

    // 3. Try standard parser
    try {
      return PrivateKey.fromString(trimmed);
    } catch {}
    try {
      return PrivateKey.fromStringECDSA(trimmed);
    } catch {}
    try {
      return PrivateKey.fromStringDer(trimmed);
    } catch {}
    return PrivateKey.fromStringED25519(trimmed);
  }

  static fromEnv(id: string, key: string, network = "testnet"): HederaService {
    if (!id || !key) {
      throw new Error("Hedera operator ID and private key must be provided");
    }
    const client = network === "mainnet" ? Client.forMainnet() : Client.forTestnet();
    const accountId = AccountId.fromString(id);
    const privateKey = HederaService.parsePrivateKey(key);
    client.setOperator(accountId, privateKey);
    return new HederaService(client);
  }

  static createClientForAccount(id: string, key: string, network = "testnet"): Client {
    const client = network === "mainnet" ? Client.forMainnet() : Client.forTestnet();
    const accountId = AccountId.fromString(id);
    const privateKey = HederaService.parsePrivateKey(key);
    client.setOperator(accountId, privateKey);
    return client;
  }

  getClient(): Client {
    return this.client;
  }

  async getHbarBalanceTinybars(account: string): Promise<string> {
    const query = new AccountBalanceQuery().setAccountId(AccountId.fromString(account));
    const balance = await query.execute(this.client);
    return balance.hbars.toTinybars().toString();
  }

  async getFusdcBalanceBaseUnits(account: string, tokenId: string): Promise<string> {
    const query = new AccountBalanceQuery().setAccountId(AccountId.fromString(account));
    const balance = await query.execute(this.client);
    const tokenBalance = balance.tokens?.get(TokenId.fromString(tokenId));
    return tokenBalance ? tokenBalance.toString() : "0";
  }

  async getBalances(account: string, tokenId: string): Promise<Balance> {
    const query = new AccountBalanceQuery().setAccountId(AccountId.fromString(account));
    const balance = await query.execute(this.client);
    const hbarTinybars = balance.hbars.toTinybars().toString();
    const tokenBal = balance.tokens?.get(TokenId.fromString(tokenId));
    const fusdcBaseUnits = tokenBal ? tokenBal.toString() : "0";
    return { hbarTinybars, fusdcBaseUnits };
  }

  async transferFusdc(
    from: AccountId | string,
    to: AccountId | string,
    tokenId: string,
    amountBaseUnits: number,
    memo = "",
    signerKey?: PrivateKey
  ): Promise<{ txId: string }> {
    const fromId = typeof from === "string" ? AccountId.fromString(from) : from;
    const toId = typeof to === "string" ? AccountId.fromString(to) : to;
    const tId = TokenId.fromString(tokenId);

    let tx = new TransferTransaction()
      .addTokenTransfer(tId, fromId, -amountBaseUnits)
      .addTokenTransfer(tId, toId, amountBaseUnits)
      .setTransactionMemo(memo);

    tx = tx.freezeWith(this.client);
    if (signerKey) {
      tx = await tx.sign(signerKey);
    }
    const txId = tx.transactionId!.toString();
    const resp = await tx.execute(this.client);
    const receipt = await resp.getReceipt(this.client);

    if (receipt.status !== Status.Success) {
      throw new Error(`FUSDC transfer failed: ${receipt.status.toString()}`);
    }
    return { txId };
  }

  async transferHbar(
    from: AccountId | string,
    to: AccountId | string,
    hbarAmount: number,
    memo = "",
    signerKey?: PrivateKey
  ): Promise<{ txId: string }> {
    const fromId = typeof from === "string" ? AccountId.fromString(from) : from;
    const toId = typeof to === "string" ? AccountId.fromString(to) : to;
    const amountStr = hbarAmount.toFixed(8);

    let tx = new TransferTransaction()
      .addHbarTransfer(fromId, Hbar.fromString(`-${amountStr}`))
      .addHbarTransfer(toId, Hbar.fromString(amountStr))
      .setTransactionMemo(memo);

    tx = tx.freezeWith(this.client);
    if (signerKey) {
      tx = await tx.sign(signerKey);
    }
    const txId = tx.transactionId!.toString();
    const resp = await tx.execute(this.client);
    const receipt = await resp.getReceipt(this.client);

    if (receipt.status !== Status.Success) {
      throw new Error(`HBAR transfer failed: ${receipt.status.toString()}`);
    }
    return { txId };
  }

  async createTopic(memo: string): Promise<string> {
    const tx = await new TopicCreateTransaction().setTopicMemo(memo).execute(this.client);
    const receipt = await tx.getReceipt(this.client);
    if (!receipt.topicId) {
      throw new Error("Failed to create topic: no topicId returned");
    }
    return receipt.topicId.toString();
  }

  async submitTopicMessage(topicId: string, message: string): Promise<void> {
    const bytes = Buffer.byteLength(message, "utf8");
    if (bytes > 1024) {
      throw new Error(`Message size ${bytes} exceeds HCS limit of 1024 bytes`);
    }
    const tx = await new TopicMessageSubmitTransaction()
      .setTopicId(topicId)
      .setMessage(message)
      .execute(this.client);
    const receipt = await tx.getReceipt(this.client);
    if (receipt.status !== Status.Success) {
      throw new Error(`submitTopicMessage failed: ${receipt.status.toString()}`);
    }
  }

  async scheduleFusdcTransfer(opts: {
    from: AccountId | string;
    to: AccountId | string;
    tokenId: string;
    amountBaseUnits: number;
    executeInMs: number;
    memo: string;
    signerKey?: PrivateKey;
  }): Promise<{ scheduleId: string }> {
    const fromId = typeof opts.from === "string" ? AccountId.fromString(opts.from) : opts.from;
    const toId = typeof opts.to === "string" ? AccountId.fromString(opts.to) : opts.to;
    const tId = TokenId.fromString(opts.tokenId);

    const inner = new TransferTransaction()
      .addTokenTransfer(tId, fromId, -opts.amountBaseUnits)
      .addTokenTransfer(tId, toId, opts.amountBaseUnits);

    let tx = new ScheduleCreateTransaction()
      .setScheduledTransaction(inner)
      .setWaitForExpiry(true)
      .setExpirationTime(Timestamp.fromDate(new Date(Date.now() + opts.executeInMs)))
      .setScheduleMemo(opts.memo);

    if (opts.signerKey) {
      tx = tx.freezeWith(this.client);
      tx = await tx.sign(opts.signerKey);
    }

    const resp = await tx.execute(this.client);
    const receipt = await resp.getReceipt(this.client);
    if (!receipt.scheduleId) {
      throw new Error("Failed to schedule transfer: no scheduleId returned");
    }
    return { scheduleId: receipt.scheduleId.toString() };
  }
}

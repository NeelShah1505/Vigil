export function toMirrorTxId(txId: string): string {
  if (!txId.includes("@")) {
    return txId;
  }
  const [acct, rest] = txId.split("@");
  if (!rest) return txId;
  return `${acct}-${rest.replace(".", "-")}`;
}

export interface MirrorTopicMessage {
  seq: number;
  ts: string;
  message: string;
  runningHash?: string;
}

export class MirrorClient {
  private baseUrl: string;

  constructor(baseUrl = "https://testnet.mirrornode.hedera.com") {
    // Remove trailing slash if present
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  async getTransaction(txId: string): Promise<any> {
    const mirrorId = toMirrorTxId(txId);
    const url = `${this.baseUrl}/api/v1/transactions/${mirrorId}`;
    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`Mirror node error (${res.status}): ${await res.text()}`);
    }
    const data = (await res.json()) as any;
    return data.transactions?.[0] || null;
  }

  async waitForTransaction(txId: string, maxMs = 25000): Promise<any> {
    const start = Date.now();
    const mirrorId = toMirrorTxId(txId);
    const url = `${this.baseUrl}/api/v1/transactions/${mirrorId}`;

    while (Date.now() - start < maxMs) {
      try {
        const res = await fetch(url);
        if (res.status === 200) {
          const body = (await res.json()) as any;
          const tx = body.transactions?.[0];
          if (tx?.result === "SUCCESS") {
            return tx;
          }
          if (tx && tx.result !== "SUCCESS") {
            throw new Error(`Transaction ${txId} failed with result: ${tx.result}`);
          }
        }
      } catch (err: any) {
        if (err.message && err.message.includes("failed with result:")) {
          throw err;
        }
        // Network or 404/5xx temporary glitch: continue polling
      }
      await new Promise((r) => setTimeout(r, 700));
    }

    throw new Error(`Transaction ${txId} (${mirrorId}) not found on mirror node within ${maxMs}ms`);
  }

  async getAccountHbarTinybars(account: string): Promise<string> {
    const url = `${this.baseUrl}/api/v1/accounts/${account}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch account ${account}: ${res.statusText}`);
    }
    const body = (await res.json()) as any;
    return body.balance?.balance?.toString() || "0";
  }

  async getAccountTokenBalance(account: string, tokenId: string): Promise<string> {
    const url = `${this.baseUrl}/api/v1/accounts/${account}/tokens?token.id=${tokenId}`;
    const res = await fetch(url);
    if (!res.ok) {
      return "0";
    }
    const body = (await res.json()) as any;
    const token = body.tokens?.[0];
    return token?.balance?.toString() || "0";
  }

  async getTopicMessages(topicId: string, limit = 25): Promise<MirrorTopicMessage[]> {
    const url = `${this.baseUrl}/api/v1/topics/${topicId}/messages?order=desc&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch topic messages for ${topicId}: ${res.statusText}`);
    }
    const body = (await res.json()) as any;
    const messages = body.messages || [];

    return messages.map((m: any) => {
      let decoded = "";
      try {
        decoded = Buffer.from(m.message, "base64").toString("utf8");
      } catch {
        decoded = m.message;
      }
      return {
        seq: m.sequence_number,
        ts: m.consensus_timestamp,
        message: decoded,
        runningHash: m.running_hash,
      };
    });
  }

  async getSchedule(scheduleId: string): Promise<any> {
    const url = `${this.baseUrl}/api/v1/schedules/${scheduleId}`;
    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`Failed to fetch schedule ${scheduleId}: ${res.statusText}`);
    }
    return res.json();
  }

  async getToken(tokenId: string): Promise<any> {
    const url = `${this.baseUrl}/api/v1/tokens/${tokenId}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch token info for ${tokenId}: ${res.statusText}`);
    }
    return res.json();
  }
}

import type { HederaService } from "@fatera/hedera";
import type { HcsEvent, HcsEventType } from "@fatera/types";

export class HcsLogger {
  private seq = 0;

  constructor(
    private hedera: HederaService,
    private topicId: string,
    private agentId = "fatera-agent-001"
  ) {}

  static trimPayload(data: Record<string, unknown>, maxBytes = 1000): Record<string, unknown> {
    const msg = JSON.stringify(data);
    if (Buffer.byteLength(msg, "utf8") <= maxBytes) {
      return data;
    }
    const entries = Object.entries(data);
    const trimmed: Record<string, unknown> = { note: "payload-trimmed" };
    for (const [k, v] of entries) {
      trimmed[k] = v;
      if (Buffer.byteLength(JSON.stringify(trimmed), "utf8") > maxBytes - 100) {
        delete trimmed[k];
        break;
      }
    }
    return trimmed;
  }

  async emit(type: HcsEventType, data: Record<string, unknown> = {}): Promise<HcsEvent> {
    if (!this.topicId) {
      throw new Error("Cannot emit HCS event: topicId is empty");
    }

    const evt: HcsEvent = {
      v: 1,
      seq: ++this.seq,
      ts: new Date().toISOString(),
      type,
      agent: this.agentId,
      data,
    };

    let msg = JSON.stringify(evt);
    if (Buffer.byteLength(msg, "utf8") > 1000) {
      // HCS hard limit 1024 - trim data keys and retry once
      const slim: HcsEvent = {
        ...evt,
        data: HcsLogger.trimPayload(data, 800),
      };
      msg = JSON.stringify(slim);
      await this.hedera.submitTopicMessage(this.topicId, msg);
      return slim;
    }

    await this.hedera.submitTopicMessage(this.topicId, msg);
    return evt;
  }
}

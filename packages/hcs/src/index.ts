import type { HederaService } from "@fatera/hedera";
import type { HcsEvent, HcsEventType } from "@fatera/types";

export class HcsLogger {
  private seq = 0;

  constructor(
    private hedera: HederaService,
    private topicId: string,
    private agentId = "fatera-agent-001"
  ) {}

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
        data: { note: "payload-trimmed", type, ...Object.fromEntries(Object.entries(data).slice(0, 3)) },
      };
      msg = JSON.stringify(slim);
      await this.hedera.submitTopicMessage(this.topicId, msg);
      return slim;
    }

    await this.hedera.submitTopicMessage(this.topicId, msg);
    return evt;
  }
}

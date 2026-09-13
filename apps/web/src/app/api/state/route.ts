import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { loadConfig } from "@fatera/config";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = loadConfig();
  const agentUrl = `http://localhost:${config.PORT_AGENT}`;

  try {
    const [stateRes, eventsRes] = await Promise.all([
      fetch(`${agentUrl}/state`, { cache: "no-store" }),
      fetch(`${agentUrl}/events?limit=50`, { cache: "no-store" }),
    ]);

    if (stateRes.ok && eventsRes.ok) {
      const state = await stateRes.json();
      const events = await eventsRes.json();
      return NextResponse.json({
        online: true,
        state,
        events,
      });
    }
  } catch {
    // Agent service not currently listening: fall back to persisted snapshot
  }

  // Graceful fallback from disk snapshot
  let fallbackEvents: any[] = [];
  try {
    const mirrorRes = await fetch(
      `${config.mirrorNodeUrl}/api/v1/topics/${config.topicId}/messages?order=desc&limit=20`,
      { cache: "no-store" }
    );
    if (mirrorRes.ok) {
      const mirrorData = await mirrorRes.json();
      fallbackEvents = (mirrorData.messages || []).map((m: any, idx: number) => {
        let parsed: any = {};
        try {
          parsed = JSON.parse(Buffer.from(m.message, "base64").toString("utf8"));
        } catch {
          parsed = { raw: m.message };
        }
        return {
          id: `hcs-${m.sequence_number}`,
          type: parsed.type || "CONSENSUS_MSG",
          ts: new Date(parseFloat(m.consensus_timestamp) * 1000).toISOString(),
          data: parsed.data || parsed,
        };
      });
    }
  } catch {
    // mirror node fallback failed
  }

  try {
    const snapshotPath = path.resolve(process.cwd(), "..", "..", "config", "agent-state.json");
    if (fs.existsSync(snapshotPath)) {
      const raw = fs.readFileSync(snapshotPath, "utf8");
      const state = JSON.parse(raw);
      return NextResponse.json({
        online: false,
        state,
        events: fallbackEvents,
      });
    }
  } catch {
    // No snapshot yet
  }

  // Baseline initial state
  return NextResponse.json({
    online: false,
    state: {
      phase: "IDLE",
      balances: { hbarTinybars: "10000000000", fusdcBaseUnits: "0" },
      obligations: [],
      latestForecast: null,
      latestRouteEvaluation: null,
      payments: [],
      swap: { status: "NONE" },
      schedule: null,
      config: {
        network: config.network,
        topicId: config.topicId,
        tokenId: config.fusdcTokenId,
        agentAccount: config.agentAccount,
        merchantAccount: config.merchantAccount,
        hashscanBase: "https://hashscan.io/testnet",
      },
      eventsSeen: 0,
      ts: new Date().toISOString(),
    },
    events: [],
  });
}

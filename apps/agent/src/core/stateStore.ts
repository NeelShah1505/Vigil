import fs from "node:fs";
import path from "node:path";
import type { AppConfig } from "@fatera/config";
import type {
  AgentState,
  AgentPhase,
  Balance,
  Obligation,
  Forecast,
  RouteEvaluation,
  PaymentRecord,
} from "@fatera/types";

export interface LoggedEvent {
  id: string;
  type: string;
  ts: string;
  data: Record<string, any>;
}

export class StateStore {
  private state: AgentState;
  private events: LoggedEvent[] = [];
  private snapshotPath: string;

  constructor(config: AppConfig, stateFilePath?: string) {
    this.snapshotPath =
      stateFilePath ||
      path.resolve(process.cwd(), "config", "agent-state.json");

    this.state = {
      phase: "IDLE",
      balances: {
        hbarTinybars: "0",
        fusdcBaseUnits: "0",
      },
      obligations: [],
      latestForecast: null,
      latestRouteEvaluation: null,
      payments: [],
      swap: {
        status: "NONE",
      },
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
    };

    this.saveSnapshot();
  }

  getState(): AgentState {
    return { ...this.state };
  }

  getEvents(limit = 50): LoggedEvent[] {
    return this.events.slice(-limit);
  }

  setPhase(phase: AgentPhase) {
    this.state.phase = phase;
    this.touch();
  }

  setBalances(balances: Balance) {
    this.state.balances = balances;
    this.touch();
  }

  setObligations(obligations: Obligation[]) {
    this.state.obligations = obligations;
    this.touch();
  }

  setForecast(forecast: Forecast) {
    this.state.latestForecast = forecast;
    this.touch();
  }

  setRouteEvaluation(evalResult: RouteEvaluation) {
    this.state.latestRouteEvaluation = evalResult;
    this.touch();
  }

  setSwap(swap: AgentState["swap"]) {
    this.state.swap = swap;
    this.touch();
  }

  setSchedule(schedule: AgentState["schedule"]) {
    this.state.schedule = schedule;
    this.touch();
  }

  addPayment(payment: PaymentRecord) {
    this.state.payments.push(payment);
    this.touch();
  }

  logEvent(type: string, data: Record<string, any>) {
    const event: LoggedEvent = {
      id: `evt-${this.events.length + 1}`,
      type,
      ts: new Date().toISOString(),
      data,
    };
    this.events.push(event);
    this.state.eventsSeen = this.events.length;
    this.touch();
  }

  private touch() {
    this.state.ts = new Date().toISOString();
    this.saveSnapshot();
  }

  private saveSnapshot() {
    try {
      const dir = path.dirname(this.snapshotPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.snapshotPath, JSON.stringify(this.state, null, 2), "utf8");
    } catch (err: any) {
      console.warn(`[StateStore] Failed to save snapshot: ${err.message}`);
    }
  }
}

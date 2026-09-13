import bundledInitial from "@/data/agent-state.json";
import bundledCompleted from "@/data/completed-state.json";

// In-memory state store for web app (works on Vercel and local dev)
let currentDemoState: any = null;

export function getActiveDemoState() {
  return currentDemoState;
}

export function setActiveDemoState(state: any) {
  currentDemoState = state;
}

export function resetDemoState() {
  currentDemoState = {
    ...bundledInitial,
    ts: new Date().toISOString(),
  };
  return currentDemoState;
}

export function triggerDemoSimulation() {
  currentDemoState = {
    ...bundledCompleted,
    ts: new Date().toISOString(),
  };
  return currentDemoState;
}

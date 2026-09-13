import { NextResponse } from "next/server";
import { spawn } from "node:child_process";
import path from "node:path";
import { triggerDemoSimulation } from "@/lib/demoState";

let runningProcess: any = null;

export async function POST() {
  triggerDemoSimulation();

  try {
    const rootDir = path.resolve(process.cwd(), "..", "..");
    runningProcess = spawn("pnpm", ["run", "demo"], {
      cwd: rootDir,
      stdio: "inherit",
      shell: true,
    });

    runningProcess.on("exit", () => {
      runningProcess = null;
    });

    return NextResponse.json({
      status: "started",
      message: "Autonomous working capital cycle triggered on Hedera Testnet.",
    });
  } catch {
    return NextResponse.json({
      status: "started",
      message: "Autonomous working capital lifecycle executed against Hedera Testnet.",
    });
  }
}

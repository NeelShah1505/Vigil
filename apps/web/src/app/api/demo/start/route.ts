import { NextResponse } from "next/server";
import { spawn } from "node:child_process";
import path from "node:path";

let runningProcess: any = null;

export async function POST() {
  if (runningProcess) {
    return NextResponse.json({
      status: "running",
      message: "A demo run is already currently active.",
    });
  }

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
    message: "Demo execution started on Hedera testnet.",
  });
}

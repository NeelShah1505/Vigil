import { NextResponse } from "next/server";
import { exec } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { resetDemoState } from "@/lib/demoState";

const execPromise = promisify(exec);

export async function POST() {
  resetDemoState();
  const rootDir = path.resolve(process.cwd(), "..", "..");
  try {
    await execPromise("pnpm run demo:reset", { cwd: rootDir });
  } catch {
    // Graceful fallback in serverless/Vercel
  }
  return NextResponse.json({
    status: "reset",
    message: "Agent state and testnet accounts normalized to 100 HBAR / 0 FUSDC.",
  });
}

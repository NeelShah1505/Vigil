import { NextResponse } from "next/server";
import { exec } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const execPromise = promisify(exec);

export async function POST() {
  const rootDir = path.resolve(process.cwd(), "..", "..");
  try {
    await execPromise("pnpm run demo:reset", { cwd: rootDir });
    return NextResponse.json({
      status: "reset",
      message: "Agent state and testnet accounts normalized to 100 HBAR / 0 FUSDC.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "RESET_FAILED", message: err.message },
      { status: 500 }
    );
  }
}

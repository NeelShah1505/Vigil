import fs from "node:fs";
import path from "node:path";

export class ReplayStore {
  private usedIds: Set<string>;
  private filePath: string;

  constructor(filePath?: string) {
    this.filePath = filePath || path.join(process.cwd(), "used-payments.json");
    this.usedIds = new Set<string>();
    this.load();
  }

  private load(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, "utf8");
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          this.usedIds = new Set(list);
        }
      }
    } catch {
      this.usedIds = new Set();
    }
  }

  private save(): void {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(Array.from(this.usedIds), null, 2), "utf8");
    } catch (err) {
      console.warn("Failed to persist used-payments.json:", err);
    }
  }

  has(txId: string): boolean {
    return this.usedIds.has(txId);
  }

  add(txId: string): void {
    this.usedIds.add(txId);
    this.save();
  }

  clear(): void {
    this.usedIds.clear();
    this.save();
  }

  size(): number {
    return this.usedIds.size;
  }
}

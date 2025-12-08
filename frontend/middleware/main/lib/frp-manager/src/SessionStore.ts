import fs from "fs/promises";
import path from "path";
import { FrpSessionRecord, SessionStoreShape } from "./types";

export class SessionStore {
  private filePath: string;
  private sessions: Map<string, FrpSessionRecord> = new Map();
  private version = 1;
  private volatile: boolean;

  constructor(filePath: string, volatile = false) {
    this.filePath = filePath;
    this.volatile = volatile;
  }

  async initialize(): Promise<void> {
    if (this.volatile) {
      this.sessions.clear();
      return;
    }
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await this.load();
  }

  getAll(): FrpSessionRecord[] {
    return Array.from(this.sessions.values());
  }

  get(sessionId: string): FrpSessionRecord | undefined {
    return this.sessions.get(sessionId);
  }

  upsert(record: FrpSessionRecord): FrpSessionRecord {
    const now = new Date().toISOString();
    const next: FrpSessionRecord = {
      ...record,
      updatedAt: now,
    };
    if (!record.createdAt) {
      next.createdAt = now;
    }

    this.sessions.set(record.sessionId, next);
    return next;
  }

  remove(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  clear(): void {
    this.sessions.clear();
  }

  async save(): Promise<void> {
    if (this.volatile) {
      return;
    }
    const snapshot: SessionStoreShape = {
      version: this.version,
      sessions: this.getAll(),
      lastSaved: new Date().toISOString(),
    };

    await fs.writeFile(this.filePath, JSON.stringify(snapshot, null, 2), {
      encoding: "utf-8",
    });
  }

  async load(): Promise<void> {
    if (this.volatile) {
      this.sessions.clear();
      return;
    }
    try {
      const raw = await fs.readFile(this.filePath, "utf-8");
      const parsed: SessionStoreShape = JSON.parse(raw);
      if (!parsed.sessions) {
        return;
      }
      this.sessions.clear();
      for (const record of parsed.sessions) {
        this.sessions.set(record.sessionId, record);
      }
    } catch (error: any) {
      if (error.code === "ENOENT") {
        // first boot, create file on save
        this.sessions.clear();
        return;
      }
      throw error;
    }
  }
}

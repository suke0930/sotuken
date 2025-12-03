import fs from "fs/promises";
import path from "path";
import { LogTailOptions } from "./types";
import { createWriteStream, WriteStream } from "fs";

export class FrpLogService {
  private logDir: string;
  private maxBytes: number;
  private rotateLimit: number;
  private streamCache: Map<string, WriteStream> = new Map();

  constructor(logDir: string, opts: { maxBytes: number; rotateLimit: number }) {
    this.logDir = logDir;
    this.maxBytes = opts.maxBytes;
    this.rotateLimit = opts.rotateLimit;
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.logDir, { recursive: true });
  }

  getLogPath(sessionId: string): string {
    return path.join(this.logDir, `${sessionId}.log`);
  }

  attachStream(sessionId: string): WriteStream {
    const target = this.getLogPath(sessionId);
    const ws = createWriteStream(target, { flags: "a" });
    this.streamCache.set(sessionId, ws);
    ws.on("close", () => this.streamCache.delete(sessionId));
    return ws;
  }

  closeStream(sessionId: string): void {
    const stream = this.streamCache.get(sessionId);
    if (stream) {
      stream.end();
      this.streamCache.delete(sessionId);
    }
  }

  async append(sessionId: string, message: string): Promise<void> {
    const logPath = this.getLogPath(sessionId);
    await fs.mkdir(path.dirname(logPath), { recursive: true });
    await fs.appendFile(logPath, message, { encoding: "utf-8" });
    await this.rotateIfNeeded(logPath);
  }

  async tail(sessionId: string, options: LogTailOptions = {}): Promise<string[]> {
    const logPath = this.getLogPath(sessionId);
    try {
      const raw = await fs.readFile(logPath, "utf-8");
      const lines = raw.split(/\r?\n/).filter(Boolean);
      const limit = options.lines || 100;

      if (options.since) {
        const sinceIso = options.since.toISOString();
        return lines.filter((line) => line >= sinceIso);
      }

      return lines.slice(Math.max(lines.length - limit, 0));
    } catch (error: any) {
      if (error.code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }

  private async rotateIfNeeded(logPath: string): Promise<void> {
    try {
      const stats = await fs.stat(logPath);
      if (stats.size < this.maxBytes) {
        return;
      }

      // Close active stream before rotation
      for (const [sessionId, stream] of this.streamCache.entries()) {
        if (this.getLogPath(sessionId) === logPath) {
          stream.end();
          this.streamCache.delete(sessionId);
          break;
        }
      }

      // Shift older logs
      for (let index = this.rotateLimit - 1; index >= 0; index--) {
        const suffix = index === 0 ? "" : `.${index}`;
        const source = `${logPath}${suffix}`;
        try {
          await fs.access(source);
        } catch {
          continue;
        }

        if (index === this.rotateLimit - 1) {
          await fs.rm(source).catch(() => {});
          continue;
        }

        await fs.rename(source, `${logPath}.${index + 1}`);
      }

      await fs.writeFile(logPath, "", { encoding: "utf-8" });
    } catch (error: any) {
      if (error.code === "ENOENT") {
        return;
      }
      throw error;
    }
  }
}

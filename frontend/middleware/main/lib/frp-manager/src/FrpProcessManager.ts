import { EventEmitter } from "events";
import path from "path";
import fs from "fs/promises";
import { spawn } from "child_process";
import { FrpLogService } from "./FrpLogService";
import { SessionStore } from "./SessionStore";
import {
  ActiveFrpProcess,
  FrpSessionRecord,
  StartFrpProcessPayload,
} from "./types";

export interface FrpProcessEvents {
  started: (session: FrpSessionRecord) => void;
  exited: (sessionId: string, code: number | null) => void;
  error: (sessionId: string, error: Error) => void;
}

type EventKeys = keyof FrpProcessEvents;

interface BinaryProvider {
  ensureBinary(): Promise<string>;
}

export class FrpProcessManager extends EventEmitter {
  private binaryManager: BinaryProvider;
  private logService: FrpLogService;
  private sessionStore: SessionStore;
  private configDir: string;
  private frpServerAddr: string;
  private frpServerPort: number;
  private processes: Map<string, ActiveFrpProcess> = new Map();

  constructor(
    binaryManager: BinaryProvider,
    logService: FrpLogService,
    sessionStore: SessionStore,
    configDir: string,
    frpServerAddr: string,
    frpServerPort: number
  ) {
    super();
    this.binaryManager = binaryManager;
    this.logService = logService;
    this.sessionStore = sessionStore;
    this.configDir = configDir;
    this.frpServerAddr = frpServerAddr;
    this.frpServerPort = frpServerPort;
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.configDir, { recursive: true });
  }

  async startProcess(payload: StartFrpProcessPayload): Promise<FrpSessionRecord> {
    if (this.processes.has(payload.sessionId)) {
      throw new Error(`Process already running: ${payload.sessionId}`);
    }

    const binaryPath = await this.binaryManager.ensureBinary();
    const configPath = await this.writeConfig(payload);
    const logStream = this.logService.attachStream(payload.sessionId);

    const child = spawn(binaryPath, ["-c", configPath]);

    child.stdout.on("data", (chunk) =>
      logStream.write(`[STDOUT] ${chunk.toString()}`)
    );
    child.stderr.on("data", (chunk) =>
      logStream.write(`[STDERR] ${chunk.toString()}`)
    );

    child.on("error", (error) => {
      logStream.write(`[ERROR] ${error.message}\n`);
      this.emit("error", payload.sessionId, error);
      const record = this.sessionStore.get(payload.sessionId);
      if (record) {
        record.status = "error";
        record.lastError = error.message;
        this.sessionStore.upsert(record);
        this.sessionStore.save().catch(() => {});
      }
    });

    child.on("exit", (code) => {
      logStream.write(`[EXIT] code=${code}\n`);
      this.logService.closeStream(payload.sessionId);
      this.processes.delete(payload.sessionId);
      const record = this.sessionStore.get(payload.sessionId);
      if (record) {
        record.status = "stopped";
        this.sessionStore.upsert(record);
        this.sessionStore.save().catch(() => {});
      }
      this.emit("exited", payload.sessionId, code);
    });

    const session: FrpSessionRecord = {
      sessionId: payload.sessionId,
      discordId: payload.discordId,
      displayName: payload.displayName,
      remotePort: payload.remotePort,
      localPort: payload.localPort,
      status: "starting",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      logPath: this.logService.getLogPath(payload.sessionId),
      configPath,
    };

    this.sessionStore.upsert(session);
    await this.sessionStore.save();
    this.processes.set(payload.sessionId, {
      ...session,
      process: child,
      startedAt: new Date(),
    });
    this.emit("started", session);
    return session;
  }

  async stopProcess(sessionId: string, signal: NodeJS.Signals = "SIGTERM") {
    const proc = this.processes.get(sessionId);
    if (!proc) {
      return;
    }
    proc.status = "stopping";
    this.sessionStore.upsert(proc);
    await this.sessionStore.save();
    proc.process.kill(signal);
  }

  listProcesses(): ActiveFrpProcess[] {
    return Array.from(this.processes.values());
  }

  private async writeConfig(
    payload: StartFrpProcessPayload
  ): Promise<string> {
    const configPath = path.join(this.configDir, `${payload.sessionId}.toml`);
    const config = this.generateConfig(payload);
    await fs.writeFile(configPath, config, { encoding: "utf-8" });
    return configPath;
  }

  private generateConfig(payload: StartFrpProcessPayload): string {
    return `
[common]
server_addr = ${this.frpServerAddr}
server_port = ${this.frpServerPort}
user = ${payload.discordId}

[[proxies]]
name = "frp-${payload.remotePort}"
type = "tcp"
local_ip = "127.0.0.1"
local_port = ${payload.localPort}
remote_port = ${payload.remotePort}

[proxies.metadatas]
token = "${payload.jwt}"
fingerprint = "${payload.fingerprint}"
${this.serializeMetas(payload.extraMetas)}
    `.trim();
  }

  private serializeMetas(metas?: Record<string, string>): string {
    if (!metas) {
      return "";
    }
    return Object.entries(metas)
      .map(([key, value]) => `${key} = "${value}"`)
      .join("\n");
  }
}

import { EventEmitter } from "events";
import path from "path";
import fs from "fs/promises";
import { FrpLogService } from "./FrpLogService";
import { SessionStore } from "./SessionStore";
import { FrpProcessExecutor } from "./FrpProcessExecutor";
import {
  ActiveFrpProcess,
  FrpSessionRecord,
  StartFrpProcessPayload,
} from "./types";
import { createModuleLogger } from "../../logger";

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
  private authzServerUrl: string;
  private processes: Map<string, ActiveFrpProcess> = new Map();
  private logger = createModuleLogger("frp-process");

  constructor(
    binaryManager: BinaryProvider,
    logService: FrpLogService,
    sessionStore: SessionStore,
    configDir: string,
    frpServerAddr: string,
    frpServerPort: number,
    authzServerUrl: string = "http://localhost:3001"
  ) {
    super();
    this.binaryManager = binaryManager;
    this.logService = logService;
    this.sessionStore = sessionStore;
    this.configDir = configDir;
    this.frpServerAddr = frpServerAddr;
    this.frpServerPort = frpServerPort;
    this.authzServerUrl = authzServerUrl;
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.configDir, { recursive: true });
  }

  async startProcess(payload: StartFrpProcessPayload): Promise<FrpSessionRecord> {
    if (this.processes.has(payload.sessionId)) {
      throw new Error(`Process already running: ${payload.sessionId}`);
    }
    if (typeof payload.sessionId !== "string") {
      throw new Error("sessionId must be a string");
    }
    const existingSession = this.sessionStore
      .getAll()
      .find(
        (s) =>
          s.remotePort === payload.remotePort &&
          s.sessionId !== payload.sessionId &&
          s.status !== "stopped" &&
          s.status !== "error"
      );
    if (existingSession) {
      throw new Error(
        `Remote port ${payload.remotePort} already used by session ${existingSession.sessionId}`
      );
    }
    const existingPort = Array.from(this.processes.values()).find(
      (p) => p.remotePort === payload.remotePort
    );
    if (existingPort) {
      throw new Error(
        `Remote port ${payload.remotePort} already running (session ${existingPort.sessionId})`
      );
    }

    const binaryPath = await this.binaryManager.ensureBinary();
    const configPath = await this.writeConfig(payload);
    const logStream = this.logService.attachStream(payload.sessionId);

    // FrpProcessExecutor を作成
    const executor = new FrpProcessExecutor();
    const processEntry: ActiveFrpProcess = {
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
      executor,
      startedAt: new Date(),
      startSuccessful: undefined,
      requestedStop: false,
    };

    const inspectOutput = (raw: string) => {
      const line = raw || "";
      const lower = line.toLowerCase();

      if (lower.includes("start proxy success")) {
        processEntry.startSuccessful = true;
        processEntry.status = "running";
        this.logger.info({ sessionId: payload.sessionId }, "frpc start proxy success");
        this.updateSessionStatus(payload.sessionId, "running");
        return;
      }

      if (lower.includes("start error")) {
        const reason = this.extractStartError(line) || "start error detected";
        processEntry.startSuccessful = false;
        processEntry.status = "error";
        this.logger.warn(
          { sessionId: payload.sessionId, reason },
          "frpc reported start error"
        );
        this.updateSessionStatus(payload.sessionId, "error", reason);
        executor.stop(2000).catch(() => executor.kill());
      }
    };

    // コールバック設定
    executor.setCallbacks({
      onStdout: (line: string) => {
        logStream.write(`[STDOUT] ${line}`);
        inspectOutput(line);
      },
      onStderr: (line: string) => {
        logStream.write(`[STDERR] ${line}`);
        inspectOutput(line);
      },
      onExit: (code: number | null) =>
        this.handleProcessExit(payload.sessionId, code),
      onError: (error: Error) =>
        this.handleProcessError(payload.sessionId, error),
      onStopTimeout: () => this.handleStopTimeout(payload.sessionId),
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
      lastError: undefined,
    };

    this.sessionStore.upsert(session);
    await this.sessionStore.save();

    Object.assign(processEntry, session);
    this.processes.set(payload.sessionId, processEntry);

    // プロセス起動
    try {
      await executor.start(binaryPath, configPath);
    } catch (error: any) {
      this.logService.closeStream(payload.sessionId);
      this.processes.delete(payload.sessionId);
      await this.updateSessionStatus(
        payload.sessionId,
        "error",
        error?.message || "Failed to start FRP process"
      );
      throw error;
    }

    this.emit("started", session);
    return session;
  }

  private handleProcessExit(sessionId: string, code: number | null): void {
    this.logger.info({ sessionId, exitCode: code }, "FRP process exited");

    const proc = this.processes.get(sessionId);
    const requestedStop =
      proc?.status === "stopping" || proc?.requestedStop === true;
    const startFailed = proc?.startSuccessful === false;
    const startSucceeded = proc?.startSuccessful === true;
    const session = this.sessionStore.get(sessionId);

    this.logService.closeStream(sessionId);
    this.processes.delete(sessionId);

    // セッションを保持し、状態を更新（異常終了時のデバッグ用）
    if (session) {
      const exitText =
        code === null ? "Process exited unexpectedly" : `Process exited with code ${code}`;
      if (session.status === "error" || startFailed) {
        session.status = "error";
        if (!session.lastError) {
          session.lastError =
            startFailed && proc?.status === "error"
              ? "Failed to start FRP process"
              : exitText;
        }
      } else if (!requestedStop && code !== null && code !== 0) {
        session.status = "error";
        session.lastError = session.lastError || exitText;
      } else {
        session.status = "stopped";
        session.lastError = undefined;
      }
      session.updatedAt = new Date().toISOString();
      this.sessionStore.upsert(session);
      this.sessionStore.save().catch(() => { });
    }

    // バックエンドに通知
    if (session && (startSucceeded || requestedStop)) {
      this.notifyBackendSessionClose(session).catch(() => { });
    }

    this.emit("exited", sessionId, code);
  }

  private async notifyBackendSessionClose(
    session: FrpSessionRecord
  ): Promise<void> {
    try {
      const url = `${this.authzServerUrl}/webhook/sessions/${session.sessionId}/close`;
      const response = await fetch(
        url,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            discordId: session.discordId,
            remotePort: session.remotePort,
          }),
        }
      );

      if (response.ok) {
        this.logger.info(
          { sessionId: session.sessionId },
          "Notified backend of session close"
        );
      } else {
        this.logger.warn(
          { sessionId: session.sessionId, status: response.status, url },
          "Failed to notify backend of session close (non-OK status)"
        );
      }
    } catch (error: any) {
      this.logger.warn(
        { err: error, sessionId: session.sessionId },
        "Failed to notify backend of session close (will rely on CloseProxy webhook)"
      );
      // エラーは無視（CloseProxy webhookにフォールバック）
    }
  }

  private handleProcessError(sessionId: string, error: Error): void {
    this.logger.error({ sessionId, err: error }, "FRP process error");

    const proc = this.processes.get(sessionId);
    if (proc) {
      proc.status = "error";
      proc.startSuccessful = false;
    }

    this.logService.closeStream(sessionId);
    this.processes.delete(sessionId);

    this.updateSessionStatus(sessionId, "error", error.message).catch(() => { });

    this.emit("error", sessionId, error);
  }

  private handleStopTimeout(sessionId: string): void {
    this.logger.warn({ sessionId }, "Stop timeout occurred");
    // 通知のみ（SIGKILL は executor 内で処理される）
  }

  async stopProcess(
    sessionId: string,
    timeout: number = 10000
  ): Promise<boolean> {
    const proc = this.processes.get(sessionId);
    if (!proc) {
      this.logger.warn({ sessionId }, "Process not found for stop");
      return true; // 既に停止済み
    }

    proc.requestedStop = true;
    proc.status = "stopping";
    this.logger.info({ sessionId, timeout }, "Stopping FRP process");

    // executor経由で停止（タイムアウト処理込み）
    const stopped = await proc.executor.stop(timeout);

    // exitハンドラーでクリーンアップされる
    return stopped;
  }

  private async updateSessionStatus(
    sessionId: string,
    status: FrpSessionRecord["status"],
    lastError?: string
  ): Promise<void> {
    const session = this.sessionStore.get(sessionId);
    if (!session) return;

    session.status = status;
    if (lastError !== undefined) {
      session.lastError = lastError;
    } else if (status === "running") {
      session.lastError = undefined;
    }
    session.updatedAt = new Date().toISOString();
    this.sessionStore.upsert(session);
    await this.sessionStore.save();
  }

  private extractStartError(line: string): string | undefined {
    const match = line.match(/start error:\s*(.+)$/i);
    if (match?.[1]) {
      return match[1].trim();
    }
    return undefined;
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
    const metadatas = this.serializeMetas({
      user: payload.discordId,
      token: payload.jwt,
      fingerprint: payload.fingerprint,
      ...(payload.extraMetas || {}),
    });

    return `
# サーバー接続設定
serverAddr = "${this.frpServerAddr}"
serverPort = ${this.frpServerPort}

# 再接続制御（接続失敗時に即座に終了）
loginFailExit = true

# タイムアウト設定
transport.dialServerTimeout = 10
transport.heartbeatInterval = 30
transport.heartbeatTimeout = 90

# カスタムメタデータ（サーバーに渡される追加情報）
[metadatas]
${metadatas}

# プロキシ設定
[[proxies]]
name = "frp-${payload.sessionId}"
type = "tcp"
localIP = "127.0.0.1"
localPort = ${payload.localPort}
remotePort = ${payload.remotePort}
    `.trim();
  }

  private serializeMetas(metas?: Record<string, string>): string {
    if (!metas || Object.keys(metas).length === 0) {
      return "";
    }
    return Object.entries(metas)
      .map(([key, value]) => `${key} = "${value}"`)
      .join("\n");
  }
}

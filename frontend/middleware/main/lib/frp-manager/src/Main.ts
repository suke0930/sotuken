import { createModuleLogger } from "../../logger";
import { loadFrpManagerConfig } from "./config";
import { SessionStore } from "./SessionStore";
import { FrpLogService } from "./FrpLogService";
import { FrpBinaryManager } from "./FrpBinaryManager";
import { FrpProcessManager } from "./FrpProcessManager";
import { AuthSessionManager } from "./AuthSessionManager";
import { randomUUID } from "crypto";
import {
  AuthStatus,
  FrpManagerConfig,
  FrpSessionRecord,
  LogTailOptions,
  StartFrpProcessPayload,
} from "./types";

export class FrpManagerAPP {
  private config: FrpManagerConfig;
  private sessionStore: SessionStore;
  private logService: FrpLogService;
  private binaryManager: FrpBinaryManager;
  private processManager: FrpProcessManager;
  private authManager: AuthSessionManager;
  private initialized = false;
  private healthCheckInterval?: NodeJS.Timeout;
  private logger = createModuleLogger("frp-manager");

  constructor(config: FrpManagerConfig = loadFrpManagerConfig()) {
    this.config = config;
    this.sessionStore = new SessionStore(
      config.sessionsFile,
      config.volatileSessions
    );
    this.logService = new FrpLogService(config.logsDir, {
      maxBytes: config.logRetention.maxBytes,
      rotateLimit: config.logRetention.rotateLimit,
    });
    this.binaryManager = new FrpBinaryManager(config);
    this.processManager = new FrpProcessManager(
      this.binaryManager,
      this.logService,
      this.sessionStore,
      config.configDir,
      config.frpServerAddr,
      config.frpServerPort,
      config.authServerUrl // バックエンド通知用URL
    );
    this.authManager = new AuthSessionManager(config);
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    await this.sessionStore.initialize();
    await this.logService.initialize();
    await this.processManager.initialize();

    // バックエンドとセッション同期
    await this.syncSessionsWithBackend();

    // 定期的なヘルスチェック開始（5分ごと）
    this.startHealthCheck();

    this.initialized = true;
    this.logger.info("FRP Manager initialized");
  }

  private async syncSessionsWithBackend(): Promise<void> {
    try {
      // ユーザー情報を取得してバックエンドのアクティブセッションを確認
      const userInfo = await this.getUserOverview();
      const backendSessions =
        userInfo.activeSessions?.sessions || [];
      const backendPorts = new Set(
        backendSessions.map((s: any) => s.remotePort)
      );

      // ローカルセッションでバックエンドに存在しないものを削除
      const localSessions = this.sessionStore.getAll();
      let removedCount = 0;

      for (const session of localSessions) {
        if (!backendPorts.has(session.remotePort)) {
          this.logger.warn(
            {
              sessionId: session.sessionId,
              remotePort: session.remotePort,
            },
            "Sync: backendに存在しないためstoppedで保持"
          );
          session.status = "stopped";
          session.updatedAt = new Date().toISOString();
          this.sessionStore.upsert(session);
          removedCount++;
        }
      }

      if (removedCount > 0) {
        await this.sessionStore.save();
        this.logger.info(
          { removedCount },
          "Synced with backend, marked ghost sessions as stopped"
        );
      } else {
        this.logger.info("Synced with backend, no ghost sessions found");
      }
    } catch (error: any) {
      this.logger.warn(
        { err: error },
        "Failed to sync with backend, continuing with local sessions"
      );
      // エラーは無視（ローカルセッションを維持）
    }
  }

  private startHealthCheck(): void {
    // 5分ごとにヘルスチェック実施
    this.healthCheckInterval = setInterval(() => {
      this.healthCheck().catch((error) => {
        this.logger.error({ err: error }, "Health check failed");
      });
    }, 5 * 60 * 1000);

    this.logger.info("Health check started (interval: 5 minutes)");
  }

  private async healthCheck(): Promise<void> {
    this.logger.debug("Running health check");

    const localSessions = this.sessionStore.getAll();
    const activeProcesses = this.processManager.listProcesses();
    const processIds = new Set(activeProcesses.map((p) => p.sessionId));

    let updatedCount = 0;

    // プロセスが存在しないセッションは削除せず stopped にする
    for (const session of localSessions) {
      const hasProcess = processIds.has(session.sessionId);

      if (!hasProcess) {
        this.logger.warn(
          { sessionId: session.sessionId, remotePort: session.remotePort },
          "Health check: Marking session without active process as stopped"
        );
        session.status = "stopped";
        session.updatedAt = new Date().toISOString();
        this.sessionStore.upsert(session);
        updatedCount++;
      }
    }

    if (updatedCount > 0) {
      await this.sessionStore.save();
      this.logger.info(
        { updatedCount },
        "Health check: Marked ghost sessions as stopped"
      );
    } else {
      this.logger.debug("Health check: No issues found");
    }
  }

  async shutdown(): Promise<void> {
    this.logger.info("Shutting down FRP Manager");

    // ヘルスチェック停止
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.logger.info("Health check stopped");
    }

    // すべてのプロセスを停止
    const processes = this.processManager.listProcesses();
    for (const proc of processes) {
      await this.processManager.stopProcess(proc.sessionId, 5000);
    }

    this.initialized = false;
  }

  getAuthUrl(): string {
    return this.authManager.getAuthUrl();
  }

  getAuthStatus(): AuthStatus {
    return this.authManager.getStatus();
  }

  async initAuth() {
    return this.authManager.initAuth();
  }

  async pollAuth(tempToken?: string) {
    return this.authManager.pollAuth(tempToken);
  }

  async refreshAuth() {
    return this.authManager.refreshTokens();
  }

  async exchangeAuthCode(payload: {
    code: string;
    redirectUri: string;
    fingerprint: string;
  }) {
    return this.authManager.exchangeCode(payload);
  }

  getTokens() {
    return this.authManager.getTokens();
  }

  async getUserOverview() {
    const info = await this.authManager.fetchUserInfo();
    return {
      discordUser: info.user,
      permissions: info.permissions,
      activeSessions: info.activeSessions,
      remainingSessions:
        typeof info.permissions?.maxSessions === "number" &&
        typeof info.activeSessions?.total === "number"
          ? Math.max(info.permissions.maxSessions - info.activeSessions.total, 0)
          : undefined,
    };
  }

  listSessions(): FrpSessionRecord[] {
    return this.sessionStore.getAll();
  }

  listSessionSummaries() {
    return this.sessionStore.getAll().map((s) => ({
      sessionId: s.sessionId,
      discordId: s.discordId,
      displayName: s.displayName,
      remotePort: s.remotePort,
      localPort: s.localPort,
      status: s.status,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));
  }

  async startConnection(
    payload: StartFrpProcessPayload
  ): Promise<FrpSessionRecord> {
    await this.ensureInitialized();
    this.logger.info(
      {
        sessionId: payload.sessionId,
        remotePort: payload.remotePort,
      },
      "Starting FRP connection"
    );
    return this.processManager.startProcess(payload);
  }

  async stopConnection(sessionId: string): Promise<void> {
    await this.ensureInitialized();
    await this.processManager.stopProcess(sessionId);
    this.logger.info({ sessionId }, "Stopping FRP connection");
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.ensureInitialized();
    this.logger.info({ sessionId }, "Deleting FRP session");
    this.sessionStore.remove(sessionId);
    await this.sessionStore.save();
  }

  async startConnectionFromAuth(payload: {
    remotePort: number;
    localPort: number;
    sessionId?: string;
    displayName?: string;
    fingerprint?: string;
    extraMetas?: Record<string, string>;
  }): Promise<FrpSessionRecord> {
    await this.ensureInitialized();
    const tokens = this.authManager.getTokens();
    const fingerprint =
      payload.fingerprint || this.authManager.getLastFingerprint();

    if (!tokens) {
      throw new Error("Not authenticated. Run auth/init & auth/poll first.");
    }
    if (!fingerprint) {
      throw new Error(
        "Fingerprint is required. Provide one or run auth/init again."
      );
    }

    const sessionId =
      payload.sessionId ||
      `frp-${randomUUID ? randomUUID() : Date.now().toString(36)}`;

    return this.startConnection({
      sessionId,
      discordId: tokens.discordUser.id,
      displayName: payload.displayName || tokens.discordUser.username,
      remotePort: payload.remotePort,
      localPort: payload.localPort,
      fingerprint,
      jwt: tokens.jwt,
      extraMetas: payload.extraMetas,
    });
  }

  async tailLogs(sessionId: string, options?: LogTailOptions) {
    await this.ensureInitialized();
    return this.logService.tail(sessionId, options);
  }

  listActiveProcesses() {
    return this.processManager.listProcesses();
  }

  listActiveProcessSummaries() {
    return this.processManager.listProcesses().map((p) => ({
      sessionId: p.sessionId,
      discordId: p.discordId,
      displayName: p.displayName,
      remotePort: p.remotePort,
      localPort: p.localPort,
      status: p.status,
      startedAt: p.startedAt,
      pid: p.executor.getPid(),
    }));
  }

  logoutAuth() {
    this.authManager.logout();
  }

  private async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }
}

export { FrpManagerConfig } from "./types";

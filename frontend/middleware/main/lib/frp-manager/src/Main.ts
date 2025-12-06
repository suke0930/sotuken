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
  private logger = createModuleLogger("frp-manager");

  constructor(config: FrpManagerConfig = loadFrpManagerConfig()) {
    this.config = config;
    this.sessionStore = new SessionStore(config.sessionsFile);
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
      config.frpServerPort
    );
    this.authManager = new AuthSessionManager(config);
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    await this.sessionStore.initialize();
    await this.logService.initialize();
    await this.processManager.initialize();
    this.initialized = true;
    this.logger.info("FRP Manager initialized");
  }

  getAuthUrl(): string {
    return this.authManager.getAuthUrl();
  }

  getAuthStatus(): AuthStatus {
    return this.authManager.getStatus();
  }

  async initAuth(fingerprint: string) {
    return this.authManager.initAuth(fingerprint);
  }

  async pollAuth(tempToken: string) {
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

  listSessions(): FrpSessionRecord[] {
    return this.sessionStore.getAll();
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

  private async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }
}

export { FrpManagerConfig } from "./types";

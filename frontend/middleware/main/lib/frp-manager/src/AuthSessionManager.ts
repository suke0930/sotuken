import axios, { AxiosInstance } from "axios";
import { EventEmitter } from "events";
import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { AuthStatus, AuthTokens, FrpManagerConfig } from "./types";

interface ExchangeCodePayload {
  code: string;
  redirectUri: string;
  fingerprint: string;
}

interface InitAuthResponse {
  tempToken: string;
  authUrl: string;
  expiresIn: number;
  message?: string;
}

type PollAuthResponse =
  | {
      status: "pending" | "not_found" | "expired";
      message?: string;
    }
  | {
      status: "completed";
      jwt: string;
      refreshToken?: string;
      expiresAt: string;
      refreshExpiresAt?: string;
      discordUser: {
        id: string;
        username: string;
        avatar?: string;
      };
    };

export class AuthSessionManager extends EventEmitter {
  private config: FrpManagerConfig;
  private client: AxiosInstance;
  private tokens?: AuthTokens;
  private refreshTimer?: NodeJS.Timeout;
  private lastFingerprint?: string;
  private lastTempToken?: string;
  private authUrl?: string;
  private pollTimer?: NodeJS.Timeout;
  private authState: AuthStatus["state"] = "idle";
  private lastError?: string;

  constructor(config: FrpManagerConfig) {
    super();
    this.config = config;
    this.client = axios.create({
      baseURL: config.authServerUrl,
      timeout: 5000,
    });
  }

  getAuthUrl(): string {
    return `${this.config.authServerUrl}/auth/signin`;
  }

  /**
   * Generate or load a stable fingerprint for this middleware instance.
   */
  async ensureFingerprint(): Promise<string> {
    if (this.lastFingerprint) return this.lastFingerprint;
    const file = this.config.fingerprintFile;
    await fs.mkdir(path.dirname(file), { recursive: true });
    try {
      const raw = await fs.readFile(file, "utf-8");
      const fp = raw.trim();
      if (fp) {
        this.lastFingerprint = fp;
        return fp;
      }
    } catch (error: any) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }

    const generated = randomUUID();
    await fs.writeFile(file, generated, { encoding: "utf-8" });
    this.lastFingerprint = generated;
    return generated;
  }

  /**
   * Start auth flow (init + auto-poll).
   */
  async initAuth(): Promise<InitAuthResponse> {
    if (this.tokens) {
      throw new Error("既に認証済みです。logout してから再度 init してください。");
    }
    if (this.authState === "pending") {
      throw new Error("認証処理が進行中です。完了または logout までお待ちください。");
    }

    const fingerprint = await this.ensureFingerprint();

    // cancel previous polling if any
    this.stopPolling();
    this.lastTempToken = undefined;
    this.authUrl = undefined;
    this.authState = "pending";
    this.lastError = undefined;

    const response = await this.client.post<InitAuthResponse>(
      "/api/auth/init",
      { fingerprint }
    );

    this.lastTempToken = response.data.tempToken;
    this.authUrl = response.data.authUrl;
    this.authState = "pending";

    this.startPollingLoop(this.lastTempToken);
    return response.data;
  }

  /**
   * Start auth flow via /api/auth/init (polling flow)
   */
  async exchangeCode(payload: ExchangeCodePayload): Promise<AuthTokens> {
    const response = await this.client.post<AuthTokens>(
      "/api/frp/exchange-code",
      payload
    );
    this.setTokens(response.data);
    return response.data;
  }

  /**
   * Poll auth status via /api/auth/poll once. Typically used internally.
   */
  async pollAuth(tempToken?: string): Promise<PollAuthResponse> {
    const token = tempToken || this.lastTempToken;
    if (!token) {
      throw new Error("No tempToken available. Call auth/init first.");
    }

    const response = await this.client.get<PollAuthResponse>(
      "/api/auth/poll",
      {
        params: { tempToken: token },
      }
    );

    this.lastTempToken = token;

    if (response.data.status === "completed") {
      this.setTokens({
        jwt: response.data.jwt,
        refreshToken: response.data.refreshToken,
        expiresAt: response.data.expiresAt,
        discordUser: response.data.discordUser,
      });
      this.authState = "completed";
      this.stopPolling();
    } else if (response.data.status === "expired" || response.data.status === "not_found") {
      this.authState = response.data.status;
      this.stopPolling();
    } else {
      this.authState = "pending";
    }

    return response.data;
  }

  /**
   * Refresh JWT using stored refresh token
   */
  async refreshTokens(): Promise<AuthTokens> {
    await this.refreshJwt();
    if (!this.tokens) {
      throw new Error("Failed to refresh tokens");
    }
    return this.tokens;
  }

  getStatus(): AuthStatus {
    return {
      linked: Boolean(this.tokens),
      state: this.authState,
      authUrl: this.authUrl,
      lastUpdated: this.tokens?.expiresAt,
      discordUser: this.tokens?.discordUser,
      message: this.lastError,
    };
  }

  clearTokens(): void {
    this.tokens = undefined;
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = undefined;
    }
    this.emit("cleared");
  }

  logout(): void {
    this.clearTokens();
    this.stopPolling();
    this.lastTempToken = undefined;
    this.authUrl = undefined;
    this.authState = "idle";
    this.lastError = undefined;
  }

  getTokens(): AuthTokens | undefined {
    return this.tokens;
  }

  getLastFingerprint(): string | undefined {
    return this.lastFingerprint;
  }

  getLastTempToken(): string | undefined {
    return this.lastTempToken;
  }

  private setTokens(tokens: AuthTokens): void {
    this.tokens = tokens;
    this.scheduleRefresh();
    this.emit("updated", tokens);
  }

  private scheduleRefresh(): void {
    if (!this.tokens) return;
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    const refreshInMs =
      this.config.jwtRefreshIntervalHours * 60 * 60 * 1000 -
      this.config.jwtRefreshMarginMinutes * 60 * 1000;

    this.refreshTimer = setTimeout(() => {
      this.refreshJwt().catch((error) => {
        this.emit("refreshFailed", error);
        this.clearTokens();
      });
    }, Math.max(refreshInMs, 5_000));
  }

  private async refreshJwt(): Promise<void> {
    if (!this.tokens?.refreshToken) {
      throw new Error("No refresh token available");
    }
    const fingerprint =
      this.lastFingerprint || (await this.ensureFingerprint());

    const response = await this.client.post<any>("/api/auth/refresh", {
      refreshToken: this.tokens.refreshToken,
      fingerprint,
    });

    const data = response.data || {};
    const nextTokens: AuthTokens = {
      jwt: (data as any).jwt || (data as any).accessToken || this.tokens.jwt,
      refreshToken: (data as any).refreshToken || this.tokens.refreshToken,
      expiresAt: (data as any).expiresAt || this.tokens.expiresAt,
      discordUser: this.tokens.discordUser, // refresh APIはuserを返さないため既存を保持
    };

    if (!nextTokens.jwt) {
      throw new Error("Failed to refresh tokens: jwt/accessToken missing");
    }

    this.setTokens(nextTokens);
  }

  async fetchUserInfo() {
    if (!this.tokens?.jwt) {
      throw new Error("Not authenticated");
    }
    const fingerprint =
      this.lastFingerprint || (await this.ensureFingerprint());
    const response = await this.client.get("/auth/api/user/info", {
      headers: {
        Authorization: `Bearer ${this.tokens.jwt}`,
        "X-Fingerprint": fingerprint,
      },
    });
    return response.data;
  }

  private startPollingLoop(tempToken: string): void {
    this.stopPolling();
    const poll = async () => {
      try {
        const result = await this.pollAuth(tempToken);
        if (result.status === "pending") {
          this.pollTimer = setTimeout(poll, this.config.authPollIntervalMs);
        }
      } catch (error: any) {
        this.lastError = error?.message || "poll failed";
        this.authState = "error";
        this.stopPolling();
      }
    };
    this.pollTimer = setTimeout(poll, this.config.authPollIntervalMs);
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = undefined;
    }
  }
}

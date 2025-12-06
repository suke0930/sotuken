import axios, { AxiosInstance } from "axios";
import { EventEmitter } from "events";
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
   * Start auth flow via /api/auth/init (polling flow)
   */
  async initAuth(fingerprint: string): Promise<InitAuthResponse> {
    const response = await this.client.post<InitAuthResponse>(
      "/api/auth/init",
      { fingerprint }
    );
    this.lastFingerprint = fingerprint;
    this.lastTempToken = response.data.tempToken;
    return response.data;
  }

  async exchangeCode(payload: ExchangeCodePayload): Promise<AuthTokens> {
    const response = await this.client.post<AuthTokens>(
      "/api/frp/exchange-code",
      payload
    );
    this.setTokens(response.data);
    return response.data;
  }

  /**
   * Poll auth status via /api/auth/poll
   */
  async pollAuth(tempToken: string): Promise<PollAuthResponse> {
    const response = await this.client.get<PollAuthResponse>(
      "/api/auth/poll",
      {
        params: { tempToken },
      }
    );

    this.lastTempToken = tempToken;

    if (response.data.status === "completed") {
      this.setTokens({
        jwt: response.data.jwt,
        refreshToken: response.data.refreshToken,
        expiresAt: response.data.expiresAt,
        discordUser: response.data.discordUser,
      });
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
      tokens: this.tokens,
      lastUpdated: this.tokens?.expiresAt,
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
    const response = await this.client.post<AuthTokens>("/api/auth/refresh", {
      refreshToken: this.tokens.refreshToken,
    });
    this.setTokens(response.data);
  }
}

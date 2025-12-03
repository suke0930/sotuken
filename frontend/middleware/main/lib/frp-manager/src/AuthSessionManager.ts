import axios, { AxiosInstance } from "axios";
import { EventEmitter } from "events";
import { AuthStatus, AuthTokens, FrpManagerConfig } from "./types";

interface ExchangeCodePayload {
  code: string;
  redirectUri: string;
  fingerprint: string;
}

export class AuthSessionManager extends EventEmitter {
  private config: FrpManagerConfig;
  private client: AxiosInstance;
  private tokens?: AuthTokens;
  private refreshTimer?: NodeJS.Timeout;

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

  async exchangeCode(payload: ExchangeCodePayload): Promise<AuthTokens> {
    const response = await this.client.post<AuthTokens>(
      "/api/frp/exchange-code",
      payload
    );
    this.setTokens(response.data);
    return response.data;
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

import { HttpClient } from "./utils/http.js";
import { logger } from "./utils/logger.js";
import { config } from "./config.js";

/**
 * Authentication Client
 * 
 * Handles Discord OAuth2 authentication, JWT management, and token refresh
 */

export interface TokenStorage {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
  fingerprint: string;
}

export interface InitAuthResult {
  tempToken: string;
  authUrl: string;
  expiresIn: number;
}

export interface PollAuthResult {
  status: "pending" | "completed" | "expired";
  jwt?: string;
  refreshToken?: string;
  expiresAt?: string;
  refreshExpiresAt?: string;
  discordUser?: {
    id: string;
    username: string;
    avatar: string;
    discriminator: string;
  };
  message?: string;
}

export interface UserInfoResponse {
  user: {
    discordId: string;
    username: string;
    avatarUrl: string;
  };
  currentSession: {
    sessionId: string;
    createdAt: string;
    expiresAt: string;
    lastActivity: string;
  };
  permissions: {
    allowedPorts: number[];
    maxSessions: number;
  };
  activeSessions: {
    total: number;
    sessions: Array<{
      sessionId: string;
      remotePort: number;
      connectedAt: string;
      fingerprint: string;
    }>;
  };
}

export class AuthClient {
  private http: HttpClient;
  private tokens: TokenStorage | null = null;

  constructor(fingerprint: string) {
    this.http = new HttpClient(config.authServerUrl, config.testTimeout);
    if (this.tokens) {
      this.tokens.fingerprint = fingerprint;
    }
    this.http.setFingerprintHeader(fingerprint);
  }

  /**
   * Initialize authentication and get tempToken + authUrl
   */
  async initAuth(fingerprint: string): Promise<InitAuthResult> {
    logger.info("Initializing authentication...");

    const response = await this.http.post<InitAuthResult>("/api/auth/init", {
      fingerprint,
    });

    logger.success("Authentication initialized", {
      tempToken: response.data.tempToken,
      expiresIn: response.data.expiresIn,
    });

    return response.data;
  }

  /**
   * Poll for authentication completion
   */
  async pollAuth(
    tempToken: string,
    options: { maxAttempts?: number; interval?: number } = {}
  ): Promise<PollAuthResult> {
    const maxAttempts = options.maxAttempts || 150; // Default: 5 minutes (150 * 2s)
    const interval = options.interval || 2000; // Default: 2 seconds

    logger.info(`Polling for authentication completion (max ${maxAttempts} attempts)...`);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const response = await this.http.get<PollAuthResult>(`/api/auth/poll?tempToken=${tempToken}`);
      const result = response.data;

      if (result.status === "completed") {
        logger.success("Authentication completed!", {
          user: result.discordUser?.username,
        });

        // Store tokens
        if (result.jwt && result.refreshToken) {
          this.storeTokens(
            result.jwt,
            result.refreshToken,
            result.expiresAt!,
            result.refreshExpiresAt!
          );
        }

        return result;
      } else if (result.status === "expired") {
        logger.error("Authentication expired");
        return result;
      }

      // Still pending
      if (attempt % 10 === 0) {
        logger.debug(`Still waiting... (attempt ${attempt}/${maxAttempts})`);
      }

      await this.sleep(interval);
    }

    throw new Error("Authentication polling timed out");
  }

  /**
   * Store JWT and refresh token
   */
  storeTokens(
    accessToken: string,
    refreshToken: string,
    accessTokenExpiresAt: string,
    refreshTokenExpiresAt: string
  ): void {
    this.tokens = {
      accessToken,
      refreshToken,
      accessTokenExpiresAt: new Date(accessTokenExpiresAt),
      refreshTokenExpiresAt: new Date(refreshTokenExpiresAt),
      fingerprint: this.tokens?.fingerprint || "",
    };

    this.http.setAuthHeader(accessToken);
    logger.info("Tokens stored successfully");
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(): Promise<void> {
    if (!this.tokens) {
      throw new Error("No tokens available to refresh");
    }

    logger.info("Refreshing access token...");

    const response = await this.http.post("/api/auth/refresh", {
      refreshToken: this.tokens.refreshToken,
      fingerprint: this.tokens.fingerprint,
    });

    const { accessToken, refreshToken, expiresAt, refreshExpiresAt } = response.data;

    this.storeTokens(accessToken, refreshToken, expiresAt, refreshExpiresAt);
    logger.success("Access token refreshed");
  }

  /**
   * Get valid access token (auto-refresh if needed)
   */
  async getValidAccessToken(): Promise<string> {
    if (!this.tokens) {
      throw new Error("Not authenticated. Call initAuth() and pollAuth() first.");
    }

    const now = new Date();
    const buffer = 5 * 60 * 1000; // 5 minutes buffer

    // Refresh if token expires within 5 minutes
    if (this.tokens.accessTokenExpiresAt.getTime() - now.getTime() < buffer) {
      logger.debug("Access token expiring soon, refreshing...");
      await this.refreshAccessToken();
    }

    return this.tokens.accessToken;
  }

  /**
   * Get user session information
   */
  async getUserInfo(): Promise<UserInfoResponse> {
    const token = await this.getValidAccessToken();
    this.http.setAuthHeader(token);

    const response = await this.http.get<UserInfoResponse>("/api/user/info");
    logger.info("User info retrieved", {
      username: response.data.user.username,
      allowedPorts: response.data.permissions.allowedPorts,
      activeSessions: response.data.activeSessions.total,
    });

    return response.data;
  }

  /**
   * Get refresh token
   */
  getRefreshToken(): string {
    if (!this.tokens) {
      throw new Error("Not authenticated");
    }
    return this.tokens.refreshToken;
  }

  /**
   * Verify if a token is valid
   */
  async verifyToken(token: string): Promise<boolean> {
    try {
      const response = await this.http.post("/api/verify-jwt", {
        jwt: token,
        fingerprint: this.tokens?.fingerprint,
      });
      return response.data.valid === true;
    } catch {
      return false;
    }
  }

  /**
   * Set token expiry for testing
   */
  setTokenExpiry(expiresAt: Date): void {
    if (this.tokens) {
      this.tokens.accessTokenExpiresAt = expiresAt;
    }
  }

  /**
   * Set refresh token expiry for testing
   */
  setRefreshTokenExpiry(expiresAt: Date): void {
    if (this.tokens) {
      this.tokens.refreshTokenExpiresAt = expiresAt;
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

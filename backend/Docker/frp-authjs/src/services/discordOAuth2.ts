import { Discord } from "arctic";
import { randomBytes } from "crypto";
import { env } from "../config/env.js";

/**
 * Arctic-based Discord OAuth2 Service
 * 
 * This service handles Discord OAuth2 authentication using the Arctic library.
 * Arctic is lightweight, TypeScript-friendly, and API-first.
 */
class DiscordOAuth2Service {
  private discord: Discord;
  private stateStore: Map<string, { state: string; createdAt: Date }>;

  constructor() {
    // Initialize Arctic Discord provider
    this.discord = new Discord(
      env.DISCORD_CLIENT_ID,
      env.DISCORD_CLIENT_SECRET,
      env.DISCORD_REDIRECT_URI
    );

    // In-memory state store for CSRF protection
    // In production, use Redis or a database
    this.stateStore = new Map();

    // Clean up expired states every 10 minutes
    setInterval(() => this.cleanupExpiredStates(), 10 * 60 * 1000);
  }

  /**
   * Generate authentication URL for Discord OAuth2
   * @returns Object containing the auth URL and state
   */
  async createAuthorizationURL(): Promise<{ url: string; state: string }> {
    const state = this.generateState();
    
    const url = await this.discord.createAuthorizationURL(state, {
      scopes: ["identify", "email"],
    });

    // Store state for verification
    this.stateStore.set(state, {
      state,
      createdAt: new Date(),
    });

    return {
      url: url.toString(),
      state,
    };
  }

  /**
   * Validate state parameter (CSRF protection)
   */
  validateState(state: string): boolean {
    const stored = this.stateStore.get(state);
    if (!stored) {
      return false;
    }

    // Remove state after validation (one-time use)
    this.stateStore.delete(state);
    return true;
  }

  /**
   * Exchange authorization code for access token
   * @param code Authorization code from Discord
   * @returns Tokens object containing access token, refresh token, and expiry
   */
  async validateAuthorizationCode(code: string) {
    return await this.discord.validateAuthorizationCode(code);
  }

  /**
   * Fetch Discord user information
   * @param accessToken Discord access token
   * @returns Discord user object
   */
  async fetchUser(accessToken: string) {
    const response = await fetch("https://discord.com/api/users/@me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch user information from Discord");
    }

    return await response.json();
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string) {
    return await this.discord.refreshAccessToken(refreshToken);
  }

  /**
   * Generate random state for CSRF protection
   */
  private generateState(): string {
    return randomBytes(32).toString("hex");
  }

  /**
   * Clean up expired states (older than 10 minutes)
   */
  private cleanupExpiredStates() {
    const now = Date.now();
    const tenMinutes = 10 * 60 * 1000;

    for (const [state, data] of this.stateStore.entries()) {
      if (now - data.createdAt.getTime() > tenMinutes) {
        this.stateStore.delete(state);
      }
    }
  }
}

// Export singleton instance
export const discordOAuth2Service = new DiscordOAuth2Service();

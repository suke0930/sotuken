import { v4 as uuidv4 } from "uuid";

/**
 * Pending Authentication Entry
 * 
 * Represents a pending OAuth2 authentication session.
 * Used for polling-based authentication flow.
 */
export interface PendingAuth {
  tempToken: string;
  state: string;
  status: "pending" | "completed" | "expired";
  authUrl: string;
  jwt?: string;
  discordUser?: {
    id: string;
    username: string;
    avatar: string;
    discriminator: string;
  };
  fingerprint: string;
  createdAt: Date;
  expiresAt: Date;
  completedAt?: Date;
}

/**
 * Pending Auth Manager
 * 
 * Manages temporary authentication tokens for polling-based OAuth2 flow.
 * Handles creation, status updates, cleanup of expired entries.
 */
class PendingAuthManager {
  private pendingAuths: Map<string, PendingAuth>;
  private stateToTempToken: Map<string, string>; // state -> tempToken mapping
  private cleanupInterval: NodeJS.Timeout | null;

  constructor() {
    this.pendingAuths = new Map();
    this.stateToTempToken = new Map();
    this.cleanupInterval = null;
  }

  /**
   * Initialize the manager and start cleanup interval
   */
  initialize() {
    console.log("🔄 PendingAuthManager initialized");
    
    // Cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, 5 * 60 * 1000);
  }

  /**
   * Create a new pending authentication session
   */
  create(state: string, authUrl: string, fingerprint: string): PendingAuth {
    const tempToken = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes

    const pendingAuth: PendingAuth = {
      tempToken,
      state,
      status: "pending",
      authUrl,
      fingerprint,
      createdAt: now,
      expiresAt,
    };

    this.pendingAuths.set(tempToken, pendingAuth);
    this.stateToTempToken.set(state, tempToken);

    console.log(`✨ Created pending auth: ${tempToken} (expires in 10 min)`);
    return pendingAuth;
  }

  /**
   * Get pending auth by temp token
   */
  getByTempToken(tempToken: string): PendingAuth | undefined {
    const auth = this.pendingAuths.get(tempToken);
    
    if (!auth) {
      return undefined;
    }

    // Check if expired
    if (Date.now() > auth.expiresAt.getTime()) {
      auth.status = "expired";
    }

    return auth;
  }

  /**
   * Get pending auth by OAuth2 state
   */
  getByState(state: string): PendingAuth | undefined {
    const tempToken = this.stateToTempToken.get(state);
    if (!tempToken) {
      return undefined;
    }

    return this.getByTempToken(tempToken);
  }

  /**
   * Complete a pending authentication
   */
  complete(
    tempToken: string,
    jwt: string,
    discordUser: {
      id: string;
      username: string;
      avatar: string;
      discriminator: string;
    }
  ): boolean {
    const auth = this.pendingAuths.get(tempToken);
    
    if (!auth) {
      console.warn(`⚠️  Cannot complete auth: ${tempToken} not found`);
      return false;
    }

    if (auth.status !== "pending") {
      console.warn(`⚠️  Cannot complete auth: ${tempToken} status is ${auth.status}`);
      return false;
    }

    // Update to completed
    auth.status = "completed";
    auth.jwt = jwt;
    auth.discordUser = discordUser;
    auth.completedAt = new Date();

    console.log(`✅ Completed auth: ${tempToken} for user ${discordUser.username}`);
    return true;
  }

  /**
   * Delete a pending authentication
   */
  delete(tempToken: string): boolean {
    const auth = this.pendingAuths.get(tempToken);
    
    if (!auth) {
      return false;
    }

    // Remove from both maps
    this.pendingAuths.delete(tempToken);
    this.stateToTempToken.delete(auth.state);

    console.log(`🗑️  Deleted auth: ${tempToken}`);
    return true;
  }

  /**
   * Clean up expired authentications
   */
  private cleanupExpired() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [tempToken, auth] of this.pendingAuths.entries()) {
      if (now > auth.expiresAt.getTime()) {
        this.pendingAuths.delete(tempToken);
        this.stateToTempToken.delete(auth.state);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired auth(s)`);
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    let pending = 0;
    let completed = 0;
    let expired = 0;

    for (const auth of this.pendingAuths.values()) {
      if (Date.now() > auth.expiresAt.getTime()) {
        expired++;
      } else if (auth.status === "completed") {
        completed++;
      } else {
        pending++;
      }
    }

    return {
      total: this.pendingAuths.size,
      pending,
      completed,
      expired,
    };
  }

  /**
   * Shutdown cleanup interval
   */
  shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    console.log("🛑 PendingAuthManager shutdown");
  }
}

// Export singleton instance
export const pendingAuthManager = new PendingAuthManager();

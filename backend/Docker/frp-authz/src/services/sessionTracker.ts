import { ActiveSession } from "../types/frp.js";
import fs from "fs/promises";
import path from "path";
import { frpDashboardClient } from "./frpDashboardClient.js";
import { env } from "../types/env.js";

export class SessionTracker {
  // Map with composite key: "discordId:remotePort" -> ActiveSession
  private activeSessions: Map<string, ActiveSession> = new Map();
  private filePath: string;
  private saveTimer: NodeJS.Timeout | null = null;
  private initialized: boolean = false;

  constructor(dataDir: string = process.env.DATA_DIR || "/app/data") {
    this.filePath = path.join(dataDir, "active_sessions.json");
  }

  /**
   * Generate composite key for session storage
   */
  private getSessionKey(discordId: string, remotePort: number): string {
    return `${discordId}:${remotePort}`;
  }

  async initialize(): Promise<void> {
    try {
      // Ensure data directory exists
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });

      // Load existing sessions
      await this.loadFromFile();

      // Initial sync with FRP server to remove ghost sessions
      await this.syncWithFrpServer(true);

      // Periodic sync with FRP server to handle unexpected disconnections
      const syncInterval = env.SYNC_INTERVAL_MS;
      setInterval(() => {
        this.syncWithFrpServer(false);
      }, syncInterval);
      console.log(`Periodic FRP sync enabled (interval: ${syncInterval}ms = ${syncInterval / 1000}s)`);

      // Clean expired sessions periodically (every 5 minutes)
      setInterval(() => {
        this.cleanExpiredSessions();
      }, 5 * 60 * 1000);

      console.log(`SessionTracker initialized (${this.activeSessions.size} active sessions loaded)`);
      this.initialized = true;
    } catch (error) {
      console.error("Failed to initialize SessionTracker:", error);
      // Initialize with empty sessions
      this.activeSessions = new Map();
      this.initialized = true;
    }
  }

  /**
   * Check if a port is already in use (by any user)
   */
  isPortInUse(remotePort: number): boolean {
    for (const session of this.activeSessions.values()) {
      if (session.remotePort === remotePort) {
        return true;
      }
    }
    return false;
  }

  /**
   * Add a new session. Returns false if the port is already in use.
   */
  addSession(session: ActiveSession): boolean {
    const key = this.getSessionKey(session.discordId, session.remotePort);

    // Check if session already exists for this user+port combination
    if (this.activeSessions.has(key)) {
      console.log(
        `Session addition rejected: Port ${session.remotePort} already in use by Discord ID ${session.discordId}`
      );
      return false;
    }

    this.activeSessions.set(key, session);
    console.log(
      `Session added: ${session.sessionId} (Discord ID: ${session.discordId}, Port: ${session.remotePort})`
    );
    console.log(`Total active sessions: ${this.activeSessions.size}`);

    if (this.initialized) {
      this.scheduleSave();
    }
    return true;
  }

  /**
   * Remove session by Discord ID and remote port (primary method)
   */
  removeSessionByPort(discordId: string, remotePort: number): boolean {
    const key = this.getSessionKey(discordId, remotePort);
    const session = this.activeSessions.get(key);

    if (session) {
      this.activeSessions.delete(key);
      console.log(
        `Session removed: ${session.sessionId} (Discord ID: ${session.discordId}, Port: ${session.remotePort})`
      );
      console.log(`Total active sessions: ${this.activeSessions.size}`);

      if (this.initialized) {
        this.scheduleSave();
      }
      return true;
    }

    console.log(`Session not found for Discord ID ${discordId} on port ${remotePort}`);
    return false;
  }

  /**
   * Remove session by port only (fallback when discordId is unknown)
   */
  removeSessionByPortOnly(remotePort: number): boolean {
    let removed = false;

    for (const [key, session] of this.activeSessions.entries()) {
      if (session.remotePort === remotePort) {
        this.activeSessions.delete(key);
        console.log(
          `Session removed by port fallback: ${session.sessionId} (Discord ID: ${session.discordId}, Port: ${session.remotePort})`
        );
        removed = true;
        break;
      }
    }

    if (removed) {
      console.log(`Total active sessions: ${this.activeSessions.size}`);
      if (this.initialized) {
        this.scheduleSave();
      }
    } else {
      console.log(`Session not found for port ${remotePort}`);
    }

    return removed;
  }

  countSessions(discordId: string): number {
    let count = 0;
    for (const session of this.activeSessions.values()) {
      if (session.discordId === discordId) {
        count++;
      }
    }
    return count;
  }

  getSessionByPort(discordId: string, port: number): ActiveSession | null {
    const key = this.getSessionKey(discordId, port);
    return this.activeSessions.get(key) || null;
  }

  getAllSessions(): ActiveSession[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Get all sessions for a specific Discord user
   */
  getUserSessions(discordId: string): ActiveSession[] {
    const sessions: ActiveSession[] = [];
    for (const session of this.activeSessions.values()) {
      if (session.discordId === discordId) {
        sessions.push(session);
      }
    }
    return sessions;
  }

  /**
   * Sync with FRP Dashboard API to remove ghost sessions
   *
   * This method is called on startup and periodically to ensure that stored sessions
   * match the actual state of the FRP server. Sessions that don't exist in FRP are
   * removed (ghost sessions from crashes, kills, or previous restarts).
   *
   * @param isInitialSync - True if this is the first sync on startup
   */
  private async syncWithFrpServer(isInitialSync: boolean = false): Promise<void> {
    try {
      const syncType = isInitialSync ? "Initial" : "Periodic";
      console.log(`🔄 ${syncType} sync with FRP server...`);

      // Get active ports from FRP Dashboard API
      const activePorts = await frpDashboardClient.getActiveRemotePorts();
      const portsSet = new Set(activePorts);

      console.log(`FRP server reports ${activePorts.length} active port(s): [${activePorts.join(", ")}]`);
      console.log(`Local storage has ${this.activeSessions.size} session(s)`);

      // Remove sessions whose ports are not active in FRP
      let removedCount = 0;
      const keysToRemove: string[] = [];

      for (const [key, session] of this.activeSessions.entries()) {
        if (!portsSet.has(session.remotePort)) {
          console.log(
            `  ❌ Removing ghost session: ${session.sessionId} ` +
            `(Discord: ${session.discordId}, Port: ${session.remotePort}) - not active in FRP`
          );
          keysToRemove.push(key);
          removedCount++;
        }
      }

      // Remove identified ghost sessions
      for (const key of keysToRemove) {
        this.activeSessions.delete(key);
      }

      if (removedCount > 0) {
        console.log(`✅ Synced with FRP server: removed ${removedCount} ghost session(s)`);
        console.log(`Active sessions after sync: ${this.activeSessions.size}`);

        // Save updated state
        await this.saveToFile();
      } else if (this.activeSessions.size > 0) {
        console.log(`✅ Synced with FRP server: all ${this.activeSessions.size} session(s) are valid`);
      } else {
        console.log(`✅ Synced with FRP server: no sessions to validate`);
      }
    } catch (error: any) {
      console.error("⚠️  Failed to sync with FRP server:", error.message);
      console.log("Continuing with existing sessions from storage...");

      // Log hint for debugging
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        console.log("  Hint: FRP server may not be ready yet or FRP_DASHBOARD_URL is incorrect");
      }
    }
  }

  /**
   * Clean sessions that have been inactive for more than 24 hours
   */
  private cleanExpiredSessions(): void {
    const now = new Date();
    const expiryThreshold = 24 * 60 * 60 * 1000; // 24 hours
    let cleanedCount = 0;
    const keysToRemove: string[] = [];

    for (const [key, session] of this.activeSessions.entries()) {
      const timeSinceConnection = now.getTime() - session.connectedAt.getTime();
      if (timeSinceConnection > expiryThreshold) {
        console.log(`Expired session removed: ${session.sessionId} (age: ${Math.floor(timeSinceConnection / 1000 / 60 / 60)} hours)`);
        keysToRemove.push(key);
        cleanedCount++;
      }
    }

    for (const key of keysToRemove) {
      this.activeSessions.delete(key);
    }

    if (cleanedCount > 0) {
      console.log(`Cleaned ${cleanedCount} expired sessions`);
      this.scheduleSave();
    }
  }

  private async loadFromFile(): Promise<void> {
    try {
      const data = await fs.readFile(this.filePath, "utf-8");
      const parsed = JSON.parse(data);

      // Convert array back to Map with composite keys
      this.activeSessions = new Map();
      const sessions = parsed.sessions || [];

      for (const s of sessions) {
        const session: ActiveSession = {
          ...s,
          connectedAt: new Date(s.connectedAt),
        };
        const key = this.getSessionKey(session.discordId, session.remotePort);
        this.activeSessions.set(key, session);
      }

      console.log(`Loaded ${this.activeSessions.size} active sessions from file`);
    } catch (error: any) {
      if (error.code === "ENOENT") {
        console.log("Active sessions file not found, starting with empty sessions");
        await this.saveToFile();
      } else {
        console.error("Error loading sessions file:", error);
        throw error;
      }
    }
  }

  private async saveToFile(): Promise<void> {
    try {
      const data = {
        sessions: Array.from(this.activeSessions.values()),
        lastSaved: new Date().toISOString(),
      };

      await fs.writeFile(
        this.filePath,
        JSON.stringify(data, null, 2),
        "utf-8"
      );
    } catch (error) {
      console.error("Failed to save active sessions to file:", error);
    }
  }

  private scheduleSave(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }

    this.saveTimer = setTimeout(() => {
      this.saveToFile();
      this.saveTimer = null;
    }, 5000); // Debounce: save after 5 seconds of inactivity
  }
}

export const sessionTracker = new SessionTracker();

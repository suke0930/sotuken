import { ActiveSession } from "../types/frp.js";
import fs from "fs/promises";
import path from "path";
import { frpDashboardClient } from "./frpDashboardClient.js";

export class SessionTracker {
  private activeSessions: ActiveSession[] = [];
  private filePath: string;
  private saveTimer: NodeJS.Timeout | null = null;
  private initialized: boolean = false;

  constructor(dataDir: string = process.env.DATA_DIR || "/app/data") {
    this.filePath = path.join(dataDir, "active_sessions.json");
  }

  async initialize(): Promise<void> {
    try {
      // Ensure data directory exists
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });

      // Load existing sessions
      await this.loadFromFile();

      // Sync with FRP server to remove ghost sessions
      await this.syncWithFrpServer();

      // Clean expired sessions periodically (every 5 minutes)
      setInterval(() => {
        this.cleanExpiredSessions();
      }, 5 * 60 * 1000);

      console.log(`SessionTracker initialized (${this.activeSessions.length} active sessions loaded)`);
      this.initialized = true;
    } catch (error) {
      console.error("Failed to initialize SessionTracker:", error);
      // Initialize with empty sessions
      this.activeSessions = [];
      this.initialized = true;
    }
  }

  addSession(session: ActiveSession): void {
    this.activeSessions.push(session);
    console.log(
      `Session added: ${session.sessionId} (Discord ID: ${session.discordId}, Port: ${session.remotePort})`
    );
    console.log(`Total active sessions: ${this.activeSessions.length}`);

    if (this.initialized) {
      this.scheduleSave();
    }
  }

  removeSession(sessionId: string): void {
    const index = this.activeSessions.findIndex((s) => s.sessionId === sessionId);

    if (index !== -1) {
      const removed = this.activeSessions.splice(index, 1)[0];
      console.log(
        `Session removed: ${removed.sessionId} (Discord ID: ${removed.discordId}, Port: ${removed.remotePort})`
      );
      console.log(`Total active sessions: ${this.activeSessions.length}`);

      if (this.initialized) {
        this.scheduleSave();
      }
    } else {
      console.log(`Session not found for removal: ${sessionId}`);
    }
  }

  /**
   * Remove session by Discord ID and remote port (fallback for CloseProxy)
   */
  removeSessionByPort(discordId: string, remotePort: number): boolean {
    const index = this.activeSessions.findIndex(
      (s) => s.discordId === discordId && s.remotePort === remotePort
    );

    if (index !== -1) {
      const removed = this.activeSessions.splice(index, 1)[0];
      console.log(
        `Session removed by port: ${removed.sessionId} (Discord ID: ${removed.discordId}, Port: ${removed.remotePort})`
      );
      console.log(`Total active sessions: ${this.activeSessions.length}`);

      if (this.initialized) {
        this.scheduleSave();
      }
      return true;
    }

    console.log(`Session not found for Discord ID ${discordId} on port ${remotePort}`);
    return false;
  }

  countSessions(discordId: string): number {
    return this.activeSessions.filter((s) => s.discordId === discordId).length;
  }

  getSessionByPort(discordId: string, port: number): ActiveSession | null {
    return (
      this.activeSessions.find(
        (s) => s.discordId === discordId && s.remotePort === port
      ) || null
    );
  }

  getAllSessions(): ActiveSession[] {
    return [...this.activeSessions];
  }

  /**
   * Get all sessions for a specific Discord user
   */
  getUserSessions(discordId: string): ActiveSession[] {
    return this.activeSessions.filter((s) => s.discordId === discordId);
  }

  /**
   * Sync with FRP Dashboard API to remove ghost sessions
   *
   * This method is called on startup to ensure that stored sessions
   * match the actual state of the FRP server. Sessions that don't
   * exist in FRP are removed (ghost sessions from previous restarts).
   */
  private async syncWithFrpServer(): Promise<void> {
    try {
      console.log("🔄 Syncing with FRP server...");

      // Get active ports from FRP Dashboard API
      const activePorts = await frpDashboardClient.getActiveRemotePorts();
      const portsSet = new Set(activePorts);

      console.log(`FRP server reports ${activePorts.length} active port(s): [${activePorts.join(", ")}]`);
      console.log(`Local storage has ${this.activeSessions.length} session(s)`);

      // Remove sessions whose ports are not active in FRP
      let removedCount = 0;
      this.activeSessions = this.activeSessions.filter((session) => {
        if (!portsSet.has(session.remotePort)) {
          console.log(
            `  ❌ Removing ghost session: ${session.sessionId} ` +
            `(Discord: ${session.discordId}, Port: ${session.remotePort}) - not active in FRP`
          );
          removedCount++;
          return false;
        }
        return true;
      });

      if (removedCount > 0) {
        console.log(`✅ Synced with FRP server: removed ${removedCount} ghost session(s)`);
        console.log(`Active sessions after sync: ${this.activeSessions.length}`);

        // Save updated state
        await this.saveToFile();
      } else if (this.activeSessions.length > 0) {
        console.log(`✅ Synced with FRP server: all ${this.activeSessions.length} session(s) are valid`);
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

    this.activeSessions = this.activeSessions.filter((session) => {
      const timeSinceConnection = now.getTime() - session.connectedAt.getTime();
      if (timeSinceConnection > expiryThreshold) {
        console.log(`Expired session removed: ${session.sessionId} (age: ${Math.floor(timeSinceConnection / 1000 / 60 / 60)} hours)`);
        cleanedCount++;
        return false;
      }
      return true;
    });

    if (cleanedCount > 0) {
      console.log(`Cleaned ${cleanedCount} expired sessions`);
      this.scheduleSave();
    }
  }

  private async loadFromFile(): Promise<void> {
    try {
      const data = await fs.readFile(this.filePath, "utf-8");
      const parsed = JSON.parse(data);

      // Convert date strings back to Date objects
      this.activeSessions = (parsed.sessions || []).map((s: any) => ({
        ...s,
        connectedAt: new Date(s.connectedAt),
      }));

      console.log(`Loaded ${this.activeSessions.length} active sessions from file`);
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
        sessions: this.activeSessions,
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

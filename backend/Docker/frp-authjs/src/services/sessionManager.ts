import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { Session, SessionStore } from "../types/session.js";
import { env } from "../config/env.js";

export class SessionManager {
  private sessions: Map<string, Session> = new Map();
  private filePath: string;
  private saveTimer: NodeJS.Timeout | null = null;

  constructor(dataDir: string = env.DATA_DIR) {
    this.filePath = path.join(dataDir, "sessions.json");
  }

  async initialize(): Promise<void> {
    try {
      // Ensure data directory exists
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });
      
      // Load existing sessions
      await this.loadFromFile();
      
      // Clean expired sessions periodically
      setInterval(() => {
        this.cleanExpiredSessions();
      }, 60 * 60 * 1000); // Every hour
      
      console.log(`SessionManager initialized (${this.sessions.size} sessions loaded)`);
    } catch (error) {
      console.error("Failed to initialize SessionManager:", error);
      // Initialize with empty sessions
      this.sessions = new Map();
    }
  }

  createSession(
    discordId: string,
    clientFingerprint: string,
    username: string,
    avatar: string | null
  ): Session {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + env.SESSION_EXPIRY * 1000);

    const session: Session = {
      sessionId: uuidv4(),
      discordId,
      clientFingerprint,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      lastActivity: now.toISOString(),
      username,
      avatar,
    };

    this.sessions.set(session.sessionId, session);
    this.scheduleSave();

    console.log(`Session created: ${session.sessionId} for Discord ID: ${discordId} (${username})`);
    return session;
  }

  getSession(sessionId: string): Session | null {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return null;
    }

    // Check if expired
    if (new Date(session.expiresAt) < new Date()) {
      this.sessions.delete(sessionId);
      this.scheduleSave();
      console.log(`Session expired and removed: ${sessionId}`);
      return null;
    }

    // Update last activity
    session.lastActivity = new Date().toISOString();
    this.scheduleSave();

    return session;
  }

  validateFingerprint(sessionId: string, fingerprint: string): boolean {
    const session = this.getSession(sessionId);
    
    if (!session) {
      return false;
    }

    return session.clientFingerprint === fingerprint;
  }

  cleanExpiredSessions(): void {
    const now = new Date();
    let cleanedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (new Date(session.expiresAt) < now) {
        this.sessions.delete(sessionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`Cleaned ${cleanedCount} expired sessions`);
      this.scheduleSave();
    }
  }

  private async loadFromFile(): Promise<void> {
    try {
      const data = await fs.readFile(this.filePath, "utf-8");
      const store: SessionStore = JSON.parse(data);

      this.sessions.clear();
      for (const session of store.sessions) {
        // Migrate old sessions: add default values if missing
        if (!session.username) {
          session.username = "";
          session.avatar = null;
        }
        this.sessions.set(session.sessionId, session);
      }

      console.log(`Loaded ${this.sessions.size} sessions from file`);
    } catch (error: any) {
      if (error.code === "ENOENT") {
        console.log("Sessions file not found, starting with empty sessions");
        await this.saveToFile();
      } else {
        throw error;
      }
    }
  }

  private async saveToFile(): Promise<void> {
    try {
      const store: SessionStore = {
        sessions: Array.from(this.sessions.values()),
      };
      
      await fs.writeFile(
        this.filePath,
        JSON.stringify(store, null, 2),
        "utf-8"
      );
    } catch (error) {
      console.error("Failed to save sessions to file:", error);
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

export const sessionManager = new SessionManager();

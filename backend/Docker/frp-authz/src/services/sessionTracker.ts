import { ActiveSession } from "../types/frp.js";

export class SessionTracker {
  private activeSessions: ActiveSession[] = [];

  addSession(session: ActiveSession): void {
    this.activeSessions.push(session);
    console.log(
      `Session added: ${session.sessionId} (Discord ID: ${session.discordId}, Port: ${session.remotePort})`
    );
    console.log(`Total active sessions: ${this.activeSessions.length}`);
  }

  removeSession(sessionId: string): void {
    const index = this.activeSessions.findIndex((s) => s.sessionId === sessionId);
    
    if (index !== -1) {
      const removed = this.activeSessions.splice(index, 1)[0];
      console.log(
        `Session removed: ${removed.sessionId} (Discord ID: ${removed.discordId}, Port: ${removed.remotePort})`
      );
      console.log(`Total active sessions: ${this.activeSessions.length}`);
    } else {
      console.log(`Session not found for removal: ${sessionId}`);
    }
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
}

export const sessionTracker = new SessionTracker();

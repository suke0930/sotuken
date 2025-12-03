export interface FrpWebhookRequest {
  version: string;
  op: "Login" | "NewProxy" | "CloseProxy" | "Ping";
  content: {
    // Login event uses metas directly
    metas?: {
      token: string;
      fingerprint: string;
    };
    // NewProxy and CloseProxy events use user.metas
    user?: {
      metas?: {
        token: string;
        fingerprint: string;
      };
    };
    proxy_name?: string;
    remote_port?: number;
  };
}

export interface FrpWebhookResponse {
  reject: boolean;
  reject_reason?: string;
  unchange: boolean;
}

export interface User {
  discordId: string;
  allowedPorts: number[];
  maxSessions: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserStore {
  users: User[];
}

export interface ActiveSession {
  sessionId: string;
  discordId: string;
  remotePort: number;
  connectedAt: Date;
  clientFingerprint: string;
}

export interface VerifyJwtResponse {
  valid: boolean;
  sessionId?: string;
  discordId?: string;
  expiresAt?: string;
  reason?: string;
}

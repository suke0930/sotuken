import { ChildProcessWithoutNullStreams } from "child_process";

export type SupportedPlatform = NodeJS.Platform;

export interface BinaryDownloadTarget {
  platform: SupportedPlatform;
  arch: NodeJS.Architecture;
  url: string;
  fileName?: string;
  sha256?: string;
}

export interface FrpManagerConfig {
  authServerUrl: string;
  frpServerAddr: string;
  frpServerPort: number;
  jwtRefreshIntervalHours: number;
  jwtRefreshMarginMinutes: number;
  authPollIntervalMs: number;
  dataDir: string;
  binaryDir: string;
  configDir: string;
  logsDir: string;
  sessionsFile: string;
  fingerprintFile: string;
  volatileSessions: boolean;
  binaryVersion: string;
  downloadTargets: BinaryDownloadTarget[];
  logRetention: {
    maxLines: number;
    maxBytes: number;
    rotateLimit: number;
  };
}

export interface FrpSessionRecord {
  sessionId: string;
  discordId: string;
  displayName?: string;
  remotePort: number;
  localPort: number;
  status: "starting" | "running" | "stopping" | "stopped" | "error";
  createdAt: string;
  updatedAt: string;
  logPath: string;
  configPath: string;
  lastError?: string;
}

export interface ActiveFrpProcess extends FrpSessionRecord {
  process: ChildProcessWithoutNullStreams;
  startedAt: Date;
}

export interface StartFrpProcessPayload {
  sessionId: string;
  discordId: string;
  displayName?: string;
  remotePort: number;
  localPort: number;
  fingerprint: string;
  jwt: string;
  extraMetas?: Record<string, string>;
}

export interface AuthTokens {
  jwt: string;
  refreshToken?: string;
  expiresAt: string;
  discordUser: {
    id: string;
    username: string;
    avatar?: string;
  };
}

export interface AuthStatus {
  linked: boolean;
  state?: "idle" | "pending" | "completed" | "expired" | "error" | "not_found";
  authUrl?: string;
  lastUpdated?: string;
  discordUser?: {
    id: string;
    username: string;
    avatar?: string;
  };
  message?: string;
}

export interface SessionStoreShape {
  version: number;
  sessions: FrpSessionRecord[];
  lastSaved: string;
}

export interface LogTailOptions {
  lines?: number;
  since?: Date;
}

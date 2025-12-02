export interface Session {
  sessionId: string;
  discordId: string;
  clientFingerprint: string;
  createdAt: string;
  expiresAt: string;
  lastActivity: string;
}

export interface SessionStore {
  sessions: Session[];
}

export interface JwtPayload {
  sessionId: string;
  fingerprint: string;
  iat: number;
  exp: number;
}

export interface VerifyJwtRequest {
  jwt: string;
  fingerprint: string;
}

export interface VerifyJwtResponse {
  valid: boolean;
  sessionId?: string;
  discordId?: string;
  expiresAt?: string;
  reason?: string;
}

export interface ExchangeCodeRequest {
  code: string;
  fingerprint: string;
  redirectUri: string;
}

export interface ExchangeCodeResponse {
  jwt: string;
  expiresAt: string;
  discordUser: {
    id: string;
    username: string;
    avatar: string;
    discriminator: string;
  };
}

export interface DiscordUser {
  id: string;
  username: string;
  avatar: string | null;
  discriminator: string;
  email?: string;
}

// Arctic API Types
export interface AuthUrlResponse {
  url: string;
  state: string;
  message: string;
}

export interface TokenRequest {
  code: string;
  state: string;
  fingerprint: string;
}

export interface TokenResponse {
  jwt: string;
  expiresAt: string;
  discordUser: {
    id: string;
    username: string;
    avatar: string;
    discriminator: string;
  };
}

export interface CallbackRequest {
  code: string;
  state: string;
}

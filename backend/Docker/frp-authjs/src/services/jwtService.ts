import jwt from "jsonwebtoken";
import { JwtPayload, VerifyJwtResponse, RefreshTokenResponse, RefreshTokenError } from "../types/session.js";
import { env } from "../config/env.js";
import { sessionManager } from "./sessionManager.js";
import { getAvatarUrl } from "../utils/discord.js";
import crypto from "crypto";

export class JwtService {
  private readonly REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60; // 7 days in seconds
  
  generateJwt(sessionId: string, fingerprint: string): string {
    const now = Math.floor(Date.now() / 1000);
    
    const payload: JwtPayload = {
      sessionId,
      fingerprint,
      iat: now,
      exp: now + env.SESSION_EXPIRY,
    };

    const token = jwt.sign(payload, env.JWT_SECRET, {
      algorithm: "HS256",
    });

    return token;
  }

  verifyJwt(token: string, fingerprint: string): VerifyJwtResponse {
    try {
      // Verify JWT signature and expiration
      const decoded = jwt.verify(token, env.JWT_SECRET, {
        algorithms: ["HS256"],
      }) as JwtPayload;

      // Verify fingerprint matches
      if (decoded.fingerprint !== fingerprint) {
        return {
          valid: false,
          reason: "Fingerprint mismatch",
        };
      }

      // Get session from sessionManager
      const session = sessionManager.getSession(decoded.sessionId);

      if (!session) {
        return {
          valid: false,
          reason: "Session not found",
        };
      }

      // Validate fingerprint again with session
      if (!sessionManager.validateFingerprint(decoded.sessionId, fingerprint)) {
        return {
          valid: false,
          reason: "Fingerprint mismatch with session",
        };
      }

      return {
        valid: true,
        sessionId: session.sessionId,
        discordId: session.discordId,
        username: session.username,
        avatarUrl: getAvatarUrl(session.discordId, session.avatar),
        expiresAt: session.expiresAt,
      };
    } catch (error: any) {
      if (error.name === "TokenExpiredError") {
        return {
          valid: false,
          reason: "Token expired",
        };
      } else if (error.name === "JsonWebTokenError") {
        return {
          valid: false,
          reason: "Invalid token signature",
        };
      } else {
        return {
          valid: false,
          reason: `Token verification failed: ${error.message}`,
        };
      }
    }
  }

  /**
   * Generate a refresh token
   */
  generateRefreshToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Verify and refresh access token
   */
  refreshAccessToken(refreshToken: string, fingerprint: string): RefreshTokenResponse | RefreshTokenError {
    try {
      // Find session by refresh token
      const session = sessionManager.getSessionByRefreshToken(refreshToken);

      if (!session) {
        return {
          error: "Invalid refresh token",
          reason: "session_not_found",
          message: "No session found with this refresh token",
        };
      }

      // Check if refresh token is expired
      if (session.refreshTokenExpiresAt) {
        const expiresAt = new Date(session.refreshTokenExpiresAt);
        if (Date.now() > expiresAt.getTime()) {
          return {
            error: "Refresh token expired",
            reason: "token_expired",
            message: "Refresh token has expired. Please re-authenticate.",
          };
        }
      }

      // Verify fingerprint
      if (session.clientFingerprint !== fingerprint) {
        // Security breach: invalidate all sessions for this user
        sessionManager.invalidateAllUserSessions(session.discordId);
        console.error(`⚠️  Fingerprint mismatch detected for session ${session.sessionId}. All sessions invalidated.`);
        
        return {
          error: "Fingerprint mismatch",
          reason: "fingerprint_mismatch",
          message: "Security breach detected. All sessions have been invalidated.",
        };
      }

      // Generate new tokens (token rotation)
      const newAccessToken = this.generateJwt(session.sessionId, fingerprint);
      const newRefreshToken = this.generateRefreshToken();
      
      const now = new Date();
      const accessTokenExpiresAt = new Date(now.getTime() + env.SESSION_EXPIRY * 1000);
      const refreshTokenExpiresAt = new Date(now.getTime() + this.REFRESH_TOKEN_EXPIRY * 1000);

      // Update session with new refresh token
      sessionManager.updateRefreshToken(session.sessionId, newRefreshToken, refreshTokenExpiresAt.toISOString());

      console.log(`✅ Refreshed access token for session ${session.sessionId}`);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresAt: accessTokenExpiresAt.toISOString(),
        refreshExpiresAt: refreshTokenExpiresAt.toISOString(),
      };
    } catch (error: any) {
      console.error("Error refreshing access token:", error);
      return {
        error: "Token refresh failed",
        reason: "invalid_token",
        message: error.message,
      };
    }
  }
}

export const jwtService = new JwtService();

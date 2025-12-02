import jwt from "jsonwebtoken";
import { JwtPayload, VerifyJwtResponse } from "../types/session.js";
import { env } from "../config/env.js";
import { sessionManager } from "./sessionManager.js";

export class JwtService {
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
}

export const jwtService = new JwtService();

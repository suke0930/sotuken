import { Request, Response, NextFunction } from "express";
import { jwtService } from "../services/jwtService.js";

/**
 * JWT Authentication Middleware
 * 
 * Verifies JWT from Authorization header and fingerprint from X-Fingerprint header
 * Attaches session information to request object
 */

export interface AuthenticatedRequest extends Request {
  auth?: {
    sessionId: string;
    discordId: string;
    username: string;
    avatarUrl: string;
    fingerprint: string;
  };
}

export function authenticateJwt(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const fingerprint = req.headers["x-fingerprint"] as string;

  // Check Authorization header
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Missing or invalid Authorization header",
    });
  }

  // Check X-Fingerprint header
  if (!fingerprint) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Missing X-Fingerprint header",
    });
  }

  const token = authHeader.substring(7); // Remove "Bearer " prefix

  // Verify JWT
  const result = jwtService.verifyJwt(token, fingerprint);

  if (!result.valid) {
    return res.status(401).json({
      error: "Unauthorized",
      message: result.reason || "Invalid token",
    });
  }

  // Attach auth info to request
  req.auth = {
    sessionId: result.sessionId!,
    discordId: result.discordId!,
    username: result.username!,
    avatarUrl: result.avatarUrl!,
    fingerprint,
  };

  next();
}

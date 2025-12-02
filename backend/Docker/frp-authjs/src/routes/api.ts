import express, { Request, Response } from "express";
import { discordOAuth2Service } from "../services/discordOAuth2.js";
import { sessionManager } from "../services/sessionManager.js";
import { jwtService } from "../services/jwtService.js";
import {
  VerifyJwtRequest,
  TokenRequest,
  AuthUrlResponse,
  TokenResponse,
} from "../types/session.js";

const router = express.Router();

/**
 * GET /api/health
 * Health check endpoint
 */
router.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "FRP Arctic Auth Server",
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/auth/url
 * Generate Discord OAuth2 authentication URL
 * 
 * This replaces Auth.js's /auth/signin endpoint.
 * Returns a JSON response with the auth URL instead of redirecting to HTML.
 */
router.get("/api/auth/url", async (_req: Request, res: Response) => {
  try {
    const { url, state } = await discordOAuth2Service.createAuthorizationURL();

    const response: AuthUrlResponse = {
      url,
      state,
      message: "Open this URL in a browser to authenticate with Discord",
    };

    res.json(response);
  } catch (error: any) {
    console.error("Error generating auth URL:", error);
    res.status(500).json({
      error: "Failed to generate authentication URL",
      message: error.message,
    });
  }
});

/**
 * POST /api/auth/token
 * Exchange Discord OAuth2 authorization code for JWT
 * 
 * This replaces the old POST /api/exchange-code endpoint.
 * 
 * Request body:
 * {
 *   code: string,      // Authorization code from Discord
 *   state: string,     // State parameter for CSRF protection
 *   fingerprint: string // Client fingerprint
 * }
 */
router.post("/api/auth/token", async (req: Request, res: Response) => {
  const { code, state, fingerprint } = req.body as TokenRequest;

  if (!code || !state || !fingerprint) {
    return res.status(400).json({
      error: "Missing required parameters",
      message: "code, state, and fingerprint are required",
    });
  }

  try {
    // Validate state parameter (CSRF protection)
    if (!discordOAuth2Service.validateState(state)) {
      return res.status(400).json({
        error: "Invalid state parameter",
        message: "State validation failed. Please restart the authentication flow.",
      });
    }

    // Exchange authorization code for access token
    const tokens = await discordOAuth2Service.validateAuthorizationCode(code);

    // Fetch user information from Discord
    const discordUser = await discordOAuth2Service.fetchUser(tokens.accessToken);

    // Create session
    const session = sessionManager.createSession(discordUser.id, fingerprint);

    // Generate JWT
    const jwt = jwtService.generateJwt(session.sessionId, fingerprint);

    const response: TokenResponse = {
      jwt,
      expiresAt: session.expiresAt,
      discordUser: {
        id: discordUser.id,
        username: discordUser.username,
        avatar: discordUser.avatar || "",
        discriminator: discordUser.discriminator,
      },
    };

    return res.json(response);
  } catch (error: any) {
    console.error("Error in /api/auth/token:", error);
    return res.status(500).json({
      error: "Authentication failed",
      message: error.message,
    });
  }
});

/**
 * POST /api/verify-jwt
 * Verify JWT and return Discord ID
 * 
 * This endpoint remains unchanged from the previous implementation.
 */
router.post("/api/verify-jwt", (req: Request, res: Response) => {
  const { jwt: token, fingerprint } = req.body as VerifyJwtRequest;

  if (!token || !fingerprint) {
    return res.status(400).json({
      valid: false,
      reason: "Missing jwt or fingerprint",
    });
  }

  const result = jwtService.verifyJwt(token, fingerprint);

  if (!result.valid) {
    return res.status(401).json(result);
  }

  return res.json(result);
});

export default router;

import express, { Request, Response } from "express";
import { discordOAuth2Service } from "../services/discordOAuth2.js";
import { pendingAuthManager } from "../services/pendingAuthManager.js";
import { sessionManager } from "../services/sessionManager.js";
import { jwtService } from "../services/jwtService.js";
import { VerifyJwtRequest, DiscordUser, RefreshTokenRequest, UserInfoResponse } from "../types/session.js";
import { authenticateJwt, AuthenticatedRequest } from "../middleware/auth.js";
import { getAvatarUrl } from "../utils/discord.js";
import axios from "axios";

const router = express.Router();

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * GET /api/health
 */
router.get("/health", (_req: Request, res: Response) => {
  const stats = pendingAuthManager.getStats();
  res.json({
    status: "ok",
    service: "FRP Polling Auth Server",
    version: "3.0.0",
    timestamp: new Date().toISOString(),
    pendingAuths: stats,
  });
});

/**
 * POST /api/auth/init
 * Initialize authentication and return tempToken + authUrl
 */
router.post("/auth/init", async (req: Request, res: Response) => {
  const { fingerprint } = req.body;

  if (!fingerprint) {
    return res.status(400).json({
      error: "Missing fingerprint",
      message: "fingerprint is required",
    });
  }

  try {
    // Generate auth URL and state
    const { url, state } = await discordOAuth2Service.createAuthorizationURL();

    // Create pending auth entry
    const pendingAuth = pendingAuthManager.create(state, url, fingerprint);

    return res.json({
      tempToken: pendingAuth.tempToken,
      authUrl: pendingAuth.authUrl,
      expiresIn: 600, // 10 minutes
      message: "Open authUrl in browser, then poll /api/auth/poll with tempToken",
    });
  } catch (error: any) {
    console.error("Error in /api/auth/init:", error);
    return res.status(500).json({
      error: "Failed to initialize authentication",
      message: error.message,
    });
  }
});

/**
 * GET /api/auth/poll
 * Poll for authentication status
 */
router.get("/auth/poll", (req: Request, res: Response) => {
  const { tempToken } = req.query;

  if (!tempToken || typeof tempToken !== "string") {
    return res.status(400).json({
      error: "Missing tempToken",
      message: "tempToken query parameter is required",
    });
  }

  const pendingAuth = pendingAuthManager.getByTempToken(tempToken);

  if (!pendingAuth) {
    return res.status(404).json({
      status: "not_found",
      message: "Invalid or expired tempToken",
    });
  }

  // Check status
  if (pendingAuth.status === "expired") {
    return res.status(410).json({
      status: "expired",
      message: "Authentication session expired. Please restart with /api/auth/init",
    });
  }

  if (pendingAuth.status === "completed") {
    // Get session to include refresh token
    const sessionId = pendingAuth.jwt ? jwtService.verifyJwt(pendingAuth.jwt, pendingAuth.fingerprint).sessionId : undefined;
    const session = sessionId ? sessionManager.getSession(sessionId) : null;

    // Prepare response data before deletion
    const responseData = {
      status: "completed" as const,
      jwt: pendingAuth.jwt,
      refreshToken: session?.refreshToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      refreshExpiresAt: session?.refreshTokenExpiresAt,
      discordUser: pendingAuth.discordUser,
    };

    // Delete tempToken immediately to prevent reuse (one-time use token)
    pendingAuthManager.delete(tempToken);
    console.log(`🔒 TempToken consumed and deleted: ${tempToken}`);

    return res.json(responseData);
  }

  // Still pending
  return res.json({
    status: "pending",
    message: "Waiting for user authentication in browser...",
  });
});

/**
 * GET /api/auth/callback
 * Discord OAuth2 callback
 */
router.get("/auth/callback", async (req: Request, res: Response) => {
  const { code, state } = req.query;

  if (!code || !state || typeof code !== "string" || typeof state !== "string") {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
      <head><title>Authentication Error</title></head>
      <body style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h1>❌ Authentication Error</h1>
        <p>Missing code or state parameter.</p>
      </body>
      </html>
    `);
  }

  try {
    // Validate OAuth2 state (CSRF protection, one-time use)
    const isValidState = discordOAuth2Service.validateState(state);
    if (!isValidState) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Invalid State</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h1>❌ Invalid State</h1>
          <p>Invalid or expired authentication session.</p>
        </body>
        </html>
      `);
    }

    // Find pending auth by state
    const pendingAuth = pendingAuthManager.getByState(state);

    if (
      !pendingAuth ||
      pendingAuth.status === "expired" ||
      pendingAuth.expiresAt.getTime() < Date.now()
    ) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Invalid State</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h1>❌ Invalid State</h1>
          <p>Invalid or expired authentication session.</p>
        </body>
        </html>
      `);
    }

    // Exchange code for tokens
    const tokens = await discordOAuth2Service.validateAuthorizationCode(code);

    // Fetch user info
    const discordUser = await discordOAuth2Service.fetchUser(tokens.accessToken) as DiscordUser;

    // Generate refresh token
    const refreshToken = jwtService.generateRefreshToken();

    // Create session with user info and refresh token
    const session = sessionManager.createSession(
      discordUser.id,
      pendingAuth.fingerprint,
      discordUser.username,
      discordUser.avatar,
      refreshToken
    );

    // Generate JWT
    const jwt = jwtService.generateJwt(session.sessionId, pendingAuth.fingerprint);

    // Complete pending auth
    pendingAuthManager.complete(pendingAuth.tempToken, jwt, {
      id: discordUser.id,
      username: discordUser.username,
      avatar: discordUser.avatar || "",
      discriminator: discordUser.discriminator,
    });

    // Return success page
    const safeUsername = escapeHtml(discordUser.username);
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authentication Successful</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            text-align: center;
            padding: 50px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
          }
          .container {
            background: white;
            color: #333;
            padding: 40px;
            border-radius: 10px;
            max-width: 500px;
            margin: 0 auto;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
          }
          h1 { color: #667eea; }
          .success-icon { font-size: 64px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success-icon">✅</div>
          <h1>Authentication Successful!</h1>
          <p>Welcome, <strong>${safeUsername}</strong>!</p>
          <p>You can now close this window and return to your application.</p>
        </div>
      </body>
      </html>
    `);
  } catch (error: any) {
    console.error("Error in /api/auth/callback:", error);
    const safeErrorMessage = escapeHtml(
      typeof error?.message === "string" ? error.message : "An unexpected error occurred"
    );
    return res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head><title>Authentication Failed</title></head>
      <body style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h1>❌ Authentication Failed</h1>
        <p>${safeErrorMessage}</p>
      </body>
      </html>
    `);
  }
});

/**
 * POST /api/verify-jwt
 * Verify JWT (unchanged from v2.0)
 */
router.post("/verify-jwt", (req: Request, res: Response) => {
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

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post("/auth/refresh", (req: Request, res: Response) => {
  const { refreshToken, fingerprint } = req.body as RefreshTokenRequest;

  if (!refreshToken || !fingerprint) {
    return res.status(400).json({
      error: "Missing required fields",
      message: "refreshToken and fingerprint are required",
    });
  }

  const result = jwtService.refreshAccessToken(refreshToken, fingerprint);

  // Check if result is an error
  if ("error" in result) {
    const statusCode = result.reason === "token_expired" ? 401 : 
                       result.reason === "fingerprint_mismatch" ? 403 : 400;
    return res.status(statusCode).json(result);
  }

  return res.json(result);
});

/**
 * GET /api/user/info
 * Get current user session information and permissions
 */
router.get("/user/info", authenticateJwt, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.auth) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required",
      });
    }

    const { sessionId, discordId, username, avatarUrl } = req.auth;

    // Get current session details
    const session = sessionManager.getSession(sessionId);
    if (!session) {
      return res.status(404).json({
        error: "Session not found",
        message: "Your session has expired",
      });
    }

    // Call frp-authz internal API to get permissions and active sessions
    const authzUrl = process.env.AUTHZ_INTERNAL_URL || "http://frp-authz:3001";
    let permissions = { allowedPorts: [], maxSessions: 0 };
    let activeSessions = { total: 0, sessions: [] };
    let authzError: string | null = null;

    try {
      const authzResponse = await axios.get(`${authzUrl}/internal/user/${discordId}/info`, {
        timeout: 5000, // 5 second timeout
      });
      permissions = authzResponse.data.permissions;
      activeSessions = authzResponse.data.activeSessions;
    } catch (error: any) {
      console.error("Failed to fetch user info from frp-authz:", error.message);
      authzError = error.response?.data?.message || error.message || "Unknown error";

      // Log detailed error for debugging
      if (error.response) {
        console.error(`  Status: ${error.response.status}`);
        console.error(`  Data:`, error.response.data);
      }
    }

    const userInfo: UserInfoResponse = {
      user: {
        discordId,
        username,
        avatarUrl,
      },
      currentSession: {
        sessionId: session.sessionId,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        lastActivity: session.lastActivity,
      },
      permissions,
      activeSessions,
    };

    // Add warning header if authz fetch failed
    if (authzError) {
      res.setHeader('X-Warning', `Failed to fetch permissions: ${authzError}`);
    }

    return res.json(userInfo);
  } catch (error: any) {
    console.error("Error in /api/user/info:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
});

export default router;

import express, { Request, Response } from "express";
import { sessionManager } from "../services/sessionManager.js";
import { jwtService } from "../services/jwtService.js";
import {
  VerifyJwtRequest,
  ExchangeCodeRequest,
  DiscordUser,
} from "../types/session.js";
import { env } from "../config/env.js";

const router = express.Router();

// Health check endpoint
router.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "FRP Auth.js Server",
    timestamp: new Date().toISOString(),
  });
});

// POST /api/verify-jwt - Verify JWT and return Discord ID
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

// POST /api/exchange-code - Exchange Discord OAuth2 code for JWT
router.post("/exchange-code", async (req: Request, res: Response) => {
  const { code, fingerprint, redirectUri } = req.body as ExchangeCodeRequest;

  if (!code || !fingerprint || !redirectUri) {
    return res.status(400).json({
      error: "Missing required parameters",
      message: "code, fingerprint, and redirectUri are required",
    });
  }

  try {
    // Exchange authorization code for access token
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: env.AUTH_DISCORD_ID,
        client_secret: env.AUTH_DISCORD_SECRET,
        grant_type: "authorization_code",
        code: code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error("Discord token exchange failed:", errorData);
      return res.status(401).json({
        error: "Authentication failed",
        message: "Failed to exchange authorization code",
      });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Fetch user information from Discord
    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.ok) {
      console.error("Discord user fetch failed");
      return res.status(401).json({
        error: "Authentication failed",
        message: "Failed to fetch user information",
      });
    }

    const discordUser: DiscordUser = await userResponse.json();

    // Create session
    const session = sessionManager.createSession(discordUser.id, fingerprint);

    // Generate JWT
    const jwt = jwtService.generateJwt(session.sessionId, fingerprint);

    return res.json({
      jwt,
      expiresAt: session.expiresAt,
      discordUser: {
        id: discordUser.id,
        username: discordUser.username,
        avatar: discordUser.avatar || "",
        discriminator: discordUser.discriminator,
      },
    });
  } catch (error: any) {
    console.error("Error in /api/exchange-code:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
});

export default router;

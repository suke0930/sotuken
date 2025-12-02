import express, { Request, Response } from "express";
import { userManager } from "../services/userManager.js";
import { sessionTracker } from "../services/sessionTracker.js";

const router = express.Router();

/**
 * GET /internal/user/:discordId/info
 * Internal API to get user permissions and active sessions
 * Called by frp-authjs for user info endpoint
 */
router.get("/user/:discordId/info", async (req: Request, res: Response) => {
  const { discordId } = req.params;

  try {
    // Get user permissions from userManager
    const userPermissions = await userManager.getUserPermissions(discordId);

    if (!userPermissions) {
      // User not found in permissions DB - return default empty permissions
      return res.json({
        permissions: {
          allowedPorts: [],
          maxSessions: 0,
        },
        activeSessions: {
          total: 0,
          sessions: [],
        },
      });
    }

    // Get active FRP sessions for this user
    const userSessions = sessionTracker.getUserSessions(discordId);

    const activeSessions = userSessions.map((session) => ({
      sessionId: session.sessionId,
      remotePort: session.remotePort,
      connectedAt: session.connectedAt,
      fingerprint: session.fingerprint.substring(0, 8), // Only first 8 characters
    }));

    return res.json({
      permissions: {
        allowedPorts: userPermissions.allowedPorts,
        maxSessions: userPermissions.maxSessions,
      },
      activeSessions: {
        total: userSessions.length,
        sessions: activeSessions,
      },
    });
  } catch (error: any) {
    console.error(`Error getting user info for ${discordId}:`, error);
    return res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
});

export default router;

import express, { Request, Response } from "express";
import { userManager } from "../services/userManager.js";
import { sessionTracker } from "../services/sessionTracker.js";
import { authClient } from "../services/authClient.js";
import { FrpWebhookRequest, FrpWebhookResponse } from "../types/frp.js";

const router = express.Router();

// POST /webhook/handler - FRP Server Webhook Handler
router.post("/handler", async (req: Request, res: Response) => {
  const webhookReq = req.body as FrpWebhookRequest;

  console.log(`\n=== Webhook received: op=${webhookReq.op} ===`);

  try {
    switch (webhookReq.op) {
      case "Login":
        await handleLogin(webhookReq, res);
        break;
      case "NewProxy":
        await handleNewProxy(webhookReq, res);
        break;
      case "CloseProxy":
        await handleCloseProxy(webhookReq, res);
        break;
      case "Ping":
        handlePing(res);
        break;
      default:
        res.json({
          reject: true,
          reject_reason: `Unknown operation: ${webhookReq.op}`,
          unchange: true,
        } as FrpWebhookResponse);
    }
  } catch (error: any) {
    console.error(`Error handling ${webhookReq.op}:`, error);
    res.json({
      reject: true,
      reject_reason: `Internal error: ${error.message}`,
      unchange: true,
    } as FrpWebhookResponse);
  }
});

async function handleLogin(
  webhookReq: FrpWebhookRequest,
  res: Response
): Promise<void> {
  const token = webhookReq.content?.metas?.token;
  const fingerprint = webhookReq.content?.metas?.fingerprint;

  if (!token || !fingerprint) {
    console.log("Login rejected: Missing token or fingerprint");
    console.log("Webhook content:", JSON.stringify(webhookReq.content, null, 2));

    res.json({
      reject: true,
      reject_reason: "Missing token or fingerprint in metas",
      unchange: true,
    } as FrpWebhookResponse);
    return;
  }

  // Validate token and fingerprint format
  if (typeof token !== 'string' || token.length === 0) {
    console.log("Login rejected: Invalid token format");
    res.json({
      reject: true,
      reject_reason: "Invalid token format",
      unchange: true,
    } as FrpWebhookResponse);
    return;
  }

  if (typeof fingerprint !== 'string' || fingerprint.length === 0) {
    console.log("Login rejected: Invalid fingerprint format");
    res.json({
      reject: true,
      reject_reason: "Invalid fingerprint format",
      unchange: true,
    } as FrpWebhookResponse);
    return;
  }

  // Verify JWT with Auth.js server
  let verifyResult;
  try {
    verifyResult = await authClient.verifyJwt(token, fingerprint);
  } catch (error: any) {
    console.error("Login rejected: JWT verification error:", error.message);
    res.json({
      reject: true,
      reject_reason: "JWT verification failed",
      unchange: true,
    } as FrpWebhookResponse);
    return;
  }

  if (!verifyResult.valid) {
    console.log(`Login rejected: ${verifyResult.reason || "Invalid JWT"}`);
    res.json({
      reject: true,
      reject_reason: verifyResult.reason || "JWT verification failed",
      unchange: true,
    } as FrpWebhookResponse);
    return;
  }

  console.log(`Login accepted: Discord ID ${verifyResult.discordId || "unknown"}`);
  res.json({
    reject: false,
    unchange: true,
  } as FrpWebhookResponse);
}

async function handleNewProxy(
  webhookReq: FrpWebhookRequest,
  res: Response
): Promise<void> {
  const token = webhookReq.content?.user?.metas?.token;
  const fingerprint = webhookReq.content?.user?.metas?.fingerprint;
  const remotePort = webhookReq.content?.remote_port;
  const proxyName = webhookReq.content?.proxy_name;

  if (!token || !fingerprint) {
    console.log("NewProxy rejected: Missing token or fingerprint");
    console.log("Webhook content:", JSON.stringify(webhookReq.content, null, 2));

    res.json({
      reject: true,
      reject_reason: "Missing token or fingerprint in user.metas",
      unchange: true,
    } as FrpWebhookResponse);
    return;
  }

  if (!remotePort || typeof remotePort !== 'number') {
    console.log("NewProxy rejected: Missing or invalid remote_port");
    res.json({
      reject: true,
      reject_reason: "Missing or invalid remote_port",
      unchange: true,
    } as FrpWebhookResponse);
    return;
  }

  // Validate port range
  if (remotePort < 1 || remotePort > 65535) {
    console.log(`NewProxy rejected: Invalid port number ${remotePort}`);
    res.json({
      reject: true,
      reject_reason: `Invalid port number: ${remotePort}`,
      unchange: true,
    } as FrpWebhookResponse);
    return;
  }

  // Verify JWT with Auth.js server
  let verifyResult;
  try {
    verifyResult = await authClient.verifyJwt(token, fingerprint);
  } catch (error: any) {
    console.error("NewProxy rejected: JWT verification error:", error.message);
    res.json({
      reject: true,
      reject_reason: "JWT verification failed",
      unchange: true,
    } as FrpWebhookResponse);
    return;
  }

  if (!verifyResult.valid || !verifyResult.discordId) {
    console.log(`NewProxy rejected: ${verifyResult.reason || "Invalid JWT"}`);
    res.json({
      reject: true,
      reject_reason: verifyResult.reason || "JWT verification failed",
      unchange: true,
    } as FrpWebhookResponse);
    return;
  }

  const discordId = verifyResult.discordId;

  // Check port permission
  if (!userManager.isPortAllowed(discordId, remotePort)) {
    const user = userManager.getUser(discordId);
    const allowedPorts = user?.allowedPorts || [];
    console.log(
      `NewProxy rejected: Port ${remotePort} not allowed for Discord ID ${discordId}`
    );
    console.log(`  Allowed ports for this user: ${allowedPorts.join(', ') || 'none'}`);
    res.json({
      reject: true,
      reject_reason: `Port ${remotePort} not allowed. Allowed ports: ${allowedPorts.join(', ') || 'none'}`,
      unchange: true,
    } as FrpWebhookResponse);
    return;
  }

  // Check if port is already in use
  const existingSession = sessionTracker.getSessionByPort(discordId, remotePort);
  if (existingSession) {
    console.log(
      `NewProxy rejected: Port ${remotePort} already in use by Discord ID ${discordId}`
    );
    console.log(`  Existing session: ${existingSession.sessionId}`);
    res.json({
      reject: true,
      reject_reason: `Port ${remotePort} is already in use by your account. Please close the existing connection first.`,
      unchange: true,
    } as FrpWebhookResponse);
    return;
  }

  // Check session limit
  const currentSessions = sessionTracker.countSessions(discordId);
  const maxSessions = userManager.getMaxSessions(discordId);

  if (currentSessions >= maxSessions) {
    console.log(
      `NewProxy rejected: Max sessions (${maxSessions}) exceeded for Discord ID ${discordId}`
    );
    console.log(`  Current sessions: ${currentSessions}`);
    res.json({
      reject: true,
      reject_reason: `Maximum sessions (${maxSessions}) exceeded. Current: ${currentSessions}`,
      unchange: true,
    } as FrpWebhookResponse);
    return;
  }

  // Add to active sessions (returns false if port already in use)
  const added = sessionTracker.addSession({
    sessionId: verifyResult.sessionId || "unknown",
    discordId,
    remotePort,
    connectedAt: new Date(),
    clientFingerprint: fingerprint,
  });

  if (!added) {
    console.log(
      `NewProxy rejected: Failed to add session for Discord ID ${discordId}, Port ${remotePort}`
    );
    res.json({
      reject: true,
      reject_reason: `Failed to add session. Port ${remotePort} may already be in use.`,
      unchange: true,
    } as FrpWebhookResponse);
    return;
  }

  console.log(
    `NewProxy accepted: Discord ID ${discordId}, Port ${remotePort}, Proxy ${proxyName || 'unnamed'}`
  );
  res.json({
    reject: false,
    unchange: true,
  } as FrpWebhookResponse);
}

async function handleCloseProxy(
  webhookReq: FrpWebhookRequest,
  res: Response
): Promise<void> {
  const token = webhookReq.content.user?.metas?.token;
  const fingerprint = webhookReq.content.user?.metas?.fingerprint;
  const remotePort = webhookReq.content.remote_port;

  let sessionRemoved = false;

  // Primary method: Try to verify JWT to get discordId and use composite key
  if (token && fingerprint && remotePort) {
    try {
      const verifyResult = await authClient.verifyJwt(token, fingerprint);
      if (verifyResult.valid && verifyResult.discordId) {
        // Use composite key removal (discordId + port)
        sessionRemoved = sessionTracker.removeSessionByPort(verifyResult.discordId, remotePort);
        if (sessionRemoved) {
          console.log(`CloseProxy: Session removed for Discord ID ${verifyResult.discordId}, Port ${remotePort}`);
        }
      }
    } catch (error: any) {
      console.warn(`CloseProxy: JWT verification failed: ${error.message}`);
    }
  }

  // Fallback method: Remove by port only if primary method failed
  // This handles unexpected disconnections where JWT may be invalid
  if (!sessionRemoved && remotePort) {
    console.log(`CloseProxy: Primary method failed, attempting to find session by port ${remotePort}`);
    sessionRemoved = sessionTracker.removeSessionByPortOnly(remotePort);
  }

  if (!sessionRemoved) {
    console.log(`CloseProxy: No session found to remove (port: ${remotePort || 'unknown'})`);
  }

  console.log("CloseProxy acknowledged");
  res.json({
    reject: false,
    unchange: true,
  } as FrpWebhookResponse);
}

function handlePing(res: Response): void {
  console.log("Ping received");
  res.json({
    reject: false,
    unchange: true,
  } as FrpWebhookResponse);
}

export default router;

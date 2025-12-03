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

  // Add to active sessions
  sessionTracker.addSession({
    sessionId: verifyResult.sessionId || "unknown",
    discordId,
    remotePort,
    connectedAt: new Date(),
    clientFingerprint: fingerprint,
  });

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

  // Primary method: Try to verify JWT to get sessionId
  if (token && fingerprint) {
    const verifyResult = await authClient.verifyJwt(token, fingerprint);
    if (verifyResult.valid && verifyResult.sessionId) {
      sessionTracker.removeSession(verifyResult.sessionId);
      sessionRemoved = true;
    }
  }

  // Fallback method: Remove by port if primary method failed
  if (!sessionRemoved && remotePort) {
    console.log(`CloseProxy: Primary method failed, attempting to find session by port ${remotePort}`);

    // Try to find and remove by port for all users
    // This is less precise but ensures cleanup
    const allSessions = sessionTracker.getAllSessions();
    const matchingSession = allSessions.find(s => s.remotePort === remotePort);

    if (matchingSession) {
      sessionTracker.removeSession(matchingSession.sessionId);
      sessionRemoved = true;
      console.log(`CloseProxy: Session removed by port fallback (Discord ID: ${matchingSession.discordId})`);
    } else {
      console.log(`CloseProxy: No session found for port ${remotePort}`);
    }
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

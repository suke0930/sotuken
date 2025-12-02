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
  const token = webhookReq.content.metas?.token;
  const fingerprint = webhookReq.content.metas?.fingerprint;

  if (!token || !fingerprint) {
    console.log("Login rejected: Missing token or fingerprint");
    console.log(webhookReq.content);

    res.json({
      reject: true,
      reject_reason: "Missing token or fingerprint",
      unchange: true,
    } as FrpWebhookResponse);
    return;
  }

  // Verify JWT with Auth.js server
  const verifyResult = await authClient.verifyJwt(token, fingerprint);

  if (!verifyResult.valid) {
    console.log(`Login rejected: ${verifyResult.reason}`);
    res.json({
      reject: true,
      reject_reason: verifyResult.reason || "JWT verification failed",
      unchange: true,
    } as FrpWebhookResponse);
    return;
  }

  console.log(`Login accepted: Discord ID ${verifyResult.discordId}`);
  res.json({
    reject: false,
    unchange: true,
  } as FrpWebhookResponse);
}

async function handleNewProxy(
  webhookReq: FrpWebhookRequest,
  res: Response
): Promise<void> {
  const token = webhookReq.content.user?.metas?.token;
  const fingerprint = webhookReq.content.user?.metas?.fingerprint;
  const remotePort = webhookReq.content.remote_port;
  const proxyName = webhookReq.content.proxy_name;
  if (!token || !fingerprint) {
    console.log("NewProxy rejected: Missing token or fingerprint");
    console.log(webhookReq.content);
    console.log("Token:", token);
    console.log("Fingerprint:", fingerprint);

    res.json({
      reject: true,
      reject_reason: "Missing token or fingerprint",
      unchange: true,
    } as FrpWebhookResponse);
    return;
  }

  if (!remotePort) {
    console.log("NewProxy rejected: Missing remote_port");
    res.json({
      reject: true,
      reject_reason: "Missing remote_port",
      unchange: true,
    } as FrpWebhookResponse);
    return;
  }

  // Verify JWT with Auth.js server
  const verifyResult = await authClient.verifyJwt(token, fingerprint);

  if (!verifyResult.valid || !verifyResult.discordId) {
    console.log(`NewProxy rejected: ${verifyResult.reason}`);
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
    console.log(
      `NewProxy rejected: Port ${remotePort} not allowed for Discord ID ${discordId}`
    );
    res.json({
      reject: true,
      reject_reason: `Port ${remotePort} not allowed for this user`,
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
    res.json({
      reject: true,
      reject_reason: `Maximum sessions (${maxSessions}) exceeded`,
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
    `NewProxy accepted: Discord ID ${discordId}, Port ${remotePort}, Proxy ${proxyName}`
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

  // Try to verify JWT to get sessionId
  if (token && fingerprint) {
    const verifyResult = await authClient.verifyJwt(token, fingerprint);
    if (verifyResult.valid && verifyResult.sessionId) {
      sessionTracker.removeSession(verifyResult.sessionId);
    }
  } else if (remotePort) {
    // Fallback: find session by port (less reliable)
    console.log(`CloseProxy: Attempting to find session by port ${remotePort}`);
    // This requires enhancement to track sessions by proxy name or port
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

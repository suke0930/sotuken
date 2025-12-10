import crypto from "crypto";
import { Request } from "express";

export function generateFingerprint(req: Request): string {
  const components = [
    req.ip || req.socket.remoteAddress || "unknown",
    req.headers["user-agent"] || "unknown",
    // Add more components as needed for stronger fingerprinting
  ];

  const raw = components.join("|");
  return crypto.createHash("sha256").update(raw).digest("hex");
}

import crypto from "crypto";
import os from "os";

/**
 * Generate a client fingerprint based on machine information
 * This should match the fingerprint generation logic used by the client
 */
export function generateFingerprint(): string {
  const hostname = os.hostname();
  const platform = os.platform();
  const arch = os.arch();
  const userInfo = os.userInfo();
  
  const data = `${hostname}-${platform}-${arch}-${userInfo.username}`;
  const hash = crypto.createHash("sha256").update(data).digest("hex");
  
  return hash;
}

/**
 * Generate a test fingerprint with optional suffix for multiple instances
 */
export function generateTestFingerprint(suffix?: string): string {
  const base = generateFingerprint();
  return suffix ? `${base}-${suffix}` : base;
}

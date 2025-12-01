import { VerifyJwtResponse } from "../types/frp.js";
import { env } from "../types/env.js";

export class AuthClient {
  private baseUrl: string;

  constructor(baseUrl: string = env.AUTHJS_URL) {
    this.baseUrl = baseUrl;
  }

  async verifyJwt(jwt: string, fingerprint: string): Promise<VerifyJwtResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/verify-jwt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jwt,
          fingerprint,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.log("JWT verification failed:", data);
        return {
          valid: false,
          reason: data.reason || "Unknown error",
        };
      }

      return data;
    } catch (error: any) {
      console.error("Error verifying JWT:", error);
      return {
        valid: false,
        reason: `Network error: ${error.message}`,
      };
    }
  }
}

export const authClient = new AuthClient();

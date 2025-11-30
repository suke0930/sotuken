import type { Session } from "@auth/express";

/**
 * Type augmentation for Express
 * Adds session to res.locals for type safety
 */
declare global {
  namespace Express {
    interface Locals {
      session: Session | null;
    }
  }
}

export {};

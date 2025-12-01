import { getSession } from "@auth/express";
import type { Request, Response, NextFunction } from "express";
import { authConfig } from "../config/auth.js";

/**
 * Session middleware
 * Injects the current session into res.locals.session
 * This makes the session available to all route handlers
 */
export async function sessionMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const session = await getSession(req, authConfig);
    res.locals.session = session;
    next();
  } catch (error) {
    console.error("Session middleware error:", error);
    res.locals.session = null;
    next();
  }
}

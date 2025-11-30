import type { Request, Response, NextFunction } from "express";

/**
 * Authentication guard middleware
 * Protects routes by requiring an active session
 * Returns 401 Unauthorized if no session exists
 */
export function requireAuth(
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  const session = res.locals.session;

  if (!session || !session.user) {
    res.status(401).json({
      error: "Unauthorized",
      message: "You must be logged in to access this resource",
    });
    return;
  }

  next();
}

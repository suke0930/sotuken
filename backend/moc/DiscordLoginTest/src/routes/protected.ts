import { Router } from "express";
import type { Request, Response } from "express";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

/**
 * All routes in this router require authentication
 */
router.use(requireAuth);

/**
 * Get current user information
 */
router.get("/api/me", (_req: Request, res: Response) => {
  const user = res.locals.session?.user;
  res.json({ user });
});

/**
 * Get full profile with session details
 */
router.get("/api/profile", (_req: Request, res: Response) => {
  const session = res.locals.session;
  res.json({
    user: session?.user,
    expires: session?.expires,
  });
});

export default router;

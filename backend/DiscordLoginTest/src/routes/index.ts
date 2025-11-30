import { Router } from "express";
import type { Request, Response } from "express";

const router = Router();

/**
 * Root route - redirects based on authentication status
 */
router.get("/", (_req: Request, res: Response) => {
  const session = res.locals.session;
  console.log(session);
  if (session?.user) {
    // User is logged in, redirect to dashboard
    res.redirect("/dashboard.html");
  } else {
    // User is not logged in, show landing page
    res.redirect("/index.html");
  }
});

/**
 * Get current session data (public endpoint)
 */
router.get("/api/session", (_req: Request, res: Response) => {
  res.json({ session: res.locals.session });
});

export default router;

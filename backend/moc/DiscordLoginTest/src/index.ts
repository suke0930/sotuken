import express from "express";
import { ExpressAuth } from "@auth/express";
import { authConfig } from "./config/auth.js";
import { sessionMiddleware } from "./middleware/session.js";
import { env } from "./config/env.js";
import publicRoutes from "./routes/index.js";
import protectedRoutes from "./routes/protected.js";
import path from "path";
import { fileURLToPath } from "url";

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Trust proxy (required for Auth.js behind proxies)
app.set("trust proxy", true);

// Auth.js routes - handles /auth/signin, /auth/callback/discord, etc.
app.use("/auth/*", ExpressAuth(authConfig));

// Session middleware - makes session available in res.locals
app.use(sessionMiddleware);

// Static files from public directory
app.use(express.static(path.join(__dirname, "../public")));

// API routes
// app.use("/api", publicRoutes);
app.use(protectedRoutes);

// Error handling middleware
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
);

// Start server
app.listen(env.PORT, () => {
  console.log(`🚀 Server running on ${env.BASE_URL}`);
  console.log(`📝 Environment: ${env.NODE_ENV}`);
  console.log(`🔐 Auth endpoints:`);
  console.log(`   - Sign in: ${env.BASE_URL}/auth/signin`);
  console.log(`   - Sign out: ${env.BASE_URL}/auth/signout`);
  console.log(`   - Callback: ${env.BASE_URL}/auth/callback/discord`);
});

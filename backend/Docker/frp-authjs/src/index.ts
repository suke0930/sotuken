import express from "express";
import { ExpressAuth } from "@auth/express";
import { authConfig } from "./config/auth.js";
import { env } from "./config/env.js";
import { sessionManager } from "./services/sessionManager.js";
import apiRoutes from "./routes/api.js";

const app = express();

// Trust proxy (required for Auth.js behind proxies)
app.set("trust proxy", true);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Auth.js routes - handles /auth/signin, /auth/callback/discord, etc.
app.use("/auth/*", ExpressAuth(authConfig));

// API routes
app.use("/api", apiRoutes);

// Health check at root
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "FRP Auth.js Server",
    timestamp: new Date().toISOString(),
  });
});

// Root endpoint
app.get("/", (_req, res) => {
  res.json({
    service: "FRP Auth.js Server",
    version: "1.0.0",
    endpoints: {
      auth: {
        signin: "/auth/signin",
        signout: "/auth/signout",
        callback: "/auth/callback/discord",
      },
      api: {
        verifyJwt: "POST /api/verify-jwt",
        exchangeCode: "POST /api/exchange-code",
        health: "GET /api/health",
      },
    },
  });
});

// Error handling middleware
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("Error:", err);
    res.status(500).json({
      error: "Internal server error",
      message: err.message,
    });
  }
);

// Initialize and start server
async function main() {
  try {
    // Initialize session manager
    await sessionManager.initialize();

    // Start Express server
    app.listen(env.PORT, () => {
      console.log(`🚀 FRP Auth.js Server running on port ${env.PORT}`);
      console.log(`📝 Environment: ${env.NODE_ENV}`);
      console.log(`🔐 Auth endpoints:`);
      console.log(`   - Sign in: ${env.BASE_URL}/auth/signin`);
      console.log(`   - Sign out: ${env.BASE_URL}/auth/signout`);
      console.log(`   - Callback: ${env.BASE_URL}/auth/callback/discord`);
      console.log(`📡 API endpoints:`);
      console.log(`   - Verify JWT: POST ${env.BASE_URL}/api/verify-jwt`);
      console.log(`   - Exchange Code: POST ${env.BASE_URL}/api/exchange-code`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

main();

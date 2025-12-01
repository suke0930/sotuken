import express from "express";
import { env } from "./types/env.js";
import { userManager } from "./services/userManager.js";
import webhookRoutes from "./routes/webhook.js";
import { sessionTracker } from "./services/sessionTracker.js";

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "FRP Authorization Service",
    timestamp: new Date().toISOString(),
    activeSessions: sessionTracker.getAllSessions().length,
  });
});

// Webhook routes
app.use("/webhook", webhookRoutes);

// Root endpoint
app.get("/", (_req, res) => {
  res.json({
    service: "FRP Authorization Service",
    version: "1.0.0",
    endpoints: {
      webhook: "POST /webhook/handler",
      health: "GET /health",
    },
    activeSessions: sessionTracker.getAllSessions().length,
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
    // Initialize user manager
    await userManager.initialize();

    // Start Express server
    app.listen(env.PORT, () => {
      console.log(`🚀 FRP Authorization Service running on port ${env.PORT}`);
      console.log(`📝 Environment: ${env.NODE_ENV}`);
      console.log(`🔗 Auth.js Server: ${env.AUTHJS_URL}`);
      console.log(`📡 Webhook endpoint: POST /webhook/handler`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

main();

import express from "express";
import { env } from "./config/env.js";
import { sessionManager } from "./services/sessionManager.js";
import { pendingAuthManager } from "./services/pendingAuthManager.js";
import apiRoutes from "./routes/api.js";

const app = express();

// Trust proxy (required for behind reverse proxies like Nginx)
app.set("trust proxy", true);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes - all API endpoints are under /api
app.use("/api", apiRoutes);

// Health check at root
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "FRP Arctic Auth Server",
    timestamp: new Date().toISOString(),
  });
});

// Root endpoint - API documentation
app.get("/", (_req, res) => {
  res.json({
    service: "FRP Arctic Auth Server",
    version: "2.0.0",
    description: "Discord OAuth2 + JWT Authentication using Arctic",
    endpoints: {
      auth: {
        getAuthUrl: "GET /api/auth/url - Get Discord OAuth2 authorization URL",
        exchangeToken: "POST /api/auth/token - Exchange code for JWT",
      },
      jwt: {
        verifyJwt: "POST /api/verify-jwt - Verify JWT token",
      },
      health: {
        apiHealth: "GET /api/health - API health check",
        rootHealth: "GET /health - Root health check",
      },
    },
    migration: "Migrated from Auth.js to Arctic for lightweight, API-first design",
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

    // Initialize pending auth manager
    pendingAuthManager.initialize();

    // Start Express server
    app.listen(env.PORT, () => {
      console.log(`🚀 FRP Arctic Auth Server running on port ${env.PORT}`);
      console.log(`📝 Environment: ${env.NODE_ENV}`);
      console.log(`🌍 Base URL: ${env.BASE_URL}`);
      console.log(`\n📡 API Endpoints:`);
      console.log(`   - Get Auth URL:    GET  ${env.BASE_URL}/api/auth/url`);
      console.log(`   - Exchange Token:  POST ${env.BASE_URL}/api/auth/token`);
      console.log(`   - Verify JWT:      POST ${env.BASE_URL}/api/verify-jwt`);
      console.log(`   - Health Check:    GET  ${env.BASE_URL}/health`);
      console.log(`\n✨ Arctic Migration Complete!`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

main();

import dotenv from "dotenv";

dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  // JWT Configuration
  JWT_SECRET: requireEnv("JWT_SECRET"),
  
  // Discord OAuth2 Configuration (Arctic)
  DISCORD_CLIENT_ID: requireEnv("DISCORD_CLIENT_ID"),
  DISCORD_CLIENT_SECRET: requireEnv("DISCORD_CLIENT_SECRET"),
  DISCORD_REDIRECT_URI: requireEnv("DISCORD_REDIRECT_URI"),
  
  // Server Configuration
  PORT: parseInt(process.env.PORT || "3000", 10),
  NODE_ENV: process.env.NODE_ENV || "development",
  BASE_URL: process.env.BASE_URL || "http://localhost:8080",
  
  // Session Configuration
  SESSION_EXPIRY: 24 * 60 * 60, // 24 hours in seconds
  
  // Data Paths
  DATA_DIR: process.env.DATA_DIR || "/app/data",
};

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
  // Auth.js Configuration
  AUTH_SECRET: requireEnv("AUTH_SECRET"),
  AUTH_DISCORD_ID: requireEnv("AUTH_DISCORD_ID"),
  AUTH_DISCORD_SECRET: requireEnv("AUTH_DISCORD_SECRET"),
  BASE_URL: process.env.BASE_URL || "http://localhost:8080",
  
  // Server Configuration
  PORT: parseInt(process.env.PORT || "3000", 10),
  NODE_ENV: process.env.NODE_ENV || "development",
  
  // Session Configuration
  SESSION_EXPIRY: 24 * 60 * 60, // 24 hours in seconds
  
  // Data Paths
  DATA_DIR: process.env.DATA_DIR || "/app/data",
};

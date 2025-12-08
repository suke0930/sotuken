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
  // Auth.js Server URL
  AUTHJS_URL: requireEnv("AUTHJS_URL"),

  // Server Configuration
  PORT: parseInt(process.env.PORT || "3001", 10),
  NODE_ENV: process.env.NODE_ENV || "development",

  // Data Paths
  DATA_DIR: process.env.DATA_DIR || "/app/data",

  // Session Sync Configuration
  SYNC_INTERVAL_MS: parseInt(process.env.SYNC_INTERVAL_MS || "1000", 10), // Default: 1 second
};

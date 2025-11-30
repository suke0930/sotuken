import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

/**
 * Get required environment variable
 * Throws error if the variable is not defined
 */
function getEnvVar(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * Validated environment variables
 * All required variables are checked at startup
 */
export const env = {
  AUTH_SECRET: getEnvVar("AUTH_SECRET"),
  AUTH_DISCORD_ID: getEnvVar("AUTH_DISCORD_ID"),
  AUTH_DISCORD_SECRET: getEnvVar("AUTH_DISCORD_SECRET"),
  PORT: parseInt(process.env.PORT || "3000", 10),
  BASE_URL: getEnvVar("BASE_URL"),
  NODE_ENV: process.env.NODE_ENV || "development",
} as const;

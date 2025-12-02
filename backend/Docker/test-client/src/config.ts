import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file
dotenv.config({ path: path.join(__dirname, "../.env") });

export interface Config {
  authServerUrl: string;
  frpServerAddr: string;
  frpServerPort: number;
  testTimeout: number;
  testLocalPort: number;
}

export const config: Config = {
  authServerUrl: process.env.AUTH_SERVER_URL || "http://localhost:8080",
  frpServerAddr: process.env.FRP_SERVER_ADDR || "localhost",
  frpServerPort: parseInt(process.env.FRP_SERVER_PORT || "7000", 10),
  testTimeout: parseInt(process.env.TEST_TIMEOUT || "60000", 10),
  testLocalPort: parseInt(process.env.TEST_LOCAL_PORT || "3000", 10),
};

console.log("Test Client Configuration:");
console.log(`  Auth Server URL: ${config.authServerUrl}`);
console.log(`  FRP Server: ${config.frpServerAddr}:${config.frpServerPort}`);
console.log(`  Test Timeout: ${config.testTimeout}ms`);

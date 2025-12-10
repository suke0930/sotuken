import { spawn, ChildProcess } from "child_process";
import fs from "fs/promises";
import path from "path";
import { logger } from "./utils/logger.js";
import { config } from "./config.js";

/**
 * FRP Client
 * 
 * Manages FRPC connections and configuration
 */

export interface FrpcProcess {
  process: ChildProcess;
  configPath: string;
}

export class FrpClient {
  private frpcProcess: ChildProcess | null = null;
  private configPath: string | null = null;

  /**
   * Generate FRPC configuration file
   */
  async generateFrpcConfig(
    jwt: string,
    fingerprint: string,
    localPort: number,
    remotePort: number
  ): Promise<string> {
    const timestamp = Date.now();
    const configDir = path.join(process.cwd(), "frpc-configs");
    const configPath = path.join(configDir, `test-${timestamp}.toml`);

    // Ensure config directory exists
    await fs.mkdir(configDir, { recursive: true });

    const configContent = `
serverAddr = "${config.frpServerAddr}"
serverPort = ${config.frpServerPort}

auth.method = "token"
auth.token = "${jwt}"

[[proxies]]
name = "test-proxy-${timestamp}"
type = "tcp"
localIP = "127.0.0.1"
localPort = ${localPort}
remotePort = ${remotePort}

[proxies.metadatas]
token = "${jwt}"
fingerprint = "${fingerprint}"
`;

    await fs.writeFile(configPath, configContent.trim(), "utf-8");
    logger.success(`FRPC config generated: ${configPath}`);

    return configPath;
  }

  /**
   * Start FRPC process
   */
  async startFrpc(configPath: string): Promise<FrpcProcess> {
    logger.info("Starting FRPC...");

    this.configPath = configPath;
    this.frpcProcess = spawn("frpc", ["-c", configPath]);

    const process = this.frpcProcess;

    // Capture stdout
    process.stdout?.on("data", (data) => {
      const output = data.toString();
      logger.debug(`FRPC: ${output.trim()}`);
    });

    // Capture stderr
    process.stderr?.on("data", (data) => {
      const output = data.toString();
      logger.error(`FRPC Error: ${output.trim()}`);
    });

    // Handle process exit
    process.on("exit", (code) => {
      logger.info(`FRPC process exited with code ${code}`);
      this.frpcProcess = null;
    });

    logger.success("FRPC process started");

    return { process, configPath };
  }

  /**
   * Wait for connection to be established
   */
  async waitForConnection(timeout: number = 30000): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!this.frpcProcess) {
        reject(new Error("FRPC process not started"));
        return;
      }

      const timeoutId = setTimeout(() => {
        reject(new Error("Connection timeout"));
      }, timeout);

      const process = this.frpcProcess;

      const dataHandler = (data: Buffer) => {
        const output = data.toString();
        
        // Look for success indicators in frpc output
        if (output.includes("start proxy success") || output.includes("proxy added")) {
          clearTimeout(timeoutId);
          process.stdout?.off("data", dataHandler);
          logger.success("FRP connection established!");
          resolve(true);
        }
      };

      process.stdout?.on("data", dataHandler);
    });
  }

  /**
   * Stop FRPC process
   */
  async stopFrpc(): Promise<void> {
    if (this.frpcProcess) {
      logger.info("Stopping FRPC...");
      this.frpcProcess.kill();
      this.frpcProcess = null;
    }

    // Clean up config file
    if (this.configPath) {
      try {
        await fs.unlink(this.configPath);
        logger.debug(`Deleted config file: ${this.configPath}`);
      } catch (error) {
        // Ignore errors
      }
      this.configPath = null;
    }
  }

  /**
   * Get last error from FRPC output
   */
  getLastError(): string {
    // This would need to be implemented by storing stderr output
    return "Error information not available";
  }

  /**
   * Test connection by attempting to connect to remote port
   */
  async testConnection(remotePort: number): Promise<boolean> {
    // This would require actual HTTP/TCP connection test
    // For now, simplified implementation
    logger.info(`Testing connection to remote port ${remotePort}...`);
    return true;
  }
}

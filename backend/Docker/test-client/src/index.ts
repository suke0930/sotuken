import { AuthClient } from "./AuthClient.js";
import { FrpClient } from "./FrpClient.js";
import { TestRunner } from "./TestRunner.js";
import { generateTestFingerprint } from "./utils/fingerprint.js";
import { logger } from "./utils/logger.js";
import { config } from "./config.js";

/**
 * FRP Test Client - Main Entry Point
 * 
 * This is a simple demonstration of the test client capabilities.
 * For full test scenarios, use the Jest test suites in the tests/ directory.
 */

async function main() {
  logger.info("FRP Test Client Starting...");
  logger.info(`Auth Server: ${config.authServerUrl}`);

  const fingerprint = generateTestFingerprint();
  const authClient = new AuthClient(fingerprint);
  const frpClient = new FrpClient();
  const runner = new TestRunner();

  try {
    // Demo: Basic authentication flow
    logger.step(1, "Initialize Authentication");
    const initResult = await authClient.initAuth(fingerprint);
    logger.success("Authentication initialized", {
      tempToken: initResult.tempToken.substring(0, 8) + "...",
      authUrl: initResult.authUrl.substring(0, 50) + "...",
    });

    logger.info("\n📋 Next Steps:");
    logger.info("1. Open the following URL in your browser:");
    logger.info(`   ${initResult.authUrl}`);
    logger.info("2. Complete Discord authentication");
    logger.info("3. The client will automatically detect completion\n");

    // Poll for completion
    logger.step(2, "Waiting for Authentication");
    const pollResult = await authClient.pollAuth(initResult.tempToken, {
      maxAttempts: 150,
      interval: 2000,
    });

    if (pollResult.status !== "completed") {
      throw new Error(`Authentication not completed: ${pollResult.status}`);
    }

    logger.success("Authentication completed!", {
      username: pollResult.discordUser?.username,
    });

    // Get user info
    logger.step(3, "Retrieve User Information");
    const userInfo = await authClient.getUserInfo();
    logger.success("User info retrieved", {
      username: userInfo.user.username,
      discordId: userInfo.user.discordId,
      allowedPorts: userInfo.permissions.allowedPorts,
      maxSessions: userInfo.permissions.maxSessions,
      activeSessions: userInfo.activeSessions.total,
    });

    logger.info("\n✅ Test client demonstration completed successfully!");
    logger.info("\n📚 Run full test suites with:");
    logger.info("   npm test");

  } catch (error: any) {
    logger.error("Test failed", error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    logger.error("Fatal error", error);
    process.exit(1);
  });
}

export { AuthClient, FrpClient, TestRunner };

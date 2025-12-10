import test from "node:test";
import assert from "node:assert/strict";
import path from "path";
import { once } from "events";
import { SessionStore } from "../src/SessionStore";
import { FrpLogService } from "../src/FrpLogService";
import { FrpProcessManager } from "../src/FrpProcessManager";
import { createTempDir, createMockBinary } from "./helpers";

test("FrpProcessManager starts and tracks a mock process", async () => {
  const dir = await createTempDir("frp-process-manager-");
  const sessionStore = new SessionStore(path.join(dir, "sessions.json"));
  await sessionStore.initialize();
  const logService = new FrpLogService(path.join(dir, "logs"), {
    maxBytes: 1024,
    rotateLimit: 2,
  });
  await logService.initialize();

  const binaryPath = await createMockBinary(dir);
  const binaryManager = {
    ensureBinary: async () => binaryPath,
  };

  const manager = new FrpProcessManager(
    binaryManager,
    logService,
    sessionStore,
    path.join(dir, "configs"),
    "127.0.0.1",
    7000
  );
  await manager.initialize();

  const record = await manager.startProcess({
    sessionId: "test-session",
    discordId: "123",
    remotePort: 4000,
    localPort: 25565,
    fingerprint: "fp",
    jwt: "token",
  });

  assert.equal(record.sessionId, "test-session");

  await once(manager, "exited");
  const stored = sessionStore.get("test-session");
  assert.equal(stored?.status, "stopped");
});

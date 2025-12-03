import test from "node:test";
import assert from "node:assert/strict";
import path from "path";
import fs from "fs/promises";
import { FrpLogService } from "../src/FrpLogService";
import { createTempDir } from "./helpers";

test("FrpLogService tail returns recent lines", async () => {
  const dir = await createTempDir("frp-log-service-");
  const service = new FrpLogService(dir, { maxBytes: 1024, rotateLimit: 3 });
  await service.initialize();

  await service.append("session-1", "line-1\n");
  await service.append("session-1", "line-2\n");
  await service.append("session-1", "line-3\n");

  const tail = await service.tail("session-1", { lines: 2 });
  assert.deepEqual(tail, ["line-2", "line-3"]);
});

test("FrpLogService rotates when exceeding max bytes", async () => {
  const dir = await createTempDir("frp-log-rotate-");
  const service = new FrpLogService(dir, { maxBytes: 20, rotateLimit: 2 });
  await service.initialize();

  await service.append("session-rot", "1234567890\n");
  await service.append("session-rot", "abcdefghij\n");
  await service.append("session-rot", "ROTATE\n");

  const files = await fs.readdir(dir);
  assert(files.some((file) => file.includes("session-rot.log.1")));
});

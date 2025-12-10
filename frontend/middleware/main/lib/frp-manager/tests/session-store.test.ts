import test from "node:test";
import assert from "node:assert/strict";
import path from "path";
import fs from "fs/promises";
import { SessionStore } from "../src/SessionStore";
import { createTempDir } from "./helpers";

test("SessionStore persists data across reloads", async () => {
  const dir = await createTempDir("frp-session-store-");
  const filePath = path.join(dir, "sessions.json");

  const store = new SessionStore(filePath);
  await store.initialize();

  store.upsert({
    sessionId: "s-1",
    discordId: "user-1",
    remotePort: 25565,
    localPort: 25565,
    status: "running",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    logPath: path.join(dir, "log"),
    configPath: path.join(dir, "config"),
  });

  await store.save();

  const reloaded = new SessionStore(filePath);
  await reloaded.initialize();
  const all = reloaded.getAll();
  assert.equal(all.length, 1);
  assert.equal(all[0].sessionId, "s-1");
});

test("SessionStore gracefully handles missing file", async () => {
  const dir = await createTempDir("frp-session-store-missing-");
  const filePath = path.join(dir, "sessions.json");
  const store = new SessionStore(filePath);
  await store.initialize();
  assert.equal(store.getAll().length, 0);
  await store.save();

  const stats = await fs.stat(filePath);
  assert(stats.isFile());
});

import fs from "fs/promises";
import path from "path";
import os from "os";

export async function createTempDir(prefix: string): Promise<string> {
  return await fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

export async function createMockBinary(dir: string): Promise<string> {
  const filePath = path.join(dir, "mock-frpc.js");
  const script = `#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const message = \`Mock FRPC started with args: \${process.argv.slice(2).join(' ')}\\n\`;
fs.appendFileSync(path.join(process.cwd(), 'mock-frpc.log'), message);

setTimeout(() => process.exit(0), 50);
`;
  await fs.writeFile(filePath, script, { encoding: "utf-8" });
  await fs.chmod(filePath, 0o755);
  return filePath;
}

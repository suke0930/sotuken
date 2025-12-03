import axios from "axios";
import fs from "fs/promises";
import path from "path";
import { createWriteStream } from "fs";
import { FrpManagerConfig } from "./types";
import { resolveTargetForHost } from "./config";

interface BinaryMetadata {
  version: string;
  installedAt: string;
  platform: NodeJS.Platform;
  arch: NodeJS.Architecture;
}

export class FrpBinaryManager {
  private config: FrpManagerConfig;
  private metadataPath: string;

  constructor(config: FrpManagerConfig) {
    this.config = config;
    this.metadataPath = path.join(config.binaryDir, "metadata.json");
  }

  async ensureBinary(): Promise<string> {
    const target = resolveTargetForHost(this.config);
    await fs.mkdir(this.config.binaryDir, { recursive: true });

    const binaryName =
      target.fileName || `frpc-${target.platform}-${target.arch}`;
    const binaryPath = path.join(this.config.binaryDir, binaryName);

    if (await this.needsDownload(binaryPath)) {
      await this.downloadBinary(target.url, binaryPath);
      await fs.chmod(binaryPath, 0o755);
      await this.writeMetadata({
        version: this.config.binaryVersion,
        installedAt: new Date().toISOString(),
        platform: target.platform,
        arch: target.arch,
      });
    }

    return binaryPath;
  }

  private async needsDownload(binaryPath: string): Promise<boolean> {
    try {
      await fs.access(binaryPath);
    } catch {
      return true;
    }

    try {
      const raw = await fs.readFile(this.metadataPath, "utf-8");
      const metadata: BinaryMetadata = JSON.parse(raw);
      return metadata.version !== this.config.binaryVersion;
    } catch {
      return true;
    }
  }

  private async downloadBinary(url: string, dest: string): Promise<void> {
    const response = await axios.get(url, {
      responseType: "stream",
      timeout: 20_000,
    });

    await new Promise<void>((resolve, reject) => {
      const writer = createWriteStream(dest);
      response.data.pipe(writer);
      writer.on("finish", resolve);
      writer.on("error", reject);
    });
  }

  private async writeMetadata(metadata: BinaryMetadata): Promise<void> {
    await fs.writeFile(this.metadataPath, JSON.stringify(metadata, null, 2), {
      encoding: "utf-8",
    });
  }
}

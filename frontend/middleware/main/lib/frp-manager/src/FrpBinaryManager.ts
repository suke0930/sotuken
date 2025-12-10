import axios from "axios";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { createWriteStream } from "fs";
import * as tar from "tar";
import AdmZip from "adm-zip";
import { createModuleLogger } from "../../logger";
import { FrpManagerConfig } from "./types";
import { resolveTargetForHost } from "./config";

interface BinaryMetadata {
  version: string;
  installedAt: string;
  platform: NodeJS.Platform;
  arch: NodeJS.Architecture;
}

interface FrpBinaryInfo {
  downloadUrl: string;
  version: string;
  platform: string;
  arch: string;
  binaryName: string;
  archivePath?: string;
}

export class FrpBinaryManager {
  private config: FrpManagerConfig;
  private metadataPath: string;
  private logger = createModuleLogger("frp-binary");

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
    let downloadUrl = target.url;

    if (await this.needsDownload(binaryPath)) {
      // Try to get download URL from Asset Server API
      try {
        const binaryInfo = await this.fetchBinaryInfo();
        if (binaryInfo?.downloadUrl) {
          downloadUrl = binaryInfo.downloadUrl;
        }
      } catch (error) {
        console.warn(
          "Failed to fetch binary info from Asset Server, using fallback URL:",
          error
        );
      }

      const downloadExt = this.detectArchiveExt(downloadUrl);
      const downloadPath = downloadExt
        ? path.join(this.config.binaryDir, `frpc-download${downloadExt}`)
        : path.join(this.config.binaryDir, `frpc-download.tmp`);

      this.logger.info(
        {
          platform: target.platform,
          arch: target.arch,
          downloadUrl,
          downloadPath,
        },
        "Downloading FRP binary"
      );

      await this.downloadBinary(downloadUrl, downloadPath);

      const archiveExt = downloadExt || (await this.detectArchiveFromFile(downloadPath));

      if (archiveExt) {
        const extracted = await this.extractBinary(
          downloadPath,
          binaryName,
          binaryInfoArchiveName(downloadUrl)
        );
        await this.atomicInstall(extracted, binaryPath);
      } else {
        await this.atomicInstall(downloadPath, binaryPath);
      }

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

  private async fetchBinaryInfo(): Promise<FrpBinaryInfo | null> {
    try {
      // Extract base URL from downloadTargets
      const target = resolveTargetForHost(this.config);
      const baseUrl = target.url.replace(/\/[^/]+$/, "");

      const response = await axios.get(`${baseUrl}/client-binary`, {
        timeout: 5000,
      });

      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }

      return null;
    } catch (error) {
      console.error("Error fetching FRP binary info:", error);
      return null;
    }
  }

  private async needsDownload(binaryPath: string): Promise<boolean> {
    try {
      await fs.access(binaryPath);
    } catch {
      return true;
    }

    // Guard: detect archived content accidentally stored as binary
    try {
      const fd = await fs.open(binaryPath, "r");
      const buffer = Buffer.alloc(4);
      await fd.read(buffer, 0, 4, 0);
      await fd.close();
      const signature = buffer.toString("hex");
      if (signature.startsWith("1f8b") || signature.startsWith("504b")) {
        // gzip or zip header
        this.logger.warn({ binaryPath, signature }, "Binary looks like compressed archive, will re-download");
        return true;
      }
    } catch {
      // ignore and fall through to metadata check
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

  private async atomicInstall(src: string, dest: string): Promise<void> {
    const tmpDest = `${dest}.tmp`;
    await fs.copyFile(src, tmpDest);
    await fs.chmod(tmpDest, 0o755);
    await fs.rename(tmpDest, dest);
  }

  private async writeMetadata(metadata: BinaryMetadata): Promise<void> {
    await fs.writeFile(this.metadataPath, JSON.stringify(metadata, null, 2), {
      encoding: "utf-8",
    });
  }

  private detectArchiveExt(url: string): ".tar.gz" | ".zip" | null {
    if (url.endsWith(".tar.gz")) return ".tar.gz";
    if (url.endsWith(".zip")) return ".zip";
    return null;
  }

  private async detectArchiveFromFile(
    archivePath: string
  ): Promise<".tar.gz" | ".zip" | null> {
    try {
      const fd = await fs.open(archivePath, "r");
      const buffer = Buffer.alloc(4);
      await fd.read(buffer, 0, 4, 0);
      await fd.close();
      const signature = buffer.toString("hex");
      if (signature.startsWith("1f8b")) return ".tar.gz";
      if (signature.startsWith("504b")) return ".zip";
      return null;
    } catch {
      return null;
    }
  }

  private async extractBinary(
    archivePath: string,
    binaryName: string,
    archiveRootHint?: string
  ): Promise<string> {
    const ext = archivePath.endsWith(".zip")
      ? ".zip"
      : archivePath.endsWith(".tar.gz")
      ? ".tar.gz"
      : null;
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "frpc-"));

    if (ext === ".tar.gz" || ext === null) {
      await tar.x({
        file: archivePath,
        cwd: tmpDir,
      });
    } else if (ext === ".zip") {
      const zip = new AdmZip(archivePath);
      zip.extractAllTo(tmpDir, true);
    }

    // Try to locate binary
    const candidates: string[] = [];
    const walk = async (dir: string) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(full);
        } else if (entry.isFile() && entry.name === binaryName) {
          candidates.push(full);
        }
      }
    };
    await walk(tmpDir);

    if (candidates.length === 0) {
      throw new Error(
        `Extracted archive but could not find binary ${binaryName}`
      );
    }

    // If archiveRootHint is provided, prefer matches under that path
    if (archiveRootHint) {
      const preferred = candidates.find((p) =>
        p.includes(archiveRootHint.replace(/\/$/, ""))
      );
      if (preferred) return preferred;
    }

    return candidates[0];
  }
}

function binaryInfoArchiveName(url: string): string | undefined {
  // heuristic: extract basename without extension for hints
  const base = path.basename(url).replace(/\.tar\.gz$|\.zip$/i, "");
  return base || undefined;
}

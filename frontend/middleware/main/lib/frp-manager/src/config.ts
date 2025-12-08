import path from "path";
import os from "os";
import { BinaryDownloadTarget, FrpManagerConfig } from "./types";

function resolveDataDir(): string {
  if (process.env.FRP_DATA_DIR) {
    return path.resolve(process.env.FRP_DATA_DIR);
  }
  return path.join(process.cwd(), "userdata", "frp");
}

function resolveDownloadTargets(baseUrl: string): BinaryDownloadTarget[] {
  const targets: BinaryDownloadTarget[] = [];

  // Linux amd64
  targets.push({
    platform: "linux",
    arch: "x64",
    url: process.env.FRPC_DOWNLOAD_URL_LINUX_X64 || `${baseUrl}/client-binary?platform=linux&arch=amd64`,
    fileName: "frpc",
  });

  // Linux arm64
  targets.push({
    platform: "linux",
    arch: "arm64",
    url: process.env.FRPC_DOWNLOAD_URL_LINUX_ARM64 || `${baseUrl}/client-binary?platform=linux&arch=arm64`,
    fileName: "frpc",
  });

  // macOS amd64
  targets.push({
    platform: "darwin",
    arch: "x64",
    url: process.env.FRPC_DOWNLOAD_URL_DARWIN_X64 || `${baseUrl}/client-binary?platform=darwin&arch=amd64`,
    fileName: "frpc",
  });

  // macOS arm64
  targets.push({
    platform: "darwin",
    arch: "arm64",
    url: process.env.FRPC_DOWNLOAD_URL_DARWIN_ARM64 || `${baseUrl}/client-binary?platform=darwin&arch=arm64`,
    fileName: "frpc",
  });

  // Windows amd64
  targets.push({
    platform: "win32",
    arch: "x64",
    url: process.env.FRPC_DOWNLOAD_URL_WINDOWS_X64 || `${baseUrl}/client-binary?platform=windows&arch=amd64`,
    fileName: "frpc.exe",
  });

  // Windows arm64
  targets.push({
    platform: "win32",
    arch: "arm64",
    url: process.env.FRPC_DOWNLOAD_URL_WINDOWS_ARM64 || `${baseUrl}/client-binary?platform=windows&arch=arm64`,
    fileName: "frpc.exe",
  });

  return targets;
}

export function loadFrpManagerConfig(): FrpManagerConfig {
  const dataDir = resolveDataDir();
  const binaryDir = path.join(dataDir, "bin");
  const configDir = path.join(dataDir, "configs");
  const logsDir = path.join(dataDir, "logs");
  const fingerprintFile = path.join(dataDir, "fingerprint.txt");

  const baseAssetUrl =
    process.env.FRP_BINARY_BASE_URL || "http://localhost:8080/api/assets/frp";

  return {
    authServerUrl:
      process.env.FRP_AUTH_SERVER_URL || "http://localhost:8080",
    frpServerAddr: process.env.FRP_SERVER_ADDR || "127.0.0.1",
    frpServerPort: Number(process.env.FRP_SERVER_PORT || 7000),
    jwtRefreshIntervalHours: Number(
      process.env.FRP_JWT_REFRESH_INTERVAL_HOURS || 6
    ),
    jwtRefreshMarginMinutes: Number(
      process.env.FRP_JWT_REFRESH_MARGIN_MINUTES || 5
    ),
    authPollIntervalMs: Number(process.env.FRP_AUTH_POLL_INTERVAL_MS || 1000),
    dataDir,
    binaryDir,
    configDir,
    logsDir,
    sessionsFile: path.join(dataDir, "sessions.json"),
    fingerprintFile,
    binaryVersion: process.env.FRPC_VERSION || "1.0.0",
    downloadTargets: resolveDownloadTargets(baseAssetUrl),
    logRetention: {
      maxLines: Number(process.env.FRP_LOG_MAX_LINES || 400),
      maxBytes: Number(process.env.FRP_LOG_MAX_BYTES || 5 * 1024 * 1024),
      rotateLimit: Number(process.env.FRP_LOG_ROTATE_LIMIT || 5),
    },
  };
}

export function resolveTargetForHost(
  config: FrpManagerConfig
): BinaryDownloadTarget {
  const platform = os.platform();
  const arch = os.arch();

  const matching = config.downloadTargets.find(
    (target) => target.platform === platform && target.arch === arch
  );

  if (!matching) {
    throw new Error(
      `No FRP binary configured for platform=${platform} arch=${arch}`
    );
  }

  return matching;
}

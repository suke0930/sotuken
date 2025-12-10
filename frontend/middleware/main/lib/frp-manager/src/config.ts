/**
 * FRP Manager設定
 * 
 * 統合設定システム (lib/config) から設定を取得します。
 * 既存コードとの互換性を保ちながら、段階的な移行を可能にします。
 */

import path from "path";
import os from "os";
import { BinaryDownloadTarget, FrpManagerConfig } from "./types";
import { appConfig } from "../../config";

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

/**
 * FRP Manager設定を読み込み
 * 統合設定システムから値を取得します
 */
export function loadFrpManagerConfig(): FrpManagerConfig {
  // 統合設定システムからFRP設定を取得
  const frpConfig = appConfig.frp;

  const dataDir = frpConfig.dataDir;
  const binaryDir = path.join(dataDir, "bin");
  const configDir = path.join(dataDir, "configs");
  const logsDir = path.join(dataDir, "logs");
  const fingerprintFile = path.join(dataDir, "fingerprint.txt");

  return {
    authServerUrl: frpConfig.authServerUrl,
    authzServerUrl: frpConfig.authzServerUrl,
    frpServerAddr: frpConfig.serverAddr,
    frpServerPort: frpConfig.serverPort,
    jwtRefreshIntervalHours: frpConfig.jwtRefreshIntervalHours,
    jwtRefreshMarginMinutes: frpConfig.jwtRefreshMarginMinutes,
    authPollIntervalMs: frpConfig.authPollIntervalMs,
    dataDir,
    binaryDir,
    configDir,
    logsDir,
    sessionsFile: path.join(dataDir, "sessions.json"),
    fingerprintFile,
    volatileSessions: frpConfig.volatileSessions,
    binaryVersion: frpConfig.binaryVersion,
    downloadTargets: resolveDownloadTargets(frpConfig.binaryBaseUrl),
    logRetention: frpConfig.logRetention,
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

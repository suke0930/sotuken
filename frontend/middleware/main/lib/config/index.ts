/**
 * 統合設定管理モジュール
 * 
 * このモジュールは全ての設定を集約し、環境変数や.envファイルから設定を読み込みます。
 * 既存のコードとの互換性を保ちながら、段階的な移行を可能にします。
 */

import path from 'path';
import crypto from 'crypto';
import { config } from 'dotenv';
import type { AppConfig } from './types';

// .envファイルを読み込み
config({ path: path.join(__dirname, '..', '..', '.env') });

/**
 * 環境変数を数値として取得
 */
function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  const parsed = Number(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * 環境変数を真偽値として取得
 */
function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  return value === 'true' || value === '1';
}

/**
 * 環境変数を文字列として取得
 */
function getEnvString(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

/**
 * パスを解決（相対パスの場合はプロジェクトルートからの相対パス）
 */
function resolvePath(inputPath: string, baseDir: string = path.join(__dirname, '..', '..')): string {
  if (path.isAbsolute(inputPath)) {
    return inputPath;
  }
  return path.resolve(baseDir, inputPath);
}

// ベースディレクトリの設定
const BASE_DIR = path.join(__dirname, '..', '..');
const _USERDATA_DIR = resolvePath(getEnvString('USERDATA_DIR', './userdata'), BASE_DIR);
const _SSL_CERT_DIR = path.join(_USERDATA_DIR, 'ssl');
const _DEV_SECRET_DIR = resolvePath(getEnvString('DEV_SECRET_DIR', './devsecret'), BASE_DIR);

/**
 * アプリケーション設定を構築
 */
function buildAppConfig(): AppConfig {
  return {
    server: {
      port: getEnvNumber('PORT', 12800),
      nodeEnv: (getEnvString('NODE_ENV', 'development') as 'development' | 'production' | 'test'),
    },
    ssl: {
      enabled: getEnvBoolean('SSL_ENABLED', true),
      commonName: getEnvString('SSL_COMMON_NAME', 'localhost'),
      organization: getEnvString('SSL_ORGANIZATION', 'MCserverManager'),
      certDir: SSL_CERT_DIR,
      keyFile: path.join(SSL_CERT_DIR, 'server.key'),
      certFile: path.join(SSL_CERT_DIR, 'server.cert'),
      infoFile: path.join(SSL_CERT_DIR, 'cert-info.json'),
      validityDays: getEnvNumber('CERT_VALIDITY_DAYS', 365),
      renewalThresholdDays: getEnvNumber('CERT_RENEWAL_THRESHOLD_DAYS', 10),
    },
    session: {
      secret: getEnvString('SESSION_SECRET', '') || crypto.randomBytes(64).toString('hex'),
      name: getEnvString('SESSION_NAME', 'frontdriver-session'),
      maxAge: getEnvNumber('SESSION_MAX_AGE', 24 * 60 * 60 * 1000), // 24時間
    },
    backendApi: {
      url: getEnvString('BACKEND_API_URL', 'http://localhost:8080'),
      timeout: getEnvNumber('BACKEND_API_TIMEOUT', 300000), // 5分
    },
    frp: {
      // フロントエンド（クライアント側）の接続情報
      binaryBaseUrl: getEnvString('FRP_BINARY_BASE_URL', 'http://localhost:8080/api/assets/frp'),
      authServerUrl: getEnvString('FRP_AUTH_SERVER_URL', 'http://localhost:8080'),
      // FRPサーバーへの接続先（クライアントとして接続）
      serverAddr: getEnvString('FRP_SERVER_ADDR', '127.0.0.1'),
      serverPort: getEnvNumber('FRP_SERVER_PORT', 7000),
      // クライアント側のローカル設定
      dataDir: resolvePath(getEnvString('FRP_DATA_DIR', './userdata/frp'), BASE_DIR),
      binaryVersion: getEnvString('FRPC_VERSION', '1.0.0'),
      volatileSessions: getEnvBoolean(
        'FRP_VOLATILE_SESSIONS',
        process.env.NODE_ENV === 'test' ? false : true
      ),
      jwtRefreshIntervalHours: getEnvNumber('FRP_JWT_REFRESH_INTERVAL_HOURS', 6),
      jwtRefreshMarginMinutes: getEnvNumber('FRP_JWT_REFRESH_MARGIN_MINUTES', 5),
      authPollIntervalMs: getEnvNumber('FRP_AUTH_POLL_INTERVAL_MS', 1000),
      logRetention: {
        maxLines: getEnvNumber('FRP_LOG_MAX_LINES', 400),
        maxBytes: getEnvNumber('FRP_LOG_MAX_BYTES', 5 * 1024 * 1024), // 5MB
        rotateLimit: getEnvNumber('FRP_LOG_ROTATE_LIMIT', 5),
      },
    },
    jdk: {
      dataDir: resolvePath(getEnvString('JDK_DATA_DIR', './userdata/jdk'), BASE_DIR),
    },
    minecraftServer: {
      dataDir: resolvePath(getEnvString('MC_DATA_DIR', './userdata/minecraftServ'), BASE_DIR),
      stopTimeout: getEnvNumber('MC_SERVER_STOP_TIMEOUT', 30000), // 30秒
    },
    download: {
      tempPath: resolvePath(getEnvString('DOWNLOAD_TEMP_PATH', './temp/download'), BASE_DIR),
    },
    paths: {
      userdataDir: _USERDATA_DIR,
      devSecretDir: _DEV_SECRET_DIR,
      usersFile: path.join(_DEV_SECRET_DIR, 'users.json'),
      serversFile: path.join(_DEV_SECRET_DIR, 'servers.json'),
    },
    log: {
      level: getEnvString('LOG_LEVEL', 'info') as any,
      fileEnabled: getEnvBoolean('LOG_FILE_ENABLED', false),
      filePath: resolvePath(getEnvString('LOG_FILE_PATH', './logs/app.log'), BASE_DIR),
    },
  };
}

/**
 * アプリケーション設定のシングルトンインスタンス
 */
export const appConfig: AppConfig = buildAppConfig();

/**
 * 設定を再読み込み（主にテスト用）
 */
export function reloadConfig(): AppConfig {
  const newConfig = buildAppConfig();
  Object.assign(appConfig, newConfig);
  return appConfig;
}

/**
 * 既存コードとの互換性のためのエクスポート
 * 段階的に削除予定
 */

// Server
export const DEFAULT_SERVER_PORT = appConfig.server.port;

// SSL/TLS
export const USERDATA_DIR = appConfig.paths.userdataDir;
export const SSL_CERT_DIR = appConfig.ssl.certDir;
export const SSL_KEY_FILE = appConfig.ssl.keyFile;
export const SSL_CERT_FILE = appConfig.ssl.certFile;
export const SSL_INFO_FILE = appConfig.ssl.infoFile;
export const CERT_VALIDITY_DAYS = appConfig.ssl.validityDays;
export const CERT_RENEWAL_THRESHOLD_DAYS = appConfig.ssl.renewalThresholdDays;
export const commonName = appConfig.ssl.commonName;
export const organization = appConfig.ssl.organization;

// Session
export const SESSION_SECRET = appConfig.session.secret;
export const SESSION_NAME = appConfig.session.name;

// Paths
export const DEV_SECRET_DIR = appConfig.paths.devSecretDir;
export const USERS_FILE = appConfig.paths.usersFile;
export const SERVERS_FILE = appConfig.paths.serversFile;

/**
 * 設定のバリデーション
 */
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // ポート番号のチェック
  if (appConfig.server.port < 1 || appConfig.server.port > 65535) {
    errors.push(`Invalid PORT: ${appConfig.server.port} (must be 1-65535)`);
  }

  // URLフォーマットのチェック
  const urlFields = [
    { name: 'BACKEND_API_URL', value: appConfig.backendApi.url },
    { name: 'FRP_BINARY_BASE_URL', value: appConfig.frp.binaryBaseUrl },
    { name: 'FRP_AUTH_SERVER_URL', value: appConfig.frp.authServerUrl },
  ];

  for (const field of urlFields) {
    try {
      new URL(field.value);
    } catch (e) {
      errors.push(`Invalid ${field.name}: ${field.value} (must be a valid URL)`);
    }
  }

  // FRPポート番号のチェック
  if (appConfig.frp.serverPort < 1 || appConfig.frp.serverPort > 65535) {
    errors.push(`Invalid FRP_SERVER_PORT: ${appConfig.frp.serverPort} (must be 1-65535)`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * デバッグ用: 設定を表示（センシティブ情報はマスク）
 */
export function printConfig(): void {
  const maskedConfig = JSON.parse(JSON.stringify(appConfig));
  
  // センシティブ情報をマスク
  if (maskedConfig.session.secret) {
    maskedConfig.session.secret = maskedConfig.session.secret.substring(0, 10) + '...';
  }

  console.log('=== Application Configuration ===');
  console.log(JSON.stringify(maskedConfig, null, 2));
  console.log('=================================');
}

export default appConfig;

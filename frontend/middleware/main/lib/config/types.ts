/**
 * アプリケーション設定の型定義
 * 
 * このファイルは全ての設定項目の型を定義します
 */

/**
 * サーバー設定
 */
export interface ServerConfig {
  /** サーバーポート */
  port: number;
  /** 実行環境 */
  nodeEnv: 'development' | 'production' | 'test';
}

/**
 * SSL/TLS設定
 */
export interface SslConfig {
  /** SSL/TLSを有効化 */
  enabled: boolean;
  /** SSL証明書のCommon Name */
  commonName: string;
  /** SSL証明書の組織名 */
  organization: string;
  /** 証明書ディレクトリ */
  certDir: string;
  /** 証明書の秘密鍵ファイルパス */
  keyFile: string;
  /** 証明書ファイルパス */
  certFile: string;
  /** 証明書情報ファイルパス */
  infoFile: string;
  /** 証明書の有効期間（日数） */
  validityDays: number;
  /** 証明書更新の閾値（日数） */
  renewalThresholdDays: number;
}

/**
 * セッション設定
 */
export interface SessionConfig {
  /** セッションシークレット */
  secret: string;
  /** セッション名 */
  name: string;
  /** セッションの有効期限（ミリ秒） */
  maxAge: number;
}

/**
 * バックエンドAPI設定
 */
export interface BackendApiConfig {
  /** バックエンドAPIのURL */
  url: string;
  /** タイムアウト（ミリ秒） */
  timeout: number;
}

/**
 * FRP設定
 */
export interface FrpConfig {
  /** FRPバイナリのダウンロードベースURL */
  binaryBaseUrl: string;
  /** FRP認証サーバーのURL */
  authServerUrl: string;
  /** FRPサーバーのアドレス */
  serverAddr: string;
  /** FRPサーバーのポート */
  serverPort: number;
  /** FRPダッシュボードのポート */
  dashboardPort: number;
  /** FRPデータディレクトリ */
  dataDir: string;
  /** FRPバイナリのバージョン */
  binaryVersion: string;
  /** 揮発性セッション */
  volatileSessions: boolean;
  /** JWT更新間隔（時間） */
  jwtRefreshIntervalHours: number;
  /** JWT更新マージン（分） */
  jwtRefreshMarginMinutes: number;
  /** 認証ポーリング間隔（ミリ秒） */
  authPollIntervalMs: number;
  /** ログ設定 */
  logRetention: {
    /** 最大行数 */
    maxLines: number;
    /** 最大バイト数 */
    maxBytes: number;
    /** ローテーション制限 */
    rotateLimit: number;
  };
}

/**
 * JDK Manager設定
 */
export interface JdkConfig {
  /** JDKインストールディレクトリ */
  dataDir: string;
}

/**
 * Minecraft Server Manager設定
 */
export interface MinecraftServerConfig {
  /** Minecraftサーバーデータディレクトリ */
  dataDir: string;
  /** サーバー停止タイムアウト（ミリ秒） */
  stopTimeout: number;
}

/**
 * ダウンロード設定
 */
export interface DownloadConfig {
  /** ダウンロード一時ディレクトリ */
  tempPath: string;
}

/**
 * パス設定
 */
export interface PathConfig {
  /** ユーザーデータベースディレクトリ */
  userdataDir: string;
  /** 開発用シークレットディレクトリ */
  devSecretDir: string;
  /** ユーザーファイルパス */
  usersFile: string;
  /** サーバーファイルパス */
  serversFile: string;
}

/**
 * ログ設定
 */
export interface LogConfig {
  /** ログレベル */
  level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  /** ファイルログを有効化 */
  fileEnabled: boolean;
  /** ログファイルのパス */
  filePath: string;
}

/**
 * アプリケーション全体の設定
 */
export interface AppConfig {
  /** サーバー設定 */
  server: ServerConfig;
  /** SSL/TLS設定 */
  ssl: SslConfig;
  /** セッション設定 */
  session: SessionConfig;
  /** バックエンドAPI設定 */
  backendApi: BackendApiConfig;
  /** FRP設定 */
  frp: FrpConfig;
  /** JDK Manager設定 */
  jdk: JdkConfig;
  /** Minecraft Server Manager設定 */
  minecraftServer: MinecraftServerConfig;
  /** ダウンロード設定 */
  download: DownloadConfig;
  /** パス設定 */
  paths: PathConfig;
  /** ログ設定 */
  log: LogConfig;
}

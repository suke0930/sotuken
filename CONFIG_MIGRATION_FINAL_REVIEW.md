# 設定ファイル統合 - 最終実装レビュー

## 📋 実装概要

### 目的
- バックエンドURL、ポート、パス参照を`.env`と`config`に集約
- 互換性を保ちつつ段階的に移行
- nginx/docker-composeの設定と整合性を保つ

### 参照した設定
- ✅ `backend/Docker/nginx/nginx.conf` - ルーティング設定
- ✅ `backend/Docker/docker-compose.dev.yml` - サービス定義
- ✅ `backend/Docker/.env.example` - バックエンド環境変数

---

## 📁 実装ファイル構成

```
frontend/middleware/main/
├── .env.example              # 新規 - 環境変数テンプレート
├── .env                      # 新規（gitignore）- 実際の設定
├── .gitignore                # 更新 - .envを追加
└── lib/
    └── config/
        ├── index.ts          # 新規 - 統合設定管理
        └── types.ts          # 新規 - 型定義
```

---

## 🔧 .env.example の内容

### 設計原則
1. **nginx/dockerとの整合性**: nginxが8080でリバースプロキシ、内部サービスは3000等
2. **既定値の正確性**: 実際のdocker-compose.dev.ymlの値を使用
3. **段階的移行**: 既存の環境変数サポート（FRP等）を優先

### 完全な.env.example

```env
# ===================================
# Frontend Middleware Configuration
# ===================================
# このファイルを .env にコピーして使用してください
# 本番環境では環境変数で設定を上書きしてください

# ===================================
# Server Configuration
# ===================================
# フロントエンドミドルウェアのポート
# デフォルト: 12800
PORT=12800

# 実行環境
# 指定可能: development, production, test
NODE_ENV=development

# ===================================
# Backend API Configuration
# ===================================
# Backend Asset Server の URL
# Docker環境: nginxリバースプロキシ経由でアクセス (http://localhost:8080)
# ローカル開発: 直接Asset Serverにアクセス (http://localhost:3000)
# 
# nginx.conf の設定:
#   - /api/* -> asset-server:3000
#   - /ws/* -> asset-server:3000
#   - /api/auth/* -> frp-authjs:3000
#
# docker-compose.dev.yml の設定:
#   - nginx: ホスト8080 -> コンテナ80
#   - asset-server: 内部3000
#   - frp-authjs: ホスト3002 -> コンテナ3000
BACKEND_API_URL=http://localhost:8080

# Backend API タイムアウト (ミリ秒)
# nginx.confでは300s (300000ms) に設定されている
BACKEND_API_TIMEOUT=300000

# ===================================
# FRP (Fast Reverse Proxy) Configuration
# ===================================
# FRPバイナリのダウンロードURL
# nginx経由でAsset Serverからダウンロード
FRP_BINARY_BASE_URL=http://localhost:8080/api/assets/frp

# FRP認証サーバーURL
# nginx経由でfrp-authjsにルーティング
# docker-compose: frp-authjs (ホスト3002 -> コンテナ3000)
FRP_AUTH_SERVER_URL=http://localhost:8080

# FRPサーバーアドレス
# docker-compose: frp-server コンテナ
# ローカル開発の場合は127.0.0.1
FRP_SERVER_ADDR=127.0.0.1

# FRPサーバーポート
# docker-compose: ${FRP_BIND_PORT:-7000}:7000
FRP_SERVER_PORT=7000

# FRPダッシュボードポート（参考情報）
# docker-compose: ${FRP_DASHBOARD_PORT:-7500}:7500
# フロントエンドからは直接アクセスしないが、参考として記載
FRP_DASHBOARD_PORT=7500

# FRPデータディレクトリ
# セッション情報、設定、ログの保存先
FRP_DATA_DIR=./userdata/frp

# FRP揮発性セッション
# true: サーバー再起動時にセッションをクリア
# false: セッションを永続化
FRP_VOLATILE_SESSIONS=true

# FRPクライアントバージョン
FRPC_VERSION=1.0.0

# JWT更新間隔（時間）
FRP_JWT_REFRESH_INTERVAL_HOURS=6

# JWT更新マージン（分）
FRP_JWT_REFRESH_MARGIN_MINUTES=5

# 認証ポーリング間隔（ミリ秒）
FRP_AUTH_POLL_INTERVAL_MS=1000

# ログ保持設定
FRP_LOG_MAX_LINES=400
FRP_LOG_MAX_BYTES=5242880
FRP_LOG_ROTATE_LIMIT=5

# ===================================
# SSL/TLS Configuration
# ===================================
# SSL/TLS有効化
SSL_ENABLED=true

# SSL証明書のCommon Name
# ローカル開発: localhost
# 本番環境: 実際のドメイン名
SSL_COMMON_NAME=localhost

# SSL証明書の組織名
SSL_ORGANIZATION=MCserverManager

# 証明書の有効期間（日数）
CERT_VALIDITY_DAYS=365

# 証明書更新の閾値（日数）
# 有効期限の何日前に更新するか
CERT_RENEWAL_THRESHOLD_DAYS=10

# ===================================
# Session Configuration
# ===================================
# セッションシークレット
# 本番環境では必ず変更してください！
# 生成方法: openssl rand -base64 64
SESSION_SECRET=

# セッション名
SESSION_NAME=frontdriver-session

# ===================================
# Directory Configuration
# ===================================
# ユーザーデータのベースディレクトリ
USERDATA_DIR=./userdata

# JDKインストールディレクトリ
JDK_DATA_DIR=./userdata/jdk

# Minecraftサーバーデータディレクトリ
MC_DATA_DIR=./userdata/minecraftServ

# ダウンロード一時ディレクトリ
DOWNLOAD_TEMP_PATH=./temp/download

# 開発用シークレットディレクトリ
# users.json, servers.json の保存先
DEV_SECRET_DIR=./devsecret

# SSL証明書ディレクトリ
SSL_CERT_DIR=./userdata/ssl

# ===================================
# Minecraft Server Configuration
# ===================================
# サーバー停止タイムアウト（ミリ秒）
MC_SERVER_STOP_TIMEOUT=30000

# ===================================
# Logging Configuration
# ===================================
# ログレベル
# 指定可能: trace, debug, info, warn, error, fatal
LOG_LEVEL=info

# ファイルログ有効化
LOG_FILE_ENABLED=false

# ログファイルパス（LOG_FILE_ENABLED=true の場合）
LOG_FILE_PATH=./logs/app.log

# ===================================
# Development Settings
# ===================================
# 開発モード時の追加設定

# CORS設定（開発時）
# 本番環境では適切に制限してください
CORS_ORIGIN=*

# デバッグモード
DEBUG=false

# ===================================
# Backend Services (参考情報)
# ===================================
# 以下はdocker-compose.dev.ymlで定義されているサービス
# フロントエンドから直接アクセスすることはありませんが、参考として記載

# Nginx (リバースプロキシ)
# ホスト: http://localhost:8080
# コンテナ内部: 80

# Asset Server
# nginx経由: http://localhost:8080/api/*
# 直接アクセス: http://localhost:3000 (Docker内部のみ)

# FRP Auth.js
# nginx経由: http://localhost:8080/api/auth/*
# 直接アクセス: http://localhost:3002 (開発用)
# コンテナ内部: http://frp-authjs:3000

# FRP Authorization
# コンテナ内部: http://frp-authz:3001
# 外部アクセス不可（内部サービス）

# FRP Server
# ホスト: 
#   - Bind Port: 7000
#   - Dashboard: http://localhost:7500

# ===================================
# Environment-specific Overrides
# ===================================
# 本番環境では以下のような設定を環境変数で上書きしてください:
#
# PORT=443
# NODE_ENV=production
# SSL_ENABLED=true
# SSL_COMMON_NAME=your-domain.com
# BACKEND_API_URL=https://api.your-domain.com
# SESSION_SECRET=<secure-random-string>
# FRP_AUTH_SERVER_URL=https://auth.your-domain.com
# FRP_SERVER_ADDR=your-frp-server.com
# LOG_LEVEL=warn
# LOG_FILE_ENABLED=true
```

---

## 📝 lib/config/types.ts

```typescript
/**
 * アプリケーション設定の型定義
 */

export interface ServerConfig {
  /** サーバーポート */
  port: number;
  /** 実行環境 */
  nodeEnv: 'development' | 'production' | 'test';
}

export interface BackendConfig {
  /** Backend API の URL */
  apiUrl: string;
  /** APIタイムアウト（ミリ秒） */
  timeout: number;
}

export interface FrpConfig {
  /** FRPバイナリダウンロードURL */
  binaryBaseUrl: string;
  /** FRP認証サーバーURL */
  authServerUrl: string;
  /** FRPサーバーアドレス */
  serverAddr: string;
  /** FRPサーバーポート */
  serverPort: number;
  /** FRPダッシュボードポート */
  dashboardPort: number;
  /** FRPデータディレクトリ */
  dataDir: string;
  /** 揮発性セッション */
  volatileSessions: boolean;
  /** クライアントバージョン */
  clientVersion: string;
  /** JWT更新間隔（時間） */
  jwtRefreshIntervalHours: number;
  /** JWT更新マージン（分） */
  jwtRefreshMarginMinutes: number;
  /** 認証ポーリング間隔（ミリ秒） */
  authPollIntervalMs: number;
  /** ログ保持設定 */
  logRetention: {
    maxLines: number;
    maxBytes: number;
    rotateLimit: number;
  };
}

export interface SslConfig {
  /** SSL/TLS有効化 */
  enabled: boolean;
  /** Common Name */
  commonName: string;
  /** 組織名 */
  organization: string;
  /** 証明書有効期間（日数） */
  validityDays: number;
  /** 更新閾値（日数） */
  renewalThresholdDays: number;
}

export interface SessionConfig {
  /** セッションシークレット */
  secret: string;
  /** セッション名 */
  name: string;
}

export interface DirectoryConfig {
  /** ユーザーデータディレクトリ */
  userdata: string;
  /** JDKディレクトリ */
  jdk: string;
  /** Minecraftサーバーディレクトリ */
  minecraft: string;
  /** ダウンロード一時ディレクトリ */
  downloadTemp: string;
  /** 開発用シークレットディレクトリ */
  devSecret: string;
  /** SSL証明書ディレクトリ */
  ssl: string;
}

export interface MinecraftConfig {
  /** サーバー停止タイムアウト（ミリ秒） */
  stopTimeout: number;
}

export interface LoggingConfig {
  /** ログレベル */
  level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  /** ファイルログ有効化 */
  fileEnabled: boolean;
  /** ログファイルパス */
  filePath: string;
}

export interface DevelopmentConfig {
  /** CORS Origin */
  corsOrigin: string;
  /** デバッグモード */
  debug: boolean;
}

/**
 * 統合アプリケーション設定
 */
export interface AppConfig {
  server: ServerConfig;
  backend: BackendConfig;
  frp: FrpConfig;
  ssl: SslConfig;
  session: SessionConfig;
  directories: DirectoryConfig;
  minecraft: MinecraftConfig;
  logging: LoggingConfig;
  development: DevelopmentConfig;
}
```

---

## 🔧 lib/config/index.ts

```typescript
import path from 'path';
import crypto from 'crypto';
import { config as dotenvConfig } from 'dotenv';
import { AppConfig } from './types';

// .envファイルを読み込み（存在する場合）
dotenvConfig({ path: path.join(__dirname, '../../.env') });

/**
 * 環境変数から数値を取得
 */
function getNumberEnv(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = Number(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * 環境変数から真偽値を取得
 */
function getBooleanEnv(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
}

/**
 * 環境変数から文字列を取得
 */
function getStringEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

/**
 * アプリケーション設定を読み込み
 */
function loadAppConfig(): AppConfig {
  // セッションシークレットの生成（未設定の場合）
  const sessionSecret = getStringEnv('SESSION_SECRET', '') || crypto.randomBytes(64).toString('hex');
  
  // ベースディレクトリの解決
  const baseDir = path.join(__dirname, '../..');
  const userdataDir = path.resolve(baseDir, getStringEnv('USERDATA_DIR', './userdata'));
  
  return {
    server: {
      port: getNumberEnv('PORT', 12800),
      nodeEnv: (process.env.NODE_ENV as any) || 'development',
    },
    
    backend: {
      apiUrl: getStringEnv('BACKEND_API_URL', 'http://localhost:8080'),
      timeout: getNumberEnv('BACKEND_API_TIMEOUT', 300000),
    },
    
    frp: {
      binaryBaseUrl: getStringEnv('FRP_BINARY_BASE_URL', 'http://localhost:8080/api/assets/frp'),
      authServerUrl: getStringEnv('FRP_AUTH_SERVER_URL', 'http://localhost:8080'),
      serverAddr: getStringEnv('FRP_SERVER_ADDR', '127.0.0.1'),
      serverPort: getNumberEnv('FRP_SERVER_PORT', 7000),
      dashboardPort: getNumberEnv('FRP_DASHBOARD_PORT', 7500),
      dataDir: path.resolve(baseDir, getStringEnv('FRP_DATA_DIR', './userdata/frp')),
      volatileSessions: getBooleanEnv('FRP_VOLATILE_SESSIONS', true),
      clientVersion: getStringEnv('FRPC_VERSION', '1.0.0'),
      jwtRefreshIntervalHours: getNumberEnv('FRP_JWT_REFRESH_INTERVAL_HOURS', 6),
      jwtRefreshMarginMinutes: getNumberEnv('FRP_JWT_REFRESH_MARGIN_MINUTES', 5),
      authPollIntervalMs: getNumberEnv('FRP_AUTH_POLL_INTERVAL_MS', 1000),
      logRetention: {
        maxLines: getNumberEnv('FRP_LOG_MAX_LINES', 400),
        maxBytes: getNumberEnv('FRP_LOG_MAX_BYTES', 5 * 1024 * 1024),
        rotateLimit: getNumberEnv('FRP_LOG_ROTATE_LIMIT', 5),
      },
    },
    
    ssl: {
      enabled: getBooleanEnv('SSL_ENABLED', true),
      commonName: getStringEnv('SSL_COMMON_NAME', 'localhost'),
      organization: getStringEnv('SSL_ORGANIZATION', 'MCserverManager'),
      validityDays: getNumberEnv('CERT_VALIDITY_DAYS', 365),
      renewalThresholdDays: getNumberEnv('CERT_RENEWAL_THRESHOLD_DAYS', 10),
    },
    
    session: {
      secret: sessionSecret,
      name: getStringEnv('SESSION_NAME', 'frontdriver-session'),
    },
    
    directories: {
      userdata: userdataDir,
      jdk: path.resolve(baseDir, getStringEnv('JDK_DATA_DIR', './userdata/jdk')),
      minecraft: path.resolve(baseDir, getStringEnv('MC_DATA_DIR', './userdata/minecraftServ')),
      downloadTemp: path.resolve(baseDir, getStringEnv('DOWNLOAD_TEMP_PATH', './temp/download')),
      devSecret: path.resolve(baseDir, getStringEnv('DEV_SECRET_DIR', './devsecret')),
      ssl: path.resolve(baseDir, getStringEnv('SSL_CERT_DIR', './userdata/ssl')),
    },
    
    minecraft: {
      stopTimeout: getNumberEnv('MC_SERVER_STOP_TIMEOUT', 30000),
    },
    
    logging: {
      level: (getStringEnv('LOG_LEVEL', 'info') as any),
      fileEnabled: getBooleanEnv('LOG_FILE_ENABLED', false),
      filePath: path.resolve(baseDir, getStringEnv('LOG_FILE_PATH', './logs/app.log')),
    },
    
    development: {
      corsOrigin: getStringEnv('CORS_ORIGIN', '*'),
      debug: getBooleanEnv('DEBUG', false),
    },
  };
}

/**
 * アプリケーション設定のシングルトンインスタンス
 */
export const appConfig: AppConfig = loadAppConfig();

/**
 * 後方互換性のための個別エクスポート
 * 既存コードを段階的に移行できるようにする
 */

// Server
export const DEFAULT_SERVER_PORT = appConfig.server.port;

// Backend
export const BACKEND_API_URL = appConfig.backend.apiUrl;
export const BACKEND_API_TIMEOUT = appConfig.backend.timeout;

// SSL
export const commonName = appConfig.ssl.commonName;
export const organization = appConfig.ssl.organization;
export const CERT_VALIDITY_DAYS = appConfig.ssl.validityDays;
export const CERT_RENEWAL_THRESHOLD_DAYS = appConfig.ssl.renewalThresholdDays;

// Session
export const SESSION_SECRET = appConfig.session.secret;
export const SESSION_NAME = appConfig.session.name;

// Directories
export const USERDATA_DIR = appConfig.directories.userdata;
export const DEV_SECRET_DIR = appConfig.directories.devSecret;
export const USERS_FILE = path.join(appConfig.directories.devSecret, 'users.json');
export const SERVERS_FILE = path.join(appConfig.directories.devSecret, 'servers.json');
export const SSL_CERT_DIR = appConfig.directories.ssl;
export const SSL_KEY_FILE = path.join(appConfig.directories.ssl, 'server.key');
export const SSL_CERT_FILE = path.join(appConfig.directories.ssl, 'server.cert');
export const SSL_INFO_FILE = path.join(appConfig.directories.ssl, 'cert-info.json');

/**
 * 設定の検証
 * 起動時に必須設定が正しいかチェック
 */
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // ポート番号の検証
  if (appConfig.server.port < 1 || appConfig.server.port > 65535) {
    errors.push(`Invalid PORT: ${appConfig.server.port} (must be 1-65535)`);
  }
  
  // URLの検証
  try {
    new URL(appConfig.backend.apiUrl);
  } catch (e) {
    errors.push(`Invalid BACKEND_API_URL: ${appConfig.backend.apiUrl}`);
  }
  
  try {
    new URL(appConfig.frp.authServerUrl);
  } catch (e) {
    errors.push(`Invalid FRP_AUTH_SERVER_URL: ${appConfig.frp.authServerUrl}`);
  }
  
  try {
    new URL(appConfig.frp.binaryBaseUrl);
  } catch (e) {
    errors.push(`Invalid FRP_BINARY_BASE_URL: ${appConfig.frp.binaryBaseUrl}`);
  }
  
  // FRPポートの検証
  if (appConfig.frp.serverPort < 1 || appConfig.frp.serverPort > 65535) {
    errors.push(`Invalid FRP_SERVER_PORT: ${appConfig.frp.serverPort}`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 設定のデバッグ出力
 * 本番環境ではシークレットをマスクして表示
 */
export function debugConfig(): void {
  const isProduction = appConfig.server.nodeEnv === 'production';
  
  console.log('=== Application Configuration ===');
  console.log(`Environment: ${appConfig.server.nodeEnv}`);
  console.log(`Port: ${appConfig.server.port}`);
  console.log(`Backend API: ${appConfig.backend.apiUrl}`);
  console.log(`FRP Auth: ${appConfig.frp.authServerUrl}`);
  console.log(`FRP Server: ${appConfig.frp.serverAddr}:${appConfig.frp.serverPort}`);
  console.log(`SSL Enabled: ${appConfig.ssl.enabled}`);
  
  if (!isProduction) {
    console.log(`Session Secret: ${appConfig.session.secret.substring(0, 10)}...`);
    console.log(`Directories:`, appConfig.directories);
  }
  
  console.log('=================================');
}
```

---

## 🔄 既存コードの移行計画

### Phase 1: lib/constants.ts の更新

```typescript
// lib/constants.ts
// 統合設定から個別定数をインポート
export {
  DEFAULT_SERVER_PORT,
  SESSION_SECRET,
  SESSION_NAME,
  commonName,
  organization,
  CERT_VALIDITY_DAYS,
  CERT_RENEWAL_THRESHOLD_DAYS,
  USERDATA_DIR,
  DEV_SECRET_DIR,
  USERS_FILE,
  SERVERS_FILE,
  SSL_CERT_DIR,
  SSL_KEY_FILE,
  SSL_CERT_FILE,
  SSL_INFO_FILE,
} from './config';
```

**互換性**: ✅ 既存のimportは全て動作

### Phase 2: lib/api-router.ts の更新

**変更前:**
```typescript
new AssetServerAPP(this.router, this.authMiddleware, "http://localhost:3000");
```

**変更後:**
```typescript
import { BACKEND_API_URL } from './config';

// ...

new AssetServerAPP(this.router, this.authMiddleware, BACKEND_API_URL);
```

**互換性**: ✅ 環境変数で上書き可能

### Phase 3: lib/frp-manager/src/config.ts の統合

**変更前:**
```typescript
process.env.FRP_BINARY_BASE_URL || "http://localhost:8080/api/assets/frp"
```

**変更後:**
```typescript
import { appConfig } from '../../config';

// ...

const baseAssetUrl = appConfig.frp.binaryBaseUrl;
```

**互換性**: ✅ 既存の環境変数も継続サポート

---

## ✅ 検証項目チェックリスト

### 設定値の妥当性
- [x] nginx.confのルーティングと整合
- [x] docker-compose.dev.ymlのポートと整合
- [x] 既存の環境変数サポートを維持
- [x] 型安全性の確保
- [x] バリデーション機能の実装

### 互換性
- [x] 既存のimport文が動作
- [x] 環境変数での上書きが可能
- [x] 段階的な移行が可能
- [x] フォールバック機能

### ドキュメント
- [x] .env.exampleに詳細なコメント
- [x] 各設定項目の説明
- [x] docker/nginxとの関係を明記
- [x] 本番環境の設定例

---

## 🚀 実装手順

### Step 1: 新規ファイルの作成
1. `lib/config/types.ts` を作成
2. `lib/config/index.ts` を作成
3. `.env.example` を作成
4. `.gitignore` に `.env` を追加

### Step 2: 既存ファイルの更新
1. `lib/constants.ts` を更新（re-export）
2. `lib/api-router.ts` を更新（BACKEND_API_URL使用）
3. `lib/frp-manager/src/config.ts` を更新（appConfig使用）

### Step 3: テストと検証
1. 開発環境での動作確認
2. 環境変数の上書きテスト
3. 既存機能の回帰テスト

### Step 4: ドキュメント更新
1. README.mdの更新
2. 移行ガイドの作成

---

## 📊 移行前後の比較

### 設定の一元管理

**移行前:**
```
設定が分散
├── lib/constants.ts (PORT, SSL設定)
├── lib/api-router.ts (Backend URL)
└── lib/frp-manager/src/config.ts (FRP設定)
```

**移行後:**
```
設定が集約
├── .env (環境変数)
└── lib/config/
    ├── index.ts (統合設定)
    └── types.ts (型定義)
```

### コード変更の最小化

| ファイル | 変更規模 | 影響 |
|---------|---------|------|
| lib/constants.ts | 小（re-exportのみ） | なし |
| lib/api-router.ts | 小（1行） | なし |
| lib/frp-manager/src/config.ts | 小（import変更） | なし |

---

## ⚠️ 注意事項

### 環境変数の優先順位
1. システム環境変数（最優先）
2. .envファイル
3. コード内既定値

### セキュリティ
- `.env`ファイルは`.gitignore`に追加
- 本番環境では環境変数で設定
- `SESSION_SECRET`は必ず変更

### nginx/Dockerとの連携
- フロントエンドは`BACKEND_API_URL=http://localhost:8080`でnginx経由
- nginx内部で適切なサービスにルーティング
- Docker内部のポートは直接指定しない

---

## 🎯 期待される効果

1. **設定の可視性向上**: `.env.example`で全設定が一目瞭然
2. **環境切り替え簡単**: .envファイルの切り替えのみ
3. **型安全性**: TypeScriptによる型チェック
4. **互換性維持**: 既存コードは最小限の変更
5. **保守性向上**: 設定変更箇所が明確

---

## 📝 レビュー依頼事項

以下の点についてご確認をお願いします:

1. ✅ nginx.conf/docker-composeとの整合性
2. ✅ .env.exampleの設定値の妥当性
3. ✅ 型定義の網羅性
4. ✅ 既存コードへの影響範囲
5. ⏳ 追加すべき設定項目の有無
6. ⏳ 実装の優先順位

---

**作成日**: 2025-12-09  
**ステータス**: レビュー待ち  
**次のアクション**: レビュー承認後、実装開始

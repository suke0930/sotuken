# 設定ファイル管理の改善計画 - 調査レポート

## 調査日時
2025-12-09

## 調査対象ブランチ
`frp-frontend`

## 最新コミット
```
080411c 認証トークンの更新処理を改善し、レスポンスデータを整理して一時トークンを削除するロジックを追加
```

## 1. 現状分析

### 1.1 プロジェクト構造

```
webapp/
├── backend/
│   ├── Asset/                          # Backend API (Node.js/Express/TypeScript)
│   └── Docker/                         # Docker環境 (バックエンドメイン)
│       ├── .env.example                # 環境変数の例
│       ├── docker-compose.yml          # Dockerサービス定義
│       ├── asset-server/               # アセットサーバー (Port: 3000)
│       ├── frp-authjs/                 # FRP認証サーバー (Port: 3002→3000)
│       ├── frp-authz/                  # FRP認可サーバー (Port: 3001)
│       ├── frp-server/                 # FRPサーバー (Port: 7000, 7500)
│       └── nginx/                      # Nginxリバースプロキシ (Port: 8080)
└── frontend/
    └── middleware/
        └── main/                       # フロントエンドミドルウェア (メイン)
            ├── index.ts                # エントリーポイント
            ├── lib/                    # ライブラリ/モジュール群
            │   ├── constants.ts        # 定数定義
            │   ├── api-router.ts       # APIルーティング
            │   ├── frp-manager/        # FRP管理機能
            │   ├── jdk-manager/        # JDK管理機能
            │   ├── minecraft-server-manager/  # MCサーバー管理
            │   └── Asset_handler/      # アセット処理
            └── web/                    # Webフロントエンド (Vue.js)
```

### 1.2 ハードコードされたURL/ポート/パスの一覧

#### A. `frontend/middleware/main/lib/api-router.ts`
**Line 257:**
```typescript
new AssetServerAPP(this.router, this.authMiddleware, "http://localhost:3000");
```
- **用途**: Backend Asset Serverへの接続
- **問題点**: ホストとポートがハードコード
- **影響範囲**: アセットプロキシ全体

#### B. `frontend/middleware/main/lib/constants.ts`
**Line 27:**
```typescript
export const DEFAULT_SERVER_PORT = 12800;
```
- **用途**: フロントエンドミドルウェアのデフォルトポート
- **問題点**: 環境変数での上書きが不可能
- **影響範囲**: サーバー起動時のポート設定

**Line 20:**
```typescript
export const commonName = 'localhost';
```
- **用途**: SSL証明書のCommon Name
- **問題点**: 本番環境で動的に変更できない

#### C. `frontend/middleware/main/lib/frp-manager/src/config.ts`
**Line 82:**
```typescript
process.env.FRP_BINARY_BASE_URL || "http://localhost:8080/api/assets/frp"
```
- **用途**: FRPバイナリのダウンロードURL
- **フォールバック**: 環境変数 → ハードコード

**Line 86:**
```typescript
process.env.FRP_AUTH_SERVER_URL || "http://localhost:8080"
```
- **用途**: FRP認証サーバーURL
- **フォールバック**: 環境変数 → ハードコード

**Line 87:**
```typescript
process.env.FRP_SERVER_ADDR || "127.0.0.1"
```
- **用途**: FRPサーバーアドレス
- **フォールバック**: 環境変数 → ハードコード

**Line 88:**
```typescript
process.env.FRP_SERVER_PORT || 7000
```
- **用途**: FRPサーバーポート
- **フォールバック**: 環境変数 → ハードコード

#### D. `backend/Docker/docker-compose.yml`
バックエンド側のポート設定：
```yaml
nginx:
  ports:
    - "8080:80"

asset-server:
  environment:
    - PORT=3000

frp-authjs:
  ports:
    - "3002:3000"

frp-server:
  ports:
    - "${FRP_BIND_PORT:-7000}:7000"
    - "${FRP_DASHBOARD_PORT:-7500}:7500"
```

### 1.3 現在の環境変数サポート状況

#### ✅ すでに環境変数に対応している設定
1. `SESSION_SECRET` (constants.ts)
2. `FRP_BINARY_BASE_URL` (frp-manager/config.ts)
3. `FRP_AUTH_SERVER_URL` (frp-manager/config.ts)
4. `FRP_SERVER_ADDR` (frp-manager/config.ts)
5. `FRP_SERVER_PORT` (frp-manager/config.ts)
6. `FRP_DATA_DIR` (frp-manager/config.ts)
7. `FRP_VOLATILE_SESSIONS` (frp-manager/config.ts)
8. `FRPC_VERSION` (frp-manager/config.ts)
9. バックエンドDocker環境変数 (JWT_SECRET, DISCORD_*, etc.)

#### ❌ 環境変数に対応していない設定
1. **`DEFAULT_SERVER_PORT` (12800)** - フロントエンドミドルウェアのポート
2. **`AssetServerAPP`のバックエンドURL** - `http://localhost:3000`
3. **`commonName`** - SSL証明書のCommon Name
4. その他の細かいタイムアウト設定等

## 2. 問題点の整理

### 2.1 主要な問題
1. **環境依存の設定が分散**
   - `constants.ts`, `api-router.ts`, `config.ts`など複数ファイルに散在
   - 修正時に複数ファイルを編集する必要がある

2. **ハードコードされたURL**
   - `api-router.ts`の`http://localhost:3000`
   - 開発環境以外では動作しない

3. **設定の上書き困難**
   - `DEFAULT_SERVER_PORT`などが環境変数で上書きできない
   - デプロイ時に毎回コード修正が必要

4. **可視性の低さ**
   - どこでどのポートやURLが使われているか一目でわからない
   - トラブルシューティングが困難

### 2.2 影響範囲
- **開発環境**: 設定変更時に複数ファイル編集が必要
- **本番デプロイ**: 環境ごとに異なる設定を適用できない
- **Docker環境**: フロントエンドとバックエンドの接続設定が分散
- **チーム開発**: 個人の開発環境設定がコンフリクトしやすい

## 3. 改善提案

### 3.1 設定管理の方針

#### 重要な前提
- **アーキテクチャ**: フロントエンド（middleware）とバックエンド（Docker）は**多対1**の関係
- **責任分離**: フロントエンドは**接続情報のみ**保持、バックエンド管理設定は**バックエンド側で管理**
- **デプロイ**: フロントエンドのみの個別リリースが可能

#### A. .envファイルの導入
```
frontend/middleware/main/.env.example
frontend/middleware/main/.env (gitignoreに追加)
```

#### B. 設定の集約（接続情報のみ）
新規ファイル: `frontend/middleware/main/lib/config/index.ts`
- バックエンドへの接続設定を集約
- 環境変数のバリデーション
- 型安全な設定アクセス
- **バックエンド管理設定は含まない**（ダッシュボードポート等）

#### C. 既定値の管理
- `.env.example`に接続情報の設定と説明を記載
- 既定値は開発環境で動作する値を設定
- 本番環境は環境変数で上書き

### 3.2 実装計画

#### Phase 1: 設定ファイルの作成
1. `.env.example`の作成
2. `lib/config/index.ts`の作成
3. 型定義の作成

#### Phase 2: 既存コードの移行
1. `constants.ts`の設定を移行
2. `api-router.ts`のハードコードを削除
3. `frp-manager/config.ts`を統合

#### Phase 3: 検証と文書化
1. 全環境での動作確認
2. READMEの更新
3. 移行ガイドの作成

### 3.3 提案する設定項目

```env
# ===================================
# Frontend Middleware Configuration
# ===================================

# Server Configuration
PORT=12800
NODE_ENV=development

# SSL/TLS Configuration
SSL_ENABLED=true
SSL_COMMON_NAME=localhost
SSL_ORGANIZATION=MCserverManager

# Session Configuration
SESSION_SECRET=<auto-generated>
SESSION_NAME=frontdriver-session

# Backend API Configuration
BACKEND_API_URL=http://localhost:3000
BACKEND_API_TIMEOUT=30000

# FRP Configuration
FRP_BINARY_BASE_URL=http://localhost:8080/api/assets/frp
FRP_AUTH_SERVER_URL=http://localhost:8080
FRP_SERVER_ADDR=127.0.0.1
FRP_SERVER_PORT=7000
FRP_DATA_DIR=./userdata/frp
FRP_VOLATILE_SESSIONS=true

# JDK Manager Configuration
JDK_DATA_DIR=./userdata/jdk

# Minecraft Server Manager Configuration
MC_DATA_DIR=./userdata/minecraftServ
MC_SERVER_STOP_TIMEOUT=30000

# Download Configuration
DOWNLOAD_TEMP_PATH=./temp/download

# Logging Configuration
LOG_LEVEL=info
LOG_FILE_ENABLED=false
```

## 4. 技術的考慮事項

### 4.1 既存コードとの互換性
- 既存の環境変数サポート（FRP関連）を維持
- 段階的な移行を可能にする
- フォールバック機能の実装

### 4.2 型安全性
```typescript
// config/types.ts
export interface AppConfig {
  server: {
    port: number;
    nodeEnv: 'development' | 'production' | 'test';
  };
  ssl: {
    enabled: boolean;
    commonName: string;
    organization: string;
  };
  backend: {
    apiUrl: string;
    timeout: number;
  };
  frp: {
    binaryBaseUrl: string;
    authServerUrl: string;
    serverAddr: string;
    serverPort: number;
    dataDir: string;
    volatileSessions: boolean;
  };
  // ... 他の設定
}
```

### 4.3 バリデーション
- 必須項目のチェック
- 型の検証
- URLフォーマットの検証
- ポート番号の範囲チェック

## 5. 移行手順

### 5.1 開発者向け移行手順
1. `.env.example`を`.env`にコピー
2. 必要に応じて設定を変更
3. サーバーを再起動

### 5.2 本番環境の移行手順
1. 環境変数を設定（Dockerなど）
2. `.env`ファイルは使用しない（セキュリティ）
3. 設定の検証

## 6. リスクと対策

### 6.1 リスク
- 既存の動作に影響する可能性
- 設定の移行漏れ
- 環境変数の設定ミス

### 6.2 対策
- 段階的な移行
- 既存の動作をフォールバックとして維持
- 詳細なテスト
- 移行チェックリストの作成

## 7. 次のステップ

1. **設計レビュー**: この提案内容のレビューと承認
2. **実装計画**: 詳細な実装スケジュールの作成
3. **プロトタイプ**: 小規模な実装とテスト
4. **本格実装**: 全面的な移行作業
5. **ドキュメント**: 移行ガイドとREADMEの更新

## 8. 参考情報

### 8.1 既存の設定ファイル
- `backend/Docker/.env.example` - バックエンドの環境変数例
- `frontend/middleware/main/lib/frp-manager/src/config.ts` - FRP設定
- `frontend/middleware/main/lib/constants.ts` - 定数定義

### 8.2 関連ドキュメント
- `Readme-draft.md` - プロジェクト全体のアーキテクチャ
- `frontend/middleware/main/README.md` - フロントエンドミドルウェアの説明
- `backend/Docker/README.md` - バックエンドDockerの説明

---

## 付録A: ハードコードされた設定の完全リスト

### ポート番号
- `12800` - フロントエンドミドルウェア (constants.ts)
- `3000` - Backend Asset Server (api-router.ts, docker-compose.yml)
- `3002` - FRP Auth.js (docker-compose.yml)
- `3001` - FRP Authz (docker-compose.yml)
- `7000` - FRP Server (config.ts, docker-compose.yml)
- `7500` - FRP Dashboard (docker-compose.yml)
- `8080` - Nginx (docker-compose.yml, config.ts)

### URL/アドレス
- `http://localhost:3000` - Backend API (api-router.ts)
- `http://localhost:8080` - FRP関連サービス (config.ts)
- `127.0.0.1` - FRP Server Address (config.ts)
- `localhost` - SSL Common Name (constants.ts)

### パス
- `./userdata` - ユーザーデータディレクトリ
- `./userdata/jdk` - JDKインストールディレクトリ
- `./userdata/minecraftServ` - MCサーバーディレクトリ
- `./userdata/frp` - FRPデータディレクトリ
- `./temp/download` - ダウンロード一時ディレクトリ
- `./devsecret` - 開発用シークレットディレクトリ

### タイムアウト
- `30000` ms - MCサーバー停止タイムアウト
- `300000` ms - テスト用タイムアウト

---

**調査完了日**: 2025-12-09
**調査者**: AI Assistant
**ステータス**: レビュー待ち

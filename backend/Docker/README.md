# FRP Authentication System - Docker Implementation

**Version:** 2.0.0 (Arctic Migration)  
**Last Updated:** 2025-12-02

Discord OAuth2ベースのFRP認証システムのDocker実装です。

## 🔄 重要な更新 (v2.0)

**Auth.js → Arctic 移行完了**

- ✅ **軽量化**: 依存関係を大幅削減 (Auth.js → Arctic)
- ✅ **API-First設計**: HTML不要、純粋なJSON APIとして動作
- ✅ **ミドルウェア対応**: 外部ソフトウェアから直接呼び出し可能
- ✅ **TypeScript**: Arctic は完全なTypeScriptサポート

## 概要

このシステムは、FRP (Fast Reverse Proxy) にDiscord OAuth2認証とJWTベースの認可機能を統合したマイクロサービス構成です。

## コンテナ構成

### 既存コンテナ
- **nginx**: リバースプロキシ (ポート 8080)
- **asset-server**: アセット管理サーバー (内部ポート 3000) - `backend/Asset`を直接使用

### 新規追加コンテナ (FRP認証システム)
- **frp-authjs**: Arctic Discord OAuth2認証 + JWT発行/検証 (内部ポート 3000)
- **frp-server**: FRPサーバー (ポート 7000, 7500)
- **frp-authz**: ポート権限管理 + セッション管理 (内部ポート 3001)

## クイックスタート

### 1. 環境変数の設定

`.env.example` をコピーして `.env` を作成:

```bash
cp .env.example .env
```

`.env` を編集して以下を設定:

```env
# JWT設定
JWT_SECRET=<openssl rand -base64 32 で生成>

# Discord OAuth2アプリケーション設定 (Arctic)
DISCORD_CLIENT_ID=<Discord Developer Portalから取得>
DISCORD_CLIENT_SECRET=<Discord Developer Portalから取得>
DISCORD_REDIRECT_URI=http://localhost:8080/api/auth/callback
BASE_URL=http://localhost:8080
```

### 2. Dockerコンテナのビルドと起動

```bash
docker-compose up --build -d
```

### 3. 動作確認

```bash
# すべてのコンテナが起動していることを確認
docker-compose ps

# ヘルスチェック
curl http://localhost:8080/api/frp/health
```

## エンドポイント

### 認証関連 (nginxを経由) - Arctic API

- `GET /auth/api/auth/url` - Discord OAuth2認証URL取得 (**NEW**)
- `POST /auth/api/auth/token` - Authorization Code → JWT交換 (**NEW**)
- `POST /api/frp/verify-jwt` - JWT検証

**詳細なAPIドキュメント**: [API_ENDPOINTS.md](./API_ENDPOINTS.md)を参照してください。

### FRPサーバー
- `tcp://localhost:7000` - FRPクライアント接続ポート
- `http://localhost:7500` - FRPダッシュボード (admin/admin)

## ディレクトリ構造

```
backend/
├── Asset/                     # アセットサーバーのソースコード
│   ├── app.ts
│   ├── server.ts
│   ├── package.json
│   └── ...
└── Docker/
    ├── docker-compose.yml     # Docker Compose設定
    ├── .env.example           # 環境変数テンプレート
    ├── nginx/
    │   └── nginx.conf         # Nginx設定
    ├── asset-server/          # Asset Server Dockerfile
    │   ├── Dockerfile         # backend/Assetをビルド
    │   └── .dockerignore
    ├── frp-authjs/            # Container 1: Arctic Auth Server
    │   ├── Dockerfile
    │   ├── src/
    │   │   ├── services/      # discordOAuth2Service (Arctic)
    │   │   ├── routes/        # API routes
    │   │   └── types/
    │   └── data/              # sessions.json (永続化)
    ├── frp-server/            # Container 2: FRP Server
    │   ├── Dockerfile
    │   └── frps.toml
    ├── frp-authz/             # Container 3: Authorization Service
    │   ├── Dockerfile
    │   ├── src/
    │   └── data/              # users.json (永続化)
    ├── AssetServ/             # Asset Server データディレクトリ
    │   ├── Resource/          # ダウンロードファイル等
    │   └── Data/              # データベース等
    ├── README.md
    └── MIDDLEWARE_INTEGRATION.md
```

## ユーザー権限管理

`frp-authz/data/users.json` を編集してユーザーのポート権限を管理:

```json
{
  "users": [
    {
      "discordId": "123456789012345678",
      "allowedPorts": [25565, 22, 3000, 8080],
      "maxSessions": 3,
      "createdAt": "2025-12-01T00:00:00Z",
      "updatedAt": "2025-12-01T00:00:00Z"
    }
  ]
}
```

**フィールド説明:**
- `discordId`: Discord User ID
- `allowedPorts`: 使用可能なリモートポート配列
- `maxSessions`: 同時接続可能なセッション数

## 開発ガイド

### ログの確認

```bash
# すべてのコンテナのログ
docker-compose logs -f

# 特定のコンテナのログ
docker-compose logs -f frp-authjs
docker-compose logs -f frp-authz
docker-compose logs -f frp-server
```

### コンテナの再ビルド

```bash
# 特定のコンテナのみ再ビルド
docker-compose up --build -d frp-authjs

# すべて再ビルド
docker-compose down
docker-compose up --build -d
```

### データの永続化

以下のディレクトリがホストマシンにマウントされます:

- `frp-authjs/data/` → セッションデータ
- `frp-authz/data/` → ユーザー権限データ

## トラブルシューティング

### Discord OAuth2エラー

**問題:** `Invalid OAuth2 redirect URI`

**解決策:**
1. Discord Developer Portalで Redirect URIs を確認
2. `http://localhost:8080/auth/callback/discord` を追加
3. `.env` の `BASE_URL` が正しいことを確認

### JWT検証エラー

**問題:** `Fingerprint mismatch`

**解決策:**
- クライアント側のFingerprint生成ロジックを確認
- サーバー側の `frp-authjs/src/utils/fingerprint.ts` と一致させる

### ポート権限エラー

**問題:** `Port not allowed for this user`

**解決策:**
1. `frp-authz/data/users.json` を確認
2. 該当ユーザーの `allowedPorts` にポート番号を追加
3. ファイルは自動で再読み込みされます（約60秒）

## 次のステップ

### ミドルウェア統合

フロントエンドミドルウェアへの統合方法は [MIDDLEWARE_INTEGRATION.md](./MIDDLEWARE_INTEGRATION.md) を参照してください。

### セキュリティ強化

本番環境では以下を実装してください:

- HTTPS/TLS通信の有効化
- JWT暗号化 (JWE) の導入
- Rate Limitingの実装
- 監査ログの記録

## 参考資料

- [設計書案1](../設計書案1.md) - 完全版設計書
- [設計書案2](../設計書案2.md) - サーバーサイド重点設計書
- [FRP-test](../FRP-test/) - PoC実装
- [DiscordLoginTest](../DiscordLoginTest/) - Auth.js実装例

## ライセンス

MIT

# FRP認証システム - Docker環境総合ドキュメント

**対象リポジトリ:** `backend/Docker`  
**最終確認:** 2025-12-03, コード基準コミット  
**対応範囲:** `docker-compose.yml`, `nginx/nginx.conf`, `frp-authjs`, `frp-authz`, `asset-server`（`backend/Asset`）

---

## 1. システム概要

Discord OAuth2 で認証したユーザーに対して FRP( Fast Reverse Proxy ) の利用権限を与えるマイクロサービス群を Docker Compose で束ねています。Nginx が単一の入口( `http://localhost:8080` )を公開し、以下の役割ごとにリクエストを振り分けます。

| サービス | 役割 | 主要ポート/ファイル |
| --- | --- | --- |
| **nginx** | 逆プロキシ。`/api` と `/auth` を各サービスへ振り分け | `nginx/nginx.conf` |
| **asset-server** | `backend/Asset` をビルドしたアセット配信/FRPバイナリAPI | 内部 :3000 |
| **frp-authjs** | Discord OAuth2 + JWT発行/検証 (Polling認証) | `frp-authjs/src/routes/api.ts` |
| **frp-authz** | FRP Webhook処理・ポート権限確認・セッション同期 | `frp-authz/src/routes/*.ts` |
| **frp-server** | 本体 frps。HTTP Plugin で `frp-authz` に Webhook を投げる | `frp-server/frps.toml` |

### 主なデータ永続化

- `frp-authjs/data/sessions.json` : 認証セッション ( `sessionManager` )
- `frp-authz/data/users.json` : ユーザーごとの許可ポート
- `frp-authz/data/active_sessions.json` : FRP セッション ( `sessionTracker` )
- `AssetServ/Resource`, `AssetServ/Data` : アセット配信用

---

## 2. ディレクトリと Compose

```
backend/Docker/
├── docker-compose.yml        # 本番想定
├── docker-compose.dev.yml    # ホットリロード開発用
├── nginx/nginx.conf          # 入口のルーティング設定
├── frp-authjs/               # 認証API (TypeScript)
├── frp-authz/                # FRP権限サービス
├── frp-server/               # frps + HTTP plugin 設定
├── asset-server/             # Asset Server 用 Dockerfile
└── AssetServ/                # Asset Server 永続データ
```

### Compose での主な環境変数

| 変数 | 役割 | 参照ファイル |
| --- | --- | --- |
| `JWT_SECRET` | frp-authjs の署名鍵 | `frp-authjs/src/config/env.ts` |
| `AUTH_DISCORD_ID` / `AUTH_DISCORD_SECRET` | Discord OAuth2 クライアント情報 (コンテナ内では `DISCORD_CLIENT_*` として受け取る) | `docker-compose*.yml` |
| `FRP_BINARY_RELEASE_URL`, `FRP_VERSION` | FRPバイナリ配信用 | `backend/Asset/routes/frp.ts` |
| `FRP_DASHBOARD_URL`, `FRP_DASHBOARD_USER`, `FRP_DASHBOARD_PASS` | FRP Dashboard API 同期 | `frp-authz/src/services/frpDashboardClient.ts` |

詳細な `.env` 雛形は `backend/Docker/.env.example` を参照してください。

---

## 3. Nginx ルーティング (nginx/nginx.conf)

| 外部パス | 転送先 | 説明 |
| --- | --- | --- |
| `/api/auth/*` | `frp-authjs:3000/api/auth/*` | Polling 認証 API |
| `/api/user/*` | `frp-authjs:3000/api/user/*` | ユーザー情報 API |
| `/api/verify-jwt` | `frp-authjs:3000/api/verify-jwt` | JWT 検証 |
| `/api/assets/*` | `asset-server:3000/*` | アセット配信・FRPバイナリ API |
| `/api/frp/*` | `frp-authjs:3000/api/*` | レガシー互換 (frp-server からの呼び出し) |
| `/auth/*` | `frp-authjs:3000/*` | 認証サーバー UI/API へのフルプロキシ |
| `/ws/*` | `asset-server` | WS フォワード |
| `/health` | `asset-server/health` | Asset Server 健康診断 |

Nginx 側で `/api/frp/verify-jwt` → `/api/verify-jwt` へ書き換えているため、frp-server の HTTP Plugin からは `/api/frp/verify-jwt` を叩けば OK です。

---

## 4. Polling 認証フロー (frp-authjs/src/routes/api.ts)

1. **初期化** – `POST /api/auth/init`  
   - body: `{ fingerprint: string }`  
   - 戻り値: `tempToken`, `authUrl`, `expiresIn`. 認証URLは Discord OAuth2 への直接リンク。

2. **ユーザー操作** – ブラウザで `authUrl` を開き、Discord で認可。Discord は `DISCORD_REDIRECT_URI` (例: `http://localhost:8080/api/auth/callback`) に `code`, `state` を付けて戻します。  
   `/api/auth/callback` は HTML を返し、ユーザーには完了ページを表示します。

3. **ポーリング** – `GET /api/auth/poll?tempToken=xxx`  
   - `pending` / `completed` / `expired` のいずれか。  
   - 完了時は `jwt`・`refreshToken`・Discordユーザー情報が返却されます。

4. **FRP接続** – 取得した `jwt` と `fingerprint` を frpc のメタ情報に設定し接続。frps → `frp-authz` → `frp-authjs` の順で検証されます。

5. **トークン更新/ユーザー情報** – `POST /api/auth/refresh` と `GET /api/user/info` を利用します (後述)。

---

## 5. API 詳細

### 5.1 認証 API (`frp-authjs`)

| メソッド/パス | 説明 | リクエスト | レスポンス例 |
| --- | --- | --- | --- |
| `POST /api/auth/init` | 認証セッション作成、`tempToken` 発行 | `{ "fingerprint": "hex..." }` | `{"tempToken":"...","authUrl":"https://discord.com/...","expiresIn":600}` |
| `GET /api/auth/poll?tempToken=` | 認証状態取得 | Query に `tempToken` | `{"status":"completed","jwt":"...","refreshToken":"..."}` |
| `GET /api/auth/callback` | Discord からのリダイレクト受信、HTML を返して完了通知 | Query: `code`,`state` | 成功/失敗の静的 HTML |
| `POST /api/verify-jwt` | frp-authz から利用。JWT + fingerprint を検証 | `{ "jwt":"...", "fingerprint":"..." }` | `{"valid":true,"discordId":"...","sessionId":"..."}` |

※ `/api/verify-jwt` は Nginx から `/api/frp/verify-jwt` としても届きます。

### 5.2 トークン・ユーザー情報 (`frp-authjs`)

- `POST /api/auth/refresh`  
  - body: `{ refreshToken, fingerprint }`。  
  - 成功時 `accessToken`, `refreshToken`, `expiresAt`, `refreshExpiresAt` を返します。失敗時は `reason` (`token_expired`, `fingerprint_mismatch` など) を返却。  
  - fingerprint 不一致時は `sessionManager.invalidateAllUserSessions()` が実行され、全セッション強制失効 ( `jwtService.refreshAccessToken()` )。

- `GET /api/user/info`  
  - Header: `Authorization: Bearer <jwt>`, `X-Fingerprint: <fingerprint>`。  
  - 成功時、Discordユーザー情報、現在のセッション、`frp-authz` 内部 API から取得したポート権限/アクティブセッションをまとめて返却。  
  - `frp-authz` への問い合わせに失敗した場合は `X-Warning` ヘッダに警告を付与します。

### 5.3 FRP バイナリ API (`asset-server`, `backend/Asset/routes/frp.ts`)

- `GET /api/assets/frp/client-binary`
- `GET /api/assets/frp/server-binary`
- `GET /api/assets/frp/info`

すべて `FRP_BINARY_RELEASE_URL` と `FRP_VERSION` からメタ情報を生成し、GitHub Releases への直リンクを返します。アーカイブの展開はミドルウェア側が実施。詳細は `FRP_BINARY_API.md` を参照してください。

### 5.4 FRP Authorization API (`frp-authz`)

| エンドポイント | 用途 | 実装 |
| --- | --- | --- |
| `POST /webhook/handler` | frps HTTP Plugin から 4 種の op (`Login`, `NewProxy`, `CloseProxy`, `Ping`) を受信 | `frp-authz/src/routes/webhook.ts` |
| `GET /internal/user/:discordId/info` | frp-authjs が `/api/user/info` を組み立てる際に利用。許可ポートと現在のアクティブセッション一覧を返す | `frp-authz/src/routes/internal.ts` |
| `GET /health` | ヘルスチェック | `frp-authz/src/index.ts` |

`sessionTracker` は起動時に `frpDashboardClient` を通じ、FRP Dashboard API (`/api/proxy/tcp`) と同期してゴーストセッションを削除します (`FRP_SYNC_IMPLEMENTATION.md` 参照)。

---

## 6. データと設定

### 6.1 永続ファイル

| ファイル | 説明 | 生成元 |
| --- | --- | --- |
| `frp-authjs/data/sessions.json` | `sessionManager` が JWT セッションを保存 | `frp-authjs/src/services/sessionManager.ts` |
| `frp-authz/data/users.json` | Discord ID ごとの許可ポート/セッション上限 | `frp-authz/src/services/userManager.ts` |
| `frp-authz/data/active_sessions.json` | 現在稼働中の FRP セッション (port, sessionId 等) | `frp-authz/src/services/sessionTracker.ts` |
| `AssetServ/Resource/*` | 配信用アセット (zip など) | Asset Server |

### 6.2 重要環境変数

```env
JWT_SECRET=...                 # frp-authjs JWT 署名
AUTH_DISCORD_ID=...            # Discord OAuth2 client id
AUTH_DISCORD_SECRET=...        # Discord OAuth2 secret
DISCORD_REDIRECT_URI=http://localhost:8080/api/auth/callback
BASE_URL=http://localhost:8080
FRP_BINARY_RELEASE_URL=https://github.com/fatedier/frp/releases/download/v0.65.0/...
FRP_VERSION=0.65.0
FRP_DASHBOARD_URL=http://frp-server:7500
FRP_DASHBOARD_USER=admin
FRP_DASHBOARD_PASS=admin
```

`frp-authjs/src/config/env.ts` が必須変数をチェックするため、欠落するとアプリが起動できません。

---

## 7. テスト/検証手順

### 7.1 単体確認

```bash
# Asset Server API (FRPバイナリ)
cd backend/Asset
npm run dev
curl http://localhost:3000/api/assets/frp/client-binary

# frp-authjs
cd backend/Docker/frp-authjs
npm install
npm run dev
curl -X POST http://localhost:3002/api/auth/init -H 'Content-Type: application/json' -d '{"fingerprint":"demo"}'
```

### 7.2 Docker Compose

```bash
cd backend/Docker
cp .env.example .env   # 必要に応じて値を編集
docker-compose up -d
docker-compose ps

# ヘルスチェック
curl http://localhost:8080/api/auth/health
curl http://localhost:8080/api/assets/frp/info
curl http://localhost:8080/api/frp/verify-jwt -d '{"jwt":"","fingerprint":""}'
```

`frp-authz` のログで Webhook の受信状況やゴーストセッション同期結果を確認できます (`docker-compose logs -f frp-authz`)。

---

## 8. 関連ドキュメント

- `README.md` : クイックスタート/変更履歴
- `FRP_BINARY_API.md` : FRP バイナリ配信の詳細
- `FRP_SYNC_IMPLEMENTATION.md` : FRP Dashboard 同期の実装メモ
- `MIDDLEWARE_INTEGRATION.md` : フロントエンドミドルウェア統合方法
- `POLLING_AUTH_DESIGN.md` : Polling 認証の設計背景

本ドキュメントを基点に参照すれば `backend/Docker` 配下の情報を一元的に追跡できます。

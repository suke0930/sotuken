# Front Driver Middleware

Minecraft サーバー管理用のフロントエンド UI とバックエンド Asset/FRP/ログ API をつなぐ Express 5 + TypeScript 製ミドルウェアです。セッション認証、アセット配信、JDK/サーバー管理、FRP トンネル管理、各種 WebSocket 通知を 1 つのプロセスで提供します。

## ここでできること
- シングルユーザー向けセッション認証（`devsecret/users.json` にハッシュ保存）
- Asset Server 経由の Jar/JDK ダウンロードと進捗 WebSocket (`/ws`)
- JDK 管理（インストール/一覧/削除）と MC サーバー作成・起動・停止・ログ取得 (`/api/jdk`, `/api/mc`)
- サーバー更新・バックアップなどの管理 UI を配信 (`/web/*`)
- FRP クライアントの認証・セッション起動・ログ取得 (`/api/frp`, `/ws/mcserver`)
- SSL 自動生成/更新（自己署名、`userdata/ssl`）、Pino による構造化ログ

## 必要要件
- Node.js 20 以上（`ts-node` 実行を想定）
- バックエンド Asset/FRP サーバー（`BACKEND_API_URL` が指す先）  
  ※ Docker/Nginx 経由の多対1構成が前提。詳細は `.env.example` と `CONFIG_MIGRATION_GUIDE.md` を参照。

## クイックスタート
```bash
cd frontend/middleware/main
cp .env.example .env   # 必要に応じてポートやバックエンド URL を編集
npm install
npm run dev            # (内部で --envpath .env を付与して起動)
# npm start を使う場合: npm start -- --envpath .env
```
- 起動には `--envpath` 指定が必須です（未指定の場合は起動時に終了します）。`npm run dev` は必要な引数を含みます。
- 既定ポートは `.env` の `PORT`（デフォルト 12800）。SSL 有効時は `https://localhost:<PORT>/` で UI にアクセス。
- ユーザーが未登録の場合、最初のログイン時に `/user/signup` が呼ばれ `devsecret/users.json` に作成されます。

## 主要設定（抜粋）
- ポート/モード: `PORT`, `NODE_ENV`
- バックエンド接続: `BACKEND_API_URL`, `BACKEND_API_TIMEOUT`
- FRP クライアント: `FRP_BINARY_BASE_URL`, `FRP_AUTH_SERVER_URL`, `FRP_SERVER_ADDR`, `FRP_SERVER_PORT`, `FRP_DATA_DIR`
- ストレージ: `USERDATA_DIR`, `DEV_SECRET_DIR`, `DOWNLOAD_TEMP_PATH`, `JDK_DATA_DIR`, `MC_DATA_DIR`
- SSL: `SSL_ENABLED`, `SSL_COMMON_NAME`, `CERT_VALIDITY_DAYS`, `CERT_RENEWAL_THRESHOLD_DAYS`
- セッション: `SESSION_SECRET`（未設定なら起動毎に自動生成）、`SESSION_NAME`, `SESSION_MAX_AGE`
完全な一覧は `.env.example` を参照。`DEBUG_CONFIG=true npm run dev` で読み込まれた設定を確認できます。

## ディレクトリ概要
- `index.ts` — エントリーポイント。設定検証 → SSL セットアップ → ミドルウェア/ルーター登録 → サーバー起動。
- `lib/config` — 環境変数ベースの統合設定と検証。
- `lib/middleware-manager.ts` — 共通ミドルウェア（JSON, Cookie, セッション, セキュリティヘッダー, 静的配信）。
- `lib/api-router.ts` — 認証・Asset プロキシ・JDK/MC/FRP API・WebSocket のルーティング定義。
- `lib/jdk-manager` — JDK エントリ管理とダウンロード。
- `lib/minecraft-server-manager` — サーバー作成/起動/停止/コマンド/ログ/プロパティ管理と `/ws/mcserver` 配信。
- `lib/Asset_handler` — バックエンド Asset Server 経由のダウンロード API と `/ws` での進捗通知。
- `lib/frp-manager` — FRP 認証フロー（Discord OAuth 経由）と frpc プロセス/ログ/セッション管理。
- `web/` — 管理 UI（サーバー一覧・更新モーダル等のフロントエンド）。
- `devsecret/` — シングルユーザー用の資格情報 (`users.json`) とサーバー定義 (`servers.json`)。起動時に自動生成。
- `userdata/` — JDK/MC/FRP/SSL の実データ。存在しなければ起動時に作成。
- `temp/download/` — ダウンロード一時保存先。

## 提供エンドポイント（抜粋）
- 認証: `POST /user/signup`, `POST /user/login`, `GET /user/auth`, `POST /user/logout`
- サンプル: `GET /api/sample/public-info`, `GET /api/sample/private-data`
- Asset プロキシ: `/api/assets/*`（Jar/JDK/FRP バイナリ取得、ダウンロード一覧など）
- JDK 管理: `GET /api/jdk/installlist`, `GET /api/jdk/getbyid/:id`, `GET /api/jdk/getbyverison/:verison`, `POST /api/jdk/add`, `DELETE /api/jdk/removeJDK/:id`
- Minecraft 管理: `GET /api/mc/list`, `POST /api/mc/add`, `DELETE /api/mc/remove/:id`, `GET /api/mc/run|stop/:id`, `POST /api/mc/command/:id`, `PUT /api/mc/update/:id`, `GET /api/mc/logs/:id`, `DELETE /api/mc/logs/:id`, `GET/POST /api/mc/Properties/:id`（旧 `/Propites/*` も後方互換で提供）
- FRP 管理: `/api/frp/auth/*`, `/api/frp/sessions`, `/api/frp/processes`, `/api/frp/logs/:sessionId`, `/api/frp/me`（詳細は `docs/FRP_MANAGER_API.md`）
- WebSocket: `/ws`（ダウンロード進捗）, `/ws/mcserver`（MC サーバーの標準出力/イベント）

## スクリプト
- `npm run dev` / `npm start` — ts-node でサーバー起動
- `npm run build` — TypeScript のビルド（出力先: `dist/`）
- `npm test` — FRP 関連のテスト実行（`tsconfig.frp-tests.json` でビルド後、`temp/frp-tests` の Node.js テストを実行）

## 追加ドキュメント
- 設定移行と .env 説明: `CONFIG_MIGRATION_GUIDE.md`
- サーバー更新機能ガイド: `QUICK_START_UPDATE_FEATURE.md`, `SERVER_UPDATE_IMPLEMENTATION.md`
- FRP API 詳細: `docs/FRP_MANAGER_API.md`
- WebSocket 認証: `docs/WEBSOCKET_AUTH.md`
- SSL 実装メモ: `docs/SSL_IMPLEMENTATION.md`

変更や運用時の詳細は上記ドキュメントと `.env.example` を併せて確認してください。

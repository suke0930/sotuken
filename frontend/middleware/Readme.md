# Middleware ガイド

`frontend/middleware` はフロントエンド向けのバックエンド（ミドルウェア）資産をまとめたディレクトリです。主に `main/` 配下でセッション管理や API プロキシ、WebSocket 連携を提供します。

## ディレクトリ構成

```text
frontend/middleware/
├── Readme.md
├── Stabs/                      # スタブ・試験用コード
└── main/
    ├── index.ts                # 開発・本番共通のエントリーポイント
    ├── package.json            # スクリプト・依存関係定義
    ├── web/                    # 静的配信資産（ログインページなど）
    ├── lib/                    # ミドルウェア本体（セッション・API ルーター等）
    ├── docs/                   # 設計/API ドキュメント
    ├── CHANGELOG.md
    └── CONFIG_MIGRATION_GUIDE.md  # 設定移行ガイド
```

## 開発・起動手順

`frontend/middleware/main` に移動して実行してください。

```bash
cd frontend/middleware/main
npm install
npm run build   # TypeScript をトランスパイル
npm run dev     # ts-node で開発起動（HTTPS 自動設定を試行）
```

- 本番相当のビルド済みコードを起動する場合は `npm start` を使用します。
- 開発サーバーは既定で `http(s)://127.0.0.1:<port>/`（デフォルトは `lib/constants.ts` の `DEFAULT_SERVER_PORT`）をリッスンします。

## 主要エントリポイント

- **`index.ts`**: Express アプリの組み立てと起動を担うメインファイル。SSL 設定、セッション初期化、各種ルーター・WebSocket を登録します。
- **`lib/middleware-manager.ts`**: セッションミドルウェア（`express-session`）や静的配信、セキュリティヘッダー、認証ミドルウェアの設定を担当。
- **`lib/api-router.ts`**: 認証付き API 群（サンプル API、Minecraft サーバー管理、Asset プロキシ、FRP 管理など）と WebSocket ハンドラーをマウントします。
- **`web/`**: ログインページ等の UI を静的ファイルとして配信します。

## 提供機能（抜粋）

`main/lib` で提供している代表的な機能は以下のとおりです。

- **セッション管理**: `express-session` を利用し、HTTPOnly/SameSite Cookie を設定。HTTPS 有効時は `secure` フラグを自動で有効化します。（`lib/middleware-manager.ts`）
- **API プロキシ/資産管理**: Asset サーバーへのリスト取得・ダウンロード要求をプロキシし、JDK/Minecraft サーバー資産の管理 API を公開します。（`lib/api-router.ts`、`lib/Asset_handler` 系）
- **Minecraft サーバー管理**: サーバー起動・停止や状態監視の API と WebSocket (`/ws/mcserver`) を提供します。（`lib/minecraft-server-manager` 系）
- **FRP 管理**: FRP（リバースプロキシ）設定の生成・管理 API を `/api/frp` 配下で提供します。（`lib/frp-manager` 系）
- **開発用ユーザー管理**: `devsecret/users.json` を自動生成し、認証に用いる開発ユーザーを初期化します。（`lib/dev-user-manager.ts`）

詳しい仕様は以下のドキュメントを参照してください。

- [セッション管理 README](main/README.md)
- [WEBSOCKET_AUTH](main/docs/WEBSOCKET_AUTH.md)
- [Asset Handler ドキュメント](main/lib/Asset_handler/docs/Readme.md)
- [FRP_MANAGER_API](main/docs/FRP_MANAGER_API.md)

## アーキテクチャ概要

```mermaid
graph LR
    subgraph Client
        B[ブラウザ]
    end
    subgraph Middleware
        A[index.ts (Express)] --> M[MiddlewareManager\nセッション・静的配信]
        A --> R[ApiRouter\n各種 REST/API]
        A --> W[WebSocket ハンドラー]
    end
    B <--> R
    B <--> W
    R -->|プロキシ/管理| S[(Asset/Minecraft/FRP サービス)]
```

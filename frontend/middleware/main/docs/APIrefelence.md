# APIドキュメント

このドキュメントは、システム全体で実装されているAPIエンドポイントの一覧です。
各APIは、責務に応じて異なるサーバーコンポーネントによって提供されます。

## 認証・セッション管理 (Front Driver)

ユーザー認証とセッション管理に関連するAPIです。

- `POST /user/login`
  - **説明**: ユーザーのログイン処理を行います。成功するとセッションが確立されます。
- `GET /user/auth`
  - **説明**: 現在のセッションの認証状態を確認します。ログイン済みかどうかを判定するために使用します。
- `POST /user/logout`
  - **説明**: ユーザーのログアウト処理を行います。現在のセッションを破棄します。
- `GET /api/protected`
  - **説明**: 認証が必要なAPIエンドポイントのサンプルです。認証ミドルウェアの動作確認に使用します。

## アセット情報プロキシ (Backend Proxy)

`Asset Server` が持つアセット情報（サーバーJarやJDKのリスト）をフロントエンドに中継するためのAPIです。

- `GET /api/assets/list/servers`
  - **説明**: `Asset Server`から利用可能なMinecraftサーバーのJarリストを取得します。
- `GET /api/assets/list/jdk`
  - **説明**: `Asset Server`から利用可能なJDKのバイナリリストを取得します。

## ダウンロード管理 (Backend Proxy)

ファイルのダウンロード処理を管理し、WebSocketを通じて進捗を通知するAPIです。

- `POST /api/download`
  - **説明**: `Asset Server`からのファイルダウンロードタスクを開始します。リクエストボディでダウンロードしたいファイルのURLを指定します。成功するとタスクIDを返します。
- `GET /api/assets/downloads`
  - **説明**: 現在進行中のダウンロードタスクの一覧を取得します。
- `WebSocket`
  - **説明**: `POST /api/download` で開始されたタスクの進捗（ダウンロード率、速度など）をリアルタイムでクライアントに通知します。

## アセット配布 (Asset Server)

MinecraftサーバーのJarやJDKバイナリなどの静的ファイルを直接配信するためのAPIです。

- `GET /api/assets/jdk/{version}/{os}/{filename}`
  - **説明**: 指定されたバージョンとOSに対応するJDKバイナリをダウンロードします。
  - **例**: `/api/assets/jdk/17/windows/jdk-17-windows-x64.zip`
- `GET /api/assets/servers/{type}/{version}/{filename}`
  - **説明**: 指定された種類とバージョンのMinecraftサーバーソフトウェアをダウンロードします。
  - **例**: `/api/assets/servers/paper/1.20.1/paper-1.20.1.jar`

## メタ情報 (Asset Server)

`Asset Server`が保持する情報のカタログを提供するAPIです。

- `GET /api/v1/servers`
  - **説明**: サポートしている全Minecraftサーバーのソフトウェア名、バージョン、対応JDKなどの情報を取得します。
- `GET /api/v1/jdk`
  - **説明**: サポートしている全JDKのバージョン、ベンダー、LTSかどうか、各OSごとのダウンロード情報などを取得します。

## ヘルスチェック

各サーバーコンポーネントの稼働状況を確認するためのAPIです。

- `GET /health`
  - **説明**: サーバーが正常に稼働しているかを確認します。主に `Asset Server` で使用されます。
  - **レスポンス例**:
    ```json
    {
      "status": "ok",
      "timestamp": "2025-11-05T01:28:00.000Z"
    }
    ```
- `GET /api/assets/health`
  - **説明**: `Front Driver` または `Backend Proxy` から `Asset Server` のヘルスチェックを行います。

## 一般的なエラーレスポンス

APIリクエストが失敗した場合、以下のような形式でエラーが返却されます。

- **エンドポイントが見つからない場合 (404 Not Found)**
  ```json
  {
    "success": false,
    "error": {
      "message": "エンドポイントが見つかりません",
      "code": "NOT_FOUND"
    },
    "timestamp": "2025-11-05T01:28:00.000Z"
  }

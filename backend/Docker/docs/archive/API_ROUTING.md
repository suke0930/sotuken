# Nginx API Routing Documentation

このドキュメントは、Nginxリバースプロキシを経由した際のAPIエンドポイントの構成について説明します。

## 概要

Nginxは、各バックエンドサービスへのゲートウェイとして機能し、リクエストを適切なサービスにルーティングします。
主なサービスは以下の通りです。

-   **asset-server**: MinecraftのサーバーファイルやJDKなどのアセットを配信します。
-   **frp-authjs**: Discordを利用したOAuth2認証とJWTの発行・検証を行います。

---

## 1. Asset Server (`asset-server`)

`asset-server` へのリクエストは、Nginxの `/api/` または `/ws/` パスを経由します。

-   **Nginx Proxy Prefix**: `/api/`, `/ws/`
-   **Backend Service**: `http://asset-server:3000`

### 1.1. APIエンドポイント (JSON)

| Method | Nginx Path                    | Backend Path            | 説明                                   |
| :----- | :---------------------------- | :---------------------- | :------------------------------------- |
| `GET`  | `/api/v1/servers`             | `/v1/servers`           | 全てのサーバーソフトウェア情報を取得   |
| `GET`  | `/api/v1/jdk`                 | `/v1/jdk`               | 全てのJDKバージョン情報を取得          |
| `GET`  | `/api/assets/list/servers`    | `/assets/list/servers`  | 利用可能な全サーバーファイルの一覧を取得 |
| `GET`  | `/api/assets/list/jdk`        | `/assets/list/jdk`      | 利用可能な全JDKファイルの一覧を取得      |

### 1.2. アセットダウンロードエンドポイント

| Method | Nginx Path                        | Backend Path                | 説明                                         |
| :----- | :-------------------------------- | :-------------------------- | :------------------------------------------- |
| `GET`  | `/api/assets/servers/[file_path]` | `/assets/servers/[file_path]` | サーバーソフトウェアファイルをダウンロード   |
| `GET`  | `/api/assets/jdk/[file_path]`     | `/assets/jdk/[file_path]`     | JDKファイルをダウンロード                    |

### 1.3. ヘルスチェック

| Method | Nginx Path | Backend Path | 説明               |
| :----- | :--------- | :----------- | :----------------- |
| `GET`  | `/health`  | `/health`    | ヘルスチェック     |

---

## 2. FRP Auth Server (`frp-authjs`)

`frp-authjs` へのリクエストは、Nginxの `/auth/` または `/api/frp/` パスを経由します。

### 2.1. 認証エンドポイント

-   **Nginx Proxy Prefix**: `/auth/`
-   **Backend Service**: `http://frp-authjs:3000`

| Method | Nginx Path                  | Backend Path       | 説明                               |
| :----- | :-------------------------- | :----------------- | :--------------------------------- |
| `POST` | `/auth/api/auth/init`       | `/api/auth/init`   | 認証フローを開始し、認証URLを取得 |
| `GET`  | `/auth/api/auth/poll`       | `/api/auth/poll`   | 認証ステータスをポーリングで確認   |
| `GET`  | `/auth/api/auth/callback`   | `/api/auth/callback` | DiscordからのOAuth2コールバック  |

### 2.2. JWT検証エンドポイント

-   **Nginx Proxy Prefix**: `/api/frp/`
-   **Backend Service**: `http://frp-authjs:3000/api/`

| Method | Nginx Path               | Backend Path  | 説明          |
| :----- | :----------------------- | :------------ | :------------ |
| `POST` | `/api/frp/verify-jwt`    | `/api/verify-jwt` | JWTを検証する |

---

## 3. エンドポイント クイックリファレンス

Docker Compose環境を起動後、以下のURLに直接アクセスできます。
Nginxはホストマシンの **`8080`** ポートでリッスンしています。

### 3.1. Asset Server エンドポイント

| Method | URL                                                              | 説明                                   |
| :----- | :--------------------------------------------------------------- | :------------------------------------- |
| `GET`  | `http://localhost:8080/health`                                   | ヘルスチェック                         |
| `GET`  | `http://localhost:8080/api/v1/servers`                           | 全てのサーバーソフトウェア情報を取得   |
| `GET`  | `http://localhost:8080/api/v1/jdk`                               | 全てのJDKバージョン情報を取得          |
| `GET`  | `http://localhost:8080/api/assets/list/servers`                  | 利用可能な全サーバーファイルの一覧を取得 |
| `GET`  | `http://localhost:8080/api/assets/list/jdk`                      | 利用可能な全JDKファイルの一覧を取得      |
| `GET`  | `http://localhost:8080/api/assets/servers/[file_path]`           | サーバーソフトウェアファイルをダウンロード   |
| `GET`  | `http://localhost:8080/api/assets/jdk/[file_path]`               | JDKファイルをダウンロード                    |


### 3.2. FRP Auth Server エンドポイント

| Method | URL                                                   | 説明                               |
| :----- | :---------------------------------------------------- | :--------------------------------- |
| `POST` | `http://localhost:8080/auth/api/auth/init`            | 認証フローを開始し、認証URLを取得 |
| `GET`  | `http://localhost:8080/auth/api/auth/poll`            | 認証ステータスをポーリングで確認   |
| `GET`  | `http://localhost:8080/auth/api/auth/callback`        | DiscordからのOAuth2コールバック    |
| `POST` | `http://localhost:8080/api/frp/verify-jwt`            | JWTを検証する                      |

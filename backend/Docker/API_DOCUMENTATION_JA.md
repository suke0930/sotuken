# FRP認証システム - APIエンドポイント仕様書

**バージョン:** 2.0.0  
**最終更新日:** 2025-12-02

---

## 概要

このドキュメントは、FRP（Fast Reverse Proxy）認証システムのAPIエンドポイントについて説明します。

このシステムはDiscord OAuth2を利用してユーザーを認証し、JWT（JSON Web Token）を発行することで、FRPのポート利用を認可します。すべてのAPIは、リバースプロキシ（Nginx）を経由してアクセスされます。

- **開発環境ベースURL:** `http://localhost:8080`

---

## 認証フロー

ユーザーが認証を行い、FRP接続に必要なJWTを取得するまでの流れは以下の通りです。

### ステップ1: 認証URLの取得

まず、クライアント（フロントエンド）はユーザーをDiscordの認証ページにリダイレクトさせるためのURLを取得します。

**エンドポイント:** `GET /auth/api/auth/url`

**レスポンスの例:**
```json
{
  "url": "https://discord.com/api/oauth2/authorize?client_id=...",
  "state": "CSRF対策用のランダムな文字列",
  "message": "Open this URL in a browser to authenticate with Discord"
}
```
クライアントは受け取った`url`にユーザーをリダイレクトさせ、`state`の値を後続のステップのために保持します。

### ステップ2: Discordでのユーザー認証とリダイレクト

ユーザーはDiscordのサイトでアプリケーションを認可します。正常に完了すると、Discordは設定されたリダイレクトURIにユーザーを戻します。このとき、URLのクエリパラメータに`code`と`state`が付与されます。

**リダイレクト先の例:**
`http://localhost:8080/api/auth/callback?code=認可コード&state=ステップ1の文字列`

### ステップ3: 認可コードとJWTの交換

クライアントは、受け取った`code`と`state`、そしてクライアント固有の`fingerprint`をサーバーに送信し、JWTと交換します。

**エンドポイント:** `POST /auth/api/auth/token`

**リクエストボディ:**
```json
{
  "code": "Discordから受け取った認可コード",
  "state": "ステップ1で取得したstateの値",
  "fingerprint": "クライアント識別用のフィンガープリントハッシュ"
}
```

**レスポンスの例:**
```json
{
  "jwt": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2025-12-03T10:00:00Z",
  "discordUser": {
    "id": "123456789012345678",
    "username": "ExampleUser",
    "avatar": "a1b2c3d4e5f6",
    "discriminator": "1234"
  }
}
```
この`jwt`が、以降のFRP接続やAPIリクエストの認証に使用されます。

---

## APIエンドポイント詳細

### JWT検証

FRPサーバー（frps）は、クライアント（frpc）からの接続時にこのエンドポイントを利用して、提供されたJWTの有効性を検証します。

**エンドポイント:** `POST /api/frp/verify-jwt`

**リクエストボディ:**
```json
{
  "jwt": "検証したいJWT",
  "fingerprint": "クライアント識別用のフィンガープリントハッシュ"
}
```

**成功時のレスポンス:**
```json
{
  "valid": true,
  "sessionId": "セッションID",
  "discordId": "DiscordユーザーID",
  "expiresAt": "JWTの有効期限"
}
```

**失敗時のレスポンス:**
```json
{
  "valid": false,
  "reason": "Token expired"
}
```

### ヘルスチェック

各サービスが正常に動作しているかを確認するためのエンドポイントです。

**認証サーバーのヘルスチェック:**
`GET /auth/health`

**アセットサーバーのヘルスチェック:**
`GET /health`

**レスポンスの例:**
```json
{
  "status": "ok",
  "service": "FRP Arctic Auth Server",
  "timestamp": "2025-12-02T10:00:00Z"
}
```

---

## 重要な注意点

1.  **CSRF対策:** 認証フローにおいて、`state`パラメータの一致を必ず検証してください。
2.  **フィンガープリントの一貫性:** JWTの取得時（`/auth/api/auth/token`）と検証時（`/api/frp/verify-jwt`）で、同じ`fingerprint`を使用する必要があります。
3.  **JWTの保管:** JWTは安全な場所に保管してください。ブラウザの`localStorage`や`sessionStorage`は避け、メモリ上に保持することを推奨します。
4.  **DiscordリダイレクトURI:** Discord Developer Portalに登録するリダイレクトURIは、実際に使用するものと完全に一致している必要があります。

---

## 参考: Auth.jsからの移行

このシステムはAuth.jsからArcticへ移行しました。以下は廃止された古いエンドポイントです。

- `GET /auth/signin` (→ `GET /auth/api/auth/url` に変更)
- `POST /api/exchange-code` (→ `POST /auth/api/auth/token` に変更)
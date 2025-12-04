# FRP認証システム - APIクイックリファレンス

**最終更新:** 2025-12-03  
より詳しい背景や設計は `API_DOCUMENTATION_JA.md` を参照してください。

---

## 1. 基本情報

- 入口 URL: `http://localhost:8080`
- すべて Nginx 経由。`nginx/nginx.conf` が `/api/auth/*` を `frp-authjs`、`/api/assets/*` を `asset-server` へ振り分け
- JWT・ポーリング認証: `backend/Docker/frp-authjs/src/routes/api.ts`
- FRP バイナリ API: `backend/Asset/routes/frp.ts`

---

## 2. 認証フロー要約

| ステップ | エンドポイント (HTTP) | 目的 |
| --- | --- | --- |
| 1 | `POST /api/auth/init` | Discord 認証用 URL と `tempToken` を取得 |
| 2 | ユーザーが `authUrl` を開く | Discord OAuth2 認証 (コールバック先: `/api/auth/callback`) |
| 3 | `GET /api/auth/poll?tempToken=` | 認証完了まで 1～2 秒間隔でポーリング |
| 4 | `GET /api/user/info` | JWT + Fingerprint でユーザー情報と許可ポートを取得 |
| 5 | `POST /api/auth/refresh` | アクセストークンをローテーション |
| 6 | `POST /api/verify-jwt` (`/api/frp/verify-jwt`) | frp-authz から JWT を検証 |

すべてのリクエストは JSON。本番では HTTPS + 固定指紋で保護してください。

---

## 3. エンドポイント一覧

### 3.1 frp-authjs

| メソッド | パス | 説明 |
| --- | --- | --- |
| POST | `/api/auth/init` | `fingerprint` を受け取り `tempToken` と Discord 認証 URL を返す |
| GET | `/api/auth/poll?tempToken=` | `pending` / `completed` / `expired` の状態を返答 |
| GET | `/api/auth/callback` | Discord からのリダイレクトを処理し HTML を表示 |
| POST | `/api/auth/refresh` | `refreshToken` と `fingerprint` でアクセストークンを再発行 |
| GET | `/api/user/info` | `Authorization: Bearer <jwt>` と `X-Fingerprint` を用いて利用可能ポートを含むユーザー情報を取得 |
| POST | `/api/verify-jwt` | frp-authz から呼ばれる JWT 検証 API (`/api/frp/verify-jwt` でも到達) |
| GET | `/api/health` | サービスヘルス (pending auth 件数付き) |

### 3.2 asset-server (FRP バイナリ)

| メソッド | パス | 説明 |
| --- | --- | --- |
| GET | `/api/assets/frp/client-binary` | frpc バイナリのダウンロード URL とメタ情報 |
| GET | `/api/assets/frp/server-binary` | frps バイナリのダウンロード URL |
| GET | `/api/assets/frp/info` | バージョンと利用できるエンドポイントのサマリー |

### 3.3 frp-authz

| メソッド | パス | 説明 |
| --- | --- | --- |
| POST | `/webhook/handler` | frps HTTP Plugin からのイベント (Login/NewProxy/CloseProxy/Ping) |
| GET | `/internal/user/:discordId/info` | frp-authjs がユーザー情報に権限を合成するための内部 API |
| GET | `/health` | セッション件数付きのヘルス |

---

## 4. 代表的なリクエスト例

```bash
# 1. 認証を開始
curl -X POST http://localhost:8080/api/auth/init \
  -H "Content-Type: application/json" \
  -d '{"fingerprint":"demo-client"}'

# 2. 認証完了をポーリング
curl "http://localhost:8080/api/auth/poll?tempToken=PASTE_TEMP_TOKEN"

# 3. ユーザー情報 (JWT + 指紋)
curl http://localhost:8080/api/user/info \
  -H "Authorization: Bearer PASTE_JWT" \
  -H "X-Fingerprint: demo-client"
```

---

## 5. 注意事項

- `/api/frp/verify-jwt` は nginx で `/api/verify-jwt` に書き換えてから frp-authjs へ渡されます。
- FRP バイナリの差し替えは `.env` の `FRP_BINARY_RELEASE_URL`/`FRP_VERSION` を編集し、`docker-compose restart asset-server` を行ってください。
- frp-authz は `FRP_DASHBOARD_URL` を元に Dashboard API と同期し、ゴーストセッションを削除します。Dashboard 認証情報が一致していないと同期が失敗しログに `⚠️ Failed to sync with FRP server` が出ます。

このファイルは「どの API を使えばよいか」を素早く確認する用途を想定しています。詳細なペイロードや設計判断は `API_DOCUMENTATION_JA.md` を参照してください。

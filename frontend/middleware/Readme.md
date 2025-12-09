# Frontend Middleware パッケージ

ミドルウェア層は、バックエンド資産配布サーバーとブラウザ UI の間で認証・プロキシ・管理 API を提供します。実体は `main/` ディレクトリの Express + TypeScript 実装です。

## 構成
```
frontend/middleware/
├── main/        # 本体サーバー（Front Driver）
├── Readme.md    # このファイル
└── Readme.old   # ※存在する場合は旧版
```

## クイックスタート
1. `cd frontend/middleware/main`
2. `npm install`
3. `.env` を作成（`BACKEND_API_URL` と `SESSION_SECRET` を設定）
4. `npm run dev` で 12800 番ポートにサーバーを起動

詳細なエンドポイントや環境変数は `main/README.md` を参照してください。

# Front Driver - Session Management

express-sessionを使用したセキュアなセッション管理システムです。

## 🔐 セキュリティ機能

### 実装済みセキュリティ対策

- **express-session**: 堅牢なセッション管理
- **HTTPOnly Cookie**: XSS攻撃を防ぐCookie設定
- **SameSite設定**: CSRF攻撃を防ぐ（開発環境: `lax`）
- **セッション有効期限**: 24時間の自動タイムアウト
- **セキュリティヘッダー**: 基本的なセキュリティヘッダーを設定
- **入力検証**: 適切なバリデーション処理

### 本番環境用設定（コメント記載）

以下の設定は現在コメントアウトされていますが、本番環境では有効にしてください：

```typescript
// 本番環境用設定
store: new MongoStore({
    mongoUrl: process.env.MONGODB_URI,
    touchAfter: 24 * 3600
}),
cookie: {
    secure: true,        // HTTPS必須
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'strict'   // より厳格なCSRF保護
}
```

## 🚀 使用方法

### 1. 依存関係のインストール

```bash
npm install
```

### 2. TypeScriptのコンパイル

```bash
npm run build
```

### 3. サーバー起動

```bash
npm run dev
```

または

```bash
npm start
```

### 4. アクセス

ブラウザで `http://localhost:12800` にアクセス

## 📁 ファイル構造

```
frontend/middleware/driver/
├── index.ts          # メインサーバーファイル
├── package.json      # 依存関係とスクリプト
├── tsconfig.json     # TypeScript設定
├── web/             # 静的ファイル
│   ├── index.html   # ログインページ
│   └── demo.html    # 認証必須デモページ
└── devsecret/       # 開発用データ（自動生成）
    └── users.json   # 許可されたユーザーリスト
```

## 🔧 API エンドポイント

### 認証系

- `POST /user/login` - ログイン処理
- `GET /user/auth` - セッション状態確認  
- `POST /user/logout` - ログアウト処理

### ページ系

- `GET /` - ログインページ
- `GET /demo` - 認証必須デモページ（認証ミドルウェア使用）
- `GET /api/protected` - 認証必須APIの例

## 💡 主な改善点

### 従来の実装との比較

| 項目 | 従来（独自実装） | 新実装（express-session） |
|------|-----------------|---------------------------|
| セッション管理 | JSON ファイル | メモリ（本番はMongoDB） |
| セキュリティ | 基本的 | HTTPOnly, SameSite, CSRF保護 |
| セッションID | 手動生成 | express-sessionが自動管理 |
| Cookie管理 | LocalStorage | HTTPOnly Cookie |
| 有効期限 | 手動管理 | 自動管理（24時間） |
| エラーハンドリング | 基本的 | 包括的なエラーハンドリング |

### セキュリティの向上

1. **XSS攻撃対策**: HTTPOnly Cookieでクライアントサイドからのアクセスを防止
2. **CSRF攻撃対策**: SameSite設定で外部サイトからのリクエストを制限
3. **セッション固定攻撃対策**: express-sessionの自動セッション再生成
4. **セッションハイジャック対策**: セキュアなセッション管理

## 🔬 テスト方法

### 1. 基本動作テスト

1. ログインページでDevice IDが自動生成されることを確認
2. ログインボタンクリックで認証処理が行われることを確認
3. 認証成功後にデモページへリダイレクトされることを確認

### 2. セッション管理テスト

1. ログアウト後にセッションが無効になることを確認
2. ブラウザ再起動後もセッションが維持されることを確認（有効期限内）
3. 直接`/demo`にアクセスして認証チェックが機能することを確認

### 3. セキュリティテスト

1. 開発者ツールでCookieがHTTPOnlyに設定されていることを確認
2. JavaScriptからセッション情報にアクセスできないことを確認
3. 保護されたAPIが認証なしでアクセスできないことを確認

## 🌟 今後の拡張予定

- [ ] MongoDB セッションストアの実装
- [ ] レート制限の実装
- [ ] 2要素認証の対応
- [ ] セッション分析・監視機能
- [ ] ロードバランサー対応

## ⚠️ 注意事項

- 現在は**開発環境用**の設定です
- 本番環境では必ず以下を実施してください：
  - HTTPS の使用
  - セッションストアをMongoDBに変更
  - セキュリティヘッダーの強化
  - 環境変数での設定管理
  - ログ・監視システムの導入
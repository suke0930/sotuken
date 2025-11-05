# WebSocket認証の実装

## 概要

このドキュメントでは、Front Driver ミドルウェアにおけるWebSocket接続の認証メカニズムについて説明します。

## 認証フロー

```
1. クライアント側
   ├─ ログイン (POST /user/login)
   ├─ セッションCookie取得
   └─ WebSocket接続要求 (ws://...)
        └─ Cookie自動送信

2. サーバー側
   ├─ WebSocketアップグレードリクエスト受信
   ├─ Cookie Parser でCookie解析
   ├─ Session Middleware でセッション復元
   ├─ 認証チェック (checkWebSocketAuth)
   │   ├─ ✅ 認証成功 → 接続確立
   │   └─ ❌ 認証失敗 → エラーメッセージ送信 → 切断
   └─ ユーザー識別完了
```

## 主要コンポーネント

### 1. MiddlewareManager (`lib/middleware-manager.ts`)

**役割**: セッションとCookieの管理、認証チェック

**重要な設定**:
```typescript
// Cookie Parser の設定（セッションの前に実行）
this.app.use(cookieParser(SESSION_SECRET));

// セッションミドルウェア
this.sessionMiddleware = session({
  name: 'frontdriver-session',
  secret: SESSION_SECRET,
  cookie: {
    httpOnly: true,      // XSS対策
    sameSite: 'lax',     // CSRF対策
    maxAge: 24 * 60 * 60 * 1000  // 24時間
  }
});
```

**認証チェックメソッド**:
```typescript
public checkWebSocketAuth(req: express.Request): {
  authenticated: boolean;
  userId?: string
} {
  if (req.session?.userId) {
    return { authenticated: true, userId: req.session.userId };
  }
  return { authenticated: false };
}
```

### 2. WebSocketManager (`lib/Asset_handler/src/lib/WebSocketManager.ts`)

**役割**: WebSocket接続の確立と管理

**認証処理**:
```typescript
private setupWebSocketRoute(): void {
  this.expressWsInstance.app.ws(this.basepath, (ws, req) => {
    // 1. セッションミドルウェアを明示的に実行
    this.middlewareManager.sessionMiddleware(req, {} as any, (err) => {
      if (err) {
        this.sendErrorAndClose(ws, 1011, 'Session processing failed',
          'セッション処理中にエラーが発生しました');
        return;
      }

      // 2. 認証チェック
      const authResult = this.middlewareManager.checkWebSocketAuth(req);

      if (!authResult.authenticated) {
        this.sendErrorAndClose(ws, 1008, 'Authentication failed',
          '認証に失敗しました。ログインしてください。');
        return;
      }

      // 3. 接続確立
      this.handleConnection(ws, authResult.userId!);
    });
  });
}
```

### 3. 初期化順序 (`index.ts`)

**重要**: 正しい初期化順序が必要です

```typescript
async function main(port: number) {
  // 1. Expressアプリ作成
  const app = express();

  // 2. express-ws初期化（ミドルウェア設定の前）
  const wsInstance = expressWs(app);

  // 3. ミドルウェア設定（Cookie Parser + Session）
  const middlewareManager = new MiddlewareManager(app);
  middlewareManager.configure();

  // 4. WebSocketマネージャー初期化
  new DownloadManager(middlewareManager, wsInstance, ...);
}
```

**なぜこの順序が重要か**:
- `express-ws`はExpressアプリをラップするため、ミドルウェア設定前に初期化
- Cookie ParserとSessionは、WebSocket接続時にも実行される必要がある

## セキュリティ考慮事項

### 1. セッションID の保護

- ログにセッションIDを出力しない
- Cookie情報をログに記録しない
- 認証成功/失敗の結果のみをログに記録

### 2. Cookie 設定

```typescript
cookie: {
  httpOnly: true,    // JavaScriptからアクセス不可（XSS対策）
  secure: false,     // 開発環境用。本番ではtrue推奨（HTTPS必須）
  sameSite: 'lax'    // CSRF攻撃対策
}
```

### 3. 認証失敗時の処理

- エラーメッセージをクライアントに送信
- 適切なクローズコード使用:
  - `1008`: 認証失敗
  - `1011`: サーバー内部エラー
- 再接続を防ぐため、クライアント側で処理

## クライアント側の実装 (`web/dldemo.js`)

```javascript
ws.onclose = (event) => {
  console.log('Close code:', event.code, 'Reason:', event.reason);

  // 認証エラーの場合
  if (event.code === 1008) {
    alert('WebSocket接続の認証に失敗しました。ログインしてください。');
    return; // 再接続しない
  }

  // セッションエラーの場合
  if (event.code === 1011) {
    alert('セッション処理中にエラーが発生しました。');
    return; // 再接続しない
  }

  // その他の場合は再接続
  setTimeout(connectWebSocket, 3000);
};
```

## トラブルシューティング

### 問題: WebSocket接続時に認証が失敗する

**症状**:
```
❌ WebSocket authentication failed - No valid session
```

**原因と対策**:

1. **Cookieが送信されていない**
   - ブラウザの開発者ツールでCookieを確認
   - `frontdriver-session` Cookieが存在するか
   - 解決策: ログインが正しく完了しているか確認

2. **cookie-parser が設定されていない**
   - `middleware-manager.ts`で`cookieParser()`が設定されているか確認
   - 解決策: `npm install cookie-parser`を実行

3. **express-wsの初期化タイミングが間違っている**
   - `express-ws`がミドルウェア設定後に初期化されている
   - 解決策: `index.ts`で初期化順序を確認

4. **セッションが期限切れ**
   - セッションの有効期限は24時間
   - 解決策: 再ログイン

### 問題: ログイン後もWebSocketが接続できない

**確認項目**:

1. ブラウザコンソールでCookieを確認:
```javascript
console.log(document.cookie);
// 出力: frontdriver-session=... (存在するはず)
```

2. サーバーログを確認:
```
🔌 WebSocket connection attempt from: http://...
✅ WebSocket authentication successful for user: root
```

3. ブラウザのCookie設定:
   - サードパーティCookieがブロックされていないか
   - 同一オリジンであることを確認

### 問題: WebSocketが頻繁に切断される

**原因**:
- ネットワークの問題
- サーバーの再起動
- セッションの期限切れ

**対策**:
- Ping/Pongメカニズムは実装済み
- 自動再接続も実装済み
- セッション有効期限を確認

## 実装の変更履歴

### 2025-11-06: WebSocket認証の実装

1. **Cookie Parser の追加**
   - `cookie-parser`パッケージをインストール
   - セッションミドルウェアの前に設定

2. **express-ws 初期化タイミングの変更**
   - ミドルウェア設定前に初期化
   - `DownloadManager`に`wsInstance`を渡す方式に変更

3. **セッションミドルウェアの明示的実行**
   - WebSocket接続時にセッションミドルウェアを手動実行
   - `WebSocketManager.setupWebSocketRoute()`で実装

4. **エラーハンドリングの改善**
   - 認証失敗時にクライアントへメッセージ送信
   - 適切なクローズコードの使用
   - クライアント側での処理分岐

5. **セキュリティ強化**
   - セッションIDをログから削除
   - Cookie情報をログから削除
   - 認証結果のみを記録

## 参考資料

- [express-session公式ドキュメント](https://github.com/expressjs/session)
- [cookie-parser公式ドキュメント](https://github.com/expressjs/cookie-parser)
- [express-ws公式ドキュメント](https://github.com/HenningM/express-ws)
- [WebSocket RFC 6455](https://tools.ietf.org/html/rfc6455)
- [WebSocket Close Codes](https://www.rfc-editor.org/rfc/rfc6455#section-7.4)

## まとめ

このWebSocket認証実装により:

✅ HTTPセッションとWebSocketで統一された認証メカニズム
✅ セキュアなCookie管理（HttpOnly, SameSite）
✅ 適切なエラーハンドリングとユーザーフィードバック
✅ 自動再接続と認証失敗時の処理分岐
✅ セキュリティを考慮したログ出力

を実現しています。

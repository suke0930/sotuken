# FRP Authentication System - Critical Issues Analysis

**日付:** 2025-12-03
**対象バージョン:** v3.1.0
**分析対象:** backend/Docker (FRP認証システム)

---

## 🚨 発見されたクリティカルな問題

### 1. **セッション同期の不整合 (CRITICAL)**

**問題の詳細:**
- `frp-authjs`と`frp-authz`の間でセッション情報が同期されていない
- `frp-authz`の`ActiveSession`は`clientFingerprint`フィールドを持つが、`internal.ts:40`で`session.fingerprint`として参照している
- この型の不一致により、`undefined.substring()`が実行され、500エラーが発生

**影響:**
- `/api/user/info`エンドポイントが常に500エラーを返す
- ユーザーは自分の権限情報を取得できない
- セッション情報の表示が不可能

**根本原因:**
```typescript
// frp-authz/src/types/frp.ts:34-40
export interface ActiveSession {
  sessionId: string;
  discordId: string;
  remotePort: number;
  connectedAt: Date;
  clientFingerprint: string;  // ← フィールド名が clientFingerprint
}

// frp-authz/src/routes/internal.ts:40
fingerprint: session.fingerprint.substring(0, 8),  // ← fingerprint として参照
```

**再現手順:**
1. FRPクライアントがポート25565で接続成功
2. `sessionTracker.addSession()`でセッションが追加される
3. `/api/user/info`を呼び出す
4. `internal.ts:40`で`session.fingerprint`が`undefined`となりクラッシュ

---

### 2. **コンテナ再起動時のメモリ喪失 (CRITICAL)**

**問題の詳細:**
- `frp-authz`のセッション情報はメモリ上のみに保持される
- コンテナ再起動時にすべてのアクティブセッションが消失
- `frp-authjs`はファイル永続化されているが、`frp-authz`は永続化されていない

**影響:**
- `docker-compose restart`時に全セッション情報が失われる
- ユーザーがFRP接続中でも、再起動後は認証情報が消える
- セッション数カウントが不正確になり、`maxSessions`制限が機能しない

**証拠:**
```bash
# frp-authz ログ
Session added: a16e3b71... (Discord ID: 463985851127562250, Port: 25565)
Total active sessions: 1

# コンテナ再起動後
UserManager initialized (1 users loaded)  # ← ユーザー情報は復元
# しかしセッション情報は0から開始
```

**データ永続化の現状:**
- ✅ `frp-authjs/data/sessions.json` - 永続化済み (JWT sessions)
- ✅ `frp-authz/data/users.json` - 永続化済み (user permissions)
- ❌ `frp-authz` ActiveSessions - メモリのみ、永続化なし

---

### 3. **ユーザー権限参照の失敗 (CRITICAL)**

**問題の詳細:**
- Postmanレスポンスで`permissions: { allowedPorts: [], maxSessions: 0 }`となっている
- `users.json`には正しく`allowedPorts: [25565, 22, 3000, 8080]`が設定されている
- `frp-authz`内部APIは正常に動作するはずだが、`frp-authjs`からの呼び出しが500エラーで失敗

**影響:**
- ユーザーは自分の許可されたポートを確認できない
- フロントエンドで権限に基づくUI表示ができない
- セッション数制限の情報が取得できない

**エラーチェーン:**
1. `frp-authjs` → `GET /internal/user/:discordId/info`を呼び出し
2. `frp-authz` → `internal.ts:40`で`session.fingerprint`が`undefined`
3. `TypeError: Cannot read properties of undefined`
4. `frp-authjs` → 500エラーをキャッチし、空の権限を返す

---

### 4. **Nginx ルーティングの不整合 (MEDIUM)**

**問題の詳細:**
- `/api/user/info`は`frp-authjs`のエンドポイントだが、nginxで`/api/`は`asset-server`にルーティングされる
- 正しいパスは`/auth/api/user/info`または`/api/frp/user/info`

**影響:**
- ドキュメント通りのパスでAPIを呼び出せない
- 開発者が混乱する

**nginx.conf の現状:**
```nginx
location /api/ {
    proxy_pass http://asset_server;  # ← asset-serverへ
}

location /auth/ {
    proxy_pass http://frp_authjs/;   # ← frp-authjsへ
}

location /api/frp/ {
    proxy_pass http://frp_authjs/api/;  # ← frp-authjsへ (rewrite)
}
```

---

### 5. **セッション削除の不完全な実装 (MEDIUM)**

**問題の詳細:**
- `CloseProxy`イベント時、sessionIdで削除しようとするが、フォールバック処理が未実装
- token/fingerprintがない場合、セッションが残留する可能性

**該当コード:**
```typescript
// frp-authz/src/routes/webhook.ts:179-204
async function handleCloseProxy(webhookReq, res) {
  if (token && fingerprint) {
    // sessionIdで削除
  } else if (remotePort) {
    console.log(`CloseProxy: Attempting to find session by port ${remotePort}`);
    // ← 未実装！
  }
}
```

**影響:**
- セッションがメモリに残留し、カウントが不正確になる
- `maxSessions`制限が正しく機能しない可能性

---

### 6. **FRP Webhook Request フィールドの不一致 (LOW-MEDIUM)**

**問題の詳細:**
- `Login`イベント: `webhookReq.content.metas`からtoken/fingerprintを取得
- `NewProxy/CloseProxy`イベント: `webhookReq.content.user.metas`から取得
- FRPサーバーがどちらの形式で送ってくるかドキュメント化されていない

**該当コード:**
```typescript
// Login
const token = webhookReq.content.metas?.token;

// NewProxy
const token = webhookReq.content.user?.metas?.token;
```

**影響:**
- FRPサーバーのバージョンや設定によって動作が変わる可能性
- デバッグが困難

---

## 🔍 その他の潜在的な問題

### 7. **Fingerprint検証の欠如 (SECURITY)**

**問題の詳細:**
- Webhookハンドラーで受け取ったfingerprintがクライアント提供のまま信頼されている
- 中間者攻撃やトークン窃取のリスク

**推奨:**
- FRPサーバーからのリクエストに署名を追加
- Fingerprintの整合性検証を強化

---

### 8. **エラーハンドリングの不足 (RELIABILITY)**

**問題の詳細:**
- `frp-authjs`から`frp-authz`への内部API呼び出しが失敗した場合、空の権限を返すのみ
- ユーザーに適切なエラーメッセージが表示されない

**該当コード:**
```typescript
// frp-authjs/src/routes/api.ts:316-319
catch (error: any) {
  console.error("Failed to fetch user info from frp-authz:", error.message);
  // Continue with empty permissions/sessions ← ユーザーには通知されない
}
```

---

### 9. **セッション期限切れの伝播なし (CONSISTENCY)**

**問題の詳細:**
- `frp-authjs`のセッションが期限切れになっても、`frp-authz`のActiveSessionsは削除されない
- 逆も同様

**影響:**
- セッション状態の不整合
- メモリリークの可能性

---

### 10. **`users.json`の自動リロード遅延 (USABILITY)**

**問題の詳細:**
- `users.json`の変更検知が60秒間隔
- 権限変更が即座に反映されない

**該当コード:**
```typescript
// frp-authz/src/services/userManager.ts:24-26
setInterval(() => {
  this.reloadIfChanged();
}, 60 * 1000); // Every 60 seconds
```

**推奨:**
- `fs.watch()`を使ったリアルタイム監視
- または管理APIでの手動リロード機能

---

## 📋 修正の優先順位

### Priority 1: CRITICAL (即座に修正が必要)

1. **セッション型の不一致修正**
   - `internal.ts:40`: `session.fingerprint` → `session.clientFingerprint`
   - または`ActiveSession`インターフェースを`fingerprint`に統一

2. **ActiveSession永続化の実装**
   - `frp-authz/data/active_sessions.json`への保存機能追加
   - コンテナ再起動時の復元機能

3. **ユーザー権限取得の修正**
   - 上記1の修正により自動的に解決

### Priority 2: HIGH (早急に対応すべき)

4. **CloseProxyのフォールバック実装**
   - ポート番号からのセッション検索と削除

5. **Nginx ルーティングの整理**
   - ドキュメントとの整合性確保
   - `/api/auth/*`を`frp-authjs`にルーティング

### Priority 3: MEDIUM (計画的に対応)

6. **セッション同期メカニズム**
   - 両サービス間でのセッション状態の定期同期
   - または統一されたセッションストアの導入

7. **エラーハンドリングの改善**
   - 内部API呼び出し失敗時の適切なエラーレスポンス

### Priority 4: LOW (将来的な改善)

8. **Fingerprint検証の強化**
9. **users.jsonのリアルタイム監視**
10. **監視・ログ機能の強化**

---

## 🛠️ 推奨される修正アプローチ

### Approach 1: ミニマルフィックス (短期)

1. `internal.ts:40`の1行修正
2. `ActiveSession`永続化の追加
3. nginx設定の調整

**メリット:** 即座に実装可能、リスク最小
**デメリット:** 根本的な設計問題は残る

### Approach 2: セッション統合 (中期)

1. `frp-authjs`と`frp-authz`のセッションモデルを統一
2. 共有データストア(Redis等)の導入
3. セッション同期の自動化

**メリット:** スケーラブル、一貫性確保
**デメリット:** 実装コスト大、アーキテクチャ変更

### Approach 3: リアーキテクチャ (長期)

1. 認証・認可サービスの統合
2. マイクロサービス間通信の標準化
3. イベント駆動アーキテクチャへの移行

**メリット:** 保守性・拡張性向上
**デメリット:** 大規模な書き換えが必要

---

## 🎯 推奨される即座の対応

**最小限の修正で運用可能にする手順:**

1. **`internal.ts`の修正** (5分)
   ```typescript
   // Line 40を修正
   fingerprint: session.clientFingerprint?.substring(0, 8) || "unknown",
   ```

2. **`sessionTracker.ts`への永続化追加** (30分)
   - `sessions.json`への定期保存
   - 起動時の復元処理

3. **nginx設定の明確化** (10分)
   - `/api/auth/*`ルートの追加
   - ドキュメント更新

**これにより:**
- ✅ `/api/user/info`が正常動作
- ✅ コンテナ再起動に耐性
- ✅ 権限情報の正常取得

**所要時間:** 約1時間
**リスク:** 低
**効果:** クリティカルな問題すべてを解決

---

## 📝 テスト計画

### 修正後に実施すべきテスト

1. **セッション永続化テスト**
   - セッション作成 → コンテナ再起動 → セッション確認

2. **権限取得テスト**
   - `/api/user/info`の正常レスポンス確認
   - `allowedPorts`, `maxSessions`の正確性

3. **セッション上限テスト**
   - `maxSessions=3`の場合、4つ目の接続を拒否

4. **ポート権限テスト**
   - 許可されたポートで接続成功
   - 拒否されたポートで接続失敗

5. **CloseProxyテスト**
   - セッションの正常削除確認

---

## 🔗 関連ファイル

- [frp-authz/src/routes/internal.ts](./frp-authz/src/routes/internal.ts) - 型不一致の原因
- [frp-authz/src/services/sessionTracker.ts](./frp-authz/src/services/sessionTracker.ts) - 永続化が必要
- [frp-authz/src/types/frp.ts](./frp-authz/src/types/frp.ts) - ActiveSession定義
- [nginx/nginx.conf](./nginx/nginx.conf) - ルーティング設定
- [frp-authz/src/routes/webhook.ts](./frp-authz/src/routes/webhook.ts) - CloseProxy処理

---

**次のステップ:** このanalysisに基づき、具体的な修正実装を行う準備が整いました。

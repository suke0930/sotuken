# FRP認証システムのミドルウェア統合ガイド

## 概要

このドキュメントは、`backend/Docker`に実装されたFRP認証システムを、`frontend/middleware/main`のミドルウェアに統合する際の手順と実装方針を説明します。

## システム構成

### バックエンド (Docker)
- **Container 1 (frp-authjs)**: Discord OAuth2認証 + JWT発行/検証
- **Container 2 (frp-server)**: FRPサーバー（ポートフォワーディング）
- **Container 3 (frp-authz)**: ポート権限管理 + セッション管理

### フロントエンドミドルウェア
- `frontend/middleware/main/index.ts`: エントリーポイント
- `frontend/middleware/main/lib/api-router.ts`: ルーティング定義

---

## 統合アーキテクチャ

```
[User Browser] 
    ↓
[Frontend (React/Next.js)]
    ↓
[Frontend Middleware] ← 新規: FRP Manager Class
    ↓
[Nginx (Docker)]
    ├─ /api/        → asset-server
    ├─ /auth/       → frp-authjs (Discord OAuth2)
    └─ /api/frp/    → frp-authjs (JWT API)
    
[frp-authjs] ←→ [frp-authz] ←→ [frp-server]
```

---

## 実装タスク

### Phase 1: FRP Manager クラスの作成

既存の `MinecraftServerManager` や `JDKManagerAPP` のパターンに従って、FRP接続管理クラスを実装します。

#### ファイル構造
```
frontend/middleware/main/lib/
├── frp-manager/
│   ├── src/
│   │   ├── Main.ts              # FrpManagerAPP (メインクラス)
│   │   ├── FrpClient.ts         # FRP Client管理
│   │   ├── AuthService.ts       # Discord OAuth2 & JWT管理
│   │   └── types.ts             # 型定義
│   └── README.md
```

#### FrpManagerAPP クラスの設計

```typescript
// frontend/middleware/main/lib/frp-manager/src/Main.ts

import { EventEmitter } from 'events';

export interface FrpConnection {
  id: string;
  discordUserId: string;
  localPort: number;
  remotePort: number;
  status: 'connecting' | 'connected' | 'disconnected';
  createdAt: Date;
}

export interface FrpAuthTokens {
  jwt: string;
  expiresAt: string;
  discordUser: {
    id: string;
    username: string;
    avatar: string;
  };
}

export class FrpManagerAPP extends EventEmitter {
  private connections: Map<string, FrpConnection> = new Map();
  private authTokens: Map<string, FrpAuthTokens> = new Map();
  private authServerUrl: string;
  private frpServerAddr: string;
  private frpServerPort: number;

  constructor(
    authServerUrl: string = 'http://localhost:8080',
    frpServerAddr: string = 'localhost',
    frpServerPort: number = 7000
  ) {
    super();
    this.authServerUrl = authServerUrl;
    this.frpServerAddr = frpServerAddr;
    this.frpServerPort = frpServerPort;
  }

  /**
   * Discord OAuth2認証フローを開始
   */
  async startDiscordAuth(): Promise<string> {
    // Discord OAuth2認証URLを返す
    return `${this.authServerUrl}/auth/signin`;
  }

  /**
   * Authorization Codeを交換してJWTを取得
   */
  async exchangeCodeForJwt(
    code: string,
    redirectUri: string,
    fingerprint: string
  ): Promise<FrpAuthTokens> {
    const response = await fetch(`${this.authServerUrl}/api/frp/exchange-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirectUri, fingerprint }),
    });

    if (!response.ok) {
      throw new Error('Failed to exchange code for JWT');
    }

    const tokens: FrpAuthTokens = await response.json();
    this.authTokens.set(tokens.discordUser.id, tokens);
    return tokens;
  }

  /**
   * FRP接続を開始
   */
  async createConnection(
    discordUserId: string,
    localPort: number,
    remotePort: number
  ): Promise<FrpConnection> {
    const tokens = this.authTokens.get(discordUserId);
    if (!tokens) {
      throw new Error('User not authenticated');
    }

    // frpc設定生成
    const config = this.generateFrpcConfig(
      tokens.jwt,
      localPort,
      remotePort
    );

    // frpcプロセスを起動（child_process）
    const connection: FrpConnection = {
      id: `frp-${Date.now()}`,
      discordUserId,
      localPort,
      remotePort,
      status: 'connecting',
      createdAt: new Date(),
    };

    this.connections.set(connection.id, connection);
    this.emit('connection:created', connection);

    return connection;
  }

  /**
   * FRP接続を停止
   */
  async closeConnection(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error('Connection not found');
    }

    // frpcプロセスを停止
    connection.status = 'disconnected';
    this.connections.delete(connectionId);
    this.emit('connection:closed', connection);
  }

  /**
   * frpc設定ファイルを生成
   */
  private generateFrpcConfig(
    jwt: string,
    localPort: number,
    remotePort: number
  ): string {
    return `
serverAddr = "${this.frpServerAddr}"
serverPort = ${this.frpServerPort}

auth.method = "token"
auth.token = "${jwt}"

[[proxies]]
name = "port-${remotePort}"
type = "tcp"
localIP = "127.0.0.1"
localPort = ${localPort}
remotePort = ${remotePort}

[proxies.metadatas]
token = "${jwt}"
    `.trim();
  }

  /**
   * アクティブな接続一覧を取得
   */
  getActiveConnections(): FrpConnection[] {
    return Array.from(this.connections.values());
  }
}
```

---

### Phase 2: API ルーターの追加

`frontend/middleware/main/lib/api-router.ts` に新しいルーターを追加します。

```typescript
// frontend/middleware/main/lib/api-router.ts に追加

import { FrpManagerAPP } from './frp-manager/src/Main';

export class FrpManagerRoute {
  public router: express.Router;
  private frpManager: FrpManagerAPP;

  constructor(
    authMiddleware: express.RequestHandler,
    frpManager: FrpManagerAPP
  ) {
    this.router = express.Router();
    this.frpManager = frpManager;
    this.setupRoutes(authMiddleware);
  }

  private setupRoutes(authMiddleware: express.RequestHandler): void {
    // Discord認証URL取得
    this.router.get('/auth/url', authMiddleware, async (req, res) => {
      try {
        const authUrl = await this.frpManager.startDiscordAuth();
        res.json({ authUrl });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Authorization Code交換
    this.router.post('/auth/exchange', authMiddleware, async (req, res) => {
      try {
        const { code, redirectUri, fingerprint } = req.body;
        const tokens = await this.frpManager.exchangeCodeForJwt(
          code,
          redirectUri,
          fingerprint
        );
        res.json(tokens);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // FRP接続作成
    this.router.post('/connections', authMiddleware, async (req, res) => {
      try {
        const { discordUserId, localPort, remotePort } = req.body;
        const connection = await this.frpManager.createConnection(
          discordUserId,
          localPort,
          remotePort
        );
        res.json(connection);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // FRP接続停止
    this.router.delete('/connections/:id', authMiddleware, async (req, res) => {
      try {
        await this.frpManager.closeConnection(req.params.id);
        res.json({ success: true });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // アクティブ接続一覧
    this.router.get('/connections', authMiddleware, async (req, res) => {
      try {
        const connections = this.frpManager.getActiveConnections();
        res.json(connections);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });
  }
}
```

---

### Phase 3: index.ts への統合

`frontend/middleware/main/index.ts` に以下を追加します。

```typescript
// frontend/middleware/main/index.ts の main() 関数内に追加

// 既存のインポート
import { FrpManagerAPP } from './lib/frp-manager/src/Main';
import { FrpManagerRoute } from './lib/api-router';

// main() 関数内 (JDKmanagerの後)

// 11. FRP Manager のセットアップ
const frpManager = new FrpManagerAPP(
    'http://localhost:8080', // Nginx経由でfrp-authjsにアクセス
    'localhost',             // FRP Server Address
    7000                     // FRP Server Port
);

const frpRouter = new FrpManagerRoute(middlewareManager.authMiddleware, frpManager);
app.use('/api/frp', frpRouter.router);

log.info('FRP Manager initialized');
```

---

## 環境変数設定

`frontend/middleware/main` に `.env` ファイルを追加または更新します。

```env
# FRP Manager Configuration
FRP_AUTH_SERVER_URL=http://localhost:8080
FRP_SERVER_ADDR=localhost
FRP_SERVER_PORT=7000
```

---

## クライアント側 (フロントエンド) の実装例

React/Next.jsでの使用例:

```typescript
// フロントエンドコンポーネント例

async function authenticateWithDiscord() {
  // 1. 認証URL取得
  const response = await fetch('/api/frp/auth/url');
  const { authUrl } = await response.json();
  
  // 2. Discord認証ページへリダイレクト
  window.location.href = authUrl;
}

// OAuth2コールバック後の処理
async function handleOAuthCallback(code: string) {
  // 3. Authorization Code交換
  const fingerprint = generateClientFingerprint(); // クライアントフィンgerprint生成
  
  const response = await fetch('/api/frp/auth/exchange', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      redirectUri: window.location.origin + '/callback',
      fingerprint,
    }),
  });
  
  const tokens = await response.json();
  console.log('Authenticated:', tokens.discordUser);
}

// FRP接続作成
async function createFrpConnection(discordUserId: string, localPort: number, remotePort: number) {
  const response = await fetch('/api/frp/connections', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ discordUserId, localPort, remotePort }),
  });
  
  const connection = await response.json();
  console.log('FRP Connection created:', connection);
}
```

---

## セキュリティ考慮事項

### クライアントFingerprint生成

```typescript
// frontend側でのFingerprint生成例

import crypto from 'crypto';

function generateClientFingerprint(): string {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    // ハードウェア情報なども追加可能
  ];
  
  const raw = components.join('|');
  return crypto.createHash('sha256').update(raw).digest('hex');
}
```

### JWT保存

- JWT はメモリ上に保持（LocalStorage/SessionStorageは使用しない）
- セキュアなHTTPSクッキーでの保存も検討
- 有効期限切れ時の自動再認証フロー実装

---

## テストシナリオ

### 1. 正常系: 認証からFRP接続まで

1. `/api/frp/auth/url` で認証URL取得
2. Discord OAuth2認証実施
3. `/api/frp/auth/exchange` でJWT取得
4. `/api/frp/connections` でFRP接続作成
5. 接続が成功することを確認

### 2. 異常系: 未認証状態での接続試行

1. JWT未取得状態で `/api/frp/connections` を呼び出し
2. 401 Unauthorized が返却されることを確認

### 3. 異常系: 未許可ポートへのアクセス

1. `users.json` で許可されていないポートで接続試行
2. frp-authz で拒否されることを確認

---

## 今後の拡張案

### フェーズ2の実装候補

1. **WebSocket統合**: リアルタイムでFRP接続状態を通知
2. **ポート管理UI**: ユーザーが使用可能なポート一覧を表示
3. **セッション管理UI**: アクティブなFRP接続をUIで管理
4. **ログ表示**: frpcのログをWebUIで表示
5. **自動再接続**: 接続切断時の自動リトライ機能

---

## 参考資料

- 設計書: `backend/設計書案2.md`
- 既存実装: `backend/FRP-test/`
- Discord OAuth2実装: `backend/DiscordLoginTest/`
- Docker構成: `backend/Docker/Docker-compose.yml`

---

## まとめ

このドキュメントに従って実装することで、既存の `minecraft-server-manager` や `jdk-manager` と同様のパターンでFRP認証システムをミドルウェアに統合できます。

**重要なポイント:**
- 既存のクラス設計パターンを踏襲する
- EventEmitterを活用して状態変化を通知
- 認証フローをユーザーに分かりやすく提示
- セキュリティベストプラクティスを遵守

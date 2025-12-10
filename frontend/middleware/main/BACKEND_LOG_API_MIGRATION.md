# バックエンドログAPI移行ガイド

## 概要

バックエンドにサーバーログ（stdout/stderr）の保持機能とAPI取得機能が実装されました。
これにより、フロントエンド側でログを蓄積する必要がなくなり、より効率的にログを管理できます。

## バックエンドの変更内容

### 1. ServerLogManager の追加

**場所**: `lib/minecraft-server-manager/src/classes/ServerLogManager.ts`

各サーバーのstdout/stderrを自動的に保存するクラスです。

**機能**:
- 各サーバーごとに最大1000行のログを保持
- FIFO方式で古いログを自動削除
- タイムスタンプ付きでログを保存

### 2. ServerManager の拡張

**自動ログ保存**:
- `openProcessStd()` メソッドが呼ばれると、自動的にログをServerLogManagerに保存
- ユーザー提供のコールバックとは独立して動作
- サーバーが起動している限りログを蓄積

**新しいメソッド**:
```typescript
// ログ取得（最大1000行）
getServerLogs(uuid: string, limit: number = 1000): LogEntry[]

// ログクリア
clearServerLogs(uuid: string): void

// ログ数取得
getServerLogCount(uuid: string): number
```

### 3. 新しいAPIエンドポイント

#### GET `/api/mc/logs/:id`

サーバーのログを取得します。

**リクエスト**:
```
GET /api/mc/logs/{server-uuid}?limit=1000
```

**クエリパラメータ**:
- `limit` (optional): 取得する最大ログ数（1-10000、デフォルト: 1000）

**レスポンス**:
```json
{
  "ok": true,
  "data": {
    "uuid": "server-uuid",
    "logs": [
      {
        "timestamp": "2025-11-10T12:34:56.789Z",
        "type": "stdout",
        "line": "[12:34:56] [Server thread/INFO]: Done (5.123s)!"
      },
      {
        "timestamp": "2025-11-10T12:34:57.123Z",
        "type": "stderr",
        "line": "[WARN] Something happened"
      }
    ],
    "totalLogCount": 523,
    "returnedLogCount": 523
  }
}
```

#### DELETE `/api/mc/logs/:id`

サーバーのログをクリアします。

**リクエスト**:
```
DELETE /api/mc/logs/{server-uuid}
```

**レスポンス**:
```json
{
  "ok": true,
  "message": "523件のログをクリアしました"
}
```

### 4. status フィールドの揮発性対応

**問題**: サーバー再起動時にstatusが'running'のまま保存されていた

**修正内容**:
- `loadAndValidateConfig()`: 起動時に全インスタンスのstatusを強制的に'stopped'に設定
- `saveConfig()`: 保存時にstatusを'stopped'に強制変換
- statusは揮発性データとして扱い、永続化しない

## フロントエンド側の必要な変更

### 1. ログ蓄積ロジックの削除

**現状**:
- `useConsole.js` などでWebSocket経由でログを受信し、フロントエンドで配列に蓄積
- ページリロードやタブ切り替えでログが失われる

**変更後**:
- ログ蓄積をバックエンドに任せる
- フロントエンドは表示のみを担当

### 2. ログ取得の実装

#### A. 初期ログ取得（コンソールを開いたとき）

```javascript
// useConsole.js または該当ファイル

async function loadServerLogs(serverUuid) {
  try {
    const response = await fetch(`/api/mc/logs/${serverUuid}?limit=1000`, {
      method: 'GET',
      credentials: 'include'
    });
    
    const result = await response.json();
    
    if (result.ok) {
      // 既存ログを表示
      this.logs = result.data.logs;
      console.log(`Loaded ${result.data.returnedLogCount} logs from server`);
    } else {
      console.error('Failed to load logs:', result.message);
    }
  } catch (error) {
    console.error('Error loading logs:', error);
  }
}
```

#### B. リアルタイムログ追加（WebSocket経由）

既存のWebSocket実装はそのまま使用できます：

```javascript
// WebSocketでリアルタイムログを受信
wsManager.on('server_stdout', (message) => {
  const logEntry = {
    timestamp: message.timestamp,
    type: 'stdout',
    line: message.data.line
  };
  
  // フロントエンドの表示用配列に追加
  this.logs.push(logEntry);
  
  // 自動スクロールなど
  this.scrollToBottom();
});

wsManager.on('server_stderr', (message) => {
  const logEntry = {
    timestamp: message.timestamp,
    type: 'stderr',
    line: message.data.line
  };
  
  this.logs.push(logEntry);
  this.scrollToBottom();
});
```

### 3. 推奨実装パターン

```javascript
// useConsole.js の修正例

export function createConsoleMethods() {
  return {
    // コンソールを開いたとき
    async openConsole(serverUuid) {
      // 1. WebSocketでsubscribe（リアルタイム更新用）
      await this.subscribeToServer(serverUuid);
      
      // 2. 既存ログを取得（初期表示用）
      await this.loadExistingLogs(serverUuid);
    },
    
    // 既存ログの取得
    async loadExistingLogs(serverUuid) {
      try {
        const response = await fetch(`/api/mc/logs/${serverUuid}?limit=1000`, {
          method: 'GET',
          credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.ok) {
          // 既存ログを表示
          this.logs = result.data.logs.map(log => ({
            ...log,
            // 表示用の追加処理
            formatted: this.formatLogLine(log)
          }));
        }
      } catch (error) {
        console.error('Failed to load logs:', error);
        this.showError('ログの読み込みに失敗しました');
      }
    },
    
    // WebSocketでリアルタイムログ追加
    handleRealtimeLog(type, line, timestamp) {
      const logEntry = {
        timestamp: timestamp || new Date().toISOString(),
        type: type,
        line: line,
        formatted: this.formatLogLine({ type, line })
      };
      
      this.logs.push(logEntry);
      
      // 最大表示数を制限（メモリ対策）
      if (this.logs.length > 1000) {
        this.logs.shift(); // 古いログを削除
      }
      
      this.scrollToBottom();
    },
    
    // ログクリア
    async clearLogs(serverUuid) {
      if (!confirm('ログをクリアしますか？')) return;
      
      try {
        const response = await fetch(`/api/mc/logs/${serverUuid}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.ok) {
          this.logs = [];
          this.showSuccess(result.message);
        } else {
          this.showError('ログのクリアに失敗しました');
        }
      } catch (error) {
        console.error('Failed to clear logs:', error);
        this.showError('ログのクリアに失敗しました');
      }
    }
  };
}
```

### 4. UIの変更

#### ログクリアボタンの追加

```html
<!-- templates.js のコンソール部分 -->
<div class="console-header">
  <h3>{{ currentServer.name }} - コンソール</h3>
  <div class="console-controls">
    <button @click="clearServerLogs(currentServer.uuid)" class="btn btn-sm btn-danger">
      <i class="fas fa-trash"></i> ログをクリア
    </button>
    <button @click="closeConsole" class="btn btn-sm">
      <i class="fas fa-times"></i> 閉じる
    </button>
  </div>
</div>
```

#### ログ数表示の追加

```html
<div class="console-info">
  <span>表示中: {{ logs.length }} 行</span>
  <span v-if="totalLogCount > logs.length">
    （サーバー上に {{ totalLogCount }} 行保存）
  </span>
</div>
```

### 5. エンドポイントの追加

`js/Endpoints.js` に新しいエンドポイントを追加：

```javascript
export const API_ENDPOINTS = {
  // 既存のエンドポイント...
  
  mc: {
    // 既存のMC関連エンドポイント...
    
    logs: {
      get: (uuid) => `/api/mc/logs/${uuid}`,
      clear: (uuid) => `/api/mc/logs/${uuid}`
    }
  }
};
```

## 移行の利点

1. **データの永続性**: ページリロードやタブ切り替えでもログが失われない
2. **メモリ効率**: フロントエンドでログを保持しないため、メモリ使用量が削減
3. **一貫性**: 複数のクライアントで同じログを共有可能
4. **スケーラビリティ**: サーバー側でログ管理が集中化

## 注意事項

1. **ログの最大保持数**: 各サーバー1000行まで（ServerLogManager設定）
2. **古いログの削除**: FIFO方式で自動的に削除される
3. **WebSocketは引き続き使用**: リアルタイム更新にはWebSocketを使用
4. **既存ログの取得**: コンソールを開いた時にHTTP APIで取得

## テスト手順

1. サーバーを起動してログを生成
2. コンソールを開いて既存ログが表示されることを確認
3. リアルタイムログがWebSocket経由で追加されることを確認
4. ページリロード後も同じログが表示されることを確認
5. ログクリア機能が正常に動作することを確認

## 問い合わせ

フロントエンド実装で不明な点があれば、バックエンドチームに確認してください。

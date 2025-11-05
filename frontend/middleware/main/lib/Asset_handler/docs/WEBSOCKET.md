# WebSocket Communication Specification

## 📡 WebSocket接続

### Endpoint
```
ws://localhost:4000
```

### 接続フロー

1. クライアントがWebSocket接続を開始
2. サーバーが接続を受け入れ
3. サーバーが`ping`メッセージを送信（接続確認）
4. クライアントが`pong`で応答（Keep-alive）

## 📨 Message Format

すべてのメッセージは以下のJSON形式：

```typescript
interface WSMessage {
  type: WSMessageType;
  data?: any;
  timestamp: string; // ISO 8601 format
}

type WSMessageType = 
  | 'download_progress'
  | 'download_complete'
  | 'download_error'
  | 'ping'
  | 'pong';
```

## 📤 Server → Client Messages

### 1. Ping (Keep-alive)

サーバーから定期的に送信される接続確認メッセージ

```json
{
  "type": "ping",
  "data": {
    "message": "Connected to download server"
  },
  "timestamp": "2025-10-20T12:00:00.000Z"
}
```

### 2. Download Progress

ダウンロード進捗情報（0.5秒ごとに更新）

```json
{
  "type": "download_progress",
  "data": {
    "taskId": "task-1729425600000-abc123",
    "totalBytes": 104857600,
    "downloadedBytes": 52428800,
    "percentage": 50.0,
    "speed": 1048576,
    "remainingTime": 50,
    "status": "downloading",
    "filename": "server.jar"
  },
  "timestamp": "2025-10-20T12:00:05.000Z"
}
```

#### Progress Data Fields

| Field | Type | Description |
|-------|------|-------------|
| `taskId` | string | ダウンロードタスクの一意ID |
| `totalBytes` | number | 総ファイルサイズ（バイト） |
| `downloadedBytes` | number | ダウンロード済みサイズ（バイト） |
| `percentage` | number | 進捗率（0-100） |
| `speed` | number | ダウンロード速度（バイト/秒） |
| `remainingTime` | number | 残り時間（秒） |
| `status` | string | ステータス（後述） |
| `filename` | string | ファイル名 |
| `error` | string? | エラーメッセージ（エラー時のみ） |

#### Status Values

- `waiting` - ダウンロード待機中
- `downloading` - ダウンロード中
- `completed` - ダウンロード完了
- `error` - エラー発生
- `cancelled` - キャンセル済み

### 3. Download Complete

ダウンロード完了通知

```json
{
  "type": "download_complete",
  "data": {
    "taskId": "task-1729425600000-abc123",
    "filename": "server.jar"
  },
  "timestamp": "2025-10-20T12:01:00.000Z"
}
```

### 4. Download Error

ダウンロードエラー通知

```json
{
  "type": "download_error",
  "data": {
    "taskId": "task-1729425600000-abc123",
    "error": "Network error: Connection timeout"
  },
  "timestamp": "2025-10-20T12:00:30.000Z"
}
```

## 📥 Client → Server Messages

### 1. Pong (Keep-alive Response)

サーバーの`ping`に対する応答

```json
{
  "type": "pong",
  "timestamp": "2025-10-20T12:00:00.100Z"
}
```

## 🔄 Connection Lifecycle

### 接続確立

```
Client                           Server
  │                                │
  │────── WebSocket Connect ──────▶│
  │                                │
  │◀────────── ping ───────────────│
  │                                │
  │────────── pong ────────────────▶│
  │                                │
  │      (Connection Established)  │
```

### ダウンロードセッション

```
Client                           Server
  │                                │
  │◀──── download_progress ────────│ (50.5%)
  │                                │
  │◀──── download_progress ────────│ (51.2%)
  │                                │
  │◀──── download_progress ────────│ (98.7%)
  │                                │
  │◀──── download_complete ────────│
  │                                │
```

### エラーハンドリング

```
Client                           Server
  │                                │
  │◀──── download_progress ────────│ (25.0%)
  │                                │
  │          (Network Error)       │
  │                                │
  │◀──── download_error ───────────│
  │                                │
```

### 接続クローズ

```
Client                           Server
  │                                │
  │────── WebSocket Close ─────────▶│
  │                                │
  │◀───────── Close ACK ───────────│
  │                                │
  │    (Connection Terminated)     │
```

## 🔧 Implementation Example

### Client-side (JavaScript)

```javascript
// WebSocket接続
const ws = new WebSocket('ws://localhost:4000');

ws.onopen = () => {
  console.log('✅ Connected');
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  switch (message.type) {
    case 'ping':
      // Pongを返す
      ws.send(JSON.stringify({
        type: 'pong',
        timestamp: new Date().toISOString()
      }));
      break;
      
    case 'download_progress':
      updateProgressBar(message.data);
      break;
      
    case 'download_complete':
      handleComplete(message.data);
      break;
      
    case 'download_error':
      handleError(message.data);
      break;
  }
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('❌ Disconnected');
  // 再接続ロジック
  setTimeout(() => connectWebSocket(), 3000);
};
```

### Server-side (TypeScript)

```typescript
import { WebSocket, WebSocketServer } from 'ws';

const wss = new WebSocketServer({ server });

wss.on('connection', (ws: WebSocket) => {
  console.log('✅ Client connected');
  
  // Ping送信
  ws.send(JSON.stringify({
    type: 'ping',
    data: { message: 'Connected' },
    timestamp: new Date().toISOString()
  }));
  
  ws.on('message', (data) => {
    const message = JSON.parse(data.toString());
    
    if (message.type === 'pong') {
      console.log('📡 Pong received');
    }
  });
});

// 進捗ブロードキャスト
function broadcastProgress(progress: DownloadProgress) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'download_progress',
        data: progress,
        timestamp: new Date().toISOString()
      }));
    }
  });
}
```

## 🎯 Best Practices

### 1. 再接続処理

接続が切断された場合、自動的に再接続を試みる：

```javascript
function connectWithRetry() {
  const ws = new WebSocket('ws://localhost:4000');
  
  ws.onclose = () => {
    console.log('Reconnecting in 3 seconds...');
    setTimeout(connectWithRetry, 3000);
  };
  
  return ws;
}
```

### 2. メッセージキューイング

接続確立前のメッセージをキューに保存：

```javascript
const messageQueue = [];
let ws = null;

function sendMessage(message) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  } else {
    messageQueue.push(message);
  }
}

ws.onopen = () => {
  // キュー内のメッセージを送信
  while (messageQueue.length > 0) {
    ws.send(JSON.stringify(messageQueue.shift()));
  }
};
```

### 3. タイムアウト処理

Ping/Pongによるタイムアウト検出：

```javascript
let pingTimeout = null;

function heartbeat() {
  clearTimeout(pingTimeout);
  
  // 30秒以内にpingが来なければ接続切断
  pingTimeout = setTimeout(() => {
    ws.close();
  }, 30000);
}

ws.onopen = heartbeat;
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.type === 'ping') {
    heartbeat();
  }
};
```

## 📊 Performance Considerations

1. **更新頻度の制限**
   - 進捗更新は0.5秒ごと（過度な通信を防止）
   - Keep-alive pingは30秒ごと

2. **メッセージサイズ**
   - 進捗データは軽量（~200バイト）
   - 大きなデータの送信は避ける

3. **接続管理**
   - アイドル接続のタイムアウト
   - 適切なクローズハンドリング

## 🔍 Debugging

### ブラウザのDevToolsで確認

```javascript
// Chrome DevTools Console
ws.addEventListener('message', (event) => {
  console.log('Received:', JSON.parse(event.data));
});
```

### サーバーログ

```typescript
ws.on('message', (data) => {
  console.log('Received from client:', data.toString());
});

wss.on('connection', (ws) => {
  console.log('Client count:', wss.clients.size);
});
```

## 🛡️ Security Notes

⚠️ **開発用モックのため、本番環境では以下の対策が必要：**

1. **認証**
   - WebSocket接続時のトークン検証
   - セッション管理

2. **レート制限**
   - 接続数制限
   - メッセージ送信頻度制限

3. **暗号化**
   - WSS（WebSocket Secure）の使用
   - TLS/SSL証明書

4. **入力検証**
   - 受信メッセージの検証
   - 不正なデータの拒否

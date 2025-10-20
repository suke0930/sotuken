# WebSocket通信プロトコル仕様

## 接続情報

- **WebSocket URL**: `ws://localhost:4000/ws`
- **プロトコル**: WebSocket (RFC 6455)
- **メッセージ形式**: JSON

## メッセージ基本構造

すべてのWebSocketメッセージは以下の基本構造を持ちます：

```typescript
interface WSMessage<T = any> {
  type: WSMessageType;      // メッセージタイプ
  taskId?: string;          // タスクID（ダウンロード関連の場合）
  data?: T;                 // ペイロードデータ
  timestamp: string;        // ISO 8601形式のタイムスタンプ
}
```

## メッセージタイプ

### クライアント → サーバー

#### 1. `ping` - 接続確認

サーバーとの接続を確認します。

**リクエスト:**
```json
{
  "type": "ping",
  "timestamp": "2025-10-20T10:00:00.000Z"
}
```

**レスポンス:**
```json
{
  "type": "pong",
  "timestamp": "2025-10-20T10:00:00.100Z"
}
```

---

### サーバー → クライアント

#### 2. `pong` - 接続確認応答

Pingリクエストへの応答。

```json
{
  "type": "pong",
  "data": {
    "message": "Connected to download server"
  },
  "timestamp": "2025-10-20T10:00:00.100Z"
}
```

---

#### 3. `download:progress` - ダウンロード進捗通知

ダウンロードの進捗状況を通知します。

**メッセージ構造:**
```json
{
  "type": "download:progress",
  "taskId": "a1b2c3d4e5f6...",
  "data": {
    "taskId": "a1b2c3d4e5f6...",
    "filename": "jdk-17-windows-x64.zip",
    "downloadedBytes": 52428800,
    "totalBytes": 209715200,
    "percentage": 25.0,
    "speedBytesPerSecond": 5242880,
    "speedMBps": "5.00 MB/s",
    "progressText": "50.00 MB / 200.00 MB",
    "remainingSeconds": 30,
    "status": "downloading"
  },
  "timestamp": "2025-10-20T10:00:05.000Z"
}
```

**data フィールド詳細:**

| フィールド | 型 | 説明 |
|----------|---|------|
| `taskId` | `string` | ダウンロードタスクの一意なID |
| `filename` | `string` | ダウンロード中のファイル名 |
| `downloadedBytes` | `number` | ダウンロード済みバイト数 |
| `totalBytes` | `number` | ファイルの総バイト数 |
| `percentage` | `number` | 進捗率（0〜100） |
| `speedBytesPerSecond` | `number` | ダウンロード速度（バイト/秒） |
| `speedMBps` | `string` | 人間が読みやすい速度表示（例: "5.00 MB/s"） |
| `progressText` | `string` | 人間が読みやすい進捗表示（例: "50.00 MB / 200.00 MB"） |
| `remainingSeconds` | `number` | 推定残り時間（秒） |
| `status` | `string` | ステータス（`"downloading"`） |

**受信頻度:**
- データチャンクを受信するたびに送信されます
- 通常は0.1〜1秒間隔

**使用例（JavaScript）:**
```javascript
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  if (message.type === 'download:progress') {
    const { percentage, speedMBps, progressText } = message.data;
    
    // プログレスバーを更新
    progressBar.style.width = `${percentage}%`;
    progressBar.textContent = `${percentage.toFixed(1)}%`;
    
    // 詳細情報を表示
    speedElement.textContent = speedMBps;
    progressElement.textContent = progressText;
  }
};
```

---

#### 4. `download:complete` - ダウンロード完了通知

ダウンロードが正常に完了したことを通知します。

**メッセージ構造:**
```json
{
  "type": "download:complete",
  "taskId": "a1b2c3d4e5f6...",
  "data": {
    "taskId": "a1b2c3d4e5f6...",
    "filename": "jdk-17-windows-x64.zip",
    "filepath": "/path/to/downloads/jdk-17-windows-x64.zip",
    "totalBytes": 209715200,
    "duration": 42.5
  },
  "timestamp": "2025-10-20T10:00:42.500Z"
}
```

**data フィールド詳細:**

| フィールド | 型 | 説明 |
|----------|---|------|
| `taskId` | `string` | ダウンロードタスクのID |
| `filename` | `string` | ダウンロードされたファイル名 |
| `filepath` | `string` | 保存先のファイルパス |
| `totalBytes` | `number` | ファイルの総バイト数 |
| `duration` | `number` | ダウンロードにかかった時間（秒） |

**使用例（JavaScript）:**
```javascript
if (message.type === 'download:complete') {
  const { filename, duration } = message.data;
  
  // 成功通知を表示
  showNotification(`${filename} のダウンロードが完了しました！ (${duration.toFixed(1)}秒)`);
  
  // プログレスバーを100%に設定
  progressBar.style.width = '100%';
  progressBar.classList.add('complete');
}
```

---

#### 5. `download:error` - ダウンロードエラー通知

ダウンロード中にエラーが発生したことを通知します。

**メッセージ構造:**
```json
{
  "type": "download:error",
  "taskId": "a1b2c3d4e5f6...",
  "data": {
    "message": "Network timeout",
    "code": "DOWNLOAD_ERROR"
  },
  "timestamp": "2025-10-20T10:00:15.000Z"
}
```

**data フィールド詳細:**

| フィールド | 型 | 説明 |
|----------|---|------|
| `message` | `string` | エラーメッセージ |
| `code` | `string` | エラーコード（任意） |

**エラーコード一覧:**

| コード | 説明 |
|-------|------|
| `DOWNLOAD_ERROR` | 一般的なダウンロードエラー |
| `NETWORK_ERROR` | ネットワークエラー |
| `FILE_WRITE_ERROR` | ファイル書き込みエラー |
| `CANCELLED` | ユーザーによるキャンセル |

**使用例（JavaScript）:**
```javascript
if (message.type === 'download:error') {
  const { message: errorMsg, code } = message.data;
  
  // エラー表示
  showError(`ダウンロードエラー: ${errorMsg} (${code})`);
  
  // プログレスバーをエラー状態に
  progressBar.classList.add('error');
}
```

---

## 完全な通信フロー例

### 正常なダウンロードフロー

```
Client                          Server
  |                               |
  |------- WebSocket接続 -------->|
  |<----- pong (接続確認) --------|
  |                               |
  |-- POST /api/download/jdk ---->|
  |<-- 202 {taskId: "abc..."} ----|
  |                               |
  |                               | ダウンロード開始
  |<-- download:progress (5%) ----|
  |<-- download:progress (15%) ---|
  |<-- download:progress (30%) ---|
  |<-- download:progress (50%) ---|
  |<-- download:progress (75%) ---|
  |<-- download:progress (95%) ---|
  |<-- download:complete ---------|
  |                               |
```

### エラー発生時のフロー

```
Client                          Server
  |                               |
  |-- POST /api/download/jdk ---->|
  |<-- 202 {taskId: "abc..."} ----|
  |                               |
  |<-- download:progress (10%) ---|
  |<-- download:progress (25%) ---|
  |                               | ネットワークエラー発生
  |<-- download:error ------------|
  |                               |
```

### キャンセルフロー

```
Client                          Server
  |                               |
  |-- POST /api/download/jdk ---->|
  |<-- 202 {taskId: "abc..."} ----|
  |                               |
  |<-- download:progress (10%) ---|
  |<-- download:progress (25%) ---|
  |                               |
  |-- POST /api/download/cancel ->|
  |<-- 200 OK --------------------|
  |                               | ダウンロード中止
```

---

## クライアント実装例（TypeScript）

```typescript
class DownloadManager {
  private ws: WebSocket;
  
  constructor(wsUrl: string) {
    this.ws = new WebSocket(wsUrl);
    this.setupListeners();
  }
  
  private setupListeners() {
    this.ws.onopen = () => {
      console.log('WebSocket connected');
    };
    
    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
    };
  }
  
  private handleMessage(message: any) {
    switch (message.type) {
      case 'download:progress':
        this.onProgress(message.data);
        break;
      case 'download:complete':
        this.onComplete(message.data);
        break;
      case 'download:error':
        this.onError(message.data);
        break;
      case 'pong':
        console.log('Pong received');
        break;
    }
  }
  
  private onProgress(data: any) {
    console.log(`Progress: ${data.percentage}% - ${data.speedMBps}`);
    // UIを更新
  }
  
  private onComplete(data: any) {
    console.log(`Download complete: ${data.filename}`);
    // 完了通知を表示
  }
  
  private onError(data: any) {
    console.error(`Download error: ${data.message}`);
    // エラー表示
  }
  
  ping() {
    this.ws.send(JSON.stringify({
      type: 'ping',
      timestamp: new Date().toISOString()
    }));
  }
}
```

---

## 注意事項

1. **再接続処理**: WebSocketが切断された場合、クライアント側で再接続を実装してください

2. **タスクID管理**: ダウンロード開始時に返される`taskId`を保存し、進捗メッセージと紐付けてください

3. **メッセージの順序**: ネットワーク遅延により、メッセージが順不同で届く可能性があります。`timestamp`フィールドを使用して順序を管理できます

4. **プログレスバーの更新頻度**: 高頻度で更新される進捗メッセージは、UI側でスロットリング（例: 100ms間隔）することを推奨します

5. **複数同時ダウンロード**: 同時に複数のダウンロードを実行できます。各ダウンロードは`taskId`で識別されます

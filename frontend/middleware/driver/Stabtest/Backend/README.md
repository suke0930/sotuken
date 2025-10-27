# Backend Proxy Server

Asset ServerとUI（Client）を中継するバックエンドサーバーです。

## システム構成

```
Asset (1) <=> Backend (多) <=> UI/Client (多)
```

- **Asset Server**: JDKとMinecraftサーバーファイルを配信
- **Backend Server**: プロキシ＋ダウンロード管理
- **UI/Client**: Webブラウザ（フロントエンド）

## 主な機能

### 1. プロキシAPI

Asset ServerへのHTTPリクエストを中継します。

- **CORS対策**: ブラウザからAsset Serverへの直接アクセスを回避
- **ブラックボックス化**: Asset ServerのURLをクライアントに露出しない
- **統一インターフェース**: クライアントはBackendのみと通信

### 2. ダウンロード管理

ファイルダウンロードを管理し、進捗をWebSocketでリアルタイム通知します。

- **進捗通知**: ダウンロード速度、進捗率、残り時間
- **タスク管理**: 複数同時ダウンロード対応
- **キャンセル機能**: ダウンロードの中断
- **エラーハンドリング**: ネットワークエラー時の適切な処理

### 3. WebSocket通信

リアルタイムで進捗情報を配信します。

- **プログレスバー更新**: 0.1〜1秒間隔で進捗を送信
- **詳細情報**: 速度（MB/s）、進捗（xx MB / yy MB）
- **イベント通知**: 開始、進捗、完了、エラー

## インストール

```bash
cd Stabtest/Backend
npm install
```

## 設定

環境変数で設定をカスタマイズできます：

```bash
# .env ファイルを作成
PORT=4000                                    # Backendサーバーのポート
ASSET_SERVER_URL=http://localhost:3000       # Asset ServerのURL
DOWNLOAD_DIR=./downloads                     # ダウンロード先ディレクトリ
```

## 起動方法

### 開発モード（TypeScript直接実行）

```bash
npm run dev
```

### ビルド＆本番モード

```bash
npm run build
npm start
```

## APIエンドポイント

### プロキシAPI（Asset Server経由）

#### サーバーリスト取得
```http
GET /api/servers
```

Asset Serverの`GET /api/v1/servers`を中継します。

**レスポンス例:**
```json
{
  "success": true,
  "data": [
    {
      "name": "Vanilla",
      "versions": [...]
    }
  ],
  "timestamp": "2025-10-20T10:00:00.000Z"
}
```

#### JDKリスト取得
```http
GET /api/jdk
```

Asset Serverの`GET /api/v1/jdk`を中継します。

#### JDKファイルリスト取得
```http
GET /api/files/jdk
```

Asset Serverの`GET /api/assets/list/jdk`を中継します。

#### サーバーファイルリスト取得
```http
GET /api/files/servers
```

Asset Serverの`GET /api/assets/list/servers`を中継します。

#### Asset Serverヘルスチェック
```http
GET /api/health/asset
```

Asset Serverが正常に動作しているか確認します。

---

### ダウンロードAPI

#### JDKダウンロード
```http
POST /api/download/jdk
Content-Type: application/json

{
  "version": "17",
  "os": "windows",
  "filename": "jdk-17-windows-x64.zip"
}
```

**レスポンス:**
```json
{
  "success": true,
  "taskId": "a1b2c3d4e5f6...",
  "message": "Download started",
  "filename": "jdk-17-windows-x64.zip"
}
```

#### サーバーダウンロード
```http
POST /api/download/server
Content-Type: application/json

{
  "type": "vanilla",
  "version": "1.20.1",
  "filename": "server.jar"
}
```

#### ダウンロードキャンセル
```http
POST /api/download/cancel/:taskId
```

#### アクティブタスク一覧
```http
GET /api/download/tasks
```

**レスポンス:**
```json
{
  "success": true,
  "tasks": [
    {
      "taskId": "abc123...",
      "status": {
        "downloadedBytes": 52428800,
        "totalBytes": 209715200,
        "percentage": 25.0,
        "speedBytesPerSecond": 5242880,
        "remainingSeconds": 30,
        "status": "downloading"
      }
    }
  ],
  "count": 1
}
```

---

### ヘルスチェック

```http
GET /health
```

Backend Server自身のヘルスチェックです。

---

## WebSocket通信

### 接続

```javascript
const ws = new WebSocket('ws://localhost:4000/ws');
```

### メッセージフォーマット

詳細は [WEBSOCKET_PROTOCOL.md](./src/docs/WEBSOCKET_PROTOCOL.md) を参照してください。

#### ダウンロード進捗通知

```json
{
  "type": "download:progress",
  "taskId": "abc123...",
  "data": {
    "percentage": 25.0,
    "speedMBps": "5.00 MB/s",
    "progressText": "50.00 MB / 200.00 MB",
    "remainingSeconds": 30,
    "status": "downloading"
  },
  "timestamp": "2025-10-20T10:00:05.000Z"
}
```

#### ダウンロード完了通知

```json
{
  "type": "download:complete",
  "taskId": "abc123...",
  "data": {
    "filename": "jdk-17-windows-x64.zip",
    "filepath": "/path/to/downloads/jdk-17-windows-x64.zip",
    "totalBytes": 209715200,
    "duration": 42.5
  },
  "timestamp": "2025-10-20T10:00:42.500Z"
}
```

#### エラー通知

```json
{
  "type": "download:error",
  "taskId": "abc123...",
  "data": {
    "message": "Network timeout",
    "code": "DOWNLOAD_ERROR"
  },
  "timestamp": "2025-10-20T10:00:15.000Z"
}
```

---

## アーキテクチャ

### システム構成図

![Architecture](./src/docs/ARCHITECTURE.puml)

PlantUMLで生成できます：
```bash
plantuml src/docs/ARCHITECTURE.puml
```

### シーケンス図

![Sequence](./src/docs/SEQUENCE.puml)

PlantUMLで生成できます：
```bash
plantuml src/docs/SEQUENCE.puml
```

---

## ディレクトリ構造

```
Backend/
├── src/
│   ├── server.ts                    # メインサーバー
│   ├── routes/
│   │   └── index.ts                 # ルーティング定義
│   ├── controllers/
│   │   ├── proxyController.ts       # プロキシAPI
│   │   └── downloadController.ts    # ダウンロードAPI
│   ├── services/
│   │   ├── AssetProxyService.ts     # Asset Server通信
│   │   ├── DownloadTask.ts          # ダウンロードタスク管理
│   │   └── WebSocketServer.ts       # WebSocket管理
│   ├── types/
│   └── docs/
│       ├── ARCHITECTURE.puml        # アーキテクチャ図
│       ├── SEQUENCE.puml            # シーケンス図
│       └── WEBSOCKET_PROTOCOL.md    # WebSocket仕様書
├── dist/                            # ビルド出力
├── downloads/                       # ダウンロードファイル保存先
├── package.json
├── tsconfig.json
└── README.md
```

---

## 技術スタック

- **Node.js**: JavaScript実行環境
- **TypeScript**: 型安全な開発
- **Express 5**: HTTPサーバーフレームワーク
- **ws**: WebSocketライブラリ
- **axios**: HTTPクライアント
- **cors**: CORS対策

---

## 開発ガイド

### DownloadTaskクラスの使用例

```typescript
import { DownloadTask } from './services/DownloadTask';

const task = new DownloadTask({
  url: 'https://example.com/file.zip',
  saveDir: './downloads',
  filename: 'file.zip',
  onProgress: (progress) => {
    console.log(`${progress.percentage}% - ${progress.speedBytesPerSecond} bytes/s`);
  },
  onComplete: (filepath) => {
    console.log(`Downloaded: ${filepath}`);
  },
  onError: (error) => {
    console.error(`Error: ${error.message}`);
  }
});

await task.start();
```

### WebSocketServerの使用例

```typescript
import { WebSocketServer } from './services/WebSocketServer';
import * as http from 'http';

const server = http.createServer(app);
const wsServer = new WebSocketServer(server);

// 進捗をブロードキャスト
wsServer.broadcastProgress('taskId123', 'file.zip', progressData);

// 完了をブロードキャスト
wsServer.broadcastComplete('taskId123', 'file.zip', '/path/to/file.zip', 1024000, 10.5);
```

---

## テスト

### 手動テスト

#### 1. Asset Serverを起動

```bash
cd ../Asset
npm run api
# http://localhost:3000 で起動
```

#### 2. Backend Serverを起動

```bash
npm run dev
# http://localhost:4000 で起動
```

#### 3. プロキシAPIテスト

```bash
# サーバーリスト取得
curl http://localhost:4000/api/servers

# JDKリスト取得
curl http://localhost:4000/api/jdk
```

#### 4. ダウンロードテスト

```bash
# JDKダウンロード開始
curl -X POST http://localhost:4000/api/download/jdk \
  -H "Content-Type: application/json" \
  -d '{"version":"17","os":"windows","filename":"jdk-17-windows-x64.zip"}'

# レスポンス: {"success":true,"taskId":"abc123...","message":"Download started"}

# WebSocketで進捗を確認（ブラウザのJavaScript Console等）
const ws = new WebSocket('ws://localhost:4000/ws');
ws.onmessage = (e) => console.log(JSON.parse(e.data));
```

---

## トラブルシューティング

### Asset Serverに接続できない

```bash
# Asset Serverのヘルスチェック
curl http://localhost:4000/api/health/asset
```

**解決方法:**
- Asset Serverが起動しているか確認
- `ASSET_SERVER_URL`環境変数が正しいか確認

### ダウンロードが開始されない

- `downloads/`ディレクトリの書き込み権限を確認
- ディスク容量を確認

### WebSocketが接続できない

- ファイアウォール設定を確認
- ブラウザがWebSocketをサポートしているか確認

---

## ライセンス

ISC

---

## 参考リンク

- [WebSocket Protocol Documentation](./src/docs/WEBSOCKET_PROTOCOL.md)
- [Asset Server Documentation](../Asset/README.md)

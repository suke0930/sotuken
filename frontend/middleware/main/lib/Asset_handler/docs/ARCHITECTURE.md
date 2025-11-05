# Backend Proxy Server - Architecture Documentation

## 📐 System Architecture

### システム構成図

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Client    │────────▶│   Backend    │────────▶│   Asset     │
│     (UI)    │◀────────│    Proxy     │◀────────│   Server    │
└─────────────┘   HTTP  └──────────────┘   HTTP  └─────────────┘
       │              WebSocket │
       └───────────────────────┘
            Progress Updates
```

### コンポーネント構成

1. **Client (UI)** - ブラウザベースのフロントエンド
   - リスト表示
   - ダウンロード開始
   - プログレスバー表示

2. **Backend Proxy** - Node.js/Express/WebSocket サーバー
   - Asset サーバーへのプロキシ
   - ダウンロードタスク管理
   - WebSocket による進捗配信

3. **Asset Server** - ファイル配信サーバー
   - サーバー/JDK リスト API
   - ファイル配信エンドポイント

## 🔄 Communication Flow

### 1. リスト取得フロー

```
Client                 Backend                Asset Server
  │                      │                        │
  │──GET /api/list/jdk──▶│                        │
  │                      │──GET /api/v1/jdk──────▶│
  │                      │                        │
  │                      │◀───JSON Response───────│
  │◀───JSON Response─────│                        │
  │                      │                        │
```

### 2. ダウンロードフロー

```
Client                 Backend                Asset Server
  │                      │                        │
  │─POST /api/download──▶│                        │
  │  {url: "..."}        │                        │
  │                      │                        │
  │◀──{taskId: "..."}────│                        │
  │                      │                        │
  │                      │──GET file URL─────────▶│
  │                      │  (streaming)           │
  │                      │                        │
  │◀─WS: progress────────│◀─────chunks────────────│
  │                      │  (save to disk)        │
  │◀─WS: progress────────│                        │
  │                      │                        │
  │◀─WS: complete────────│                        │
  │                      │                        │
```

## 📦 Directory Structure

```
Backend/
├── src/
│   ├── lib/
│   │   ├── DownloadTask.ts      # ダウンロードタスク管理クラス
│   │   └── WebSocketManager.ts  # WebSocket接続管理
│   ├── controllers/
│   │   ├── proxyController.ts   # Asset Server プロキシ
│   │   └── downloadController.ts # ダウンロード制御
│   ├── routes/
│   │   └── index.ts              # API ルーティング
│   ├── types/
│   │   └── index.ts              # 型定義
│   ├── app.ts                    # Express アプリケーション
│   └── server.ts                 # サーバーエントリーポイント
├── public/
│   ├── index.html                # フロントエンドUI
│   └── app.js                    # フロントエンドロジック
├── download/                     # ダウンロードファイル保存先
├── docs/
│   ├── ARCHITECTURE.md           # このファイル
│   ├── API.md                    # API仕様書
│   ├── WEBSOCKET.md              # WebSocket仕様書
│   └── diagrams/                 # PlantUML図
│       ├── sequence.puml
│       ├── class.puml
│       └── architecture.puml
├── package.json
└── tsconfig.json
```

## 🎯 Design Principles

### 1. **Separation of Concerns**
- DownloadTask クラス: ダウンロードロジックのカプセル化
- WebSocketManager: WebSocket接続管理の独立化
- Controller: ビジネスロジックとルーティングの分離

### 2. **Real-time Communication**
- WebSocket による即時進捗更新
- サーバー再起動不要のリアルタイムデータ反映

### 3. **Error Handling**
- 各レイヤーでの適切なエラーハンドリング
- ユーザーフレンドリーなエラーメッセージ

### 4. **Scalability**
- タスクベースのダウンロード管理
- 複数ダウンロードの同時実行対応

## 🔐 Security Considerations

⚠️ **注意**: このシステムは**デバッグ/開発用モック**です。

本番環境では以下の対策が必要：

1. **認証・認可**
   - JWT トークン認証
   - API キーの導入
   - ユーザー権限管理

2. **入力検証**
   - URL バリデーション
   - ファイル名サニタイズ
   - パストラバーサル攻撃対策

3. **レート制限**
   - ダウンロード回数制限
   - 帯域幅制御
   - DoS 攻撃対策

4. **CORS設定**
   - 特定オリジンのみ許可
   - 認証情報の送信制御

## 📊 Performance Considerations

1. **ストリーミングダウンロード**
   - メモリ効率的なファイル処理
   - チャンク単位でのデータ転送

2. **進捗更新の最適化**
   - 0.5秒ごとの更新（過度なWebSocket送信を防止）
   - 速度計算のスムージング

3. **リソース管理**
   - タスク完了後のクリーンアップ
   - メモリリーク防止

## 🚀 Future Enhancements

1. **ダウンロード履歴**
   - データベース統合
   - ダウンロード履歴の永続化

2. **一時停止/再開機能**
   - Range ヘッダーによる部分ダウンロード
   - 中断したダウンロードの再開

3. **並列ダウンロード**
   - マルチコネクション対応
   - ダウンロード速度の向上

4. **通知機能**
   - ダウンロード完了通知
   - エラー通知

5. **キューイング機能**
   - ダウンロードキューの管理
   - 優先度設定

## 📚 Related Documents

- [API Specification](./API.md)
- [WebSocket Specification](./WEBSOCKET.md)
- [PlantUML Diagrams](./diagrams/)

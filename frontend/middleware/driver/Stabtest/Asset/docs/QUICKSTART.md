# 🚀 クイックスタートガイド

## APIサーバーの起動

### 1. 依存関係のインストール

```bash
cd /home/user/webapp/frontend/middleware/driver
npm install
```

### 2. サーバーの起動

```bash
npm run api
```

サーバーが起動すると、以下のメッセージが表示されます:

```
🚀 Server is running on port 3000
📡 Health check: http://localhost:3000/health
🎮 Minecraft Servers API: http://localhost:3000/api/v1/servers
☕ JDK API: http://localhost:3000/api/v1/jdk
```

---

## 📡 公開URL

サンドボックス環境では以下のURLで外部からアクセス可能です:

**ベースURL**: `https://3000-i0e8icoitrsz8wh48c45b-b9b802c4.sandbox.novita.ai`

### エンドポイント一覧

| エンドポイント | 説明 |
|--------------|------|
| `GET /health` | ヘルスチェック |
| `GET /api/v1/servers` | 全Minecraftサーバー情報 |
| `GET /api/v1/jdk` | 全JDK情報 |

---

## 🧪 テスト方法

### cURL でテスト

```bash
# ヘルスチェック
curl https://3000-i0e8icoitrsz8wh48c45b-b9b802c4.sandbox.novita.ai/health

# サーバー情報取得
curl https://3000-i0e8icoitrsz8wh48c45b-b9b802c4.sandbox.novita.ai/api/v1/servers

# JDK情報取得
curl https://3000-i0e8icoitrsz8wh48c45b-b9b802c4.sandbox.novita.ai/api/v1/jdk
```

### ブラウザでアクセス

- ヘルスチェック: https://3000-i0e8icoitrsz8wh48c45b-b9b802c4.sandbox.novita.ai/health
- サーバー情報: https://3000-i0e8icoitrsz8wh48c45b-b9b802c4.sandbox.novita.ai/api/v1/servers
- JDK情報: https://3000-i0e8icoitrsz8wh48c45b-b9b802c4.sandbox.novita.ai/api/v1/jdk

### JavaScript (Fetch API)

```javascript
// サーバー情報を取得
fetch('https://3000-i0e8icoitrsz8wh48c45b-b9b802c4.sandbox.novita.ai/api/v1/servers')
  .then(response => response.json())
  .then(data => {
    console.log('サーバー数:', data.data.length);
    console.log('サーバー一覧:', data.data.map(s => s.name));
  });

// JDK情報を取得
fetch('https://3000-i0e8icoitrsz8wh48c45b-b9b802c4.sandbox.novita.ai/api/v1/jdk')
  .then(response => response.json())
  .then(data => {
    console.log('JDKバージョン:', data.data.map(j => j.version));
  });
```

---

## 📊 レスポンス例

### `/api/v1/servers` のレスポンス

```json
{
  "success": true,
  "data": [
    {
      "name": "Vanilla",
      "versions": [
        {
          "version": "1.20.1",
          "jdk": "17",
          "downloadUrl": "https://example.com/vanilla/1.20.1/server.jar"
        }
      ]
    },
    {
      "name": "Forge",
      "versions": [...]
    }
  ],
  "timestamp": "2025-10-19T15:30:00.000Z"
}
```

### `/api/v1/jdk` のレスポンス

```json
{
  "success": true,
  "data": [
    {
      "version": "17",
      "downloads": [
        {
          "os": "windows",
          "downloadUrl": "https://example.com/jdk/17/jdk-17-windows-x64.zip"
        },
        {
          "os": "linux",
          "downloadUrl": "https://example.com/jdk/17/jdk-17-linux-x64.tar.gz"
        },
        {
          "os": "macos",
          "downloadUrl": "https://example.com/jdk/17/jdk-17-macos-x64.dmg"
        }
      ],
      "vendor": "Eclipse Temurin",
      "isLTS": true
    }
  ],
  "timestamp": "2025-10-19T15:30:00.000Z"
}
```

---

## 📁 プロジェクト構成

```
backend/
├── server.ts              # サーバー起動エントリーポイント
├── app.ts                 # Express アプリケーション設定
├── routes/
│   ├── index.ts          # ルート統合
│   ├── servers.ts        # サーバー情報ルート
│   └── jdk.ts            # JDK情報ルート
├── controllers/
│   ├── serversController.ts  # サーバー情報コントローラー
│   └── jdkController.ts      # JDK情報コントローラー
├── types/
│   ├── server.types.ts   # サーバー型定義
│   └── jdk.types.ts      # JDK型定義
├── lib/
│   ├── sampleData.ts     # サーバーサンプルデータ
│   └── jdkSampleData.ts  # JDKサンプルデータ
└── docs/
    ├── README.md         # メインドキュメント
    ├── QUICKSTART.md     # このファイル
    ├── API.md            # サーバーAPI仕様
    ├── JDK_API.md        # JDK API仕様
    ├── SCHEMA.md         # サーバースキーマ
    └── JDK_SCHEMA.md     # JDKスキーマ
```

---

## 🎯 提供データ

### Minecraftサーバーソフトウェア (4種類)

1. **Vanilla** - 公式サーバー (4バージョン)
2. **Forge** - MOD対応 (4バージョン)
3. **Fabric** - 軽量MOD対応 (3バージョン)
4. **Paper** - パフォーマンス最適化 (3バージョン)

### JDK (4バージョン)

1. **JDK 8** - Minecraft 1.12.2以前
2. **JDK 11** - Minecraft 1.13.x - 1.16.5
3. **JDK 17** - Minecraft 1.17.x - 1.20.x (LTS)
4. **JDK 21** - Minecraft 1.21.x以降 (LTS)

各JDKは Windows / Linux / macOS に対応しています。

---

## 🛠️ 開発・デバッグ

### ログの確認

サーバーはコンソールにログを出力します。エラーが発生した場合、詳細が表示されます。

### ポート番号の変更

```bash
PORT=4000 npm run api
```

### TypeScript コンパイルエラーの確認

```bash
npm run build
```

---

## 📚 詳細ドキュメント

- [メインREADME](./README.md)
- [API仕様書](./API.md)
- [JDK API仕様書](./JDK_API.md)
- [スキーマドキュメント](./SCHEMA.md)
- [JDKスキーマドキュメント](./JDK_SCHEMA.md)

---

## 🔧 次のステップ

1. **実際のダウンロードURL取得**: 外部API連携
2. **フィルタリング機能**: クエリパラメータ対応
3. **バリデーション**: Zodスキーマの追加
4. **データベース統合**: PostgreSQL/MongoDBへの移行
5. **認証**: JWT認証の実装

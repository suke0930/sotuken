# Backend API Server

Minecraft サーバーと JDK の情報を提供する REST API サーバー。

## 🚀 クイックスタート

### サーバーの起動

```bash
# プロジェクトルートから実行
npm run api

# または直接実行
npx ts-node backend/server.ts
```

サーバーが起動すると、以下のようなメッセージが表示されます:

```
🚀 Server is running on port 3000
📡 Health check: http://localhost:3000/health
🎮 Minecraft Servers API: http://localhost:3000/api/v1/servers
☕ JDK API: http://localhost:3000/api/v1/jdk
```

---

## 📡 API エンドポイント

### ヘルスチェック

```http
GET /health
```

**レスポンス例:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-19T15:30:00.000Z"
}
```

### Minecraft サーバー情報取得

```http
GET /api/v1/servers
```

**レスポンス例:**
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
    }
  ],
  "timestamp": "2025-10-19T15:30:00.000Z"
}
```

### JDK 情報取得

```http
GET /api/v1/jdk
```

**レスポンス例:**
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

## 🧪 テスト方法

### cURL を使用

```bash
# ヘルスチェック
curl http://localhost:3000/health

# サーバー情報取得
curl http://localhost:3000/api/v1/servers | jq '.'

# JDK情報取得
curl http://localhost:3000/api/v1/jdk | jq '.'
```

### ブラウザでアクセス

- ヘルスチェック: http://localhost:3000/health
- サーバー情報: http://localhost:3000/api/v1/servers
- JDK情報: http://localhost:3000/api/v1/jdk

---

## 📦 アセット配布 (ファイルダウンロード)

このAPIサーバーは、`resources/` ディレクトリに格納された物理ファイル（JDKのzipアーカイブやMinecraftサーバーのjarファイルなど）を直接ダウンロードさせる機能も提供します。

### APIエンドポイント

#### ファイルのダウンロード

```http
# JDKファイルのダウンロード
GET /api/assets/jdk/{version}/{os}/{filename}

# サーバーソフトウェアのダウンロード
GET /api/assets/servers/{type}/{version}/{filename}
```

**レスポンス:**
リクエストされたファイルがストリーミング形式で返却されます。ブラウザはダウンロードを開始します。

**cURLでのダウンロード例:**
```bash
# JDKをダウンロード
curl -O http://localhost:3000/api/assets/jdk/17/windows/jdk-17-windows-x64.zip

# サーバーjarをダウンロード
curl -O http://localhost:3000/api/assets/servers/vanilla/1.20.1/server.jar
```

#### 利用可能なファイル一覧の取得

```http
# JDKファイルの一覧を取得
GET /api/assets/list/jdk

# サーバーファイルの一覧を取得
GET /api/assets/list/servers
```

**レスポンス例:**
```json
{
  "success": true,
  "data": [
    { "path": "17/windows/jdk-17-windows-x64.zip", "size": 158342985, "name": "jdk-17-windows-x64.zip" }
  ],
  "count": 1,
  "timestamp": "2025-10-20T10:00:00.000Z"
}
```

### 特徴
- **ストリーミング配信**: 大容量ファイルでもサーバーのメモリを圧迫せずに効率的に配信します。
- **セキュリティ**: パストラバーサル攻撃を防ぐため、`resources` ディレクトリ外へのアクセスはブロックされます。

アセットのディレクトリ構造やライセンスに関する詳細は、以下のドキュメントを参照してください。
- **Resources Directory Readme**

---

## 📦 データ管理 (アセット配布)

このAPIサーバーは、`backend/data/` ディレクトリにあるJSONファイルから直接データを読み込みます。これにより、サーバーを再起動することなく、リアルタイムでAPIが提供する情報を更新できます。

- **`servers.json`**: Minecraftサーバーソフトウェアの情報を管理します。
- **`jdk.json`**: JDKのバージョンとダウンロード情報を管理します。

### リアルタイム更新

JSONファイルを編集して保存するだけで、次回のAPIリクエストから変更内容が自動的に反映されます。サーバーの再起動は一切不要です。

### 編集方法

JSONファイルを直接テキストエディタで編集してください。

```bash
# Minecraftサーバー情報を編集
vim backend/data/servers.json

# JDK情報を編集
vim backend/data/jdk.json
```

編集後、ファイルを保存すれば更新は完了です。

より詳細なスキーマ情報や編集方法については、以下のドキュメントを参照してください。
- **Data Directory Readme**

---

## 📁 ディレクトリ構造

```
backend/
├── app.ts                  # Express アプリケーション設定
├── server.ts               # サーバー起動エントリーポイント
├── routes/
│   ├── index.ts           # ルートの統合
│   ├── servers.ts         # サーバー情報ルート
│   └── jdk.ts             # JDK情報ルート
├── controllers/
│   ├── serversController.ts  # サーバー情報コントローラー
│   └── jdkController.ts      # JDK情報コントローラー
├── types/
│   ├── server.types.ts    # サーバー型定義
│   └── jdk.types.ts       # JDK型定義
├── lib/
│   ├── sampleData.ts      # サーバーサンプルデータ
│   └── jdkSampleData.ts   # JDKサンプルデータ
└── docs/
    ├── API.md             # サーバーAPI仕様
    ├── SCHEMA.md          # サーバースキーマ
    ├── JDK_API.md         # JDK API仕様
    └── JDK_SCHEMA.md      # JDKスキーマ
```

---

## 🛠️ 設定

### ポート番号の変更

環境変数 `PORT` で変更可能:

```bash
PORT=4000 npm run api
```

### CORS設定

現在は開発用に全てのオリジンを許可していますが、本番環境では `backend/app.ts` の CORS 設定を修正してください:

```typescript
// 本番環境用の例
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', 'https://your-domain.com');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});
```

---

## 🔧 開発

### TypeScript コンパイル

```bash
npm run build
```

### 既存の依存関係

- Express 5.1.0
- TypeScript 5.9.2
- @types/express
- @types/node

---

## 📝 今後の拡張

- [ ] 特定のサーバーソフトウェア取得エンドポイント
- [ ] 特定のJDKバージョン取得エンドポイント
- [ ] クエリパラメータによるフィルタリング
- [ ] ページネーション
- [ ] レート制限
- [ ] キャッシング
- [ ] データベース統合
- [ ] 認証・認可

---

## ⚠️ 注意事項

1. **サンプルデータ**: 現在使用しているダウンロードURLはサンプルです
2. **開発環境**: この設定は開発環境用です。本番環境では追加のセキュリティ対策が必要です
3. **CORS**: 本番環境では適切なオリジン制限を設定してください

---

## 📚 関連ドキュメント

- [API仕様書](./docs/API.md)
- [JDK API仕様書](./docs/JDK_API.md)
- [スキーマドキュメント](./docs/SCHEMA.md)
- [JDKスキーマドキュメント](./docs/JDK_SCHEMA.md)

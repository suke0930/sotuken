# Backend API Server

Minecraft サーバーと JDK の情報を提供する REST API サーバー。

## 🚀 クイックスタート

### 前提条件

```bash
# 依存関係のインストール
cd backend/Asset
npm install

# JDK_JSON_Genelatorの依存関係もインストール
cd JDK_JSON_Genelator
npm install
cd ..
```

### サーバーの起動

#### 本番モード（通常起動）

```bash
npm start
```

既存のJDKデータを使用し、自動ダウンロードは実行されません。

#### 開発モード（JDK自動セットアップ付き）

```bash
npm run dev
```

サーバー起動時に以下の処理が自動実行されます：
1. JDK_JSON_Generatorを実行して最新JDK情報を取得
2. data/jdk.jsonを最新情報で自動更新
3. 不足しているJDKバイナリを自動ダウンロード

#### テストモード（JDK自動セットアップ付き）

```bash
npm run test
# または
npx ts-node server.ts --test
```

開発モードと同様に、JDKの自動セットアップが実行されます。

サーバーが起動すると、以下のようなメッセージが表示されます:

```
========================================
🚀 Starting JDK Auto Setup
========================================

🔄 Running JDK_JSON_Generator...
✅ JDK_JSON_Generator completed successfully

🔄 Converting latest-jdks.json to jdk.json format...
✅ Updated data/jdk.json
🔄 Checking and downloading JDK binaries...

📦 Processing JDK 21...
   ⬇️  Downloading windows/OpenJDK21U-jdk_x64_windows_hotspot_21.0.9_10.zip...
   ✅ Download completed

========================================
✅ JDK Auto Setup Completed Successfully
========================================

🚀 Server is running on port 3000
📡 Health check: http://localhost:3000/health
🎮 Minecraft Servers API: http://localhost:3000/api/v1/servers
☕ JDK API: http://localhost:3000/api/v1/jdk
🔧 Mode: DEVELOPMENT (JDK auto-setup enabled)
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

## 🤖 JDK自動セットアップ機能

このサーバーには、JDKの情報を自動的に取得し、バイナリファイルをダウンロードする機能が組み込まれています。

### 機能概要

1. **JDK情報の自動取得**
   - Eclipse Temurin GitHub APIから最新のJDK情報を取得
   - JDK 8, 11, 17, 21（すべてLTSバージョン）に対応

2. **data/jdk.jsonの自動更新**
   - 取得した最新情報をAPIサーバーのフォーマットに変換
   - localhost URLを使用した二次配布URL形式で保存

3. **JDKバイナリの自動ダウンロード**
   - resources/jdk/{version}/{os}/ ディレクトリに自動配置
   - 既存ファイルはスキップ（再ダウンロード不要）
   - Windows (.zip)、Linux (.tar.gz)、macOS (.tar.gz) に対応

### 動作モード

| モード | 起動コマンド | JDK自動セットアップ | 用途 |
|--------|--------------|---------------------|------|
| 本番モード | `npm start` | ❌ 無効 | 本番環境での運用 |
| 開発モード | `npm run dev` | ✅ 有効 | 開発・テスト環境 |
| テストモード | `npm run test` | ✅ 有効 | 自動テスト実行時 |

### 自動セットアップの流れ

```
サーバー起動
    ↓
[dev/testモードの場合]
    ↓
1. JDK_JSON_Generatorを実行
   → GitHub APIから最新JDK情報を取得
   → JDK_JSON_Genelator/latest-jdks.json に保存
    ↓
2. フォーマット変換
   → latest-jdks.json を読み込み
   → data/jdk.json 形式に変換
   → localhost URLで二次配布URLを生成
    ↓
3. バイナリダウンロード
   → 各JDKバージョンのバイナリをチェック
   → 存在しないファイルのみダウンロード
   → resources/jdk/ 配下に配置
    ↓
サーバー起動完了
```

### ディレクトリ構造（自動生成）

```
backend/Asset/
├── JDK_JSON_Genelator/
│   └── latest-jdks.json          # GitHub APIから取得した生データ
├── data/
│   └── jdk.json                  # 自動更新されるJDK情報（API用）
└── resources/
    └── jdk/
        ├── 8/
        │   ├── windows/
        │   │   └── OpenJDK8U-jdk_x64_windows_hotspot_*.zip
        │   └── linux/
        │       └── OpenJDK8U-jdk_x64_linux_hotspot_*.tar.gz
        ├── 11/
        ├── 17/
        └── 21/
```

### 注意事項

- 初回起動時は全JDKバイナリのダウンロードが行われるため、時間がかかります（合計約1-2GB）
- ダウンロード済みのファイルは再ダウンロードされません
- ネットワーク接続が必要です

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
backend/Asset/
├── app.ts                       # Express アプリケーション設定
├── server.ts                    # サーバー起動エントリーポイント
├── package.json                 # プロジェクト設定とスクリプト
├── tsconfig.json                # TypeScript設定
│
├── routes/
│   ├── index.ts                # ルートの統合
│   ├── servers.ts              # サーバー情報ルート
│   ├── jdk.ts                  # JDK情報ルート
│   └── assets.ts               # アセット配信ルート
│
├── controllers/
│   ├── serversController.ts    # サーバー情報コントローラー
│   └── jdkController.ts        # JDK情報コントローラー
│
├── types/
│   ├── server.types.ts         # サーバー型定義
│   └── jdk.types.ts            # JDK型定義
│
├── lib/
│   ├── sampleData.ts           # サーバーヘルパー関数
│   ├── jdkSampleData.ts        # JDKヘルパー関数
│   ├── dataLoader.ts           # JSONデータローダー
│   └── jdkSetup.ts            # 🆕 JDK自動セットアップ機能
│
├── data/                        # JSONデータファイル（リアルタイム編集可能）
│   ├── servers.json            # Minecraftサーバー情報
│   └── jdk.json                # JDK情報（自動更新可能）
│
├── resources/                   # ファイル配信ディレクトリ
│   ├── jdk/                    # JDKバイナリ（自動ダウンロード）
│   └── servers/                # サーバーJARファイル
│
├── JDK_JSON_Genelator/         # 🆕 JDK情報自動取得ツール
│   ├── main.js                 # GitHub API取得スクリプト
│   ├── latest-jdks.json        # 最新JDK情報（自動生成）
│   └── package.json            # 依存関係（axios）
│
└── docs/
    ├── API.md                  # サーバーAPI仕様
    ├── SCHEMA.md               # サーバースキーマ
    ├── JDK_API.md              # JDK API仕様
    ├── JDK_SCHEMA.md           # JDKスキーマ
    ├── ASSETS_API.md           # アセット配信API仕様
    └── QUICKSTART.md           # クイックスタートガイド
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

- [x] **JDK自動セットアップ機能** ✅ 実装済み
  - [x] GitHub APIからの自動取得
  - [x] data/jdk.jsonの自動更新
  - [x] JDKバイナリの自動ダウンロード
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

1. **JDK自動ダウンロード**: 開発/テストモードでは初回起動時に約1-2GBのJDKバイナリがダウンロードされます
2. **開発環境**: この設定は開発環境用です。本番環境では追加のセキュリティ対策が必要です
3. **CORS**: 本番環境では適切なオリジン制限を設定してください
4. **GitHub API制限**: JDK_JSON_Generatorは GitHub API を使用します。API制限に注意してください

---

## 📚 関連ドキュメント

- [API仕様書](./docs/API.md)
- [JDK API仕様書](./docs/JDK_API.md)
- [スキーマドキュメント](./docs/SCHEMA.md)
- [JDKスキーマドキュメント](./docs/JDK_SCHEMA.md)

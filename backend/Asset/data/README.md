# Data Directory

このディレクトリは、API サーバーが提供するデータを JSON 形式で保管します。

## ファイル構成

- **`servers.json`** - Minecraft サーバーソフトウェア情報
- **`jdk.json`** - JDK バージョン情報

## 特徴

### 🔄 リアルタイム更新

- JSONファイルを編集すると、**次のAPIリクエスト時に自動的に反映**されます
- サーバーの再起動は**不要**です
- データの追加・更新が即座に反映されるため、開発・運用が容易です

### 📝 編集方法

JSONファイルを直接編集してください：

```bash
# Minecraftサーバー情報の編集
vim backend/data/servers.json

# JDK情報の編集
vim backend/data/jdk.json
```

編集後、保存するだけで次回のAPIリクエストから新しいデータが返されます。

## servers.json

Minecraft サーバーソフトウェアの情報を定義します。

### スキーマ構造

```json
[
  {
    "name": "サーバー名（例: Vanilla, Forge, Fabric, Paper）",
    "versions": [
      {
        "version": "Minecraftバージョン（例: 1.20.1）",
        "jdk": "必要なJDKバージョン（例: 17）",
        "downloadUrl": "ダウンロードURL"
      }
    ]
  }
]
```

### 例: 新しいサーバータイプを追加

```json
{
  "name": "Spigot",
  "versions": [
    {
      "version": "1.20.1",
      "jdk": "17",
      "downloadUrl": "https://example.com/spigot/1.20.1/spigot.jar"
    }
  ]
}
```

### 例: 既存サーバーに新バージョンを追加

Vanillaに1.20.4を追加：

```json
{
  "name": "Vanilla",
  "versions": [
    {
      "version": "1.20.4",
      "jdk": "17",
      "downloadUrl": "https://example.com/vanilla/1.20.4/server.jar"
    }
  ]
}
```

## jdk.json

JDK バージョンの情報を定義します。

### スキーマ構造

```json
[
  {
    "version": "JDKバージョン（例: 17, 21）",
    "downloads": [
      {
        "os": "windows | linux | macos",
        "downloadUrl": "ダウンロードURL"
      }
    ],
    "vendor": "ベンダー名（任意）",
    "isLTS": true または false（LTS版かどうか）
  }
]
```

### 例: 新しいJDKバージョンを追加

JDK 23を追加：

```json
{
  "version": "23",
  "downloads": [
    {
      "os": "windows",
      "downloadUrl": "https://example.com/jdk/23/jdk-23-windows-x64.zip"
    },
    {
      "os": "linux",
      "downloadUrl": "https://example.com/jdk/23/jdk-23-linux-x64.tar.gz"
    },
    {
      "os": "macos",
      "downloadUrl": "https://example.com/jdk/23/jdk-23-macos-x64.dmg"
    }
  ],
  "vendor": "Oracle",
  "isLTS": false
}
```

## API エンドポイント

### サーバー情報取得

```bash
# 全サーバー情報を取得
GET /api/v1/servers

# レスポンス例
{
  "success": true,
  "data": [ /* servers.jsonの内容 */ ],
  "timestamp": "2025-10-20T12:00:00.000Z"
}
```

### JDK情報取得

```bash
# 全JDK情報を取得
GET /api/v1/jdk

# レスポンス例
{
  "success": true,
  "data": [ /* jdk.jsonの内容 */ ],
  "timestamp": "2025-10-20T12:00:00.000Z"
}
```

## データ検証

### JSON構文チェック

```bash
# JSONファイルの構文が正しいか確認
jq . backend/data/servers.json
jq . backend/data/jdk.json
```

### TypeScript型チェック

TypeScriptの型定義に従っているため、ビルド時に型エラーが検出されます：

```bash
npm run build
```

型エラーがある場合は、ビルドが失敗するので安心です。

## バックアップ

データファイルは定期的にバックアップすることを推奨します：

```bash
# バックアップを作成
cp backend/data/servers.json backend/data/servers.json.backup
cp backend/data/jdk.json backend/data/jdk.json.backup

# タイムスタンプ付きバックアップ
cp backend/data/servers.json backend/data/servers.json.$(date +%Y%m%d)
```

## トラブルシューティング

### JSON形式エラー

JSONファイルの構文エラーがあると、APIが500エラーを返します。

**エラーログの確認:**
```
Failed to load servers.json: SyntaxError: Unexpected token...
```

**解決方法:**
1. JSONファイルの構文を確認（カンマ、括弧、引用符など）
2. `jq`コマンドで検証
3. バックアップから復元

### データが反映されない

JSONファイルを編集してもデータが反映されない場合：

1. **ファイルパスの確認**: `backend/data/` ディレクトリに正しく配置されているか
2. **JSON構文の確認**: 構文エラーがないか
3. **キャッシュのクリア**: ブラウザのキャッシュをクリア
4. **サーバーログの確認**: エラーメッセージがないか確認

## 注意事項

1. **JSON構文の厳守**: JSON形式を正確に守ってください（末尾カンマ禁止、ダブルクォート必須など）
2. **型整合性**: TypeScriptの型定義に従ったデータを入力してください
3. **URLの有効性**: ダウンロードURLは有効なものを設定してください
4. **バージョン表記**: 文字列形式で記述してください（例: `"17"`, `"1.20.1"`）
5. **ファイル保存**: UTF-8形式で保存してください

## 参考リンク

- [API仕様書](../docs/API.md)
- [JDK API仕様書](../docs/JDK_API.md)
- [型定義](../types/)

# Minecraft Server API Documentation

このAPIは、Minecraftサーバーの種類・バージョン・対応JDK・ダウンロードリンクなどの情報を提供します。

## 📋 目次

- [概要](#概要)
- [エンドポイント](#エンドポイント)
- [データスキーマ](#データスキーマ)
- [使用例](#使用例)

---

## 概要

Minecraft サーバーのセットアップを支援するための情報提供APIです。以下の情報を取得できます：

- サーバーソフトウェアの種類（Vanilla、Forge、Fabric、Paperなど）
- 各ソフトウェアの対応バージョン
- 必要なJDKバージョン
- ダウンロードURL

---

## エンドポイント

### `GET /api/servers`

すべてのサーバーソフトウェア情報を取得します。

#### リクエスト

```http
GET /api/servers HTTP/1.1
Host: localhost:3000
```

#### レスポンス

**成功時 (200 OK)**

```json
{
  "success": true,
  "data": [
    {
      "name": "Vanilla",
      "versions": [
        {
          "version": "1.12.2",
          "jdk": "8",
          "downloadUrl": "https://example.com/vanilla/1.12.2/server.jar"
        },
        {
          "version": "1.16.5",
          "jdk": "11",
          "downloadUrl": "https://example.com/vanilla/1.16.5/server.jar"
        }
      ]
    },
    {
      "name": "Forge",
      "versions": [
        {
          "version": "1.12.2",
          "jdk": "8",
          "downloadUrl": "https://example.com/forge/1.12.2/forge-installer.jar"
        }
      ]
    }
  ],
  "timestamp": "2025-10-19T15:00:00.000Z"
}
```

**エラー時 (500 Internal Server Error)**

```json
{
  "success": false,
  "error": {
    "message": "サーバーエラーが発生しました",
    "code": "INTERNAL_ERROR"
  },
  "timestamp": "2025-10-19T15:00:00.000Z"
}
```

---

### `GET /api/servers/:name` (将来実装予定)

特定のサーバーソフトウェア情報を取得します。

#### パラメータ

- `name` (string): サーバーソフトウェア名（例: "Vanilla", "Forge"）

#### 例

```http
GET /api/servers/Vanilla HTTP/1.1
Host: localhost:3000
```

---

### `GET /api/servers/version/:version` (将来実装予定)

特定のMinecraftバージョンに対応するサーバーソフトウェアを取得します。

#### パラメータ

- `version` (string): Minecraftバージョン（例: "1.16.5"）

---

## データスキーマ

### `ServerVersion`

単一のサーバーバージョン情報を表します。

```typescript
interface ServerVersion {
  version: string;      // Minecraft のバージョン番号
  jdk: string;          // 対応する JDK バージョン
  downloadUrl: string;  // サーバーJarなどのダウンロードURL
}
```

### `ServerSoftware`

サーバーソフトウェアとその対応バージョン一覧を表します。

```typescript
interface ServerSoftware {
  name: string;                // サーバーソフトウェア名
  versions: ServerVersion[];   // 対応するバージョンの配列
}
```

### `ServerSchema`

APIが返すデータの全体構造です。

```typescript
type ServerSchema = ServerSoftware[];
```

---

## 使用例

### cURL

```bash
# すべてのサーバー情報を取得
curl http://localhost:3000/api/servers

# JSONを整形して表示
curl http://localhost:3000/api/servers | jq '.'
```

### JavaScript (Fetch API)

```javascript
// すべてのサーバー情報を取得
fetch('http://localhost:3000/api/servers')
  .then(response => response.json())
  .then(data => {
    console.log('サーバー情報:', data.data);
  })
  .catch(error => {
    console.error('エラー:', error);
  });
```

### TypeScript

```typescript
import type { ServerApiResponse } from './types/server.types';

async function getServers(): Promise<ServerApiResponse> {
  const response = await fetch('http://localhost:3000/api/servers');
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return await response.json();
}

// 使用例
getServers()
  .then(result => {
    console.log('取得成功:', result.data);
  })
  .catch(error => {
    console.error('取得失敗:', error);
  });
```

### Python (requests)

```python
import requests

# すべてのサーバー情報を取得
response = requests.get('http://localhost:3000/api/servers')
data = response.json()

if data['success']:
    servers = data['data']
    for server in servers:
        print(f"Server: {server['name']}")
        for version in server['versions']:
            print(f"  - Version: {version['version']}, JDK: {version['jdk']}")
```

---

## サポートされるサーバーソフトウェア

現在、以下のサーバーソフトウェアをサポートしています：

- **Vanilla**: 公式のMinecraftサーバー
- **Forge**: MOD対応サーバー（大規模MOD向け）
- **Fabric**: MOD対応サーバー（軽量・高速）
- **Paper**: パフォーマンス最適化サーバー

---

## JDKバージョン対応表

| Minecraft Version | 推奨JDK |
|-------------------|---------|
| 1.12.2 以前       | JDK 8   |
| 1.13.x - 1.16.5   | JDK 11  |
| 1.17.x - 1.20.x   | JDK 17  |
| 1.21.x 以降       | JDK 21  |

---

## 注意事項

1. **サンプルデータ**: 現在のダウンロードURLはサンプルです。実際の使用時には正規のURLに置き換えてください。
2. **バージョン更新**: Minecraft��新バージョンリリース時にはデータの更新が必要です。
3. **レート制限**: 現在レート制限はありませんが、本番環境では実装を推奨します。

---

## 今後の実装予定

- [ ] 特定のサーバーソフトウェア取得エンドポイント
- [ ] バージョンでのフィルタリング機能
- [ ] JDKバージョンでのフィルタリング機能
- [ ] ページネーション
- [ ] キャッシング機能
- [ ] 外部API連携（公式ダウンロードURLの自動取得）

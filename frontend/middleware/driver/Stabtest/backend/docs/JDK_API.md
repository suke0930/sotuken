# JDK Distribution API Documentation

このAPIは、JDK（Java Development Kit）のバージョン情報、OS別ダウンロードリンク、ベンダー情報などを提供します。

## 📋 目次

- [概要](#概要)
- [エンドポイント](#エンドポイント)
- [データスキーマ](#データスキーマ)
- [使用例](#使用例)

---

## 概要

Minecraft サーバーに必要なJDKのダウンロードとインストールを支援するための情報提供APIです。以下の情報を取得できます：

- JDKバージョン（8, 11, 17, 21等）
- OS別のダウンロードURL（Windows, Linux, macOS）
- ベンダー情報（AdoptOpenJDK, Eclipse Temurin等）
- LTS（長期サポート）版の判定

---

## エンドポイント

### `GET /api/jdk`

すべてのJDKバージョン情報を取得します。

#### リクエスト

```http
GET /api/jdk HTTP/1.1
Host: localhost:3000
```

#### レスポンス

**成功時 (200 OK)**

```json
{
  "success": true,
  "data": [
    {
      "version": "8",
      "downloads": [
        {
          "os": "windows",
          "downloadUrl": "https://example.com/jdk/8/jdk-8-windows-x64.zip"
        },
        {
          "os": "linux",
          "downloadUrl": "https://example.com/jdk/8/jdk-8-linux-x64.tar.gz"
        },
        {
          "os": "macos",
          "downloadUrl": "https://example.com/jdk/8/jdk-8-macos-x64.dmg"
        }
      ],
      "vendor": "AdoptOpenJDK",
      "isLTS": true
    },
    {
      "version": "17",
      "downloads": [
        {
          "os": "windows",
          "downloadUrl": "https://example.com/jdk/17/jdk-17-windows-x64.zip"
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

### `GET /api/jdk/:version` (将来実装予定)

特定のJDKバージョン情報を取得します。

#### パラメータ

- `version` (string): JDKバージョン（例: "17", "21"）

#### 例

```http
GET /api/jdk/17 HTTP/1.1
Host: localhost:3000
```

#### レスポンス

```json
{
  "success": true,
  "data": {
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
  },
  "timestamp": "2025-10-19T15:30:00.000Z"
}
```

---

### `GET /api/jdk/:version/:os` (将来実装予定)

特定のJDKバージョンと特定のOSのダウンロードURLを取得します。

#### パラメータ

- `version` (string): JDKバージョン（例: "17"）
- `os` (string): OS種類（"windows", "linux", "macos"）

#### 例

```http
GET /api/jdk/17/windows HTTP/1.1
Host: localhost:3000
```

#### レスポンス

```json
{
  "success": true,
  "data": {
    "version": "17",
    "os": "windows",
    "downloadUrl": "https://example.com/jdk/17/jdk-17-windows-x64.zip"
  },
  "timestamp": "2025-10-19T15:30:00.000Z"
}
```

---

### `GET /api/jdk/lts` (将来実装予定)

LTS（長期サポート）版のJDKのみを取得します。

#### 例

```http
GET /api/jdk/lts HTTP/1.1
Host: localhost:3000
```

---

## データスキーマ

### `JDKDownload`

OS別のJDKダウンロード情報を表します。

```typescript
interface JDKDownload {
  os: 'windows' | 'linux' | 'macos';  // 対応OS
  downloadUrl: string;                 // ダウンロードURL
  fileSize?: number;                   // ファイルサイズ（バイト）
  sha256?: string;                     // SHA-256チェックサム
}
```

### `JDKVersion`

JDKバージョン情報とダウンロードリンク一覧を表します。

```typescript
interface JDKVersion {
  version: string;              // JDKバージョン
  downloads: JDKDownload[];     // OS別のダウンロード情報
  releaseDate?: string;         // リリース日
  vendor?: string;              // ベンダー名
  isLTS?: boolean;              // LTS版かどうか
}
```

### `JDKSchema`

API全体で使用されるスキーマです。

```typescript
type JDKSchema = JDKVersion[];
```

---

## 使用例

### cURL

```bash
# すべてのJDK情報を取得
curl http://localhost:3000/api/jdk

# JSONを整形して表示
curl http://localhost:3000/api/jdk | jq '.'

# 特定のバージョンを取得（将来実装）
curl http://localhost:3000/api/jdk/17

# 特定のバージョンとOSを指定（将来実装）
curl http://localhost:3000/api/jdk/17/windows
```

### JavaScript (Fetch API)

```javascript
// すべてのJDK情報を取得
fetch('http://localhost:3000/api/jdk')
  .then(response => response.json())
  .then(data => {
    console.log('JDK情報:', data.data);
    
    // Windows向けのJDK 17を探す
    const jdk17 = data.data.find(jdk => jdk.version === '17');
    const windowsDownload = jdk17?.downloads.find(d => d.os === 'windows');
    console.log('JDK 17 Windows URL:', windowsDownload?.downloadUrl);
  })
  .catch(error => {
    console.error('エラー:', error);
  });
```

### TypeScript

```typescript
import type { JDKApiResponse, OSType } from './types/jdk.types';

async function getJDKs(): Promise<JDKApiResponse> {
  const response = await fetch('http://localhost:3000/api/jdk');
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return await response.json();
}

async function getJDKDownloadUrl(
  version: string,
  os: OSType
): Promise<string | undefined> {
  const result = await getJDKs();
  const jdk = result.data.find((j) => j.version === version);
  const download = jdk?.downloads.find((d) => d.os === os);
  return download?.downloadUrl;
}

// 使用例
getJDKDownloadUrl('17', 'windows')
  .then(url => console.log('Download URL:', url))
  .catch(error => console.error('Error:', error));
```

### Python (requests)

```python
import requests

# すべてのJDK情報を取得
response = requests.get('http://localhost:3000/api/jdk')
data = response.json()

if data['success']:
    jdks = data['data']
    for jdk in jdks:
        print(f"JDK Version: {jdk['version']}")
        if jdk.get('isLTS'):
            print("  -> LTS版")
        for download in jdk['downloads']:
            print(f"  - {download['os']}: {download['downloadUrl']}")
```

---

## サポートされるJDKバージョン

現在、以下のJDKバージョンをサポートしています：

| バージョン | LTS | 推奨用途 | ベンダー例 |
|-----------|-----|---------|-----------|
| JDK 8     | ✅  | Minecraft 1.12.2 以前 | AdoptOpenJDK |
| JDK 11    | ✅  | Minecraft 1.13.x - 1.16.5 | AdoptOpenJDK |
| JDK 17    | ✅  | Minecraft 1.17.x - 1.20.x | Eclipse Temurin |
| JDK 21    | ✅  | Minecraft 1.21.x 以降 | Eclipse Temurin |

---

## OS別ファイル形式

| OS | ファイル形式 | 備考 |
|----|-------------|------|
| Windows | `.zip` | 解凍後、`bin/java.exe` を使用 |
| Linux | `.tar.gz` | 解凍後、`bin/java` を使用 |
| macOS | `.dmg` または `.tar.gz` | インストーラー付き |

---

## 推奨JDKベンダー

### Eclipse Temurin (旧 AdoptOpenJDK)
- **URL**: https://adoptium.net/
- **特徴**: オープンソース、無償、商用利用可能
- **推奨**: ✅ 最もおすすめ

### Amazon Corretto
- **URL**: https://aws.amazon.com/corretto/
- **特徴**: AWS提供、長期サポート、無償
- **推奨**: ✅ AWSユーザーに最適

### Azul Zulu
- **URL**: https://www.azul.com/downloads/
- **特徴**: 商用サポートあり、幅広いプラットフォーム対応
- **推奨**: ⭐ エンタープライズ向け

### Oracle JDK
- **URL**: https://www.oracle.com/java/technologies/downloads/
- **特徴**: 公式、商用利用に注意が必要
- **推奨**: ⚠️ ライセンス確認が必要

---

## 注意事項

1. **サンプルデータ**: 現在のダウンロードURLはサンプルです。実際の使用時には正規のURLに置き換えてください。
2. **ライセンス**: 各ベンダーのライセンス条項を確認してください。
3. **セキュリティ**: ダウンロード時にはSHA-256チェックサムで検証することを推奨します。
4. **アーキテクチャ**: 現在はx64のみを想定していますが、ARM対応も検討中です。

---

## 今後の実装予定

- [ ] 特定のJDKバージョン取得エンドポイント
- [ ] OS別フィルタリング機能
- [ ] ベンダー別フィルタリング機能
- [ ] LTS版のみ取得エンドポイント
- [ ] ARM64アーキテクチャ対応
- [ ] ファイルサイズとチェックサム情報の追加
- [ ] 自動更新機能（外部API連携）

# JDK データスキーマドキュメント

## 概要

JDK配布管理APIで使用される型定義とデータスキーマについて説明します。

---

## 型定義

### `JDKDownload`

OS別のJDKダウンロード情報を表すインターフェース。

```typescript
export interface JDKDownload {
  /** 対応OS */
  os: 'windows' | 'linux' | 'macos';
  
  /** ダウンロードURL */
  downloadUrl: string;
  
  /** ファイルサイズ（オプション、バイト単位） */
  fileSize?: number;
  
  /** SHA-256チェックサム（オプション） */
  sha256?: string;
}
```

#### フィールド詳細

| フィールド | 型 | 必須 | 説明 | 例 |
|-----------|----|----|------|-----|
| `os` | `'windows' \| 'linux' \| 'macos'` | ✅ | 対応するOS | "windows" |
| `downloadUrl` | string | ✅ | JDKのダウンロードURL | "https://..." |
| `fileSize` | number | ❌ | ファイルサイズ（バイト） | 195842560 |
| `sha256` | string | ❌ | SHA-256チェックサム | "a1b2c3..." |

---

### `JDKVersion`

JDKバージョン情報とダウンロードリンク一覧を表すインターフェース。

```typescript
export interface JDKVersion {
  /** JDKバージョン（例: "8", "11", "17", "21"） */
  version: string;
  
  /** OS別のダウンロード情報 */
  downloads: JDKDownload[];
  
  /** リリース日（オプション） */
  releaseDate?: string;
  
  /** ベンダー名（オプション） */
  vendor?: string;
  
  /** 長期サポート版かどうか（オプション） */
  isLTS?: boolean;
}
```

#### フィールド詳細

| フィールド | 型 | 必須 | 説明 | 例 |
|-----------|----|----|------|-----|
| `version` | string | ✅ | JDKのバージョン番号 | "17" |
| `downloads` | JDKDownload[] | ✅ | OS別ダウンロード情報の配列 | `[{...}]` |
| `releaseDate` | string | ❌ | リリース日（ISO 8601形式） | "2021-09-14" |
| `vendor` | string | ❌ | ベンダー名 | "Eclipse Temurin" |
| `isLTS` | boolean | ❌ | LTS版かどうか | true |

---

### `JDKSchema`

API全体で使用されるスキーマ。複数のJDKバージョンを含む配列。

```typescript
export type JDKSchema = JDKVersion[];
```

---

### `JDKApiResponse`

API成功レスポンスの型定義。

```typescript
export interface JDKApiResponse {
  success: boolean;
  data: JDKSchema;
  timestamp: string;
}
```

#### フィールド詳細

| フィールド | 型 | 説明 | 例 |
|-----------|----|----|-----|
| `success` | boolean | リクエストの成功可否 | `true` |
| `data` | JDKSchema | JDK情報の配列 | `[{...}]` |
| `timestamp` | string | レスポンス生成時刻 | "2025-10-19T15:30:00.000Z" |

---

### `JDKQuery`

JDK検索クエリの型定義。

```typescript
export interface JDKQuery {
  version?: string;
  os?: 'windows' | 'linux' | 'macos';
  vendor?: string;
}
```

---

### `JDKDownloadResponse`

特定のJDKダウンロード詳細レスポンス。

```typescript
export interface JDKDownloadResponse {
  success: boolean;
  data: {
    version: string;
    os: string;
    downloadUrl: string;
    fileSize?: number;
    sha256?: string;
  };
  timestamp: string;
}
```

---

### ユーティリティ型と関数

#### `OSType`

```typescript
export type OSType = 'windows' | 'linux' | 'macos';
```

#### `isValidOS()`

OS型のバリデーション関数。

```typescript
export function isValidOS(os: string): os is OSType {
  return os === 'windows' || os === 'linux' || os === 'macos';
}
```

#### `isValidJDKVersion()`

JDKバージョンのバリデーション関数。

```typescript
export function isValidJDKVersion(version: string): boolean {
  return /^\d+(\.\d+)?$/.test(version);
}
```

---

## データサンプル

### 完全な例

```json
{
  "success": true,
  "data": [
    {
      "version": "17",
      "downloads": [
        {
          "os": "windows",
          "downloadUrl": "https://example.com/jdk/17/jdk-17-windows-x64.zip",
          "fileSize": 195842560,
          "sha256": "a1b2c3d4e5f6..."
        },
        {
          "os": "linux",
          "downloadUrl": "https://example.com/jdk/17/jdk-17-linux-x64.tar.gz",
          "fileSize": 182456320,
          "sha256": "f6e5d4c3b2a1..."
        },
        {
          "os": "macos",
          "downloadUrl": "https://example.com/jdk/17/jdk-17-macos-x64.dmg",
          "fileSize": 198765432,
          "sha256": "1a2b3c4d5e6f..."
        }
      ],
      "vendor": "Eclipse Temurin",
      "isLTS": true,
      "releaseDate": "2021-09-14"
    }
  ],
  "timestamp": "2025-10-19T15:30:00.000Z"
}
```

---

## バリデーション規則

### `version` フィールド

- **形式**: メジャーバージョン番号（数字のみ）または 数字.数字
- **パターン**: `^\d+(\.\d+)?$`
- **例**: 
  - ✅ "8"
  - ✅ "11"
  - ✅ "17"
  - ✅ "21"
  - ✅ "17.0"
  - ❌ "JDK 17" (接頭辞不要)
  - ❌ "17.0.1" (マイナーバージョンまで)

### `os` フィールド

- **形式**: 固定文字列リテラル
- **有効な値**: `"windows"`, `"linux"`, `"macos"`
- **例**:
  - ✅ "windows"
  - ✅ "linux"
  - ✅ "macos"
  - ❌ "win" (省略形不可)
  - ❌ "Windows" (小文字のみ)
  - ❌ "mac" ("macos"を使用)

### `downloadUrl` フィールド

- **形式**: 有効なHTTP/HTTPS URL
- **パターン**: `^https?://.*\.(zip|tar\.gz|dmg)$`
- **例**:
  - ✅ "https://example.com/jdk-17-windows.zip"
  - ✅ "https://files.example.com/jdk-17.tar.gz"
  - ✅ "https://example.com/jdk-17.dmg"
  - ❌ "example.com/jdk.zip" (プロトコル必須)
  - ❌ "ftp://example.com/jdk.zip" (HTTP/HTTPS のみ)

### `vendor` フィールド

- **形式**: 文字列（英数字とスペース、ハイフン）
- **推奨値**: 
  - "Eclipse Temurin"
  - "AdoptOpenJDK"
  - "Amazon Corretto"
  - "Azul Zulu"
  - "Oracle"
- **例**:
  - ✅ "Eclipse Temurin"
  - ✅ "Amazon Corretto"
  - ❌ "" (空文字列不可)

### `fileSize` フィールド

- **形式**: 正の整数（バイト単位）
- **範囲**: 1 〜 2147483647 (2GB)
- **例**:
  - ✅ 195842560 (約 186.7 MB)
  - ❌ 0 (正の値が必要)
  - ❌ -100 (負の値不可)

### `sha256` フィールド

- **形式**: 64文字の16進数文字列
- **パターン**: `^[a-f0-9]{64}$`
- **例**:
  - ✅ "a1b2c3d4e5f6789012345678901234567890123456789012345678901234abcd"
  - ❌ "a1b2c3" (64文字必要)
  - ❌ "g1h2i3..." (16進数のみ: 0-9, a-f)

---

## ヘルパー関数

`lib/jdkSampleData.ts` には以下のヘルパー関数が用意されています：

### `findJDKByVersion(version: string)`

特定のJDKバージョンを検索します。

```typescript
const jdk17 = findJDKByVersion('17');
console.log(jdk17?.vendor); // "Eclipse Temurin"
```

### `findJDKsByOS(os: OSType)`

特定のOSに対応するJDKを検索します。

```typescript
const windowsJDKs = findJDKsByOS('windows');
console.log(windowsJDKs.length); // Windows対応JDK数
```

### `getLTSVersions()`

LTS版のJDKのみを取得します。

```typescript
const ltsVersions = getLTSVersions();
ltsVersions.forEach(jdk => {
  console.log(`JDK ${jdk.version} (LTS)`);
});
```

### `findJDKsByVendor(vendor: string)`

特定のベンダーのJDKを検索します。

```typescript
const temurinJDKs = findJDKsByVendor('Eclipse Temurin');
```

### `getDownloadUrl(version: string, os: OSType)`

特定のバージョンとOSのダウンロードURLを取得します。

```typescript
const url = getDownloadUrl('17', 'windows');
console.log(url); // "https://example.com/jdk/17/..."
```

### `getLatestLTSVersion()`

最新のLTS JDKバージョンを取得します。

```typescript
const latest = getLatestLTSVersion();
console.log(`最新LTS: JDK ${latest?.version}`);
```

### `getAvailableVersions()`

利用可能なすべてのJDKバージョン番号を取得します。

```typescript
const versions = getAvailableVersions();
console.log(versions); // ["8", "11", "17", "21"]
```

### `getAvailableVendors()`

利用可能なすべてのベンダーを取得します。

```typescript
const vendors = getAvailableVendors();
console.log(vendors); // ["AdoptOpenJDK", "Eclipse Temurin", ...]
```

---

## 拡張性

将来的に以下のフィールドの追加を検討しています：

### `JDKDownload` への追加候補

```typescript
export interface JDKDownloadExtended extends JDKDownload {
  architecture?: 'x64' | 'x86' | 'arm64';  // CPUアーキテクチャ
  fileFormat?: 'zip' | 'tar.gz' | 'dmg';   // ファイル形式
  installerType?: 'archive' | 'installer'; // インストール方法
}
```

### `JDKVersion` への追加候補

```typescript
export interface JDKVersionExtended extends JDKVersion {
  endOfLife?: string;        // サポート終了日
  securityUpdates?: boolean; // セキュリティアップデート提供中か
  javaVersion?: string;      // Java言語バージョン
  changelog?: string;        // 変更履歴URL
}
```

---

## 使用上の注意

1. **型安全性**: TypeScriptの型定義を必ず使用してください
2. **バリデーション**: `isValidOS()`, `isValidJDKVersion()` を使用してください
3. **NULL安全性**: オプショナルフィールドは必ず存在チェックを行ってください
4. **チェックサム検証**: ダウンロード後は `sha256` で検証することを推奨します

---

## 関連ファイル

- 型定義: `backend/types/jdk.types.ts`
- サンプルデータ: `backend/lib/jdkSampleData.ts`
- APIドキュメント: `backend/docs/JDK_API.md`

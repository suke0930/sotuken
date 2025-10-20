# データスキーマドキュメント

## 概要

Minecraft サーバー情報APIで使用される型定義とデータスキーマについて説明します。

---

## 型定義

### `ServerVersion`

単一のMinecraftサーバーバージョン情報を表すインターフェース。

```typescript
export interface ServerVersion {
  /** Minecraft のバージョン番号 (例: "1.12.2", "1.16.5") */
  version: string;
  
  /** 対応する JDK バージョン (例: "8", "11", "17") */
  jdk: string;
  
  /** サーバーJarなどのダウンロードURL */
  downloadUrl: string;
}
```

#### フィールド詳細

| フィールド | 型 | 必須 | 説明 | 例 |
|-----------|----|----|------|-----|
| `version` | string | ✅ | Minecraftのバージョン番号 | "1.20.1" |
| `jdk` | string | ✅ | 対応するJDKバージョン | "17" |
| `downloadUrl` | string | ✅ | サーバーファイルのダウンロードURL | "https://..." |

---

### `ServerSoftware`

Minecraftサーバーソフトウェアとその対応バージョン一覧を表すインターフェース。

```typescript
export interface ServerSoftware {
  /** サーバーソフトウェア名 (例: "Vanilla", "Forge", "Fabric", "Paper") */
  name: string;
  
  /** 対応するバージョンの配列 */
  versions: ServerVersion[];
}
```

#### フィールド詳細

| フィールド | 型 | 必須 | 説明 | 例 |
|-----------|----|----|------|-----|
| `name` | string | ✅ | サーバーソフトウェアの名前 | "Vanilla" |
| `versions` | ServerVersion[] | ✅ | 対応するバージョンの配列 | `[{...}, {...}]` |

---

### `ServerSchema`

API全体で使用されるスキーマ。複数のサーバーソフトウェアを含む配列。

```typescript
export type ServerSchema = ServerSoftware[];
```

---

### `ServerApiResponse`

API成功レスポンスの型定義。

```typescript
export interface ServerApiResponse {
  success: boolean;
  data: ServerSchema;
  timestamp: string;
}
```

#### フィールド詳細

| フィールド | 型 | 説明 | 例 |
|-----------|----|----|-----|
| `success` | boolean | リクエストの成功可否 | `true` |
| `data` | ServerSchema | サーバー情報の配列 | `[{...}]` |
| `timestamp` | string | レスポンス生成時刻（ISO 8601形式） | "2025-10-19T15:00:00.000Z" |

---

### `ErrorResponse`

APIエラーレスポンスの型定義。

```typescript
export interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
  };
  timestamp: string;
}
```

#### フィールド詳細

| フィールド | 型 | 説明 | 例 |
|-----------|----|----|-----|
| `success` | false | 常に `false` | `false` |
| `error.message` | string | エラーメッセージ | "サーバーエラー" |
| `error.code` | string? | エラーコード（オプション） | "INTERNAL_ERROR" |
| `timestamp` | string | レスポンス生成時刻 | "2025-10-19T15:00:00.000Z" |

---

## データサンプル

### 完全な例

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
        },
        {
          "version": "1.20.1",
          "jdk": "17",
          "downloadUrl": "https://example.com/vanilla/1.20.1/server.jar"
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
        },
        {
          "version": "1.20.1",
          "jdk": "17",
          "downloadUrl": "https://example.com/forge/1.20.1/forge-installer.jar"
        }
      ]
    }
  ],
  "timestamp": "2025-10-19T15:00:00.000Z"
}
```

---

## バリデーション規則

### `version` フィールド

- **形式**: セマンティックバージョニング（major.minor.patch）
- **パターン**: `^\d+\.\d+(\.\d+)?$`
- **例**: 
  - ✅ "1.20.1"
  - ✅ "1.16.5"
  - ❌ "1.20" (patchバージョンが推奨)
  - ❌ "v1.20.1" (接頭辞不要)

### `jdk` フィールド

- **形式**: メジャーバージョン番号（文字列）
- **有効な値**: "8", "11", "17", "21"
- **例**:
  - ✅ "17"
  - ❌ "17.0.1" (メジャーバージョンのみ)
  - ❌ "Java 17" (数字のみ)

### `downloadUrl` フィールド

- **形式**: 有効なHTTP/HTTPS URL
- **パターン**: `^https?://.*\.jar$`
- **例**:
  - ✅ "https://example.com/server.jar"
  - ✅ "https://files.example.com/forge-1.20.1-installer.jar"
  - ❌ "example.com/server.jar" (プロトコル必須)
  - ❌ "https://example.com/server" (.jar拡張子推奨)

### `name` フィールド

- **形式**: 英数字とハイフン
- **パターン**: `^[A-Za-z0-9-]+$`
- **推奨値**: "Vanilla", "Forge", "Fabric", "Paper", "Spigot", "Bukkit"
- **例**:
  - ✅ "Vanilla"
  - ✅ "Paper"
  - ❌ "vanilla server" (スペース不可)
  - ❌ "Forge_Mod" (アンダースコア非推奨)

---

## 拡張性

将来的に以下のフィールドの追加を検討しています：

### `ServerVersion` への追加候補

```typescript
export interface ServerVersionExtended extends ServerVersion {
  releaseDate?: string;       // リリース日
  isStable?: boolean;         // 安定版かどうか
  minMemory?: string;         // 最小メモリ要件
  recommendedMemory?: string; // 推奨メモリ要件
  changelog?: string;         // 変更履歴のURL
  sha256?: string;           // ダウンロードファイルのハッシュ値
}
```

### `ServerSoftware` への追加候補

```typescript
export interface ServerSoftwareExtended extends ServerSoftware {
  description?: string;       // ソフトウェアの説明
  homepage?: string;          // 公式サイトURL
  documentation?: string;     // ドキュメントURL
  category?: string;          // カテゴリー（例: "modded", "optimized", "vanilla"）
  isActive?: boolean;         // 現在もメンテナンスされているか
}
```

---

## 使用上の注意

1. **型安全性**: TypeScriptの型定義を必ず使用してください
2. **バリデーション**: 外部からのデータは必ずバリデーションを行ってください
3. **イミュータビリティ**: データの変更は新しいオブジェクトを作成して行ってください
4. **NULL安全性**: オプショナルフィールドは必ず存在チェックを行ってください

---

## 関連ファイル

- 型定義: `backend/types/server.types.ts`
- サンプルデータ: `backend/lib/sampleData.ts`
- APIドキュメント: `backend/docs/API.md`

# FRP Binary Download API

**実装日:** 2025-12-03
**バージョン:** v2.0 (Multi-Platform Support)
**目的:** マルチプラットフォーム対応のFRPバイナリダウンロードURL提供

---

## 概要

Asset ServerにFRPバイナリ配信用のエンドポイントを追加しました。
**複数のOS/アーキテクチャに対応**し、frpcバイナリはGitHub Releasesから直接ダウンロードされます。
Asset Serverは**ダウンロードURL情報のみを返す**軽量な設計です。

### サポートプラットフォーム

| OS | アーキテクチャ | アーカイブ形式 | バイナリ拡張子 |
|----|--------------|--------------|--------------|
| Linux | amd64, arm64 | tar.gz | なし |
| macOS (darwin) | amd64, arm64 | tar.gz | なし |
| Windows | amd64, arm64 | zip | .exe |

---

## API エンドポイント

### 1. `GET /api/assets/frp/binaries`

すべてのサポートされているプラットフォームのバイナリ情報を一覧で返す

**Response:**
```json
{
  "success": true,
  "data": {
    "version": "0.65.0",
    "binaries": [
      {
        "platform": "linux",
        "arch": "amd64",
        "downloadUrl": "https://github.com/fatedier/frp/releases/download/v0.65.0/frp_0.65.0_linux_amd64.tar.gz",
        "version": "0.65.0",
        "extension": "tar.gz",
        "clientBinaryName": "frpc",
        "serverBinaryName": "frps",
        "archivePath": "frp_0.65.0_linux_amd64"
      },
      {
        "platform": "darwin",
        "arch": "arm64",
        "downloadUrl": "https://github.com/fatedier/frp/releases/download/v0.65.0/frp_0.65.0_darwin_arm64.tar.gz",
        "version": "0.65.0",
        "extension": "tar.gz",
        "clientBinaryName": "frpc",
        "serverBinaryName": "frps",
        "archivePath": "frp_0.65.0_darwin_arm64"
      },
      {
        "platform": "windows",
        "arch": "amd64",
        "downloadUrl": "https://github.com/fatedier/frp/releases/download/v0.65.0/frp_0.65.0_windows_amd64.zip",
        "version": "0.65.0",
        "extension": "zip",
        "clientBinaryName": "frpc.exe",
        "serverBinaryName": "frps.exe",
        "archivePath": "frp_0.65.0_windows_amd64"
      }
    ],
    "supportedPlatforms": [
      { "platform": "linux", "arch": "amd64" },
      { "platform": "linux", "arch": "arm64" },
      { "platform": "darwin", "arch": "amd64" },
      { "platform": "darwin", "arch": "arm64" },
      { "platform": "windows", "arch": "amd64" },
      { "platform": "windows", "arch": "arm64" }
    ]
  },
  "timestamp": "2025-12-03T12:00:00.000Z"
}
```

---

### 2. `GET /api/assets/frp/client-binary`

frpcバイナリのダウンロード情報を返す（プラットフォーム指定可能）

**Query Parameters:**
- `platform` (optional): `linux`, `darwin`, `windows` (デフォルト: `linux`)
- `arch` (optional): `amd64`, `arm64` (デフォルト: `amd64`)

**Examples:**
```bash
# Linux amd64 (デフォルト)
GET /api/assets/frp/client-binary

# Windows amd64
GET /api/assets/frp/client-binary?platform=windows&arch=amd64

# macOS ARM64
GET /api/assets/frp/client-binary?platform=darwin&arch=arm64
```

**Response (Linux amd64):**
```json
{
  "success": true,
  "data": {
    "downloadUrl": "https://github.com/fatedier/frp/releases/download/v0.65.0/frp_0.65.0_linux_amd64.tar.gz",
    "version": "0.65.0",
    "platform": "linux",
    "arch": "amd64",
    "binaryName": "frpc",
    "archivePath": "frp_0.65.0_linux_amd64/frpc",
    "extension": "tar.gz",
    "notes": [
      "Download the archive and extract the frpc binary",
      "The frpc binary is located at frp_0.65.0_linux_amd64/frpc within the archive",
      "Make sure to set executable permissions (chmod +x frpc on Unix-like systems)"
    ]
  },
  "timestamp": "2025-12-03T12:00:00.000Z"
}
```

**Response (Windows amd64):**
```json
{
  "success": true,
  "data": {
    "downloadUrl": "https://github.com/fatedier/frp/releases/download/v0.65.0/frp_0.65.0_windows_amd64.zip",
    "version": "0.65.0",
    "platform": "windows",
    "arch": "amd64",
    "binaryName": "frpc.exe",
    "archivePath": "frp_0.65.0_windows_amd64/frpc.exe",
    "extension": "zip",
    "notes": [
      "Download the ZIP archive and extract the frpc.exe binary",
      "The frpc.exe binary is located at frp_0.65.0_windows_amd64/frpc.exe within the archive",
      "Windows Defender may flag the binary - add an exception if needed"
    ]
  },
  "timestamp": "2025-12-03T12:00:00.000Z"
}
```

**Error Response (Unsupported Platform):**
```json
{
  "success": false,
  "error": {
    "message": "Unsupported platform/arch combination: freebsd/amd64",
    "code": "UNSUPPORTED_PLATFORM",
    "supportedPlatforms": [
      { "platform": "linux", "arch": "amd64" },
      { "platform": "linux", "arch": "arm64" },
      { "platform": "darwin", "arch": "amd64" },
      { "platform": "darwin", "arch": "arm64" },
      { "platform": "windows", "arch": "amd64" },
      { "platform": "windows", "arch": "arm64" }
    ]
  },
  "timestamp": "2025-12-03T12:00:00.000Z"
}
```

---

### 3. `GET /api/assets/frp/server-binary`

frpsバイナリのダウンロード情報を返す（同じアーカイブ内）

**Query Parameters:**
- `platform` (optional): `linux`, `darwin`, `windows` (デフォルト: `linux`)
- `arch` (optional): `amd64`, `arm64` (デフォルト: `amd64`)

**Response形式:** `/client-binary`と同じ（`binaryName`が`frps`または`frps.exe`）

---

### 4. `GET /api/assets/frp/info`

FRP関連情報のサマリー

**Response:**
```json
{
  "success": true,
  "data": {
    "version": "0.65.0",
    "releaseUrl": "https://github.com/fatedier/frp/releases/download/v0.65.0",
    "clientBinaryEndpoint": "/api/assets/frp/client-binary",
    "serverBinaryEndpoint": "/api/assets/frp/server-binary",
    "binariesEndpoint": "/api/assets/frp/binaries",
    "description": "FRP (Fast Reverse Proxy) binary distribution endpoints",
    "supportedPlatforms": [
      { "platform": "linux", "arch": "amd64", "extension": "tar.gz" },
      { "platform": "linux", "arch": "arm64", "extension": "tar.gz" },
      { "platform": "darwin", "arch": "amd64", "extension": "tar.gz" },
      { "platform": "darwin", "arch": "arm64", "extension": "tar.gz" },
      { "platform": "windows", "arch": "amd64", "extension": "zip" },
      { "platform": "windows", "arch": "arm64", "extension": "zip" }
    ]
  },
  "timestamp": "2025-12-03T12:00:00.000Z"
}
```

---

## 環境変数設定

**ファイル:** [.env.example](./env.example)

```env
# === FRP Binary Download Configuration ===
# FRP version (used to auto-generate download URLs for all platforms)
FRP_VERSION=0.65.0

# Supported platforms (auto-generated from version):
# - Linux: amd64, arm64
# - macOS (darwin): amd64, arm64
# - Windows: amd64, arm64
# Example URLs:
#   https://github.com/fatedier/frp/releases/download/v0.65.0/frp_0.65.0_linux_amd64.tar.gz
#   https://github.com/fatedier/frp/releases/download/v0.65.0/frp_0.65.0_darwin_arm64.tar.gz
#   https://github.com/fatedier/frp/releases/download/v0.65.0/frp_0.65.0_windows_amd64.zip
```

**重要:** `FRP_VERSION`を変更するだけで、すべてのプラットフォームのURLが自動生成されます。

---

## Docker Compose設定

**ファイル:** [docker-compose.yml](./docker-compose.yml)

```yaml
asset-server:
  environment:
    - NODE_ENV=development
    - PORT=3000
    - FRP_VERSION=${FRP_VERSION:-0.65.0}
```

---

## ミドルウェア統合

### config.ts の更新

**ファイル:** [frontend/middleware/main/lib/frp-manager/src/config.ts](../../frontend/middleware/main/lib/frp-manager/src/config.ts)

```typescript
const baseAssetUrl =
  process.env.FRP_BINARY_BASE_URL || "http://localhost:8080/api/assets/frp";

// 全プラットフォーム対応
function resolveDownloadTargets(baseUrl: string): BinaryDownloadTarget[] {
  return [
    // Linux
    { platform: "linux", arch: "x64",
      url: `${baseUrl}/client-binary?platform=linux&arch=amd64`, fileName: "frpc" },
    { platform: "linux", arch: "arm64",
      url: `${baseUrl}/client-binary?platform=linux&arch=arm64`, fileName: "frpc" },

    // macOS
    { platform: "darwin", arch: "x64",
      url: `${baseUrl}/client-binary?platform=darwin&arch=amd64`, fileName: "frpc" },
    { platform: "darwin", arch: "arm64",
      url: `${baseUrl}/client-binary?platform=darwin&arch=arm64`, fileName: "frpc" },

    // Windows
    { platform: "win32", arch: "x64",
      url: `${baseUrl}/client-binary?platform=windows&arch=amd64`, fileName: "frpc.exe" },
    { platform: "win32", arch: "arm64",
      url: `${baseUrl}/client-binary?platform=windows&arch=arm64`, fileName: "frpc.exe" },
  ];
}
```

### FrpBinaryManager の動作

`FrpBinaryManager.ensureBinary()`は自動的に現在のOS/アーキテクチャを判定し、適切なエンドポイントを呼び出します。

---

## テスト方法

### Asset Server単体テスト

```bash
cd backend/Asset
npm run dev

# 別ターミナルで
# すべてのプラットフォーム一覧
curl http://localhost:3000/api/assets/frp/binaries | jq

# Linux amd64
curl http://localhost:3000/api/assets/frp/client-binary | jq

# Windows amd64
curl "http://localhost:3000/api/assets/frp/client-binary?platform=windows&arch=amd64" | jq

# macOS ARM64
curl "http://localhost:3000/api/assets/frp/client-binary?platform=darwin&arch=arm64" | jq

# サポート情報
curl http://localhost:3000/api/assets/frp/info | jq
```

### Docker環境でのテスト

```bash
cd backend/Docker

# .envファイルを作成
cp .env.example .env

# FRP_VERSIONを確認・編集
# FRP_VERSION=0.65.0

# コンテナ起動
docker-compose up -d asset-server

# APIテスト
curl http://localhost:8080/api/assets/frp/binaries | jq '.data.binaries[] | {platform, arch, downloadUrl}'
```

---

## バージョン変更方法

### 新しいバージョンを使用する場合

1. `.env`ファイルを編集:
```env
FRP_VERSION=0.66.0
```

2. コンテナを再起動:
```bash
docker-compose restart asset-server
```

3. 確認:
```bash
curl http://localhost:8080/api/assets/frp/info | jq '.data.version'
```

すべてのプラットフォームのURLが自動的に新バージョンに更新されます！

---

## 設計の利点

### 1. マルチプラットフォーム対応
- Linux、macOS、Windows の amd64/arm64 を完全サポート
- プラットフォーム判定は自動 or クエリパラメータで明示的指定可能

### 2. バージョン管理の簡素化
- `FRP_VERSION`環境変数1つで全プラットフォームのURL生成
- プラットフォーム毎の個別URL設定不要

### 3. 軽量設計
- Asset Serverはファイルをホスティングせず、URL情報のみ提供
- ストレージ不要、帯域消費なし

### 4. 柔軟性
- クエリパラメータで動的にプラットフォーム指定
- 環境変数で個別URLオーバーライドも可能

### 5. エラーハンドリング
- 未サポートプラットフォームは400エラー
- サポートプラットフォーム一覧を返してユーザーに通知

---

## 実装詳細

### サポートプラットフォーム設定

[backend/Asset/routes/frp.ts](../Asset/routes/frp.ts)

```typescript
const SUPPORTED_PLATFORMS: PlatformConfig[] = [
  { platform: 'linux', arch: 'amd64', extension: 'tar.gz', binaryExtension: '' },
  { platform: 'linux', arch: 'arm64', extension: 'tar.gz', binaryExtension: '' },
  { platform: 'darwin', arch: 'amd64', extension: 'tar.gz', binaryExtension: '' },
  { platform: 'darwin', arch: 'arm64', extension: 'tar.gz', binaryExtension: '' },
  { platform: 'windows', arch: 'amd64', extension: 'zip', binaryExtension: '.exe' },
  { platform: 'windows', arch: 'arm64', extension: 'zip', binaryExtension: '.exe' },
];
```

### URL生成ロジック

```typescript
function generateDownloadUrl(platform: string, arch: string): string {
  const config = getPlatformConfig(platform, arch);
  if (!config) {
    throw new Error(`Unsupported platform: ${platform}/${arch}`);
  }
  return `${FRP_RELEASE_BASE_URL}/frp_${FRP_VERSION}_${platform}_${arch}.${config.extension}`;
}
```

---

## 既知の制限

1. **アーカイブ自動展開なし**
   - 現在はURLのみ提供、展開はミドルウェア側で実装必要

2. **URL検証なし**
   - ダウンロードURLの有効性チェックは未実装
   - 存在しないバージョンでも400エラーにならない

3. **プラットフォーム追加**
   - 新しいプラットフォーム追加は`SUPPORTED_PLATFORMS`配列を編集

---

## 今後の改善案

### 短期
1. ダウンロードURL有効性チェック（GitHub API連携）
2. バイナリハッシュ値の提供（セキュリティ）
3. キャッシング機能（レスポンス高速化）

### 中期
4. アーカイブ自動展開エンドポイント
5. バージョン一覧取得API（GitHub Releases連携）
6. ダウンロード進捗プロキシ機能

### 長期
7. 自動バージョンアップデート通知
8. CDN統合
9. プライベートバイナリリポジトリ対応

---

## まとめ

✅ **実装完了項目:**
- マルチプラットフォーム対応（Linux/macOS/Windows × amd64/arm64）
- クエリパラメータによるプラットフォーム指定
- バージョン環境変数による一元管理
- エラーハンドリングとサポートプラットフォーム一覧
- ミドルウェア側の自動プラットフォーム判定

✅ **動作確認済み:**
- 全6プラットフォームのURL生成
- クエリパラメータによる動的選択
- Windows用.exe拡張子、ZIP形式対応

✅ **準備完了:**
- Docker環境での動作確認可能
- ミドルウェアからの自動ダウンロード実行可能

**次のステップ:** E2Eテストとプロダクション環境設定

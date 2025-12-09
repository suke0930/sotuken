# Assets API Documentation

アセット配信APIは、JDKとMinecraftサーバーソフトウェアの実際のファイルをダウンロード可能にします。

## 📋 目次

- [概要](#概要)
- [エンドポイント](#エンドポイント)
- [FRP バイナリ配布](#frp-バイナリ配布)
- [ディレクトリ構造](#ディレクトリ構造)
- [使用例](#使用例)
- [セキュリティ](#セキュリティ)

---

## 概要

このAPIは、二次配布が許可されているJDKやMinecraftサーバーソフトウェアを直接配信します。

### 特徴
- ✅ ストリーミング配信（大容量ファイル対応）
- ✅ パストラバーサル攻撃対策
- ✅ ダウンロード進捗表示対応
- ✅ 適切なContent-Typeヘッダー
- ✅ ファイル一覧取得機能

---

## エンドポイント

### JDKファイルのダウンロード

```http
GET /api/assets/jdk/{version}/{os}/{filename}
```

#### パラメータ

| パラメータ | 型 | 説明 | 例 |
|-----------|----|----|-----|
| `version` | string | JDKバージョン | `8`, `11`, `17`, `21` |
| `os` | string | OS種類 | `windows`, `linux`, `macos` |
| `filename` | string | ファイル名 | `jdk-17-windows-x64.zip` |

#### 例

```http
GET /api/assets/jdk/17/windows/jdk-17-windows-x64.zip HTTP/1.1
Host: localhost:3000
```

#### レスポンス

**成功時 (200 OK)**

```
Content-Type: application/octet-stream
Content-Disposition: attachment; filename="jdk-17-windows-x64.zip"
Content-Length: 195842560

[バイナリデータ]
```

**ファイルが見つからない場合 (404 Not Found)**

```json
{
  "success": false,
  "error": {
    "message": "ファイルが見つかりません",
    "code": "FILE_NOT_FOUND"
  },
  "timestamp": "2025-10-19T16:00:00.000Z"
}
```

---

### サーバーソフトウェアのダウンロード

```http
GET /api/assets/servers/{type}/{version}/{filename}
```

#### パラメータ

| パラメータ | 型 | 説明 | 例 |
|-----------|----|----|-----|
| `type` | string | サーバー種類 | `vanilla`, `forge`, `fabric`, `paper` |
| `version` | string | Minecraftバージョン | `1.20.1`, `1.16.5` |
| `filename` | string | ファイル名 | `server.jar`, `forge-installer.jar` |

#### 例

```http
GET /api/assets/servers/vanilla/1.20.1/server.jar HTTP/1.1
Host: localhost:3000
```

#### レスポンス

**成功時 (200 OK)**

```
Content-Type: application/java-archive
Content-Disposition: attachment; filename="server.jar"
Content-Length: 52428800

[バイナリデータ]
```

---

### JDKファイル一覧取得

```http
GET /api/assets/list/jdk
```

#### レスポンス

```json
{
  "success": true,
  "data": [
    {
      "path": "8/windows/jdk-8u351-windows-x64.zip",
      "size": 195842560,
      "name": "jdk-8u351-windows-x64.zip"
    },
    {
      "path": "17/linux/jdk-17.0.2-linux-x64.tar.gz",
      "size": 182456320,
      "name": "jdk-17.0.2-linux-x64.tar.gz"
    }
  ],
  "count": 2,
  "timestamp": "2025-10-19T16:00:00.000Z"
}
```

---

### サーバーファイル一覧取得

```http
GET /api/assets/list/servers
```

#### レスポンス

```json
{
  "success": true,
  "data": [
    {
      "path": "vanilla/1.20.1/server.jar",
      "size": 52428800,
      "name": "server.jar"
    },
    {
      "path": "forge/1.20.1/forge-1.20.1-installer.jar",
      "size": 10485760,
      "name": "forge-1.20.1-installer.jar"
    }
  ],
  "count": 2,
  "timestamp": "2025-10-19T16:00:00.000Z"
}
```

---

## FRP バイナリ配布
GitHub Releases 上の FRP バイナリを指定バージョンで配布します。バージョンは環境変数 `FRP_VERSION`（デフォルト `0.65.0`）で指定されます。

### エンドポイント一覧
| HTTP | パス | 役割 |
| --- | --- | --- |
| GET | `/api/assets/frp/info` | 配布中バージョンとサポートプラットフォームを返却 |
| GET | `/api/assets/frp/binaries` | 利用可能なアーカイブのダウンロード情報を一覧で返却 |
| GET | `/api/assets/frp/client-binary` | `platform` / `arch` で絞り込んだクライアント用バイナリ URL を返却 |
| GET | `/api/assets/frp/server-binary` | `platform` / `arch` で絞り込んだサーバー用バイナリ URL を返却 |

### サポートプラットフォーム
| platform | arch  | extension | binary 備考 |
| --- | --- | --- | --- |
| linux | amd64 / arm64 | tar.gz | `frpc`, `frps` は展開後に `chmod +x` が必要 |
| darwin | amd64 / arm64 | tar.gz | 同上 |
| windows | amd64 / arm64 | zip | 展開後 `frpc.exe` / `frps.exe` を `frp_<ver>_<platform>_<arch>/` 配下から取得 |

### FRP バイナリ一覧
```http
GET /api/assets/frp/binaries
```

#### レスポンス
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
        "clientBinaryName": "frpc",
        "serverBinaryName": "frps",
        "archivePath": "frp_0.65.0_linux_amd64"
      }
    ],
    "supportedPlatforms": [
      { "platform": "linux", "arch": "amd64" }
    ]
  },
  "timestamp": "2025-10-19T16:00:00.000Z"
}
```

### FRP クライアントバイナリ URL
```http
GET /api/assets/frp/client-binary?platform=linux&arch=amd64
```

| クエリ | 必須 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `platform` | 任意 | `linux` | `linux` / `darwin` / `windows` |
| `arch` | 任意 | `amd64` | `amd64` / `arm64` |

#### 成功レスポンス例
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
      "Make sure to set executable permissions (chmod +x frpc on Unix-like systems)"
    ]
  }
}
```

### FRP サーバーバイナリ URL
```http
GET /api/assets/frp/server-binary?platform=linux&arch=amd64
```

- クエリ、エラー応答はクライアントバイナリと同様。`binaryName` が `frps` になります。

### FRP 情報
```http
GET /api/assets/frp/info
```

配布中の FRP バージョン、サポートプラットフォーム、関連エンドポイントへのリンクを返します。

---

## ディレクトリ構造

```
resources/
├── jdk/
│   ├── 8/
│   │   ├── windows/
│   │   │   └── jdk-8u351-windows-x64.zip
│   │   ├── linux/
│   │   │   └── jdk-8u351-linux-x64.tar.gz
│   │   └── macos/
│   │       └── jdk-8u351-macos-x64.dmg
│   ├── 11/
│   ├── 17/
│   └── 21/
│
└── servers/
    ├── vanilla/
    │   ├── 1.12.2/
    │   │   └── server.jar
    │   ├── 1.16.5/
    │   │   └── server.jar
    │   └── 1.20.1/
    │       └── server.jar
    ├── forge/
    ├── fabric/
    └── paper/
```

---

## 使用例

### cURL

```bash
# JDKダウンロード
curl -O http://localhost:3000/api/assets/jdk/17/windows/jdk-17-windows-x64.zip

# サーバーソフトウェアダウンロード
curl -O http://localhost:3000/api/assets/servers/vanilla/1.20.1/server.jar

# ファイル一覧取得
curl http://localhost:3000/api/assets/list/jdk | jq '.'
```

### JavaScript (Fetch API)

```javascript
// ファイル一覧を取得
fetch('http://localhost:3000/api/assets/list/jdk')
  .then(response => response.json())
  .then(data => {
    console.log('利用可能なJDK:', data.data);
  });

// ファイルダウンロード
const downloadUrl = 'http://localhost:3000/api/assets/jdk/17/windows/jdk-17-windows-x64.zip';
const link = document.createElement('a');
link.href = downloadUrl;
link.download = 'jdk-17-windows-x64.zip';
link.click();
```

### Python (requests)

```python
import requests

# ファイル一覧取得
response = requests.get('http://localhost:3000/api/assets/list/servers')
files = response.json()['data']

for file in files:
    print(f"{file['name']} - {file['size']} bytes")

# ファイルダウンロード
url = 'http://localhost:3000/api/assets/servers/vanilla/1.20.1/server.jar'
response = requests.get(url, stream=True)

with open('server.jar', 'wb') as f:
    for chunk in response.iter_content(chunk_size=8192):
        f.write(chunk)
```

---

## セキュリティ

### パストラバーサル攻撃対策

APIは以下の方法でパストラバーサル攻撃を防いでいます：

```typescript
// NG: これは拒否される
GET /api/assets/jdk/../../../etc/passwd

// OK: 正規のパス
GET /api/assets/jdk/17/windows/jdk-17-windows-x64.zip
```

### 実装内容

1. **パス正規化**: `path.resolve()` で絶対パスに変換
2. **ベースディレクトリチェック**: 解決されたパスがベースディレクトリ内にあるか確認
3. **ファイルタイプ検証**: ファイルのみ配信（ディレクトリは拒否）
4. **存在確認**: 存在しないファイルへのアクセスは404エラー

---

## エラーハンドリング

### ファイルが見つからない (404)

```json
{
  "success": false,
  "error": {
    "message": "ファイルが見つかりません",
    "code": "FILE_NOT_FOUND"
  },
  "timestamp": "2025-10-19T16:00:00.000Z"
}
```

### ストリーミングエラー (500)

```json
{
  "success": false,
  "error": {
    "message": "ファイル配信中にエラーが発生しました",
    "code": "STREAMING_ERROR"
  },
  "timestamp": "2025-10-19T16:00:00.000Z"
}
```

---

## パフォーマンス

### ストリーミング配信

大容量ファイルでもメモリ効率的に配信：

- ファイル全体をメモリに読み込まない
- チャンク単位でクライアントに送信
- 複数の同時ダウンロードに対応

### ダウンロード進捗

`Content-Length` ヘッダーにより、クライアント側でダウンロード進捗を表示可能：

```javascript
fetch(url)
  .then(response => {
    const contentLength = response.headers.get('Content-Length');
    const reader = response.body.getReader();
    
    let receivedLength = 0;
    
    while(true) {
      const {done, value} = await reader.read();
      if (done) break;
      
      receivedLength += value.length;
      const progress = (receivedLength / contentLength) * 100;
      console.log(`Progress: ${progress.toFixed(2)}%`);
    }
  });
```

---

## ライセンスと二次配布

### 配布可能なJDK

✅ **Eclipse Temurin (AdoptOpenJDK)**: GPLv2 + Classpath Exception  
✅ **Amazon Corretto**: GPLv2 + Classpath Exception  
✅ **Azul Zulu**: GPLv2 + Classpath Exception

### 配布可能なサーバーソフトウェア

✅ **Vanilla Server**: Minecraft EULA準拠（個人・教育目的）  
✅ **Forge**: LGPLv2.1  
✅ **Fabric**: Apache License 2.0  
✅ **Paper**: GPLv3

---

## 今後の実装予定

- [ ] チェックサム検証（SHA-256）
- [ ] 部分ダウンロード対応（Range requests）
- [ ] ダウンロード統計
- [ ] レート制限
- [ ] キャッシュ制御
- [ ] CDN統合

---

## 注意事項

1. **ディスク容量**: 大容量ファイルを格納するための十分なディスク容量が必要
2. **帯域幅**: 大量のダウンロード要求に備えた帯域幅の確保が必要
3. **ライセンス**: 配布するファイルのライセンスを必ず確認してください
4. **更新**: セキュリティアップデートのため、定期的なファイル更新を推奨

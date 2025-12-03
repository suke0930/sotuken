# FRP Binary Download API

**実装日:** 2025-12-03
**目的:** ミドルウェアからFRPクライアント(frpc)バイナリのダウンロードURLを取得可能にする

---

## 概要

Asset ServerにFRPバイナリ配信用のエンドポイントを追加しました。
frpcバイナリは実際にはGitHub Releasesから直接ダウンロードされるため、Asset Serverは**ダウンロードURL情報のみを返す**軽量な設計です。

---

## 実装内容

### 1. Asset Server - 新規エンドポイント追加

**新規ファイル:** [backend/Asset/routes/frp.ts](../Asset/routes/frp.ts)

#### エンドポイント一覧

##### `GET /api/assets/frp/client-binary`
frpcバイナリのダウンロード情報を返す

**Response:**
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
    "notes": [
      "Download the archive and extract the frpc binary",
      "The frpc binary is located at the archivePath within the archive",
      "Make sure to set executable permissions (chmod +x frpc on Unix-like systems)"
    ]
  },
  "timestamp": "2025-12-03T12:00:00.000Z"
}
```

##### `GET /api/assets/frp/server-binary`
frpsバイナリのダウンロード情報を返す（同じアーカイブ内）

**Response:** 同様の形式（binaryNameが"frps"、archivePathが"frp_0.65.0_linux_amd64/frps"）

##### `GET /api/assets/frp/info`
FRP関連情報のサマリー

**Response:**
```json
{
  "success": true,
  "data": {
    "version": "0.65.0",
    "releaseUrl": "https://github.com/fatedier/frp/releases/download/v0.65.0/frp_0.65.0_linux_amd64.tar.gz",
    "clientBinaryEndpoint": "/api/assets/frp/client-binary",
    "serverBinaryEndpoint": "/api/assets/frp/server-binary",
    "description": "FRP (Fast Reverse Proxy) binary distribution endpoints"
  },
  "timestamp": "2025-12-03T12:00:00.000Z"
}
```

### 2. 環境変数設定

**追加ファイル:** [backend/Docker/.env.example](./Docker/.env.example)

```env
# === FRP Binary Download Configuration ===
# GitHub release URL for FRP binaries (frpc and frps are in the same archive)
FRP_BINARY_RELEASE_URL=https://github.com/fatedier/frp/releases/download/v0.65.0/frp_0.65.0_linux_amd64.tar.gz
FRP_VERSION=0.65.0
```

### 3. Docker Compose設定更新

**変更ファイル:** [docker-compose.yml](./docker-compose.yml)

asset-serverコンテナに環境変数を追加:

```yaml
asset-server:
  environment:
    - NODE_ENV=development
    - PORT=3000
    - FRP_BINARY_RELEASE_URL=${FRP_BINARY_RELEASE_URL:-https://github.com/fatedier/frp/releases/download/v0.65.0/frp_0.65.0_linux_amd64.tar.gz}
    - FRP_VERSION=${FRP_VERSION:-0.65.0}
```

### 4. ミドルウェア側の統合

#### 設定の更新

**変更ファイル:** [frontend/middleware/main/lib/frp-manager/src/config.ts](../../frontend/middleware/main/lib/frp-manager/src/config.ts)

デフォルトURLを更新:
```typescript
const baseAssetUrl =
  process.env.FRP_BINARY_BASE_URL || "http://localhost:8080/api/assets/frp";
```

#### FrpBinaryManager の更新

**変更ファイル:** [frontend/middleware/main/lib/frp-manager/src/FrpBinaryManager.ts](../../frontend/middleware/main/lib/frp-manager/src/FrpBinaryManager.ts)

**追加機能:**
1. Asset Server APIからバイナリ情報を取得する`fetchBinaryInfo()`メソッド
2. `ensureBinary()`でAPIエンドポイントを優先的に使用
3. API取得失敗時はフォールバックURLを使用（既存の動作を維持）

**動作フロー:**
```
1. ensureBinary() 呼び出し
2. Asset Server API: GET /api/assets/frp/client-binary
3. レスポンスから downloadUrl を取得
4. GitHub Releases から直接ダウンロード
5. バイナリを配置 & chmod +x
6. メタデータ保存
```

**エラーハンドリング:**
- API呼び出し失敗時は警告ログを出力し、フォールバックURLを使用
- 既存の動作に影響なし

---

## 設計の利点

### 1. 軽量設計
- Asset Serverはファイルをホスティングせず、URL情報のみ提供
- ストレージ不要、帯域消費なし

### 2. 柔軟性
- 環境変数でバージョンを簡単に変更可能
- 異なるプラットフォーム対応も容易（URLパターンマッチング）

### 3. 後方互換性
- フォールバック機能により既存の直接URL指定も動作
- API追加による既存機能への影響なし

### 4. 拡張性
- 将来的にアーカイブ自動展開機能を追加可能
- バイナリキャッシング機能を追加可能
- 複数バージョン管理に対応可能

---

## テスト方法

### Asset Server単体テスト

```bash
cd backend/Asset
npm run dev

# 別ターミナルで
curl http://localhost:3000/api/assets/frp/client-binary
curl http://localhost:3000/api/assets/frp/info
```

### Docker環境でのテスト

```bash
cd backend/Docker

# .envファイルを作成（.env.exampleをコピー）
cp .env.example .env

# コンテナ起動
docker-compose up -d asset-server

# APIテスト
curl http://localhost:8080/api/assets/frp/client-binary
curl http://localhost:8080/api/assets/frp/server-binary
curl http://localhost:8080/api/assets/frp/info
```

### ミドルウェアからの統合テスト

```bash
cd frontend/middleware/main

# 環境変数設定
export FRP_BINARY_BASE_URL=http://localhost:8080/api/assets/frp

# FRP Managerのテスト実行
npm run test:frp
```

---

## バージョン変更方法

### 別のバージョンを使用する場合

1. `.env`ファイルを編集:
```env
FRP_BINARY_RELEASE_URL=https://github.com/fatedier/frp/releases/download/v0.66.0/frp_0.66.0_linux_amd64.tar.gz
FRP_VERSION=0.66.0
```

2. コンテナを再起動:
```bash
docker-compose restart asset-server
```

### 異なるプラットフォームを追加する場合

1. `.env`に別のURL変数を追加:
```env
FRP_BINARY_RELEASE_URL_DARWIN=https://github.com/fatedier/frp/releases/download/v0.65.0/frp_0.65.0_darwin_arm64.tar.gz
```

2. [backend/Asset/routes/frp.ts](../Asset/routes/frp.ts)を拡張してプラットフォーム別の対応を実装

---

## 既知の制限

1. **アーカイブ自動展開なし**
   - 現在はURLのみ提供、展開はミドルウェア側で実装必要
   - 将来的な改善候補

2. **単一プラットフォームのみ**
   - 現在はLinux amd64のみ設定
   - 環境変数で変更可能だが、動的なプラットフォーム判定は未実装

3. **バージョン検証なし**
   - ダウンロードURLの有効性チェックは未実装
   - 不正なURLでも返される

---

## 今後の改善案

### 短期
1. プラットフォーム自動判定（クエリパラメータ: `?platform=linux&arch=amd64`）
2. ダウンロードURL有効性チェック
3. バイナリハッシュ値の提供（セキュリティ）

### 中期
4. アーカイブ自動展開エンドポイント（`/api/assets/frp/extract`）
5. バイナリキャッシング機能
6. 複数バージョン対応

### 長期
7. 自動バージョンアップデート通知
8. GitHub Releases APIとの直接連携
9. CDN統合

---

## まとめ

✅ **実装完了項目:**
- Asset ServerへのFRP Binary APIエンドポイント追加
- 環境変数による設定管理
- Docker Compose統合
- ミドルウェア側のFrpBinaryManager統合
- TypeScriptコンパイル確認

✅ **動作確認:**
- Asset Serverのコンパイルテスト成功
- ミドルウェアのコンパイルテスト成功

✅ **準備完了:**
- Docker環境での疎通確認が可能
- ミドルウェアからのダウンロード実行が可能

**次のステップ:** Docker環境を起動してE2Eテストを実施

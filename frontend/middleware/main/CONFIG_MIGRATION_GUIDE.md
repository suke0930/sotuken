# 設定ファイル移行ガイド

## 概要

このガイドは、ハードコードされた設定を環境変数ベースの統合設定システムに移行したことについて説明します。

## 変更内容

### 1. 新規ファイル

#### `.env.example`
- 全ての設定項目のテンプレート
- nginxとdocker-composeの設定を参考にした既定値
- 詳細なコメント付き

#### `lib/config/index.ts`
- 統合設定管理システムのメインファイル
- 環境変数の読み込みと検証
- 既存コードとの互換性レイヤー

#### `lib/config/types.ts`
- TypeScriptの型定義
- 全ての設定項目の型安全性を保証

### 2. 変更されたファイル

#### `lib/constants.ts`
- **変更前**: 直接定数を定義
- **変更後**: `lib/config`から再エクスポート
- **影響**: 既存コードは変更不要（後方互換性あり）

#### `lib/api-router.ts`
- **変更前**: `"http://localhost:3000"` がハードコード
- **変更後**: `appConfig.backendApi.url` から取得
- **影響**: 環境変数 `BACKEND_API_URL` で変更可能

#### `lib/frp-manager/src/config.ts`
- **変更前**: 個別に環境変数を参照
- **変更後**: `appConfig.frp` から一括取得
- **影響**: より一貫性のある設定管理

#### `index.ts`
- **変更前**: ハードコードされたパスとポート
- **変更後**: `appConfig` から全て取得
- **起動時**: 設定の検証を自動実行

#### `.gitignore`
- `.env` ファイルを追加（セキュリティ対策）

## 使用方法

### 開発環境のセットアップ

#### 1. `.env`ファイルの作成

```bash
cd frontend/middleware/main
cp .env.example .env
```

#### 2. 設定のカスタマイズ（オプション）

`.env`ファイルを編集して、必要に応じて設定を変更します：

```env
# 例: ポート番号を変更
PORT=13000

# 例: バックエンドURLを変更
BACKEND_API_URL=http://localhost:9000
```

#### 3. サーバーの起動

```bash
npm run dev
```

### Docker環境での使用

Docker環境では、環境変数で設定を上書きします：

```yaml
# docker-compose.yml
services:
  frontend-middleware:
    environment:
      - PORT=12800
      - BACKEND_API_URL=http://asset-server:3000
      - FRP_AUTH_SERVER_URL=http://nginx:80
```

### Nginx経由の推奨設定

Nginx経由でバックエンドにアクセスする場合（推奨）：

```env
# .env
BACKEND_API_URL=http://localhost:8080
FRP_BINARY_BASE_URL=http://localhost:8080/api/assets/frp
FRP_AUTH_SERVER_URL=http://localhost:8080
```

この設定により、フロントエンドミドルウェアは全てNginx経由でバックエンドサービスにアクセスします。

## 設定項目一覧

### サーバー設定
| 環境変数 | 既定値 | 説明 |
|---------|--------|------|
| `PORT` | `12800` | フロントエンドミドルウェアのポート |
| `NODE_ENV` | `development` | 実行環境 |

### バックエンドAPI設定
| 環境変数 | 既定値 | 説明 |
|---------|--------|------|
| `BACKEND_API_URL` | `http://localhost:8080` | バックエンドAPIのURL（Nginx経由を推奨） |
| `BACKEND_API_TIMEOUT` | `300000` | タイムアウト（ミリ秒） |

### FRP設定
| 環境変数 | 既定値 | 説明 |
|---------|--------|------|
| `FRP_BINARY_BASE_URL` | `http://localhost:8080/api/assets/frp` | FRPバイナリのベースURL |
| `FRP_AUTH_SERVER_URL` | `http://localhost:8080` | FRP認証サーバーURL |
| `FRP_SERVER_ADDR` | `127.0.0.1` | FRPサーバーアドレス |
| `FRP_SERVER_PORT` | `7000` | FRPサーバーポート |

完全な設定項目リストは `.env.example` を参照してください。

## トラブルシューティング

### 設定の検証

起動時に設定が自動的に検証されます。エラーがある場合は、ログに詳細が表示されます：

```
ERROR: Configuration validation failed
  - Invalid PORT: 99999 (must be 1-65535)
  - Invalid BACKEND_API_URL: not-a-url (must be a valid URL)
```

### 設定のデバッグ

設定内容を確認するには、環境変数 `DEBUG_CONFIG=true` を設定します：

```bash
DEBUG_CONFIG=true npm run dev
```

これにより、起動時に全ての設定が表示されます（センシティブ情報はマスクされます）。

### よくある問題

#### 1. "BACKEND_API_URL is invalid"

**原因**: URLの形式が正しくない  
**解決**: `http://` または `https://` で始まる完全なURLを指定してください

```env
# NG
BACKEND_API_URL=localhost:3000

# OK
BACKEND_API_URL=http://localhost:3000
```

#### 2. "Cannot connect to backend"

**原因**: バックエンドサーバーが起動していない、またはURLが間違っている  
**解決**: 
1. バックエンドサーバーが起動しているか確認
2. `BACKEND_API_URL` が正しいか確認
3. Dockerを使用している場合は、サービス名を使用（例: `http://asset-server:3000`）

#### 3. "Session secret not persistent"

**原因**: `SESSION_SECRET` が設定されていない  
**解決**: `.env` ファイルに `SESSION_SECRET` を設定

```bash
# SESSION_SECRETを生成
openssl rand -base64 64

# .envに追加
SESSION_SECRET=<生成された値>
```

## 移行チェックリスト

既存の環境を新しい設定システムに移行する際のチェックリスト：

- [ ] `.env.example` を `.env` にコピー
- [ ] 必要な設定をカスタマイズ
- [ ] `npm install` を実行（dotenvパッケージをインストール）
- [ ] サーバーを起動して動作確認
- [ ] ログにエラーがないか確認
- [ ] 全ての機能が正常に動作するか確認
  - [ ] ログイン機能
  - [ ] アセットダウンロード
  - [ ] FRP機能
  - [ ] JDK管理
  - [ ] MCサーバー管理

## Docker環境での移行

### docker-compose.ymlの例

```yaml
version: '3.8'

services:
  frontend-middleware:
    build: ./frontend/middleware/main
    ports:
      - "12800:12800"
    environment:
      # 本番環境用の設定
      - NODE_ENV=production
      - PORT=12800
      
      # バックエンド接続（Docker内部ネットワーク）
      - BACKEND_API_URL=http://nginx:80
      
      # FRP設定（Docker内部ネットワーク）
      - FRP_BINARY_BASE_URL=http://nginx:80/api/assets/frp
      - FRP_AUTH_SERVER_URL=http://nginx:80
      - FRP_SERVER_ADDR=frp-server
      - FRP_SERVER_PORT=7000
      
      # セッション（必ず変更してください）
      - SESSION_SECRET=${SESSION_SECRET}
      
    volumes:
      - ./data/userdata:/app/userdata
    depends_on:
      - nginx
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
```

### 環境変数ファイル (.env.production)

```env
# 本番環境用の環境変数
SESSION_SECRET=<openssl rand -base64 64で生成>
```

起動：

```bash
docker-compose --env-file .env.production up -d
```

## 後方互換性

既存のコードは変更なしで動作します：

```typescript
// 既存のコード - 引き続き動作
import { DEFAULT_SERVER_PORT, SESSION_SECRET } from './lib/constants';

// 新しい推奨方法
import { appConfig } from './lib/config';
const port = appConfig.server.port;
const secret = appConfig.session.secret;
```

ただし、新しいコードでは `appConfig` の使用を推奨します。

## 今後の計画

- [ ] 全ての `constants.ts` の使用を `appConfig` に移行
- [ ] `constants.ts` を非推奨としてマーク
- [ ] 設定のホットリロード機能の追加
- [ ] 設定のスキーマバリデーション強化

## サポート

問題が発生した場合は、以下を確認してください：

1. `.env.example` の内容が最新か
2. 全ての必須環境変数が設定されているか
3. 起動ログにエラーメッセージがないか

---

**更新日**: 2025-12-09  
**バージョン**: 1.0.0

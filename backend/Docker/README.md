# FRP認証システム - Docker実装

**バージョン:** v3.2.0  
**最終更新:** 2025-12-04

Discord OAuth2ベースのFRP (Fast Reverse Proxy) 認証システムのDocker実装です。

---

## 🚀 クイックスタート

### 5分でセットアップ

```bash
# 1. リポジトリに移動
cd backend/Docker

# 2. 環境変数をコピー
cp .env.example .env

# 3. .env を編集（Discord OAuth2設定を追加）
nano .env

# 4. コンテナ起動
docker-compose up -d --build

# 5. 動作確認
curl http://localhost:8080/api/frp/health
```

**詳細:** [📖 クイックスタートガイド](./docs/01-QUICK_START.md)

---

## 📚 ドキュメント

### 初めての方
1. **[クイックスタートガイド](./docs/01-QUICK_START.md)** - 5分でセットアップ
2. **[APIリファレンス](./docs/02-API_REFERENCE.md)** - 全エンドポイント詳細
3. **[アーキテクチャ](./docs/03-ARCHITECTURE.md)** - システム構成と設計

### 開発者向け
- **[ミドルウェア統合ガイド](./docs/04-INTEGRATION_GUIDE.md)** - フロントエンド統合手順
- **[テストクライアント](./test-client/README.md)** - 統合テストツール

### アーカイブ
- [過去の設計書と修正履歴](./docs/archive/) - 参考資料

---

## 🎯 主な機能

### ✅ 実装済み機能

- **Discord OAuth2認証** - ポーリングベース非同期認証
- **JWT認証・認可** - トークンリフレッシュ対応
- **FRP接続管理** - ポート権限・セッション制限
- **マルチプラットフォーム対応** - Linux/macOS/Windows × amd64/arm64
- **FRPバイナリ配信API** - GitHub Releases連携
- **セッション永続化** - コンテナ再起動対応
- **ゴーストセッション同期** - Dashboard API連携

### 📦 システム構成

```
[ユーザー]
    ↓
[Nginx :8080] ─── リバースプロキシ
    ├─► [asset-server :3000] ─── アセット配信・FRPバイナリAPI
    ├─► [frp-authjs :3000] ───── Discord OAuth2・JWT管理
    ├─► [frp-authz :3001] ────── ポート権限・セッション管理
    └─► [frp-server :7000] ───── FRPサーバー本体
```

**詳細:** [🏗️ アーキテクチャドキュメント](./docs/03-ARCHITECTURE.md)

---

## 🔄 バージョン履歴

### v3.2.0 (2025-12-03) - マルチプラットフォーム対応

**新機能:**
- ✅ **FRP Binary API**: 全プラットフォームのバイナリURL自動生成
- ✅ **マルチプラットフォーム**: Linux/macOS/Windows × amd64/arm64完全サポート
- ✅ **ミドルウェア統合**: FrpBinaryManagerの自動プラットフォーム判定

**サポートプラットフォーム:**
| OS | アーキテクチャ | 形式 |
|----|--------------|------|
| Linux | amd64, arm64 | tar.gz |
| macOS | amd64, arm64 | tar.gz |
| Windows | amd64, arm64 | zip |

### v3.1.0 (2025-12-02) - トークン管理強化

- ✅ トークンリフレッシュAPI
- ✅ ユーザー情報API
- ✅ テストクライアント実装
- ✅ セッション永続化・ゴーストセッション対策

### v3.0.0 (2025-12-01) - ポーリング認証

- ✅ GitHub CLI風UX (`gh auth login`スタイル)
- ✅ 完全非同期認証対応
- ✅ 一時トークン管理システム

### v2.0.0 (2025-11-30) - Arctic移行

- ✅ 依存関係削減 (Auth.js → Arctic)
- ✅ API-First設計
- ✅ 完全TypeScript対応

**全履歴:** 過去のバージョン情報は[アーカイブ](./docs/archive/)を参照

---

## 🛠️ 開発モード

```bash
# 開発環境起動（ホットリロード有効）
docker-compose -f docker-compose.dev.yml up -d

# ログ確認
docker-compose -f docker-compose.dev.yml logs -f

# 停止
docker-compose -f docker-compose.dev.yml down
```

**詳細:** [開発環境セットアップ](./docs/01-QUICK_START.md#-開発モード)

---

## 🌐 エンドポイント概要

### 認証API (frp-authjs)
- `POST /api/auth/init` - 認証初期化
- `GET /api/auth/poll` - ポーリング
- `POST /api/auth/refresh` - トークンリフレッシュ
- `GET /api/user/info` - ユーザー情報取得

### FRPバイナリAPI (asset-server)
- `GET /api/assets/frp/binaries` - 全プラットフォーム一覧
- `GET /api/assets/frp/client-binary` - frpcバイナリ情報
- `GET /api/assets/frp/info` - FRP情報サマリー

**完全なAPI仕様:** [📖 APIリファレンス](./docs/02-API_REFERENCE.md)

---

## ⚙️ 環境変数

### 必須設定

```env
# JWT署名鍵
JWT_SECRET=<openssl rand -base64 32で生成>

# Discord OAuth2
DISCORD_CLIENT_ID=<Discord Developer Portalから取得>
DISCORD_CLIENT_SECRET=<Discord Developer Portalから取得>
DISCORD_REDIRECT_URI=http://localhost:8080/api/auth/callback
BASE_URL=http://localhost:8080
```

### オプション設定

```env
# FRPバイナリバージョン
FRP_VERSION=0.65.0

# FRP Dashboard同期
FRP_DASHBOARD_URL=http://frp-server:7500
FRP_DASHBOARD_USER=admin
FRP_DASHBOARD_PASS=admin
```

**全設定項目:** [.env.example](./.env.example) を参照

---

## 👥 ユーザー権限管理

`frp-authz/data/users.json` を編集:

```json
{
  "users": [
    {
      "discordId": "123456789012345678",
      "allowedPorts": [25565, 22, 3000, 8080],
      "maxSessions": 3,
      "createdAt": "2025-12-04T00:00:00Z",
      "updatedAt": "2025-12-04T00:00:00Z"
    }
  ]
}
```

**Discord IDの取得方法:**
1. Discordでデベロッパーモードを有効化
2. 自分のアイコンを右クリック → 「IDをコピー」

---

## 🔍 トラブルシューティング

### よくある問題

**Q: `Invalid OAuth2 redirect URI`エラーが出る**
```
A: Discord Developer PortalのRedirect URIsを確認してください。
   http://localhost:8080/api/auth/callback が登録されているか確認。
```

**Q: コンテナが起動しない**
```bash
# ログを確認
docker-compose logs

# クリーンな状態で再起動
docker-compose down -v
docker-compose up -d --build
```

**Q: ポートが既に使用されている**
```bash
# ポート使用状況を確認
lsof -i :8080

# 既存プロセスを停止してから再起動
```

**詳細:** [🔧 トラブルシューティング](./docs/01-QUICK_START.md#-トラブルシューティング)

---

## 🧪 テスト

### 統合テストクライアント

```bash
cd test-client
npm install
npm start   # デモクライアント実行
npm test    # テストスイート実行
```

### 手動テスト

```bash
# ヘルスチェック
curl http://localhost:8080/api/frp/health

# FRPバイナリ情報
curl http://localhost:8080/api/assets/frp/info

# 認証初期化
curl -X POST http://localhost:8080/api/auth/init \
  -H "Content-Type: application/json" \
  -d '{"fingerprint":"test_fp_123"}'
```

---

## 📁 ディレクトリ構造

```
backend/Docker/
├── docs/                       # 📚 ドキュメント
│   ├── 01-QUICK_START.md
│   ├── 02-API_REFERENCE.md
│   ├── 03-ARCHITECTURE.md
│   ├── 04-INTEGRATION_GUIDE.md
│   └── archive/                # 過去資料
├── docker-compose.yml          # 本番環境設定
├── docker-compose.dev.yml      # 開発環境設定
├── nginx/                      # リバースプロキシ
├── asset-server/               # アセット配信
├── frp-authjs/                 # 認証サービス
├── frp-authz/                  # 認可サービス
├── frp-server/                 # FRPサーバー
├── test-client/                # テストツール
└── AssetServ/                  # データストレージ
```

---

## 🤝 コントリビューション

### 開発フロー

1. Issue を作成（機能提案・バグ報告）
2. ブランチを作成 (`feature/xxx`, `fix/xxx`)
3. 変更を実装
4. テストを実行
5. Pull Request を作成

### コーディング規約

- TypeScript strict モード
- ESLint + Prettier
- Conventional Commits形式

---

## 📄 ライセンス

MIT License

---

## 🔗 関連リンク

- **FRP公式**: https://github.com/fatedier/frp
- **Arctic (OAuth2)**: https://arctic.js.org/
- **Discord Developer Portal**: https://discord.com/developers/applications

---

## 📞 サポート

### ドキュメント
- [クイックスタート](./docs/01-QUICK_START.md)
- [APIリファレンス](./docs/02-API_REFERENCE.md)
- [アーキテクチャ](./docs/03-ARCHITECTURE.md)
- [統合ガイド](./docs/04-INTEGRATION_GUIDE.md)

### 問題報告
- GitHub Issues
- Discord サポートチャンネル（予定）

---

**🎉 ハッピーハッキング！**

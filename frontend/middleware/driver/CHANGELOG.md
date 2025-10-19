# Changelog

## [2025-10-19] - API Server Implementation

### Added

#### Backend API Server
- Minecraftサーバー情報配信API (`GET /api/v1/servers`)
- JDK情報配信API (`GET /api/v1/jdk`)
- ヘルスチェックエンドポイント (`GET /health`)
- Express ベースのREST APIサーバー実装

#### Type Definitions
- `types/server.types.ts` - Minecraftサーバー型定義
  - ServerVersion, ServerSoftware, ServerSchema
  - ServerApiResponse, ErrorResponse
- `types/jdk.types.ts` - JDK型定義
  - JDKDownload, JDKVersion, JDKSchema
  - JDKApiResponse, JDKQuery, JDKDownloadResponse
  - バリデーション関数: isValidOS(), isValidJDKVersion()

#### Sample Data & Helper Functions
- `lib/sampleData.ts` - Minecraftサーバーサンプルデータ
  - 4種類のサーバーソフトウェア (Vanilla, Forge, Fabric, Paper)
  - 合計14バージョンのテストデータ
  - ヘルパー関数: findServerByName(), findServersByVersion(), findServersByJdk()
  
- `lib/jdkSampleData.ts` - JDKサンプルデータ
  - JDK 8, 11, 17, 21 (全てLTS版)
  - Windows/Linux/macOS 対応
  - 9つのヘルパー関数実装

#### Routes & Controllers
- `routes/index.ts` - APIルート統合
- `routes/servers.ts` - サーバー情報ルート
- `routes/jdk.ts` - JDK情報ルート
- `controllers/serversController.ts` - サーバー情報コントローラー
- `controllers/jdkController.ts` - JDK情報コントローラー

#### Application Structure
- `app.ts` - Express アプリケーション設定
  - CORS対応
  - エラーハンドリング
  - 404ハンドラー
- `server.ts` - サーバー起動エントリーポイント
  - Graceful Shutdown 実装
  - ポート3000でリッスン

#### Documentation
- `backend/README.md` - バックエンド概要とディレクトリ構造
- `backend/docs/README.md` - ドキュメント目次
- `backend/docs/QUICKSTART.md` - クイックスタートガイド
- `backend/docs/API.md` - Minecraftサーバー API仕様書
- `backend/docs/JDK_API.md` - JDK API仕様書
- `backend/docs/SCHEMA.md` - サーバースキーマ詳細
- `backend/docs/JDK_SCHEMA.md` - JDKスキーマ詳細

#### Package Scripts
- `npm run api` - APIサーバー起動コマンド追加
- `npm run api:dev` - 開発用APIサーバー起動コマンド追加

### Technical Details

#### API Endpoints
```
GET /health                 - ヘルスチェック
GET /api/v1/servers         - 全Minecraftサーバー情報取得
GET /api/v1/jdk             - 全JDK情報取得
```

#### Data Coverage
- **Minecraftサーバー**: 4種類
  - Vanilla: 4バージョン (1.12.2, 1.16.5, 1.18.2, 1.20.1)
  - Forge: 4バージョン
  - Fabric: 3バージョン
  - Paper: 3バージョン

- **JDK**: 4バージョン
  - JDK 8 (LTS) - Windows/Linux/macOS
  - JDK 11 (LTS) - Windows/Linux/macOS
  - JDK 17 (LTS) - Windows/Linux/macOS
  - JDK 21 (LTS) - Windows/Linux/macOS

#### Features
- ✅ RESTful API設計
- ✅ TypeScript完全型安全
- ✅ CORS対応
- ✅ 統一されたエラーハンドリング
- ✅ ヘルスチェック機能
- ✅ Graceful Shutdown対応
- ✅ 包括的なドキュメント

### File Structure
```
backend/
├── server.ts                         # サーバー起動
├── app.ts                            # Express設定
├── routes/
│   ├── index.ts                      # ルート統合
│   ├── servers.ts                    # サーバールート
│   └── jdk.ts                        # JDKルート
├── controllers/
│   ├── serversController.ts          # サーバーコントローラー
│   └── jdkController.ts              # JDKコントローラー
├── types/
│   ├── server.types.ts               # サーバー型定義
│   └── jdk.types.ts                  # JDK型定義
├── lib/
│   ├── sampleData.ts                 # サーバーサンプルデータ
│   └── jdkSampleData.ts              # JDKサンプルデータ
└── docs/
    ├── README.md                     # メインドキュメント
    ├── QUICKSTART.md                 # クイックスタート
    ├── API.md                        # API仕様
    ├── JDK_API.md                    # JDK API仕様
    ├── SCHEMA.md                     # スキーマ詳細
    └── JDK_SCHEMA.md                 # JDKスキーマ詳細
```

### Testing
- ✅ ヘルスチェック動作確認済み
- ✅ `/api/v1/servers` レスポンス検証済み
- ✅ `/api/v1/jdk` レスポンス検証済み
- ✅ CORS動作確認済み
- ✅ エラーハンドリング動作確認済み

### Dependencies
- express: ^5.1.0
- typescript: ^5.9.2
- @types/express: ^5.0.3
- @types/node: ^24.5.0

### Next Steps
- [ ] 特定リソース取得エンドポイント実装 (GET /api/v1/servers/:name)
- [ ] クエリパラメータによるフィルタリング機能
- [ ] バリデーションスキーマ (Zod) の追加
- [ ] 外部API連携 (実際のダウンロードURL取得)
- [ ] データベース統合
- [ ] 認証・認可機能
- [ ] レート制限の実装
- [ ] ロギング機能の強化

### Notes
- サンプルデータのダウンロードURLは仮のものです
- 本番環境ではCORS設定の見直しが必要です
- 現在はインメモリデータを使用していますが、将来的にはデータベース統合を推奨します

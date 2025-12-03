# FRP Manager Library (Draft)

FRP クライアント (`frpc`) をミドルウェア側で管理するためのオーケストレーション層です。  
`FrpManagerAPP` を経由して、認証・バイナリ管理・プロセス起動・ログ取得・セッション永続化といった機能をまとめて扱えるようにしています。

## 主な構成

| ファイル | 役割 |
| --- | --- |
| `src/Main.ts` | `FrpManagerAPP` 本体。設定読み込み、各サービスの初期化、API から呼び出される公開メソッドを提供。 |
| `src/config.ts` | ENV/デフォルト値から `FrpManagerConfig` を構築し、データディレクトリ・バイナリDL先・ログポリシーなどを定義。 |
| `src/SessionStore.ts` | `userdata/frp/sessions.json` を使ったセッション永続化。ミドルウェア再起動後も一覧表示に利用。 |
| `src/FrpLogService.ts` | セッション単位のログファイル管理、tail/ローテーション、HTTP でのログ提供用に利用。 |
| `src/FrpBinaryManager.ts` | Asset サーバーから OS/arch ごとの frpc バイナリをダウンロードして配置、バージョン管理を実施。 |
| `src/FrpProcessManager.ts` | frpc の設定生成・子プロセス起動・stdout/stderr 監視・終了時の状態更新。既存のイベントシステムと連携予定。 |
| `src/AuthSessionManager.ts` | Discord OAuth2→JWT リンク処理の骨組みと、自動リフレッシュ・失敗時のイベント発火。 |
| `src/types.ts` | 上記の構成要素が共有する型定義。 |

## テスト

`npm run test:frp` でライブラリ単体テストを実行できます。  
`node --test` を利用し、以下の動作をカバーしています。

- SessionStore の保存/再読込
- FrpLogService の tail/ローテーション
- FrpProcessManager をモックバイナリで実行し、起動→停止までの状態更新

## 最近の更新

### v1.1.0 (2025-12-03) - Asset Server連携実装（マルチプラットフォーム対応）

**実装完了:**
- ✅ **マルチプラットフォーム対応**: Linux/macOS/Windows × amd64/arm64を完全サポート
- ✅ **Asset サーバー連携**: `FrpBinaryManager` が Asset Server API (`/api/assets/frp/client-binary`) からダウンロードURLを自動取得
- ✅ **自動プラットフォーム判定**: OS/アーキテクチャを自動検出し、適切なエンドポイントを呼び出し
- ✅ **環境変数対応**: `FRP_BINARY_BASE_URL` でエンドポイントURLを設定可能（デフォルト: `http://localhost:8080/api/assets/frp`）
- ✅ **フォールバック機能**: API取得失敗時は設定URLを直接使用
- ✅ **柔軟な設定**: 環境変数 `FRPC_DOWNLOAD_URL_<PLATFORM>_<ARCH>` で個別URL指定も可能

**サポートプラットフォーム:**
- Linux: x64 (amd64), arm64
- macOS (darwin): x64 (amd64), arm64
- Windows (win32): x64 (amd64), arm64

**動作:**
```typescript
// FrpBinaryManager.ensureBinary() の動作フロー
1. 現在のOS/アーキテクチャを自動判定
2. Asset Server API から downloadUrl 取得を試行
   例: GET /api/assets/frp/client-binary?platform=windows&arch=amd64
3. 成功 → GitHub Releases から直接ダウンロード
4. 失敗 → フォールバックURLを使用（既存動作を維持）
```

詳細: [backend/Docker/FRP_BINARY_API.md](../../../../backend/Docker/FRP_BINARY_API.md)

## 今後のTODO・実装計画メモ

1. ~~**Asset サーバー連携**~~ ✅ 完了 (v1.1.0)
2. **API ルーター統合**: `/api/frp/auth/*` `/api/frp/connections/*` `/api/frp/logs/:id` を `lib/api-router.ts` 経由で公開し、`FrpManagerAPP` のメソッドをラップする。
3. **AuthSessionManager の本配線**: Auth.js のエンドポイント仕様に合わせて `exchangeCode`/`refresh` の payload/レスポンスを最終化し、エラー時に WebSocket/イベントバスへ通知。
4. **セッション情報の拡張**: `frp-authz` の `/internal/user/:discordId/info` を呼び出して、リモート側のセッション一覧をミドルウェアのレスポンスに含める。
5. **ログ閲覧 API**: `FrpLogService.tail` を `/api/frp/logs/:sessionId?tail=100` などの HTTP エンドポイントにつなぎ、フロントから任意の件数で取得できるようにする。
6. **JWT リフレッシュ失敗時の扱い**: 既存イベントチャネルと連携し、トークン破棄→再ログイン要求→既存接続維持/停止のポリシーを最終決定。
7. **E2E 検証**: Docker backend と接続して実際の `frpc` で疎通確認、Asset サーバーからのダウンロード、ポーリング/ログ API の動作を手動検証する。

上記を進めながら、フロントエンドからの操作フロー（認証→セッション生成→ログ確認→停止）を順次テストしていく予定です。

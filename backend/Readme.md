# Backend 概要

Minecraft サーバーソフトウェアの情報と JDK バイナリ配布リンクを提供する REST API バックエンドです。実装は Node.js + Express + TypeScript で構成され、`backend/Asset` ディレクトリがエントリーポイントとなります。

```mermaid
graph TD
  Client[クライアント] -->|HTTP| Express
  Express[Express (TypeScript)] --> Routes[Routes]
  Routes --> Controllers[Controllers]
  Controllers --> Data[JSONデータ<br>resources/jdk, resources/servers]
  Controllers --> Generators[JDK_JSON_Genelator]
```

## 目的
- Minecraft サーバー配布物や対応 JDK 情報の REST API 提供
- Temurin（Eclipse Adoptium）由来の JDK バイナリリンクの配布
- ヘルスチェックとアセット配信を含むシンプルな API 提供

## プロジェクト構成
- ルート: [`backend/Asset`](./Asset)
- 主要言語/フレームワーク: Node.js, Express, TypeScript
- エントリーポイント: `server.ts`
- アプリ設定: `app.ts`（ルーティング統合）
- 代表的なディレクトリ:
  - `routes/` … API ルート (`health`, `servers`, `jdk`, `assets`)
  - `controllers/` … 各ルートの処理
  - `data/` … `servers.json`, `jdk.json` など公開情報
  - `resources/` … ダウンロード配布物 (JDK バイナリ、サーバー JAR)
  - `JDK_JSON_Genelator/` … GitHub API から最新 JDK 情報を取得
  - `docs/` … API/スキーマ仕様書

## npm スクリプト（`backend/Asset/package.json` より）
| スクリプト | 用途 |
| --- | --- |
| `npm start` | 本番モードでサーバー起動。既存データを利用。 |
| `npm run dev` | 開発モードで起動。JDK 情報の更新と不足バイナリの自動ダウンロードを実行。 |
| `npm run test` | テストモードで起動 (`--test`)。開発モードと同様に JDK 自動セットアップを実行。 |
| `npm run build` | TypeScript をビルド。 |
| `npm run watch` | TypeScript のウォッチビルド。 |

## 起動手順
1. 依存関係インストール
   ```bash
   cd backend/Asset
   npm install
   ```
2. サーバー起動
   - 本番: `npm start`
   - 開発: `npm run dev`
   - テスト: `npm run test` または `npx ts-node server.ts --test`

## 主なエンドポイント
- `GET /health` … ヘルスチェック
- `GET /api/v1/servers` … サーバーソフトウェア一覧
- `GET /api/v1/jdk` … JDK 情報一覧
- `GET /api/v1/assets/...` … 配布アセット (JDK/サーバー JAR) 取得

詳細な仕様は [`backend/Asset/docs`](./Asset/docs) 配下の各 Markdown を参照してください。

## ライセンスと配布物
本バックエンドは Temurin（Eclipse Adoptium）の JDK バイナリリンクを利用しています。`./Asset/resources/jdk` に含まれるリンクおよびバイナリのライセンス詳細は [Eclipse Adoptium 公式サイト](https://adoptium.net/) を参照してください。

---
関連資料:
- [`backend/Asset/README.md`](./Asset/README.md)
- [`backend/Asset/docs`](./Asset/docs)

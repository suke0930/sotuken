# Minecraft Server Management Platform（卒業制作 / クローズドアルファ）

Minecraft サーバーの作成・起動・停止・ログ閲覧、JDK 管理、FRP を用いた外部公開をブラウザベースで行うための技術検証プロジェクトです。  
Node.js + TypeScript 製のミドルウェア、Asset API サーバー、FRP 認証バックエンド（Docker コンテナ群）で構成されており、**卒業制作としてクローズドアルファ開発中**です。

> ※ 旧バージョン README に記載されていた「Windows 専用 .exe インストーラ」「ワンクリックで使える安定版 GUI アプリ」等は現時点では存在しません。  
> ただし、クローズド配布向けに **Node.js ランタイム同梱の Windows ポータブル起動パッケージ**（`EditAll/`）は用意しています（GitHub とは別経路で配布します）。

---

## プロジェクト概要

本システムは、卒業制作として開発された、Minecraftサーバー管理システムです。

- ブラウザから利用する管理ダッシュボード（`frontend/middleware/main/web`）
- Express 5 + TypeScript 製ミドルウェア（Front Driver Middleware）
- Minecraft サーバー / JDK 情報を提供する Asset API サーバー
- Discord OAuth2 ベースの FRP 認証・セッション管理バックエンド（Docker）

現時点での主な機能（実装済み）:

- ブラウザ UI からの Minecraft サーバー作成・起動・停止・削除・ログ閲覧
- Asset Server から取得したサーバー種別 / バージョン / JDK 情報をもとにしたテンプレート選択
- JDK レジストリに基づく JDK ランタイムのインストール・一覧・削除・簡易ヘルスチェック
- サーバー更新・バックアップ等の運用補助（クローズドアルファ機能）
- `minecraft-server-manager` ライブラリによるサーバープロセス制御（server.properties 管理・メモリ/ポート検証など）
- `jdk-manager` ライブラリによる複数 JDK バージョン管理とチェックサム検証
- FRP クライアント（frpc）のバイナリダウンロードと起動、セッション情報の永続化（アルファ段階）
- 自己署名証明書の自動生成による HTTPS 対応（ローカル開発用）

---

## 全体アーキテクチャ / コンポーネント構成

リポジトリ全体のざっくりした構成は次の通りです。

```text
frontend/middleware/main     # フロントドライバーミドルウェア + Web UI
  ├─ index.ts                # Express/HTTPS/WebSocket エントリーポイント
  ├─ web/                    # ブラウザ向けダッシュボード
  └─ lib/
      ├─ minecraft-server-manager/  # MC サーバー管理ライブラリ
      ├─ jdk-manager/               # JDK 管理ライブラリ
      ├─ frp-manager/               # FRP クライアント管理
      ├─ ssl/                       # 自己署名証明書管理
      └─ setup-dir.ts              # userdata ディレクトリ初期化

backend/Asset                # Minecraft サーバー/JDK 情報・アセット配布 API
  ├─ app.ts, server.ts       # Express アプリと起動エントリーポイント
  ├─ data/servers.json       # サーバーソフト一覧
  ├─ data/jdk.json           # JDK 一覧
  └─ resources/              # 実際の JDK/Jar バイナリ

backend/Docker               # FRP 認証・Asset Server を含む Docker Compose 一式
  ├─ docker-compose.yml
  ├─ nginx/                  # API ゲートウェイ (ポート 8080)
  ├─ asset-server/           # backend/Asset を Docker 化したもの
  ├─ frp-authjs/             # Discord OAuth2 + JWT 認証 API
  ├─ frp-authz/              # ポート権限・セッション管理 API
  └─ frp-server/             # FRP サーバー本体 (ポート 7000)
```

ブラウザからのリクエストは、基本的に次のような流れになります。

```text
[Browser]
   │  HTTPS (既定: 12800)
   ▼
[Front Driver Middleware (frontend/middleware/main)]
   ├─ /web/*         → 管理ダッシュボード UI
   ├─ /user/*        → シングルユーザー向けログイン/サインアップ
   ├─ /api/jdk/*     → JDK 管理 API（ローカルの jdk-manager を操作）
   ├─ /api/mc/*      → Minecraft サーバー管理 API（minecraft-server-manager を操作）
   ├─ /api/assets/*  → Asset Server (backend/Asset) へのプロキシ
   └─ /api/frp/*     → FRP 認証/セッション API（backend/Docker 経由）
```

詳細な API や内部仕様については、各ディレクトリの README / docs を参照してください（後述）。

---

## クローズドアルファ向けデモ環境のセットアップ

ここでは「ローカル PC 上で一通りの機能を試す」ための最小限の手順をまとめます。  
**ここに限り、Node.js と Docker を使った開発者向けセットアップが前提**です。  
クライアント配布用のポータブル起動（`EditAll/`）については、後述の「スタンドアロン配布（EditAll / Windows）」を参照してください。
### 必要要件

- Node.js 20 以上（`frontend/middleware/main` の README に準拠）
- npm（または互換パッケージマネージャ）
- Docker Engine 20.10+ / Docker Compose 2.0+（`backend/Docker` の README に準拠）
- インターネット接続（初回の JDK/FRP バイナリ取得時に必要）

開発・検証は主に Linux 環境で行っていますが、**Node.js と Docker が動作する 64bit 環境であれば複数 OS での動作を想定**しています（ただし本番レベルの動作保証は行いません）。

### 1. FRP + Asset バックエンド（Docker）の起動

`backend/Docker` ディレクトリで Docker Compose を起動します。

```bash
cd backend/Docker
cp .env.example .env      # 初回のみ
# .env を編集して JWT_SECRET, Discord OAuth2 情報 などを設定
docker-compose up -d --build
```

補足:

- `asset-server` は Docker 内で `npm run dev` 起動されるため、初回は **JDK 情報更新 + JDK バイナリの自動ダウンロード**が走ることがあります（時間/ディスク容量が必要）。
- 取得したデータは `backend/Docker/AssetServ/` 配下（`Resource`, `Data`）に永続化されます。

起動後、ヘルスチェックで状態を確認できます。

```bash
curl http://localhost:8080/api/frp/health
curl http://localhost:8080/api/assets/frp/info
```

より詳しい説明やポート構成は `backend/Docker/README.md` および `backend/Docker/docs/01-QUICK_START.md` を参照してください。

### 2. フロントドライバーミドルウェアの起動

次に、ブラウザ UI と各種 API を束ねるミドルウェアを起動します。

```bash
cd frontend/middleware/main
cp .env.example .env   # 必要に応じて PORT や BACKEND_API_URL を編集
npm install
npm run dev            # (内部で --envpath .env を付与して起動)
# npm start を使う場合: npm start -- --envpath .env
```

`.env` の既定値では以下のように設定されています。

- `PORT=12800`（ミドルウェアの待ち受けポート）
- `BACKEND_API_URL=http://localhost:8080`（Docker 側 Nginx 経由の API）
- `FRP_AUTH_SERVER_URL=http://localhost:8080`
- `FRP_BINARY_BASE_URL=http://localhost:8080/api/assets/frp`

起動後、ブラウザから次の URL にアクセスすると管理 UI に到達できます（自己署名証明書の警告が出る場合があります）。  
また、起動時に既定ブラウザを自動で開きます（既定では `https://127.0.0.1:<PORT>/` を開きます）。

- `https://localhost:12800/`（`SSL_ENABLED=true` の場合）

詳細な環境変数やスクリプトについては `frontend/middleware/main/README.md` と `.env.example` を参照してください。

### 3. Asset API サーバー単体での利用（任意）

Asset Server は Docker 経由で起動する構成が想定されていますが、単体で起動して試すこともできます。

```bash
cd backend/Asset
npm install
npm start        # 既定ポート: 3000
```

エンドポイント例や JDK 自動セットアップ機能の詳細は `backend/Asset/README.md` および `backend/Asset/docs/` を参照してください。

---

## スタンドアロン配布（EditAll / Windows）

クライアント配布向けに、ミドルウェア（ブラウザ UI + ローカル API）を **Windows 上で「インストール無し」で起動するためのパッケージ**を `EditAll/` に同梱しています。

- 起動: `EditAll/launch.bat`
- 同梱ランタイム: `EditAll/Runtime/node.exe`（Windows x86_64）
- 設定: `EditAll/.env`（バックエンド接続先 `BACKEND_API_URL` / `FRP_*` など）
- データ保存先: `.env` の `USERDATA_DIR` / `DEV_SECRET_DIR` に従う（既定は `EditAll/userdata` / `EditAll/devsecret`）

注意:

- これは `.exe` インストーラやデスクトップ GUI アプリではなく、**実行環境（Node.js）を同梱したポータブル起動**です。
- バックエンド（Asset/FRP 認証）は別途必要です（`backend/Docker` を同一 PC で立ち上げるか、リモートのバックエンドに接続します）。

---

## 基本的な操作フロー（概要）

UI の細かい説明はミドルウェア側のドキュメントに任せ、ここでは大まかな流れだけを記載します。

1. **ユーザー登録・ログイン**
   - `https://localhost:12800/` にアクセスすると、シングルユーザー向けのサインアップ/ログイン画面が表示されます。
   - 認証情報は `frontend/middleware/main/devsecret/users.json` に保存されます（開発用ストレージ）。

2. **サーバーテンプレートの取得**
   - ミドルウェアはバックエンド Asset Server からサーバーソフト一覧 (`data/servers.json`) と JDK 一覧 (`data/jdk.json`) を取得し、UI の選択肢として表示します。
   - Asset 側の API 仕様やスキーマは `backend/Asset/docs/` 内のドキュメントを参照してください。

3. **Minecraft サーバーの作成**
   - ダッシュボード上の「サーバー作成」画面から、サーバー名・ソフトウェア種別（Paper/Fabric など）・バージョン・メモリ量などを選択します。
   - ミドルウェア内部では `minecraft-server-manager` ライブラリを通じて、サーバーディレクトリ作成・Jar 配置・`server.properties` 初期化・設定バリデーションが行われます。

4. **サーバーの起動 / 停止とログ閲覧**
   - 作成したサーバーは一覧画面から起動・停止できます。
   - WebSocket (`/ws/mcserver`) を通じてサーバーの標準出力がストリーミングされ、ブラウザ上のコンソールでログ閲覧やコマンド送信が可能です。

5. **JDK 管理**
   - `jdk-manager` ライブラリを用いて、複数バージョンの JDK をローカルにインストール・登録できます。
   - Asset Server の JDK API と連携し、必要なバージョンの JDK アーカイブをダウンロードしてチェックサム検証を行います。
   - 詳細は `frontend/middleware/main/lib/jdk-manager/docs/README.md` を参照してください。

6. **FRP による外部公開（アルファ機能）**
   - FRP 認証/セッション管理は `backend/Docker` のコンテナ群と `frp-manager` ライブラリにより提供されます。
   - ユーザーは Discord OAuth2 を用いて認証を行い、指定ポートの FRP セッションを作成することで、インターネット越しにローカル Minecraft サーバーを公開できます。
   - API の詳細や動作要件は `frontend/middleware/main/docs/FRP_MANAGER_API.md` と `backend/Docker/docs/` を参照してください。

---

## 制限事項・想定している利用範囲

本プロジェクトは卒業制作としてのクローズドアルファであり、以下のような制限があります。

- **本番運用非推奨**
  - セキュリティ設定・エラーハンドリング・監視などは開発用を前提としており、本番環境での利用を想定していません。

- **シングルユーザー前提の設計**
  - ミドルウェアの認証はローカルファイルベースのシングルユーザー運用を想定しています。複数ユーザー/ロールベース権限管理は未実装です。

- **OS サポートについての注意**
  - Node.js と Docker が動作する 64bit 環境での動作を想定していますが、正式なサポート対象 OS を明示するものではありません。
  - 開発は主に Linux 環境で行われています。Windows/macOS での利用は環境依存の差異が出る可能性があります。

- **ネットワーク構成**
  - FRP バックエンドは Docker Compose 前提で設計されています。他のデプロイ形態（Kubernetes 等）は想定していません。

- **データ永続化**
  - ユーザーデータ（サーバー設定・JDK・FRP 設定など）はローカルディレクトリ（`frontend/middleware/main/userdata` 等）に保存されます。バックアップ/リストアのための公式な仕組みはまだ整備途中です。

---

## 将来の拡張予定 / 構想中の機能

旧 README で触れていた内容や、現時点でのアイデアのうち、**まだ実装されていない・検証段階のもの**をまとめます。

- **スタンドアロン配布の「製品化」（GUI/インストーラ化）**
  - 現状の `EditAll/` は「Node.js 同梱のポータブル起動（.bat）」であり、一般ユーザー向けの GUI アプリ / .exe インストーラとしての配布は未整備です。
  - 依存関係の完全同梱、アップデータ、エラー時の誘導、署名済み証明書などを含めた体験の改善を構想しています。

- **複数ユーザー / 権限管理**
  - 複数アカウント・ロール別権限・チーム運用を想定したユーザー管理機能。
  - 現段階ではシングルユーザー向けセッション管理のみ実装されています。

- **高度な自動セットアップ**
  - OS や環境を自動検出し、JDK / サーバー / FRP / ファイアウォール設定まで一括で行う「完全自動インストール」機能。
  - 一部の JDK 自動セットアップや Asset ダウンロードは実装済みですが、ネットワーク設定や OS 設定の自動変更までは行いません。

- **本番運用を前提としたセキュリティ強化**
  - 監査ログ、レートリミット、詳細な CORS 設定、秘密情報管理（Vault 連携など）を含む運用レベルのセキュリティ対策。

- **監視・メトリクス・アラート**
  - サーバー稼働状況やリソース使用量、FRP セッション状況を可視化するダッシュボードやアラート連携。

これらはあくまで**構想中 / 設計検討中**であり、実装スケジュールや提供形態は未定です。

---

## 参考ドキュメントへの導線

より詳しい仕様や API、起動方法は、各コンポーネントの README / docs を参照してください。

- ミドルウェア本体とデモ起動方法  
  - `frontend/middleware/main/README.md`

- FRP 認証バックエンド（Docker）  
  - `backend/Docker/README.md`  
  - `backend/Docker/docs/01-QUICK_START.md` など

- Asset API サーバー（サーバー/JDK 一覧・アセット配布）  
  - `backend/Asset/README.md`  
  - `backend/Asset/docs/`（`API.md`, `SCHEMA.md`, `JDK_API.md` など）

- Minecraft サーバー管理ライブラリ  
  - `frontend/middleware/main/lib/minecraft-server-manager/docs/README.md`

- JDK 管理ライブラリ  
  - `frontend/middleware/main/lib/jdk-manager/docs/README.md`

- FRP クライアント管理ライブラリ / API  
  - `frontend/middleware/main/lib/frp-manager/README.md`  
  - `frontend/middleware/main/docs/FRP_MANAGER_API.md`

---

## ライセンスと開発について

- 本ソフトウェアは MIT ライセンスで公開されています。詳細は `LICENSE` を参照してください。
- バグ報告や改善提案は GitHub Issues / Pull Request で受け付けています（ただし卒業制作プロジェクトのため、対応は不定期となる場合があります）。

この README は「鳥瞰図＋導線」を目的としており、運用や UI の詳細な手順は各サブディレクトリのドキュメントに委ねています。

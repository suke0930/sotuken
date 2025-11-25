# Project Developer Documentation

このドキュメントは、本プロジェクト（Minecraftサーバー管理システム）のアーキテクチャ、実装詳細、および技術スタックを開発者向けに解説するものです。AIアシスタントへのコンテキスト提供や、新規開発者のオンボーディングを目的としています。

## 1. プロジェクト概要

本システムは、Minecraftサーバーのバージョン管理、JDKの配布、およびそれらを統合管理するWebインターフェースを提供するシステムです。
大きく分けて以下の3つのコンポーネントで構成されています。

1.  **Backend API (`/backend/Asset`)**: サーバーソフトウェアとJDK情報の提供、アセットファイルの配信を行うREST APIサーバー。
2.  **Middleware (`/frontend/middleware/main`)**: フロントエンドへのアクセス提供、認証・セッション管理、Backend APIへのプロキシを行うBFF (Backend for Frontend) 的な役割を持つサーバー。
3.  **Frontend (`/frontend/middleware/main/web`)**: ユーザーが操作するWeb UI。Vue.js (ESM) を使用したSPA (Single Page Application) ライクな構成。

---

## 2. コンポーネント詳細

### A. Backend API (`/backend/Asset`)

MinecraftサーバーのJarファイルやJDKのインストーラーなどの「アセット」と、それらのメタデータを管理・配信するコアバックエンドです。

*   **技術スタック**: Node.js, Express, TypeScript
*   **主な役割**:
    *   **メタデータ提供**: 利用可能なサーバーバージョン、JDKバージョンのJSONデータ提供。
    *   **ファイル配信**: `resources` ディレクトリ内のファイルをストリーミング配信。
    *   **JDK自動管理**: GitHub API経由で最新のJDK情報を取得し、自動でダウンロード・データ更新を行う機能。
    *   **ホットリロード**: `data` ディレクトリ内のJSONファイルを監視し、再起動なしでデータを更新。

#### API エンドポイント詳細

今後の拡張を見据え、現状の実装されているAPIの詳細を記載します。

**ベースURL**: `http://localhost:3000` (デフォルト)

| カテゴリ | メソッド | パス | 説明 | レスポンス例/備考 |
| :--- | :--- | :--- | :--- | :--- |
| **Health** | `GET` | `/health` | サーバーの稼働状態確認 | `{"status": "ok", "timestamp": "..."}` |
| **Servers** | `GET` | `/api/v1/servers` | 利用可能なMinecraftサーバー全件取得 | `{"success": true, "data": [{ "name": "Vanilla", "versions": [...] }]}` |
| **JDK** | `GET` | `/api/v1/jdk` | 利用可能なJDK全件取得 | `{"success": true, "data": [{ "version": "17", "downloads": [...] }]}` |
| **Assets** | `GET` | `/api/assets/list/jdk` | 物理ファイルとして存在するJDK一覧 | `{"success": true, "data": [{ "path": "...", "size": ... }]}` |
| **Assets** | `GET` | `/api/assets/list/servers` | 物理ファイルとして存在するサーバー一覧 | `{"success": true, "data": [...]}` |
| **Download** | `GET` | `/api/assets/jdk/{ver}/{os}/{file}` | JDKファイルのダウンロード | **ストリーミング配信**。`Range`リクエスト対応。 |
| **Download** | `GET` | `/api/assets/servers/{type}/{ver}/{file}` | サーバーJarのダウンロード | **ストリーミング配信**。 |

**データ構造 (JSON Schema概要)**

*   **Server Data (`data/servers.json`)**:
    ```typescript
    interface ServerData {
      name: string; // e.g., "Vanilla", "Paper"
      versions: {
        version: string; // e.g., "1.20.1"
        jdk: string;     // e.g., "17" (推奨JDK)
        downloadUrl: string; // 外部URLまたはローカルパス
      }[];
    }
    ```
*   **JDK Data (`data/jdk.json`)**:
    ```typescript
    interface JdkData {
      version: string; // e.g., "17"
      downloads: {
        os: "windows" | "linux" | "macos";
        downloadUrl: string; // ダウンロード用URL
      }[];
      vendor: string;
      isLTS: boolean;
    }
    ```

### B. Middleware (`/frontend/middleware/main`)

フロントエンドアプリケーションを配信し、認証とAPIプロキシを行うサーバーです。

*   **技術スタック**: Node.js, Express, TypeScript, express-session
*   **主な役割**:
    *   **静的ファイル配信**: `web` ディレクトリのフロントエンドリソースを配信。
    *   **認証・セッション管理**: `express-session` を使用したログイン管理。HTTPOnly Cookieによるセキュリティ対策。
    *   **APIプロキシ**: フロントエンドからのリクエストを受け、Backend APIへ転送（CORS回避や認証チェック用）。
    *   **WebSocket**: リアルタイム通信のサポート（実装途中または予定）。

#### 認証フロー
1.  ユーザーが `/user/login` にPOSTリクエスト（Device ID等）。
2.  サーバーが検証し、セッションを作成。HTTPOnly Cookie (`connect.sid`) を発行。
3.  以降のリクエストでCookieを検証し、認可を行う。

### C. Frontend (`/frontend/middleware/main/web`)

ユーザーがブラウザで操作するインターフェースです。

*   **技術スタック**:
    *   **Framework**: Vue.js 3 (ES Modules / CDN利用)。ビルドステップなしで動作。
    *   **CSS**: Vanilla CSS (`style/main.css`)。
    *   **State Management**: 簡易的なStoreパターン (`store.js`)。
*   **ディレクトリ構造**:
    *   `js/app.js`: エントリーポイント。Vueアプリの初期化。
    *   `js/components/`: Vueコンポーネント（テンプレート文字列として定義）。
    *   `js/composables/`: Composition APIによるロジックの再利用（Hooks）。
    *   `js/Endpoints.js`: APIエンドポイントの定数定義。

---

## 3. 全体技術スタックまとめ

| 領域 | 技術・ツール | バージョン/備考 |
| :--- | :--- | :--- |
| **Backend** | Node.js | v20+ 推奨 |
| | Express | v5.x (Beta) |
| | TypeScript | v5.x |
| | axios | HTTPクライアント |
| **Frontend** | Vue.js | v3.x (ESM build) |
| | Vanilla CSS | フレームワークなし |
| **Data** | JSON | ファイルベースデータベース |
| **DevOps** | npm | パッケージ管理 |

---

## 4. 開発・拡張ガイド

### 今後のBackend拡張に向けた情報

Backend APIを拡張する際は、以下のファイル・ディレクトリが重要になります。

1.  **ルート定義 (`backend/Asset/routes/`)**:
    *   新しいAPIエンドポイントを追加する場合は、ここに新しいルートファイルを作成するか、既存のファイルを編集します。
    *   `index.ts` でルートを統合しています。

2.  **コントローラー (`backend/Asset/controllers/`)**:
    *   ビジネスロジックはここに記述します。リクエストの処理、データの取得、レスポンスの生成を行います。

3.  **データ型定義 (`backend/Asset/types/`)**:
    *   TypeScriptの型定義はここに集約されています。新しいデータ構造を扱う場合は、まず型を定義することを推奨します。

4.  **Asset Handler (`frontend/middleware/main/lib/Asset_handler`)**:
    *   Middleware側でBackend APIとの通信を抽象化しているクラス群がある可能性があります（調査で発見）。
    *   BackendのAPI仕様変更時は、このハンドラーの修正も必要になる場合があります。

### 便利な設計情報

*   **JDK自動セットアップ**: `backend/Asset/lib/jdkSetup.ts` および `JDK_JSON_Genelator` ディレクトリ。GitHub APIの仕様変更や、取得対象のJDKバージョンを変更したい場合はここを確認。
*   **コンポーネント指向**: フロントエンドはビルドレスですが、`js/components` 内でテンプレートを分割管理しています。UIの変更は該当するコンポーネントファイルを編集します。
*   **認証バイパス**: 開発中は `devsecret/users.json` などの設定により、簡易的な認証でテスト可能です（詳細はMiddlewareのREADME参照）。

---

*Document generated by AI Assistant based on project analysis.*

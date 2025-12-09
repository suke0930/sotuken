# UserInterface ガイド

本ディレクトリはブラウザから利用する静的フロントエンド資産をまとめています。Vue 3 を CDN で読み込むシンプルな構成で、開発中の React コンポーネントの試作コードも含まれます。

## ディレクトリ構成

```text
frontend/UserInterface/
├── index.html                  # Vue 3 を利用した認証 UI のエントリーポイント
├── styles.css                  # 認証画面用のスタイルシート
├── user_authenticationUI.html  # 追加の認証 UI プロトタイプ
└── main_page.js                # React で実装されたサーバー管理ダッシュボードの試作コンポーネント
```

## 利用技術

- Vue 3 (CDN 配信、`index.html` で直接読み込み)
- プレーン HTML/CSS
- React + lucide-react（`main_page.js` 内での試作。バンドラ設定は未提供）

## 開発・実行方法

ビルド工程はなく、静的ファイルをそのままブラウザで開けます。ローカルサーバー経由で確認する場合は、`frontend/UserInterface` 配下で以下を実行してください。

```bash
# Python 標準モジュールを使ったローカルサーバー
python -m http.server 8000
```

ブラウザで `http://localhost:8000/index.html` にアクセスすると Vue ベースの認証画面が確認できます。

## エントリーポイント

- Vue 認証 UI: `index.html` が直接エントリーポイントになっており、`<div id="app">` 配下に `auth-component` をマウントします。
- React ダッシュボード試作: `main_page.js` で `MinecraftServerPanel` コンポーネントを定義しています。React バンドラ環境が整ったプロジェクトにインポートするとサーバー管理 UI を描画できます。

## アーキテクチャ概要

```mermaid
graph TD
    A[ブラウザ] --> B[index.html]
    B --> C[Vue 3 CDN]
    B --> D[styles.css]
    B --> E[auth-component]
    A -->|別途バンドラで利用| F[main_page.js (React)]
```

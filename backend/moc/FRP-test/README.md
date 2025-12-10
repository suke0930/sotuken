# FRP認証システム PoC - セットアップ & 実行ガイド

## 概要

このプロジェクトは、FRP（Fast Reverse Proxy）にJWTベースの認証・認可機能を統合した概念検証（PoC）システムです。

## システム構成

```
FRP-test/
├── frps/                    # FRPサーバー
├── auth-server/             # 認証サーバー（Node.js）
├── client-controller/       # クライアント制御ソフト（Node.js）
└── config.json              # FRPバイナリダウンロード設定
```

## 前提条件

- Node.js v18.x 以上
- npm
- Windows/Mac/Linux のいずれか

## セットアップ手順

### 1. 依存関係のインストール

#### 認証サーバー
```bash
cd auth-server
npm install
npm run build
```

#### クライアント制御ソフト
```bash
cd client-controller
npm install
npm run build
```

### 2. FRPバイナリの自動ダウンロード

FRPバイナリは各コンポーネントの初回起動時に自動的にダウンロード・配置されます。

- 認証サーバー起動時: `frps` バイナリが `frps/` にダウンロード
- クライアント起動時: `frpc` バイナリが `client-controller/bin/` にダウンロード

## 起動方法

### ステップ1: 認証サーバーを起動

```bash
cd auth-server
npm start
```

起動メッセージ:
```
frps binary already exists at ...
FRP Auth Server running on port 3000
```

### ステップ2: FRPサーバーを起動

別のターミナルで:

**Windows:**
```bash
cd frps
.\frps.exe -c frps.toml
```

**Mac/Linux:**
```bash
cd frps
./frps -c frps.toml
```

起動メッセージに `[auth-plugin]` の読み込みが表示されることを確認してください。

### ステップ3: クライアントを起動

さらに別のターミナルで:

```bash
cd client-controller
npm start <username> <password> <serverAddr> <serverPort> <authServerUrl> <localPort> <remotePort>
```

**例:**
```bash
npm start user_alpha password123 127.0.0.1 7000 http://127.0.0.1:3000 8080 8080
```

**引数説明:**
- `username`: 認証ユーザー名（例: user_alpha）
- `password`: パスワード（例: password123）
- `serverAddr`: FRPサーバーアドレス（例: 127.0.0.1）
- `serverPort`: FRPサーバーポート（例: 7000）
- `authServerUrl`: 認証サーバーURL（例: http://127.0.0.1:3000）
- `localPort`: ローカルポート番号（転送元）
- `remotePort`: リモートポート番号（転送先、許可チェック対象）

## テストシナリオ

### テスト1: 正常系 - 許可されたポートへの接続

**ユーザー:** user_alpha
**許可ポート:** 8080, 22, 3000

```bash
npm start user_alpha password123 127.0.0.1 7000 http://127.0.0.1:3000 8080 8080
```

**期待結果:**
- 認証成功
- JWT取得成功
- frpc接続成功
- トンネル作成成功

### テスト2: 異常系 - 未許可ポートへの接続

**ユーザー:** user_beta
**許可ポート:** 3000 のみ

```bash
npm start user_beta password456 127.0.0.1 7000 http://127.0.0.1:3000 8080 8080
```

**期待結果:**
- 認証成功
- JWT取得成功
- frpc接続成功
- トンネル作成失敗（ポート8080は未許可）
- frpsログに拒否メッセージ

### テスト3: 異常系 - 不正な認証情報

```bash
npm start invalid_user wrongpassword 127.0.0.1 7000 http://127.0.0.1:3000 8080 8080
```

**期待結果:**
- 認証失敗
- クライアント終了

### テスト4: users.jsonの動的再読み込み

1. クライアントを起動（例: user_alpha、ポート8080）
2. クライアントが接続成功したら、`auth-server/data/users.json` を編集
   - user_alphaの `allowedPorts` から 8080 を削除
3. クライアントを再起動（同じコマンド）

**期待結果:**
- 初回: 接続成功
- 再起動後: ポート8080が拒否される（JSONが再読み込みされている）

## ユーザー情報

### デフォルトユーザー

[auth-server/data/users.json](auth-server/data/users.json):

| ユーザー名 | パスワード | 許可ポート | ロール |
|-----------|----------|-----------|--------|
| user_alpha | password123 | 8080, 22, 3000 | admin |
| user_beta | password456 | 3000 | user |

## トラブルシューティング

### 問題: FRPバイナリがダウンロードされない

**原因:** config.jsonが存在しないか、URLが不正

**解決策:**
- `config.json` が FRP-test/ 直下に存在することを確認
- URLが有効か確認

### 問題: 認証サーバーに接続できない

**原因:** ポート3000が使用中、または認証サーバーが起動していない

**解決策:**
```bash
# ポート使用状況確認（Windows）
netstat -ano | findstr :3000

# ポート使用状況確認（Mac/Linux）
lsof -i :3000
```

### 問題: frps起動時に「httpPlugins not found」

**原因:** frps.tomlの設定エラー

**解決策:**
- [frps/frps.toml](frps/frps.toml) のパスとポート番号を確認
- 認証サーバーが先に起動していることを確認

### 問題: トンネル作成が拒否される

**原因:** ポートが許可リストに含まれていない

**解決策:**
- [auth-server/data/users.json](auth-server/data/users.json) でユーザーの `allowedPorts` を確認
- 必要に応じて許可ポートを追加
- 認証サーバーは自動で再読み込みするため、再起動不要

## ログの確認

### 認証サーバーログ
認証サーバーのターミナルで以下のログを確認:
- `Authentication successful: User 'xxx' logged in`
- `Webhook received: op=Login`
- `Login accepted: User 'xxx'`
- `NewProxy accepted: User 'xxx', Port yyyy`
- `NewProxy rejected: Port yyyy not allowed for user 'xxx'`

### FRPサーバーログ
frpsのターミナルで以下を確認:
- `[auth-plugin] plugin loaded`
- `start proxy success`
- `proxy rejected by plugin`

## 開発モード

開発時は `ts-node` で直接実行できます:

```bash
# 認証サーバー
cd auth-server
npm run dev

# クライアント
cd client-controller
npm run dev user_alpha password123 127.0.0.1 7000 http://127.0.0.1:3000 8080 8080
```

## 次のステップ（本番移行時）

このPoCで検証できたら、以下の拡張を検討:
- [ ] パスワードのbcryptハッシュ化
- [ ] データベース（PostgreSQL/MySQL）への移行
- [ ] HTTPS通信の実装
- [ ] ユーザー管理UI
- [ ] 複雑な認可ロジック（ポート範囲、時間制限等）
- [ ] 監査ログ
- [ ] レート制限

## ライセンス

PoC用プロジェクト

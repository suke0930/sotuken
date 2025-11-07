# SSL/TLS実装ドキュメント

## 概要

Front Driver Middlewareは、自動証明書管理機能を備えたHTTPS/WSSサーバーとして動作します。本ドキュメントでは、SSL/TLS実装の仕組み、証明書管理、およびトラブルシューティングについて説明します。

## 実装の特徴

### ✅ 自動証明書管理
- 起動時に証明書の存在と有効性を自動チェック
- 証明書が存在しない、または期限切れの場合は自動生成
- 有効期限10日前に自動更新
- ネットワークIP変更時の自動再生成

### ✅ セキュアな通信
- **RSA 4096bit** 鍵（Ed25519と同等のセキュリティ強度）
- HTTPS (HTTP over TLS)
- WSS (WebSocket Secure)
- セキュアCookie（HTTPS時）

### ✅ LAN環境対応
- ローカルホスト（localhost, 127.0.0.1）
- 全ネットワークインターフェースのIPアドレス
- ホスト名（mDNS対応）

### ✅ フォールバック機能
- 証明書生成失敗時はHTTPで起動（警告付き）
- 最大3回のリトライ

## アーキテクチャ

```
起動フロー:
1. DevUserManager初期化
2. MinecraftServerManager初期化
3. SSLCertificateManager.initialize()  ← SSL証明書管理
   ├─ CertificateValidator.validate()
   │   ├─ ファイル存在チェック
   │   ├─ 有効期限チェック
   │   ├─ IP変更チェック
   │   └─ 鍵ペア検証
   ├─ CertificateGenerator.generate() (必要時)
   │   ├─ ローカルIP検出
   │   ├─ SAN構築
   │   ├─ RSA 4096bit鍵生成
   │   └─ 自己署名証明書作成
   └─ 証明書読み込み
4. HTTPSサーバー作成
5. express-ws初期化（HTTPS対応）
6. ミドルウェア設定（セキュアCookie有効化）
7. ルーティング設定
8. サーバー起動
```

## コンポーネント

### 1. SSLCertificateManager

**ファイル**: `lib/ssl/SSLCertificateManager.ts`

**役割**: SSL証明書管理の統括

**主要メソッド**:
- `initialize()`: 証明書の検証・生成・読み込みを統合管理
- リトライ機能（最大3回）
- フォールバック機能（HTTP起動）

### 2. CertificateGenerator

**ファイル**: `lib/ssl/CertificateGenerator.ts`

**役割**: 自己署名証明書の生成

**証明書仕様**:
```
Key Algorithm: RSA 4096bit
Validity: 365 days
Hash: SHA-256
Common Name: localhost
Organization: FrontDriver Development
Country: JP

Subject Alternative Names:
  - DNS: localhost
  - DNS: <hostname>
  - DNS: <hostname>.local
  - IP: 127.0.0.1
  - IP: ::1
  - IP: <all network interface IPs>
```

**使用ライブラリ**: `node-forge` (OpenSSL不要)

### 3. CertificateValidator

**ファイル**: `lib/ssl/CertificateValidator.ts`

**役割**: 証明書の検証

**検証項目**:
1. ファイル存在チェック（server.key, server.cert, cert-info.json）
2. 有効期限チェック（期限切れ、または10日以内）
3. IP変更チェック（現在のIPがSANに含まれるか）
4. 鍵ペア検証（秘密鍵と証明書が対応しているか）

## ファイル構造

```
frontend/middleware/main/
├── lib/
│   ├── ssl/
│   │   ├── SSLCertificateManager.ts    # 統合管理
│   │   ├── CertificateGenerator.ts     # 証明書生成
│   │   └── CertificateValidator.ts     # 証明書検証
│   ├── constants.ts                     # SSL定数定義
│   └── middleware-manager.ts            # セキュアCookie設定
├── userdata/                            # ← gitignoreに追加
│   └── ssl/
│       ├── server.key                   # 秘密鍵 (RSA 4096bit)
│       ├── server.cert                  # 証明書
│       └── cert-info.json               # メタデータ
└── index.ts                             # HTTPS起動
```

## 使用方法

### サーバー起動

```bash
npm start
```

起動時のログ出力例:
```
🔒 SSL Certificate Manager initializing...
🔍 Validating SSL certificate...
📋 Certificate Status:
  - Expires: 2026-11-06T10:00:00.000Z
  - Days remaining: 365
  ✅ Certificate is valid
  ✅ Key pair validation successful
✅ Certificate validation successful
📋 Certificate Information:
  - Common Name: localhost
  - Organization: FrontDriver Development
  - Key Algorithm: RSA 4096
  - Valid From: 2025-11-06T10:00:00.000Z
  - Valid Until: 2026-11-06T10:00:00.000Z
  - Subject Alternative Names (8):
    - localhost
    - 127.0.0.1
    - ::1
    - 192.168.1.100
    - DESKTOP-ABC
    - DESKTOP-ABC.local
🔒 HTTPS Server will be accessible at:
  - https://localhost:12800
  - https://127.0.0.1:12800
  - https://DESKTOP-ABC.local:12800 (mDNS)
  - https://192.168.1.100:12800 (LAN)
🔐 WSS (Secure WebSocket) enabled at:
  - wss://localhost:12800/ws
  - wss://192.168.1.100:12800/ws (LAN)

⚠️  Note: Self-signed certificate will show browser warnings
   Click "Advanced" → "Proceed to localhost" to accept

=== Front Driver Server Started ===
Protocol: HTTPS
Port: 12800
URL: https://127.0.0.1:12800/
WebSocket: wss://127.0.0.1:12800/ws
=====================================
```

### ブラウザでのアクセス

1. ブラウザで `https://localhost:12800` にアクセス
2. 証明書警告が表示される
3. **詳細設定** → **localhost にアクセスする（安全ではありません）** をクリック
4. ページが表示される

### LAN内からのアクセス

同じネットワーク内の他のデバイスから:
```
https://192.168.1.100:12800
```

**注意**: 初回アクセス時は証明書警告が表示されますが、IPアドレスがSANに含まれているため、ホスト名不一致のエラーは発生しません。

## 証明書の更新

### 自動更新

以下の場合、サーバー起動時に自動的に証明書が再生成されます:

1. **有効期限が10日以内**
2. **ネットワークIPアドレスが変更された**
3. **証明書ファイルが存在しない**
4. **証明書と秘密鍵が対応していない**

### 手動更新

証明書を手動で更新する場合:

```bash
# 証明書ファイルを削除
rm -rf userdata/ssl/

# サーバーを再起動
npm start
```

## トラブルシューティング

### 問題1: サーバーがHTTPで起動する

**症状**:
```
⚠️  WARNING: Running in HTTP mode (SSL certificate generation failed)
```

**原因**:
- 証明書生成に失敗した
- `node-forge`がインストールされていない
- ディレクトリの書き込み権限がない

**解決策**:
```bash
# 依存関係を再インストール
npm install

# ディレクトリを手動作成
mkdir -p userdata/ssl

# 権限を確認
ls -la userdata/

# サーバーを再起動
npm start
```

### 問題2: WebSocket接続が失敗する

**症状**:
```
WebSocket connection failed
```

**原因**:
- HTTPSページで証明書を承認していない
- ブラウザがWebSocketの証明書を拒否

**解決策**:
1. ブラウザで `https://localhost:12800` にアクセス
2. 証明書を承認
3. ページをリロード
4. WebSocketが自動接続される

### 問題3: LAN内からアクセスできない

**症状**:
```
https://192.168.1.100:12800 にアクセスできない
```

**原因**:
- IPアドレスが証明書のSANに含まれていない
- ファイアウォールがブロックしている

**解決策**:
```bash
# サーバーログで証明書のSANを確認
# Subject Alternative Names にIPが含まれているか確認

# IPが含まれていない場合は証明書を再生成
rm -rf userdata/ssl/
npm start

# ファイアウォールを確認（Windows）
netsh advfirewall firewall show rule name=all | grep 12800

# ファイアウォールルールを追加（必要に応じて）
netsh advfirewall firewall add rule name="FrontDriver" dir=in action=allow protocol=TCP localport=12800
```

### 問題4: 証明書生成が遅い

**症状**:
```
⏳ Generating RSA 4096-bit key pair (this may take a moment)...
（数秒かかる）
```

**原因**:
- RSA 4096bit鍵の生成は計算量が多い（正常な動作）

**解決策**:
- 初回生成時のみ発生します（通常5-10秒）
- 一度生成すれば、1年間は有効です
- 待機してください

### 問題5: IPアドレス変更後に接続できない

**症状**:
```
⚠️  New IP detected: 192.168.1.200, certificate needs regeneration
```

**原因**:
- DHCP等でIPアドレスが変更された
- 証明書のSANに新しいIPが含まれていない

**解決策**:
- サーバーを再起動（自動的に証明書が再生成されます）
```bash
npm start
```

## セキュリティ考慮事項

### ✅ 実装済みのセキュリティ対策

1. **強力な暗号化**
   - RSA 4096bit（Ed25519と同等の強度）
   - SHA-256ハッシュ

2. **セキュアCookie**
   - HttpOnly: JavaScript からアクセス不可（XSS対策）
   - Secure: HTTPS時のみ送信
   - SameSite: CSRF攻撃対策

3. **秘密鍵の保護**
   - ファイルパーミッション: 600 (owner read/write only)
   - gitignore: 秘密鍵をバージョン管理から除外

4. **自動更新**
   - 有効期限10日前に自動更新
   - IP変更時の自動再生成

### ⚠️ 自己署名証明書の制限

1. **ブラウザ警告**
   - 信頼できる認証局から発行されていないため警告が表示される
   - ユーザーが手動で承認する必要がある

2. **中間者攻撃への耐性**
   - 初回接続時は中間者攻撃のリスクあり
   - 信頼できるネットワークでのみ使用推奨


## まとめ

Front Driver Middlewareの SSL/TLS実装により:

✅ セッションハイジャック攻撃を防御
✅ 中間者攻撃のリスクを大幅に軽減
✅ LAN内での安全な通信
✅ 自動証明書管理で運用負担を軽減
✅ 開発環境でも本番同様のセキュリティ

本実装は開発・テスト環境に最適化されていますが、本番環境への移行も容易に行えます。

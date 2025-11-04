# Resources Directory

このディレクトリは、アセットサーバーとして配信するファイルを格納します。

## ディレクトリ構造

```
resources/
├── jdk/                          # JDK配布ファイル
│   ├── 8/
│   │   ├── windows/
│   │   │   └── jdk-8u351-windows-x64.zip
│   │   ├── linux/
│   │   │   └── jdk-8u351-linux-x64.tar.gz
│   │   └── macos/
│   │       └── jdk-8u351-macos-x64.dmg
│   ├── 11/
│   │   ├── windows/
│   │   ├── linux/
│   │   └── macos/
│   ├── 17/
│   │   ├── windows/
│   │   ├── linux/
│   │   └── macos/
│   └── 21/
│       ├── windows/
│       ├── linux/
│       └── macos/
│
└── servers/                      # Minecraftサーバーソフトウェア
    ├── vanilla/
    │   ├── 1.12.2/
    │   │   └── server.jar
    │   ├── 1.16.5/
    │   │   └── server.jar
    │   ├── 1.18.2/
    │   │   └── server.jar
    │   └── 1.20.1/
    │       └── server.jar
    ├── forge/
    │   ├── 1.12.2/
    │   │   └── forge-1.12.2-installer.jar
    │   ├── 1.16.5/
    │   │   └── forge-1.16.5-installer.jar
    │   └── 1.20.1/
    │       └── forge-1.20.1-installer.jar
    ├── fabric/
    │   └── ...
    └── paper/
        └── ...
```

## アクセス方法

### JDKダウンロード

```
GET /api/assets/jdk/{version}/{os}/{filename}
```

**例:**
- `GET /api/assets/jdk/8/windows/jdk-8u351-windows-x64.zip`
- `GET /api/assets/jdk/17/linux/jdk-17.0.2-linux-x64.tar.gz`
- `GET /api/assets/jdk/21/macos/jdk-21-macos-x64.dmg`

### サーバーソフトウェアダウンロード

```
GET /api/assets/servers/{type}/{version}/{filename}
```

**例:**
- `GET /api/assets/servers/vanilla/1.20.1/server.jar`
- `GET /api/assets/servers/forge/1.20.1/forge-1.20.1-installer.jar`
- `GET /api/assets/servers/paper/1.20.1/paper-1.20.1.jar`

### ファイル一覧取得

```
GET /api/assets/list/jdk       # JDKファイル一覧
GET /api/assets/list/servers   # サーバーファイル一覧
```

## セキュリティ

- **パストラバーサル攻撃対策**: `../` などを使用したディレクトリ外へのアクセスを防止
- **ファイルタイプ検証**: ファイルのみ配信（ディレクトリは拒否）
- **存在確認**: 存在しないファイルへのアクセスは404エラー

## ファイル配信の特徴

- **ストリーミング配信**: 大容量ファイルでもメモリ効率的に配信
- **Content-Disposition**: ブラウザで自動的にダウンロードが開始
- **Content-Length**: ダウンロード進捗表示対応
- **エラーハンドリング**: ファイル読み込みエラーを適切に処理

## ライセンスと二次配布について

### JDK
- **Eclipse Temurin (AdoptOpenJDK)**: GPLv2 + Classpath Exception - ✅ 二次配布可能
- **Amazon Corretto**: GPLv2 + Classpath Exception - ✅ 二次配布可能
- **Azul Zulu**: GPLv2 + Classpath Exception - ✅ 二次配布可能
- **Oracle JDK**: ⚠️ ライセンス確認必要（商用利用に制限あり）

### Minecraftサーバーソフトウェア
- **Vanilla Server**: Minecraft EULA準拠 - ✅ 個人・教育目的で配布可能
- **Forge**: LGPLv2.1 - ✅ 二次配布可能
- **Fabric**: Apache License 2.0 - ✅ 二次配布可能
- **Paper**: GPLv3 - ✅ 二次配布可能

## 注意事項

1. **ディスク容量**: JDKやサーバーファイルは大容量（数百MB〜GB）になる可能性があります
2. **ダウンロードリンク**: 各ベンダーの公式サイトから最新版を取得してください
3. **定期更新**: セキュリティアップデートのため、定期的なファイル更新を推奨
4. **帯域幅**: 大量のダウンロード要求に備えた帯域幅の確保が必要

## 推奨ファイル取得元

### JDK
- **Eclipse Temurin**: https://adoptium.net/temurin/releases/
- **Amazon Corretto**: https://aws.amazon.com/corretto/
- **Azul Zulu**: https://www.azul.com/downloads/

### Minecraftサーバー
- **Vanilla**: https://www.minecraft.net/download/server
- **Forge**: https://files.minecraftforge.net/
- **Fabric**: https://fabricmc.net/use/server/
- **Paper**: https://papermc.io/downloads/paper

## ダミーファイル生成（開発・テスト用）

開発やテスト環境で実際のファイルをダウンロードせずにディレクトリ構造を構築できます。

### makedummy.ts の使用方法

```bash
# 通常実行（定義済みサイズでファイル作成）
cd resources
npx ts-node makedummy.ts

# ファイルサイズを一括指定
npx ts-node makedummy.ts --size 10KB
npx ts-node makedummy.ts --size 1MB
```

### 生成されるファイル

**JDK（各バージョン × 3プラットフォーム）:**
- JDK 8: 140MB～160MB
- JDK 11: 165MB～175MB
- JDK 17: 175MB～185MB
- JDK 21: 185MB～195MB

**Minecraftサーバー:**
- Vanilla: 30MB～50MB（4バージョン）
- Forge: 5MB～7MB（3バージョン）
- Fabric: 3MB～3.5MB（2バージョン）
- Paper: 42MB～48MB（2バージョン）

**合計:** 約2.5GB（デフォルトサイズの場合）

### 注意事項

- ダミーファイルは0埋めされたバイナリファイルです
- 実際のJDKやサーバーとして**動作しません**
- API動作確認・ダウンロード機能テスト用途のみ
- 本番環境では実際のファイルを配置してください

### ダミーファイルのクリーンアップ

```bash
# 生成されたダミーファイルをすべて削除
rm -rf jdk/ servers/
```

## 自動ダウンロードスクリプト（将来実装予定）

将来的には、以下のような自動ダウンロードスクリプトの実装を推奨：

```bash
# scripts/download-assets.sh
./scripts/download-jdk.sh 8 11 17 21
./scripts/download-servers.sh vanilla forge fabric paper
```

## バックアップ

重要なファイルは定期的にバックアップを取ることを推奨します：

```bash
# バックアップ例
tar -czf resources-backup-$(date +%Y%m%d).tar.gz resources/
```

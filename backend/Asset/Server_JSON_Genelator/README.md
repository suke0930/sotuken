```markdown
# Server JSON Generator

Minecraftサーバーの最新バージョン情報を取得し、`latest-servers.json` を生成するツールです。

## 機能

### 動的取得 (API経由)
- **Paper**: Paper MC APIから各バージョンの最新ビルドを自動取得
- **Fabric**: Fabric Meta APIから最新のLoaderとInstallerバージョンを自動取得

### 静的エントリ
- **Forge**: `servers.json` に記載されたURLをそのまま使用
- **Vanilla**: `servers.json` に記載されたURLをそのまま使用
- その他のサーバータイプも `servers.json` に追加することで対応可能

### JDKバージョン管理
- `jdkmap` により、Minecraftバージョンごとの必要なJDKバージョンを一元管理
- 全サーバータイプで共通のマッピングを使用

## 使用方法

```bash
node main.js
```

生成されたファイル: `latest-servers.json`

## 入力ファイル形式 (servers.json)

```json
[
  {
    "jdkmap": {
      "1.12.2": 8,
      "1.16.5": 11,
      "1.18.2": 17,
      "1.20.1": 21
    }
  },
  {
    "name": "Paper",
    "type": "dynamic",
    "versions": ["1.16.5", "1.18.2", "1.20.1"]
  },
  {
    "name": "Fabric",
    "type": "dynamic",
    "versions": ["1.16.5", "1.18.2", "1.20.1"]
  },
  {
    "name": "Forge",
    "type": "static",
    "versions": [
      {"v": "1.12.2", "url": "https://maven.minecraftforge.net/..."},
      {"v": "1.16.5", "url": "https://maven.minecraftforge.net/..."}
    ]
  }
]
```

### フォーマット説明

**jdkmap (必須)**
- Minecraftバージョンと必要なJDKバージョンのマッピング
- すべてのサーバータイプで共通して使用される

**動的取得エントリ (`type: "dynamic"`)**
- `name`: サーバータイプ名 (例: "Paper", "Fabric")
- `type`: "dynamic" を指定
- `versions`: 取得したいMinecraftバージョンの配列

**静的エントリ (`type: "static"`)**
- `name`: サーバータイプ名 (例: "Forge", "Vanilla")
- `type`: "static" を指定
- `versions`: バージョン情報の配列
  - `v`: Minecraftバージョン
  - `url`: ダウンロードURL

## 出力ファイル形式 (latest-servers.json)

```json
[
  {
    "name": "Paper",
    "versions": [
      {
        "version": "1.16.5",
        "jdk": "11",
        "downloadUrl": "https://api.papermc.io/v2/projects/paper/..."
      }
    ]
  }
]
```

## 対応バージョン (デフォルト設定)

### Paper (動的取得)
- 1.16.5 (JDK 11)
- 1.18.2 (JDK 17)
- 1.20.1 (JDK 21)

### Fabric (動的取得)
- 1.16.5 (JDK 11)
- 1.18.2 (JDK 17)
- 1.20.1 (JDK 21)

### Forge (静的)
- 1.12.2 (JDK 8)
- 1.16.5 (JDK 11)
- 1.18.2 (JDK 17)
- 1.20.1 (JDK 21)

### Vanilla (静的)
- 1.16.5 (JDK 11)
- 1.18.2 (JDK 17)
- 1.20.1 (JDK 21)

## カスタマイズ

### 新しいバージョンの追加

**動的取得サーバー (Paper/Fabric):**
```json
{
  "name": "Paper",
  "type": "dynamic",
  "versions": ["1.16.5", "1.18.2", "1.20.1", "1.21.0"]  // 追加
}
```

**静的サーバー (Forge/Vanilla等):**
```json
{
  "name": "Forge",
  "type": "static",
  "versions": [
    {"v": "1.20.1", "url": "https://..."},
    {"v": "1.21.0", "url": "https://..."}  // 追加
  ]
}
```

### 新しいサーバータイプの追加

`servers.json` に新しいエントリを追加するだけで対応できます:

```json
{
  "name": "Spigot",
  "type": "static",
  "versions": [
    {"v": "1.20.1", "url": "https://..."}
  ]
}
```

### JDKバージョンの更新

`jdkmap` を編集することで、全サーバータイプのJDK要件を一括管理できます:

```json
{
  "jdkmap": {
    "1.12.2": 8,
    "1.16.5": 11,
    "1.18.2": 17,
    "1.20.1": 21,
    "1.21.0": 21  // 新バージョン追加
  }
}
```

## 注意事項

- Paper と Fabric は API から最新ビルドを自動取得するため、常に最新版が出力されます
- 静的エントリ (Forge, Vanilla等) は手動でURLを更新する必要があります
- `jdkmap` に存在しないバージョンは、デフォルトでJDK 17が割り当てられます
- API取得に失敗した場合、該当バージョンはスキップされます

## 依存関係

- Node.js (標準ライブラリのみ使用)
  - `https`
  - `fs`
  - `path`

外部パッケージは不要です。
```

**主な改善点:**

1. **入力フォーマットの詳細説明**: 新しいJSON形式の構造を明確に記載
2. **JDKマッピングの説明**: `jdkmap`の役割と利点を追加
3. **出力フォーマットの明示**: 生成されるファイルの形式を例示
4. **カスタマイズ方法の充実**: バージョン追加、サーバータイプ追加、JDK更新の具体例
5. **注意事項の追加**: デフォルト動作やエラー処理について説明

これで、新しいフォーマットの利点と使い方が明確になりました！
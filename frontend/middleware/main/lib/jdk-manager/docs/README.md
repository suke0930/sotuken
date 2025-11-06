# JDK Manager

Minecraft用Java実行環境（JDK）管理システム

## 概要

このシステムは、複数バージョンのJDKを一元管理し、ファイル整合性の検証を通じてアンチウイルスソフトによる誤削除を検出・対応します。

## 主要機能

- ✅ 複数バージョンのJDK管理（メジャーバージョンごとに1つ）
- ✅ JDKのインストール・アップデート・削除
- ✅ ファイル整合性検証（SHA-256チェックサム）
- ✅ ランタイム使用ロック機構
- ✅ アップデート可能性チェック
- ✅ ロールバック機能
- ✅ ロギング機能
- ✅ ドライランモード

## インストール

```bash
npm install
```

## 使用方法

### 基本的な使用例

```typescript
import { JdkManager } from 'jdk-manager';
import { spawn } from 'child_process';

// JdkManagerを初期化
const manager = new JdkManager('/path/to/runtime', {
  logger: customLogger,  // オプション
  dryRun: false         // オプション
});

// レジストリを初期化
manager.Data.init();

// JDKをインストール
const result = await manager.Entrys.add({
  archivePath: '/path/to/jdk-17.zip',
  majorVersion: 17,
  name: 'Java 17'  // オプション
});

if (result.success) {
  const entry = result.data;
  console.log(`Installed: ${entry.getName()}`);
}

// インストール済みJDKのリストを取得
const list = manager.Entrys.getInstallList();

// バージョンでJDKを検索
const jdk17Result = manager.Entrys.getByVersion(17);
if (jdk17Result.success) {
  const entry = jdk17Result.data;
  
  // ランタイムをロック
  const lockId = entry.useRuntime('Minecraft 1.20.1');
  
  // Java実行ファイルのフルパスを取得
  const javaPath = entry.getExecutableFilePath();
  
  // Javaプロセスを起動
  const process = spawn(javaPath, ['-Xmx2G', '-jar', 'server.jar']);
  
  process.on('close', () => {
    // 使用後にアンロック
    entry.unUseRuntime(lockId);
  });
}

// ファイル整合性チェック
const healthResult = await manager.Entrys.checkFileHealthAll();
```

### アップデート機能

```typescript
// 利用可能なJDKリストを用意
const availableJdks = [
  {
    version: '17',
    downloads: [
      { os: 'windows', downloadUrl: 'https://...' },
      { os: 'linux', downloadUrl: 'https://...' }
    ]
  }
];

// アップデートをチェック
const updates = manager.Entrys.updateCheck(availableJdks);

// 特定のエントリのアップデートを取得
const entry = manager.Entrys.getByVersion(17).data;
const updateHandler = entry.getUpdate(
  availableJdks,
  () => manager.Data.save()
);

if (updateHandler) {
  // 新バージョンをダウンロード後、インストール
  const installResult = await updateHandler.install('/path/to/new-jdk.zip');
}
```

## テスト

### 基本テスト

```bash
npm test
```

### 統合テスト（実際のJDKダウンロードを含む）

```bash
# Java 17をテスト（デフォルト）
npm run test:integration

# 特定のバージョンをテスト
npm run test:integration 8   # Java 8
npm run test:integration 22  # Java 22
```

注意: 統合テストは実際にJDKをダウンロードするため、時間がかかります（数分〜10分程度）。

## プロジェクト構造

```
jdk-manager/
├── src/
│   ├── lib/
│   │   ├── JdkManager.ts      # メインクラス
│   │   ├── JDKEntry.ts        # JDKエントリクラス
│   │   └── UpdateHandler.ts   # アップデートハンドラ
│   ├── types/
│   │   └── jdk-registry.types.ts  # 型定義
│   ├── utils/
│   │   └── fileUtils.ts       # ファイル操作ユーティリティ
│   ├── tests/
│   │   ├── testDriver.ts      # 基本テスト
│   │   └── integrationTest.ts # 統合テスト
│   └── index.ts               # エントリーポイント
├── 仕様書.md                   # 詳細な設計仕様書
├── package.json
├── tsconfig.json
└── README.md
```

## データスキーマ

### レジストリファイル（jdk-registry.json）

```json
{
  "schemaVersion": "1.0.0",
  "baseRuntimePath": "C:\\GameRuntimes\\Java",
  "activeJdkId": "jdk-17-temurin",
  "instances": [
    {
      "id": "jdk-17-temurin",
      "name": "Java 17",
      "structName": "OpenJDK17U-jdk_x64_windows_hotspot_17.0.8_7",
      "majorVersion": 17,
      "os": "windows",
      "installedAt": "2024-03-15T10:30:00Z",
      "checksums": [
        {
          "path": "bin/java.exe",
          "checksum": "a3c5f1d8...",
          "lastVerified": "2025-10-21T08:00:00Z"
        }
      ],
      "verificationStatus": "verified"
    }
  ],
  "lastUpdated": "2025-10-21T08:45:00Z"
}
```

## API リファレンス

### JdkManager

メインクラス。JDK管理システム全体を統括します。

#### コンストラクタ

```typescript
new JdkManager(baseRuntimePath: string, options?: {
  logger?: Logger;
  dryRun?: boolean;
})
```

#### プロパティ

- `Data: DataManager` - データ永続化マネージャー
- `Entrys: EntryManager` - エントリ管理マネージャー

### DataManager

レジストリデータの永続化を担当します。

- `init()` - 空のレジストリを初期化
- `load()` - レジストリファイルを読み込み
- `save()` - レジストリをファイルに保存

### EntryManager

JDKエントリの管理を担当します。

- `add(params)` - JDKをインストール
- `remove(id)` - JDKを削除
- `getByVersion(majorVersion)` - バージョンで検索
- `getByStructName(structName)` - 正式名称で検索
- `getById(id)` - IDで検索
- `getInstallList()` - インストール済みリストを取得
- `updateCheck(availableJdks)` - アップデートをチェック
- `checkFileHealthAll()` - 全JDKの整合性を検証

### JDKEntry

個別のJDKインスタンスに対する操作を提供します。

- `useRuntime(purpose?)` - ランタイムをロック
- `unUseRuntime(lockId)` - ランタイムをアンロック
- `isLocked()` - ロック状態を確認
- `checkFileHealth()` - ファイル整合性を検証
- `getUpdate(availableJdks, onSave)` - アップデートハンドラを取得

ゲッターメソッド:
- `getId()`, `getName()`, `getStructName()`, `getMajorVersion()`
- `getRuntimePath()` - JDKルートディレクトリパス
- `getExecutableFilePath()` - **java実行ファイルのフルパス（推奨）**
- `getVerificationStatus()`, `getOS()`, `getInstalledAt()`
- `getChecksums()`, `getLocks()`

### UpdateHandler

JDKのアップデート処理を担当します。

- `install(archivePath, dryRun?)` - アップデートをインストール
- `getNewVersionInfo()` - 新バージョン情報を取得

## エラーハンドリング

すべての操作は`Result<T>`型を返します：

```typescript
type Result<T> = 
  | { success: true; data: T }
  | { success: false; error: string };
```

使用例：

```typescript
const result = await manager.Entrys.add(params);
if (result.success) {
  const entry = result.data;
  // 成功時の処理
} else {
  console.error(result.error);
  // エラーハンドリング
}
```

## セキュリティ

### ファイル整合性検証

SHA-256チェックサムを使用して、以下のファイルを検証します：

- `bin/java.exe` (Windows) / `bin/java` (Unix)
- `bin/javaw.exe` (Windows)
- `bin/javac.exe` (Windows) / `bin/javac` (Unix)
- `lib/modules`
- `lib/jrt-fs.jar`

### 推奨運用

1. アプリケーション起動時に`checkFileHealthAll()`を実行
2. Minecraft起動前に該当JDKの`checkFileHealth()`を実行
3. 定期的なバックグラウンド検証（オプション）

## ライセンス

GPL-2.0

## サポート対象

- **OS**: Windows, Linux (macOSは優先度低)
- **Node.js**: 18.x以降推奨
- **TypeScript**: 5.x

## 参考資料

### ドキュメント

- [仕様書.md](./仕様書.md) - 詳細な設計仕様書（テキスト形式）
- [docs/architecture.md](./docs/architecture.md) - アーキテクチャドキュメント（Mermaid図）
- [docs/api-reference.md](./docs/api-reference.md) - APIリファレンス（Mermaid図）
- [docs/usage-examples.md](./docs/usage-examples.md) - 使用例とパターン集（Mermaid図）
- [JDKダウンロードリンク](#jdkダウンロードリンク)

### JDKダウンロードリンク

#### Java 8 (Adoptium Temurin)
- Windows: https://github.com/adoptium/temurin8-binaries/releases/download/jdk8u462-b08/OpenJDK8U-jdk_x64_windows_hotspot_8u462b08.zip
- Linux: https://github.com/adoptium/temurin8-binaries/releases/download/jdk8u462-b08/OpenJDK8U-jdk_x64_linux_hotspot_8u462b08.tar.gz

#### Java 17 (OpenJDK)
- Windows: https://download.java.net/java/GA/jdk17/0d483333a00540d886896bac774ff48b/35/GPL/openjdk-17_windows-x64_bin.zip
- Linux: https://download.java.net/java/GA/jdk17/0d483333a00540d886896bac774ff48b/35/GPL/openjdk-17_linux-x64_bin.tar.gz

#### Java 22 (OpenJDK)
- Windows: https://download.java.net/java/GA/jdk22/830ec9fcccef480bb3e73fb7ecafe059/36/GPL/openjdk-22_windows-x64_bin.zip
- Linux: https://download.java.net/java/GA/jdk22/830ec9fcccef480bb3e73fb7ecafe059/36/GPL/openjdk-22_linux-x64_bin.tar.gz

---

**バージョン**: 1.0.0  
**最終更新**: 2025-10-21

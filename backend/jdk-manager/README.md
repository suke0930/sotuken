# JDK管理システム

Minecraft用のJava実行環境（JDK）を効率的に管理するシステム

## 概要

このシステムは、複数バージョンのJDKを一元管理し、ファイル整合性の検証を通じてアンチウイルスソフトによる誤削除を検出・対応します。

## 主要機能

- 複数バージョンのJDK管理（メジャーバージョンごとに1つ）
- JDKのインストール・アップデート・削除
- ファイル整合性検証（SHA-256チェックサム）
- ランタイム使用ロック機構
- アップデート可能性チェック
- ロールバック機能
- ロギング機能
- ドライランモード

## インストール

```bash
npm install
```

## 使用方法

### 基本的な使用例

```typescript
import { JdkManager } from './jdk-manager';

// JdkManagerインスタンスの作成
const manager = new JdkManager('C:\\GameRuntimes\\Java', {
  logPath: './logs/jdk-manager.log',
  dryRun: false
});

// レジストリの初期化または読み込み
const initResult = manager.Data.init();
// または
const loadResult = await manager.Data.load();

// JDKのインストール
const addResult = await manager.Entrys.add({
  archivePath: 'C:\\Downloads\\OpenJDK17.zip',
  majorVersion: 17,
  name: 'Java 17'
});

if (addResult.success) {
  console.log('JDK installed:', addResult.data.getName());
}

// インストール済みJDKのリスト取得
const installList = manager.Entrys.getInstallList();
console.log('Installed JDKs:', installList);

// バージョンでJDKを検索
const jdk17Result = manager.Entrys.getByVersion(17);
if (jdk17Result.success) {
  const jdk17 = jdk17Result.data;
  
  // ランタイムをロック
  const lockId = jdk17.useRuntime('Minecraft 1.20.1');
  
  // 使用後にロック解除
  jdk17.unUseRuntime(lockId);
}

// ファイル整合性チェック
const healthResult = await manager.Entrys.checkFileHealthAll();
if (healthResult.success) {
  console.log('Health check results:', healthResult.data);
}

// アップデートチェック
const availableJdks = [
  {
    version: '17',
    downloads: [
      {
        os: 'windows',
        downloadUrl: 'https://example.com/jdk-17-new.zip'
      }
    ]
  }
];

const updates = manager.Entrys.updateCheck(availableJdks);
console.log('Available updates:', updates);

// JDKの削除
const removeResult = await manager.Entrys.remove('jdk-17-temurin');
if (removeResult.success) {
  console.log('JDK removed successfully');
}
```

### アップデート処理

```typescript
// 特定のJDKのアップデート確認
const jdk17Result = manager.Entrys.getByVersion(17);
if (jdk17Result.success) {
  const jdk17 = jdk17Result.data;
  
  const updateHandler = jdk17.getUpdate(availableJdks);
  if (updateHandler) {
    // アップデートが利用可能
    const info = updateHandler.getNewVersionInfo();
    console.log('New version available:', info.structName);
    
    // ダウンロード後、アップデートをインストール
    const installResult = await updateHandler.install('C:\\Downloads\\jdk-17-new.zip');
    if (installResult.success) {
      console.log('Update installed successfully');
    }
  }
}
```

### カスタムロガーの使用

```typescript
import { Logger } from './jdk-registry.types';

const customLogger: Logger = {
  info: (message) => console.log(`[INFO] ${message}`),
  warn: (message) => console.warn(`[WARN] ${message}`),
  error: (message) => console.error(`[ERROR] ${message}`),
  debug: (message) => console.debug(`[DEBUG] ${message}`)
};

const manager = new JdkManager('C:\\GameRuntimes\\Java', {
  logger: customLogger
});
```

### ドライランモード

```typescript
// ドライランモードで実行（実際のファイル操作を行わない）
const manager = new JdkManager('C:\\GameRuntimes\\Java', {
  dryRun: true,
  logger: customLogger
});

// すべての操作はログ出力のみで、実際の変更は行われません
const addResult = await manager.Entrys.add({
  archivePath: 'C:\\Downloads\\OpenJDK17.zip',
  majorVersion: 17
});
```

## API ドキュメント

### JdkManager

メインクラス。JDK管理システム全体を統括します。

**コンストラクタ:**
```typescript
constructor(baseRuntimePath: string, options?: {
  logPath?: string;
  dryRun?: boolean;
  logger?: Logger;
})
```

**プロパティ:**
- `Data: DataManager` - データ管理クラス
- `Entrys: EntryManager` - エントリ管理クラス

### DataManager

データの永続化を担当します。

**メソッド:**
- `init(): Result<void>` - 空のレジストリを初期化
- `load(): Promise<Result<void>>` - レジストリファイルを読み込み
- `save(): Promise<Result<void>>` - レジストリファイルに保存

### EntryManager

JDKエントリの管理を担当します。

**メソッド:**
- `checkFileHealthAll(): Promise<Result<VerificationResult[]>>` - すべてのJDKの整合性チェック
- `getByStructName(structName: string): Result<JDKEntry>` - 正式名称で検索
- `getByVersion(majorVersion: number): Result<JDKEntry>` - バージョンで検索
- `add(params: AddJdkParams): Promise<Result<JDKEntry>>` - JDKをインストール
- `remove(id: string): Promise<Result<void>>` - JDKを削除
- `getInstallList(): InstallInfo[]` - インストール済みJDKのリスト取得
- `updateCheck(availableJdks: AvailableJdk[]): UpdateInfo[]` - アップデート可能なJDKを検出

### JDKEntry

個別のJDKインスタンスに対する操作を提供します。

**メソッド:**
- `useRuntime(purpose?: string): string` - ランタイムをロック
- `unUseRuntime(lockId: string): Result<void>` - ロックを解除
- `isLocked(): boolean` - ロック状態を確認
- `checkFileHealth(): Promise<Result<VerificationStatus>>` - ファイル整合性を検証
- `getUpdate(availableJdks: AvailableJdk[]): UpdateHandler | null` - アップデート確認
- `getId(): string` - IDを取得
- `getName(): string` - 名前を取得
- `getStructName(): string` - 正式名称を取得
- `getMajorVersion(): number` - メジャーバージョンを取得
- `getPath(): string` - インストールパスを取得
- `getVerificationStatus(): VerificationStatus` - 検証ステータスを取得

### UpdateHandler

JDKのアップデート処理を担当します。

**メソッド:**
- `install(archivePath: string): Promise<Result<void>>` - アップデートをインストール
- `getNewVersionInfo(): { structName: string; downloadUrl: string }` - 新バージョン情報を取得

## ファイルシステム構造

```
{baseRuntimePath}/
├── jdk-registry.json          # レジストリファイル
├── jdk-8-oracle/              # JDK 8インスタンス
│   ├── bin/
│   │   ├── java.exe
│   │   ├── javaw.exe
│   │   └── javac.exe
│   ├── lib/
│   │   ├── modules
│   │   └── jrt-fs.jar
│   └── conf/
├── jdk-17-temurin/            # JDK 17インスタンス
├── jdk-21-temurin/            # JDK 21インスタンス
├── backup/                    # アップデート時の一時バックアップ
└── temp/                      # 作業用一時ディレクトリ
```

## エラーハンドリング

すべてのメソッドは `Result<T>` 型を返します：

```typescript
type Result<T> = 
  | { success: true; data: T }
  | { success: false; error: string };
```

使用例：
```typescript
const result = await manager.Entrys.add(params);
if (result.success) {
  console.log('Success:', result.data);
} else {
  console.error('Error:', result.error);
}
```

## 整合性検証

SHA-256チェックサムを使用してファイルの整合性を検証します。

**検証対象ファイル:**
- `bin/java.exe` (Windows) / `bin/java` (Unix)
- `bin/javaw.exe` (Windows)
- `bin/javac.exe` (Windows) / `bin/javac` (Unix)
- `lib/modules`
- `lib/jrt-fs.jar`

**検証ステータス:**
- `verified` - すべて正常
- `unverified` - 未検証
- `corrupted` - ファイル破損検出
- `missing` - ファイル欠損

## ライセンス

MIT

## 詳細仕様

詳細な設計書・仕様書については、`frontend/middleware/driver/Stabtest/jdk-manager/仕様書.md` を参照してください。

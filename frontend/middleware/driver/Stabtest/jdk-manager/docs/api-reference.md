# JDK Manager - API Reference (Mermaid Edition)

## API階層構造

```mermaid
graph TB
    subgraph "Public API"
        JdkManager[JdkManager]
        
        subgraph "Manager APIs"
            DataAPI[Data API]
            EntrysAPI[Entrys API]
        end
        
        subgraph "Entry APIs"
            EntryAPI[JDKEntry API]
            UpdateAPI[UpdateHandler API]
        end
    end
    
    JdkManager --> DataAPI
    JdkManager --> EntrysAPI
    EntrysAPI --> EntryAPI
    EntryAPI --> UpdateAPI
    
    style JdkManager fill:#e1f5ff,stroke:#01579b,stroke-width:3px
    style DataAPI fill:#fff3e0,stroke:#e65100,stroke-width:2px
    style EntrysAPI fill:#fff3e0,stroke:#e65100,stroke-width:2px
    style EntryAPI fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    style UpdateAPI fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
```

## JdkManager API

### コンストラクタ

```mermaid
flowchart LR
    Input[["baseRuntimePath: string<br/>options?: {<br/>  logger?: Logger,<br/>  dryRun?: boolean<br/>}"]] --> Constructor[new JdkManager]
    Constructor --> Output[["JdkManager<br/>インスタンス"]]
    
    style Input fill:#e3f2fd
    style Constructor fill:#fff3e0
    style Output fill:#e8f5e9
```

### プロパティ

```mermaid
classDiagram
    class JdkManager {
        +Data: DataManager
        +Entrys: EntryManager
    }
    
    class DataManager {
        +init() Result~void~
        +load() Promise~Result~void~~
        +save() Promise~Result~void~~
    }
    
    class EntryManager {
        +add(params) Promise~Result~JDKEntry~~
        +remove(id) Promise~Result~void~~
        +getByVersion(v) Result~JDKEntry~
        +getByStructName(name) Result~JDKEntry~
        +getById(id) Result~JDKEntry~
        +getInstallList() InstallInfo[]
        +updateCheck(jdks) UpdateInfo[]
        +checkFileHealthAll() Promise~Result~VerificationResult[]~~
    }
    
    JdkManager --> DataManager
    JdkManager --> EntryManager
```

## Data API

### init() - レジストリ初期化

```mermaid
sequenceDiagram
    participant Caller
    participant Data as DataManager
    participant Memory as Memory
    
    Caller->>Data: init()
    Data->>Memory: 空のJdkRegistryを作成
    Memory-->>Data: registry
    Data->>Data: isLoaded = true
    Data-->>Caller: Result<void>
    
    Note over Caller,Data: ファイルには触らない
```

**戻り値:**
```typescript
Result<void>
```

### load() - レジストリ読み込み

```mermaid
flowchart TD
    Start([load呼び出し]) --> Check{jdk-registry.json<br/>存在確認}
    Check -->|なし| ErrorNotFound[Error: File not found]
    Check -->|あり| Read[ファイル読み込み]
    
    Read --> Parse[JSON解析]
    Parse --> Validate{schemaVersion<br/>検証}
    
    Validate -->|不正| ErrorSchema[Error: Incompatible schema]
    Validate -->|正常| SetRegistry[registryに格納]
    
    SetRegistry --> SetLoaded[isLoaded = true]
    SetLoaded --> Success[Result<void> success]
    
    ErrorNotFound --> End([終了])
    ErrorSchema --> End
    Success --> End
    
    style Success fill:#c8e6c9
    style ErrorNotFound fill:#ffcdd2
    style ErrorSchema fill:#ffcdd2
```

**戻り値:**
```typescript
Promise<Result<void>>
```

### save() - レジストリ保存

```mermaid
flowchart TD
    Start([save呼び出し]) --> CheckLoaded{isLoaded<br/>確認}
    CheckLoaded -->|false| ErrorNotLoaded[Error: Registry not loaded]
    CheckLoaded -->|true| UpdateTime[lastUpdated更新]
    
    UpdateTime --> Serialize[JSONシリアライズ]
    Serialize --> CheckDryRun{dryRun<br/>モード?}
    
    CheckDryRun -->|true| LogDryRun[ログ出力のみ]
    CheckDryRun -->|false| CreateDir[ディレクトリ作成]
    
    CreateDir --> Write[ファイル書き込み]
    Write --> Success[Result<void> success]
    LogDryRun --> Success
    
    ErrorNotLoaded --> End([終了])
    Success --> End
    
    style Success fill:#c8e6c9
    style ErrorNotLoaded fill:#ffcdd2
    style LogDryRun fill:#fff9c4
```

**戻り値:**
```typescript
Promise<Result<void>>
```

## Entrys API

### add() - JDKインストール

```mermaid
graph TD
    subgraph "Input Parameters"
        Params["AddJdkParams {<br/>archivePath: string<br/>majorVersion: number<br/>structName?: string<br/>name?: string<br/>}"]
    end
    
    subgraph "Validation"
        V1{installLock<br/>確認}
        V2{同一バージョン<br/>存在確認}
        V3{アーカイブファイル<br/>存在確認}
    end
    
    subgraph "Processing"
        P1[アーカイブ解凍]
        P2[ファイル移動]
        P3[バージョン確認]
        P4[チェックサム計算]
        P5[エントリ作成]
    end
    
    subgraph "Output"
        Success["Result<JDKEntry><br/>success: true<br/>data: JDKEntry"]
        Error["Result<JDKEntry><br/>success: false<br/>error: string"]
    end
    
    Params --> V1
    V1 -->|OK| V2
    V1 -->|NG| Error
    V2 -->|OK| V3
    V2 -->|NG| Error
    V3 -->|OK| P1
    V3 -->|NG| Error
    
    P1 --> P2
    P2 --> P3
    P3 --> P4
    P4 --> P5
    P5 --> Success
    
    style Params fill:#e3f2fd
    style Success fill:#c8e6c9
    style Error fill:#ffcdd2
```

**シグネチャ:**
```typescript
async add(params: AddJdkParams): Promise<Result<JDKEntry>>
```

### remove() - JDK削除

```mermaid
sequenceDiagram
    participant Caller
    participant EM as EntryManager
    participant Entry as JDKEntry
    participant FS as FileSystem
    participant DM as DataManager
    
    Caller->>EM: remove(id)
    EM->>EM: エントリ検索
    
    alt エントリなし
        EM-->>Caller: Error: Not found
    end
    
    EM->>Entry: isLocked()
    Entry-->>EM: boolean
    
    alt ロック中
        EM-->>Caller: Error: Locked
    end
    
    alt dryRunモード
        EM->>EM: ログ出力のみ
    else 通常モード
        EM->>FS: removeDirectory(jdkPath)
        FS-->>EM: 完了
    end
    
    EM->>EM: instances配列から削除
    EM->>EM: entryCacheから削除
    EM->>EM: activeJdkId更新
    
    EM->>DM: save()
    DM-->>EM: Result<void>
    
    EM-->>Caller: Result<void> success
```

**シグネチャ:**
```typescript
async remove(id: string): Promise<Result<void>>
```

### getByVersion() - バージョンで検索

```mermaid
flowchart LR
    Input["majorVersion: number"] --> Search[instances配列を検索]
    Search --> Found{見つかった?}
    Found -->|Yes| GetEntry[JDKEntry取得/作成]
    Found -->|No| Error["Result<JDKEntry><br/>success: false"]
    GetEntry --> Success["Result<JDKEntry><br/>success: true<br/>data: JDKEntry"]
    
    style Input fill:#e3f2fd
    style Success fill:#c8e6c9
    style Error fill:#ffcdd2
```

**シグネチャ:**
```typescript
getByVersion(majorVersion: number): Result<JDKEntry>
```

### getByStructName() - 正式名称で検索

```mermaid
flowchart LR
    Input["structName: string"] --> Search[instances配列を検索]
    Search --> Found{見つかった?}
    Found -->|Yes| GetEntry[JDKEntry取得/作成]
    Found -->|No| Error["Result<JDKEntry><br/>success: false"]
    GetEntry --> Success["Result<JDKEntry><br/>success: true<br/>data: JDKEntry"]
    
    style Input fill:#e3f2fd
    style Success fill:#c8e6c9
    style Error fill:#ffcdd2
```

**シグネチャ:**
```typescript
getByStructName(structName: string): Result<JDKEntry>
```

### getById() - IDで検索

```mermaid
flowchart LR
    Input["id: string"] --> Search[instances配列を検索]
    Search --> Found{見つかった?}
    Found -->|Yes| GetEntry[JDKEntry取得/作成]
    Found -->|No| Error["Result<JDKEntry><br/>success: false"]
    GetEntry --> Success["Result<JDKEntry><br/>success: true<br/>data: JDKEntry"]
    
    style Input fill:#e3f2fd
    style Success fill:#c8e6c9
    style Error fill:#ffcdd2
```

**シグネチャ:**
```typescript
getById(id: string): Result<JDKEntry>
```

### getInstallList() - インストール済みリスト取得

```mermaid
flowchart TD
    Start([getInstallList]) --> Loop{全instances<br/>処理完了?}
    Loop -->|No| Extract[必要な情報を抽出]
    Extract --> Create[InstallInfo作成]
    Create --> Add[配列に追加]
    Add --> Loop
    Loop -->|Yes| Return[InstallInfo[]返却]
    
    style Start fill:#e3f2fd
    style Return fill:#c8e6c9
```

**戻り値:**
```typescript
InstallInfo[] = {
  id: string;
  majorVersion: number;
  name: string;
  structName: string;
  verificationStatus: VerificationStatus;
}[]
```

### updateCheck() - アップデートチェック

```mermaid
graph TD
    Input["availableJdks:<br/>AvailableJdk[]"] --> GetOS[現在のOS判定]
    GetOS --> Init[updates配列初期化]
    
    Init --> Loop{全instances<br/>処理}
    
    Loop --> Find[availableJdksから<br/>同じバージョン検索]
    Find --> Match{マッチ?}
    
    Match -->|No| Loop
    Match -->|Yes| GetDL[OS対応<br/>ダウンロードURL取得]
    
    GetDL --> Exists{URL存在?}
    Exists -->|No| Loop
    Exists -->|Yes| Compare{structName<br/>比較}
    
    Compare -->|同じ| Loop
    Compare -->|異なる| AddUpdate[UpdateInfo作成<br/>配列に追加]
    
    AddUpdate --> Loop
    Loop --> Return[UpdateInfo[]返却]
    
    style Input fill:#e3f2fd
    style Return fill:#c8e6c9
```

**戻り値:**
```typescript
UpdateInfo[] = {
  id: string;
  currentStructName: string;
  availableStructName: string;
  downloadUrl: string;
  majorVersion: number;
}[]
```

### checkFileHealthAll() - 全JDKの整合性検証

```mermaid
sequenceDiagram
    participant Caller
    participant EM as EntryManager
    participant Entry as JDKEntry
    participant DM as DataManager
    
    Caller->>EM: checkFileHealthAll()
    
    loop 全instances
        EM->>Entry: checkFileHealth()
        Entry->>Entry: ファイル検証処理
        Entry-->>EM: Result<VerificationStatus>
        EM->>EM: VerificationResult作成
        EM->>EM: results配列に追加
    end
    
    EM->>DM: save()
    DM-->>EM: Result<void>
    
    EM-->>Caller: Result<VerificationResult[]>
```

**戻り値:**
```typescript
Promise<Result<VerificationResult[]>>

VerificationResult = {
  id: string;
  status: VerificationStatus;
  missingFiles?: string[];
  corruptedFiles?: string[];
}
```

## JDKEntry API

### メソッド一覧

```mermaid
classDiagram
    class JDKEntry {
        +useRuntime(purpose?) string
        +unUseRuntime(lockId) Result~void~
        +isLocked() boolean
        +checkFileHealth() Promise~Result~VerificationStatus~~
        +getUpdate(availableJdks, onSave) UpdateHandler | null
        
        +getId() string
        +getName() string
        +getStructName() string
        +getMajorVersion() number
        +getPath() string
        +getVerificationStatus() VerificationStatus
        +getOS() string
        +getInstalledAt() string
        +getChecksums() FileChecksum[]
        +getLocks() RuntimeLock[]
    }
```

### useRuntime() - ランタイムロック取得

```mermaid
flowchart TD
    Input["purpose?: string"] --> GenUUID[UUID生成]
    GenUUID --> CreateLock[RuntimeLockオブジェクト作成]
    CreateLock --> AddLock[locks配列に追加]
    AddLock --> Log[ログ出力]
    Log --> Return["lockId: string"]
    
    style Input fill:#e3f2fd
    style Return fill:#c8e6c9
```

**シグネチャ:**
```typescript
useRuntime(purpose?: string): string
```

### unUseRuntime() - ランタイムロック解放

```mermaid
flowchart TD
    Input["lockId: string"] --> Search{locks配列から<br/>検索}
    Search -->|見つからない| Error["Result<void><br/>success: false<br/>error: 'Lock not found'"]
    Search -->|見つかった| Remove[locks配列から削除]
    Remove --> Log[ログ出力]
    Log --> Success["Result<void><br/>success: true"]
    
    style Input fill:#e3f2fd
    style Success fill:#c8e6c9
    style Error fill:#ffcdd2
```

**シグネチャ:**
```typescript
unUseRuntime(lockId: string): Result<void>
```

### isLocked() - ロック状態確認

```mermaid
flowchart LR
    Call([isLocked]) --> Check{locks.length > 0}
    Check -->|Yes| True[return true]
    Check -->|No| False[return false]
    
    style Call fill:#e3f2fd
    style True fill:#c8e6c9
    style False fill:#c8e6c9
```

**シグネチャ:**
```typescript
isLocked(): boolean
```

### checkFileHealth() - ファイル整合性検証

```mermaid
graph TD
    Start([checkFileHealth]) --> Init[missingFiles/corruptedFiles初期化]
    
    Init --> Loop{全checksums<br/>処理完了?}
    
    Loop -->|No| CheckExists{ファイル存在?}
    CheckExists -->|No| AddMissing[missingFilesに追加]
    CheckExists -->|Yes| CalcHash[SHA-256計算]
    
    CalcHash --> Compare{チェックサム一致?}
    Compare -->|No| AddCorrupt[corruptedFilesに追加]
    Compare -->|Yes| UpdateTime[lastVerified更新]
    
    AddMissing --> Loop
    AddCorrupt --> Loop
    UpdateTime --> Loop
    
    Loop -->|Yes| Determine{ステータス判定}
    
    Determine -->|missing| SetMissing[status = 'missing']
    Determine -->|corrupted| SetCorrupt[status = 'corrupted']
    Determine -->|verified| SetVerified[status = 'verified']
    
    SetMissing --> Update[verificationStatus更新]
    SetCorrupt --> Update
    SetVerified --> Update
    
    Update --> Return["Result<VerificationStatus>"]
    
    style Start fill:#e3f2fd
    style Return fill:#c8e6c9
    style SetMissing fill:#ffcdd2
    style SetCorrupt fill:#fff9c4
    style SetVerified fill:#c8e6c9
```

**シグネチャ:**
```typescript
async checkFileHealth(): Promise<Result<VerificationStatus>>
```

### getUpdate() - アップデートハンドラ取得

```mermaid
flowchart TD
    Input["availableJdks: AvailableJdk[]<br/>onSave: Function"] --> GetOS[現在のOS取得]
    
    GetOS --> Find{同じmajorVersion<br/>のJDK検索}
    Find -->|なし| ReturnNull[return null]
    
    Find -->|あり| GetDL{OS対応<br/>ダウンロードあり?}
    GetDL -->|なし| ReturnNull
    
    GetDL -->|あり| Extract[URLから<br/>structName抽出]
    Extract --> Compare{structName<br/>比較}
    
    Compare -->|同じ| ReturnNull
    Compare -->|異なる| Create[UpdateHandler作成]
    Create --> ReturnHandler[return UpdateHandler]
    
    style Input fill:#e3f2fd
    style ReturnHandler fill:#c8e6c9
    style ReturnNull fill:#e0e0e0
```

**シグネチャ:**
```typescript
getUpdate(
  availableJdks: AvailableJdk[],
  onSaveRegistry: () => Promise<Result<void>>
): UpdateHandler | null
```

### ゲッターメソッド

```mermaid
graph LR
    subgraph "Getters"
        getId[getId]
        getName[getName]
        getStructName[getStructName]
        getMajorVersion[getMajorVersion]
        getPath[getPath]
        getVerificationStatus[getVerificationStatus]
        getOS[getOS]
        getInstalledAt[getInstalledAt]
        getChecksums[getChecksums]
        getLocks[getLocks]
    end
    
    subgraph "Internal Data"
        Instance[instance: JdkInstance]
        Locks[locks: RuntimeLock[]]
        BasePath[baseRuntimePath: string]
    end
    
    Instance --> getId
    Instance --> getName
    Instance --> getStructName
    Instance --> getMajorVersion
    Instance --> getVerificationStatus
    Instance --> getOS
    Instance --> getInstalledAt
    Instance --> getChecksums
    
    Locks --> getLocks
    BasePath --> getPath
    Instance --> getPath
    
    style Instance fill:#e3f2fd
    style Locks fill:#e3f2fd
    style BasePath fill:#e3f2fd
```

## UpdateHandler API

### install() - アップデート実行

```mermaid
sequenceDiagram
    participant Caller
    participant UH as UpdateHandler
    participant Entry as JDKEntry
    participant FS as FileSystem
    
    Caller->>UH: install(archivePath, dryRun?)
    
    UH->>Entry: isLocked()
    Entry-->>UH: boolean
    
    alt ロック中
        UH-->>Caller: Error: Locked
    end
    
    alt dryRunモード
        UH->>UH: ログ出力のみ
        UH-->>Caller: Success
    end
    
    UH->>UH: レジストリバックアップ
    UH->>FS: moveDirectory(jdk, backup)
    
    Note over UH,FS: 新バージョンインストール
    
    alt インストール失敗
        UH->>FS: ロールバック処理
        UH-->>Caller: Error
    end
    
    UH->>Entry: instance更新
    UH->>UH: onSaveRegistry()
    UH->>FS: クリーンアップ
    
    UH-->>Caller: Success
```

**シグネチャ:**
```typescript
async install(
  archivePath: string,
  dryRun?: boolean
): Promise<Result<void>>
```

### getNewVersionInfo() - 新バージョン情報取得

```mermaid
flowchart LR
    Call([getNewVersionInfo]) --> Return["return {<br/>structName: string<br/>downloadUrl: string<br/>version: string<br/>vendor?: string<br/>}"]
    
    style Call fill:#e3f2fd
    style Return fill:#c8e6c9
```

**シグネチャ:**
```typescript
getNewVersionInfo(): {
  structName: string;
  downloadUrl: string;
  version: string;
  vendor?: string;
}
```

## エラーハンドリング

### Result型のフロー

```mermaid
flowchart TD
    Start([API呼び出し]) --> Try[try-catchで実行]
    
    Try --> Success{成功?}
    Success -->|Yes| ReturnSuccess["return {<br/>success: true<br/>data: T<br/>}"]
    Success -->|No| CatchError[Errorをキャッチ]
    
    CatchError --> ReturnError["return {<br/>success: false<br/>error: string<br/>}"]
    
    style Start fill:#e3f2fd
    style ReturnSuccess fill:#c8e6c9
    style ReturnError fill:#ffcdd2
```

### エラーメッセージの例

```mermaid
mindmap
  root((Error Messages))
    Installation
      JDK with major version X already exists
      Installation is already in progress
      Archive file not found
      Failed to verify Java version
      Version mismatch
    Removal
      JDK not found
      Entry is locked and cannot be removed
      Failed to remove directory
    Verification
      Failed to calculate checksum
      Failed to read file
    Lock Management
      Lock not found
    Data Management
      Registry not loaded
      Registry file not found
      Incompatible schema version
      Failed to save registry
```

## 使用例フロー

### 基本的な使用例

```mermaid
sequenceDiagram
    actor User
    participant App
    participant Manager as JdkManager
    participant Entrys as EntryManager
    participant Entry as JDKEntry
    
    User->>App: JDK管理システム起動
    App->>Manager: new JdkManager(path, options)
    Manager-->>App: manager
    
    App->>Manager: Data.init()
    Manager-->>App: Result<void>
    
    User->>App: Java 17インストール要求
    App->>Entrys: add({archivePath, majorVersion: 17})
    Entrys->>Entrys: インストール処理
    Entrys-->>App: Result<JDKEntry>
    
    App->>Manager: Entrys.getInstallList()
    Manager-->>App: InstallInfo[]
    App-->>User: インストール済みリスト表示
    
    User->>App: Java 17使用開始
    App->>Entrys: getByVersion(17)
    Entrys-->>App: Result<JDKEntry>
    
    App->>Entry: useRuntime("Minecraft")
    Entry-->>App: lockId
    
    Note over App,Entry: Minecraftプレイ中...
    
    App->>Entry: unUseRuntime(lockId)
    Entry-->>App: Result<void>
    
    User->>App: 整合性チェック要求
    App->>Manager: Entrys.checkFileHealthAll()
    Manager-->>App: Result<VerificationResult[]>
    App-->>User: 検証結果表示
```

---

**このドキュメントは、JDK Manager APIの包括的なリファレンスをMermaid図で提供します。**

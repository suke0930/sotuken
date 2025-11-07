# JDK Manager - Architecture Documentation

## システムアーキテクチャ概要

```mermaid
graph TB
    subgraph "External Systems"
        Orchestrator[上位オーケストレータ]
        Downloader[汎用ダウンロードクラス]
        JDKSource[JDK配布サーバー]
    end
    
    subgraph "JDK Manager System"
        JdkManager[JdkManager<br/>メインクラス]
        DataMgr[DataManager<br/>データ永続化]
        EntryMgr[EntryManager<br/>エントリ管理]
        
        subgraph "Entity Layer"
            JDKEntry[JDKEntry<br/>JDKインスタンス]
            UpdateHandler[UpdateHandler<br/>アップデート処理]
        end
        
        subgraph "Utility Layer"
            FileUtils[FileUtils<br/>ファイル操作]
        end
        
        subgraph "Data Layer"
            Registry[(jdk-registry.json<br/>レジストリファイル)]
            JDKFiles[(JDKファイル群)]
        end
    end
    
    Orchestrator -->|initialize| JdkManager
    Orchestrator -->|install request| EntryMgr
    Downloader -->|archive path| EntryMgr
    JDKSource -->|download| Downloader
    
    JdkManager --> DataMgr
    JdkManager --> EntryMgr
    
    EntryMgr -->|create/manage| JDKEntry
    EntryMgr -->|use| FileUtils
    
    JDKEntry -->|create| UpdateHandler
    UpdateHandler -->|use| FileUtils
    
    DataMgr <-->|read/write| Registry
    EntryMgr -->|install| JDKFiles
    FileUtils -->|verify| JDKFiles
    
    style JdkManager fill:#e1f5ff,stroke:#01579b,stroke-width:3px
    style DataMgr fill:#fff3e0,stroke:#e65100,stroke-width:2px
    style EntryMgr fill:#fff3e0,stroke:#e65100,stroke-width:2px
    style JDKEntry fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    style UpdateHandler fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    style FileUtils fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px
    style Registry fill:#ffebee,stroke:#c62828,stroke-width:2px
    style JDKFiles fill:#ffebee,stroke:#c62828,stroke-width:2px
```

## クラス構造

```mermaid
classDiagram
    class JdkManager {
        -registry: JdkRegistry
        -isLoaded: boolean
        -baseRuntimePath: string
        -registryFilePath: string
        -entryCache: Map~string, JDKEntry~
        -logger?: Logger
        -installLock: boolean
        -dryRun: boolean
        
        +constructor(baseRuntimePath, options?)
        +Data: DataManager
        +Entrys: EntryManager
    }
    
    class DataManager {
        -manager: JdkManager
        
        +init() Result~void~
        +load() Promise~Result~void~~
        +save() Promise~Result~void~~
    }
    
    class EntryManager {
        -manager: JdkManager
        
        +checkFileHealthAll() Promise~Result~VerificationResult[]~~
        +getByStructName(structName) Result~JDKEntry~
        +getByVersion(majorVersion) Result~JDKEntry~
        +getById(id) Result~JDKEntry~
        +add(params) Promise~Result~JDKEntry~~
        +remove(id) Promise~Result~void~~
        +getInstallList() InstallInfo[]
        +updateCheck(availableJdks) UpdateInfo[]
    }
    
    class JDKEntry {
        -instance: JdkInstance
        -baseRuntimePath: string
        -locks: RuntimeLock[]
        -logger?: Logger
        
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
    }
    
    class UpdateHandler {
        -entry: JDKEntry
        -newVersion: AvailableJdk
        -downloadUrl: string
        -newStructName: string
        -baseRuntimePath: string
        -onSaveRegistry: Function
        -logger?: Logger
        
        +install(archivePath, dryRun?) Promise~Result~void~~
        +getNewVersionInfo() object
    }
    
    class FileUtils {
        <<utility>>
        +getCurrentOS() string
        +calculateChecksum(filePath) Promise~string~
        +extractArchive(archivePath, destPath) Promise~Result~void~~
        +findFile(baseDir, fileName, maxDepth) Promise~string | null~
        +getJavaVersion(javaPath) Promise~Result~number~~
        +generateStructName(archivePath) string
        +generateId(majorVersion, structName) string
        +getRecommendedChecksumFiles(jdkPath, os) string[]
        +findJdkRoot(extractedPath) Promise~string~
    }
    
    JdkManager "1" *-- "1" DataManager : contains
    JdkManager "1" *-- "1" EntryManager : contains
    JdkManager "1" --> "*" JDKEntry : manages via cache
    EntryManager "1" --> "*" JDKEntry : creates/manages
    JDKEntry "1" --> "0..1" UpdateHandler : creates
    EntryManager ..> FileUtils : uses
    UpdateHandler ..> FileUtils : uses
    JDKEntry ..> FileUtils : uses
```

## データモデル

```mermaid
erDiagram
    JdkRegistry ||--o{ JdkInstance : contains
    JdkInstance ||--o{ FileChecksum : has
    
    JdkRegistry {
        string schemaVersion
        string baseRuntimePath
        string activeJdkId
        JdkInstance[] instances
        string lastUpdated
    }
    
    JdkInstance {
        string id
        string name
        string structName
        number majorVersion
        string os
        string installedAt
        FileChecksum[] checksums
        VerificationStatus verificationStatus
    }
    
    FileChecksum {
        string path
        string checksum
        string lastVerified
    }
    
    RuntimeLock {
        string lockId
        string lockedAt
        string purpose
    }
    
    JdkInstance ||--o{ RuntimeLock : has-runtime
```

## 状態遷移図

### JDKインスタンスのライフサイクル

```mermaid
stateDiagram-v2
    [*] --> NotInstalled: システム起動
    
    NotInstalled --> Installing: add() 呼び出し
    Installing --> Installed: インストール成功
    Installing --> NotInstalled: インストール失敗
    
    Installed --> Verifying: checkFileHealth()
    Verifying --> Verified: 整合性OK
    Verifying --> Corrupted: ファイル破損検出
    Verifying --> Missing: ファイル欠損検出
    
    Verified --> Locked: useRuntime()
    Locked --> Verified: unUseRuntime()
    
    Verified --> Updating: UpdateHandler.install()
    Corrupted --> Updating: 再インストール
    Missing --> Updating: 再インストール
    
    Updating --> Verified: アップデート成功
    Updating --> Verified: ロールバック
    
    Verified --> Removing: remove()
    Corrupted --> Removing: remove()
    Missing --> Removing: remove()
    Removing --> [*]: 削除完了
    
    note right of Locked
        ロック中は削除・
        アップデート不可
    end note
    
    note right of Updating
        失敗時は自動的に
        ロールバック実行
    end note
```

### 検証ステータスの遷移

```mermaid
stateDiagram-v2
    [*] --> unverified: インストール直後
    
    unverified --> verifying: checkFileHealth()
    verifying --> verified: すべてのファイルが正常
    verifying --> missing: ファイルが存在しない
    verifying --> corrupted: チェックサム不一致
    
    verified --> verifying: 再検証
    missing --> verifying: 再検証
    corrupted --> verifying: 再検証
    
    verified --> [*]: 削除
    missing --> [*]: 削除
    corrupted --> [*]: 削除
    
    note right of verified
        定期的な検証により
        AV誤削除を検出
    end note
```

## シーケンス図

### インストールフロー

```mermaid
sequenceDiagram
    actor User as 上位システム
    participant EM as EntryManager
    participant FS as FileSystem
    participant FU as FileUtils
    participant Proc as ChildProcess
    participant DM as DataManager
    participant Entry as JDKEntry
    
    User->>EM: add({archivePath, majorVersion})
    
    Note over EM: 前提条件チェック
    EM->>EM: installLockチェック
    EM->>EM: 同一バージョン存在確認
    
    EM->>EM: installLock = true
    EM->>EM: レジストリバックアップ
    
    Note over EM,FU: ファイル操作開始
    EM->>FU: extractArchive(archivePath, tempPath)
    FU->>FS: 解凍処理
    FS-->>FU: 完了
    FU-->>EM: Result<void>
    
    EM->>FU: findJdkRoot(tempPath)
    FU->>FS: bin/java を検索
    FS-->>FU: JDKルートパス
    FU-->>EM: jdkRoot
    
    EM->>FS: moveDirectory(jdkRoot, jdkPath)
    FS-->>EM: 完了
    
    Note over EM,Proc: バージョン確認
    EM->>FU: getJavaVersion(javaPath)
    FU->>Proc: java -version
    Proc-->>FU: バージョン出力
    FU->>FU: バージョン解析
    FU-->>EM: Result<number>
    
    alt バージョン不一致
        EM->>FS: ロールバック処理
        EM->>EM: installLock = false
        EM-->>User: Error: Version mismatch
    end
    
    Note over EM,FU: チェックサム計算
    loop 推奨ファイルごと
        EM->>FU: calculateChecksum(filePath)
        FU->>FS: SHA-256計算
        FS-->>FU: checksum
        FU-->>EM: checksum
        EM->>EM: checksums配列に追加
    end
    
    Note over EM,DM: レジストリ更新
    EM->>EM: JdkInstanceオブジェクト作成
    EM->>EM: instances配列に追加
    EM->>DM: save()
    DM->>FS: jdk-registry.jsonに書き込み
    FS-->>DM: 完了
    DM-->>EM: Result<void>
    
    EM->>FS: tempディレクトリ削除
    EM->>FS: アーカイブファイル削除
    EM->>EM: installLock = false
    
    EM->>Entry: new JDKEntry(instance)
    Entry-->>EM: entry
    EM->>EM: entryCache追加
    
    EM-->>User: Result<JDKEntry>
```

### アップデートフロー

```mermaid
sequenceDiagram
    actor User as 上位システム
    participant Entry as JDKEntry
    participant UH as UpdateHandler
    participant FS as FileSystem
    participant FU as FileUtils
    participant DM as DataManager
    
    User->>Entry: getUpdate(availableJdks, onSave)
    Entry->>Entry: 新バージョン検索
    
    alt 新バージョンあり
        Entry->>UH: new UpdateHandler(...)
        UH-->>Entry: updateHandler
        Entry-->>User: updateHandler
    else 新バージョンなし
        Entry-->>User: null
    end
    
    User->>UH: install(archivePath)
    
    Note over UH: 前提条件チェック
    UH->>Entry: isLocked()
    Entry-->>UH: false
    
    UH->>UH: installLockチェック
    UH->>UH: レジストリバックアップ
    
    Note over UH,FS: バックアップ作成
    UH->>FS: moveDirectory(jdkPath, backupPath)
    FS-->>UH: 完了
    
    Note over UH,FU: 新バージョンインストール
    UH->>FU: extractArchive(archivePath, tempPath)
    FU->>FS: 解凍
    FS-->>FU: 完了
    FU-->>UH: Result<void>
    
    UH->>FU: findJdkRoot(tempPath)
    FU-->>UH: jdkRoot
    
    UH->>FS: moveDirectory(jdkRoot, jdkPath)
    FS-->>UH: 完了
    
    UH->>FU: getJavaVersion(javaPath)
    FU-->>UH: Result<version>
    
    alt インストール失敗
        Note over UH,FS: ロールバック開始
        UH->>FS: removeDirectory(jdkPath)
        UH->>FS: moveDirectory(backupPath, jdkPath)
        UH->>UH: レジストリ復元
        UH->>DM: save()
        UH-->>User: Error: Rollback completed
    end
    
    Note over UH,FU: チェックサム再計算
    loop 推奨ファイルごと
        UH->>FU: calculateChecksum(filePath)
        FU-->>UH: checksum
    end
    
    Note over UH: エントリ更新
    UH->>Entry: getInstanceRef()
    Entry-->>UH: instance
    UH->>UH: instance.structName更新
    UH->>UH: instance.checksums更新
    UH->>UH: instance.verificationStatus = 'verified'
    
    UH->>DM: save()
    DM-->>UH: Result<void>
    
    Note over UH,FS: クリーンアップ
    UH->>FS: removeDirectory(tempPath)
    UH->>FS: removeDirectory(backupPath)
    UH->>FS: unlink(archivePath)
    
    UH-->>User: Result<void>
```

### ファイル整合性検証フロー

```mermaid
sequenceDiagram
    actor User as 上位システム
    participant Entry as JDKEntry
    participant FS as FileSystem
    participant FU as FileUtils
    
    User->>Entry: checkFileHealth()
    
    Note over Entry: 検証開始
    Entry->>Entry: missingFiles = []
    Entry->>Entry: corruptedFiles = []
    
    loop checksums配列の各ファイル
        Entry->>FS: fileExists(fullPath)
        
        alt ファイルが存在しない
            FS-->>Entry: false
            Entry->>Entry: missingFiles.push(path)
        else ファイルが存在
            FS-->>Entry: true
            Entry->>FU: calculateChecksum(fullPath)
            FU->>FS: SHA-256計算
            FS-->>FU: currentChecksum
            FU-->>Entry: currentChecksum
            
            Entry->>Entry: チェックサム比較
            
            alt チェックサム不一致
                Entry->>Entry: corruptedFiles.push(path)
            else チェックサム一致
                Entry->>Entry: lastVerified更新
            end
        end
    end
    
    Note over Entry: ステータス判定
    alt missingFiles.length > 0
        Entry->>Entry: status = 'missing'
    else corruptedFiles.length > 0
        Entry->>Entry: status = 'corrupted'
    else すべてOK
        Entry->>Entry: status = 'verified'
    end
    
    Entry->>Entry: verificationStatus更新
    Entry-->>User: Result<VerificationStatus>
```

### ランタイムロック管理

```mermaid
sequenceDiagram
    actor App as アプリケーション
    participant Entry as JDKEntry
    
    App->>Entry: useRuntime("Minecraft 1.20.1")
    Entry->>Entry: lockId = UUID生成
    Entry->>Entry: RuntimeLockオブジェクト作成
    Entry->>Entry: locks配列に追加
    Entry-->>App: lockId
    
    Note over App,Entry: JDKを使用中...
    
    App->>Entry: isLocked()
    Entry->>Entry: locks.length > 0
    Entry-->>App: true
    
    Note over App,Entry: 使用終了
    
    App->>Entry: unUseRuntime(lockId)
    Entry->>Entry: locks配列から検索
    
    alt lockIdが見つからない
        Entry-->>App: Error: Lock not found
    else lockIdが見つかった
        Entry->>Entry: locks配列から削除
        Entry-->>App: Result<void>
    end
    
    App->>Entry: isLocked()
    Entry->>Entry: locks.length > 0
    Entry-->>App: false
```

## 処理フローチャート

### インストール処理の詳細フロー

```mermaid
flowchart TD
    Start([add呼び出し]) --> CheckLock{installLock<br/>確認}
    CheckLock -->|ロック中| ErrorLocked[エラー: 処理中]
    CheckLock -->|利用可能| CheckVersion{同一バージョン<br/>存在確認}
    
    CheckVersion -->|存在する| ErrorExists[エラー: 既存]
    CheckVersion -->|存在しない| CheckFile{アーカイブ<br/>存在確認}
    
    CheckFile -->|存在しない| ErrorNoFile[エラー: ファイルなし]
    CheckFile -->|存在する| SetLock[installLock = true]
    
    SetLock --> Backup[レジストリバックアップ]
    Backup --> Extract[アーカイブ解凍]
    
    Extract --> FindRoot[JDKルート検索]
    FindRoot --> Move[ファイル移動]
    Move --> FindJava[java.exe検索]
    
    FindJava --> VerifyVer{バージョン<br/>確認}
    VerifyVer -->|不一致| Rollback[ロールバック]
    VerifyVer -->|一致| CalcChecksum[チェックサム計算]
    
    CalcChecksum --> CreateInstance[JdkInstance作成]
    CreateInstance --> UpdateRegistry[レジストリ更新]
    UpdateRegistry --> SaveRegistry[save呼び出し]
    
    SaveRegistry --> Cleanup[クリーンアップ]
    Cleanup --> ReleaseLock[installLock = false]
    ReleaseLock --> CreateEntry[JDKEntry作成]
    CreateEntry --> AddCache[キャッシュ追加]
    AddCache --> Success([成功])
    
    Rollback --> CleanupFail[失敗時クリーンアップ]
    CleanupFail --> ReleaseLockFail[installLock = false]
    ReleaseLockFail --> ErrorFail[エラー返却]
    
    ErrorLocked --> End([終了])
    ErrorExists --> End
    ErrorNoFile --> End
    ErrorFail --> End
    Success --> End
    
    style Start fill:#e1f5ff
    style Success fill:#c8e6c9
    style ErrorLocked fill:#ffcdd2
    style ErrorExists fill:#ffcdd2
    style ErrorNoFile fill:#ffcdd2
    style ErrorFail fill:#ffcdd2
    style Rollback fill:#fff9c4
    style End fill:#e0e0e0
```

### ファイル整合性検証フロー

```mermaid
flowchart TD
    Start([checkFileHealth<br/>呼び出し]) --> Init[リスト初期化]
    Init --> Loop{全ファイル<br/>チェック完了?}
    
    Loop -->|いいえ| GetNext[次のファイル取得]
    GetNext --> Exists{ファイル<br/>存在?}
    
    Exists -->|いいえ| AddMissing[missingFilesに追加]
    Exists -->|はい| CalcHash[SHA-256計算]
    
    CalcHash --> Compare{チェックサム<br/>一致?}
    Compare -->|いいえ| AddCorrupt[corruptedFilesに追加]
    Compare -->|はい| UpdateTime[lastVerified更新]
    
    AddMissing --> Loop
    AddCorrupt --> Loop
    UpdateTime --> Loop
    
    Loop -->|はい| CheckMissing{missing<br/>あり?}
    CheckMissing -->|はい| SetMissing[status = 'missing']
    CheckMissing -->|いいえ| CheckCorrupt{corrupted<br/>あり?}
    
    CheckCorrupt -->|はい| SetCorrupt[status = 'corrupted']
    CheckCorrupt -->|いいえ| SetVerified[status = 'verified']
    
    SetMissing --> UpdateStatus[verificationStatus更新]
    SetCorrupt --> UpdateStatus
    SetVerified --> UpdateStatus
    
    UpdateStatus --> Return([Result返却])
    
    style Start fill:#e1f5ff
    style SetVerified fill:#c8e6c9
    style SetMissing fill:#ffcdd2
    style SetCorrupt fill:#fff9c4
    style Return fill:#e0e0e0
```

### アップデートチェックフロー

```mermaid
flowchart TD
    Start([updateCheck<br/>呼び出し]) --> GetOS[現在のOS判定]
    GetOS --> InitList[updates配列初期化]
    
    InitList --> Loop{全インスタンス<br/>チェック完了?}
    
    Loop -->|いいえ| GetInstance[次のインスタンス]
    GetInstance --> FindAvail{availableJdksから<br/>同じバージョン検索}
    
    FindAvail -->|見つからない| Loop
    FindAvail -->|見つかった| GetDownload{現在のOS対応<br/>ダウンロードあり?}
    
    GetDownload -->|なし| Loop
    GetDownload -->|あり| ExtractName[URLからファイル名抽出]
    
    ExtractName --> GenStructName[structName生成]
    GenStructName --> CompareStruct{structName<br/>比較}
    
    CompareStruct -->|同じ| Loop
    CompareStruct -->|異なる| CreateUpdate[UpdateInfo作成]
    
    CreateUpdate --> AddUpdate[updates配列に追加]
    AddUpdate --> Loop
    
    Loop -->|はい| Return([updates配列返却])
    
    style Start fill:#e1f5ff
    style CreateUpdate fill:#fff9c4
    style Return fill:#c8e6c9
```

## コンポーネント間の依存関係

```mermaid
graph LR
    subgraph "External Dependencies"
        NodeFS[Node.js fs/promises]
        NodePath[Node.js path]
        NodeCrypto[Node.js crypto]
        NodeCP[Node.js child_process]
        UUID[uuid]
        AdmZip[adm-zip]
        Tar[tar]
        Axios[axios]
    end
    
    subgraph "Core Types"
        Types[jdk-registry.types.ts]
    end
    
    subgraph "Utilities"
        FileUtils[fileUtils.ts]
    end
    
    subgraph "Core Classes"
        JdkManager[JdkManager.ts]
        JDKEntry[JDKEntry.ts]
        UpdateHandler[UpdateHandler.ts]
    end
    
    subgraph "Tests"
        TestDriver[testDriver.ts]
        IntegrationTest[integrationTest.ts]
    end
    
    Types --> JdkManager
    Types --> JDKEntry
    Types --> UpdateHandler
    Types --> FileUtils
    
    FileUtils --> JdkManager
    FileUtils --> JDKEntry
    FileUtils --> UpdateHandler
    
    JDKEntry --> JdkManager
    UpdateHandler --> JdkManager
    UpdateHandler --> JDKEntry
    
    NodeFS --> FileUtils
    NodePath --> FileUtils
    NodeCrypto --> FileUtils
    NodeCP --> FileUtils
    UUID --> JDKEntry
    AdmZip --> FileUtils
    Tar --> FileUtils
    
    Axios --> IntegrationTest
    
    JdkManager --> TestDriver
    JdkManager --> IntegrationTest
    
    style Types fill:#e1f5ff,stroke:#01579b
    style FileUtils fill:#e8f5e9,stroke:#1b5e20
    style JdkManager fill:#fff3e0,stroke:#e65100
    style JDKEntry fill:#f3e5f5,stroke:#4a148c
    style UpdateHandler fill:#f3e5f5,stroke:#4a148c
```

## デプロイメント図

```mermaid
graph TB
    subgraph "File System"
        subgraph "Base Runtime Directory"
            Registry[jdk-registry.json]
            
            subgraph "JDK Instances"
                JDK8[jdk-8-temurin/]
                JDK17[jdk-17-openjdk/]
                JDK21[jdk-21-temurin/]
            end
            
            subgraph "Working Directories"
                Temp[temp/<br/>一時作業用]
                Backup[backup/<br/>アップデート時バックアップ]
            end
        end
        
        subgraph "Application"
            AppCode[アプリケーションコード]
            JDKMgr[JDK Manager<br/>ライブラリ]
        end
    end
    
    AppCode -->|import| JDKMgr
    JDKMgr -->|read/write| Registry
    JDKMgr -->|manage| JDK8
    JDKMgr -->|manage| JDK17
    JDKMgr -->|manage| JDK21
    JDKMgr -->|use| Temp
    JDKMgr -->|use| Backup
    
    style Registry fill:#ffebee,stroke:#c62828
    style JDK8 fill:#e8f5e9,stroke:#1b5e20
    style JDK17 fill:#e8f5e9,stroke:#1b5e20
    style JDK21 fill:#e8f5e9,stroke:#1b5e20
    style Temp fill:#fff9c4,stroke:#f57f17
    style Backup fill:#fff9c4,stroke:#f57f17
    style JDKMgr fill:#e1f5ff,stroke:#01579b
```

## タイミング図（ロック機構）

```mermaid
sequenceDiagram
    participant App1 as アプリ1
    participant App2 as アプリ2
    participant Entry as JDKEntry
    participant Admin as 管理者
    
    Note over App1,Entry: 正常なロック・アンロック
    App1->>Entry: useRuntime("App1")
    Entry-->>App1: lockId1
    
    App1->>Entry: useRuntime("App1-Task2")
    Entry-->>App1: lockId2
    
    Note over App1,Entry: 複数ロック保持中
    
    App1->>Entry: unUseRuntime(lockId1)
    Entry-->>App1: Success
    
    Note over Entry: まだlockId2が残っている
    
    App2->>Entry: useRuntime("App2")
    Entry-->>App2: lockId3
    
    Note over Entry: 複数アプリから同時ロック可能
    
    Admin->>Entry: remove(id)
    Entry-->>Admin: Error: Locked
    
    Note over Admin: ロック中は削除不可
    
    App1->>Entry: unUseRuntime(lockId2)
    Entry-->>App1: Success
    
    App2->>Entry: unUseRuntime(lockId3)
    Entry-->>App2: Success
    
    Note over Entry: すべてのロックが解放された
    
    Admin->>Entry: remove(id)
    Entry-->>Admin: Success
```

---

**このドキュメントは、JDK Managerシステムの包括的なアーキテクチャ説明を提供します。**

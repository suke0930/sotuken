# API Reference

## ServerManager

### Static Methods

#### `initialize()`
ServerManagerインスタンスを初期化します。

```typescript
static async initialize(
  configPath: string,
  serversBasePath: string,
  logPath: string,
  jdkManager: JdkManager,
  callbacks?: ServerCallbacks
): Promise<ServerManager>
```

**Parameters:**
- `configPath`: 設定ファイルのパス
- `serversBasePath`: サーバーディレクトリのベースパス
- `logPath`: ログファイルのパス
- `jdkManager`: 初期化済みのJDKManagerインスタンス
- `callbacks`: イベントコールバック（オプション）

### Instance Management

#### `addInstance()`
新しいサーバーインスタンスを追加します。

```typescript
async addInstance(params: AddInstanceParams): Promise<AddInstanceResult>
```

#### `removeInstance()`
サーバーインスタンスを削除します（停止中のみ）。

```typescript
async removeInstance(uuid: string): Promise<VoidResult>
```

#### `updateInstance()`
サーバーインスタンスを更新します。

```typescript
async updateInstance(params: UpdateInstanceParams): Promise<VoidResult>
```

**Note:** `note`のみ起動中でも更新可能です。

### Lifecycle Control

#### `startServer()`
サーバーを起動します。

```typescript
async startServer(uuid: string): Promise<VoidResult>
```

#### `stopServer()`
サーバーを停止します。

```typescript
async stopServer(uuid: string, timeout?: number): Promise<VoidResult>
```

**Default timeout:** 30秒

#### `restartServer()`
サーバーを再起動します。

```typescript
async restartServer(uuid: string, timeout?: number): Promise<VoidResult>
```

#### `forceKillServer()`
サーバーを強制終了します（データ破損の可能性あり）。

```typescript
forceKillServer(uuid: string): void
```

### Command & I/O

#### `sendCommand()`
サーバーにコマンドを送信します。

```typescript
sendCommand(uuid: string, command: string): void
```

#### `openProcessStd()`
標準入出力の監視を開始します。

```typescript
openProcessStd(uuid: string, callbacks: ProcessStdCallbacks): void
```

#### `closeProcessStd()`
標準入出力の監視を停止します。

```typescript
closeProcessStd(uuid: string, callbacks: ProcessStdCallbacks): void
```

### Data Access

#### `getInstanceData()`
特定のインスタンスデータを取得します。

```typescript
getInstanceData(uuid: string): ServerInstance | undefined
```

#### `getAllInstances()`
すべてのインスタンスデータを取得します。

```typescript
getAllInstances(): ServerInstance[]
```

#### `getRunningInstances()`
稼働中のインスタンスのみを取得します。

```typescript
getRunningInstances(): ServerInstance[]
```

## Types

### ServerInstance
```typescript
interface ServerInstance {
  uuid: string;
  name: string;
  note: string;
  status: ServerStatus; // 'stopped' | 'running' | 'crashed'
  software: ServerSoftware;
  launchConfig: ServerLaunchConfig;
  metadata: ServerMetadata;
  autoRestart: AutoRestartConfig;
}
```

### ServerCallbacks
```typescript
interface ServerCallbacks {
  onServerStarted?: (uuid: string) => void;
  onServerStopped?: (uuid: string, exitCode: number) => void;
  onServerCrashed?: (uuid: string, error: Error) => void;
  onAutoRestartLimitReached?: (uuid: string) => void;
  onStopTimeout?: (uuid: string, message: string) => void;
  onForcedKill?: (uuid: string) => void;
}
```

## Examples

### Complete Example

```typescript
import { ServerManager } from './src';
import { JdkManager } from '../jdk-manager';

// JDK初期化
const jdkManager = new JdkManager('./runtime');
await jdkManager.Data.load();

// ServerManager初期化
const manager = await ServerManager.initialize(
  './config/server-manager.json',
  './servers',
  './logs/manager.log',
  jdkManager,
  {
    onServerStarted: (uuid) => console.log(`✅ Started: ${uuid}`),
    onServerCrashed: (uuid) => console.error(`❌ Crashed: ${uuid}`)
  }
);

// サーバー追加
const addResult = await manager.addInstance({
  name: 'my-server',
  note: 'Test server',
  software: { name: 'Paper', version: '1.20.1' },
  jdkVersion: 17,
  serverBinaryFilePath: './paper.jar'
});

const uuid = addResult.uuid!;

// 標準出力監視
manager.openProcessStd(uuid, {
  onStdout: (line) => console.log(`[OUT] ${line}`),
  onStderr: (line) => console.error(`[ERR] ${line}`)
});

// 起動
await manager.startServer(uuid);

// コマンド送信
manager.sendCommand(uuid, 'say Hello!');

// 停止
await manager.stopServer(uuid);
```

/**
 * Server Lifecycle E2E Tests
 * 
 * 完全なサーバーライフサイクルをテスト
 * 注意: このテストは実際のJDKと実際のMinecraft Server jarファイルを必要とします
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { ServerManager } from '../../src/classes/ServerManager';
import { loadTestEnv, createTestDirs, cleanupTestDirs } from '../setup/loadTestEnv';

// 実際のJDKManagerをインポート
// 注意: この行は実際の環境に合わせて調整してください
// import { JdkManager } from '../../../jdk-manager/src/lib/JdkManager';

describe('Server Lifecycle E2E Tests', () => {
  const testEnv = loadTestEnv();
  let manager: ServerManager;
  let jdkManager: any; // 実際の環境では JdkManager 型
  let configPath: string;

  // E2Eテストのスキップフラグ
  // 実際のJDKとMinecraft jarが用意できた環境でのみ実行
  const skipE2E = !process.env.RUN_E2E_TESTS;

  beforeAll(async () => {
    if (skipE2E) {
      console.log('⏭️  E2E tests skipped. Set RUN_E2E_TESTS=1 to enable.');
      return;
    }

    await cleanupTestDirs(testEnv);
    await createTestDirs(testEnv);

    // 実際のJDKManagerを初期化
    // 注意: 以下のコードは実際の環境に合わせて調整してください
    /*
    jdkManager = await JdkManager.createInstance(
      testEnv.jdkManager.configPath,
      path.dirname(testEnv.jdkManager.configPath)
    );
    */

    // テスト用にモックJDKManagerを使用（実際のテストではこれを削除）
    jdkManager = createMockJdkManager();
  });

  beforeEach(async () => {
    if (skipE2E) return;

    configPath = path.join(testEnv.testPaths.configDir, 'e2e-test-manager.json');
    manager = await ServerManager.initialize(
      configPath,
      testEnv.testPaths.serversDir,
      path.join(testEnv.testPaths.logsDir, 'e2e-test.log'),
      jdkManager
    );
  });

  afterEach(async () => {
    if (skipE2E) return;

    if (manager) {
      // 全てのサーバーを停止
      const instances = manager.getAllInstances();
      for (const instance of instances) {
        if (instance.status === 'running') {
          await manager.stopServer(instance.uuid, 5000);
        }
      }

      await manager.dispose();
    }

    await new Promise(resolve => setTimeout(resolve, 200));
  });

  afterAll(async () => {
    if (skipE2E) return;
    await cleanupTestDirs(testEnv);
  });

  // モックJDKManager（実際のE2Eテストでは削除）
  function createMockJdkManager() {
    return {
      Entrys: {
        getByVersion: jest.fn((version: number) => {
          if (version === 17 || version === 21) {
            return {
              success: true,
              data: {
                getVerificationStatus: () => 'verified',
                getExecutableFilePath: () => '/mock/java',
                useRuntime: jest.fn(() => 'mock-lock-id'),
                unUseRuntime: jest.fn(() => ({ success: true })),
                isLocked: jest.fn(() => false)
              }
            };
          }
          return {
            success: false,
            error: 'JDK not found'
          };
        })
      }
    };
  }

  describe('Complete Server Lifecycle', () => {
    it.skip('should create, start, stop, and remove a server', async () => {
      if (skipE2E) return;

      // 1. サーバーインスタンスを追加
      const addResult = await manager.addInstance({
        name: 'e2e-test-server',
        note: 'E2E Test Server',
        software: { name: 'Vanilla', version: '1.20.1' },
        jdkVersion: 17,
        serverBinaryFilePath: testEnv.minecraftServer.vanillaJar
      });

      expect(addResult.success).toBe(true);
      expect(addResult.uuid).toBeDefined();
      const uuid = addResult.uuid!;

      // 2. サーバーを起動
      const startResult = await manager.startServer(uuid);
      expect(startResult.success).toBe(true);

      // サーバーが起動するまで待機
      await new Promise(resolve => setTimeout(resolve, 3000));

      const runningData = manager.getInstanceData(uuid);
      expect(runningData?.status).toBe('running');

      // 3. サーバーを停止
      const stopResult = await manager.stopServer(uuid, 10000);
      expect(stopResult.success).toBe(true);

      const stoppedData = manager.getInstanceData(uuid);
      expect(stoppedData?.status).toBe('stopped');

      // 4. サーバーを削除
      const removeResult = await manager.removeInstance(uuid);
      expect(removeResult.success).toBe(true);

      const removedData = manager.getInstanceData(uuid);
      expect(removedData).toBeUndefined();
    });

    it.skip('should handle server restart', async () => {
      if (skipE2E) return;

      // サーバーを追加
      const addResult = await manager.addInstance({
        name: 'restart-test-server',
        note: 'Restart Test',
        software: { name: 'Vanilla', version: '1.20.1' },
        jdkVersion: 17,
        serverBinaryFilePath: testEnv.minecraftServer.vanillaJar
      });

      const uuid = addResult.uuid!;

      // サーバーを起動
      await manager.startServer(uuid);
      await new Promise(resolve => setTimeout(resolve, 3000));

      // サーバーを再起動
      const restartResult = await manager.restartServer(uuid, 10000);
      expect(restartResult.success).toBe(true);

      await new Promise(resolve => setTimeout(resolve, 3000));

      const data = manager.getInstanceData(uuid);
      expect(data?.status).toBe('running');

      // クリーンアップ
      await manager.stopServer(uuid, 10000);
      await manager.removeInstance(uuid);
    });

    it.skip('should handle server console I/O', async () => {
      if (skipE2E) return;

      // サーバーを追加
      const addResult = await manager.addInstance({
        name: 'io-test-server',
        note: 'Console I/O Test',
        software: { name: 'Vanilla', version: '1.20.1' },
        jdkVersion: 17,
        serverBinaryFilePath: testEnv.minecraftServer.vanillaJar
      });

      const uuid = addResult.uuid!;

      // コンソール出力をキャプチャ
      const stdoutMessages: string[] = [];
      const stderrMessages: string[] = [];

      manager.openProcessStd(uuid, {
        onStdout: (data) => {
          stdoutMessages.push(data);
        },
        onStderr: (data) => {
          stderrMessages.push(data);
        }
      });

      // サーバーを起動
      await manager.startServer(uuid);
      await new Promise(resolve => setTimeout(resolve, 5000));

      // 標準出力が受信されていることを確認
      expect(stdoutMessages.length).toBeGreaterThan(0);

      // コマンドを送信
      manager.sendCommand(uuid, 'help');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // クリーンアップ
      manager.closeProcessStd(uuid, {
        onStdout: (data) => { stdoutMessages.push(data); }
      });
      await manager.stopServer(uuid, 10000);
      await manager.removeInstance(uuid);
    });

    it.skip('should track server uptime correctly', async () => {
      if (skipE2E) return;

      // サーバーを追加
      const addResult = await manager.addInstance({
        name: 'uptime-test-server',
        note: 'Uptime Test',
        software: { name: 'Vanilla', version: '1.20.1' },
        jdkVersion: 17,
        serverBinaryFilePath: testEnv.minecraftServer.vanillaJar
      });

      const uuid = addResult.uuid!;

      // 初期状態では稼働時間は0
      let data = manager.getInstanceData(uuid);
      expect(data?.metadata.totalUptime).toBe(0);

      // サーバーを起動
      await manager.startServer(uuid);
      await new Promise(resolve => setTimeout(resolve, 7000)); // 7秒待機

      // サーバーを停止
      await manager.stopServer(uuid, 10000);

      // 稼働時間が記録されていることを確認（少なくとも5秒以上）
      data = manager.getInstanceData(uuid);
      expect(data?.metadata.totalUptime).toBeGreaterThanOrEqual(5);

      await manager.removeInstance(uuid);
    });

    it.skip('should handle multiple servers simultaneously', async () => {
      if (skipE2E) return;

      const uuids: string[] = [];

      // 3つのサーバーを作成
      for (let i = 1; i <= 3; i++) {
        const addResult = await manager.addInstance({
          name: `multi-server-${i}`,
          note: `Multi Server Test ${i}`,
          software: { name: 'Vanilla', version: '1.20.1' },
          jdkVersion: 17,
          serverBinaryFilePath: testEnv.minecraftServer.vanillaJar,
          port: 25565 + i // 異なるポートを割り当て
        });

        expect(addResult.success).toBe(true);
        uuids.push(addResult.uuid!);
      }

      // 全サーバーを起動
      for (const uuid of uuids) {
        const startResult = await manager.startServer(uuid);
        expect(startResult.success).toBe(true);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      await new Promise(resolve => setTimeout(resolve, 3000));

      // 全サーバーが起動していることを確認
      for (const uuid of uuids) {
        const data = manager.getInstanceData(uuid);
        expect(data?.status).toBe('running');
      }

      // 全サーバーを停止して削除
      for (const uuid of uuids) {
        await manager.stopServer(uuid, 10000);
        await manager.removeInstance(uuid);
      }
    });
  });

  describe('Server Configuration Management', () => {
    it('should persist server configuration across manager restarts', async () => {
      if (skipE2E) return;

      // サーバーを追加
      const addResult = await manager.addInstance({
        name: 'persist-test-server',
        note: 'Persistence Test',
        software: { name: 'Vanilla', version: '1.20.1' },
        jdkVersion: 17,
        serverBinaryFilePath: testEnv.minecraftServer.vanillaJar,
        port: 25570,
        maxMemory: 4096,
        minMemory: 2048
      });

      const uuid = addResult.uuid!;

      // Managerを再初期化
      await manager.dispose();
      await new Promise(resolve => setTimeout(resolve, 100));

      manager = await ServerManager.initialize(
        configPath,
        testEnv.testPaths.serversDir,
        path.join(testEnv.testPaths.logsDir, 'e2e-test.log'),
        jdkManager
      );

      // サーバー設定が保持されていることを確認
      const data = manager.getInstanceData(uuid);
      expect(data).toBeDefined();
      expect(data?.name).toBe('persist-test-server');
      expect(data?.launchConfig.port).toBe(25570);
      expect(data?.launchConfig.minMemory).toBe(2048);
      expect(data?.launchConfig.maxMemory).toBe(4096);

      // クリーンアップ
      await manager.removeInstance(uuid);
    });

    it('should update server properties file correctly', async () => {
      if (skipE2E) return;

      // サーバーを追加
      const addResult = await manager.addInstance({
        name: 'properties-test-server',
        note: 'Properties Test',
        software: { name: 'Vanilla', version: '1.20.1' },
        jdkVersion: 17,
        serverBinaryFilePath: testEnv.minecraftServer.vanillaJar,
        port: 25580
      });

      const uuid = addResult.uuid!;

      // ポートを更新
      const updateResult = await manager.updateInstance({
        uuid,
        updates: {
          port: 25581
        }
      });

      expect(updateResult.success).toBe(true);

      // server.propertiesを直接確認
      const propsManager = manager.getServerPropertiesManager(uuid);
      if (propsManager) {
        const port = await propsManager.getPort();
        expect(port).toBe(25581);
      }

      // クリーンアップ
      await manager.removeInstance(uuid);
    });
  });
});

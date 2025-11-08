/**
 * ServerManager Integration Tests
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { ServerManager } from '../../src/classes/ServerManager';
import { createTestDirs, cleanupTestDirs, loadTestEnv, createMockJar } from '../setup/loadTestEnv';

// Mock JDKManager
const createMockJdkManager = () => ({
  Entrys: {
    getByVersion: jest.fn((version: number) => {
      if (version === 17) {
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
});

describe('ServerManager Integration Tests', () => {
  const testEnv = loadTestEnv();
  let manager: ServerManager;
  let jdkManager: any;
  let configPath: string;
  let mockJarPath: string;

  beforeAll(async () => {
    await cleanupTestDirs(testEnv);
    await createTestDirs(testEnv);

    // モックjarファイル作成
    mockJarPath = path.join(testEnv.testPaths.serversDir, 'mock-server.jar');
    await createMockJar(mockJarPath);
  });

  beforeEach(async () => {
    jdkManager = createMockJdkManager();
    configPath = path.join(testEnv.testPaths.configDir, 'test-manager.json');

    manager = await ServerManager.initialize(
      configPath,
      testEnv.testPaths.serversDir,
      path.join(testEnv.testPaths.logsDir, 'test.log'),
      jdkManager as any
    );
  });

  afterEach(async () => {
    // ロガーとリソースをクリーンアップ
    if (manager) {
      await manager.dispose();
    }

    // 少し待機してファイルハンドルが完全に閉じられるのを待つ
    await new Promise(resolve => setTimeout(resolve, 100));

    // 設定ファイルを削除
    try {
      await fs.unlink(configPath);
    } catch {
      // ファイルが存在しない場合は無視
    }
  });

  afterAll(async () => {
    await cleanupTestDirs(testEnv);
  });

  describe('initialize()', () => {
    it('should initialize ServerManager', async () => {
      expect(manager).toBeDefined();
      expect(manager.getAllInstances()).toEqual([]);
    });

    it('should create config file if not exists', async () => {
      const exists = require('fs').existsSync(configPath);
      expect(exists).toBe(true);
    });

    it('should load existing config file', async () => {
      // 既に初期化済み（beforeEach）なので、ファイルが存在するはず
      const content = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(content);

      expect(config.configVersion).toBe('1.0.0');
      expect(config.instances).toEqual([]);
    });
  });

  describe('addInstance()', () => {
    it('should add new server instance', async () => {
      const result = await manager.addInstance({
        name: 'test-server',
        note: 'Test server',
        software: { name: 'Paper', version: '1.20.1' },
        jdkVersion: 17,
        serverBinaryFilePath: mockJarPath, // Use mock jar created in beforeAll
        port: 25565,
        maxMemory: 2048,
        minMemory: 1024
      });
      expect(result.success).toBe(true);
      expect(result.uuid).toBeDefined();

      const instances = manager.getAllInstances();
      expect(instances).toHaveLength(1);
      expect(instances[0].name).toBe('test-server');
    });

    it('should create server directory', async () => {
      const result = await manager.addInstance({
        name: 'test-server-2',
        note: 'Test',
        software: { name: 'Vanilla', version: '1.20.1' },
        jdkVersion: 17,
        serverBinaryFilePath: mockJarPath
      });

      const serverDir = path.join(testEnv.testPaths.serversDir, 'test-server-2');
      const exists = require('fs').existsSync(serverDir);
      expect(exists).toBe(true);
    });

    it('should create server.properties', async () => {
      const result = await manager.addInstance({
        name: 'test-server-3',
        note: 'Test',
        software: { name: 'Vanilla', version: '1.20.1' },
        jdkVersion: 17,
        serverBinaryFilePath: mockJarPath,
        port: 25570
      });

      const propsPath = path.join(testEnv.testPaths.serversDir, 'test-server-3', 'server.properties');
      const content = await fs.readFile(propsPath, 'utf-8');
      expect(content).toContain('server-port=25570');
    });

    it('should create eula.txt', async () => {
      const result = await manager.addInstance({
        name: 'test-server-4',
        note: 'Test',
        software: { name: 'Vanilla', version: '1.20.1' },
        jdkVersion: 17,
        serverBinaryFilePath: mockJarPath
      });

      const eulaPath = path.join(testEnv.testPaths.serversDir, 'test-server-4', 'eula.txt');
      const content = await fs.readFile(eulaPath, 'utf-8');
      expect(content).toContain('eula=true');
    });

    it('should fail for duplicate name', async () => {
      await manager.addInstance({
        name: 'duplicate-test',
        note: 'Test',
        software: { name: 'Vanilla', version: '1.20.1' },
        jdkVersion: 17,
        serverBinaryFilePath: mockJarPath
      });

      const result = await manager.addInstance({
        name: 'duplicate-test',
        note: 'Test 2',
        software: { name: 'Vanilla', version: '1.20.1' },
        jdkVersion: 17,
        serverBinaryFilePath: mockJarPath
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('already exists');
      }
    });

    it('should fail for invalid JDK version', async () => {
      const result = await manager.addInstance({
        name: 'invalid-jdk-test',
        note: 'Test',
        software: { name: 'Vanilla', version: '1.20.1' },
        jdkVersion: 99,
        serverBinaryFilePath: mockJarPath
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('not installed');
      }
    });
  });

  describe('removeInstance()', () => {
    it('should remove server instance', async () => {
      const addResult = await manager.addInstance({
        name: 'remove-test',
        note: 'Test',
        software: { name: 'Vanilla', version: '1.20.1' },
        jdkVersion: 17,
        serverBinaryFilePath: mockJarPath
      });

      const uuid = addResult.uuid!;
      const result = await manager.removeInstance(uuid);

      expect(result.success).toBe(true);

      const instances = manager.getAllInstances();
      expect(instances).toHaveLength(0);
    });

    it('should remove server directory', async () => {
      const addResult = await manager.addInstance({
        name: 'remove-test-2',
        note: 'Test',
        software: { name: 'Vanilla', version: '1.20.1' },
        jdkVersion: 17,
        serverBinaryFilePath: mockJarPath
      });

      await manager.removeInstance(addResult.uuid!);

      const serverDir = path.join(testEnv.testPaths.serversDir, 'remove-test-2');
      const exists = require('fs').existsSync(serverDir);
      expect(exists).toBe(false);
    });

    it('should fail for non-existent instance', async () => {
      const result = await manager.removeInstance('non-existent-uuid');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('not found');
      }
    });
  });

  describe('updateInstance()', () => {
    it('should update note', async () => {
      const addResult = await manager.addInstance({
        name: 'update-test',
        note: 'Original note',
        software: { name: 'Vanilla', version: '1.20.1' },
        jdkVersion: 17,
        serverBinaryFilePath: mockJarPath
      });

      const uuid = addResult.uuid!;
      const result = await manager.updateInstance({
        uuid,
        updates: { note: 'Updated note' }
      });

      expect(result.success).toBe(true);

      const data = manager.getInstanceData(uuid);
      expect(data?.note).toBe('Updated note');
    });

    it('should update port and server.properties', async () => {
      const addResult = await manager.addInstance({
        name: 'port-update-test',
        note: 'Test',
        software: { name: 'Vanilla', version: '1.20.1' },
        jdkVersion: 17,
        serverBinaryFilePath: mockJarPath,
        port: 25565
      });

      const uuid = addResult.uuid!;
      const result = await manager.updateInstance({
        uuid,
        updates: { port: 25575 }
      });

      expect(result.success).toBe(true);

      const data = manager.getInstanceData(uuid);
      expect(data?.launchConfig.port).toBe(25575);

      // server.propertiesも更新されているか確認
      const propsPath = path.join(testEnv.testPaths.serversDir, 'port-update-test', 'server.properties');
      const content = await fs.readFile(propsPath, 'utf-8');
      expect(content).toContain('server-port=25575');
    });

    it('should update memory settings', async () => {
      const addResult = await manager.addInstance({
        name: 'memory-update-test',
        note: 'Test',
        software: { name: 'Vanilla', version: '1.20.1' },
        jdkVersion: 17,
        serverBinaryFilePath: mockJarPath
      });

      const uuid = addResult.uuid!;
      const result = await manager.updateInstance({
        uuid,
        updates: {
          maxMemory: 4096,
          minMemory: 2048
        }
      });

      expect(result.success).toBe(true);

      const data = manager.getInstanceData(uuid);
      expect(data?.launchConfig.maxMemory).toBe(4096);
      expect(data?.launchConfig.minMemory).toBe(2048);
    });
  });

  describe('getInstance() and data access', () => {
    it('should get instance data by UUID', async () => {
      const addResult = await manager.addInstance({
        name: 'data-test',
        note: 'Test',
        software: { name: 'Vanilla', version: '1.20.1' },
        jdkVersion: 17,
        serverBinaryFilePath: mockJarPath
      });

      const data = manager.getInstanceData(addResult.uuid!);
      expect(data).toBeDefined();
      expect(data?.name).toBe('data-test');
    });

    it('should get instance by name', async () => {
      await manager.addInstance({
        name: 'name-test',
        note: 'Test',
        software: { name: 'Vanilla', version: '1.20.1' },
        jdkVersion: 17,
        serverBinaryFilePath: mockJarPath
      });

      const data = manager.getInstanceByName('name-test');
      expect(data).toBeDefined();
      expect(data?.name).toBe('name-test');
    });

    it('should get all instances', async () => {
      await manager.addInstance({
        name: 'server-1',
        note: 'Test',
        software: { name: 'Vanilla', version: '1.20.1' },
        jdkVersion: 17,
        serverBinaryFilePath: mockJarPath
      });

      await manager.addInstance({
        name: 'server-2',
        note: 'Test',
        software: { name: 'Vanilla', version: '1.20.1' },
        jdkVersion: 17,
        serverBinaryFilePath: mockJarPath
      });

      const instances = manager.getAllInstances();
      expect(instances).toHaveLength(2);
    });
  });

  describe('getServerPropertiesManager()', () => {
    it('should get ServerPropertiesManager for instance', async () => {
      const addResult = await manager.addInstance({
        name: 'props-test',
        note: 'Test',
        software: { name: 'Vanilla', version: '1.20.1' },
        jdkVersion: 17,
        serverBinaryFilePath: mockJarPath,
        port: 25565
      });

      const propManager = manager.getServerPropertiesManager(addResult.uuid!);
      expect(propManager).toBeDefined();

      const port = await propManager!.getPort();
      expect(port).toBe(25565);
    });
  });
});

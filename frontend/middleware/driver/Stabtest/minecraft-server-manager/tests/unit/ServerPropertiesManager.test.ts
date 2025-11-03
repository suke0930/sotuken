/**
 * ServerPropertiesManager Unit Tests
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import pino from 'pino';
import { ServerPropertiesManager } from '../../src/classes/ServerPropertiesManager';
import { createTestDirs, cleanupTestDirs, loadTestEnv } from '../setup/loadTestEnv';

describe('ServerPropertiesManager', () => {
  const testEnv = loadTestEnv();
  const logger = pino({ level: 'silent' });
  let testPropsPath: string;

  beforeAll(async () => {
    await cleanupTestDirs(testEnv);
    await createTestDirs(testEnv);
  });

  beforeEach(() => {
    testPropsPath = path.join(testEnv.testPaths.serversDir, 'test-server.properties');
  });

  afterEach(async () => {
    try {
      await fs.unlink(testPropsPath);
    } catch {
      // ファイルが存在しない場合は無視
    }
  });

  afterAll(async () => {
    await cleanupTestDirs(testEnv);
  });

  describe('create()', () => {
    it('should create new properties file', async () => {
      const manager = new ServerPropertiesManager(testPropsPath, logger);

      await manager.create({
        'server-port': '25565',
        'motd': 'Test Server'
      });

      const content = await fs.readFile(testPropsPath, 'utf-8');
      expect(content).toContain('server-port=25565');
      expect(content).toContain('motd=Test Server');
    });
  });

  describe('read()', () => {
    it('should read properties from file', async () => {
      const manager = new ServerPropertiesManager(testPropsPath, logger);

      await manager.create({
        'server-port': '25565',
        'max-players': '20'
      });

      const props = await manager.read();
      expect(props.get('server-port')).toBe('25565');
      expect(props.get('max-players')).toBe('20');
    });

    it('should skip comment lines', async () => {
      await fs.writeFile(testPropsPath, '# This is a comment\nserver-port=25565\n');

      const manager = new ServerPropertiesManager(testPropsPath, logger);
      const props = await manager.read();

      expect(props.size).toBe(1);
      expect(props.get('server-port')).toBe('25565');
    });

    it('should skip empty lines', async () => {
      await fs.writeFile(testPropsPath, '\n\nserver-port=25565\n\n');

      const manager = new ServerPropertiesManager(testPropsPath, logger);
      const props = await manager.read();

      expect(props.size).toBe(1);
    });

    it('should handle values with equals sign', async () => {
      await fs.writeFile(testPropsPath, 'motd=Welcome=to=Server\n');

      const manager = new ServerPropertiesManager(testPropsPath, logger);
      const props = await manager.read();

      expect(props.get('motd')).toBe('Welcome=to=Server');
    });
  });

  describe('update()', () => {
    it('should update existing property', async () => {
      const manager = new ServerPropertiesManager(testPropsPath, logger);

      await manager.create({ 'server-port': '25565' });
      await manager.update('server-port', '25566');

      const props = await manager.read();
      expect(props.get('server-port')).toBe('25566');
    });

    it('should add new property if not exists', async () => {
      const manager = new ServerPropertiesManager(testPropsPath, logger);

      await manager.create({ 'server-port': '25565' });
      await manager.update('max-players', '30');

      const props = await manager.read();
      expect(props.get('server-port')).toBe('25565');
      expect(props.get('max-players')).toBe('30');
    });

    it('should create file if not exists', async () => {
      const manager = new ServerPropertiesManager(testPropsPath, logger);

      await manager.update('server-port', '25565');

      const props = await manager.read();
      expect(props.get('server-port')).toBe('25565');
    });
  });

  describe('updatePort()', () => {
    it('should update port property', async () => {
      const manager = new ServerPropertiesManager(testPropsPath, logger);

      await manager.create({ 'server-port': '25565' });
      await manager.updatePort(25570);

      const port = await manager.getPort();
      expect(port).toBe(25570);
    });
  });

  describe('getPort()', () => {
    it('should get port number', async () => {
      const manager = new ServerPropertiesManager(testPropsPath, logger);

      await manager.create({ 'server-port': '25565' });

      const port = await manager.getPort();
      expect(port).toBe(25565);
    });

    it('should return undefined if file not exists', async () => {
      const manager = new ServerPropertiesManager(testPropsPath, logger);

      const port = await manager.getPort();
      expect(port).toBeUndefined();
    });
  });

  describe('updateMultiple()', () => {
    it('should update multiple properties at once', async () => {
      const manager = new ServerPropertiesManager(testPropsPath, logger);

      await manager.create({ 'server-port': '25565' });
      await manager.updateMultiple({
        'server-port': '25570',
        'max-players': '50',
        'motd': 'Updated Server'
      });

      const props = await manager.read();
      expect(props.get('server-port')).toBe('25570');
      expect(props.get('max-players')).toBe('50');
      expect(props.get('motd')).toBe('Updated Server');
    });
  });
});

/**
 * ServerValidator Unit Tests
 */

import pino from 'pino';
import { ServerValidator } from '../../src/classes/ServerValidator';
import { ServerManager } from '../../src/classes/ServerManager';
import { ServerInstance } from '../../src/types/server-schema';

// Mock JDKManager
const createMockJdkManager = () => ({
  Entrys: {
    getByVersion: jest.fn((version: number) => {
      if (version === 17) {
        return {
          success: true,
          data: {
            getVerificationStatus: () => 'verified',
            getExecutableFilePath: () => '/mock/java'
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

// Mock ServerManager
const createMockServerManager = (instances: ServerInstance[] = []) => ({
  getAllInstances: jest.fn(() => instances),
  getInstanceData: jest.fn((uuid: string) => instances.find(inst => inst.uuid === uuid)),
  getInstanceByName: jest.fn((name: string) => instances.find(inst => inst.name === name))
});

describe('ServerValidator', () => {
  const logger = pino({ level: 'silent' });
  let jdkManager: any;
  let serverManager: any;
  let validator: ServerValidator;

  beforeEach(() => {
    jdkManager = createMockJdkManager();
    serverManager = createMockServerManager();
    validator = new ServerValidator(serverManager as any, jdkManager as any, logger);
  });

  describe('validateName()', () => {
    it('should pass for valid name', () => {
      const result = validator.validateName('test-server');
      expect(result.valid).toBe(true);
    });

    it('should fail for empty name', () => {
      const result = validator.validateName('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('cannot be empty');
    });

    it('should fail for name too long', () => {
      const longName = 'a'.repeat(51);
      const result = validator.validateName(longName);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too long');
    });

    it('should fail for invalid characters', () => {
      const result = validator.validateName('server<test>');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('invalid characters');
    });

    it('should fail for duplicate name', () => {
      serverManager.getInstanceByName.mockReturnValue({ name: 'existing-server', uuid: 'uuid-1' });
      
      const result = validator.validateName('existing-server');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('already exists');
    });

    it('should pass for duplicate name with exclude UUID', () => {
      serverManager.getInstanceByName.mockReturnValue({ name: 'existing-server', uuid: 'uuid-1' });
      
      const result = validator.validateName('existing-server', 'uuid-1');
      expect(result.valid).toBe(true);
    });
  });

  describe('validatePort()', () => {
    it('should pass for valid port', () => {
      serverManager.getAllInstances.mockReturnValue([]);
      
      const result = validator.validatePort(25565);
      expect(result.valid).toBe(true);
    });

    it('should fail for port out of range (low)', () => {
      const result = validator.validatePort(0);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid port');
    });

    it('should fail for port out of range (high)', () => {
      const result = validator.validatePort(65536);
      expect(result.valid).toBe(false);
    });

    it('should warn for well-known port', () => {
      serverManager.getAllInstances.mockReturnValue([]);
      
      const result = validator.validatePort(80);
      expect(result.valid).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings![0]).toContain('well-known port');
    });

    it('should fail for port used by running server', () => {
      const runningInstance: ServerInstance = {
        uuid: 'uuid-1',
        name: 'running-server',
        status: 'running',
        launchConfig: { port: 25565 } as any,
      } as any;

      serverManager.getAllInstances.mockReturnValue([runningInstance]);
      
      const result = validator.validatePort(25565);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('in use');
    });

    it('should warn for port used by stopped server', () => {
      const stoppedInstance: ServerInstance = {
        uuid: 'uuid-1',
        name: 'stopped-server',
        status: 'stopped',
        launchConfig: { port: 25565 } as any,
      } as any;

      serverManager.getAllInstances.mockReturnValue([stoppedInstance]);
      
      const result = validator.validatePort(25565);
      expect(result.valid).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings![0]).toContain('configured');
    });

    it('should pass with exclude UUID', () => {
      const instance: ServerInstance = {
        uuid: 'uuid-1',
        name: 'server',
        status: 'stopped',
        launchConfig: { port: 25565 } as any,
      } as any;

      serverManager.getAllInstances.mockReturnValue([instance]);
      
      const result = validator.validatePort(25565, 'uuid-1');
      expect(result.valid).toBe(true);
    });
  });

  describe('validateJdkVersion()', () => {
    it('should pass for installed JDK', () => {
      const result = validator.validateJdkVersion(17);
      expect(result.valid).toBe(true);
    });

    it('should fail for non-integer version', () => {
      const result = validator.validateJdkVersion(17.5);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid JDK version');
    });

    it('should fail for negative version', () => {
      const result = validator.validateJdkVersion(-1);
      expect(result.valid).toBe(false);
    });

    it('should fail for JDK not found', () => {
      const result = validator.validateJdkVersion(99);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not installed');
    });

    it('should fail for missing JDK files', () => {
      jdkManager.Entrys.getByVersion.mockReturnValue({
        success: true,
        data: {
          getVerificationStatus: () => 'missing'
        }
      });

      const result = validator.validateJdkVersion(17);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('missing');
    });

    it('should fail for corrupted JDK files', () => {
      jdkManager.Entrys.getByVersion.mockReturnValue({
        success: true,
        data: {
          getVerificationStatus: () => 'corrupted'
        }
      });

      const result = validator.validateJdkVersion(17);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('corrupted');
    });
  });

  describe('validateMemorySettings()', () => {
    it('should pass for valid memory settings', () => {
      const result = validator.validateMemorySettings(1024, 2048);
      expect(result.valid).toBe(true);
    });

    it('should fail for min memory too low', () => {
      const result = validator.validateMemorySettings(256, 2048);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('at least 512MB');
    });

    it('should fail for max < min', () => {
      const result = validator.validateMemorySettings(2048, 1024);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('greater than or equal');
    });

    it('should warn for memory exceeding 80% of system', () => {
      // This test may vary depending on system memory
      // Using a very large value to ensure warning
      const result = validator.validateMemorySettings(1024, 1024 * 1024 * 100);
      expect(result.valid).toBe(true);
      expect(result.warnings).toBeDefined();
    });
  });

  describe('validateAddInstance()', () => {
    it('should pass for valid parameters', async () => {
      serverManager.getAllInstances.mockReturnValue([]);
      serverManager.getInstanceByName.mockReturnValue(undefined);

      const result = await validator.validateAddInstance({
        name: 'test-server',
        note: 'Test',
        software: { name: 'Vanilla', version: '1.20.1' },
        jdkVersion: 17,
        serverBinaryFilePath: '/path/to/server.jar',
        port: 25565,
        maxMemory: 2048,
        minMemory: 1024
      });

      expect(result.valid).toBe(true);
    });

    it('should fail for invalid name', async () => {
      const result = await validator.validateAddInstance({
        name: '',
        note: 'Test',
        software: { name: 'Vanilla', version: '1.20.1' },
        jdkVersion: 17,
        serverBinaryFilePath: '/path/to/server.jar'
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('cannot be empty');
    });

    it('should fail for invalid JDK version', async () => {
      serverManager.getAllInstances.mockReturnValue([]);
      serverManager.getInstanceByName.mockReturnValue(undefined);

      const result = await validator.validateAddInstance({
        name: 'test-server',
        note: 'Test',
        software: { name: 'Vanilla', version: '1.20.1' },
        jdkVersion: 99,
        serverBinaryFilePath: '/path/to/server.jar'
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('not installed');
    });
  });
});

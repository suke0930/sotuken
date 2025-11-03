/**
 * Test Environment Loader
 */

import * as fs from 'fs';
import * as path from 'path';

export interface TestEnv {
  jdkManager: {
    configPath: string;
    jdkArchives: {
      jdk8: string;
      jdk17: string;
      jdk21: string;
    };
  };
  minecraftServer: {
    vanillaJar: string;
    paperJar: string;
  };
  testPaths: {
    configDir: string;
    serversDir: string;
    logsDir: string;
  };
}

export function loadTestEnv(): TestEnv {
  const envPath = path.join(__dirname, 'test.env.json');
  const content = fs.readFileSync(envPath, 'utf-8');
  const env = JSON.parse(content);

  // 相対パスを絶対パスに変換
  return {
    jdkManager: {
      configPath: path.resolve(env.jdkManager.configPath),
      jdkArchives: {
        jdk8: path.resolve(env.jdkManager.jdkArchives.jdk8),
        jdk17: path.resolve(env.jdkManager.jdkArchives.jdk17),
        jdk21: path.resolve(env.jdkManager.jdkArchives.jdk21)
      }
    },
    minecraftServer: {
      vanillaJar: path.resolve(env.minecraftServer.vanillaJar),
      paperJar: path.resolve(env.minecraftServer.paperJar)
    },
    testPaths: {
      configDir: path.resolve(env.testPaths.configDir),
      serversDir: path.resolve(env.testPaths.serversDir),
      logsDir: path.resolve(env.testPaths.logsDir)
    }
  };
}

/**
 * テスト用ディレクトリをクリーンアップ
 */
export async function cleanupTestDirs(testEnv: TestEnv): Promise<void> {
  const dirs = [
    testEnv.testPaths.configDir,
    testEnv.testPaths.serversDir,
    testEnv.testPaths.logsDir
  ];

  for (const dir of dirs) {
    if (fs.existsSync(dir)) {
      await fs.promises.rm(dir, { recursive: true, force: true });
    }
  }
}

/**
 * テスト用ディレクトリを作成
 */
export async function createTestDirs(testEnv: TestEnv): Promise<void> {
  const dirs = [
    testEnv.testPaths.configDir,
    testEnv.testPaths.serversDir,
    testEnv.testPaths.logsDir
  ];

  for (const dir of dirs) {
    await fs.promises.mkdir(dir, { recursive: true });
  }
}

/**
 * モックjarファイルを作成
 */
export async function createMockJar(outputPath: string): Promise<void> {
  // 空のzipファイルを作成（jarはzip形式）
  const content = Buffer.from([
    0x50, 0x4b, 0x05, 0x06, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00
  ]);

  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.promises.writeFile(outputPath, content);
}

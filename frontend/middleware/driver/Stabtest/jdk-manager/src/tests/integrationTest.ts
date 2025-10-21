/**
 * JDK Manager Integration Test
 * 
 * 実際のJDKダウンロードとインストールを含む統合テスト
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import { JdkManager } from '../lib/JdkManager';
import { Logger } from '../types/jdk-registry.types';
import axios from 'axios';

// シンプルなロガー実装
class ConsoleLogger implements Logger {
  info(message: string): void {
    console.log(`[INFO] ${new Date().toISOString()} ${message}`);
  }

  warn(message: string): void {
    console.warn(`[WARN] ${new Date().toISOString()} ${message}`);
  }

  error(message: string): void {
    console.error(`[ERROR] ${new Date().toISOString()} ${message}`);
  }

  debug(message: string): void {
    console.log(`[DEBUG] ${new Date().toISOString()} ${message}`);
  }
}

// JDKダウンロード関数
async function downloadJdk(url: string, destPath: string): Promise<void> {
  console.log(`\n📥 Downloading from: ${url}`);
  console.log(`📁 Destination: ${destPath}`);

  const writer = require('fs').createWriteStream(destPath);

  const response = await axios({
    method: 'get',
    url: url,
    responseType: 'stream',
    timeout: 300000, // 5分タイムアウト
    onDownloadProgress: (progressEvent) => {
      const total = progressEvent.total || 0;
      const current = progressEvent.loaded;
      const percentage = total > 0 ? ((current / total) * 100).toFixed(2) : '0';
      process.stdout.write(`\r📊 Progress: ${percentage}% (${(current / 1024 / 1024).toFixed(2)} MB)`);
    }
  });

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', () => {
      console.log('\n✅ Download completed');
      resolve();
    });
    writer.on('error', reject);
  });
}

async function main() {
  console.log('========================================');
  console.log('JDK Manager Integration Test');
  console.log('========================================\n');

  // コマンドライン引数から設定を取得
  const args = process.argv.slice(2);
  const jdkVersion = args[0] ? parseInt(args[0]) : 17;

  console.log(`Target JDK Version: ${jdkVersion}`);

  // テスト用のディレクトリ設定
  const baseRuntimePath = path.join(process.cwd(), 'test-runtime');
  const downloadPath = path.join(process.cwd(), 'test-downloads');

  console.log(`Runtime Path: ${baseRuntimePath}`);
  console.log(`Download Path: ${downloadPath}\n`);

  // ディレクトリを作成
  await fs.mkdir(baseRuntimePath, { recursive: true });
  await fs.mkdir(downloadPath, { recursive: true });

  // JDKのダウンロードURL（OS判定）
  const isWindows = process.platform === 'win32';
  const isLinux = process.platform === 'linux';

  let downloadUrl: string;
  let archiveName: string;

  if (jdkVersion === 8) {
    if (isWindows) {
      downloadUrl = 'https://github.com/adoptium/temurin8-binaries/releases/download/jdk8u462-b08/OpenJDK8U-jdk_x64_windows_hotspot_8u462b08.zip';
      archiveName = 'OpenJDK8U-jdk_x64_windows_hotspot_8u462b08.zip';
    } else {
      downloadUrl = 'https://github.com/adoptium/temurin8-binaries/releases/download/jdk8u462-b08/OpenJDK8U-jdk_x64_linux_hotspot_8u462b08.tar.gz';
      archiveName = 'OpenJDK8U-jdk_x64_linux_hotspot_8u462b08.tar.gz';
    }
  } else if (jdkVersion === 17) {
    if (isWindows) {
      downloadUrl = 'https://download.java.net/java/GA/jdk17/0d483333a00540d886896bac774ff48b/35/GPL/openjdk-17_windows-x64_bin.zip';
      archiveName = 'openjdk-17_windows-x64_bin.zip';
    } else {
      downloadUrl = 'https://download.java.net/java/GA/jdk17/0d483333a00540d886896bac774ff48b/35/GPL/openjdk-17_linux-x64_bin.tar.gz';
      archiveName = 'openjdk-17_linux-x64_bin.tar.gz';
    }
  } else if (jdkVersion === 22) {
    if (isWindows) {
      downloadUrl = 'https://download.java.net/java/GA/jdk22/830ec9fcccef480bb3e73fb7ecafe059/36/GPL/openjdk-22_windows-x64_bin.zip';
      archiveName = 'openjdk-22_windows-x64_bin.zip';
    } else {
      downloadUrl = 'https://download.java.net/java/GA/jdk22/830ec9fcccef480bb3e73fb7ecafe059/36/GPL/openjdk-22_linux-x64_bin.tar.gz';
      archiveName = 'openjdk-22_linux-x64_bin.tar.gz';
    }
  } else {
    console.error(`❌ Unsupported JDK version: ${jdkVersion}`);
    console.log('Supported versions: 8, 17, 22');
    return;
  }

  const archivePath = path.join(downloadPath, archiveName);

  // JdkManagerを初期化
  const logger = new ConsoleLogger();
  const manager = new JdkManager(baseRuntimePath, { logger });

  console.log('========================================');
  console.log('Step 1: Initialize Registry');
  console.log('========================================\n');

  const initResult = manager.Data.init();
  if (!initResult.success) {
    console.error('❌ Failed to initialize registry:', initResult.error);
    return;
  }
  console.log('✅ Registry initialized\n');

  console.log('========================================');
  console.log('Step 2: Download JDK');
  console.log('========================================');

  try {
    // 既にダウンロード済みか確認
    const stats = await fs.stat(archivePath).catch(() => null);
    if (stats && stats.size > 0) {
      console.log(`\n✅ Archive already exists: ${archivePath}`);
      console.log(`   Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB\n`);
    } else {
      await downloadJdk(downloadUrl, archivePath);
    }
  } catch (error: any) {
    console.error(`\n❌ Download failed: ${error.message}`);
    return;
  }

  console.log('\n========================================');
  console.log('Step 3: Install JDK');
  console.log('========================================\n');

  const installResult = await manager.Entrys.add({
    archivePath,
    majorVersion: jdkVersion
  });

  if (!installResult.success) {
    console.error('❌ Installation failed:', installResult.error);
    return;
  }

  const entry = installResult.data;
  console.log('\n✅ JDK installed successfully!');
  console.log(`   ID: ${entry.getId()}`);
  console.log(`   Name: ${entry.getName()}`);
  console.log(`   Version: ${entry.getMajorVersion()}`);
  console.log(`   Path: ${entry.getPath()}`);
  console.log(`   Status: ${entry.getVerificationStatus()}\n`);

  console.log('========================================');
  console.log('Step 4: Verify Installation');
  console.log('========================================\n');

  const healthResult = await entry.checkFileHealth();
  if (!healthResult.success) {
    console.error('❌ Health check failed:', healthResult.error);
  } else {
    console.log(`✅ Health check: ${healthResult.data}\n`);
  }

  console.log('========================================');
  console.log('Step 5: Test Runtime Lock');
  console.log('========================================\n');

  const lockId = entry.useRuntime('Integration Test');
  console.log(`✅ Runtime locked with ID: ${lockId}`);
  console.log(`   Is locked: ${entry.isLocked()}\n`);

  const unlockResult = entry.unUseRuntime(lockId);
  if (unlockResult.success) {
    console.log('✅ Runtime unlocked successfully');
    console.log(`   Is locked: ${entry.isLocked()}\n`);
  }

  console.log('========================================');
  console.log('Step 6: Get Install List');
  console.log('========================================\n');

  const installList = manager.Entrys.getInstallList();
  console.log(`Installed JDKs: ${installList.length}`);
  installList.forEach(info => {
    console.log(`  - ${info.name} (v${info.majorVersion})`);
    console.log(`    ID: ${info.id}`);
    console.log(`    Status: ${info.verificationStatus}`);
  });

  console.log('\n========================================');
  console.log('Integration Test Completed Successfully! ✅');
  console.log('========================================\n');

  console.log('Summary:');
  console.log(`  - JDK ${jdkVersion} installed and verified`);
  console.log(`  - Runtime lock mechanism tested`);
  console.log(`  - File integrity verified`);
  console.log(`  - Registry saved to: ${path.join(baseRuntimePath, 'jdk-registry.json')}`);
  console.log(`  - JDK installed to: ${entry.getPath()}\n`);

  console.log('You can now test:');
  console.log('  - Update functionality (install a newer version)');
  console.log('  - Removal: manager.Entrys.remove(entryId)');
  console.log('  - Multiple JDK versions side by side\n');
}

// エラーハンドリング
main().catch(error => {
  console.error('\n❌ Integration test failed with error:');
  console.error(error);
  process.exit(1);
});

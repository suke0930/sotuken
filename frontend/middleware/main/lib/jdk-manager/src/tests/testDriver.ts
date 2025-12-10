/**
 * JDK Manager Test Driver
 * 
 * JDK管理システムの動作テスト用ドライバ
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import { JdkManager } from '../lib/JdkManager';
import { Logger } from '../types/jdk-registry.types';

// シンプルなロガー実装
class ConsoleLogger implements Logger {
  info(message: string): void {
    console.log(`[INFO] ${message}`);
  }

  warn(message: string): void {
    console.warn(`[WARN] ${message}`);
  }

  error(message: string): void {
    console.error(`[ERROR] ${message}`);
  }

  debug(message: string): void {
    console.log(`[DEBUG] ${message}`);
  }
}

// テスト用のJDKダウンロードURL
const TEST_JDKS = [
  {
    version: 8,
    url: 'https://github.com/adoptium/temurin8-binaries/releases/download/jdk8u462-b08/OpenJDK8U-jdk_x64_windows_hotspot_8u462b08.zip',
    linuxUrl: 'https://github.com/adoptium/temurin8-binaries/releases/download/jdk8u462-b08/OpenJDK8U-jdk_x64_linux_hotspot_8u462b08.tar.gz'
  },
  {
    version: 17,
    url: 'https://download.java.net/java/GA/jdk17/0d483333a00540d886896bac774ff48b/35/GPL/openjdk-17_windows-x64_bin.zip',
    linuxUrl: 'https://download.java.net/java/GA/jdk17/0d483333a00540d886896bac774ff48b/35/GPL/openjdk-17_linux-x64_bin.tar.gz'
  },
  {
    version: 22,
    url: 'https://download.java.net/java/GA/jdk22/830ec9fcccef480bb3e73fb7ecafe059/36/GPL/openjdk-22_windows-x64_bin.zip',
    linuxUrl: 'https://download.java.net/java/GA/jdk22/830ec9fcccef480bb3e73fb7ecafe059/36/GPL/openjdk-22_linux-x64_bin.tar.gz'
  }
];

async function main() {
  console.log('========================================');
  console.log('JDK Manager Test Driver');
  console.log('========================================\n');

  // テスト用のベースディレクトリ
  const baseRuntimePath = path.join(process.cwd(), 'test-runtime');
  console.log(`Base Runtime Path: ${baseRuntimePath}\n`);

  // ディレクトリが存在しない場合は作成
  try {
    await fs.mkdir(baseRuntimePath, { recursive: true });
  } catch (error) {
    console.error('Failed to create base runtime directory:', error);
    return;
  }

  // JdkManagerを初期化
  const logger = new ConsoleLogger();
  const manager = new JdkManager(baseRuntimePath, {
    logger,
    dryRun: false
  });

  console.log('----------------------------------------');
  console.log('Test 1: Initialize Registry');
  console.log('----------------------------------------');

  // const initResult = manager.Data.init();
  // if (initResult.success) {
  //   console.log('✅ Registry initialized successfully\n');
  // } else {
  //   console.error('❌ Failed to initialize registry:', initResult.error);
  //   return;
  // }

  console.log('----------------------------------------');
  console.log('Test 2: Save Registry');
  console.log('----------------------------------------');

  // const saveResult = await manager.Data.save();
  // if (saveResult.success) {
  //   console.log('✅ Registry saved successfully\n');
  // } else {
  //   console.error('❌ Failed to save registry:', saveResult.error);
  //   return;
  // }

  console.log('----------------------------------------');
  console.log('Test 3: Load Registry');
  console.log('----------------------------------------');

  const loadResult = await manager.Data.load();
  if (loadResult.success) {
    console.log('✅ Registry loaded successfully\n');
  } else {
    console.error('❌ Failed to load registry:', loadResult.error);
    return;
  }

  console.log('----------------------------------------');
  console.log('Test 4: Get Install List (Empty)');
  console.log('----------------------------------------');

  const installList = manager.Entrys.getInstallList();
  console.log(`Installed JDKs: ${installList.length}`);
  console.log('✅ Install list retrieved successfully\n');

  console.log('----------------------------------------');
  console.log('Test 5: Manual JDK Installation Test');
  console.log('----------------------------------------');
  console.log('To test JDK installation, you need to:');
  console.log('1. Download a JDK archive manually');
  console.log('2. Place it in a known location');
  console.log('3. Call manager.Entrys.add() with the archive path\n');

  console.log('Available JDK download URLs:');
  TEST_JDKS.forEach(jdk => {
    console.log(`\nJava ${jdk.version}:`);
    console.log(`  Windows: ${jdk.url}`);
    console.log(`  Linux:   ${jdk.linuxUrl}`);
  });

  console.log('\n----------------------------------------');
  console.log('Test 6: Update Check (No Updates Expected)');
  console.log('----------------------------------------');

  const availableJdks = TEST_JDKS.map(jdk => ({
    version: jdk.version.toString(),
    downloads: [
      { os: 'windows', downloadUrl: jdk.url },
      { os: 'linux', downloadUrl: jdk.linuxUrl }
    ],
    vendor: 'OpenJDK',
    isLTS: jdk.version === 8 || jdk.version === 17
  }));

  const updates = manager.Entrys.updateCheck(availableJdks);
  console.log(`Available updates: ${updates.length}`);
  console.log('✅ Update check completed\n');

  console.log('----------------------------------------');
  console.log('Test 7: File Health Check (No JDKs)');
  console.log('----------------------------------------');

  const healthResult = await manager.Entrys.checkFileHealthAll();
  if (healthResult.success) {
    console.log(`Verified ${healthResult.data.length} JDK(s)`);
    console.log('✅ File health check completed\n');
  } else {
    console.error('❌ File health check failed:', healthResult.error);
  }

  console.log('========================================');
  console.log('Test Driver Completed');
  console.log('========================================');
  console.log('\nNext steps:');
  console.log('1. Download a test JDK using one of the URLs above');
  console.log('2. Run a full integration test with actual JDK installation');
  console.log('3. Test runtime locking and update functionality\n');

  console.log(`Test runtime directory: ${baseRuntimePath}`);
  console.log('You can inspect the generated jdk-registry.json file there.\n');
}

// エラーハンドリング
main().catch(error => {
  console.error('\n❌ Test driver failed with error:');
  console.error(error);
  process.exit(1);
});

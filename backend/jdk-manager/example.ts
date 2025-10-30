/**
 * JDK管理システム 使用例
 */

import { JdkManager, Logger } from './index';

// カスタムロガーの実装例
const logger: Logger = {
  info: (message: string) => console.log(`[INFO] ${new Date().toISOString()} - ${message}`),
  warn: (message: string) => console.warn(`[WARN] ${new Date().toISOString()} - ${message}`),
  error: (message: string) => console.error(`[ERROR] ${new Date().toISOString()} - ${message}`),
  debug: (message: string) => console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`)
};

async function main() {
  // JdkManagerインスタンスの作成
  const manager = new JdkManager('C:\\GameRuntimes\\Java', {
    logger,
    dryRun: false // 実際のファイル操作を行う場合はfalse
  });

  console.log('=== JDK管理システム デモ ===\n');

  // レジストリの初期化
  console.log('1. レジストリの初期化...');
  const initResult = manager.Data.init();
  if (initResult.success) {
    console.log('✓ レジストリの初期化に成功\n');
  } else {
    console.error('✗ レジストリの初期化に失敗:', initResult.error);
    return;
  }

  // レジストリの保存
  console.log('2. レジストリの保存...');
  const saveResult = await manager.Data.save();
  if (saveResult.success) {
    console.log('✓ レジストリの保存に成功\n');
  } else {
    console.error('✗ レジストリの保存に失敗:', saveResult.error);
    return;
  }

  // JDKのインストール（例）
  // 注意: 実際のアーカイブパスに変更してください
  console.log('3. JDKのインストール...');
  const addResult = await manager.Entrys.add({
    archivePath: 'C:\\Downloads\\OpenJDK17U-jdk_x64_windows_hotspot_17.0.8_7.zip',
    majorVersion: 17,
    name: 'Java 17',
    structName: 'OpenJDK17U-jdk_x64_windows_hotspot_17.0.8_7'
  });

  if (addResult.success) {
    console.log('✓ JDKのインストールに成功');
    console.log('  ID:', addResult.data.getId());
    console.log('  名前:', addResult.data.getName());
    console.log('  パス:', addResult.data.getPath());
    console.log('');
  } else {
    console.error('✗ JDKのインストールに失敗:', addResult.error);
  }

  // インストール済みJDKのリスト取得
  console.log('4. インストール済みJDKのリスト...');
  const installList = manager.Entrys.getInstallList();
  console.log(`✓ ${installList.length}個のJDKが見つかりました:`);
  installList.forEach(info => {
    console.log(`  - ${info.name} (v${info.majorVersion}) [${info.verificationStatus}]`);
  });
  console.log('');

  // バージョンでJDKを検索
  console.log('5. JDK 17の検索...');
  const jdk17Result = manager.Entrys.getByVersion(17);
  if (jdk17Result.success) {
    const jdk17 = jdk17Result.data;
    console.log('✓ JDK 17が見つかりました');
    console.log('  名前:', jdk17.getName());
    console.log('  正式名称:', jdk17.getStructName());
    console.log('');

    // ランタイムのロック
    console.log('6. ランタイムのロック...');
    const lockId = jdk17.useRuntime('Minecraft 1.20.1');
    console.log('✓ ランタイムをロックしました');
    console.log('  Lock ID:', lockId);
    console.log('  ロック状態:', jdk17.isLocked());
    console.log('');

    // ファイル整合性チェック
    console.log('7. ファイル整合性チェック...');
    const healthResult = await jdk17.checkFileHealth();
    if (healthResult.success) {
      console.log('✓ 整合性チェック完了');
      console.log('  ステータス:', healthResult.data);
      console.log('');
    } else {
      console.error('✗ 整合性チェックに失敗:', healthResult.error);
    }

    // ロック解除
    console.log('8. ランタイムのロック解除...');
    const unlockResult = jdk17.unUseRuntime(lockId);
    if (unlockResult.success) {
      console.log('✓ ロックを解除しました');
      console.log('  ロック状態:', jdk17.isLocked());
      console.log('');
    } else {
      console.error('✗ ロック解除に失敗:', unlockResult.error);
    }
  } else {
    console.error('✗ JDK 17が見つかりません:', jdk17Result.error);
  }

  // すべてのJDKの整合性チェック
  console.log('9. すべてのJDKの整合性チェック...');
  const allHealthResult = await manager.Entrys.checkFileHealthAll();
  if (allHealthResult.success) {
    console.log('✓ すべてのJDKの整合性チェック完了');
    allHealthResult.data.forEach(result => {
      console.log(`  - ${result.id}: ${result.status}`);
      if (result.missingFiles) {
        console.log(`    欠損ファイル: ${result.missingFiles.join(', ')}`);
      }
      if (result.corruptedFiles) {
        console.log(`    破損ファイル: ${result.corruptedFiles.join(', ')}`);
      }
    });
    console.log('');
  } else {
    console.error('✗ 整合性チェックに失敗:', allHealthResult.error);
  }

  // アップデートチェック
  console.log('10. アップデートチェック...');
  const availableJdks = [
    {
      version: '17',
      downloads: [
        {
          os: 'windows',
          downloadUrl: 'https://example.com/OpenJDK17U-jdk_x64_windows_hotspot_17.0.9_9.zip'
        }
      ],
      vendor: 'temurin',
      isLTS: true
    }
  ];

  const updates = manager.Entrys.updateCheck(availableJdks);
  console.log(`✓ ${updates.length}個のアップデートが見つかりました:`);
  updates.forEach(update => {
    console.log(`  - Java ${update.majorVersion}`);
    console.log(`    現在: ${update.currentStructName}`);
    console.log(`    利用可能: ${update.availableStructName}`);
  });
  console.log('');

  console.log('=== デモ終了 ===');
}

// 実行
if (require.main === module) {
  main().catch(error => {
    console.error('エラーが発生しました:', error);
    process.exit(1);
  });
}

export { main };

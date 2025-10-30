/**
 * JDK管理システム UpdateHandlerクラス
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import { JDKEntry } from './jdk-entry';
import { AvailableJdk, Result, FileChecksum } from './jdk-registry.types';
import {
  extractArchive,
  moveDirectory,
  removeDirectory,
  findFile,
  calculateChecksum,
  fileExists,
  normalizeExtractedPath,
  getCurrentOS
} from './file-utils';

const execAsync = promisify(exec);

/**
 * JDKのアップデート処理を担当するクラス
 */
export class UpdateHandler {
  private entry: JDKEntry;
  private newVersion: AvailableJdk;
  private manager: any; // JdkManagerへの参照

  constructor(entry: JDKEntry, newVersion: AvailableJdk, manager: any) {
    this.entry = entry;
    this.newVersion = newVersion;
    this.manager = manager;
  }

  /**
   * アップデートをインストール
   */
  async install(archivePath: string): Promise<Result<void>> {
    // 前提条件チェック
    if (this.entry.isLocked()) {
      return {
        success: false,
        error: 'Entry is locked and cannot be updated'
      };
    }

    if (this.manager.installLock) {
      return {
        success: false,
        error: 'Installation is already in progress'
      };
    }

    const archiveExists = await fileExists(archivePath);
    if (!archiveExists) {
      return {
        success: false,
        error: `Archive file not found: ${archivePath}`
      };
    }

    // インストールロック取得
    this.manager.installLock = true;

    try {
      // レジストリのバックアップ作成
      const registryBackup = JSON.stringify(this.manager.registry);

      // 既存ディレクトリをバックアップ
      const entryPath = this.entry.getPath();
      const backupPath = path.join(this.manager.baseRuntimePath, 'backup', this.entry.getId());

      if (this.manager.logger) {
        this.manager.logger.info(`Creating backup: ${backupPath}`);
      }

      if (!this.manager.dryRun) {
        const moveResult = await moveDirectory(entryPath, backupPath);
        if (!moveResult.success) {
          throw new Error(moveResult.error);
        }
      }

      // 新バージョンのインストール処理
      const tempPath = path.join(this.manager.baseRuntimePath, 'temp', `update-${Date.now()}`);

      try {
        // アーカイブを解凍
        if (this.manager.logger) {
          this.manager.logger.info(`Extracting archive to: ${tempPath}`);
        }

        if (!this.manager.dryRun) {
          const extractResult = await extractArchive(archivePath, tempPath);
          if (!extractResult.success) {
            throw new Error(extractResult.error);
          }

          // 解凍後のパスを正規化
          const normalizeResult = await normalizeExtractedPath(tempPath);
          if (!normalizeResult.success) {
            throw new Error(normalizeResult.error);
          }

          const normalizedPath = normalizeResult.data;

          // java.exe を検索
          const javaFileName = getCurrentOS() === 'windows' ? 'java.exe' : 'java';
          const javaResult = await findFile(normalizedPath, javaFileName);

          if (!javaResult.success) {
            throw new Error(`Java executable not found in archive`);
          }

          const javaPath = javaResult.data;
          const binDir = path.dirname(javaPath);
          const jdkRoot = path.dirname(binDir);

          // JDKルートディレクトリをインストール先に移動
          const installResult = await moveDirectory(jdkRoot, entryPath);
          if (!installResult.success) {
            throw new Error(installResult.error);
          }

          // java -version で確認
          if (this.manager.logger) {
            this.manager.logger.info(`Verifying Java version: ${javaPath}`);
          }

          const { stderr, stdout } = await execAsync(`"${javaPath}" -version`);
          const output = stderr || stdout;
          const versionMatch = output.match(/version "(\d+)\.?(\d+)?\.?(\d+)?/);

          if (!versionMatch) {
            throw new Error('Failed to parse Java version');
          }

          const detectedMajor = parseInt(versionMatch[1]);
          const actualMajor = detectedMajor === 1 ? parseInt(versionMatch[2]) : detectedMajor;

          if (actualMajor !== this.entry.getMajorVersion()) {
            throw new Error(
              `Version mismatch: expected ${this.entry.getMajorVersion()}, got ${actualMajor}`
            );
          }

          // チェックサム計算
          const checksums: FileChecksum[] = [];
          const checksumFiles = this.getChecksumFiles();

          for (const relPath of checksumFiles) {
            const fullPath = path.join(entryPath, relPath);
            const exists = await fileExists(fullPath);

            if (exists) {
              const checksumResult = await calculateChecksum(fullPath);
              if (checksumResult.success) {
                checksums.push({
                  path: relPath,
                  checksum: checksumResult.data,
                  lastVerified: new Date().toISOString()
                });
              }
            }
          }

          // エントリデータを更新
          const instance = this.entry._getInstance();
          const currentOS = getCurrentOS();
          const download = this.newVersion.downloads.find(d => d.os === currentOS);
          const downloadUrl = download?.downloadUrl || '';
          const fileName = downloadUrl.split('/').pop() || '';
          const newStructName = fileName.replace(/\.(zip|tar\.gz|tgz)$/, '');

          instance.structName = newStructName;
          instance.installedAt = new Date().toISOString();
          instance.checksums = checksums;
          instance.verificationStatus = 'verified';

          // tempディレクトリをクリア
          await removeDirectory(tempPath);

          // アーカイブファイルを削除
          await fs.unlink(archivePath);

          // バックアップディレクトリを削除
          await removeDirectory(backupPath);
        } else {
          if (this.manager.logger) {
            this.manager.logger.info(`[DRY RUN] Would install update to: ${entryPath}`);
          }
        }

        // レジストリを保存
        const saveResult = await this.manager.Data.save();
        if (!saveResult.success) {
          throw new Error(saveResult.error);
        }

        if (this.manager.logger) {
          this.manager.logger.info(`Update completed successfully: ${this.entry.getId()}`);
        }

        return { success: true, data: undefined };
      } catch (error: any) {
        // ロールバック
        if (this.manager.logger) {
          this.manager.logger.error(`Update failed, rolling back: ${error.message}`);
        }

        if (!this.manager.dryRun) {
          // インストールファイルを削除
          await removeDirectory(entryPath);

          // バックアップを復元
          await moveDirectory(backupPath, entryPath);

          // レジストリを復元
          this.manager.registry = JSON.parse(registryBackup);
          await this.manager.Data.save();

          // tempディレクトリをクリア
          await removeDirectory(tempPath);
        }

        throw error;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to install update: ${error.message}`
      };
    } finally {
      // インストールロック解放
      this.manager.installLock = false;
    }
  }

  /**
   * 新バージョン情報を取得
   */
  getNewVersionInfo(): { structName: string; downloadUrl: string } {
    const currentOS = getCurrentOS();
    const download = this.newVersion.downloads.find(d => d.os === currentOS);
    const downloadUrl = download?.downloadUrl || '';
    const fileName = downloadUrl.split('/').pop() || '';
    const structName = fileName.replace(/\.(zip|tar\.gz|tgz)$/, '');

    return { structName, downloadUrl };
  }

  /**
   * チェックサム対象ファイルのリストを取得
   */
  private getChecksumFiles(): string[] {
    const os = getCurrentOS();
    const files: string[] = [];

    if (os === 'windows') {
      files.push('bin/java.exe', 'bin/javaw.exe', 'bin/javac.exe');
    } else {
      files.push('bin/java', 'bin/javac');
    }

    files.push('lib/modules', 'lib/jrt-fs.jar');

    return files;
  }
}

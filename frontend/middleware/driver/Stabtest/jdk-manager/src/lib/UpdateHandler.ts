/**
 * Update Handler Class
 * 
 * JDKのアップデート処理を担当
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import {
  Result,
  AvailableJdk,
  Logger,
  FileChecksum
} from '../types/jdk-registry.types';
import {
  extractArchive,
  moveDirectory,
  removeDirectory,
  findJdkRoot,
  findFile,
  getJavaVersion,
  calculateChecksum,
  getRecommendedChecksumFiles,
  fileExists,
  getCurrentOS
} from '../utils/fileUtils';
import type { JDKEntry } from './JDKEntry';

export class UpdateHandler {
  private entry: JDKEntry;
  private newVersion: AvailableJdk;
  private downloadUrl: string;
  private newStructName: string;
  private baseRuntimePath: string;
  private onSaveRegistry: () => Promise<Result<void>>;
  private logger?: Logger;

  constructor(
    entry: JDKEntry,
    newVersion: AvailableJdk,
    downloadUrl: string,
    newStructName: string,
    baseRuntimePath: string,
    onSaveRegistry: () => Promise<Result<void>>,
    logger?: Logger
  ) {
    this.entry = entry;
    this.newVersion = newVersion;
    this.downloadUrl = downloadUrl;
    this.newStructName = newStructName;
    this.baseRuntimePath = baseRuntimePath;
    this.onSaveRegistry = onSaveRegistry;
    this.logger = logger;
  }

  /**
   * アップデートをインストール
   */
  public async install(archivePath: string, dryRun: boolean = false): Promise<Result<void>> {
    // 前提条件チェック
    if (this.entry.isLocked()) {
      return {
        success: false,
        error: `JDK ${this.entry.getId()} is locked and cannot be updated`
      };
    }

    if (!fileExists(archivePath)) {
      return {
        success: false,
        error: `Archive file not found: ${archivePath}`
      };
    }

    const id = this.entry.getId();
    const jdkPath = this.entry.getPath();
    const backupPath = path.join(this.baseRuntimePath, 'backup', id);
    const tempPath = path.join(this.baseRuntimePath, 'temp', id);

    // レジストリのバックアップを作成（メモリ内）
    const instance = this.entry.getInstanceRef();
    const registryBackup = JSON.stringify(instance);

    try {
      this.logger?.info(`Starting update for JDK ${id}`);

      if (dryRun) {
        this.logger?.info(`[DRY RUN] Would update JDK ${id} from ${instance.structName} to ${this.newStructName}`);
        return { success: true, data: undefined };
      }

      // 既存のJDKをバックアップ
      this.logger?.info(`Creating backup: ${jdkPath} -> ${backupPath}`);
      await fs.mkdir(path.dirname(backupPath), { recursive: true });
      await moveDirectory(jdkPath, backupPath);

      // tempディレクトリを準備
      await fs.mkdir(tempPath, { recursive: true });

      // アーカイブを解凍
      this.logger?.info(`Extracting archive: ${archivePath}`);
      const extractResult = await extractArchive(archivePath, tempPath);
      if (!extractResult.success) {
        throw new Error(extractResult.error);
      }

      // JDKルートディレクトリを検索
      const jdkRoot = await findJdkRoot(tempPath);
      this.logger?.info(`JDK root found: ${jdkRoot}`);

      // JDKを最終的な場所に移動
      await moveDirectory(jdkRoot, jdkPath);

      // java.exeを検索
      const javaExeName = getCurrentOS() === 'windows' ? 'java.exe' : 'java';
      const javaPath = await findFile(jdkPath, javaExeName, 3);

      if (!javaPath) {
        throw new Error('java executable not found in extracted archive');
      }

      // バージョン確認
      const versionResult = await getJavaVersion(javaPath);
      if (!versionResult.success) {
        throw new Error(versionResult.error);
      }

      if (versionResult.data !== this.entry.getMajorVersion()) {
        throw new Error(
          `Version mismatch: expected ${this.entry.getMajorVersion()}, got ${versionResult.data}`
        );
      }

      // チェックサム計算
      this.logger?.info('Calculating checksums...');
      const checksumFiles = getRecommendedChecksumFiles(jdkPath, getCurrentOS());
      const checksums: FileChecksum[] = [];

      for (const filePath of checksumFiles) {
        const relativePath = path.relative(jdkPath, filePath);
        const checksum = await calculateChecksum(filePath);
        checksums.push({
          path: relativePath,
          checksum,
          lastVerified: new Date().toISOString()
        });
      }

      // エントリデータを更新
      instance.structName = this.newStructName;
      instance.installedAt = new Date().toISOString();
      instance.checksums = checksums;
      instance.verificationStatus = 'verified';

      // レジストリを保存
      const saveResult = await this.onSaveRegistry();
      if (!saveResult.success) {
        throw new Error(`Failed to save registry: ${saveResult.error}`);
      }

      // 後処理
      this.logger?.info('Cleaning up...');
      await removeDirectory(tempPath);
      await removeDirectory(backupPath);

      if (fileExists(archivePath)) {
        await fs.unlink(archivePath);
      }

      this.logger?.info(`Successfully updated JDK ${id} to ${this.newStructName}`);
      return { success: true, data: undefined };

    } catch (error: any) {
      this.logger?.error(`Update failed for JDK ${id}: ${error.message}`);

      // ロールバック
      try {
        this.logger?.info('Rolling back...');

        if (fileExists(jdkPath)) {
          await removeDirectory(jdkPath);
        }

        if (fileExists(backupPath)) {
          await moveDirectory(backupPath, jdkPath);
        }

        // レジストリを復元
        Object.assign(instance, JSON.parse(registryBackup));
        await this.onSaveRegistry();

        this.logger?.info('Rollback completed');
      } catch (rollbackError: any) {
        this.logger?.error(`Rollback failed: ${rollbackError.message}`);
      }

      return {
        success: false,
        error: `Update failed: ${error.message}`
      };
    }
  }

  /**
   * 新バージョンの情報を取得
   */
  public getNewVersionInfo(): {
    structName: string;
    downloadUrl: string;
    version: string;
    vendor?: string;
  } {
    return {
      structName: this.newStructName,
      downloadUrl: this.downloadUrl,
      version: this.newVersion.version,
      vendor: this.newVersion.vendor
    };
  }
}

/**
 * JDK管理システム メインクラス
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import {
  JdkRegistry,
  JdkInstance,
  JdkManagerOptions,
  Result,
  AddJdkParams,
  InstallInfo,
  AvailableJdk,
  UpdateInfo,
  VerificationResult,
  FileChecksum,
  Logger
} from './jdk-registry.types';
import { JDKEntry } from './jdk-entry';
import { UpdateHandler } from './update-handler';
import {
  extractArchive,
  moveDirectory,
  removeDirectory,
  findFile,
  calculateChecksum,
  fileExists,
  normalizeExtractedPath,
  generateStructName,
  generateId,
  getCurrentOS
} from './file-utils';

const execAsync = promisify(exec);

/**
 * JDK管理システムのメインクラス
 */
export class JdkManager {
  private registry: JdkRegistry;
  private isLoaded: boolean = false;
  public baseRuntimePath: string;
  private registryFilePath: string;
  private entryCache: Map<string, JDKEntry> = new Map();
  public logger?: Logger;
  public installLock: boolean = false;
  public dryRun: boolean = false;

  // 内部クラスのインスタンス
  public readonly Data: DataManager;
  public readonly Entrys: EntryManager;

  constructor(baseRuntimePath: string, options?: JdkManagerOptions) {
    this.baseRuntimePath = baseRuntimePath;
    this.registryFilePath = path.join(baseRuntimePath, 'jdk-registry.json');
    this.dryRun = options?.dryRun || false;
    this.logger = options?.logger;

    // 空のレジストリで初期化
    this.registry = {
      schemaVersion: '1.0.0',
      baseRuntimePath: this.baseRuntimePath,
      instances: [],
      lastUpdated: new Date().toISOString()
    };

    // 内部クラスのインスタンス化
    this.Data = new DataManager(this);
    this.Entrys = new EntryManager(this);
  }

  /**
   * エントリキャッシュから取得または新規作成
   */
  private getOrCreateEntry(instance: JdkInstance): JDKEntry {
    const cached = this.entryCache.get(instance.id);
    if (cached) return cached;

    const entry = new JDKEntry(instance, this);
    this.entryCache.set(instance.id, entry);
    return entry;
  }
}

/**
 * データの永続化を担当するクラス
 */
class DataManager {
  private manager: JdkManager;

  constructor(manager: JdkManager) {
    this.manager = manager;
  }

  /**
   * メモリ上に空のJdkRegistryを初期化
   */
  init(): Result<void> {
    try {
      this.manager['registry'] = {
        schemaVersion: '1.0.0',
        baseRuntimePath: this.manager.baseRuntimePath,
        instances: [],
        lastUpdated: new Date().toISOString()
      };

      this.manager['isLoaded'] = true;

      if (this.manager.logger) {
        this.manager.logger.info('Registry initialized in memory');
      }

      return { success: true, data: undefined };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to initialize registry: ${error.message}`
      };
    }
  }

  /**
   * レジストリJSONファイルを読み込み
   */
  async load(): Promise<Result<void>> {
    try {
      // ファイルの存在確認
      const exists = await fileExists(this.manager['registryFilePath']);

      if (!exists) {
        return {
          success: false,
          error: `Registry file not found: ${this.manager['registryFilePath']}`
        };
      }

      // ファイルを読み込み
      const content = await fs.readFile(this.manager['registryFilePath'], 'utf-8');
      const registry: JdkRegistry = JSON.parse(content);

      // スキーマバージョンの検証
      if (registry.schemaVersion !== '1.0.0') {
        return {
          success: false,
          error: `Incompatible schema version: ${registry.schemaVersion}`
        };
      }

      this.manager['registry'] = registry;
      this.manager['isLoaded'] = true;

      if (this.manager.logger) {
        this.manager.logger.info(
          `Registry loaded: ${registry.instances.length} instances found`
        );
      }

      return { success: true, data: undefined };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to load registry: ${error.message}`
      };
    }
  }

  /**
   * メモリ上のレジストリデータをJSONファイルに保存
   */
  async save(): Promise<Result<void>> {
    try {
      if (!this.manager['isLoaded']) {
        return {
          success: false,
          error: 'Registry is not loaded'
        };
      }

      // lastUpdated を更新
      this.manager['registry'].lastUpdated = new Date().toISOString();

      // JSONシリアライズ
      const content = JSON.stringify(this.manager['registry'], null, 2);

      // ドライランモードの場合
      if (this.manager.dryRun) {
        if (this.manager.logger) {
          this.manager.logger.info('[DRY RUN] Would save registry to file');
        }
        return { success: true, data: undefined };
      }

      // ファイルに書き込み
      await fs.writeFile(this.manager['registryFilePath'], content, 'utf-8');

      if (this.manager.logger) {
        this.manager.logger.info('Registry saved successfully');
      }

      return { success: true, data: undefined };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to save registry: ${error.message}`
      };
    }
  }
}

/**
 * JDKエントリの管理を担当するクラス
 */
class EntryManager {
  private manager: JdkManager;

  constructor(manager: JdkManager) {
    this.manager = manager;
  }

  /**
   * すべてのJDKエントリのファイル整合性を検証
   */
  async checkFileHealthAll(): Promise<Result<VerificationResult[]>> {
    try {
      const results: VerificationResult[] = [];

      for (const instance of this.manager['registry'].instances) {
        const entry = this.manager['getOrCreateEntry'](instance);
        const healthResult = await entry.checkFileHealth();

        if (!healthResult.success) {
          return {
            success: false,
            error: `Failed to check health for ${instance.id}: ${healthResult.error}`
          };
        }

        // 詳細情報を収集
        const missingFiles: string[] = [];
        const corruptedFiles: string[] = [];

        if (instance.verificationStatus === 'missing' || instance.verificationStatus === 'corrupted') {
          for (const fileChecksum of instance.checksums) {
            const filePath = path.join(entry.getPath(), fileChecksum.path);
            const exists = await fileExists(filePath);

            if (!exists) {
              missingFiles.push(fileChecksum.path);
            } else {
              const checksumResult = await calculateChecksum(filePath);
              if (checksumResult.success && checksumResult.data !== fileChecksum.checksum) {
                corruptedFiles.push(fileChecksum.path);
              }
            }
          }
        }

        results.push({
          id: instance.id,
          status: instance.verificationStatus,
          missingFiles: missingFiles.length > 0 ? missingFiles : undefined,
          corruptedFiles: corruptedFiles.length > 0 ? corruptedFiles : undefined
        });
      }

      // レジストリを保存
      const saveResult = await this.manager.Data.save();
      if (!saveResult.success) {
        return {
          success: false,
          error: `Failed to save registry after health check: ${saveResult.error}`
        };
      }

      return { success: true, data: results };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to check file health: ${error.message}`
      };
    }
  }

  /**
   * 正式名称でJDKエントリを検索
   */
  getByStructName(structName: string): Result<JDKEntry> {
    const instance = this.manager['registry'].instances.find(
      inst => inst.structName === structName
    );

    if (!instance) {
      return {
        success: false,
        error: `JDK not found with structName: ${structName}`
      };
    }

    return {
      success: true,
      data: this.manager['getOrCreateEntry'](instance)
    };
  }

  /**
   * メジャーバージョンでJDKエントリを検索
   */
  getByVersion(majorVersion: number): Result<JDKEntry> {
    const instance = this.manager['registry'].instances.find(
      inst => inst.majorVersion === majorVersion
    );

    if (!instance) {
      return {
        success: false,
        error: `JDK not found with major version: ${majorVersion}`
      };
    }

    return {
      success: true,
      data: this.manager['getOrCreateEntry'](instance)
    };
  }

  /**
   * 新しいJDKをインストール
   */
  async add(params: AddJdkParams): Promise<Result<JDKEntry>> {
    // 前提条件チェック
    if (this.manager.installLock) {
      return {
        success: false,
        error: 'Installation is already in progress'
      };
    }

    const existingVersion = this.manager['registry'].instances.find(
      inst => inst.majorVersion === params.majorVersion
    );

    if (existingVersion) {
      return {
        success: false,
        error: `JDK with major version ${params.majorVersion} already exists`
      };
    }

    const archiveExists = await fileExists(params.archivePath);
    if (!archiveExists) {
      return {
        success: false,
        error: `Archive file not found: ${params.archivePath}`
      };
    }

    // インストールロック取得
    this.manager.installLock = true;

    try {
      // レジストリのバックアップ作成
      const registryBackup = JSON.stringify(this.manager['registry']);

      // structName と name の決定
      const structName = params.structName || generateStructName(params.archivePath);
      const name = params.name || `Java ${params.majorVersion}`;
      const id = generateId(params.majorVersion, structName);

      // インストール先パス
      const installPath = path.join(this.manager.baseRuntimePath, id);

      // tempディレクトリ
      const tempPath = path.join(this.manager.baseRuntimePath, 'temp', `install-${Date.now()}`);

      try {
        // アーカイブを解凍
        if (this.manager.logger) {
          this.manager.logger.info(`Extracting archive: ${params.archivePath}`);
        }

        if (!this.manager.dryRun) {
          const extractResult = await extractArchive(params.archivePath, tempPath);
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
          const installResult = await moveDirectory(jdkRoot, installPath);
          if (!installResult.success) {
            throw new Error(installResult.error);
          }

          // java -version で確認
          if (this.manager.logger) {
            this.manager.logger.info(`Verifying Java version: ${javaPath}`);
          }

          const { stderr, stdout } = await execAsync(`"${path.join(installPath, 'bin', javaFileName)}" -version`);
          const output = stderr || stdout;
          const versionMatch = output.match(/version "(\d+)\.?(\d+)?\.?(\d+)?/);

          if (!versionMatch) {
            throw new Error('Failed to parse Java version');
          }

          const detectedMajor = parseInt(versionMatch[1]);
          const actualMajor = detectedMajor === 1 ? parseInt(versionMatch[2]) : detectedMajor;

          if (actualMajor !== params.majorVersion) {
            throw new Error(
              `Version mismatch: expected ${params.majorVersion}, got ${actualMajor}`
            );
          }

          // チェックサム計算
          const checksums: FileChecksum[] = [];
          const checksumFiles = this.getChecksumFiles();

          for (const relPath of checksumFiles) {
            const fullPath = path.join(installPath, relPath);
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

          // JdkInstance作成
          const instance: JdkInstance = {
            id,
            name,
            structName,
            majorVersion: params.majorVersion,
            os: getCurrentOS(),
            installedAt: new Date().toISOString(),
            checksums,
            verificationStatus: 'verified'
          };

          // レジストリに追加
          this.manager['registry'].instances.push(instance);

          // tempディレクトリをクリア
          await removeDirectory(tempPath);

          // アーカイブファイルを削除
          await fs.unlink(params.archivePath);

          // レジストリを保存
          const saveResult = await this.manager.Data.save();
          if (!saveResult.success) {
            throw new Error(saveResult.error);
          }

          // JDKEntryインスタンス作成
          const entry = this.manager['getOrCreateEntry'](instance);

          if (this.manager.logger) {
            this.manager.logger.info(`JDK installed successfully: ${id}`);
          }

          return { success: true, data: entry };
        } else {
          if (this.manager.logger) {
            this.manager.logger.info(`[DRY RUN] Would install JDK to: ${installPath}`);
          }

          // ドライランの場合、ダミーのエントリを返す
          const dummyInstance: JdkInstance = {
            id,
            name,
            structName,
            majorVersion: params.majorVersion,
            os: getCurrentOS(),
            installedAt: new Date().toISOString(),
            checksums: [],
            verificationStatus: 'unverified'
          };

          return {
            success: true,
            data: new JDKEntry(dummyInstance, this.manager)
          };
        }
      } catch (error: any) {
        // ロールバック
        if (this.manager.logger) {
          this.manager.logger.error(`Installation failed, rolling back: ${error.message}`);
        }

        if (!this.manager.dryRun) {
          // インストールファイルを削除
          await removeDirectory(installPath);

          // レジストリを復元
          this.manager['registry'] = JSON.parse(registryBackup);

          // tempディレクトリをクリア
          await removeDirectory(tempPath);
        }

        throw error;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to install JDK: ${error.message}`
      };
    } finally {
      // インストールロック解放
      this.manager.installLock = false;
    }
  }

  /**
   * 指定されたJDKを削除
   */
  async remove(id: string): Promise<Result<void>> {
    try {
      const index = this.manager['registry'].instances.findIndex(inst => inst.id === id);

      if (index === -1) {
        return {
          success: false,
          error: `JDK not found: ${id}`
        };
      }

      const instance = this.manager['registry'].instances[index];
      const entry = this.manager['getOrCreateEntry'](instance);

      // ロック確認
      if (entry.isLocked()) {
        return {
          success: false,
          error: 'Entry is locked and cannot be removed'
        };
      }

      // ドライランモードの場合
      if (this.manager.dryRun) {
        if (this.manager.logger) {
          this.manager.logger.info(`[DRY RUN] Would remove JDK: ${id}`);
        }
        return { success: true, data: undefined };
      }

      // ディレクトリを削除
      const entryPath = entry.getPath();
      const removeResult = await removeDirectory(entryPath);

      if (!removeResult.success) {
        return {
          success: false,
          error: `Failed to remove directory: ${removeResult.error}`
        };
      }

      // レジストリから削除
      this.manager['registry'].instances.splice(index, 1);

      // キャッシュから削除
      this.manager['entryCache'].delete(id);

      // activeJdkIdの確認
      if (this.manager['registry'].activeJdkId === id) {
        this.manager['registry'].activeJdkId = undefined;
      }

      // レジストリを保存
      const saveResult = await this.manager.Data.save();
      if (!saveResult.success) {
        return {
          success: false,
          error: `Failed to save registry: ${saveResult.error}`
        };
      }

      if (this.manager.logger) {
        this.manager.logger.info(`JDK removed successfully: ${id}`);
      }

      return { success: true, data: undefined };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to remove JDK: ${error.message}`
      };
    }
  }

  /**
   * インストール済みJDKのリストを取得
   */
  getInstallList(): InstallInfo[] {
    return this.manager['registry'].instances.map(instance => ({
      id: instance.id,
      majorVersion: instance.majorVersion,
      name: instance.name,
      structName: instance.structName,
      verificationStatus: instance.verificationStatus
    }));
  }

  /**
   * アップデート可能なJDKを検出
   */
  updateCheck(availableJdks: AvailableJdk[]): UpdateInfo[] {
    const currentOS = getCurrentOS();
    const updates: UpdateInfo[] = [];

    for (const instance of this.manager['registry'].instances) {
      const entry = this.manager['getOrCreateEntry'](instance);

      // 同じメジャーバージョンの利用可能なJDKを検索
      const availableJdk = availableJdks.find(
        jdk => parseInt(jdk.version) === instance.majorVersion
      );

      if (!availableJdk) continue;

      // OSに対応するダウンロードURLを取得
      const download = availableJdk.downloads.find(d => d.os === currentOS);

      if (!download) continue;

      // URLからファイル名を抽出
      const urlParts = download.downloadUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const availableStructName = fileName.replace(/\.(zip|tar\.gz|tgz)$/, '');

      // structNameを比較
      if (availableStructName !== instance.structName) {
        updates.push({
          currentStructName: instance.structName,
          availableStructName,
          downloadUrl: download.downloadUrl,
          majorVersion: instance.majorVersion
        });
      }
    }

    return updates;
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

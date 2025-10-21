/**
 * JDK Manager - Main Class
 * 
 * Minecraft用Java実行環境管理システムのメインクラス
 * @version 1.0.0
 */

import * as path from 'path';
import * as fs from 'fs/promises';
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
} from '../types/jdk-registry.types';
import {
  fileExists,
  extractArchive,
  findJdkRoot,
  findFile,
  getJavaVersion,
  calculateChecksum,
  getRecommendedChecksumFiles,
  generateStructName,
  generateId,
  getCurrentOS,
  removeDirectory,
  moveDirectory
} from '../utils/fileUtils';
import { JDKEntry } from './JDKEntry';

/**
 * JDK管理システムのメインクラス
 */
export class JdkManager {
  private registry!: JdkRegistry;
  private isLoaded: boolean = false;
  private baseRuntimePath: string;
  private registryFilePath: string;
  private entryCache: Map<string, JDKEntry> = new Map();
  private logger?: Logger;
  private installLock: boolean = false;
  private dryRun: boolean = false;

  // 内部マネージャー
  public readonly Data: DataManager;
  public readonly Entrys: EntryManager;

  constructor(baseRuntimePath: string, options?: JdkManagerOptions) {
    this.baseRuntimePath = baseRuntimePath;
    this.registryFilePath = path.join(baseRuntimePath, 'jdk-registry.json');
    this.logger = options?.logger;
    this.dryRun = options?.dryRun || false;

    // 内部マネージャーを初期化
    this.Data = new DataManager(this);
    this.Entrys = new EntryManager(this);

    if (this.dryRun) {
      this.logger?.info('[DRY RUN MODE] All file operations will be simulated');
    }
  }

  // Internal getters for managers
  getRegistry(): JdkRegistry {
    return this.registry;
  }

  setRegistry(registry: JdkRegistry): void {
    this.registry = registry;
  }

  getIsLoaded(): boolean {
    return this.isLoaded;
  }

  setIsLoaded(loaded: boolean): void {
    this.isLoaded = loaded;
  }

  getInstallLock(): boolean {
    return this.installLock;
  }

  setInstallLock(locked: boolean): void {
    this.installLock = locked;
  }

  getEntryCache(): Map<string, JDKEntry> {
    return this.entryCache;
  }

  getBaseRuntimePath(): string {
    return this.baseRuntimePath;
  }

  getRegistryFilePath(): string {
    return this.registryFilePath;
  }

  getLogger(): Logger | undefined {
    return this.logger;
  }

  getDryRun(): boolean {
    return this.dryRun;
  }
}

/**
 * データ管理マネージャー
 */
class DataManager {
  private manager: JdkManager;

  constructor(manager: JdkManager) {
    this.manager = manager;
  }

  /**
   * 空のレジストリを初期化
   */
  public init(): Result<void> {
    try {
      const registry: JdkRegistry = {
        schemaVersion: '1.0.0',
        baseRuntimePath: this.manager.getBaseRuntimePath(),
        instances: [],
        lastUpdated: new Date().toISOString()
      };

      this.manager.setRegistry(registry);
      this.manager.setIsLoaded(true);

      this.manager.getLogger()?.info('Registry initialized in memory');

      return { success: true, data: undefined };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to initialize registry: ${error.message}`
      };
    }
  }

  /**
   * レジストリファイルを読み込み
   */
  public async load(): Promise<Result<void>> {
    try {
      const registryPath = this.manager.getRegistryFilePath();

      if (!fileExists(registryPath)) {
        return {
          success: false,
          error: `Registry file not found: ${registryPath}`
        };
      }

      const content = await fs.readFile(registryPath, 'utf-8');
      const registry: JdkRegistry = JSON.parse(content);

      // スキーマバージョンの検証
      if (registry.schemaVersion !== '1.0.0') {
        return {
          success: false,
          error: `Incompatible schema version: ${registry.schemaVersion}`
        };
      }

      this.manager.setRegistry(registry);
      this.manager.setIsLoaded(true);

      this.manager.getLogger()?.info(
        `Registry loaded: ${registry.instances.length} JDK(s) registered`
      );

      return { success: true, data: undefined };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to load registry: ${error.message}`
      };
    }
  }

  /**
   * レジストリをファイルに保存
   */
  public async save(): Promise<Result<void>> {
    try {
      if (!this.manager.getIsLoaded()) {
        return {
          success: false,
          error: 'Registry is not loaded'
        };
      }

      const registry = this.manager.getRegistry();
      registry.lastUpdated = new Date().toISOString();

      const registryPath = this.manager.getRegistryFilePath();
      const content = JSON.stringify(registry, null, 2);

      if (this.manager.getDryRun()) {
        this.manager.getLogger()?.info('[DRY RUN] Would save registry to: ' + registryPath);
        return { success: true, data: undefined };
      }

      // ディレクトリが存在しない場合は作成
      const dir = path.dirname(registryPath);
      await fs.mkdir(dir, { recursive: true });

      await fs.writeFile(registryPath, content, 'utf-8');

      this.manager.getLogger()?.info(`Registry saved to: ${registryPath}`);

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
 * エントリ管理マネージャー
 */
class EntryManager {
  private manager: JdkManager;

  constructor(manager: JdkManager) {
    this.manager = manager;
  }

  /**
   * すべてのJDKエントリのファイル整合性を検証
   */
  public async checkFileHealthAll(): Promise<Result<VerificationResult[]>> {
    try {
      const registry = this.manager.getRegistry();
      const results: VerificationResult[] = [];

      for (const instance of registry.instances) {
        const entry = this.getOrCreateEntry(instance);
        const healthResult = await entry.checkFileHealth();

        if (!healthResult.success) {
          return {
            success: false,
            error: `Failed to check health for ${instance.id}: ${healthResult.error}`
          };
        }

        // 詳細な結果を作成
        const missingFiles: string[] = [];
        const corruptedFiles: string[] = [];

        for (const fileChecksum of instance.checksums) {
          const fullPath = path.join(entry.getPath(), fileChecksum.path);
          if (!fileExists(fullPath)) {
            missingFiles.push(fileChecksum.path);
          } else {
            const currentChecksum = await calculateChecksum(fullPath);
            if (currentChecksum !== fileChecksum.checksum) {
              corruptedFiles.push(fileChecksum.path);
            }
          }
        }

        results.push({
          id: instance.id,
          status: healthResult.data,
          missingFiles: missingFiles.length > 0 ? missingFiles : undefined,
          corruptedFiles: corruptedFiles.length > 0 ? corruptedFiles : undefined
        });
      }

      // レジストリを保存
      await this.manager.Data.save();

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
  public getByStructName(structName: string): Result<JDKEntry> {
    const registry = this.manager.getRegistry();
    const instance = registry.instances.find(i => i.structName === structName);

    if (!instance) {
      return {
        success: false,
        error: `JDK not found with structName: ${structName}`
      };
    }

    return {
      success: true,
      data: this.getOrCreateEntry(instance)
    };
  }

  /**
   * メジャーバージョンでJDKエントリを検索
   */
  public getByVersion(majorVersion: number): Result<JDKEntry> {
    const registry = this.manager.getRegistry();
    const instance = registry.instances.find(i => i.majorVersion === majorVersion);

    if (!instance) {
      return {
        success: false,
        error: `JDK not found with version: ${majorVersion}`
      };
    }

    return {
      success: true,
      data: this.getOrCreateEntry(instance)
    };
  }

  /**
   * IDでJDKエントリを検索
   */
  public getById(id: string): Result<JDKEntry> {
    const registry = this.manager.getRegistry();
    const instance = registry.instances.find(i => i.id === id);

    if (!instance) {
      return {
        success: false,
        error: `JDK not found with id: ${id}`
      };
    }

    return {
      success: true,
      data: this.getOrCreateEntry(instance)
    };
  }

  /**
   * 新しいJDKをインストール
   */
  public async add(params: AddJdkParams): Promise<Result<JDKEntry>> {
    // 前提条件チェック
    if (this.manager.getInstallLock()) {
      return {
        success: false,
        error: 'Installation is already in progress'
      };
    }

    const registry = this.manager.getRegistry();
    const existing = registry.instances.find(
      i => i.majorVersion === params.majorVersion
    );

    if (existing) {
      return {
        success: false,
        error: `JDK with major version ${params.majorVersion} already exists`
      };
    }

    if (!fileExists(params.archivePath)) {
      return {
        success: false,
        error: `Archive file not found: ${params.archivePath}`
      };
    }

    // ロック取得
    this.manager.setInstallLock(true);

    // レジストリのバックアップ
    const registryBackup = JSON.stringify(registry);

    const structName = params.structName || generateStructName(params.archivePath);
    const id = generateId(params.majorVersion, structName);
    const jdkPath = path.join(this.manager.getBaseRuntimePath(), id);
    const tempPath = path.join(this.manager.getBaseRuntimePath(), 'temp', id);

    try {
      this.manager.getLogger()?.info(`Installing JDK ${id}...`);

      if (this.manager.getDryRun()) {
        this.manager.getLogger()?.info('[DRY RUN] Would install JDK ' + id);
        this.manager.setInstallLock(false);
        
        // ダミーのエントリを作成
        const dummyInstance: JdkInstance = {
          id,
          name: params.name || `Java ${params.majorVersion}`,
          structName,
          majorVersion: params.majorVersion,
          os: getCurrentOS(),
          installedAt: new Date().toISOString(),
          checksums: [],
          verificationStatus: 'unverified'
        };
        
        return {
          success: true,
          data: new JDKEntry(dummyInstance, this.manager.getBaseRuntimePath(), this.manager.getLogger())
        };
      }

      // tempディレクトリを準備
      await fs.mkdir(tempPath, { recursive: true });

      // アーカイブを解凍
      this.manager.getLogger()?.info(`Extracting archive: ${params.archivePath}`);
      const extractResult = await extractArchive(params.archivePath, tempPath);
      if (!extractResult.success) {
        throw new Error(extractResult.error);
      }

      // JDKルートディレクトリを検索
      const jdkRoot = await findJdkRoot(tempPath);
      this.manager.getLogger()?.info(`JDK root found: ${jdkRoot}`);

      // JDKを最終的な場所に移動
      await moveDirectory(jdkRoot, jdkPath);

      // java.exeを検索
      const javaExeName = getCurrentOS() === 'windows' ? 'java.exe' : 'java';
      const javaPath = await findFile(jdkPath, javaExeName, 3);

      if (!javaPath) {
        throw new Error('java executable not found in extracted archive');
      }

      // バージョン確認
      this.manager.getLogger()?.info('Verifying Java version...');
      const versionResult = await getJavaVersion(javaPath);
      if (!versionResult.success) {
        throw new Error(versionResult.error);
      }

      if (versionResult.data !== params.majorVersion) {
        throw new Error(
          `Version mismatch: expected ${params.majorVersion}, got ${versionResult.data}`
        );
      }

      // チェックサム計算
      this.manager.getLogger()?.info('Calculating checksums...');
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

      // エントリデータを作成
      const instance: JdkInstance = {
        id,
        name: params.name || `Java ${params.majorVersion}`,
        structName,
        majorVersion: params.majorVersion,
        os: getCurrentOS(),
        installedAt: new Date().toISOString(),
        checksums,
        verificationStatus: 'verified'
      };

      // レジストリに追加
      registry.instances.push(instance);

      // レジストリを保存
      const saveResult = await this.manager.Data.save();
      if (!saveResult.success) {
        throw new Error(`Failed to save registry: ${saveResult.error}`);
      }

      // 後処理
      this.manager.getLogger()?.info('Cleaning up...');
      await removeDirectory(tempPath);

      if (fileExists(params.archivePath)) {
        await fs.unlink(params.archivePath);
      }

      // エントリを作成してキャッシュに追加
      const entry = this.getOrCreateEntry(instance);

      this.manager.getLogger()?.info(`Successfully installed JDK ${id}`);
      this.manager.setInstallLock(false);

      return { success: true, data: entry };

    } catch (error: any) {
      this.manager.getLogger()?.error(`Installation failed for JDK ${id}: ${error.message}`);

      // ロールバック
      try {
        if (fileExists(jdkPath)) {
          await removeDirectory(jdkPath);
        }
        if (fileExists(tempPath)) {
          await removeDirectory(tempPath);
        }
        Object.assign(registry, JSON.parse(registryBackup));
      } catch (rollbackError: any) {
        this.manager.getLogger()?.error(`Rollback failed: ${rollbackError.message}`);
      }

      this.manager.setInstallLock(false);

      return {
        success: false,
        error: `Installation failed: ${error.message}`
      };
    }
  }

  /**
   * JDKを削除
   */
  public async remove(id: string): Promise<Result<void>> {
    const registry = this.manager.getRegistry();
    const instance = registry.instances.find(i => i.id === id);

    if (!instance) {
      return {
        success: false,
        error: `JDK not found: ${id}`
      };
    }

    const entry = this.getOrCreateEntry(instance);

    if (entry.isLocked()) {
      return {
        success: false,
        error: `JDK ${id} is locked and cannot be removed`
      };
    }

    try {
      const jdkPath = entry.getPath();

      if (this.manager.getDryRun()) {
        this.manager.getLogger()?.info(`[DRY RUN] Would remove JDK ${id} at ${jdkPath}`);
      } else {
        this.manager.getLogger()?.info(`Removing JDK ${id}...`);
        await removeDirectory(jdkPath);
      }

      // レジストリから削除
      const index = registry.instances.indexOf(instance);
      registry.instances.splice(index, 1);

      // キャッシュから削除
      this.manager.getEntryCache().delete(id);

      // activeJdkIdの更新
      if (registry.activeJdkId === id) {
        registry.activeJdkId = undefined;
      }

      // レジストリを保存
      await this.manager.Data.save();

      this.manager.getLogger()?.info(`Successfully removed JDK ${id}`);

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
  public getInstallList(): InstallInfo[] {
    const registry = this.manager.getRegistry();
    
    return registry.instances.map(instance => ({
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
  public updateCheck(availableJdks: AvailableJdk[]): UpdateInfo[] {
    const registry = this.manager.getRegistry();
    const currentOS = getCurrentOS();
    const updates: UpdateInfo[] = [];

    for (const instance of registry.instances) {
      // majorVersionが一致するJDKを検索
      const matchingJdk = availableJdks.find(
        jdk => parseInt(jdk.version) === instance.majorVersion
      );

      if (!matchingJdk) continue;

      // OSに対応するダウンロードURLを取得
      const download = matchingJdk.downloads.find(d => d.os === currentOS);
      if (!download) continue;

      // URLからファイル名を抽出
      const url = new URL(download.downloadUrl);
      const fileName = path.basename(url.pathname);
      const availableStructName = fileName.replace(/\.(zip|tar\.gz|tgz)$/, '');

      // structNameを比較
      if (availableStructName !== instance.structName) {
        updates.push({
          id: instance.id,
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
   * エントリをキャッシュから取得または作成
   */
  private getOrCreateEntry(instance: JdkInstance): JDKEntry {
    const cache = this.manager.getEntryCache();
    const cached = cache.get(instance.id);
    
    if (cached) return cached;

    const entry = new JDKEntry(
      instance,
      this.manager.getBaseRuntimePath(),
      this.manager.getLogger()
    );
    cache.set(instance.id, entry);
    
    return entry;
  }
}

/**
 * JDK Entry Class
 * 
 * 個別のJDKインスタンスに対する操作を提供
 */

import * as path from 'path';
import crypto from 'crypto';
import {
  JdkInstance,
  RuntimeLock,
  VerificationStatus,
  Result,
  AvailableJdk,
  Logger
} from '../types/jdk-registry.types';
import {
  calculateChecksum,
  fileExists,
  getCurrentOS
} from '../utils/fileUtils';
import { UpdateHandler } from './UpdateHandler';

export class JDKEntry {
  private instance: JdkInstance;
  private baseRuntimePath: string;
  private locks: RuntimeLock[] = [];
  private logger?: Logger;

  constructor(
    instance: JdkInstance,
    baseRuntimePath: string,
    logger?: Logger
  ) {
    this.instance = instance;
    this.baseRuntimePath = baseRuntimePath;
    this.logger = logger;
  }

  /**
   * ランタイムの使用をロックし、lockIdを返す
   * 
   * @param purpose - ロックの目的（例: "Minecraft 1.20.1"）
   * @returns lockId - ロック解除時に使用するUUID
   * 
   * @example
   * const lockId = entry.useRuntime('Minecraft 1.20.1');
   * // ... Javaランタイムを使用 ...
   * entry.unUseRuntime(lockId);
   */
  public useRuntime(purpose?: string): string {
    const lockId = crypto.randomUUID();
    const lock: RuntimeLock = {
      lockId,
      lockedAt: new Date().toISOString(),
      purpose
    };

    this.locks.push(lock);

    this.logger?.info(
      `Runtime locked: ${this.instance.id} (lockId: ${lockId}, purpose: ${purpose || 'N/A'})`
    );

    return lockId;
  }

  /**
   * ランタイムのロックを解除
   * 
   * @param lockId - useRuntime()で取得したロックID
   * @returns Result<void> - 成功時はsuccess: true、失敗時はエラーメッセージ
   * 
   * @example
   * const result = entry.unUseRuntime(lockId);
   * if (!result.success) {
   *   console.error('Failed to unlock:', result.error);
   * }
   */
  public unUseRuntime(lockId: string): Result<void> {
    const index = this.locks.findIndex(lock => lock.lockId === lockId);

    if (index === -1) {
      return {
        success: false,
        error: `Lock not found: ${lockId}`
      };
    }

    this.locks.splice(index, 1);

    this.logger?.info(
      `Runtime unlocked: ${this.instance.id} (lockId: ${lockId})`
    );

    return { success: true, data: undefined };
  }

  /**
   * ランタイムがロックされているか確認
   * 
   * ロック中のランタイムは削除やアップデートができません。
   * 
   * @returns boolean - ロックされている場合true
   * 
   * @example
   * if (entry.isLocked()) {
   *   console.log('Runtime is currently in use');
   * }
   */
  public isLocked(): boolean {
    return this.locks.length > 0;
  }

  /**
   * ファイルの整合性を検証
   * 
   * 重要なJDKファイル（java.exe、javac.exe、lib/modulesなど）のSHA-256
   * チェックサムを検証し、ファイルの欠損や破損を検出します。
   * アンチウイルスソフトによる誤削除の検出に使用できます。
   * 
   * @returns Promise<Result<VerificationStatus>> - 検証結果
   *   - 'verified': すべてのファイルが正常
   *   - 'missing': ファイルが欠損している
   *   - 'corrupted': ファイルが破損している
   * 
   * @example
   * const result = await entry.checkFileHealth();
   * if (result.success) {
   *   if (result.data === 'verified') {
   *     console.log('All files are intact');
   *   } else if (result.data === 'missing') {
   *     console.error('Some files are missing - reinstall required');
   *   } else if (result.data === 'corrupted') {
   *     console.error('Some files are corrupted - reinstall required');
   *   }
   * }
   */
  public async checkFileHealth(): Promise<Result<VerificationStatus>> {
    try {
      const missingFiles: string[] = [];
      const corruptedFiles: string[] = [];

      for (const fileChecksum of this.instance.checksums) {
        const fullPath = path.join(this.getRuntimePath(), fileChecksum.path);

        // ファイルの存在確認
        if (!fileExists(fullPath)) {
          missingFiles.push(fileChecksum.path);
          continue;
        }

        // チェックサム計算
        const currentChecksum = await calculateChecksum(fullPath);

        // チェックサム比較
        if (currentChecksum !== fileChecksum.checksum) {
          corruptedFiles.push(fileChecksum.path);
        }

        // lastVerifiedを更新
        fileChecksum.lastVerified = new Date().toISOString();
      }

      // ステータス判定
      let status: VerificationStatus;
      if (missingFiles.length > 0) {
        status = 'missing';
        this.logger?.warn(
          `JDK ${this.instance.id} has missing files: ${missingFiles.join(', ')}`
        );
      } else if (corruptedFiles.length > 0) {
        status = 'corrupted';
        this.logger?.warn(
          `JDK ${this.instance.id} has corrupted files: ${corruptedFiles.join(', ')}`
        );
      } else {
        status = 'verified';
        this.logger?.info(
          `JDK ${this.instance.id} verification passed`
        );
      }

      this.instance.verificationStatus = status;

      return { success: true, data: status };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to check file health: ${error.message}`
      };
    }
  }

  /**
   * アップデート可能かを確認し、可能な場合はUpdateHandlerを返す
   * 
   * 利用可能なJDKリストと現在のインスタンスを比較し、
   * 新しいバージョンが存在する場合はアップデート用のハンドラを返します。
   * 
   * @param availableJdks - 利用可能なJDKのリスト
   * @param onSaveRegistry - レジストリ保存用のコールバック関数
   * @returns UpdateHandler | null - アップデート可能な場合はハンドラ、不可能な場合はnull
   * 
   * @example
   * const availableJdks = await fetchAvailableJdks();
   * const updateHandler = entry.getUpdate(availableJdks, () => manager.Data.save());
   * 
   * if (updateHandler) {
   *   const info = updateHandler.getNewVersionInfo();
   *   console.log(`Update available: ${info.structName}`);
   *   
   *   // ダウンロード後にインストール
   *   const archivePath = await download(info.downloadUrl);
   *   await updateHandler.install(archivePath);
   * }
   */
  public getUpdate(
    availableJdks: AvailableJdk[],
    onSaveRegistry: () => Promise<Result<void>>
  ): UpdateHandler | null {
    const currentOS = getCurrentOS();

    // majorVersionが一致するJDKを検索
    const matchingJdk = availableJdks.find(
      jdk => parseInt(jdk.version) === this.instance.majorVersion
    );

    if (!matchingJdk) {
      return null;
    }

    // OSに対応するダウンロードURLを取得
    const download = matchingJdk.downloads.find(d => d.os === currentOS);
    if (!download) {
      return null;
    }

    // URLからファイル名を抽出
    const url = new URL(download.downloadUrl);
    const fileName = path.basename(url.pathname);
    const availableStructName = fileName.replace(/\.(zip|tar\.gz|tgz)$/, '');

    // structNameを比較
    if (availableStructName === this.instance.structName) {
      return null; // 同じバージョン
    }

    // UpdateHandlerを作成
    return new UpdateHandler(
      this,
      matchingJdk,
      download.downloadUrl,
      availableStructName,
      this.baseRuntimePath,
      onSaveRegistry,
      this.logger
    );
  }

  /**
   * インスタンスデータへの参照を取得（内部使用）
   * 
   * ⚠️ このメソッドは内部実装用です。
   * 外部から直接インスタンスを変更することは推奨されません。
   * 
   * @returns JdkInstance - JDKインスタンスデータへの参照
   * @internal
   */
  public getInstanceRef(): JdkInstance {
    return this.instance;
  }

  // ==================== ゲッターメソッド ====================

  /**
   * JDKインスタンスの一意識別子を取得
   * 
   * @returns string - インスタンスID（例: "jdk-17-temurin"）
   * 
   * @example
   * const id = entry.getId(); // "jdk-17-temurin"
   */
  public getId(): string {
    return this.instance.id;
  }

  /**
   * JDKインスタンスの簡易名称を取得
   * 
   * @returns string - 簡易名称（例: "Java 17"）
   * 
   * @example
   * const name = entry.getName(); // "Java 17"
   */
  public getName(): string {
    return this.instance.name;
  }

  /**
   * JDKインスタンスの正式名称を取得
   * 
   * @returns string - 正式名称（アーカイブファイル名ベース）
   * 
   * @example
   * const structName = entry.getStructName();
   * // "OpenJDK17U-jdk_x64_windows_hotspot_17.0.8_7"
   */
  public getStructName(): string {
    return this.instance.structName;
  }

  /**
   * JDKのメジャーバージョンを取得
   * 
   * @returns number - メジャーバージョン（例: 17）
   * 
   * @example
   * const version = entry.getMajorVersion(); // 17
   */
  public getMajorVersion(): number {
    return this.instance.majorVersion;
  }

  /**
   * JDKランタイムのルートディレクトリパスを取得
   * 
   * @returns string - ランタイムのルートディレクトリパス（絶対パス）
   * 
   * @example
   * const runtimePath = entry.getRuntimePath();
   * // "/path/to/runtime/jdk-17-temurin"
   * 
   * @see getExecutableFilePath() - java実行ファイルの直接パスが必要な場合
   */
  public getRuntimePath(): string {
    return path.join(this.baseRuntimePath, this.instance.id);
  }

  /**
   * Java実行ファイル（java.exe / java）のフルパスを取得
   * 
   * このメソッドは child_process.spawn() や exec() などで
   * Javaランタイムを直接実行する際に使用します。
   * 
   * @returns string - java実行ファイルのフルパス（絶対パス）
   *   - Windows: "C:\\runtime\\jdk-17-temurin\\bin\\java.exe"
   *   - Unix/Linux/macOS: "/runtime/jdk-17-temurin/bin/java"
   * 
   * @example
   * import { spawn } from 'child_process';
   * 
   * const javaPath = entry.getExecutableFilePath();
   * const process = spawn(javaPath, ['-version']);
   * 
   * @example
   * // Minecraftサーバー起動
   * const javaPath = entry.getExecutableFilePath();
   * const minecraft = spawn(javaPath, [
   *   '-Xmx2G',
   *   '-Xms1G',
   *   '-jar',
   *   'minecraft_server.jar',
   *   'nogui'
   * ]);
   */
  public getExecutableFilePath(): string {
    const runtimePath = this.getRuntimePath();
    const executableName = getCurrentOS() === 'windows' ? 'java.exe' : 'java';
    return path.join(runtimePath, 'bin', executableName);
  }

  /**
   * 検証ステータスを取得
   * 
   * @returns VerificationStatus - 検証ステータス
   *   - 'verified': 検証済み・正常
   *   - 'unverified': 未検証
   *   - 'corrupted': 破損検出
   *   - 'missing': ファイル欠損
   * 
   * @example
   * const status = entry.getVerificationStatus();
   * if (status !== 'verified') {
   *   console.warn('JDK integrity issue detected:', status);
   * }
   */
  public getVerificationStatus(): VerificationStatus {
    return this.instance.verificationStatus;
  }

  /**
   * JDKのOS種別を取得
   * 
   * @returns string - OS種別（"windows", "linux", "macos"）
   * 
   * @example
   * const os = entry.getOS(); // "windows"
   */
  public getOS(): string {
    return this.instance.os;
  }

  /**
   * JDKのインストール日時を取得
   * 
   * @returns string - インストール日時（ISO 8601形式）
   * 
   * @example
   * const installedAt = entry.getInstalledAt();
   * // "2024-03-15T10:30:00Z"
   * const date = new Date(installedAt);
   */
  public getInstalledAt(): string {
    return this.instance.installedAt;
  }

  /**
   * ファイルチェックサム情報を取得
   * 
   * @returns Array<FileChecksum> - チェックサム情報の配列（コピー）
   * 
   * @example
   * const checksums = entry.getChecksums();
   * checksums.forEach(cs => {
   *   console.log(`${cs.path}: ${cs.checksum}`);
   * });
   */
  public getChecksums(): Array<{ path: string; checksum: string; lastVerified: string }> {
    return [...this.instance.checksums];
  }

  /**
   * 現在のランタイムロック情報を取得
   * 
   * @returns RuntimeLock[] - ロック情報の配列（コピー）
   * 
   * @example
   * const locks = entry.getLocks();
   * console.log(`Active locks: ${locks.length}`);
   * locks.forEach(lock => {
   *   console.log(`- ${lock.purpose} (${lock.lockId})`);
   * });
   */
  public getLocks(): RuntimeLock[] {
    return [...this.locks];
  }

  /**
   * @deprecated getPath()は getRuntimePath() にリネームされました。
   * 代わりに getRuntimePath() または getExecutableFilePath() を使用してください。
   * 
   * @see getRuntimePath() - ランタイムルートディレクトリパス
   * @see getExecutableFilePath() - java実行ファイルのフルパス
   */
  public getPath(): string {
    return this.getRuntimePath();
  }
}

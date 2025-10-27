/**
 * JDK Entry Class
 * 
 * 個別のJDKインスタンスに対する操作を提供
 */

import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
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
   */
  public useRuntime(purpose?: string): string {
    const lockId = uuidv4();
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
   */
  public isLocked(): boolean {
    return this.locks.length > 0;
  }

  /**
   * ファイルの整合性を検証
   */
  public async checkFileHealth(): Promise<Result<VerificationStatus>> {
    try {
      const missingFiles: string[] = [];
      const corruptedFiles: string[] = [];

      for (const fileChecksum of this.instance.checksums) {
        const fullPath = path.join(this.getPath(), fileChecksum.path);

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
   */
  public getInstanceRef(): JdkInstance {
    return this.instance;
  }

  // ゲッターメソッド
  public getId(): string {
    return this.instance.id;
  }

  public getName(): string {
    return this.instance.name;
  }

  public getStructName(): string {
    return this.instance.structName;
  }

  public getMajorVersion(): number {
    return this.instance.majorVersion;
  }

  public getPath(): string {
    return path.join(this.baseRuntimePath, this.instance.id);
  }

  public getVerificationStatus(): VerificationStatus {
    return this.instance.verificationStatus;
  }

  public getOS(): string {
    return this.instance.os;
  }

  public getInstalledAt(): string {
    return this.instance.installedAt;
  }

  public getChecksums(): Array<{ path: string; checksum: string; lastVerified: string }> {
    return [...this.instance.checksums];
  }

  public getLocks(): RuntimeLock[] {
    return [...this.locks];
  }
}

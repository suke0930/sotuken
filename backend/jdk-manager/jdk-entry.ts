/**
 * JDK管理システム JDKEntryクラス
 */

import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  JdkInstance,
  RuntimeLock,
  Result,
  VerificationStatus,
  AvailableJdk,
  FileChecksum
} from './jdk-registry.types';
import { calculateChecksum, fileExists, getCurrentOS } from './file-utils';

/**
 * 個別のJDKインスタンスに対する操作を提供するクラス
 */
export class JDKEntry {
  private instance: JdkInstance;
  private manager: any; // JdkManagerへの参照（循環参照を避けるため any）
  private locks: RuntimeLock[] = [];

  constructor(instance: JdkInstance, manager: any) {
    this.instance = instance;
    this.manager = manager;
  }

  /**
   * ランタイムの使用をロックし、lockIdを返す
   */
  useRuntime(purpose?: string): string {
    const lockId = uuidv4();
    const lock: RuntimeLock = {
      lockId,
      lockedAt: new Date().toISOString(),
      purpose
    };

    this.locks.push(lock);

    if (this.manager.logger) {
      this.manager.logger.info(
        `Runtime locked: ${this.instance.id} (lockId: ${lockId}, purpose: ${purpose || 'N/A'})`
      );
    }

    return lockId;
  }

  /**
   * ランタイムのロックを解除
   */
  unUseRuntime(lockId: string): Result<void> {
    const index = this.locks.findIndex(lock => lock.lockId === lockId);

    if (index === -1) {
      return {
        success: false,
        error: `Lock not found: ${lockId}`
      };
    }

    this.locks.splice(index, 1);

    if (this.manager.logger) {
      this.manager.logger.info(`Runtime unlocked: ${this.instance.id} (lockId: ${lockId})`);
    }

    return { success: true, data: undefined };
  }

  /**
   * ランタイムがロックされているかを確認
   */
  isLocked(): boolean {
    return this.locks.length > 0;
  }

  /**
   * ファイルの整合性を検証
   */
  async checkFileHealth(): Promise<Result<VerificationStatus>> {
    try {
      const basePath = this.getPath();
      const missingFiles: string[] = [];
      const corruptedFiles: string[] = [];

      for (const fileChecksum of this.instance.checksums) {
        const filePath = path.join(basePath, fileChecksum.path);

        // ファイルの存在確認
        const exists = await fileExists(filePath);

        if (!exists) {
          missingFiles.push(fileChecksum.path);
          continue;
        }

        // チェックサム計算
        const result = await calculateChecksum(filePath);

        if (!result.success) {
          if (this.manager.logger) {
            this.manager.logger.error(
              `Failed to calculate checksum for ${fileChecksum.path}: ${result.error}`
            );
          }
          corruptedFiles.push(fileChecksum.path);
          continue;
        }

        // チェックサム比較
        if (result.data !== fileChecksum.checksum) {
          corruptedFiles.push(fileChecksum.path);
        }

        // lastVerified を更新
        fileChecksum.lastVerified = new Date().toISOString();
      }

      // 検証ステータスを決定
      let status: VerificationStatus;

      if (missingFiles.length > 0) {
        status = 'missing';
      } else if (corruptedFiles.length > 0) {
        status = 'corrupted';
      } else {
        status = 'verified';
      }

      this.instance.verificationStatus = status;

      if (this.manager.logger) {
        this.manager.logger.info(
          `File health check completed for ${this.instance.id}: ${status}`
        );
        if (missingFiles.length > 0) {
          this.manager.logger.warn(`Missing files: ${missingFiles.join(', ')}`);
        }
        if (corruptedFiles.length > 0) {
          this.manager.logger.warn(`Corrupted files: ${corruptedFiles.join(', ')}`);
        }
      }

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
  getUpdate(availableJdks: AvailableJdk[]): any | null {
    const currentOS = getCurrentOS();

    // 同じメジャーバージョンの利用可能なJDKを検索
    const availableJdk = availableJdks.find(
      jdk => parseInt(jdk.version) === this.instance.majorVersion
    );

    if (!availableJdk) {
      return null;
    }

    // 現在のOSに対応するダウンロードURLを取得
    const download = availableJdk.downloads.find(d => d.os === currentOS);

    if (!download) {
      return null;
    }

    // URLからファイル名を抽出
    const urlParts = download.downloadUrl.split('/');
    const fileName = urlParts[urlParts.length - 1];
    const availableStructName = fileName.replace(/\.(zip|tar\.gz|tgz)$/, '');

    // structNameを比較
    if (availableStructName === this.instance.structName) {
      return null; // アップデート不要
    }

    // UpdateHandlerを作成して返す
    // UpdateHandlerは別ファイルで定義されるため、ここではインポートして使用
    const { UpdateHandler } = require('./update-handler');
    return new UpdateHandler(this, availableJdk, this.manager);
  }

  /**
   * ゲッターメソッド
   */
  getId(): string {
    return this.instance.id;
  }

  getName(): string {
    return this.instance.name;
  }

  getStructName(): string {
    return this.instance.structName;
  }

  getMajorVersion(): number {
    return this.instance.majorVersion;
  }

  getPath(): string {
    return path.join(this.manager.baseRuntimePath, this.instance.id);
  }

  getVerificationStatus(): VerificationStatus {
    return this.instance.verificationStatus;
  }

  /**
   * インスタンスデータへの参照を取得（内部使用）
   */
  _getInstance(): JdkInstance {
    return this.instance;
  }
}

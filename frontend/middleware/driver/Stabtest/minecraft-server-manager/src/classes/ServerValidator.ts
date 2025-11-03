/**
 * Server Validator
 * 
 * サーバーバリデーションクラス
 * @version 1.0.0
 */

import * as os from 'os';
import type { Logger } from 'pino';
import type { JdkManager } from '../../jdk-manager/src/lib/JdkManager';
import type { ServerManager } from './ServerManager';
import { ValidationResult, ValidationResultHelper } from '../types/validation';
import { AddInstanceParams, UpdateInstanceParams } from '../types/params';
import { AutoRestartConfig } from '../types/server-schema';
import { ServerManagerErrors } from '../constants/errors';

/**
 * サーバーバリデータークラス
 * ServerManagerのデータを読み取り専用で参照
 */
export class ServerValidator {
  private manager: ServerManager;
  private jdkManager: JdkManager;
  private logger: Logger;

  constructor(
    manager: ServerManager,
    jdkManager: JdkManager,
    logger: Logger
  ) {
    this.manager = manager;
    this.jdkManager = jdkManager;
    this.logger = logger;
  }

  /**
   * インスタンス追加のバリデーション
   */
  public async validateAddInstance(
    params: AddInstanceParams
  ): Promise<ValidationResult> {
    const warnings: string[] = [];

    // 名前バリデーション
    const nameResult = this.validateName(params.name);
    if (!nameResult.valid) {
      return nameResult;
    }
    if (nameResult.warnings) {
      warnings.push(...nameResult.warnings);
    }

    // JDKバージョンバリデーション
    const jdkResult = this.validateJdkVersion(params.jdkVersion);
    if (!jdkResult.valid) {
      return jdkResult;
    }
    if (jdkResult.warnings) {
      warnings.push(...jdkResult.warnings);
    }

    // ポートバリデーション
    const port = params.port || 25565;
    const portResult = this.validatePort(port);
    if (!portResult.valid) {
      return portResult;
    }
    if (portResult.warnings) {
      warnings.push(...portResult.warnings);
    }

    // メモリバリデーション
    const maxMemory = params.maxMemory || 2048;
    const minMemory = params.minMemory || 1024;
    const memoryResult = this.validateMemorySettings(minMemory, maxMemory);
    if (!memoryResult.valid) {
      return memoryResult;
    }
    if (memoryResult.warnings) {
      warnings.push(...memoryResult.warnings);
    }

    return warnings.length > 0
      ? ValidationResultHelper.warning(warnings)
      : ValidationResultHelper.success();
  }

  /**
   * インスタンス更新のバリデーション
   */
  public async validateUpdateInstance(
    params: UpdateInstanceParams
  ): Promise<ValidationResult> {
    const warnings: string[] = [];

    // インスタンス存在確認
    const instance = this.manager.getInstanceData(params.uuid);
    if (!instance) {
      return ValidationResultHelper.failure(ServerManagerErrors.INSTANCE_NOT_FOUND);
    }

    // 名前変更の場合
    if (params.updates.name !== undefined) {
      const nameResult = this.validateName(params.updates.name, params.uuid);
      if (!nameResult.valid) {
        return nameResult;
      }
      if (nameResult.warnings) {
        warnings.push(...nameResult.warnings);
      }
    }

    // ポート変更の場合
    if (params.updates.port !== undefined) {
      const portResult = this.validatePort(params.updates.port, params.uuid);
      if (!portResult.valid) {
        return portResult;
      }
      if (portResult.warnings) {
        warnings.push(...portResult.warnings);
      }
    }

    // メモリ変更の場合
    if (params.updates.maxMemory !== undefined || params.updates.minMemory !== undefined) {
      const maxMemory = params.updates.maxMemory || instance.launchConfig.maxMemory;
      const minMemory = params.updates.minMemory || instance.launchConfig.minMemory;
      
      const memoryResult = this.validateMemorySettings(minMemory, maxMemory);
      if (!memoryResult.valid) {
        return memoryResult;
      }
      if (memoryResult.warnings) {
        warnings.push(...memoryResult.warnings);
      }
    }

    return warnings.length > 0
      ? ValidationResultHelper.warning(warnings)
      : ValidationResultHelper.success();
  }

  /**
   * サーバー起動のバリデーション
   */
  public validateServerStart(uuid: string): ValidationResult {
    const instance = this.manager.getInstanceData(uuid);
    
    if (!instance) {
      return ValidationResultHelper.failure(ServerManagerErrors.INSTANCE_NOT_FOUND);
    }

    if (instance.status === 'running') {
      return ValidationResultHelper.failure(ServerManagerErrors.INSTANCE_RUNNING);
    }

    // JDK存在確認
    const jdkResult = this.jdkManager.Entrys.getByVersion(instance.launchConfig.jdkVersion);
    if (!jdkResult.success) {
      return ValidationResultHelper.failure(
        `${ServerManagerErrors.JDK_NOT_FOUND}: ${jdkResult.error}`
      );
    }

    return ValidationResultHelper.success();
  }

  /**
   * 名前バリデーション
   */
  public validateName(name: string, excludeUuid?: string): ValidationResult {
    // 空文字チェック
    if (!name || name.trim().length === 0) {
      return ValidationResultHelper.failure('Server name cannot be empty');
    }

    // 長さチェック
    if (name.length > 50) {
      return ValidationResultHelper.failure('Server name is too long (max 50 characters)');
    }

    // 使用不可文字チェック（ディレクトリ名として使用するため）
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(name)) {
      return ValidationResultHelper.failure(
        'Server name contains invalid characters: < > : " / \\ | ? *'
      );
    }

    // 重複チェック
    const instances = this.manager.getAllInstances();
    const duplicate = instances.find(inst => 
      inst.name === name && 
      inst.uuid !== excludeUuid
    );

    if (duplicate) {
      return ValidationResultHelper.failure(
        `${ServerManagerErrors.INSTANCE_NAME_DUPLICATE}: "${name}"`
      );
    }

    return ValidationResultHelper.success();
  }

  /**
   * ポートバリデーション
   */
  public validatePort(port: number, excludeUuid?: string): ValidationResult {
    const warnings: string[] = [];

    // 範囲チェック
    if (port < 1 || port > 65535) {
      return ValidationResultHelper.failure(
        `${ServerManagerErrors.PORT_INVALID}: must be between 1 and 65535`
      );
    }

    // Well-knownポートの警告
    if (port < 1024) {
      warnings.push(
        `Port ${port} is a well-known port. May require administrator privileges.`
      );
    }

    // 全インスタンスをチェック
    const instances = this.manager.getAllInstances();
    const conflict = instances.find(inst => 
      inst.launchConfig.port === port && 
      inst.uuid !== excludeUuid
    );

    if (conflict) {
      if (conflict.status === 'running') {
        // 稼働中 → エラー
        return ValidationResultHelper.failure(
          `${ServerManagerErrors.PORT_IN_USE}: Port ${port} is in use by running server "${conflict.name}"`
        );
      } else {
        // 停止中 → 警告
        warnings.push(
          `Port ${port} is configured for server "${conflict.name}" (currently ${conflict.status})`
        );
      }
    }

    return warnings.length > 0
      ? ValidationResultHelper.warning(warnings)
      : ValidationResultHelper.success();
  }

  /**
   * JDKバージョンバリデーション
   */
  public validateJdkVersion(jdkVersion: number): ValidationResult {
    // 正の整数チェック
    if (!Number.isInteger(jdkVersion) || jdkVersion <= 0) {
      return ValidationResultHelper.failure(
        `${ServerManagerErrors.JDK_VERSION_INVALID}: must be a positive integer`
      );
    }

    // JDK存在確認
    const result = this.jdkManager.Entrys.getByVersion(jdkVersion);
    if (!result.success) {
      return ValidationResultHelper.failure(
        `${ServerManagerErrors.JDK_NOT_FOUND}: JDK ${jdkVersion} is not installed`
      );
    }

    const jdkEntry = result.data;

    // 整合性ステータス確認
    const status = jdkEntry.getVerificationStatus();
    if (status === 'missing') {
      return ValidationResultHelper.failure(
        `JDK ${jdkVersion} files are missing. Reinstall required.`
      );
    }

    if (status === 'corrupted') {
      return ValidationResultHelper.failure(
        `JDK ${jdkVersion} files are corrupted. Reinstall required.`
      );
    }

    return ValidationResultHelper.success();
  }

  /**
   * メモリ設定バリデーション
   */
  public validateMemorySettings(
    minMemory: number,
    maxMemory: number
  ): ValidationResult {
    const warnings: string[] = [];

    // 基本チェック
    if (minMemory < 512) {
      return ValidationResultHelper.failure(
        'Minimum memory must be at least 512MB'
      );
    }

    if (maxMemory < minMemory) {
      return ValidationResultHelper.failure(
        'Maximum memory must be greater than or equal to minimum memory'
      );
    }

    // システムメモリチェック
    const totalMemoryMB = os.totalmem() / (1024 * 1024);
    const freeMemoryMB = os.freemem() / (1024 * 1024);

    // 総メモリの80%超過チェック
    if (maxMemory > totalMemoryMB * 0.8) {
      warnings.push(
        `Maximum memory (${maxMemory}MB) is more than 80% of total system memory (${Math.round(totalMemoryMB)}MB)`
      );
    }

    // 利用可能メモリ超過チェック
    if (maxMemory > freeMemoryMB) {
      warnings.push(
        `Maximum memory (${maxMemory}MB) exceeds currently available memory (${Math.round(freeMemoryMB)}MB)`
      );
    }

    return warnings.length > 0
      ? ValidationResultHelper.warning(warnings)
      : ValidationResultHelper.success();
  }

  /**
   * JVM引数バリデーション
   */
  public validateJvmArguments(args: string[]): ValidationResult {
    // 現時点では警告のみ
    // 将来的に危険な引数をチェック可能

    return ValidationResultHelper.success();
  }
}

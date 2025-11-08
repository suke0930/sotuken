/**
 * Server Manager
 * 
 * Minecraftサーバー統合管理クラス
 * @version 1.0.0
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import pino, { Logger } from 'pino';
import type { JdkManager } from '../../../jdk-manager/src/lib/JdkManager';
import { ServerValidator } from './ServerValidator';
import { ServerPropertiesManager } from './ServerPropertiesManager';
import { ServerInstanceWrapper } from './ServerInstanceWrapper';
import {
  ServerInstance,
  ServerManagerConfig,
  ServerManagerConfigSchema,
  ServerStatus
} from '../types/server-schema';
import { ServerCallbacks, ProcessStdCallbacks, InstanceEvent } from '../types/callbacks';
import { AddInstanceParams, UpdateInstanceParams } from '../types/params';
import { VoidResult, AddInstanceResult } from '../types/result';
import { ServerManagerErrors, DefaultValues } from '../constants/errors';


/**
 * サーバーマネージャークラス
 */
export class ServerManager {
  private configPath: string;
  private serversBasePath: string;
  private logPath: string;
  private readonly jdkManager: JdkManager;
  private readonly callbacks?: ServerCallbacks;

  private config!: ServerManagerConfig;
  private logger!: Logger;
  private validator!: ServerValidator;

  private instances: Map<string, ServerInstanceWrapper> = new Map();
  private uptimeIntervals: Map<string, NodeJS.Timeout> = new Map();

  /**
   * プライベートコンストラクタ
   * static initialize()経由でのみ生成可能
   */
  private constructor(
    configPath: string,
    serversBasePath: string,
    logPath: string,
    jdkManager: JdkManager,
    callbacks?: ServerCallbacks
  ) {
    this.configPath = configPath;
    this.serversBasePath = serversBasePath;
    this.logPath = logPath;
    this.jdkManager = jdkManager;
    this.callbacks = callbacks;
  }

  /**
   * ServerManagerの初期化（静的ファクトリメソッド）
   */
  public static async initialize(
    configPath: string,
    serversBasePath: string,
    logPath: string,
    jdkManager: JdkManager,
    callbacks?: ServerCallbacks
  ): Promise<ServerManager> {
    const manager = new ServerManager(
      configPath,
      serversBasePath,
      logPath,
      jdkManager,
      callbacks
    );

    // ログディレクトリ作成
    const logDir = path.dirname(logPath);
    await fs.mkdir(logDir, { recursive: true });

    // Pinoロガー初期化
    manager.logger = pino({
      level: 'info',
      transport: {
        target: 'pino/file',
        options: { destination: logPath }
      }
    });

    // ServerValidator生成
    manager.validator = new ServerValidator(manager, jdkManager, manager.logger);

    // 設定ファイルの読み込みまたは作成
    if (require('fs').existsSync(manager.configPath)) {
      // 既存の設定ファイルを読み込み
      await manager.loadAndValidateConfig();
    } else {
      // 設定ファイルが存在しない場合は作成
      const configDir = path.dirname(manager.configPath);
      await fs.mkdir(configDir, { recursive: true });

      manager.config = manager.createDefaultConfig();
      await manager.saveConfig();
    }

    // Wrapper生成
    manager.createWrappers();

    manager.logger.info('ServerManager initialized', {
      configPath,
      serversBasePath,
      instanceCount: manager.instances.size
    });

    return manager;
  }

  /**
   * デフォルト設定を作成
   */
  private createDefaultConfig(): ServerManagerConfig {
    return {
      configVersion: DefaultValues.CONFIG_VERSION,
      instances: [],
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * 設定ファイルを読み込み＆検証
   */
  private async loadAndValidateConfig(): Promise<void> {
    try {
      const raw = await fs.readFile(this.configPath, 'utf-8');
      const parsed = JSON.parse(raw);

      // バージョンチェック（警告のみ）
      if (parsed.configVersion !== DefaultValues.CONFIG_VERSION) {
        this.logger.warn('Config version mismatch', {
          expected: DefaultValues.CONFIG_VERSION,
          actual: parsed.configVersion
        });
      }

      // Zodバリデーション
      this.config = ServerManagerConfigSchema.parse(parsed);

      this.logger.info('Configuration loaded', {
        version: this.config.configVersion,
        instances: this.config.instances.length
      });
    } catch (error) {
      this.logger.error('Failed to load configuration', error);
      throw new Error(`${ServerManagerErrors.CONFIG_LOAD_FAILED}: ${error}`);
    }
  }

  /**
   * 設定ファイルを保存
   */
  private async saveConfig(): Promise<void> {
    try {
      // lastUpdatedを自動更新
      this.config.lastUpdated = new Date().toISOString();

      const content = JSON.stringify(this.config, null, 2);
      await fs.writeFile(this.configPath, content, 'utf-8');

      this.logger.debug('Configuration saved', {
        path: this.configPath
      });
    } catch (error) {
      this.logger.error('Failed to save configuration', error);
      throw new Error(`${ServerManagerErrors.CONFIG_SAVE_FAILED}: ${error}`);
    }
  }

  /**
   * Wrapperを生成
   */
  private createWrappers(): void {
    for (const data of this.config.instances) {
      const wrapper = new ServerInstanceWrapper(
        data,
        this.serversBasePath,
        this.jdkManager,
        this.logger,
        (event) => this.handleInstanceEvent(event)
      );

      this.instances.set(data.uuid, wrapper);
    }
  }

  /**
   * インスタンスイベントハンドラー
   */
  private handleInstanceEvent(event: InstanceEvent): void {
    this.logger.info('Instance event', event);

    if (!this.callbacks) return;

    switch (event.type) {
      case 'started':
        this.callbacks.onServerStarted?.(event.uuid);
        break;
      case 'stopped':
        this.callbacks.onServerStopped?.(event.uuid, 0);
        break;
      case 'crashed':
        this.callbacks.onServerCrashed?.(event.uuid, new Error('Server crashed'));
        break;
      case 'autoRestarted': {
        const wrapper = this.instances.get(event.uuid);
        const count = wrapper?.getRuntimeState().consecutiveRestartCount || 0;
        this.callbacks.onAutoRestarted?.(event.uuid, count);
        break;
      }
      case 'autoRestartLimitReached':
        this.callbacks.onAutoRestartLimitReached?.(event.uuid);
        break;
      case 'stopTimeout':
        this.callbacks.onStopTimeout?.(event.uuid, 'Server did not stop within timeout');
        break;
      case 'forcedKill':
        this.callbacks.onForcedKill?.(event.uuid);
        break;
    }
  }

  /**
   * インスタンスを追加
   */
  public async addInstance(params: AddInstanceParams): Promise<AddInstanceResult> {
    this.logger.info('Adding instance', params);

    // バリデーション
    const validation = await this.validator.validateAddInstance(params);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // 警告ログ
    if (validation.warnings && validation.warnings.length > 0) {
      validation.warnings.forEach(warning => {
        this.logger.warn(warning);
      });
    }

    const uuid = uuidv4();
    const port = params.port || DefaultValues.PORT;
    const maxMemory = params.maxMemory || DefaultValues.MAX_MEMORY;
    const minMemory = params.minMemory || DefaultValues.MIN_MEMORY;

    const serverDir = path.join(this.serversBasePath, params.name);

    try {
      // ディレクトリ作成
      await fs.mkdir(serverDir, { recursive: true });
      this.logger.info(`Created directory: ${serverDir}`);

      // jarファイルをコピー
      const jarPath = path.join(serverDir, 'server.jar');
      await fs.copyFile(params.serverBinaryFilePath, jarPath);
      this.logger.info(`Copied jar: ${params.serverBinaryFilePath} -> ${jarPath}`);

      // eula.txt作成
      const eulaPath = path.join(serverDir, 'eula.txt');
      await fs.writeFile(eulaPath, 'eula=true\n', 'utf-8');
      this.logger.info(`Created eula.txt: ${eulaPath}`);

      // server.properties作成
      const propManager = new ServerPropertiesManager(
        path.join(serverDir, 'server.properties'),
        this.logger
      );

      try {
        await propManager.create({
          'server-port': port.toString()
        });
      } catch (error) {
        this.logger.error('Failed to create server.properties', error);

        // ロールバック: ディレクトリごと削除
        await fs.rm(serverDir, { recursive: true, force: true });

        return {
          success: false,
          error: 'Failed to create server.properties'
        };
      }

      // ServerInstanceデータ作成
      const now = new Date().toISOString();
      const instanceData: ServerInstance = {
        uuid,
        name: params.name,
        note: params.note,
        status: 'stopped',
        software: params.software,
        launchConfig: {
          jarPath,
          port,
          jdkVersion: params.jdkVersion,
          maxMemory,
          minMemory,
          jvmArguments: DefaultValues.JVM_ARGUMENTS,
          serverArguments: DefaultValues.SERVER_ARGUMENTS
        },
        metadata: {
          createdAt: now,
          updatedAt: now,
          lastStartedAt: null,
          totalUptime: 0
        },
        autoRestart: {
          enabled: DefaultValues.AUTO_RESTART_ENABLED,
          maxConsecutiveRestarts: DefaultValues.AUTO_RESTART_MAX_CONSECUTIVE,
          resetThresholdSeconds: DefaultValues.AUTO_RESTART_RESET_THRESHOLD
        }
      };

      // 設定に追加
      this.config.instances.push(instanceData);
      await this.saveConfig();

      // Wrapper生成
      const wrapper = new ServerInstanceWrapper(
        instanceData,
        this.serversBasePath,
        this.jdkManager,
        this.logger,
        (event) => this.handleInstanceEvent(event)
      );
      this.instances.set(uuid, wrapper);

      this.logger.info('Instance added successfully', { uuid, name: params.name });

      return { success: true, uuid };

    } catch (error) {
      this.logger.error('Failed to add instance', error);
      return {
        success: false,
        error: `Failed to add instance: ${error}`
      };
    }
  }

  /**
   * インスタンスを削除
   */
  public async removeInstance(uuid: string): Promise<VoidResult> {
    const wrapper = this.instances.get(uuid);
    if (!wrapper) {
      return { success: false, error: ServerManagerErrors.INSTANCE_NOT_FOUND };
    }

    if (wrapper.isRunning()) {
      return { success: false, error: ServerManagerErrors.INSTANCE_RUNNING };
    }

    const serverDir = path.join(this.serversBasePath, wrapper.getData().name);

    // ディレクトリ削除を先に実行
    try {
      await fs.rm(serverDir, { recursive: true, force: true });
      this.logger.info(`Deleted directory: ${serverDir}`);
    } catch (error) {
      this.logger.error(`Failed to delete directory: ${serverDir}`, error);
      return {
        success: false,
        error: `${ServerManagerErrors.DIRECTORY_DELETE_FAILED}: ${error}`
      };
    }

    // ディレクトリ削除成功後にのみレジストリ更新
    this.instances.delete(uuid);
    this.uptimeIntervals.delete(uuid);

    // 設定から削除
    this.config.instances = this.config.instances.filter(inst => inst.uuid !== uuid);
    await this.saveConfig();

    this.logger.info('Instance removed successfully', { uuid });

    return { success: true, data: undefined };
  }

  /**
   * インスタンスを更新
   */
  public async updateInstance(params: UpdateInstanceParams): Promise<VoidResult> {
    const wrapper = this.instances.get(params.uuid);
    if (!wrapper) {
      return { success: false, error: ServerManagerErrors.INSTANCE_NOT_FOUND };
    }

    const data = wrapper.getData();

    // noteのみの更新チェック
    const updateKeys = Object.keys(params.updates);
    const isNoteOnly = updateKeys.length === 1 && updateKeys[0] === 'note';

    // noteのみの更新以外は、起動中は不可
    if (!isNoteOnly && wrapper.isRunning()) {
      return { success: false, error: ServerManagerErrors.INSTANCE_RUNNING };
    }

    // バリデーション
    const validation = await this.validator.validateUpdateInstance(params);
    if (!validation.valid) {
      return { success: false, error: validation.error || 'Validation failed' };
    }

    // 警告ログ
    if (validation.warnings && validation.warnings.length > 0) {
      validation.warnings.forEach(warning => {
        this.logger.warn(warning);
      });
    }

    let currentName = data.name;

    try {
      // name変更（ディレクトリもリネーム）
      if (params.updates.name !== undefined) {
        const oldDir = path.join(this.serversBasePath, currentName);
        const newDir = path.join(this.serversBasePath, params.updates.name);

        await fs.rename(oldDir, newDir);
        this.logger.info(`Renamed directory: ${oldDir} -> ${newDir}`);

        currentName = params.updates.name;
        data.name = params.updates.name;

        // jarPathも更新
        data.launchConfig.jarPath = path.join(newDir, 'server.jar');
      }

      // port変更（server.propertiesも更新）
      if (params.updates.port !== undefined) {
        const serverDir = path.join(this.serversBasePath, currentName);
        const propManager = new ServerPropertiesManager(
          path.join(serverDir, 'server.properties'),
          this.logger
        );

        try {
          await propManager.updatePort(params.updates.port);
          this.logger.info(`Updated port to ${params.updates.port}`);
        } catch (error) {
          this.logger.warn('Failed to update server.properties', error);
          this.logger.warn('Port updated in registry, but server.properties update failed');
        }

        data.launchConfig.port = params.updates.port;
      }

      // その他の更新
      if (params.updates.note !== undefined) {
        data.note = params.updates.note;
      }
      if (params.updates.maxMemory !== undefined) {
        data.launchConfig.maxMemory = params.updates.maxMemory;
      }
      if (params.updates.minMemory !== undefined) {
        data.launchConfig.minMemory = params.updates.minMemory;
      }
      if (params.updates.jvmArguments !== undefined) {
        data.launchConfig.jvmArguments = params.updates.jvmArguments;
      }
      if (params.updates.serverArguments !== undefined) {
        data.launchConfig.serverArguments = params.updates.serverArguments;
      }
      if (params.updates.autoRestart !== undefined) {
        data.autoRestart = params.updates.autoRestart;
      }

      // Wrapperのデータを更新
      wrapper.updateData(data);

      // 設定を保存
      const configIndex = this.config.instances.findIndex(inst => inst.uuid === params.uuid);
      if (configIndex !== -1) {
        this.config.instances[configIndex] = data;
      }
      await this.saveConfig();

      this.logger.info('Instance updated successfully', { uuid: params.uuid });

      return { success: true, data: undefined };

    } catch (error) {
      this.logger.error('Failed to update instance', error);
      return {
        success: false,
        error: `Failed to update instance: ${error}`
      };
    }
  }

  /**
   * サーバーを起動
   */
  public async startServer(uuid: string): Promise<VoidResult> {
    const wrapper = this.instances.get(uuid);
    if (!wrapper) {
      return { success: false, error: ServerManagerErrors.INSTANCE_NOT_FOUND };
    }

    // バリデーション
    const validation = this.validator.validateServerStart(uuid);
    if (!validation.valid) {
      return { success: false, error: validation.error || 'Validation failed' };
    }

    try {
      await wrapper.start();

      // 稼働時間追跡開始
      this.startUptimeTracking(uuid);

      return { success: true, data: undefined };
    } catch (error) {
      this.logger.error('Failed to start server', error);
      return {
        success: false,
        error: `${ServerManagerErrors.PROCESS_START_FAILED}: ${error}`
      };
    }
  }

  /**
   * サーバーを停止
   */
  public async stopServer(uuid: string, timeout: number = DefaultValues.DEFAULT_STOP_TIMEOUT): Promise<VoidResult> {
    const wrapper = this.instances.get(uuid);
    if (!wrapper) {
      return { success: false, error: ServerManagerErrors.INSTANCE_NOT_FOUND };
    }

    if (!wrapper.isRunning()) {
      return { success: false, error: ServerManagerErrors.INSTANCE_NOT_RUNNING };
    }

    try {
      await wrapper.stop(timeout);

      // 稼働時間追跡停止
      await this.stopUptimeTracking(uuid);

      // タイムアウトしても success: true を返す
      return { success: true, data: undefined };
    } catch (error) {
      this.logger.error('Failed to stop server', error);
      return {
        success: false,
        error: `Failed to stop server: ${error}`
      };
    }
  }

  /**
   * サーバーを再起動
   */
  public async restartServer(uuid: string, timeout: number = DefaultValues.DEFAULT_STOP_TIMEOUT): Promise<VoidResult> {
    const wrapper = this.instances.get(uuid);
    if (!wrapper) {
      return { success: false, error: ServerManagerErrors.INSTANCE_NOT_FOUND };
    }

    try {
      await wrapper.restart(timeout);
      return { success: true, data: undefined };
    } catch (error) {
      this.logger.error('Failed to restart server', error);
      return {
        success: false,
        error: `Failed to restart server: ${error}`
      };
    }
  }

  /**
   * サーバーを強制終了
   */
  public forceKillServer(uuid: string): void {
    const wrapper = this.instances.get(uuid);
    if (!wrapper) {
      this.logger.warn('Instance not found for force kill', { uuid });
      return;
    }

    wrapper.forceKill();
    this.logger.info('Force kill requested', { uuid });
  }

  /**
   * コマンドを送信
   */
  public sendCommand(uuid: string, command: string): void {
    const wrapper = this.instances.get(uuid);
    if (!wrapper) {
      this.logger.warn('Instance not found for command', { uuid });
      return;
    }

    wrapper.sendCommand(command);
  }

  /**
   * 標準入出力を監視開始
   */
  public openProcessStd(uuid: string, callbacks: ProcessStdCallbacks): void {
    const wrapper = this.instances.get(uuid);
    if (!wrapper) {
      this.logger.warn('Instance not found for process std', { uuid });
      return;
    }

    if (callbacks.onStdout) {
      wrapper.on('stdout', callbacks.onStdout);
    }
    if (callbacks.onStderr) {
      wrapper.on('stderr', callbacks.onStderr);
    }
  }

  /**
   * 標準入出力の監視を停止
   */
  public closeProcessStd(uuid: string, callbacks: ProcessStdCallbacks): void {
    const wrapper = this.instances.get(uuid);
    if (!wrapper) {
      return;
    }

    if (callbacks.onStdout) {
      wrapper.off('stdout', callbacks.onStdout);
    }
    if (callbacks.onStderr) {
      wrapper.off('stderr', callbacks.onStderr);
    }
  }

  /**
   * インスタンスを取得（内部使用）
   */
  public getInstance(uuid: string): ServerInstanceWrapper | undefined {
    return this.instances.get(uuid);
  }

  /**
   * インスタンスデータを取得
   */
  public getInstanceData(uuid: string): ServerInstance | undefined {
    const wrapper = this.instances.get(uuid);
    return wrapper?.getData();
  }

  /**
   * 全インスタンスデータを取得
   */
  public getAllInstances(): ServerInstance[] {
    return Array.from(this.instances.values()).map(wrapper => wrapper.getData());
  }

  /**
   * 名前でインスタンスを取得
   */
  public getInstanceByName(name: string): ServerInstance | undefined {
    for (const wrapper of this.instances.values()) {
      const data = wrapper.getData();
      if (data.name === name) {
        return data;
      }
    }
    return undefined;
  }

  /**
   * 稼働中インスタンスを取得
   */
  public getRunningInstances(): ServerInstance[] {
    return this.getAllInstances().filter(inst => inst.status === 'running');
  }

  /**
   * Validatorを取得
   */
  public getValidator(): ServerValidator {
    return this.validator;
  }

  /**
   * ServerPropertiesManagerを取得（使い捨てインスタンス）
   */
  public getServerPropertiesManager(uuid: string): ServerPropertiesManager | undefined {
    const wrapper = this.instances.get(uuid);
    if (!wrapper) return undefined;

    const serverDir = path.join(this.serversBasePath, wrapper.getData().name);
    const filePath = path.join(serverDir, 'server.properties');

    return new ServerPropertiesManager(filePath, this.logger);
  }

  /**
   * 稼働時間追跡を開始
   */
  private startUptimeTracking(uuid: string): void {
    // 既存のタイマーをクリア
    const existingTimer = this.uptimeIntervals.get(uuid);
    if (existingTimer) {
      clearInterval(existingTimer);
    }

    const timer = setInterval(() => {
      this.updateUptime(uuid);
    }, DefaultValues.UPTIME_UPDATE_INTERVAL);

    this.uptimeIntervals.set(uuid, timer);
  }

  /**
   * 稼働時間追跡を停止
   */
  private async stopUptimeTracking(uuid: string): Promise<void> {
    // タイマークリア
    const timer = this.uptimeIntervals.get(uuid);
    if (timer) {
      clearInterval(timer);
      this.uptimeIntervals.delete(uuid);
    }

    // 最終更新（即座に実行）
    this.updateUptime(uuid);

    // 設定保存
    await this.saveConfig();
  }

  /**
   * 稼働時間を更新
   */
  private updateUptime(uuid: string): void {
    const wrapper = this.instances.get(uuid);
    if (!wrapper || !wrapper.isRunning()) {
      return;
    }

    const runtimeState = wrapper.getRuntimeState();

    if (runtimeState.currentSessionStartTime) {
      const sessionUptime = Date.now() - runtimeState.currentSessionStartTime;
      const sessionUptimeSeconds = Math.floor(sessionUptime / 1000);

      const data = wrapper.getData();
      data.metadata.totalUptime += sessionUptimeSeconds;

      wrapper.updateData({ metadata: data.metadata });

      // セッション開始時刻を更新（次回計算用）
      runtimeState.currentSessionStartTime = Date.now();

      // 設定を更新
      const configIndex = this.config.instances.findIndex(inst => inst.uuid === uuid);
      if (configIndex !== -1) {
        this.config.instances[configIndex] = data;
      }
    }
  }

  /**
   * リソースを解放（テスト用）
   * ロガーのストリームをクローズし、全てのインターバルをクリア
   */
  public async dispose(): Promise<void> {
    // 全ての稼働時間追跡を停止
    for (const [uuid] of this.instances) {
      await this.stopUptimeTracking(uuid);
    }

    // Pinoロガーのストリームをフラッシュしてクローズ
    const logger = this.logger as any;
    if (logger) {
      // フラッシュ
      if (typeof logger.flush === 'function') {
        await new Promise<void>((resolve) => {
          logger.flush(() => {
            resolve();
          });
        });
      }

      // 子プロセス（transport worker）を終了
      const stream = logger[Symbol.for('pino.stream')];
      if (stream && typeof stream.end === 'function') {
        await new Promise<void>((resolve) => {
          stream.end(() => {
            resolve();
          });
        });
      }

      // thread-stream の場合は flushSync と end を呼ぶ
      if (stream && typeof stream.flushSync === 'function') {
        stream.flushSync();
      }
    }
  }
}

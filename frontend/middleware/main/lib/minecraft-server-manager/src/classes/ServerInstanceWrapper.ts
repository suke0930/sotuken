/**
 * Server Instance Wrapper
 * 
 * 個別サーバーインスタンス管理クラス
 * @version 1.0.0
 */

import * as path from 'path';
import { EventEmitter } from 'events';
import type { Logger } from 'pino';
import type { JdkManager } from '../../../jdk-manager/src/lib/JdkManager';
import type { JDKEntry } from '../../../jdk-manager/src/lib/JDKEntry';
import { ProcessExecutor } from './ProcessExecutor';
import { ServerInstance, RuntimeState } from '../types/server-schema';
import { NotifyFunction, InstanceEvent } from '../types/callbacks';
import { ServerManagerErrors } from '../constants/errors';

/**
 * サーバーインスタンスラッパークラス
 * EventEmitterを継承（標準入出力イベント用）
 */
export class ServerInstanceWrapper extends EventEmitter {
  private data: ServerInstance;
  private serversBasePath: string;
  private jdkManager: JdkManager;
  private logger: Logger;
  private notify: NotifyFunction;
  
  private process: ProcessExecutor | null = null;
  private jdkLockId: string | null = null;
  private jdkEntry: JDKEntry | null = null;
  
  // ランタイム状態（非永続）
  private runtimeState: RuntimeState = {
    consecutiveRestartCount: 0,
    lastRestartTime: null,
    resetTimerId: null,
    currentSessionStartTime: null
  };

  constructor(
    data: ServerInstance,
    serversBasePath: string,
    jdkManager: JdkManager,
    logger: Logger,
    notify: NotifyFunction
  ) {
    super();
    this.data = data;
    this.serversBasePath = serversBasePath;
    this.jdkManager = jdkManager;
    this.logger = logger;
    this.notify = notify;
  }

  /**
   * サーバーを起動
   */
  public async start(): Promise<void> {
    if (this.isRunning()) {
      throw new Error(ServerManagerErrors.INSTANCE_RUNNING);
    }

    this.logger.info('Starting server', {
      uuid: this.data.uuid,
      name: this.data.name
    });

    try {
      // JDK取得
      const jdkResult = this.jdkManager.Entrys.getByVersion(this.data.launchConfig.jdkVersion);
      if (!jdkResult.success) {
        throw new Error(`${ServerManagerErrors.JDK_NOT_FOUND}: ${jdkResult.error}`);
      }

      const jdkEntry = jdkResult.data;
      this.jdkEntry = jdkEntry;

      // JDKロック取得
      this.jdkLockId = jdkEntry.useRuntime(`Minecraft Server: ${this.data.name}`);

      // プロセス実行
      await this.executeStart(jdkEntry);

      // リセットタイマー開始（executeStart()直後）
      this.startResetTimer();

      // ステータス更新
      this.data.status = 'running';
      this.data.metadata.lastStartedAt = new Date().toISOString();
      this.data.metadata.updatedAt = new Date().toISOString();
      this.runtimeState.currentSessionStartTime = Date.now();

      // イベント報告
      this.reportEvent('started');

    } catch (error) {
      // エラー時はJDKロック解放
      this.releaseJdkLock();
      this.logger.error('Failed to start server', error);
      throw error;
    }
  }

  /**
   * プロセスを実行
   */
  private async executeStart(jdkEntry: JDKEntry): Promise<void> {
    const javaPath = jdkEntry.getExecutableFilePath();
    const jarPath = this.data.launchConfig.jarPath;
    const workingDir = this.getWorkingDirectory();

    // JVM引数の構築
    const args: string[] = [
      `-Xmx${this.data.launchConfig.maxMemory}M`,
      `-Xms${this.data.launchConfig.minMemory}M`,
      ...this.data.launchConfig.jvmArguments,
      ...this.data.launchConfig.serverArguments
    ];

    // ProcessExecutor生成
    this.process = new ProcessExecutor(this.logger, workingDir);

    // コールバック設定
    this.process.setCallbacks({
      onStdout: (line) => this.emit('stdout', line),
      onStderr: (line) => this.emit('stderr', line),
      onExit: (exitCode) => this.handleProcessExit(exitCode),
      onError: (error) => this.handleProcessError(error),
      onStopTimeout: () => this.handleStopTimeout()
    });

    // プロセス起動
    await this.process.start(javaPath, jarPath, args);
  }

  /**
   * サーバーを停止
   */
  public async stop(timeout: number = 30000): Promise<void> {
    if (!this.isRunning()) {
      this.logger.warn('Server is not running', {
        uuid: this.data.uuid,
        name: this.data.name
      });
      return;
    }

    this.logger.info('Stopping server', {
      uuid: this.data.uuid,
      name: this.data.name,
      timeout
    });

    await this.executeStop(timeout);
  }

  /**
   * プロセスを停止
   */
  private async executeStop(timeout: number): Promise<void> {
    if (!this.process) {
      return;
    }

    const stopped = await this.process.stop(timeout);

    if (!stopped) {
      // タイムアウト（イベントは既に発火済み）
      this.logger.warn(`Server stop timed out: ${this.data.name}`);
      // ⚠️ プロセスはまだ実行中
      // ⚠️ forceKill()はユーザーが明示的に呼び出す必要がある
    } else {
      // 正常停止
      // ✅ プロセスは終了済み
      // ✅ cleanup()は onExit コールバックで自動実行される
    }
  }

  /**
   * サーバーを再起動
   */
  public async restart(timeout: number = 30000): Promise<void> {
    this.logger.info('Restarting server', {
      uuid: this.data.uuid,
      name: this.data.name
    });

    if (this.isRunning()) {
      await this.stop(timeout);
      
      // 停止完了を待機（最大5秒）
      await this.waitForStop(5000);
    }

    await this.start();
  }

  /**
   * 停止完了を待機
   */
  private async waitForStop(timeout: number): Promise<void> {
    const startTime = Date.now();
    
    while (this.isRunning() && (Date.now() - startTime) < timeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * サーバーを強制終了
   */
  public forceKill(): void {
    this.logger.warn('Force killing server', {
      uuid: this.data.uuid,
      name: this.data.name
    });

    if (this.process) {
      this.process.kill();
    }

    // 強制終了イベント
    this.reportEvent('forcedKill');
  }

  /**
   * コマンドを送信
   */
  public sendCommand(command: string): void {
    if (!this.process) {
      this.logger.warn('Cannot send command: server not running');
      return;
    }

    this.process.sendCommand(command);
  }

  /**
   * データを取得（ディープコピー）
   */
  public getData(): ServerInstance {
    return JSON.parse(JSON.stringify(this.data));
  }

  /**
   * データを更新
   */
  public updateData(updates: Partial<ServerInstance>): void {
    // 更新を適用
    Object.assign(this.data, updates);
    
    // updatedAtを自動更新
    this.data.metadata.updatedAt = new Date().toISOString();
  }

  /**
   * ステータスを取得
   */
  public getStatus(): string {
    return this.data.status;
  }

  /**
   * 実行中か確認
   */
  public isRunning(): boolean {
    return this.data.status === 'running';
  }

  /**
   * ランタイム状態を取得（内部使用専用）
   */
  public getRuntimeState(): RuntimeState {
    return this.runtimeState;
  }

  /**
   * 作業ディレクトリを取得
   */
  private getWorkingDirectory(): string {
    return path.join(this.serversBasePath, this.data.name);
  }

  /**
   * プロセス終了ハンドラー
   */
  private handleProcessExit(exitCode: number | null): void {
    this.logger.info('Server process exited', {
      uuid: this.data.uuid,
      name: this.data.name,
      exitCode
    });

    if (exitCode === 0) {
      // 正常終了
      this.data.status = 'stopped';
      this.cleanup();
      this.reportEvent('stopped');
    } else {
      // クラッシュ
      this.data.status = 'crashed';
      this.cleanup();
      
      // ✅ クラッシュは常に通知（自動再起動の有無に関わらず）
      this.reportEvent('crashed');
      
      // 自動再起動判定
      if (this.data.autoRestart.enabled) {
        this.attemptAutoRestart();
      }
    }
  }

  /**
   * プロセスエラーハンドラー
   */
  private handleProcessError(error: Error): void {
    this.logger.error('Server process error', {
      uuid: this.data.uuid,
      name: this.data.name,
      error
    });

    this.data.status = 'crashed';
    this.cleanup();
    this.reportEvent('crashed');
  }

  /**
   * 停止タイムアウトハンドラー
   */
  private handleStopTimeout(): void {
    this.reportEvent('stopTimeout');
  }

  /**
   * 自動再起動を試みる
   */
  private async attemptAutoRestart(): Promise<void> {
    this.runtimeState.consecutiveRestartCount++;
    this.runtimeState.lastRestartTime = Date.now();

    this.logger.info('Attempting auto restart', {
      uuid: this.data.uuid,
      name: this.data.name,
      count: this.runtimeState.consecutiveRestartCount,
      limit: this.data.autoRestart.maxConsecutiveRestarts
    });

    // 上限チェック
    if (this.runtimeState.consecutiveRestartCount > this.data.autoRestart.maxConsecutiveRestarts) {
      this.logger.warn('Auto restart limit reached', {
        uuid: this.data.uuid,
        name: this.data.name
      });
      this.reportEvent('autoRestartLimitReached');
      return;
    }

    // 再起動実行
    try {
      await this.start();
      // ✅ 自動再起動成功を通知
      this.reportEvent('autoRestarted');
    } catch (error) {
      this.logger.error('Auto restart failed', error);
      // 再起動失敗はcrashedイベントとして扱う
      // （既にクラッシュは通知済みだが、再起動失敗も重要な情報）
    }
  }

  /**
   * リセットタイマーを開始
   */
  private startResetTimer(): void {
    this.clearResetTimer();

    const { resetThresholdSeconds } = this.data.autoRestart;

    // 起動から指定時間後にリセット
    this.runtimeState.resetTimerId = setTimeout(() => {
      this.logger.info('Resetting restart counter', {
        uuid: this.data.uuid,
        name: this.data.name,
        previousCount: this.runtimeState.consecutiveRestartCount
      });
      this.resetRestartCounter();
    }, resetThresholdSeconds * 1000);
  }

  /**
   * リセットタイマーをクリア
   */
  private clearResetTimer(): void {
    if (this.runtimeState.resetTimerId) {
      clearTimeout(this.runtimeState.resetTimerId);
      this.runtimeState.resetTimerId = null;
    }
  }

  /**
   * 再起動カウンターをリセット
   */
  private resetRestartCounter(): void {
    this.runtimeState.consecutiveRestartCount = 0;
    this.runtimeState.lastRestartTime = null;
  }

  /**
   * JDKロックを解放
   */
  private releaseJdkLock(): void {
    if (this.jdkLockId && this.jdkEntry) {
      const result = this.jdkEntry.unUseRuntime(this.jdkLockId);
      if (!result.success) {
        this.logger.error('Failed to release JDK lock', {
          lockId: this.jdkLockId,
          error: result.error
        });
      }
      this.jdkLockId = null;
      this.jdkEntry = null;
    }
  }

  /**
   * クリーンアップ処理
   */
  private cleanup(): void {
    // JDKロック解放
    this.releaseJdkLock();

    // リセットタイマークリア
    this.clearResetTimer();

    // ProcessExecutor破棄
    this.process = null;

    // セッション時刻クリア
    this.runtimeState.currentSessionStartTime = null;
  }

  /**
   * イベントを報告
   */
  private reportEvent(type: InstanceEvent['type']): void {
    const event: InstanceEvent = {
      type,
      uuid: this.data.uuid,
      timestamp: Date.now()
    };

    this.notify(event);
  }
}

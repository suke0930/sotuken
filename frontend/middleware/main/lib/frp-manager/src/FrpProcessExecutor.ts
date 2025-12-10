/**
 * FRP Process Executor
 *
 * frpcプロセス実行・管理クラス
 * minecraft-server-managerのProcessExecutorパターンを踏襲
 */
import { spawn, ChildProcess } from "child_process";
import { createModuleLogger } from "../../logger";
import type { Logger } from "pino";

/**
 * プロセス実行コールバック
 */
interface FrpProcessExecutorCallbacks {
  onStdout?: (line: string) => void;
  onStderr?: (line: string) => void;
  onExit?: (exitCode: number | null) => void;
  onError?: (error: Error) => void;
  onStopTimeout?: () => void;
}

/**
 * FRP Process Executor クラス
 */
export class FrpProcessExecutor {
  private process: ChildProcess | null = null;
  private isRunningFlag: boolean = false;
  private logger: Logger;

  // コールバック
  private onStdout?: (line: string) => void;
  private onStderr?: (line: string) => void;
  private onExit?: (exitCode: number | null) => void;
  private onError?: (error: Error) => void;
  private onStopTimeout?: () => void;

  constructor() {
    this.logger = createModuleLogger("frp-process-executor");
  }

  /**
   * コールバックを設定
   */
  public setCallbacks(callbacks: FrpProcessExecutorCallbacks): void {
    this.onStdout = callbacks.onStdout;
    this.onStderr = callbacks.onStderr;
    this.onExit = callbacks.onExit;
    this.onError = callbacks.onError;
    this.onStopTimeout = callbacks.onStopTimeout;
  }

  /**
   * frpcプロセスを起動
   *
   * @param binaryPath - frpc実行ファイルパス
   * @param configPath - 設定ファイルパス
   */
  public async start(binaryPath: string, configPath: string): Promise<void> {
    if (this.isRunningFlag) {
      throw new Error("Process is already running");
    }

    this.logger.info(
      { binaryPath, configPath },
      "Starting frpc process"
    );

    try {
      // frpcプロセス起動
      this.process = spawn(binaryPath, ["-c", configPath]);

      // PIDの存在確認（起動失敗の即座の検出）
      if (!this.process.pid) {
        throw new Error("Failed to start process: no PID assigned");
      }

      this.isRunningFlag = true;
      this.logger.info({ pid: this.process.pid }, "Process started");

      // 標準入出力のセットアップ
      this.setupOutputHandlers();

      // イベント監視開始
      this.setupEventHandlers();
    } catch (error) {
      this.logger.error({ err: error }, "Failed to spawn process");
      throw error;
    }
  }

  private setupOutputHandlers(): void {
    if (!this.process || !this.process.stdout || !this.process.stderr) {
      return;
    }

    // stdout処理
    this.process.stdout.on("data", (chunk: Buffer) => {
      if (this.onStdout) {
        this.onStdout(chunk.toString());
      }
    });

    // stderr処理
    this.process.stderr.on("data", (chunk: Buffer) => {
      if (this.onStderr) {
        this.onStderr(chunk.toString());
      }
    });
  }

  /**
   * イベントハンドラーをセットアップ
   */
  private setupEventHandlers(): void {
    if (!this.process) return;

    // 終了イベント
    this.process.on("exit", (code: number | null) => {
      this.logger.info({ exitCode: code }, "Process exited");

      if (this.onExit) {
        this.onExit(code);
      }

      this.cleanup();
    });

    // エラーイベント
    this.process.on("error", (error: Error) => {
      this.logger.error({ err: error }, "Process error");

      if (this.onError) {
        this.onError(error);
      }

      this.cleanup();
    });
  }

  /**
   * プロセスを停止
   *
   * @param timeout - タイムアウト時間（ミリ秒）
   * @returns 正常に停止できた場合true、タイムアウトした場合false
   */
  public async stop(timeout: number = 30000): Promise<boolean> {
    if (!this.isRunningFlag || !this.process) {
      this.logger.warn("Process is not running");
      return true; // 既に停止している
    }

    this.logger.info({ timeout }, "Stopping process");

    // SIGTERM送信
    try {
      this.process.kill("SIGTERM");
    } catch (error: any) {
      this.logger.error({ err: error }, "Failed to send SIGTERM");
      return true; // 既に終了している
    }

    // 終了待機
    const terminated = await this.waitForExit(timeout);

    if (terminated) {
      this.logger.info("Process stopped gracefully");
      return true;
    } else {
      this.logger.warn("Process did not stop within timeout");

      if (this.onStopTimeout) {
        this.onStopTimeout();
      }

      // SIGKILL送信
      try {
        this.process.kill("SIGKILL");
      } catch (error: any) {
        this.logger.error({ err: error }, "Failed to send SIGKILL");
      }

      // SIGKILL後の待機
      const killedTerminated = await this.waitForExit(5000);
      return killedTerminated;
    }
  }

  private async waitForExit(timeout: number): Promise<boolean> {
    if (!this.process) {
      return true;
    }

    return new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => {
        resolve(false);
      }, timeout);

      this.process!.once("exit", () => {
        clearTimeout(timer);
        resolve(true);
      });
    });
  }

  /**
   * プロセスを強制終了
   */
  public kill(): void {
    if (!this.process) {
      this.logger.warn("No process to kill");
      return;
    }

    this.logger.warn({ pid: this.process.pid }, "Force killing process");

    try {
      this.process.kill("SIGKILL");
    } catch (error) {
      this.logger.error({ err: error }, "Failed to kill process");
    }
  }

  /**
   * プロセスが実行中かどうか
   */
  public isRunning(): boolean {
    return this.isRunningFlag;
  }

  /**
   * プロセスIDを取得
   */
  public getPid(): number | undefined {
    return this.process?.pid;
  }

  /**
   * クリーンアップ処理
   */
  private cleanup(): void {
    // stdin終了
    if (this.process && this.process.stdin) {
      try {
        this.process.stdin.end();
      } catch (error) {
        // 無視
      }
    }

    // リスナー削除
    if (this.process) {
      this.process.removeAllListeners();
    }

    this.isRunningFlag = false;
    this.process = null;
  }
}

/**
 * Process Executor
 * 
 * プロセス実行・管理クラス（完全独立）
 * ServerManager/Wrapperの概念に依存しない汎用的なプロセス実行クラス
 * @version 1.0.0
 */
import iconv from 'iconv-lite';
import { spawn, ChildProcess } from 'child_process';
import { createInterface, Interface as ReadlineInterface } from 'readline';
import type { Logger } from 'pino';
import { ControlCharacter } from '../types/control-character';

/**
 * プロセス実行コールバック
 */
interface ProcessExecutorCallbacks {
  onStdout?: (line: string) => void;
  onStderr?: (line: string) => void;
  onExit?: (exitCode: number | null) => void;
  onError?: (error: Error) => void;
  onStopTimeout?: () => void;
}

/**
 * プロセス実行クラス
 */
export class ProcessExecutor {
  private process: ChildProcess | null = null;
  private isRunningFlag: boolean = false;
  private logger: Logger;
  private workingDir: string;
  private stdoutReader: ReadlineInterface | null = null;
  private stderrReader: ReadlineInterface | null = null;

  // コールバック
  private onStdout?: (line: string) => void;
  private onStderr?: (line: string) => void;
  private onExit?: (exitCode: number | null) => void;
  private onError?: (error: Error) => void;
  private onStopTimeout?: () => void;

  constructor(logger: Logger, workingDir: string) {
    this.logger = logger;
    this.workingDir = workingDir;
  }

  /**
   * コールバックを設定
   */
  public setCallbacks(callbacks: ProcessExecutorCallbacks): void {
    this.onStdout = callbacks.onStdout;
    this.onStderr = callbacks.onStderr;
    this.onExit = callbacks.onExit;
    this.onError = callbacks.onError;
    this.onStopTimeout = callbacks.onStopTimeout;
  }

  /**
   * プロセスを起動
   * 
   * @param javaPath - Javaの実行ファイルパス（例: /path/to/java.exe）
   * @param jarPath - サーバーjarファイルパス
   * @param args - JVMおよびサーバー引数
   */
  public async start(
    javaPath: string,
    jarPath: string,
    args: string[]
  ): Promise<void> {
    if (this.isRunningFlag) {
      throw new Error('Process is already running');
    }

    // 引数の構築
    const args2 = args.filter(arg => arg !== '');
    const processArgs = [...args2, '-jar', jarPath, "--nogui"];//NOGUI埋め込み

    this.logger.info({
      javaPath,
      jarPath,
      args: processArgs,
      workingDir: this.workingDir
    }, 'Starting process');

    try {
      // プロセス起動
      console.log(jarPath);
      console.log(processArgs);
      this.process = spawn(javaPath, processArgs, {
        cwd: this.workingDir,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // PIDの存在確認（起動失敗の即座の検出）
      if (!this.process.pid) {
        throw new Error('Failed to start process: no PID assigned');
      }

      this.isRunningFlag = true;
      this.logger.info({ pid: this.process.pid }, 'Process started');

      // 標準入出力のセットアップ
      this.setupOutputHandlers();

      // イベント監視開始
      this.setupEventHandlers();

    } catch (error) {
      this.logger.error({ err: error }, 'Failed to spawn process');
      throw error;
    }
  }

  private setupOutputHandlers(): void {
    if (!this.process || !this.process.stdout || !this.process.stderr) {
      return;
    }

    // --- stdout ---
    let stdoutBuffer = Buffer.alloc(0);
    this.process.stdout.on('data', (chunk: Buffer) => {
      stdoutBuffer = Buffer.concat([stdoutBuffer, chunk]);

      // 改行ごとに分割（Shift-JIS対応）
      let lines = iconv.decode(stdoutBuffer, 'shift_jis').split(/\r?\n/);
      // 最後が改行で終わっていない場合は残しておく
      if (!stdoutBuffer.toString().endsWith('\n')) {
        stdoutBuffer = Buffer.from(lines.pop() ?? '', 'utf8');
      } else {
        stdoutBuffer = Buffer.alloc(0);
      }

      for (const line of lines) {
        if (this.onStdout) this.onStdout(line);
      }
    });

    // --- stderr ---
    let stderrBuffer = Buffer.alloc(0);
    this.process.stderr.on('data', (chunk: Buffer) => {
      stderrBuffer = Buffer.concat([stderrBuffer, chunk]);

      let lines = iconv.decode(stderrBuffer, 'shift_jis').split(/\r?\n/);
      if (!stderrBuffer.toString().endsWith('\n')) {
        stderrBuffer = Buffer.from(lines.pop() ?? '', 'utf8');
      } else {
        stderrBuffer = Buffer.alloc(0);
      }

      for (const line of lines) {
        if (this.onStderr) this.onStderr(line);
      }
    });
  }


  /**
   * イベントハンドラーをセットアップ
   */
  private setupEventHandlers(): void {
    if (!this.process) return;

    // 終了イベント
    this.process.on('exit', (code: number | null) => {
      this.logger.info({ exitCode: code }, 'Process exited');

      if (this.onExit) {
        this.onExit(code);
      }

      this.cleanup();
    });

    // エラーイベント
    this.process.on('error', (error: Error) => {
      this.logger.error({ err: error }, 'Process error');

      if (this.onError) {
        this.onError(error);
      }

      this.cleanup();
    });
  }

  /**
   * プロセスを停止（stopコマンド送信）
   * 
   * @param timeout - タイムアウト時間（ミリ秒）
   * @returns 正常に停止できた場合true、タイムアウトした場合false
   */
  public async stop(timeout: number = 30000): Promise<boolean> {
    if (!this.isRunningFlag || !this.process) {
      this.logger.warn('Process is not running');
      return true; // 既に停止している
    }

    this.logger.info({ timeout }, 'Stopping process');

    // stopコマンド送信
    this.sendCommand('stop');

    // タイムアウト付きで終了待機
    const terminated = await this.waitForExit(timeout);

    if (terminated) {
      this.logger.info('Process stopped gracefully');
      return true;
    } else {
      this.logger.warn('Process did not stop within timeout');

      // タイムアウトコールバック
      if (this.onStopTimeout) {
        this.onStopTimeout();
      }

      return false;
    }
  }

  /**
   * プロセス終了を待機
   * 
   * @param timeout - タイムアウト時間（ミリ秒）
   * @returns タイムアウト内に終了した場合true、それ以外false
   */
  private async waitForExit(timeout: number): Promise<boolean> {
    if (!this.process) {
      return true;
    }

    return new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => {
        resolve(false); // タイムアウト
      }, timeout);

      // 終了イベント監視（一度だけ）
      this.process!.once('exit', () => {
        clearTimeout(timer);
        resolve(true); // 正常終了
      });
    });
  }

  /**
   * プロセスを強制終了
   */
  public kill(): void {
    if (!this.process) {
      this.logger.warn('No process to kill');
      return;
    }

    this.logger.warn({ pid: this.process.pid }, 'Force killing process');

    try {
      this.process.kill('SIGKILL');
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to kill process');
    }
  }

  /**
   * コマンドを送信（テキスト + Enter）
   * 
   * @param text - 送信するコマンドテキスト
   */
  public sendCommand(text: string): void {
    this.sendInput(text + ControlCharacter.ENTER);
  }

  /**
   * 入力を送信（Enterなし）
   * 
   * @param text - 送信するテキスト
   */
  public sendInput(text: string): void {
    if (!this.process || !this.process.stdin) {
      this.logger.warn('Cannot send input: process not running');
      return;
    }

    try {
      this.process.stdin.write(text);
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to send input');
    }
  }

  /**
   * 制御文字を送信
   * 
   * @param char - 制御文字
   */
  public sendControlCharacter(char: ControlCharacter): void {
    this.sendInput(char);
  }

  /**
   * プロセスが実行中か確認
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
    // 標準入力を閉じる
    if (this.process && this.process.stdin) {
      try {
        this.process.stdin.end();
      } catch (error) {
        // エラーを無視（既に閉じている可能性）
      }
    }

    // Readlineインターフェースを閉じる
    if (this.stdoutReader) {
      this.stdoutReader.close();
      this.stdoutReader = null;
    }

    if (this.stderrReader) {
      this.stderrReader.close();
      this.stderrReader = null;
    }

    // すべてのリスナーを削除
    if (this.process) {
      this.process.removeAllListeners();
    }

    // フラグをクリア
    this.isRunningFlag = false;
    this.process = null;
  }
}

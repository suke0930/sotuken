import axios, { AxiosResponse } from 'axios';
import * as fs from 'fs';
import * as path from 'path';

/**
 * ダウンロード進捗情報
 */
export interface DownloadProgress {
  taskId: string;
  totalBytes: number;
  downloadedBytes: number;
  percentage: number;
  speed: number; // bytes per second
  remainingTime: number; // seconds
  status: 'waiting' | 'downloading' | 'completed' | 'error' | 'cancelled';
  filename: string;
  error?: string;
}

/**
 * ダウンロードタスク管理クラス
 * 
 * 使用例:
 * ```typescript
 * const task = new DownloadTask(
 *   'task-1',
 *   'https://example.com/file.jar',
 *   './download',
 *   (progress) => {
 *     console.log(`Progress: ${progress.percentage}%`);
 *   }
 * );
 * 
 * await task.start();
 * ```
 */
export class DownloadTask {
  private taskId: string;
  private url: string;
  private saveDir: string;
  private filename: string;
  private onProgress?: (progress: DownloadProgress) => void;
  private onComplete?: () => void;
  private onError?: (error: Error) => void;

  private totalBytes: number = 0;
  private downloadedBytes: number = 0;
  private status: DownloadProgress['status'] = 'waiting';
  private startTime: number = 0;
  private lastUpdateTime: number = 0;
  private lastDownloadedBytes: number = 0;
  private currentSpeed: number = 0;
  private cancelled: boolean = false;
  private errorMessage?: string;

  constructor(
    taskId: string,
    url: string,
    saveDir: string,
    onProgress?: (progress: DownloadProgress) => void,
    onComplete?: () => void,
    onError?: (error: Error) => void
  ) {
    this.taskId = taskId;
    this.url = url;
    this.saveDir = saveDir;
    this.filename = path.basename(new URL(url).pathname);
    this.onProgress = onProgress;
    this.onComplete = onComplete;
    this.onError = onError;

    // 保存ディレクトリが存在しない場合は作成
    if (!fs.existsSync(saveDir)) {
      fs.mkdirSync(saveDir, { recursive: true });
    }
  }

  /**
   * ダウンロード開始
   */
  async start(): Promise<void> {
    if (this.cancelled) {
      throw new Error('Task was cancelled');
    }

    this.status = 'downloading';
    this.startTime = Date.now();
    this.lastUpdateTime = this.startTime;

    const savePath = path.join(this.saveDir, this.filename);
    const writer = fs.createWriteStream(savePath);

    try {
      const response: AxiosResponse = await axios({
        method: 'get',
        url: this.url,
        responseType: 'stream',
        onDownloadProgress: (progressEvent) => {
          this.handleProgress(progressEvent.loaded, progressEvent.total || 0);
        },
      });

      this.totalBytes = parseInt(response.headers['content-length'] || '0', 10);

      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          this.handleComplete();
          resolve();
        });

        writer.on('error', (error) => {
          this.handleError(error);
          reject(error);
        });
      });
    } catch (error) {
      const err = error as Error;
      this.handleError(err);
      throw err;
    }
  }

  /**
   * ダウンロードをキャンセル
   */
  cancel(): void {
    this.cancelled = true;
    this.status = 'cancelled';
    this.emitProgress();
  }

  /**
   * 現在のステータスを取得
   */
  getStatus(): DownloadProgress {
    return {
      taskId: this.taskId,
      totalBytes: this.totalBytes,
      downloadedBytes: this.downloadedBytes,
      percentage: this.totalBytes > 0 ? (this.downloadedBytes / this.totalBytes) * 100 : 0,
      speed: this.currentSpeed,
      remainingTime: this.calculateRemainingTime(),
      status: this.status,
      filename: this.filename,
      error: this.errorMessage,
    };
  }

  /**
   * 進捗を処理
   */
  private handleProgress(downloaded: number, total: number): void {
    if (this.cancelled) return;

    this.downloadedBytes = downloaded;
    if (total > 0) {
      this.totalBytes = total;
    }

    // 速度計算（1秒ごとに更新）
    const now = Date.now();
    const timeDiff = (now - this.lastUpdateTime) / 1000; // seconds

    if (timeDiff >= 0.5) {
      const bytesDiff = this.downloadedBytes - this.lastDownloadedBytes;
      this.currentSpeed = bytesDiff / timeDiff;
      this.lastUpdateTime = now;
      this.lastDownloadedBytes = this.downloadedBytes;

      this.emitProgress();
    }
  }

  /**
   * ダウンロード完了処理
   */
  private handleComplete(): void {
    this.status = 'completed';
    this.downloadedBytes = this.totalBytes;
    this.emitProgress();

    if (this.onComplete) {
      this.onComplete();
    }
  }

  /**
   * エラー処理
   */
  private handleError(error: Error): void {
    this.status = 'error';
    this.errorMessage = error.message;
    this.emitProgress();

    if (this.onError) {
      this.onError(error);
    }
  }

  /**
   * 進捗情報を通知
   */
  private emitProgress(): void {
    if (this.onProgress) {
      this.onProgress(this.getStatus());
    }
  }

  /**
   * 残り時間を計算（秒）
   */
  private calculateRemainingTime(): number {
    if (this.currentSpeed === 0 || this.totalBytes === 0) {
      return 0;
    }

    const remainingBytes = this.totalBytes - this.downloadedBytes;
    return remainingBytes / this.currentSpeed;
  }

  /**
   * ファイル名を取得
   */
  getFilename(): string {
    return this.filename;
  }

  /**
   * タスクIDを取得
   */
  getTaskId(): string {
    return this.taskId;
  }
}

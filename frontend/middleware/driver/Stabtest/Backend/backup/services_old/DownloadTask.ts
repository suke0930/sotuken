import axios, { AxiosResponse } from 'axios';
import * as fs from 'fs';
import * as path from 'path';

/**
 * ダウンロード進捗情報
 */
export interface DownloadProgress {
  downloadedBytes: number;
  totalBytes: number;
  percentage: number;
  speedBytesPerSecond: number;
  remainingSeconds: number;
  status: 'pending' | 'downloading' | 'completed' | 'failed' | 'cancelled';
}

/**
 * ダウンロードタスクの設定
 */
export interface DownloadTaskConfig {
  url: string;
  saveDir: string;
  filename?: string; // 指定しない場合はURLから自動取得
  onProgress?: (progress: DownloadProgress) => void;
  onComplete?: (filepath: string) => void;
  onError?: (error: Error) => void;
}

/**
 * ダウンロードタスク管理クラス
 * 
 * ファイルダウンロードを管理し、進捗情報をリアルタイムで提供します。
 * 
 * @example
 * ```typescript
 * const task = new DownloadTask({
 *   url: 'https://example.com/file.zip',
 *   saveDir: './downloads',
 *   onProgress: (progress) => {
 *     console.log(`${progress.percentage}% - ${progress.speedBytesPerSecond} bytes/s`);
 *   },
 *   onComplete: (filepath) => {
 *     console.log(`Downloaded: ${filepath}`);
 *   }
 * });
 * 
 * await task.start();
 * ```
 */
export class DownloadTask {
  private url: string;
  private saveDir: string;
  private filename: string;
  private filepath: string;
  
  private onProgressCallback?: (progress: DownloadProgress) => void;
  private onCompleteCallback?: (filepath: string) => void;
  private onErrorCallback?: (error: Error) => void;
  
  private downloadedBytes: number = 0;
  private totalBytes: number = 0;
  private startTime: number = 0;
  private status: DownloadProgress['status'] = 'pending';
  private abortController: AbortController | null = null;
  
  private writeStream: fs.WriteStream | null = null;
  
  /**
   * コンストラクタ
   * @param config ダウンロードタスクの設定
   */
  constructor(config: DownloadTaskConfig) {
    this.url = config.url;
    this.saveDir = config.saveDir;
    
    // ファイル名の決定
    if (config.filename) {
      this.filename = config.filename;
    } else {
      // URLから自動抽出
      const urlPath = new URL(this.url).pathname;
      this.filename = path.basename(urlPath) || 'download';
    }
    
    this.filepath = path.join(this.saveDir, this.filename);
    
    this.onProgressCallback = config.onProgress;
    this.onCompleteCallback = config.onComplete;
    this.onErrorCallback = config.onError;
  }
  
  /**
   * ダウンロードを開始
   */
  async start(): Promise<void> {
    try {
      this.status = 'downloading';
      this.startTime = Date.now();
      
      // 保存ディレクトリが存在しない場合は作成
      if (!fs.existsSync(this.saveDir)) {
        fs.mkdirSync(this.saveDir, { recursive: true });
      }
      
      // AbortControllerを作成（キャンセル用）
      this.abortController = new AbortController();
      
      // Axiosでストリーミングダウンロード
      const response: AxiosResponse = await axios({
        method: 'GET',
        url: this.url,
        responseType: 'stream',
        signal: this.abortController.signal,
        onDownloadProgress: (progressEvent) => {
          this.handleProgress(progressEvent);
        },
      });
      
      // Content-Lengthから総サイズを取得
      this.totalBytes = parseInt(response.headers['content-length'] || '0', 10);
      
      // ファイルに書き込み
      this.writeStream = fs.createWriteStream(this.filepath);
      
      response.data.pipe(this.writeStream);
      
      // ダウンロード完了を待機
      await new Promise<void>((resolve, reject) => {
        this.writeStream!.on('finish', () => {
          this.handleComplete();
          resolve();
        });
        
        this.writeStream!.on('error', (error) => {
          this.handleError(error);
          reject(error);
        });
        
        response.data.on('error', (error: Error) => {
          this.handleError(error);
          reject(error);
        });
      });
      
    } catch (error) {
      if (axios.isCancel(error)) {
        this.status = 'cancelled';
        this.handleError(new Error('Download cancelled'));
      } else {
        this.handleError(error as Error);
      }
      throw error;
    }
  }
  
  /**
   * ダウンロード進捗を処理
   */
  private handleProgress(progressEvent: any): void {
    this.downloadedBytes = progressEvent.loaded || 0;
    
    if (progressEvent.total) {
      this.totalBytes = progressEvent.total;
    }
    
    const progress = this.getStatus();
    
    if (this.onProgressCallback) {
      this.onProgressCallback(progress);
    }
  }
  
  /**
   * ダウンロード完了を処理
   */
  private handleComplete(): void {
    this.status = 'completed';
    
    if (this.onCompleteCallback) {
      this.onCompleteCallback(this.filepath);
    }
  }
  
  /**
   * エラーを処理
   */
  private handleError(error: Error): void {
    this.status = 'failed';
    
    // 書き込みストリームをクリーンアップ
    if (this.writeStream) {
      this.writeStream.destroy();
      this.writeStream = null;
    }
    
    // 部分的にダウンロードされたファイルを削除
    if (fs.existsSync(this.filepath)) {
      try {
        fs.unlinkSync(this.filepath);
      } catch (e) {
        console.error('Failed to delete partial file:', e);
      }
    }
    
    if (this.onErrorCallback) {
      this.onErrorCallback(error);
    }
  }
  
  /**
   * 現在のダウンロード進捗を取得
   */
  getStatus(): DownloadProgress {
    const elapsedSeconds = (Date.now() - this.startTime) / 1000;
    const speedBytesPerSecond = elapsedSeconds > 0 ? this.downloadedBytes / elapsedSeconds : 0;
    const percentage = this.totalBytes > 0 ? (this.downloadedBytes / this.totalBytes) * 100 : 0;
    const remainingBytes = this.totalBytes - this.downloadedBytes;
    const remainingSeconds = speedBytesPerSecond > 0 ? remainingBytes / speedBytesPerSecond : 0;
    
    return {
      downloadedBytes: this.downloadedBytes,
      totalBytes: this.totalBytes,
      percentage: Math.min(percentage, 100),
      speedBytesPerSecond: Math.round(speedBytesPerSecond),
      remainingSeconds: Math.round(remainingSeconds),
      status: this.status,
    };
  }
  
  /**
   * ダウンロードをキャンセル
   */
  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.status = 'cancelled';
    }
  }
  
  /**
   * ダウンロードが完了したかチェック
   */
  isCompleted(): boolean {
    return this.status === 'completed';
  }
  
  /**
   * ダウンロードが失敗したかチェック
   */
  isFailed(): boolean {
    return this.status === 'failed';
  }
  
  /**
   * ダウンロードがキャンセルされたかチェック
   */
  isCancelled(): boolean {
    return this.status === 'cancelled';
  }
  
  /**
   * ダウンロード中かチェック
   */
  isDownloading(): boolean {
    return this.status === 'downloading';
  }
}

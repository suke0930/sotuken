import { GenericWebSocketManager, WSMessage } from '../../../websocket/GenericWebSocketManager';
import { DownloadProgress } from './DownloadTask';
import expressWs from 'express-ws';
import { MiddlewareManager } from '../../../middleware-manager';

/**
 * ダウンロードWebSocketメッセージタイプ
 */
export type DownloadWSMessageType =
  | 'download_progress'
  | 'download_complete'
  | 'download_error'
  | 'ping'
  | 'pong'
  | 'error';

/**
 * ダウンロードWebSocketデータ型
 */
export type DownloadWSData =
  | DownloadProgress
  | { taskId: string; filename: string }
  | { taskId: string; error: string }
  | { message: string; userId?: string }
  | { error: string; reason?: string };

/**
 * ダウンロード専用WebSocketマネージャー
 * Asset Handlerのダウンロード進捗管理に特化
 */
export class DownloadWebSocketManager extends GenericWebSocketManager<DownloadWSMessageType, DownloadWSData> {
  
  constructor(
    serv: expressWs.Instance,
    basepath: string,
    middlewareManager: MiddlewareManager
  ) {
    super(serv, basepath, middlewareManager, 'asset:download-websocket');
  }

  /**
   * ダウンロード進捗をブロードキャスト
   * 
   * @param progress - ダウンロード進捗情報
   */
  public broadcastProgress(progress: DownloadProgress): void {
    this.broadcast({
      type: 'download_progress',
      data: progress,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * ダウンロード完了を通知
   * 
   * @param taskId - タスクID
   * @param filename - ファイル名
   */
  public broadcastComplete(taskId: string, filename: string): void {
    this.broadcast({
      type: 'download_complete',
      data: { taskId, filename },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * エラーを通知
   * 
   * @param taskId - タスクID
   * @param error - エラーメッセージ
   */
  public broadcastError(taskId: string, error: string): void {
    this.broadcast({
      type: 'download_error',
      data: { taskId, error },
      timestamp: new Date().toISOString(),
    });
  }
}

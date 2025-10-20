import { Request, Response } from 'express';
import { DownloadTask } from '../services/DownloadTask';
import { WebSocketServer } from '../services/WebSocketServer';
import { AssetProxyService } from '../services/AssetProxyService';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * ダウンロードコントローラー
 * 
 * ファイルダウンロードを管理し、WebSocket経由で進捗を送信します。
 */
export class DownloadController {
  private wsServer: WebSocketServer;
  private assetProxy: AssetProxyService;
  private downloadDir: string;
  private activeTasks: Map<string, DownloadTask> = new Map();
  
  constructor(
    wsServer: WebSocketServer,
    assetServerUrl: string,
    downloadDir: string = './downloads'
  ) {
    this.wsServer = wsServer;
    this.assetProxy = new AssetProxyService(assetServerUrl);
    this.downloadDir = downloadDir;
  }
  
  /**
   * JDKファイルをダウンロード
   * POST /api/download/jdk
   * Body: { version: string, os: string, filename: string }
   */
  downloadJDK = async (req: Request, res: Response): Promise<void> => {
    try {
      const { version, os, filename } = req.body;
      
      if (!version || !os || !filename) {
        res.status(400).json({
          success: false,
          error: {
            message: 'version, os, filename are required',
            code: 'INVALID_REQUEST',
          },
        });
        return;
      }
      
      // ダウンロードURLを構築
      const filePath = `${version}/${os}/${filename}`;
      const downloadUrl = this.assetProxy.buildDownloadUrl('jdk', filePath);
      
      // タスクIDを生成
      const taskId = crypto.randomBytes(16).toString('hex');
      
      // レスポンスをすぐに返す
      res.status(202).json({
        success: true,
        taskId,
        message: 'Download started',
        filename,
      });
      
      // ダウンロードタスクを開始（非同期）
      this.startDownloadTask(taskId, downloadUrl, filename);
      
    } catch (error) {
      console.error('Error in downloadJDK:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'JDKダウンロードの開始に失敗しました',
          code: 'DOWNLOAD_ERROR',
        },
      });
    }
  };
  
  /**
   * サーバーファイルをダウンロード
   * POST /api/download/server
   * Body: { type: string, version: string, filename: string }
   */
  downloadServer = async (req: Request, res: Response): Promise<void> => {
    try {
      const { type, version, filename } = req.body;
      
      if (!type || !version || !filename) {
        res.status(400).json({
          success: false,
          error: {
            message: 'type, version, filename are required',
            code: 'INVALID_REQUEST',
          },
        });
        return;
      }
      
      // ダウンロードURLを構築
      const filePath = `${type}/${version}/${filename}`;
      const downloadUrl = this.assetProxy.buildDownloadUrl('servers', filePath);
      
      // タスクIDを生成
      const taskId = crypto.randomBytes(16).toString('hex');
      
      // レスポンスをすぐに返す
      res.status(202).json({
        success: true,
        taskId,
        message: 'Download started',
        filename,
      });
      
      // ダウンロードタスクを開始（非同期）
      this.startDownloadTask(taskId, downloadUrl, filename);
      
    } catch (error) {
      console.error('Error in downloadServer:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'サーバーダウンロードの開始に失敗しました',
          code: 'DOWNLOAD_ERROR',
        },
      });
    }
  };
  
  /**
   * ダウンロードタスクを開始
   */
  private async startDownloadTask(
    taskId: string,
    url: string,
    filename: string
  ): Promise<void> {
    const startTime = Date.now();
    
    const task = new DownloadTask({
      url,
      saveDir: this.downloadDir,
      filename,
      onProgress: (progress) => {
        // WebSocket経由で進捗を送信
        this.wsServer.broadcastProgress(taskId, filename, progress);
      },
      onComplete: (filepath) => {
        const duration = (Date.now() - startTime) / 1000;
        console.log(`✅ Download completed: ${filename} (${duration.toFixed(2)}s)`);
        
        // WebSocket経由で完了通知
        const status = task.getStatus();
        this.wsServer.broadcastComplete(
          taskId,
          filename,
          filepath,
          status.totalBytes,
          duration
        );
        
        // タスクを削除
        this.activeTasks.delete(taskId);
      },
      onError: (error) => {
        console.error(`❌ Download failed: ${filename}`, error);
        
        // WebSocket経由でエラー通知
        this.wsServer.broadcastError(taskId, error);
        
        // タスクを削除
        this.activeTasks.delete(taskId);
      },
    });
    
    // タスクを保存
    this.activeTasks.set(taskId, task);
    
    // ダウンロード開始
    try {
      await task.start();
    } catch (error) {
      // エラーはonErrorコールバックで処理される
    }
  }
  
  /**
   * ダウンロードをキャンセル
   * POST /api/download/cancel/:taskId
   */
  cancelDownload = (req: Request, res: Response): void => {
    const { taskId } = req.params;
    
    const task = this.activeTasks.get(taskId);
    
    if (!task) {
      res.status(404).json({
        success: false,
        error: {
          message: 'Task not found',
          code: 'TASK_NOT_FOUND',
        },
      });
      return;
    }
    
    task.cancel();
    this.activeTasks.delete(taskId);
    
    res.status(200).json({
      success: true,
      message: 'Download cancelled',
      taskId,
    });
  };
  
  /**
   * アクティブなダウンロードタスク一覧を取得
   * GET /api/download/tasks
   */
  getActiveTasks = (req: Request, res: Response): void => {
    const tasks = Array.from(this.activeTasks.entries()).map(([taskId, task]) => ({
      taskId,
      status: task.getStatus(),
    }));
    
    res.status(200).json({
      success: true,
      tasks,
      count: tasks.length,
    });
  };
}

import { Request, Response } from 'express';
import express from 'express';
import { DownloadTask } from '../lib/DownloadTask';
import { WebSocketManager } from '../lib/WebSocketManager';
import { ApiResponse } from '../types';
import * as path from 'path';
import expressWs from 'express-ws';
import { createModuleLogger } from '../../../logger';

const log = createModuleLogger('asset:download');

// ダウンロード先ディレクトリ
let DOWNLOAD_DIR = "";//あとで定数化するゔぇ

// WebSocketマネージャー（後で注入される）
let wsManager: WebSocketManager | null = null;

// アクティブなダウンロードタスク管理
const activeTasks = new Map<string, DownloadTask>();

/**
 * WebSocketマネージャーを設定
 */
export function setWebSocketManager(manager: WebSocketManager, download_dir: string): void {
  DOWNLOAD_DIR = download_dir;
  wsManager = manager;
}

/**
 * ファイルダウンロードを開始
 * POST /api/download
 * Body: { url: string, filename?: string }
 */
export const startDownload = async (req: Request, res: Response): Promise<void> => {
  try {
    const { url } = req.body;

    if (!url) {
      res.status(400).json({
        success: false,
        error: {
          message: 'URL is required',
          code: 'MISSING_URL',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // タスクIDを生成
    const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    log.info({
      taskId,
      url,
      saveDir: DOWNLOAD_DIR
    }, '🚀 Starting download task');

    // ダウンロードタスクを作成
    const task = new DownloadTask(
      taskId,
      url,
      DOWNLOAD_DIR,
      // 進捗コールバック
      (progress) => {
        if (wsManager) {
          wsManager.broadcastProgress(progress);
        }
      },
      // 完了コールバック
      () => {
        log.info({ taskId, filename: task.getFilename() }, 'Download completed');
        if (wsManager) {
          wsManager.broadcastComplete(taskId, task.getFilename());
        }
        activeTasks.delete(taskId);
      },
      // エラーコールバック
      (error) => {
        log.error({ taskId, err: error }, 'Download error');
        if (wsManager) {
          wsManager.broadcastError(taskId, error.message);
        }
        activeTasks.delete(taskId);
      }
    );

    // タスクを保存
    activeTasks.set(taskId, task);

    // ダウンロードを開始（非同期）
    task.start().catch((error) => {
      log.error({ err: error, taskId }, 'Failed to start download');
    });

    // レスポンスを即座に返す
    const apiResponse: ApiResponse = {
      success: true,
      data: {
        taskId,
        message: 'Download started',
        status: task.getStatus(),
      },
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(apiResponse);
  } catch (error: any) {
    log.error({ err: error }, 'Failed to start download');

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to start download',
        code: 'DOWNLOAD_ERROR',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * ダウンロードタスクのステータスを取得
 * GET /api/download/:taskId
 */
export const getDownloadStatus = (req: Request, res: Response): void => {
  try {
    const { taskId } = req.params;
    const task = activeTasks.get(taskId);

    if (!task) {
      res.status(404).json({
        success: false,
        error: {
          message: 'Task not found',
          code: 'TASK_NOT_FOUND',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const apiResponse: ApiResponse = {
      success: true,
      data: task.getStatus(),
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(apiResponse);
  } catch (error: any) {
    log.error({ err: error }, 'Failed to get download status');

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get download status',
        code: 'STATUS_ERROR',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * アクティブなダウンロードタスク一覧を取得
 * GET /api/downloads
 */
export const getActiveDownloads = (req: Request, res: Response): void => {
  try {
    const tasks = Array.from(activeTasks.values()).map((task) => task.getStatus());

    const apiResponse: ApiResponse = {
      success: true,
      data: tasks,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(apiResponse);
  } catch (error: any) {
    log.error({ err: error }, 'Failed to get active downloads');

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get active downloads',
        code: 'LIST_ERROR',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * ダウンロードタスクをキャンセル
 * DELETE /api/download/:taskId
 */
export const cancelDownload = (req: Request, res: Response): void => {
  try {
    const { taskId } = req.params;
    const task = activeTasks.get(taskId);

    if (!task) {
      res.status(404).json({
        success: false,
        error: {
          message: 'Task not found',
          code: 'TASK_NOT_FOUND',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    task.cancel();
    activeTasks.delete(taskId);

    const apiResponse: ApiResponse = {
      success: true,
      data: {
        taskId,
        message: 'Download cancelled',
      },
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(apiResponse);
  } catch (error: any) {
    log.error({ err: error }, 'Failed to cancel download');

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to cancel download',
        code: 'CANCEL_ERROR',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

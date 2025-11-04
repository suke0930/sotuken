import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { getAssetFilesList, getJDKList, getServersList } from './controllers/proxyController';
import { startDownload, getDownloadStatus, getActiveDownloads, cancelDownload } from './controllers/downloadController';
// ========================================
// Middleware
// ========================================
export let backendURL = "";
export class AssetServerAPP {
  private app: express.Router;
  private authmiddleware: express.RequestHandler;
  constructor(app: express.Router, authmiddleware: express.RequestHandler, backendurl: string) {
    backendURL = backendurl;
    this.app = app;
    this.authmiddleware = authmiddleware;
    this.initEndpoints();
  }

  // CORS設定
  private initEndpoints() {
    const app = this.app;

    app.use(cors({
      origin: '*', // 開発用：すべてのオリジンを許可
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }));

    // JSON解析
    app.use(express.json());

    // リクエストログ
    app.use((req: Request, res: Response, next: NextFunction) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });

    // ========================================
    // Routes
    // ========================================

    // Health check
    app.get('/health', this.authmiddleware, (req: Request, res: Response) => {
      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'Backend Proxy Server',
      });
    });
    // Static files (public directory)
    app.use(express.static('public'));
    /**
     * サーバーリスト取得
     * GET /api/list/servers
     */
    app.get('/list/servers', getServersList);

    /**
     * JDKリスト取得
     * GET /api/list/jdk
     */
    app.get('/list/jdk', getJDKList);

    /**
     * Assetファイルリスト取得
     * GET /api/list/assets/:type
     * :type = 'jdk' | 'servers'
     */
    app.get('/list/assets/:type', getAssetFilesList);

    // ========================================
    // Download Routes
    // ========================================

    /**
     * ダウンロード開始
     * POST /api/download
     * Body: { url: string, filename?: string }
     */
    app.post('/download', startDownload);

    /**
     * ダウンロードステータス取得
     * GET /api/download/:taskId
     */
    app.get('/download/:taskId', getDownloadStatus);

    /**
     * アクティブなダウンロード一覧取得
     * GET /api/downloads
     */
    app.get('/downloads', getActiveDownloads);

    /**
     * ダウンロードキャンセル
     * DELETE /api/download/:taskId
     */
    app.delete('/download/:taskId', cancelDownload);

    // Global error handler
    app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      console.error('❌ Unhandled error:', err);

      res.status(500).json({
        success: false,
        error: {
          message: 'Internal server error',
          code: 'INTERNAL_ERROR',
        },
        timestamp: new Date().toISOString(),
      });
    });
  }
}


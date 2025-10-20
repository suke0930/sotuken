import { Router } from 'express';
import { ProxyController } from '../controllers/proxyController';
import { DownloadController } from '../controllers/downloadController';
import { WebSocketServer } from '../services/WebSocketServer';

/**
 * ルーターを作成
 */
export function createRouter(
  assetServerUrl: string,
  wsServer: WebSocketServer,
  downloadDir: string
): Router {
  const router = Router();
  
  // コントローラーを初期化
  const proxyController = new ProxyController(assetServerUrl);
  const downloadController = new DownloadController(wsServer, assetServerUrl, downloadDir);
  
  // ================
  // プロキシAPI
  // ================
  
  // Minecraftサーバー情報を取得（Asset Server経由）
  router.get('/api/servers', proxyController.getServers);
  
  // JDK情報を取得（Asset Server経由）
  router.get('/api/jdk', proxyController.getJDKs);
  
  // JDKファイルリストを取得（Asset Server経由）
  router.get('/api/files/jdk', proxyController.getJDKFiles);
  
  // サーバーファイルリストを取得（Asset Server経由）
  router.get('/api/files/servers', proxyController.getServerFiles);
  
  // Asset Serverのヘルスチェック
  router.get('/api/health/asset', proxyController.checkAssetHealth);
  
  // ================
  // ダウンロードAPI
  // ================
  
  // JDKファイルをダウンロード
  router.post('/api/download/jdk', downloadController.downloadJDK);
  
  // サーバーファイルをダウンロード
  router.post('/api/download/server', downloadController.downloadServer);
  
  // ダウンロードをキャンセル
  router.post('/api/download/cancel/:taskId', downloadController.cancelDownload);
  
  // アクティブなダウンロードタスク一覧を取得
  router.get('/api/download/tasks', downloadController.getActiveTasks);
  
  // ================
  // ヘルスチェック
  // ================
  
  router.get('/health', (req, res) => {
    res.status(200).json({
      success: true,
      status: 'healthy',
      service: 'Backend Proxy Server',
      timestamp: new Date().toISOString(),
    });
  });
  
  return router;
}

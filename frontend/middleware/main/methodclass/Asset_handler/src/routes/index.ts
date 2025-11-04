import { Router } from 'express';
import {
  getServersList,
  getJDKList,
  getAssetFilesList,
} from '../controllers/proxyController';
import {
  startDownload,
  getDownloadStatus,
  getActiveDownloads,
  cancelDownload,
} from '../controllers/downloadController';

const router = Router();

// ========================================
// Proxy Routes (Asset Server へのプロキシ)
// ========================================

/**
 * サーバーリスト取得
 * GET /api/list/servers
 */
router.get('/list/servers', getServersList);

/**
 * JDKリスト取得
 * GET /api/list/jdk
 */
router.get('/list/jdk', getJDKList);

/**
 * Assetファイルリスト取得
 * GET /api/list/assets/:type
 * :type = 'jdk' | 'servers'
 */
router.get('/list/assets/:type', getAssetFilesList);

// ========================================
// Download Routes
// ========================================

/**
 * ダウンロード開始
 * POST /api/download
 * Body: { url: string, filename?: string }
 */
router.post('/download', startDownload);

/**
 * ダウンロードステータス取得
 * GET /api/download/:taskId
 */
router.get('/download/:taskId', getDownloadStatus);

/**
 * アクティブなダウンロード一覧取得
 * GET /api/downloads
 */
router.get('/downloads', getActiveDownloads);

/**
 * ダウンロードキャンセル
 * DELETE /api/download/:taskId
 */
router.delete('/download/:taskId', cancelDownload);

export default router;

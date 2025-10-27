import { Router } from 'express';
import { getAllServers } from '../controllers/serversController';

const router = Router();

/**
 * GET /api/v1/servers
 * 全サーバーソフトウェア情報の取得
 */
router.get('/servers', getAllServers);

export default router;

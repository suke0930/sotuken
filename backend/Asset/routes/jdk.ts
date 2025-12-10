import { Router } from 'express';
import { getAllJDKs } from '../controllers/jdkController';

const router = Router();

/**
 * GET /api/v1/jdk
 * 全JDKバージョン情報の取得
 */
router.get('/jdk', getAllJDKs);

export default router;

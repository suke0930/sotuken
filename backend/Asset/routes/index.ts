import { Router } from 'express';
import serversRouter from './servers';
import jdkRouter from './jdk';
import assetsRouter from './assets';
import frpRouter from './frp';

const router = Router();

/**
 * API v1 ルート
 * /api/v1/*
 */
router.use('/v1', serversRouter);
router.use('/v1', jdkRouter);

/**
 * アセット配信ルート
 * /api/assets/*
 */
router.use('/assets', assetsRouter);

/**
 * FRP バイナリ配信ルート
 * /api/assets/frp/*
 */
router.use('/assets/frp', frpRouter);

export default router;

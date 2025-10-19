import { Router } from 'express';
import serversRouter from './servers';
import jdkRouter from './jdk';

const router = Router();

/**
 * API v1 ルート
 * /api/v1/*
 */
router.use('/v1', serversRouter);
router.use('/v1', jdkRouter);

export default router;

import express from 'express';
import http from 'http';
import session from 'express-session';
import './lib/types'; // 型定義をグローバルに適用
import { SESSION_SECRET } from './lib/constants';
import { DevUserManager } from './lib/dev-user-manager';
import { MinecraftServerManager } from './lib/minecraft-server-manager';
import { MiddlewareManager } from './lib/middleware-manager';
import { ApiRouter, MinecraftServerRouter, SampleApiRouter, JdkRouter, JobRouter, MinecraftServerOpsRouter } from './lib/api-router';
import { WsHub } from './lib/ws-server';
import { MinecraftProcessManager } from './lib/minecraft-process-manager';

/**
 * アプリケーションのエントリーポイント
 */
async function main(port: number): Promise<void> {
    // 1. 開発用ユーザーデータの初期化
    await DevUserManager.initialize();
    await MinecraftServerManager.initialize();

    // 2. Expressアプリケーションのインスタンス化
    const app = express();

    // 3. ミドルウェアのセットアップ
    const middlewareManager = new MiddlewareManager(app);
    middlewareManager.configure();

    // 4. ルーティングのセットアップ
    const apiRouter = new ApiRouter(app, middlewareManager.authMiddleware);
    apiRouter.configureRoutes();

    // 4.1. サンプルAPIルーターのセットアップ
    const sampleApiRouter = new SampleApiRouter(middlewareManager.authMiddleware);
    app.use('/api/sample', sampleApiRouter.router); // `/api/sample` プレフィックスでマウント

    // 4.2. Minecraftサーバー管理APIルーターのセットアップ（CRUD）
    const mcServerRouter = new MinecraftServerRouter(middlewareManager.authMiddleware);
    app.use('/api/servers', mcServerRouter.router);

    // 4.3. 拡張ルーター（JDK / ジョブ / サーバー操作）
    const jdkRouter = new JdkRouter(middlewareManager.authMiddleware);
    app.use('/api/jdks', jdkRouter.router);
    const jobRouter = new JobRouter(middlewareManager.authMiddleware);
    app.use('/api/jobs', jobRouter.router);
    const opsRouter = new MinecraftServerOpsRouter(middlewareManager.authMiddleware);
    app.use('/api/servers', opsRouter.router);

    // 5. エラーハンドリングミドルウェアのセットアップ (ルーティングの後)
    middlewareManager.setupErrorHandlers();

    // 6. HTTPサーバー起動（WSのために http.Server を利用）
    const server = http.createServer(app);

    // 7. WebSocket ハブの起動（セッションストアからユーザー復元）
    const store = middlewareManager.sessionMiddleware?.store as session.Store | undefined;
    const wsHub = new WsHub(server, async (sid) => {
        if (!store) return null;
        return new Promise<string | null>((resolve) => {
            (store as any).get(sid, (err: any, sess: any) => {
                if (err || !sess?.userId) return resolve(null);
                resolve(sess.userId as string);
            });
        });
    });
    wsHub.start();

    // 8. プロセスイベントをWSに中継
    MinecraftProcessManager.events.on('console', (ev: any) => {
        wsHub.emitTo('*', `server:console:${ev.serverId}`, { event: 'server:console', ...ev, ts: new Date().toISOString() });
    });
    MinecraftProcessManager.events.on('status', (ev: any) => {
        wsHub.emitTo('*', `server:status:${ev.serverId}`, { event: 'server:status', ...ev });
    });

    server.listen(port, '0.0.0.0', () => {
        console.log(`=== Front Driver Server Started ===`);
        console.log(`Port: ${port}`);
        console.log(`URL: http://127.0.0.1:${port}/`);
        console.log(`Sample API: http://127.0.0.1:${port}/api/sample/public-info`);
        console.log(`Session Secret: ${SESSION_SECRET.substring(0, 10)}...`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`WebSocket: ws://127.0.0.1:${port}/ws`);
        console.log(`=====================================`);
    });
}

// サーバー起動（ポート12800で開始）
main(12800).catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
});

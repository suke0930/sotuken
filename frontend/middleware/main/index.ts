import express from 'express';
import https from 'https';
import http from 'http';
import expressWs from 'express-ws';
import './lib/types'; // 型定義をグローバルに適用
import { SESSION_SECRET, DEFAULT_SERVER_PORT } from './lib/constants';
import { DevUserManager } from './lib/dev-user-manager';
import { MinecraftServerManager } from './lib/minecraft-server-manager';
import { MiddlewareManager } from './lib/middleware-manager';
import { ApiRouter, AssetManager, DownloadManager, MinecraftServerRouter, SampleApiRouter } from './lib/api-router';
import { SSLCertificateManager } from './lib/ssl/SSLCertificateManager';
import { createModuleLogger } from './lib/logger';
import path from 'path';

const log = createModuleLogger('main');
//ダウンロードパス
const DOWNLOAD_TEMP_PATH: string = path.join(__dirname, 'temp', 'download');
export { DOWNLOAD_TEMP_PATH };
/**
 * アプリケーションのエントリーポイント
 */
async function main(port: number): Promise<void> {
    // 1. 開発用ユーザーデータの初期化
    await DevUserManager.initialize();
    await MinecraftServerManager.initialize();

    // 2. SSL証明書の初期化
    const sslOptions = await SSLCertificateManager.initialize(port);

    // 3. Expressアプリケーションのインスタンス化
    const app = express();

    // 4. HTTPSまたはHTTPサーバーを作成
    const server = sslOptions//暗黙のif(sslOptions)
        ? https.createServer(sslOptions, app)//true
        : http.createServer(app);//false(null)(つまりSSL無効時のフォールバック)

    // 5. WebSocketサーバーの初期化（ミドルウェア設定の前に実行）
    const wsInstance = expressWs(app, server);
    log.info('✅ express-ws initialized');

    // 6. ミドルウェアのセットアップ
    const middlewareManager = new MiddlewareManager(app, !!sslOptions);
    middlewareManager.configure();

    // 7. ルーティングのセットアップ
    const apiRouter = new ApiRouter(app, middlewareManager.authMiddleware);
    apiRouter.configureRoutes();



    // 7.1. 【雛形】サンプルAPIルーターのセットアップ
    const sampleApiRouter = new SampleApiRouter(middlewareManager.authMiddleware);
    app.use('/api/sample', sampleApiRouter.router); // `/api/sample` プレフィックスでマウント

    // 7.2. Minecraftサーバー管理APIルーターのセットアップ
    const mcServerRouter = new MinecraftServerRouter(middlewareManager.authMiddleware);
    app.use('/api/servers', mcServerRouter.router);

    // 7.3 Assetproxyのセットアップ
    const assetProxy = new AssetManager(middlewareManager.authMiddleware);
    app.use('/api/assets', assetProxy.router);

    // 7.4 WebSocketマネージャーのセットアップ（wsInstanceを渡す）
    new DownloadManager(middlewareManager, wsInstance, DOWNLOAD_TEMP_PATH, "/ws");








    // 8. エラーハンドリングミドルウェアのセットアップ (ルーティングの後)
    middlewareManager.setupErrorHandlers();

    // 9. サーバーの起動
    server.listen(port, '0.0.0.0', () => {
        const protocol = sslOptions ? 'https' : 'http';
        const wsProtocol = sslOptions ? 'wss' : 'ws';

        log.info({
            event: 'server_started',
            protocol: protocol.toUpperCase(),
            port,
            endpoints: {
                main: `${protocol}://127.0.0.1:${port}/`,
                sampleApi: `${protocol}://127.0.0.1:${port}/api/sample/public-info`,
                webSocket: `${wsProtocol}://127.0.0.1:${port}/ws`
            },
            sessionSecret: SESSION_SECRET.substring(0, 10) + '...',
            environment: process.env.NODE_ENV || 'development',
            sslEnabled: !!sslOptions
        }, '🚀 Front Driver Server Started');

        if (!sslOptions) {
            log.warn({
                event: 'ssl_disabled',
                reason: 'certificate_generation_failed'
            }, '⚠️  WARNING: Running in HTTP mode - insecure for production');
        }
    });
}

// サーバー起動
main(DEFAULT_SERVER_PORT).catch((error) => {
    log.error({ err: error }, "Failed to start server");
    process.exit(1);
});

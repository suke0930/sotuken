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
import path from 'path';
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
    console.log('✅ express-ws initialized');

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

        console.log(`=== Front Driver Server Started ===`);
        console.log(`Protocol: ${protocol.toUpperCase()}`);
        console.log(`Port: ${port}`);
        console.log(`URL: ${protocol}://127.0.0.1:${port}/`);
        console.log(`Sample API: ${protocol}://127.0.0.1:${port}/api/sample/public-info`);
        console.log(`WebSocket: ${wsProtocol}://127.0.0.1:${port}/ws`);
        console.log(`Session Secret: ${SESSION_SECRET.substring(0, 10)}...`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

        if (!sslOptions) {
            console.log(`⚠️  WARNING: Running in HTTP mode (SSL certificate generation failed)`);
            console.log(`   This is insecure for production use!`);
        }

        console.log(`=====================================`);
    });
}

// サーバー起動
main(DEFAULT_SERVER_PORT).catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
});

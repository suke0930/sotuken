import express from 'express';
import https from 'https';
import http from 'http';
import expressWs from 'express-ws';
import './lib/types'; // 型定義をグローバルに適用
import { SESSION_SECRET, DEFAULT_SERVER_PORT } from './lib/constants';
import { DevUserManager } from './lib/dev-user-manager';
import { MinecraftServerManager } from './lib/minecraft-server-manager';
import { MiddlewareManager } from './lib/middleware-manager';
import { ApiRouter, AssetManagerRouter, DownloadWebsocket, JdkmanagerRoute, MCmanagerRoute, MCServerWebSocket, MinecraftServerRouter, SampleApiRouter } from './lib/api-router';
import { SSLCertificateManager } from './lib/ssl/SSLCertificateManager';
import { createModuleLogger } from './lib/logger';
const log = createModuleLogger('main');
import { JdkManager, JDKManagerAPP } from './lib/jdk-manager/src/Main';
import path from 'path';
import { SetupUserdata } from './lib/setup-dir';
import { MCserverManagerAPP } from './lib/minecraft-server-manager/Main';
import { FrpManagerAPP } from './lib/frp-manager/src/Main';
import { FrpManagerRoute } from './lib/api-router';


//ダウンロードパス

const DOWNLOAD_TEMP_PATH: string = path.join(__dirname, 'temp', 'download');
export { DOWNLOAD_TEMP_PATH };
//ユーザーデータ確定
const UserDataPath = {
    basedir: path.join(__dirname, "userdata"),
    Javadir: path.join(__dirname, "userdata", "jdk"),
    MCdatadir: path.join(__dirname, "userdata", "minecraftServ"),
}
SetupUserdata(UserDataPath.basedir, [UserDataPath.Javadir, UserDataPath.MCdatadir]);

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
    log.info('express-ws initialized');

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
    const assetProxy = new AssetManagerRouter(middlewareManager.authMiddleware);
    app.use('/api/assets', assetProxy.router);

    // 7.4 WebSocketマネージャーのセットアップ（wsInstanceを渡す）
    new DownloadWebsocket(middlewareManager, wsInstance, DOWNLOAD_TEMP_PATH, "/ws");

    //8 JDKmanagerのセットアップ
    const JDKmanager = new JDKManagerAPP(new JdkManager(UserDataPath.Javadir));
    //ルーティングセットアップ
    const JDKrouter = new JdkmanagerRoute(middlewareManager.authMiddleware, JDKmanager);
    app.use('/api/jdk', JDKrouter.router);

    // 8. エラーハンドリングミドルウェアのセットアップ (ルーティングの後)
    middlewareManager.setupErrorHandlers();
    // 9.MCサーバーのセットアップ
    const MCmanager = new MCserverManagerAPP(JDKmanager, DOWNLOAD_TEMP_PATH, UserDataPath.MCdatadir);
    const MCrouter = new MCmanagerRoute(middlewareManager.authMiddleware, MCmanager, JDKmanager);
    app.use('/api/mc', MCrouter.router);

    // 9.1 MCServer WebSocketマネージャーのセットアップ
    new MCServerWebSocket(middlewareManager, wsInstance, "/ws/mcserver", MCmanager);

    // 10. FRP Manager のセットアップ
    const frpManager = new FrpManagerAPP();
    await frpManager.initialize();
    const frpRouter = new FrpManagerRoute(middlewareManager.authMiddleware, frpManager);
    app.use('/api/frp', frpRouter.router);
    log.info('FRP Manager initialized');

    // 11. サーバーの起動
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
                downloadWebSocket: `${wsProtocol}://127.0.0.1:${port}/ws`,
                mcServerWebSocket: `${wsProtocol}://127.0.0.1:${port}/ws/mcserver`
            },
            sessionSecret: SESSION_SECRET.substring(0, 10) + '...',
            environment: process.env.NODE_ENV || 'development',
            sslEnabled: !!sslOptions
        }, 'Front Driver Server Started');

        if (!sslOptions) {
            log.warn({
                event: 'ssl_disabled',
                reason: 'certificate_generation_failed'
            }, 'WARNING: Running in HTTP mode - insecure for production');
        }
    });
}

// サーバー起動
main(DEFAULT_SERVER_PORT).catch((error) => {
    log.error(error, "Failed to start server");
    process.exit(1);
});

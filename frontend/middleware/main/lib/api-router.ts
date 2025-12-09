import express from 'express';
import path from 'path';
import { DevUserManager } from './dev-user-manager';
import { MinecraftServerManager } from './minecraft-server-manager';
import { SESSION_NAME } from './constants';
import { appConfig } from './config';
import { AssetServerAPP, } from './Asset_handler/src/app';
import expressWs from 'express-ws';
import { DownloadWebSocketManager } from './Asset_handler/src/lib/DownloadWebSocketManager';
import { setWebSocketManager } from './Asset_handler/src/controllers/downloadController';
import { MiddlewareManager } from './middleware-manager';
import { createModuleLogger } from './logger';
import { JDKManagerAPP } from './jdk-manager/src/Main';
import { t } from 'tar';
import { clearScreenDown } from 'readline';
import { MCserverManagerAPP } from './minecraft-server-manager/Main';
import { th } from 'zod/v4/locales';
import { threadCpuUsage } from 'process';
import { FrpManagerAPP } from './frp-manager/src/Main';
import { LogTailOptions } from './frp-manager/src/types';

const log = createModuleLogger('auth');
/**
 * APIエンドポイントのルーティングを管理するクラス
 */
export class ApiRouter {
    constructor(
        private app: express.Express,
        private authMiddleware: express.RequestHandler
    ) { }

    /**
     * APIエンドポイントをセットアップを行う
     * ラッパーもあるため要注意
     */
    public configureRoutes() {
        // 認証状態に関わらずトップページは表示する
        // 実際の表示内容はフロントエンドのJavaScriptが認証状態を見て決定する
        this.app.get('/', (req, res) => {
            // 以前はここで直接ファイルを返していましたが、
            // express.staticミドルウェアが 'web' ディレクトリを配信するため、
            // このルート定義は実質的に不要になる可能性があります。
            // ただし、明示的にルートパスへの応答を定義しておくことは良い習慣です。
            res.sendFile(path.join(__dirname, '..', 'web', 'mainpage.html'));
        });

        this.app.post('/user/signup', this.signupHandler);
        this.app.post('/user/login', this.loginHandler);
        this.app.get('/user/auth', this.authHandler);
        this.app.post('/user/logout', this.logoutHandler);

        this.app.get('/demo', this.authMiddleware, (req, res) => {
            res.sendFile(path.join(__dirname, '..', 'web', 'demo.html'));
        });

        this.app.get('/api/protected', this.authMiddleware, (req, res) => {
            res.json({
                ok: true,
                message: "保護されたAPIにアクセスしました",
                user: {
                    userId: req.userId, // authMiddlewareでセットされたuserIdを使用
                    accessTime: new Date().toISOString()
                }
            });
        });
    }

    private signupHandler: express.RequestHandler = async (req, res) => {
        if ((req.body.id == undefined) || (req.body.password == undefined)) return res.status(400).json({ ok: false, message: "JSONの形式が間違っています" });
        const { id, password } = req.body;
        if (!id || !password || typeof id !== 'string' || typeof password !== 'string') {
            return res.status(400).json({ ok: false, message: "IDとパスワードが必要です" });
        }

        try {
            const userExists = await DevUserManager.hasUser();
            if (userExists) {
                return res.status(409).json({ ok: false, message: "ユーザーは既に登録されています" });
            }

            await DevUserManager.createUser(id, password);

            // サインアップ後、自動的にログインセッションを開始
            await new Promise<void>((resolve, reject) => {
                req.session.regenerate((err) => {
                    if (err) return reject(err);
                    req.session.userId = id;
                    req.session.loginAt = new Date().toISOString();
                    req.session.save((saveErr) => saveErr ? reject(saveErr) : resolve());
                });
            });

            return res.status(201).json({ ok: true, message: "ユーザー登録とログインが完了しました", userId: id });
        } catch (error) {
            log.error({ err: error, userId: id }, "Signup error");
            return res.status(500).json({ ok: false, message: "サーバー内部エラーが発生しました" });
        }
    };

    private loginHandler: express.RequestHandler = async (req, res) => {
        if (!(req.body) || (req.body.id == undefined) || (req.body.password == undefined)) return res.status(400).json({ ok: false, message: "JSONの形式が間違っています" });
        const { id, password } = req.body;
        if (!id || !password) {
            return res.status(400).json({ ok: false, message: "IDとパスワードが必要です" });
        }

        try {
            const authenticatedUserId = await DevUserManager.authenticate(id, password);
            if (!authenticatedUserId) {
                return res.status(401).json({ ok: false, message: "IDまたはパスワードが正しくありません" });
            }

            await new Promise<void>((resolve, reject) => {
                req.session.regenerate((err) => {
                    if (err) return reject(err);
                    req.session.userId = authenticatedUserId;
                    req.session.loginAt = new Date().toISOString();
                    req.session.save((saveErr) => saveErr ? reject(saveErr) : resolve());
                });
            });
            log.info({
                event: 'user_login',
                userId: authenticatedUserId,
                loginAt: req.session.loginAt
            }, `User logged in: ${authenticatedUserId}`);

            return res.status(200).json({ ok: true, message: "ログインに成功しました", userId: authenticatedUserId });
        } catch (error) {
            log.error({ err: error, userId: id }, "Login error");
            return res.status(500).json({ ok: false, message: "サーバー内部エラーが発生しました" });
        }
    };

    private authHandler: express.RequestHandler = (req, res) => {
        if (req.session?.userId) {
            return res.status(200).json({
                ok: true,
                userId: req.session.userId,
                loginAt: req.session.loginAt,
                message: "認証済みです"
            });
        }
        // ユーザーがまだ登録されていない状態も考慮
        DevUserManager.hasUser().then(hasUser => {
            log.debug({ hasUser }, "Auth check");
            if (!hasUser) {
                return res.status(200).json({ ok: false, reason: "no_user_registered", message: "ユーザーが登録されていません" });
            }
            return res.status(401).json({ ok: false, reason: "invalid_session", message: "セッションが無効です" });
        });
    };

    private logoutHandler: express.RequestHandler = (req, res) => {
        req.session.destroy((err) => {
            if (err) {
                log.error({ err }, "Session destruction failed");
                return res.status(500).json({ ok: false, reason: "logout_failed", message: "ログアウト処理中にエラーが発生しました" });
            }
            res.clearCookie(SESSION_NAME);
            return res.status(200).json({ ok: true, message: "ログアウトしました" });
        });
    };
}

/**
 * 【雛形】他のAPIエンドポイントを追加する際のサンプルクラス
 */
export class SampleApiRouter {
    public readonly router: express.Router;

    constructor(private authMiddleware: express.RequestHandler) {
        this.router = express.Router();
        this.configureRoutes();
    }

    private configureRoutes() {
        this.router.get('/public-info', (req, res) => {
            res.json({ message: 'これは公開情報です。' });
        });

        this.router.get('/private-data', this.authMiddleware, (req, res) => {
            res.json({
                message: `ようこそ、 ${req.userId} さん。これは保護されたデータです。`,
                timestamp: new Date().toISOString()
            });
        });
    }
}

/**
 * Minecraftサーバー管理APIのルーティングを行うクラス
 * 後でゴテゴテに機能を追加する予定
 */
export class MinecraftServerRouter {
    public readonly router: express.Router;

    constructor(private authMiddleware: express.RequestHandler) {
        this.router = express.Router();
        this.configureRoutes();
    }

    private configureRoutes() {
        this.router.get('/', this.authMiddleware, this.getServersHandler);
        this.router.post('/', this.authMiddleware, this.createServerHandler);
        this.router.put('/:id', this.authMiddleware, this.updateServerHandler);
        this.router.delete('/:id', this.authMiddleware, this.deleteServerHandler);
    }

    private getServersHandler: express.RequestHandler = async (req, res) => {
        const servers = await MinecraftServerManager.getServersForUser(req.userId!);
        res.json({ ok: true, servers });
    };

    private createServerHandler: express.RequestHandler = async (req, res) => {
        const { serverName, minecraftVersion, serverSoftware, jdkVersion, connectTo, serverFilePath } = req.body;
        if (!serverName || !minecraftVersion || !serverSoftware) {
            return res.status(400).json({ ok: false, message: "必須項目が不足しています。" });
        }
        const newServer = await MinecraftServerManager.addServer(
            { serverName, minecraftVersion, serverSoftware, jdkVersion, connectTo, serverFilePath },
            req.userId!
        );
        res.status(201).json({ ok: true, server: newServer });
    };

    private updateServerHandler: express.RequestHandler = async (req, res) => {
        const { id } = req.params;
        const updates = req.body;
        if (!id) return res.status(400).json({ ok: false, message: "サーバーIDが必要です。" });
        const updatedServer = await MinecraftServerManager.updateServer(id, updates, req.userId!);
        if (!updatedServer) return res.status(404).json({ ok: false, message: "サーバーが見つからないか、更新権限がありません。" });
        res.json({ ok: true, server: updatedServer });
    };

    private deleteServerHandler: express.RequestHandler = async (req, res) => {
        const { id } = req.params;
        if (!id) return res.status(400).json({ ok: false, message: "サーバーIDが必要です。" });
        const success = await MinecraftServerManager.deleteServer(id, req.userId!);
        if (!success) return res.status(404).json({ ok: false, message: "サーバーが見つからないか、削除権限がありません。" });
        res.status(200).json({ ok: true, message: "サーバーを削除しました。" });
    };
}


/**
 * アセットのProxyAPIエンドポイントのルーティングを行うクラス
 * ただのラッパーだなぁ
 * これだとルーティングが一望できない...
 * ただコードの量的に可読性が著しく落ちるのでこのままで行く
 * 
 * 注意！実際のダウンロードAPIはこっちで管理されています
 * 以下はwebsocketだけだよ！
 */
export class AssetManagerRouter {
    public readonly router: express.Router;
    constructor(private authMiddleware: express.RequestHandler) {
        this.router = express.Router();
        // 統合設定システムからバックエンドAPIのURLを取得
        new AssetServerAPP(this.router, this.authMiddleware, appConfig.backendApi.url);
    }
}


/**
 * DownloadAPIエンドポイントのwebsocketの面倒を見るクラス
 */
export class DownloadWebsocket {
    public readonly router: express.Router;
    private wsServer: expressWs.Instance;
    private basepath: string;
    private download_dir: string
    private middlewareManager: MiddlewareManager;

    constructor(middlewareManager: MiddlewareManager, wsInstance: expressWs.Instance, download_dir: string, basepath: string) {
        this.basepath = basepath;
        this.download_dir = download_dir;
        this.router = express.Router();
        this.wsServer = wsInstance; // 外部から渡されたインスタンスを使用
        this.middlewareManager = middlewareManager;
        createModuleLogger('download').info('DownloadManager initialized with existing wsInstance');
        this.configureRoutes();
    }

    private configureRoutes() {
        const WsManager = new DownloadWebSocketManager(this.wsServer, this.basepath, this.middlewareManager);
        setWebSocketManager(WsManager, this.download_dir);
    }
}
/**
 * JDKManager管理クラス
 * 可読性確保＋既存リソース活用のためルーティングのみ個々で行うこととしよう。
 */
export class JdkmanagerRoute {
    public readonly router: express.Router;
    private app: JDKManagerAPP;
    constructor(private authMiddleware: express.RequestHandler, app: JDKManagerAPP) {
        this.router = express.Router();
        this.app = app;
        this.setupRoute();
    }
    setupRoute() {
        this.router.get("/installlist", this.authMiddleware, this.app.installlist);
        this.router.get("/getbyid/:id", this.authMiddleware, this.app.getbyId);
        this.router.get("/getbyverison/:verison", this.authMiddleware, this.app.getbyMajorVersion);
        this.router.post("/add", this.authMiddleware, this.app.addJDK);
        this.router.delete("/removeJDK/:id", this.authMiddleware, this.app.removeJDK);
    }
}

export class MCmanagerRoute {
    public readonly router: express.Router;
    private app: MCserverManagerAPP;
    private jdkapp: JDKManagerAPP;
    constructor(private authMiddleware: express.RequestHandler, app: MCserverManagerAPP, jdk: JDKManagerAPP) {
        this.router = express.Router();
        this.app = app;
        this.jdkapp = jdk;
        this.setupRoute();
    }
    setupRoute() {
        this.router.get("/list", this.authMiddleware, this.app.list);
        this.router.post("/add", this.authMiddleware, this.app.addserver);
        this.router.delete("/remove/:id", this.authMiddleware, this.app.del);
        this.router.get("/run/:id", this.authMiddleware, this.app.runserver);
        this.router.get("/stop/:id", this.authMiddleware, this.app.stopserver);
        this.router.post("/command/:id", this.authMiddleware, this.app.sendcommand);
        this.router.put("/update/:id", this.authMiddleware, this.app.update);
        this.router.get("/logs/:id", this.authMiddleware, this.app.getLogs);
        this.router.delete("/logs/:id", this.authMiddleware, this.app.clearLogs);

        // サーバープロパティエンドポイント（推奨）
        this.router.get("/Properties/:id", this.authMiddleware, this.app.getProperties);
        this.router.post("/Properties/:id", this.authMiddleware, this.app.setProperties);

        // 後方互換性のための旧エンドポイント（非推奨）
        // 既存のクライアントコードとの互換性を維持するため、当面は両方をサポート
        this.router.get("/Propites/:id", this.authMiddleware, this.app.getPropties);
        this.router.post("/Propites/:id", this.authMiddleware, this.app.SetPropties);
    }
}

/**
 * Minecraft Server WebSocket管理クラス
 * サーバーの標準出力/エラー出力、サーバーイベントをWebSocketでリアルタイム配信
 */
export class MCServerWebSocket {
    public readonly router: express.Router;
    private wsServer: expressWs.Instance;
    private basepath: string;
    private middlewareManager: MiddlewareManager;
    private mcApp: MCserverManagerAPP;

    constructor(middlewareManager: MiddlewareManager, wsInstance: expressWs.Instance, basepath: string, mcApp: MCserverManagerAPP) {
        this.basepath = basepath;
        this.router = express.Router();
        this.wsServer = wsInstance;
        this.middlewareManager = middlewareManager;
        this.mcApp = mcApp;
        createModuleLogger('mcserver-websocket').info('MCServerWebSocket initialized');
        this.configureRoutes();
    }

    private configureRoutes() {
        const { MCServerWebSocketManager } = require('./minecraft-server-manager/src/websocket/MCServerWebSocketManager');
        const wsManager = new MCServerWebSocketManager(this.wsServer, this.basepath, this.middlewareManager);
        this.mcApp.setWebSocketManager(wsManager);
    }
}

/**
 * FRP Manager API router
 */
export class FrpManagerRoute {
    public readonly router: express.Router;
    private frpManager: FrpManagerAPP;
    private authMiddleware: express.RequestHandler;

    constructor(authMiddleware: express.RequestHandler, frpManager: FrpManagerAPP) {
        this.router = express.Router();
        this.frpManager = frpManager;
        this.authMiddleware = authMiddleware;
        this.configureRoutes();
    }

    private configureRoutes() {
        // Auth flow (polling)
        this.router.post('/auth/init', this.authMiddleware, async (req, res) => {
            try {
                const result = await this.frpManager.initAuth();
                return res.json({ ok: true, data: result });
            } catch (error: any) {
                const message = error?.message || 'frp auth init failed';
                const status = message.includes('認証済み') || message.includes('進行中') ? 409 : 500;
                log.error({ err: error }, 'frp auth init failed');
                return res.status(status).json({ ok: false, error: message });
            }
        });

        this.router.get('/auth/poll', this.authMiddleware, async (req, res) => {
            try {
                const tempToken = typeof req.query.tempToken === 'string' ? req.query.tempToken : undefined;
                const result = await this.frpManager.pollAuth(tempToken);
                return res.json({ ok: true, data: result, note: 'auto-polling is handled server-side; this endpoint is optional.' });
            } catch (error: any) {
                log.error({ err: error }, 'frp auth poll failed');
                return res.status(500).json({ ok: false, error: error.message });
            }
        });

        this.router.get('/auth/status', this.authMiddleware, (_req, res) => {
            return res.json({ ok: true, data: this.frpManager.getAuthStatus() });
        });

        this.router.post('/auth/refresh', this.authMiddleware, async (_req, res) => {
            try {
                const tokens = await this.frpManager.refreshAuth();
                return res.json({ ok: true, data: tokens });
            } catch (error: any) {
                log.error({ err: error }, 'frp auth refresh failed');
                return res.status(400).json({ ok: false, error: error.message });
            }
        });

        this.router.post('/auth/logout', this.authMiddleware, (_req, res) => {
            this.frpManager.logoutAuth();
            return res.json({ ok: true });
        });

        // Sessions
        this.router.get('/sessions', this.authMiddleware, (_req, res) => {
            return res.json({ ok: true, data: this.frpManager.listSessionSummaries() });
        });

        this.router.post('/sessions', this.authMiddleware, async (req, res) => {
            try {
                const { remotePort, localPort, sessionId, fingerprint, displayName, extraMetas } = req.body || {};
                const parsedRemote = Number(remotePort);
                const parsedLocal = Number(localPort);
                if (!Number.isInteger(parsedRemote) || !Number.isInteger(parsedLocal)) {
                    return res.status(400).json({ ok: false, error: 'remotePort and localPort must be integers' });
                }
                if (parsedRemote <= 0 || parsedLocal <= 0) {
                    return res.status(400).json({ ok: false, error: 'remotePort and localPort must be positive' });
                }

                const record = await this.frpManager.startConnectionFromAuth({
                    sessionId,
                    remotePort: parsedRemote,
                    localPort: parsedLocal,
                    fingerprint,
                    displayName,
                    extraMetas: extraMetas && typeof extraMetas === 'object' ? extraMetas : undefined,
                });
                return res.status(201).json({ ok: true, data: this.sanitizeSession(record) });
            } catch (error: any) {
                log.error({ err: error }, 'frp session start failed');
                return res.status(400).json({ ok: false, error: error.message });
            }
        });

        this.router.delete('/sessions/:sessionId', this.authMiddleware, async (req, res) => {
            try {
                const { sessionId } = req.params;
                if (!sessionId) {
                    return res.status(400).json({ ok: false, error: 'sessionId is required' });
                }

                // stopConnectionの完了を待つ
                await this.frpManager.stopConnection(sessionId);

                // セッション削除を確認
                const session = this.frpManager.listSessions().find(s => s.sessionId === sessionId);
                if (session) {
                    log.warn({ sessionId }, 'Session still exists after stop, force deleting');
                    await this.frpManager.deleteSession(sessionId);
                }

                return res.json({ ok: true });
            } catch (error: any) {
                log.error({ err: error }, 'frp session stop failed');
                return res.status(500).json({ ok: false, error: error.message });
            }
        });

        this.router.get('/processes', this.authMiddleware, (_req, res) => {
            return res.json({ ok: true, data: this.frpManager.listActiveProcessSummaries() });
        });

        this.router.get('/logs/:sessionId', this.authMiddleware, async (req, res) => {
            try {
                const { sessionId } = req.params;
                const lines = Number(req.query.lines || req.query.tail) || undefined;
                const options: LogTailOptions = lines ? { lines } : {};
                const logs = await this.frpManager.tailLogs(sessionId, options);
                return res.json({ ok: true, data: logs });
            } catch (error: any) {
                log.error({ err: error }, 'frp log tail failed');
                return res.status(400).json({ ok: false, error: error.message });
            }
        });

        // User overview (permissions/limits)
        this.router.get('/me', this.authMiddleware, async (_req, res) => {
            try {
                const data = await this.frpManager.getUserOverview();
                return res.json({ ok: true, data });
            } catch (error: any) {
                log.error({ err: error }, 'frp user overview failed');
                return res.status(400).json({ ok: false, error: error.message });
            }
        });
    }

    private sanitizeSession(record: any) {
        return {
            sessionId: record.sessionId,
            discordId: record.discordId,
            displayName: record.displayName,
            remotePort: record.remotePort,
            localPort: record.localPort,
            status: record.status,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
        };
    }
}

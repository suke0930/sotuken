import express from 'express';
import path from 'path';
import { DevUserManager } from './dev-user-manager';
import { MinecraftServerManager } from './minecraft-server-manager';
import { SESSION_NAME } from './constants';
import { AssetServerAPP, } from './Asset_handler/src/app';
import expressWs from 'express-ws';
import { WebSocketManager } from './Asset_handler/src/lib/WebSocketManager';
import { setWebSocketManager } from './Asset_handler/src/controllers/downloadController';
import { MiddlewareManager } from './middleware-manager';
import { createModuleLogger } from './logger';
import { JDKManagerAPP } from './jdk-manager/src/Main';

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
 */
export class AssetManagerRouter {
    public readonly router: express.Router;
    constructor(private authMiddleware: express.RequestHandler) {
        this.router = express.Router();
        new AssetServerAPP(this.router, this.authMiddleware, "http://localhost:3000");
    }
}


/**
 * DownloadAPIエンドポイントのルーティングを行うクラス
 */
export class DownloadManager {
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
        const WsManager = new WebSocketManager(this.wsServer, this.basepath, this.middlewareManager);
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
        this.router.get("/getbyid/:verison", this.authMiddleware, this.app.getbyMajorVersion);
    }
}




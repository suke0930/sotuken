import express from 'express';
import path from 'path';
import { DevUserManager } from './dev-user-manager';
import { MinecraftServerManager } from './minecraft-server-manager';
import { SESSION_NAME } from './constants';

/**
 * APIエンドポイントのルーティングを管理するクラス
 */
export class ApiRouter {
    constructor(
        private app: express.Express,
        private authMiddleware: express.RequestHandler
    ) { }

    /**
     * すべてのAPIエンドポイントをセットアップする
     */
    public configureRoutes() {
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, '..', 'web', 'index.html'));
        });

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
                    devid: req.devid, // authMiddlewareでセットされたdevidを使用
                    accessTime: new Date().toISOString()
                }
            });
        });
    }

    private loginHandler: express.RequestHandler = async (req, res) => {
        const { devid } = req.body;
        if (!devid || typeof devid !== 'string') {
            return res.status(400).json({ ok: false, reason: "devid_required", message: "devidが必要です" });
        }

        try {
            const isAuthenticated = await DevUserManager.authenticate(devid);
            if (!isAuthenticated) {
                return res.status(401).json({ ok: false, reason: "forbidden_devid", message: "許可されていないデバイスIDです" });
            }

            await new Promise<void>((resolve, reject) => {
                req.session.regenerate((err) => {
                    if (err) return reject(err);
                    req.session.devid = devid;
                    req.session.loginAt = new Date().toISOString();
                    req.session.save((saveErr) => saveErr ? reject(saveErr) : resolve());
                });
            });
            console.log(`User logged in: ${devid} at ${req.session.loginAt}`);

            return res.status(200).json({ ok: true, message: "ログインに成功しました", devid: devid });
        } catch (error) {
            console.error("Login error:", error);
            return res.status(500).json({ ok: false, reason: "internal_server_error", message: "サーバー内部エラーが発生しました" });
        }
    };

    private authHandler: express.RequestHandler = (req, res) => {
        if (req.session?.devid) {
            return res.status(200).json({
                ok: true,
                devid: req.session.devid,
                loginAt: req.session.loginAt,
                message: "認証済みです"
            });
        }
        return res.status(401).json({ ok: false, reason: "invalid_session", message: "セッションが無効です" });
    };

    private logoutHandler: express.RequestHandler = (req, res) => {
        req.session.destroy((err) => {
            if (err) {
                console.error("Session destruction failed:", err);
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
                message: `ようこそ、 ${req.devid} さん。これは保護されたデータです。`,
                timestamp: new Date().toISOString()
            });
        });
    }
}

/**
 * Minecraftサーバー管理APIのルーティングを行うクラス
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
        const servers = await MinecraftServerManager.getServersForUser(req.devid!);
        res.json({ ok: true, servers });
    };

    private createServerHandler: express.RequestHandler = async (req, res) => {
        const { serverName, minecraftVersion, serverSoftware, jdkVersion, connectTo, serverFilePath } = req.body;
        if (!serverName || !minecraftVersion || !serverSoftware) {
            return res.status(400).json({ ok: false, message: "必須項目が不足しています。" });
        }
        const newServer = await MinecraftServerManager.addServer(
            { serverName, minecraftVersion, serverSoftware, jdkVersion, connectTo, serverFilePath },
            req.devid!
        );
        res.status(201).json({ ok: true, server: newServer });
    };

    private updateServerHandler: express.RequestHandler = async (req, res) => {
        const { id } = req.params;
        const updates = req.body;
        if (!id) return res.status(400).json({ ok: false, message: "サーバーIDが必要です。" });
        const updatedServer = await MinecraftServerManager.updateServer(id, updates, req.devid!);
        if (!updatedServer) return res.status(404).json({ ok: false, message: "サーバーが見つからないか、更新権限がありません。" });
        res.json({ ok: true, server: updatedServer });
    };

    private deleteServerHandler: express.RequestHandler = async (req, res) => {
        const { id } = req.params;
        if (!id) return res.status(400).json({ ok: false, message: "サーバーIDが必要です。" });
        const success = await MinecraftServerManager.deleteServer(id, req.devid!);
        if (!success) return res.status(404).json({ ok: false, message: "サーバーが見つからないか、削除権限がありません。" });
        res.status(200).json({ ok: true, message: "サーバーを削除しました。" });
    };
}


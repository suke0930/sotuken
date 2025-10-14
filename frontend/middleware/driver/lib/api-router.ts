import express from 'express';
import path from 'path';
import { DevUserManager } from './dev-user-manager';
import { MinecraftServerManager } from './minecraft-server-manager';
import { SESSION_NAME } from './constants';

// 追加インポート（拡張機能）
import { JdkManager } from './jdk-manager';
import { JobManager } from './job-manager';
import { MinecraftProcessManager } from './minecraft-process-manager';
import { listDir } from './file-browser';
import { FrpManager } from './frp-manager';
import axios from 'axios';

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
        // 認証状態に関わらずトップページは表示する
        // 実際の表示内容はフロントエンドのJavaScriptが認証状態を見て決定する
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, '..', 'web', 'index.html'));
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
            console.error("Signup error:", error);
            return res.status(500).json({ ok: false, message: "サーバー内部エラーが発生しました" });
        }
    };

    private loginHandler: express.RequestHandler = async (req, res) => {
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
            console.log(`User logged in: ${authenticatedUserId} at ${req.session.loginAt}`);

            return res.status(200).json({ ok: true, message: "ログインに成功しました", userId: authenticatedUserId });
        } catch (error) {
            console.error("Login error:", error);
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
            console.log("Auth check: hasUser =", hasUser);
            if (!hasUser) {
                return res.status(200).json({ ok: false, reason: "no_user_registered", message: "ユーザーが登録されていません" });
            }
            return res.status(401).json({ ok: false, reason: "invalid_session", message: "セッションが無効です" });
        });
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
                message: `ようこそ、 ${req.userId} さん。これは保護されたデータです。`,
                timestamp: new Date().toISOString()
            });
        });
    }
}

/**
 * Minecraftサーバー管理APIのルーティングを行うクラス（CRUD）
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
        this.router.get('/:id', this.authMiddleware, this.getServerHandler);
        this.router.put('/:id', this.authMiddleware, this.updateServerHandler);
        this.router.delete('/:id', this.authMiddleware, this.deleteServerHandler);
    }

    private getServersHandler: express.RequestHandler = async (req, res) => {
        const servers = await MinecraftServerManager.getServersForUser(req.userId!);
        res.json({ ok: true, servers });
    };

    private createServerHandler: express.RequestHandler = async (req, res) => {
        const { serverName, description, minecraftVersion, serverSoftware, jdkVersion, connectTo, serverFilePath, autoJdk } = req.body;
        if (!serverName || !minecraftVersion || !serverSoftware || !serverFilePath) {
            return res.status(400).json({ ok: false, message: "必須項目が不足しています。" });
        }

        // 推奨JDKの判定と自動ダウンロードジョブ
        const recommended = JdkManager.recommend(minecraftVersion);
        const jdk = jdkVersion || recommended;
        const found = await JdkManager.find(jdk);
        const jobs: any[] = [];
        if (!found && autoJdk === 'now') {
            const job = await JdkManager.download(jdk, req.userId!);
            jobs.push(job);
        }

        const newServer = await MinecraftServerManager.addServer(
            { serverName, description, minecraftVersion, serverSoftware, jdkVersion: jdk, connectTo, serverFilePath },
            req.userId!
        );
        res.status(201).json({ ok: true, server: newServer, jobs });
    };

    private getServerHandler: express.RequestHandler = async (req, res) => {
        const all = await MinecraftServerManager.getServersForUser(req.userId!);
        const server = all.find(s => s.id === req.params.id);
        if (!server) return res.status(404).json({ ok: false, message: "サーバーが見つかりません。" });
        res.json({ ok: true, server });
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
 * JDK 管理ルーター
 */
export class JdkRouter {
    public readonly router = express.Router();
    constructor(private auth: express.RequestHandler) {
        this.router.get('/', this.auth, this.list);
        this.router.post('/check', this.auth, this.check);
        this.router.post('/download', this.auth, this.download);
    }
    private list: express.RequestHandler = async (req, res) => {
        const jdks = await JdkManager.list();
        res.json({ ok: true, jdks });
    };
    private check: express.RequestHandler = async (req, res) => {
        const { minecraftVersion, serverSoftware } = req.body;
        if (!minecraftVersion || !serverSoftware) return res.status(400).json({ ok: false, message: 'invalid body' });
        const recommended = JdkManager.recommend(minecraftVersion);
        const found = await JdkManager.find(recommended);
        res.json({ ok: true, recommended, installed: !!found, found });
    };
    private download: express.RequestHandler = async (req, res) => {
        const { version } = req.body;
        if (!version) return res.status(400).json({ ok: false, message: 'version required' });
        const job = await JdkManager.download(version, req.userId!);
        res.status(202).json({ ok: true, job });
    };
}

/**
 * ジョブルーター
 */
export class JobRouter {
    public readonly router = express.Router();
    constructor(private auth: express.RequestHandler) {
        this.router.get('/:id', this.auth, this.get);
        this.router.get('/', this.auth, this.list);
        this.router.post('/:id/cancel', this.auth, this.cancel);
    }
    private get: express.RequestHandler = (req, res) => {
        if (req.params.id) {
            const job = JobManager.get(req.params.id);
            if (!job || job.owner !== req.userId) return res.status(404).json({ ok: false, message: 'not found' });
            res.json({ ok: true, job });
        } else {
            res.status(400).json({ ok: false, message: 'id notfound' });
        }
    };
    private list: express.RequestHandler = (req, res) => {
        const items = JobManager.list({ owner: req.userId! });
        res.json({ ok: true, jobs: items });
    };
    private cancel: express.RequestHandler = (req, res) => {
        if (req.params.id) {

            const job = JobManager.get(req.params.id);
            if (!job || job.owner !== req.userId) return res.status(404).json({ ok: false });
            JobManager.update(job.id, { status: 'canceled' });
            res.json({ ok: true, job: JobManager.get(job.id) });

        } else { res.status(400).json({ ok: false, message: 'id notfound' }); }

    };
}

/**
 * サーバー操作ルーター（起動/停止/コマンド/ファイル/FRP）
 */
export class MinecraftServerOpsRouter {
    public readonly router = express.Router();
    constructor(private auth: express.RequestHandler) {
        this.router.post('/:id/start', this.auth, this.start);
        this.router.post('/:id/stop', this.auth, this.stop);
        this.router.post('/:id/command', this.auth, this.command);
        this.router.get('/:id/files', this.auth, this.files);
        this.router.post('/:id/frp', this.auth, this.assignFrp);
        this.router.delete('/:id/frp/:forwardId', this.auth, this.unassignFrp);
    }

    private start: express.RequestHandler = async (req, res) => {
        const serverId = req.params.id;
        const servers = await MinecraftServerManager.getServersForUser(req.userId!);
        const server = servers.find(s => s.id === serverId);
        if (!server) return res.status(404).json({ ok: false, message: 'server not found' });
        try {
            const job = await MinecraftProcessManager.start(server, req.userId!);
            res.status(202).json({ ok: true, job });
        } catch (e: any) {
            res.status(400).json({ ok: false, message: e.message });
        }
    };

    private stop: express.RequestHandler = async (req, res) => {
        const serverId = req.params.id;
        if (serverId) {
            const job = await MinecraftProcessManager.stop(serverId, req.userId!);
            res.status(202).json({ ok: true, job });
        } else { res.status(400).json({ ok: false, message: 'id notfound' }); }

    };

    private command: express.RequestHandler = async (req, res) => {
        const { command } = req.body;
        if (!command) return res.status(400).json({ ok: false, message: 'command required' });
        try {
            if (req.params.id) {
                MinecraftProcessManager.sendCommand(req.params.id, command);
                res.json({ ok: true });
            } else { res.status(400).json({ ok: false, message: 'id notfound' }); }
        } catch (e: any) {
            res.status(400).json({ ok: false, message: e.message });
        }
    };

    private files: express.RequestHandler = async (req, res) => {
        const serverId = req.params.id;
        const pathArg = String(req.query.path || '');
        const servers = await MinecraftServerManager.getServersForUser(req.userId!);
        const server = servers.find(s => s.id === serverId);
        if (!server) return res.status(404).json({ ok: false, message: 'server not found' });
        try {
            const listing = await listDir(server.serverFilePath, pathArg);
            res.json({ ok: true, ...listing });
        } catch (e: any) {
            res.status(400).json({ ok: false, message: e.message });
        }
    };

    private assignFrp: express.RequestHandler = async (req, res) => {
        const { type, remotePort, subdomain } = req.body;
        const serverId = req.params.id;
        const server = (await MinecraftServerManager.getServersForUser(req.userId!)).find(s => s.id === serverId);
        if (!server) return res.status(404).json({ ok: false, message: 'server not found' });

        if (serverId) {
            const frp = await FrpManager.assign(serverId, type, { remotePort, subdomain });
            const updated = await MinecraftServerManager.updateServer(serverId, { frp }, req.userId!);
            res.json({ ok: true, server: updated });
        } else { res.status(400).json({ ok: false, message: 'id notfound' }); }

    };

    private unassignFrp: express.RequestHandler = async (req, res) => {
        const { id, forwardId } = req.params;
        if (forwardId && id) {
            await FrpManager.unassign(forwardId);
            const updated = await MinecraftServerManager.updateServer(id, { frp: undefined as any }, req.userId!);
            res.json({ ok: true, server: updated });
        } else { res.status(400).json({ ok: false, message: 'id notfound' }); }

    };
}

/**
 * アセットサーバープロキシルーター（認証付き）
 */
export class AssetProxyRouter {
    public readonly router = express.Router();
    private readonly ASSET_SERVER_URL = process.env.ASSET_SERVER_URL || 'http://localhost:12801';

    constructor(private authMiddleware: express.RequestHandler) {
        // すべてのルートに認証ミドルウェアを適用
        this.router.use(this.authMiddleware);

        // ルート定義（Express 5対応）
        this.router.get('/resources', this.getResources);
        this.router.get('/resources/:id', this.getResourceById);
        // ワイルドカードの代わりに正規表現パターンを使用
        this.router.get(/^\/download\/(.+)/, this.proxyDownload);
        this.router.get('/health', this.healthCheck);
    }

    private getResources: express.RequestHandler = async (req, res) => {
        try {
            const { type } = req.query;
            const url = `${this.ASSET_SERVER_URL}/api/resources${type ? `?type=${type}` : ''}`;

            console.log(`[${req.userId}] Proxying request to: ${url}`);
            const response = await axios.get(url);

            // URLをプロキシ経由に書き換え
            if (response.data.resources) {
                response.data.resources = response.data.resources.map((r: any) => ({
                    ...r,
                    downloadUrl: r.redistributable && r.downloadUrl ?
                        r.downloadUrl.replace(this.ASSET_SERVER_URL, '/api/assets') :
                        r.downloadUrl
                }));
            }

            // ユーザー情報を追加
            response.data.requestedBy = req.userId;

            res.json(response.data);
        } catch (error: any) {
            console.error(`[${req.userId}] Asset proxy error:`, error.message);
            res.status(error.response?.status || 500).json({
                ok: false,
                message: 'Failed to fetch resources from asset server',
                error: error.message
            });
        }
    };

    private getResourceById: express.RequestHandler = async (req, res) => {
        try {
            const { id } = req.params;
            const url = `${this.ASSET_SERVER_URL}/api/resources/${id}`;

            console.log(`[${req.userId}] Fetching resource: ${id}`);
            const response = await axios.get(url);

            // URLをプロキシ経由に書き換え
            if (response.data.resource?.downloadUrl && response.data.resource.redistributable) {
                response.data.resource.downloadUrl = response.data.resource.downloadUrl
                    .replace(this.ASSET_SERVER_URL, '/api/assets');
            }

            res.json(response.data);
        } catch (error: any) {
            console.error(`[${req.userId}] Asset proxy error:`, error.message);
            res.status(error.response?.status || 500).json({
                ok: false,
                message: 'Failed to fetch resource from asset server',
                error: error.message
            });
        }
    };

    private proxyDownload: express.RequestHandler = async (req, res) => {
        try {
            // 正規表現からパスを取得
            // req.params[0] には /download/ 以降のパスが入る
            const downloadPath = req.params[0] || req.path.replace('/download/', '');
            const url = `${this.ASSET_SERVER_URL}/download/${downloadPath}`;

            console.log(`[${req.userId}] Proxying download: ${url}`);

            // ダウンロードログを記録（監査用）
            this.logDownload(req.userId!, downloadPath);

            // ストリーミングプロキシ
            const response = await axios({
                method: 'GET',
                url: url,
                responseType: 'stream',
                headers: {
                    ...(req.headers.range && { range: req.headers.range })
                },
                validateStatus: () => true // すべてのステータスコードを許可
            });

            // エラーレスポンスの場合
            if (response.status >= 400) {
                res.status(response.status).json({
                    ok: false,
                    message: `Download failed with status ${response.status}`,
                    path: downloadPath
                });
                return;
            }

            // レスポンスヘッダーを転送
            Object.entries(response.headers).forEach(([key, value]) => {
                // 特定のヘッダーは転送しない
                const skipHeaders = ['connection', 'transfer-encoding', 'content-encoding'];
                if (!skipHeaders.includes(key.toLowerCase())) {
                    res.setHeader(key, value as string);
                }
            });

            // ストリームをパイプ
            response.data.pipe(res);

            // ダウンロード完了時のログ
            response.data.on('end', () => {
                console.log(`[${req.userId}] Download completed: ${downloadPath}`);
            });

            // エラー処理
            response.data.on('error', (error: any) => {
                console.error(`[${req.userId}] Stream error:`, error);
                if (!res.headersSent) {
                    res.status(500).json({
                        ok: false,
                        message: 'Stream error during download',
                        error: error.message
                    });
                }
            });

        } catch (error: any) {
            console.error(`[${req.userId}] Download proxy error:`, error.message);
            if (!res.headersSent) {
                res.status(error.response?.status || 500).json({
                    ok: false,
                    message: 'Failed to proxy download',
                    error: error.message
                });
            }
        }
    };

    private healthCheck: express.RequestHandler = async (req, res) => {
        try {
            const response = await axios.get(`${this.ASSET_SERVER_URL}/health`);
            res.json({
                ok: true,
                proxy: 'healthy',
                assetServer: response.data,
                user: req.userId
            });
        } catch (error) {
            res.status(503).json({
                ok: false,
                proxy: 'healthy',
                assetServer: 'unreachable',
                user: req.userId
            });
        }
    };

    // ダウンロードログを記録（監査用）
    private logDownload(userId: string, resource: string) {
        const timestamp = new Date().toISOString();
        console.log(`[DOWNLOAD_LOG] ${timestamp} - User: ${userId} - Resource: ${resource}`);
        // 実運用では、ここでデータベースやログファイルに記録
    }
}

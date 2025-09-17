import express from 'express';
import path from 'path';
import { promises as fs } from 'fs';
import crypto from 'crypto';
import session from 'express-session';


// 開発環境用のファイルパス設定
const DEV_SECRET_DIR = path.join(__dirname, '..', 'devsecret');
const USERS_FILE = path.join(DEV_SECRET_DIR, 'users.json');

// セッション設定
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(64).toString('hex');
const SESSION_NAME = 'frontdriver-session';

// セッション管理用の型定義
declare module 'express-session' {
    interface SessionData {
        devid: string;
        loginAt: string;
    }
}

// リクエスト型の拡張（デバッグ用）
declare global {
    namespace Express {
        interface Request {
            devid?: string;
        }
    }
}

/**
 * 開発用のユーザー管理クラス
 * JSONベースのユーザー管理（DB代替）を行う
 */
class DevUserManager {
    /**
     * devsecretディレクトリとデータファイルが存在しない場合に初期化する
     */
    static async initialize() {
        try {
            await fs.mkdir(DEV_SECRET_DIR, { recursive: true });
            await fs.access(USERS_FILE);
        } catch {
            console.log(`Initializing ${USERS_FILE}...`);
            // 開発環境用のデフォルトユーザーを設定
            const defaultUsers = ["dev-123", "dev-abc", "admin-test"];
            await fs.writeFile(USERS_FILE, JSON.stringify(defaultUsers, null, 2));
        }
    }

    /**
     * ユーザー認証を行う関数
     * @param devid ユーザーID
     * @returns 認証成功時はtrue、失敗時はfalse
     */
    static async authenticate(devid: string): Promise<boolean> {
        try {
            const usersData = await fs.readFile(USERS_FILE, 'utf-8');
            const users: string[] = JSON.parse(usersData);
            return users.includes(devid);
        } catch (error) {
            console.error("Failed to authenticate user:", error);
            return false;
        }
    }
}

/**
 * ミドルウェアのセットアップと管理を行うクラス
 */
class MiddlewareManager {
    constructor(private app: express.Express) { }

    /**
     * すべてのミドルウェアをセットアップする
     */
    public configure() {
        this.app.use(express.json());
        this.setupSession();
        this.setupStaticFiles();
        this.setupSecurityHeaders();
    }

    /**
     * エラーハンドリングミドルウェアをセットアップする2
     */
    public setupErrorHandlers() {
        this.app.use(this.errorHandler);
    }

    /**
     * express-sessionミドルウェアをセットアップする
     */
    private setupSession() {
        this.app.use(session({
            name: SESSION_NAME,
            secret: SESSION_SECRET,
            resave: false,
            saveUninitialized: false,
            cookie: {
                secure: false,
                httpOnly: true,
                maxAge: 24 * 60 * 60 * 1000,
                sameSite: 'lax'
            },
            /*
            // 本番環境用の設定例
            store: new MongoStore({
                mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/sessions',
                touchAfter: 24 * 3600
            }),
            cookie: {
                secure: true,
                httpOnly: true,
                maxAge: 24 * 60 * 60 * 1000,
                sameSite: 'strict'
            }
            */
        }));
    }

    /**
     * 静的ファイル配信をセットアップする
     */
    private setupStaticFiles() {
        this.app.use(express.static(path.join(__dirname, 'web')));
    }

    /**
     * セキュリティ関連のHTTPヘッダーを設定
     */
    private setupSecurityHeaders() {
        this.app.use((req, res, next) => {
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('X-Frame-Options', 'DENY');
            res.setHeader('X-XSS-Protection', '1; mode=block');
            // 本番環境ではCSPやHSTSヘッダーの追加を推奨
            // res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
            // res.setHeader('Content-Security-Policy', "default-src 'self'");
            next();
        });
    }

    /**
     * 認証ミドルウェア
     * セッションをチェックし、未認証の場合は401エラーを返す
     */
    public authMiddleware: express.RequestHandler = (req, res, next) => {
        if (req.session?.devid) {
            req.devid = req.session.devid; // 後続の処理で使えるようにリクエストオブジェクトに格納
            return next();
        }
        return res.status(401).json({
            ok: false,
            reason: "unauthorized",
            message: "ログインが必要です"
        });
    };

    /**
     * グローバルなエラーハンドリングミドルウェア
     */
    private errorHandler: express.ErrorRequestHandler = (error, req, res, next) => {
        console.error('Unhandled error:', error);
        res.status(500).json({
            ok: false,
            reason: "internal_server_error",
            message: "予期しないエラーが発生しました"
        });
    };
}

/**
 * APIエンドポイントのルーティングを管理するクラス
 */
class ApiRouter {
    constructor(
        private app: express.Express,
        private authMiddleware: express.RequestHandler
    ) { }

    /**
     * すべてのAPIエンドポイントをセットアップする
     */
    public configureRoutes() {
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'web', 'index.html'));
        });

        this.app.post('/user/login', this.loginHandler);
        this.app.get('/user/auth', this.authHandler);
        this.app.post('/user/logout', this.logoutHandler);

        this.app.get('/demo', this.authMiddleware, (req, res) => {
            res.sendFile(path.join(__dirname, 'web', 'demo.html'));
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

            // セッション固定攻撃対策: 認証成功時にセッションIDを再生成
            await new Promise<void>((resolve, reject) => {
                // セッションIDのローテーション（既存セッションの属性を維持しつつIDのみ変更）
                if (typeof req.session.rotate === 'function') {
                    req.session.rotate((err: any) => {
                        if (err) return reject(err);
                        req.session.devid = devid;
                        req.session.loginAt = new Date().toISOString();
                        return req.session.save((saveErr) => saveErr ? reject(saveErr) : resolve());
                    });
                    return;
                }
                // 互換: rotate がない場合は regenerate を使用
                req.session.regenerate((err) => {
                    if (err) return reject(err);
                    req.session.devid = devid;
                    req.session.loginAt = new Date().toISOString();
                    return req.session.save((saveErr) => saveErr ? reject(saveErr) : resolve());
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
            // クッキー削除時も発行時と同一属性を指定すると確実に無効化できる
            res.clearCookie(SESSION_NAME, { path: '/', httpOnly: true, sameSite: 'lax', secure: false });
            return res.status(200).json({ ok: true, message: "ログアウトしました" });
        });
    };
}

/**
 * 【雛形】他のAPIエンドポイントを追加する際のサンプルクラス
 * express.Routerを使用して、よりモジュール化されたルーティングを実現
 */
class SampleApiRouter {
    public readonly router: express.Router;

    constructor(private authMiddleware: express.RequestHandler) {
        this.router = express.Router();
        this.configureRoutes();
    }

    private configureRoutes() {
        // 認証が不要なエンドポイント
        this.router.get('/public-info', (req, res) => {
            res.json({ message: 'これは公開情報です。' });
        });

        // 認証が必要なエンドポイント
        this.router.get('/private-data', this.authMiddleware, (req, res) => {
            res.json({
                message: `ようこそ、 ${req.devid} さん。これは保護されたデータです。`,
                timestamp: new Date().toISOString()
            });
        });
    }
}

/**
 * アプリケーションのエントリーポイント
 */
async function main(port: number): Promise<void> {
    // 1. 開発用ユーザーデータの初期化
    await DevUserManager.initialize();

    // 2. Expressアプリケーションのインスタンス化
    const app = express();

    // 3. ミドルウェアのセットアップ
    const middlewareManager = new MiddlewareManager(app);
    middlewareManager.configure();

    // 4. ルーティングのセットアップ
    const apiRouter = new ApiRouter(app, middlewareManager.authMiddleware);
    apiRouter.configureRoutes();

    // 4.1. 【雛形】サンプルAPIルーターのセットアップ
    const sampleApiRouter = new SampleApiRouter(middlewareManager.authMiddleware);
    app.use('/api/sample', sampleApiRouter.router); // `/api/sample` プレフィックスでマウント

    // 5. エラーハンドリングミドルウェアのセットアップ (ルーティングの後)
    middlewareManager.setupErrorHandlers();

    // 6. サーバーの起動
    app.listen(port, '0.0.0.0', () => {
        console.log(`=== Front Driver Server Started ===`);
        console.log(`Port: ${port}`);
        console.log(`URL: http://127.0.0.1:${port}/`);
        console.log(`Sample API: http://127.0.0.1:${port}/api/sample/public-info`);
        console.log(`Session Secret: ${SESSION_SECRET.substring(0, 10)}...`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`=====================================`);
    });
}

// サーバー起動（ポート12800で開始）
main(12800).catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
});

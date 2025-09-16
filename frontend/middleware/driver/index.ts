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
 * Expressサーバーのセットアップと管理を行うクラス
 */
class AppServer {
    private app: express.Express;

    constructor(private port: number) {
        //this.appはexrepsssのインスタンス!!!!!!忘れるでない!!!!!!!!!
        this.app = express();
    }

    /**
     * サーバーをセットアップして起動する
     */
    public async start() {
        await DevUserManager.initialize();
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandlers();
        this.listen();
    }

    /**
     * ミドルウェアをセットアップする
     */
    private setupMiddleware() {
        // JSONボディパーサーを有効化
        this.app.use(express.json());

        // express-sessionの設定
        this.app.use(session({
            name: SESSION_NAME,
            secret: SESSION_SECRET,
            resave: false, // セッションが変更されていない場合は保存しない
            saveUninitialized: false, // 初期化されていないセッションは保存しない
            cookie: {
                secure: false, // 開発環境ではfalse（本番環境ではtrueにする）
                httpOnly: true, // XSS攻撃を防ぐためCookieにJavaScriptからアクセスできないようにする
                maxAge: 24 * 60 * 60 * 1000, // 24時間（ミリ秒）
                sameSite: 'lax' // CSRF攻撃を防ぐ
            },

            // 本番環境用の設定（現在はコメントアウト）
            // 本番環境では以下の設定を有効にしてください：
            /*
            store: new MongoStore({
                mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/sessions',
                touchAfter: 24 * 3600 // セッションの更新頻度を制限（秒）
            }),
            cookie: {
                secure: true, // HTTPS必須
                httpOnly: true,
                maxAge: 24 * 60 * 60 * 1000,
                sameSite: 'strict' // より厳格なCSRF保護
            }
            */
        }));

        // 静的ファイル配信を有効化
        this.app.use(express.static(path.join(__dirname, 'web')));

        /**
         * セキュリティヘッダーの追加（本番環境では重要）
         * 現在は基本的なものを設定
         */
        this.app.use((req, res, next) => {
            // XSS攻撃を防ぐ
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('X-Frame-Options', 'DENY');
            res.setHeader('X-XSS-Protection', '1; mode=block');

            // 本番環境では以下のヘッダーも設定してください：
            // res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
            // res.setHeader('Content-Security-Policy', "default-src 'self'");

            next();
        });
    }

    /**
     * ルーティングをセットアップする
     */
    private setupRoutes() {
        // ルートパスにアクセスされたらindex.htmlを返す
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'web', 'index.html'));
        });

        /**
         * POST /user/login: ユーザーログイン処理
         * express-session使用版
         */
        this.app.post('/user/login', async (req, res) => {
            const { devid } = req.body;

            // バリデーション
            if (!devid || typeof devid !== 'string') {
                return res.status(400).json({
                    ok: false,
                    reason: "devid_required",
                    message: "devidが必要です"
                });
            }

            try {
                // ユーザー認証
                const isAuthenticated = await DevUserManager.authenticate(devid);

                if (!isAuthenticated) {
                    return res.status(401).json({
                        ok: false,
                        reason: "forbidden_devid",
                        message: "許可されていないデバイスIDです"
                    });
                }

                // セッションにユーザー情報を保存
                req.session.devid = devid;
                req.session.loginAt = new Date().toISOString();

                console.log(`User logged in: ${devid} at ${req.session.loginAt}`);

                return res.status(200).json({
                    ok: true,
                    message: "ログインに成功しました",
                    devid: devid
                });

            } catch (error) {
                console.error("Login error:", error);
                return res.status(500).json({
                    ok: false,
                    reason: "internal_server_error",
                    message: "サーバー内部エラーが発生しました"
                });
            }
        });

        /**
         * GET /user/auth: セッション検証
         * 現在のセッション状態を確認し、認証済みユーザーの情報を返す
         */
        this.app.get('/user/auth', (req, res) => {
            if (req.session?.devid) {
                return res.status(200).json({
                    ok: true,
                    devid: req.session.devid,
                    loginAt: req.session.loginAt,
                    message: "認証済みです"
                });
            } else {
                return res.status(401).json({
                    ok: false,
                    reason: "invalid_session",
                    message: "セッションが無効です"
                });
            }
        });

        /**
         * POST /user/logout: ログアウト処理
         * セッションを破棄し、Cookieをクリアする
         */
        this.app.post('/user/logout', this.logoutHandler);

        /**
         * GET /demo: 認証必須のデモページ
         * authMiddlewareで認証チェックを行う
         */
        this.app.get('/demo', this.authMiddleware, (req, res) => {
            res.sendFile(path.join(__dirname, 'web', 'demo.html'));
        });

        /**
         * GET /api/protected: 認証必須のAPI例
         * 保護されたAPIエンドポイントの実装例
         */
        this.app.get('/api/protected', this.authMiddleware, (req, res) => {
            res.json({
                ok: true,
                message: "保護されたAPIにアクセスしました",
                user: {
                    devid: req.devid,
                    accessTime: new Date().toISOString()
                }
            });
        });
    }

    /**
     * エラーハンドリングミドルウェアをセットアップする
     */
    private setupErrorHandlers() {
        this.app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
            console.error('Unhandled error:', error);
            res.status(500).json({
                ok: false,
                reason: "internal_server_error",
                message: "予期しないエラーが発生しました"
            });
        });
    }

    /**
     * サーバーを指定されたポートで起動する
     */
    private listen() {
        this.app.listen(this.port, '0.0.0.0', () => {
            console.log(`=== Front Driver Server Started ===`);
            console.log(`Port: ${this.port}`);
            console.log(`URL: http://127.0.0.1:${this.port}/`);
            console.log(`Session Secret: ${SESSION_SECRET.substring(0, 10)}...`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`=====================================`);
        });
    }

    /**
     * 認証ミドルウェア（express-session使用版）
     * セッションからユーザー情報を取得し、認証状態を確認する
     */
    private authMiddleware: express.RequestHandler = (req, res, next) => {
        // セッションに認証情報があるかチェック
        if (req.session?.devid) {
            // デバッグ用にリクエストオブジェクトにdevid情報を付与
            req.devid = req.session.devid;
            return next();
        } else {
            return res.status(401).json({
                ok: false,
                reason: "unauthorized",
                message: "ログインが必要です"
            });
        }
    };

    /**
     * ログアウト用のミドルウェア
     * セッションを破棄する
     */
    private logoutHandler: express.RequestHandler = (req, res) => {
        req.session.destroy((err) => {
            if (err) {
                //エラーハンドリング
                console.error("Session destruction failed:", err);
                return res.status(500).json({
                    ok: false,
                    reason: "logout_failed",
                    message: "ログアウト処理中にエラーが発生しました"
                });
            }

            // Cookieもクリア
            res.clearCookie(SESSION_NAME);
            return res.status(200).json({
                ok: true,
                message: "ログアウトしました"
            });
        });
    };
}

/**
 * アプリケーションのエントリーポイント
 */
async function main(port: number): Promise<void> {
    const server = new AppServer(port);
    await server.start();
}

// サーバー起動（ポート12800で開始）
main(12800).catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
});

import express from 'express';
import session from 'express-session';
import path from 'path';
import { SESSION_NAME, SESSION_SECRET } from './constants';

/**
 * ミドルウェアのセットアップと管理を行うクラス
 */
/**
 * ミドルウェアのセットアップと管理を行うクラス
 */
export class MiddlewareManager {
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
     * エラーハンドリングミドルウェアをセットアップする
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
        }));
    }

    /**
     * 静的ファイル配信をセットアップする
     */
    private setupStaticFiles() {
        this.app.use(express.static(path.join(__dirname, '..', 'web')));
    }

    /**
     * セキュリティ関連のHTTPヘッダーを設定
     */
    private setupSecurityHeaders() {
        this.app.use((req, res, next) => {
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('X-Frame-Options', 'DENY');
            res.setHeader('X-XSS-Protection', '1; mode=block');
            next();
        });
    }

    /**
     * 認証ミドルウェア
     * セッションをチェックし、未認証の場合は401エラーを返す
     */
    public authMiddleware: express.RequestHandler = (req, res, next) => {
        if (req.session?.userId) {
            req.userId = req.session.userId;
            return next();
        }
        return res.status(401).json({ ok: false, reason: "unauthorized", message: "ログインが必要です" });
    };

    /**
     * WebSocket用の認証チェック
     * セッションからuserIdを取得して返す
     */
    public checkWebSocketAuth(req: express.Request): { authenticated: boolean; userId?: string } {
        if (req.session?.userId) {
            return { authenticated: true, userId: req.session.userId };
        }
        return { authenticated: false };
    }

    /**
     * グローバルなエラーハンドリングミドルウェア
     */
    private errorHandler: express.ErrorRequestHandler = (error, req, res, next) => {
        console.error('Unhandled error:', error);
        res.status(500).json({ ok: false, reason: "internal_server_error", message: "予期しないエラーが発生しました" });
    };
}   
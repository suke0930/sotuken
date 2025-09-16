import express from 'express';
import path from 'path';
import { promises as fs } from 'fs';
import crypto from 'crypto';

const DEV_SECRET_DIR = path.join(__dirname, '..', 'devsecret');
const USERS_FILE = path.join(DEV_SECRET_DIR, 'users.json');
const SESSIONS_FILE = path.join(DEV_SECRET_DIR, 'sessionid.json');

/**
 * devsecretディレクトリとデータファイルが存在しない場合に初期化する
 */
async function initializeDevSecret() {
    try {
        await fs.mkdir(DEV_SECRET_DIR, { recursive: true });
        await fs.access(USERS_FILE);
    } catch {
        console.log(`Initializing ${USERS_FILE}...`);
        await fs.writeFile(USERS_FILE, JSON.stringify(["dev-123", "dev-abc"], null, 2));
    }

    try {
        await fs.access(SESSIONS_FILE);
    } catch {
        console.log(`Initializing ${SESSIONS_FILE}...`);
        await fs.writeFile(SESSIONS_FILE, JSON.stringify({}, null, 2));
    }
}

/**
 * 認証ミドルウェア
 * ヘッダーまたはクエリからsessionIdを取得し、セッションを検証する
 */
const authMiddleware: express.RequestHandler = async (req, res, next) => {
    const sessionId = (req.headers['x-session-id'] as string) || (req.query.sessionId as string);
    if (!sessionId) {
        return res.status(401).json({ ok: false, reason: "unauthorized" });
    }

    try {
        //セッションIDのリスト読み込み
        const sessionsData = await fs.readFile(SESSIONS_FILE, 'utf-8');
        const sessions: Record<string, { devid: string; issuedAt: string }> = JSON.parse(sessionsData);

        //IDのチェック
        if (sessions[sessionId]) {
            // @ts-ignore: Attach devid to request for later use
            req.devid = sessions[sessionId].devid;

            return next();
        } else {
            return res.status(401).json({ ok: false, reason: "invalid_session" });
        }
    } catch (error) {
        console.error("Auth middleware error:", error);
        return res.status(500).json({ ok: false, reason: "internal_server_error" });
    }
};

async function main(port: number): Promise<void> {
    //ディレクトリのチェックと生成
    await initializeDevSecret();

    const app = express();

    // JSONボディパーサーと静的ファイル配信を有効化
    app.use(express.json());
    app.use(express.static(path.join(__dirname, '..', 'web')));

    // POST /user/login: ユーザーログイン処理
    app.post('/user/login', async (req, res) => {
        const { devid } = req.body;
        if (!devid) {
            return res.status(400).json({ ok: false, reason: "devid_required" });
        }

        try {
            const usersData = await fs.readFile(USERS_FILE, 'utf-8');
            const users: string[] = JSON.parse(usersData);

            if (!users.includes(devid)) {
                return res.status(401).json({ ok: false, reason: "forbidden_devid" });
            }

            const sessionId = crypto.randomBytes(16).toString('hex');
            const sessionsData = await fs.readFile(SESSIONS_FILE, 'utf-8');
            const sessions = JSON.parse(sessionsData);

            sessions[sessionId] = {
                devid: devid,
                issuedAt: new Date().toISOString(),
            };

            await fs.writeFile(SESSIONS_FILE, JSON.stringify(sessions, null, 2));

            return res.status(200).json({ ok: true, sessionId });

        } catch (error) {
            console.error("Login error:", error);
            return res.status(500).json({ ok: false, reason: "internal_server_error" });
        }
    });

    // GET /user/auth: セッション検証
    app.get('/user/auth', async (req, res) => {
        const sessionId = (req.headers['x-session-id'] as string) || (req.query.sessionId as string);
        if (!sessionId) {
            return res.status(401).json({ ok: false, reason: "invalid_session" });
        }

        try {
            const sessionsData = await fs.readFile(SESSIONS_FILE, 'utf-8');
            const sessions: Record<string, { devid: string; issuedAt: string }> = JSON.parse(sessionsData);

            const sessionInfo = sessions[sessionId];
            if (sessionInfo) {
                return res.status(200).json({ ok: true, devid: sessionInfo.devid });
            } else {
                return res.status(401).json({ ok: false, reason: "invalid_session" });
            }
        } catch (error) {
            console.error("Auth error:", error);
            return res.status(500).json({ ok: false, reason: "internal_server_error" });
        }
    });

    // GET /demo: 認証必須のデモページ
    app.get('/demo', authMiddleware, (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'web', 'demo.html'));
    });

    /**
     * サーバー起動
     */
    app.listen(port, () => {
        console.log(`Server listening on port ${port}`);
    });
}

main(12800);
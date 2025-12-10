import 'dotenv/config';
import express from 'express';
import { Discord } from 'arctic';
import { randomBytes } from 'crypto';

const app = express();
app.use(express.json());

// 環境変数の確認（デバッグ用）
console.log('Environment variables check:');
console.log('DISCORD_CLIENT_ID:', process.env.DISCORD_CLIENT_ID ? '✓ Set' : '✗ Not set');
console.log('DISCORD_CLIENT_SECRET:', process.env.DISCORD_CLIENT_SECRET ? '✓ Set' : '✗ Not set');
console.log('DISCORD_REDIRECT_URI:', process.env.DISCORD_REDIRECT_URI ? '✓ Set' : '✗ Not set');

// Discord プロバイダーを初期化
const discord = new Discord(
    process.env.DISCORD_CLIENT_ID!,
    process.env.DISCORD_CLIENT_SECRET!,
    process.env.DISCORD_REDIRECT_URI! // 例: "http://localhost:3000/auth/discord/callback"
);

// セッション管理用の簡易ストア（本番環境では Redis や Database を使用）
const sessionStore = new Map<string, { state: string }>();

/**
 * 認証開始エンドポイント
 * Postman でこのエンドポイントを叩くと、認証 URL が返される
 */
app.get('/auth/discord', async (req, res) => {
    try {
        // state パラメータを生成（CSRF 対策）
        const state = generateRandomState();

        // 認証 URL を生成
        const authUrl = await discord.createAuthorizationURL(state, {
            scopes: ['identify', 'email', 'guilds']
        });

        // セッション情報を保存
        sessionStore.set(state, { state });

        res.json({
            authUrl: authUrl.toString(),
            state: state,
            message: 'このURLにブラウザでアクセスして認証を完了してください'
        });
    } catch (error) {
        console.error('認証URL生成エラー:', error);
        res.status(500).json({
            error: '認証URLの生成に失敗しました',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * コールバックエンドポイント
 * Discord から認証後にリダイレクトされる
 */
app.get('/auth/discord/callback', async (req, res) => {
    const code = req.query.code as string;
    const state = req.query.state as string;

    if (!code || !state) {
        return res.status(400).json({ error: 'Code または State が不足しています' });
    }

    // セッションから state を検証
    const session = sessionStore.get(state);
    if (!session || session.state !== state) {
        return res.status(400).json({ error: '無効な state パラメータです' });
    }

    try {
        // 認可コードをアクセストークンに交換
        const tokens = await discord.validateAuthorizationCode(code);

        // ユーザー情報を取得
        const userResponse = await fetch('https://discord.com/api/users/@me', {
            headers: {
                Authorization: `Bearer ${tokens.accessToken}`
            }
        });

        if (!userResponse.ok) {
            throw new Error('ユーザー情報の取得に失敗しました');
        }

        const user = await userResponse.json();

        // セッションをクリーンアップ
        sessionStore.delete(state);

        res.json({
            message: '認証成功',
            tokens: {
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                expiresAt: tokens.accessTokenExpiresAt.toISOString()
            },
            user: user
        });

    } catch (error) {
        console.error('認証エラー:', error);
        res.status(500).json({
            error: '認証処理中にエラーが発生しました',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * トークンリフレッシュエンドポイント
 */
app.post('/auth/discord/refresh', async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token が必要です' });
    }

    try {
        const tokens = await discord.refreshAccessToken(refreshToken);

        res.json({
            message: 'トークン更新成功',
            tokens: {
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                expiresAt: tokens.accessTokenExpiresAt.toISOString()
            }
        });
    } catch (error) {
        console.error('トークン更新エラー:', error);
        res.status(500).json({
            error: 'トークン更新に失敗しました',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * ユーザー情報取得エンドポイント（テスト用）
 */
app.get('/auth/discord/user', async (req, res) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authorization header が必要です' });
    }

    const accessToken = authHeader.substring(7);

    try {
        const userResponse = await fetch('https://discord.com/api/users/@me', {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        if (!userResponse.ok) {
            throw new Error('ユーザー情報の取得に失敗しました');
        }

        const user = await userResponse.json();
        res.json(user);

    } catch (error) {
        console.error('ユーザー情報取得エラー:', error);
        res.status(500).json({
            error: 'ユーザー情報の取得に失敗しました',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * ギルド情報取得エンドポイント（追加例）
 */
app.get('/auth/discord/guilds', async (req, res) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authorization header が必要です' });
    }

    const accessToken = authHeader.substring(7);

    try {
        const guildsResponse = await fetch('https://discord.com/api/users/@me/guilds', {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        if (!guildsResponse.ok) {
            throw new Error('ギルド情報の取得に失敗しました');
        }

        const guilds = await guildsResponse.json();
        res.json(guilds);

    } catch (error) {
        console.error('ギルド情報取得エラー:', error);
        res.status(500).json({
            error: 'ギルド情報の取得に失敗しました',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * トークン失効エンドポイント
 */
app.post('/auth/discord/revoke', async (req, res) => {
    const { accessToken } = req.body;

    if (!accessToken) {
        return res.status(400).json({ error: 'Access token が必要です' });
    }

    try {
        const revokeResponse = await fetch('https://discord.com/api/oauth2/token/revoke', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                client_id: process.env.DISCORD_CLIENT_ID!,
                client_secret: process.env.DISCORD_CLIENT_SECRET!,
                token: accessToken
            })
        });

        if (!revokeResponse.ok) {
            throw new Error('トークンの失効に失敗しました');
        }

        res.json({ message: 'トークンを失効しました' });

    } catch (error) {
        console.error('トークン失効エラー:', error);
        res.status(500).json({
            error: 'トークン失効に失敗しました',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// ヘルパー関数
function generateRandomState(): string {
    return randomBytes(32).toString('hex');
}

function generateCodeVerifier(): string {
    return randomBytes(32).toString('hex');
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`\nAPI エンドポイント:`);
    console.log(`  GET  /auth/discord           - 認証開始`);
    console.log(`  GET  /auth/discord/callback  - コールバック`);
    console.log(`  POST /auth/discord/refresh   - トークン更新`);
    console.log(`  GET  /auth/discord/user      - ユーザー情報取得`);
    console.log(`  GET  /auth/discord/guilds    - ギルド一覧取得`);
    console.log(`  POST /auth/discord/revoke    - トークン失効`);
});
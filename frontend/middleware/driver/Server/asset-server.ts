import express from 'express';
import path from 'path';
import { promises as fs } from 'fs';
import { createReadStream } from 'fs';
import cors from 'cors';

const ASSET_PORT = 12801;
const DUMMY_FILES_DIR = path.join(__dirname, '..', 'dummyfile');

interface AssetResource {
    id: string;
    type: 'jdk' | 'server';
    name: string;
    version: string;
    url: string;
    size: number;
    sha256?: string;
    redistributable: boolean;
}

class AssetServer {
    private app = express();
    private resources: AssetResource[] = [];

    constructor() {
        this.setupMiddleware();
        this.initializeResources();
        this.setupRoutes();
    }

    private setupMiddleware() {
        // CORS設定 - より柔軟な設定
        const corsOptions: cors.CorsOptions = {
            origin: (origin, callback) => {
                // 開発環境では全てのlocalhostと127.0.0.1を許可
                const allowedPatterns = [
                    /^http:\/\/localhost:\d+$/,
                    /^http:\/\/127\.0\.0\.1:\d+$/,
                    /^http:\/\/\[::1\]:\d+$/  // IPv6 localhost
                ];

                // originがない場合（同一オリジンやPostmanなど）は許可
                if (!origin) {
                    callback(null, true);
                    return;
                }

                // パターンマッチング
                const isAllowed = allowedPatterns.some(pattern => pattern.test(origin));

                if (isAllowed) {
                    callback(null, true);
                } else {
                    callback(new Error('Not allowed by CORS'));
                }
            },
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization'],
            maxAge: 86400 // プリフライトリクエストのキャッシュ時間（24時間）
        };

        this.app.use(cors(corsOptions));

        // JSONパーサー
        this.app.use(express.json());

        // ログミドルウェア（デバッグ用）
        this.app.use((req, res, next) => {
            console.log(`[Asset Server] ${req.method} ${req.path} from ${req.headers.origin || 'no-origin'}`);
            next();
        });
    }

    private async initializeResources() {
        // ダミーリソース設定を生成
        this.resources = [
            {
                id: 'jdk-8-temurin',
                type: 'jdk',
                name: 'OpenJDK 8 (Temurin)',
                version: '8',
                url: '/download/jdk/8u392-temurin.tar.gz',
                size: 104857600, // 100MB
                sha256: 'dummy_hash_8',
                redistributable: true
            },
            {
                id: 'jdk-11-temurin',
                type: 'jdk',
                name: 'OpenJDK 11 (Temurin)',
                version: '11',
                url: '/download/jdk/11.0.21-temurin.tar.gz',
                size: 157286400, // 150MB
                sha256: 'dummy_hash_11',
                redistributable: true
            },
            {
                id: 'jdk-17-temurin',
                type: 'jdk',
                name: 'OpenJDK 17 (Temurin)',
                version: '17',
                url: '/download/jdk/17.0.9-temurin.tar.gz',
                size: 209715200, // 200MB
                sha256: 'dummy_hash_17',
                redistributable: true
            },
            {
                id: 'jdk-21-temurin',
                type: 'jdk',
                name: 'OpenJDK 21 (Temurin)',
                version: '21',
                url: '/download/jdk/21.0.1-temurin.tar.gz',
                size: 262144000, // 250MB
                sha256: 'dummy_hash_21',
                redistributable: true
            },
            {
                id: 'paper-1.20.4',
                type: 'server',
                name: 'Paper',
                version: '1.20.4',
                url: '/download/server/paper-1.20.4.jar',
                size: 52428800, // 50MB
                redistributable: true
            },
            {
                id: 'spigot-1.20.4',
                type: 'server',
                name: 'Spigot',
                version: '1.20.4',
                url: '/download/server/spigot-1.20.4.jar',
                size: 50331648, // 48MB
                redistributable: true
            },
            {
                id: 'mohist-1.20.4',
                type: 'server',
                name: 'Mohist',
                version: '1.20.4',
                url: '/download/server/mohist-1.20.4.jar',
                size: 62914560, // 60MB
                redistributable: true
            },
            {
                id: 'vanilla-1.20.4',
                type: 'server',
                name: 'Vanilla',
                version: '1.20.4',
                url: 'https://launcher.mojang.com/v1/objects/8dd1a28015f51b1803213892b50b7b4fc76e594d/server.jar',
                size: 48576512,
                redistributable: false // Mojangのライセンスにより再配布不可
            },
            {
                id: 'forge-1.20.4',
                type: 'server',
                name: 'Forge',
                version: '1.20.4',
                url: '/download/server/forge-1.20.4-installer.jar',
                size: 73400320, // 70MB
                redistributable: true
            },
            {
                id: 'fabric-1.20.4',
                type: 'server',
                name: 'Fabric',
                version: '1.20.4',
                url: '/download/server/fabric-1.20.4.jar',
                size: 41943040, // 40MB
                redistributable: true
            },
            {
                id: 'bukkit-1.20.4',
                type: 'server',
                name: 'Bukkit',
                version: '1.20.4',
                url: '/download/server/bukkit-1.20.4.jar',
                size: 45875200, // 44MB
                redistributable: true
            }
        ];

        // ダミーファイルディレクトリを作成
        await fs.mkdir(DUMMY_FILES_DIR, { recursive: true });

        // 各リソース用のダミーファイルを生成
        for (const resource of this.resources.filter(r => r.redistributable)) {
            const filename = path.basename(resource.url);
            const filepath = path.join(DUMMY_FILES_DIR, filename);

            try {
                await fs.access(filepath);
                console.log(`Dummy file exists: ${filename}`);
            } catch {
                // ダミーファイルを作成（実際のサイズの1/1000）
                const dummySize = Math.floor(resource.size / 1000);
                const buffer = Buffer.alloc(dummySize, 'DUMMY_DATA');
                await fs.writeFile(filepath, buffer);
                console.log(`Created dummy file: ${filename} (${dummySize} bytes)`);
            }
        }
    }

    private setupRoutes() {
        // ヘルスチェック
        this.app.get('/health', (req, res) => {
            res.json({ ok: true, service: 'asset-server', port: ASSET_PORT });
        });

        // リソース一覧API
        this.app.get('/api/resources', (req, res) => {
            const { type } = req.query;
            let filtered = this.resources;

            if (type) {
                filtered = this.resources.filter(r => r.type === String(type));
            }

            console.log(`Returning ${filtered.length} resources of type: ${type || 'all'}`);

            res.json({
                ok: true,
                resources: filtered.map(r => ({
                    id: r.id,
                    type: r.type,
                    name: r.name,
                    version: r.version,
                    size: r.size,
                    sha256: r.sha256,
                    redistributable: r.redistributable,
                    downloadUrl: r.redistributable ?
                        `http://localhost:${ASSET_PORT}${r.url}` :
                        r.url
                }))
            });
        });

        // 特定リソースの詳細
        this.app.get('/api/resources/:id', (req, res) => {
            const resource = this.resources.find(r => r.id === req.params.id);

            if (!resource) {
                return res.status(404).json({ ok: false, message: 'Resource not found' });
            }

            res.json({
                ok: true,
                resource: {
                    ...resource,
                    downloadUrl: resource.redistributable ?
                        `http://localhost:${ASSET_PORT}${resource.url}` :
                        resource.url
                }
            });
        });

        // ダウンロードエンドポイント（プログレス対応）
        this.app.get('/download/:type/:filename', async (req, res) => {
            const { type, filename } = req.params;
            const filepath = path.join(DUMMY_FILES_DIR, filename);

            console.log(`Download request: ${type}/${filename}`);

            try {
                const stat = await fs.stat(filepath);
                const fileSize = stat.size;

                // レンジリクエスト対応
                const range = req.headers.range;

                if (range) {
                    const parts: any = range.replace(/bytes=/, "").split("-");
                    const start = parseInt(parts[0], 10);
                    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
                    const chunksize = (end - start) + 1;

                    const stream = createReadStream(filepath, { start, end });

                    res.writeHead(206, {
                        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                        'Accept-Ranges': 'bytes',
                        'Content-Length': chunksize,
                        'Content-Type': 'application/octet-stream',
                    });

                    stream.pipe(res);
                } else {
                    // 通常のダウンロード
                    res.writeHead(200, {
                        'Content-Length': fileSize,
                        'Content-Type': 'application/octet-stream',
                        'Content-Disposition': `attachment; filename="${filename}"`,
                        'Accept-Ranges': 'bytes'
                    });

                    // 開発環境用に速度制限（プログレスバーを見やすくする）
                    const stream = createReadStream(filepath, {
                        highWaterMark: 8 * 1024 // 8KB chunks
                    });

                    let delay = 0;
                    stream.on('data', (chunk) => {
                        setTimeout(() => {
                            if (!res.writableEnded) {
                                res.write(chunk);
                            }
                        }, delay);
                        delay += 10; // 各チャンクに10msの遅延
                    });

                    stream.on('end', () => {
                        setTimeout(() => {
                            if (!res.writableEnded) {
                                res.end();
                                console.log(`Download completed: ${filename}`);
                            }
                        }, delay);
                    });

                    stream.on('error', (err) => {
                        console.error('Stream error:', err);
                        if (!res.writableEnded) {
                            res.end();
                        }
                    });
                }
            } catch (error) {
                console.error('Download error:', error);
                if (!res.headersSent) {
                    res.status(404).json({ ok: false, message: 'File not found' });
                }
            }
        });

        // 404ハンドラー
        this.app.use((req, res) => {
            res.status(404).json({
                ok: false,
                message: 'Not Found',
                path: req.path
            });
        });

        // エラーハンドラー
        this.app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
            console.error('Server error:', err);

            // CORSエラーの場合
            if (err.message === 'Not allowed by CORS') {
                res.status(403).json({
                    ok: false,
                    message: 'CORS policy violation',
                    origin: req.headers.origin
                });
                return;
            }

            res.status(500).json({
                ok: false,
                message: 'Internal Server Error',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        });
    }

    public start() {
        this.app.listen(ASSET_PORT, '0.0.0.0', () => {
            console.log(`=== Asset Server Started ===`);
            console.log(`Port: ${ASSET_PORT}`);
            console.log(`URL: http://localhost:${ASSET_PORT}/`);
            console.log(`Resources API: http://localhost:${ASSET_PORT}/api/resources`);
            console.log(`Health Check: http://localhost:${ASSET_PORT}/health`);
            console.log(`CORS: Accepting requests from localhost and 127.0.0.1`);
            console.log(`============================`);
        });
    }
}

// アセットサーバーを起動
if (require.main === module) {
    const assetServer = new AssetServer();
    assetServer.start();
}

export { AssetServer };

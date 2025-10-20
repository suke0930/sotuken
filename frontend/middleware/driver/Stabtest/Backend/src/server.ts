import express, { Express, Request, Response, NextFunction } from 'express';
import * as http from 'http';
import cors from 'cors';
import { WebSocketServer } from './services/WebSocketServer';
import { createRouter } from './routes';
import * as path from 'path';

/**
 * サーバー設定
 */
const PORT = process.env.PORT || 4000;
const ASSET_SERVER_URL = process.env.ASSET_SERVER_URL || 'http://localhost:3000';
const DOWNLOAD_DIR = process.env.DOWNLOAD_DIR || path.join(__dirname, '..', 'downloads');

/**
 * Expressアプリケーションを作成
 */
const app: Express = express();

/**
 * ミドルウェアの設定
 */
app.use(cors({
  origin: '*', // 開発用（本番では適切に制限してください）
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * リクエストロギング
 */
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

/**
 * HTTPサーバーを作成
 */
const server = http.createServer(app);

/**
 * WebSocketサーバーを初期化
 */
const wsServer = new WebSocketServer(server);

/**
 * ルーターを設定
 */
const router = createRouter(ASSET_SERVER_URL, wsServer, DOWNLOAD_DIR);
app.use(router);

/**
 * 404ハンドラー
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Endpoint not found',
      code: 'NOT_FOUND',
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * エラーハンドラー
 */
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  
  res.status(500).json({
    success: false,
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * サーバー起動
 */
server.listen(PORT, () => {
  console.log('');
  console.log('🚀 ========================================');
  console.log('   Backend Proxy Server');
  console.log('========================================== 🚀');
  console.log('');
  console.log(`📡 HTTP Server: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}/ws`);
  console.log(`🎯 Asset Server: ${ASSET_SERVER_URL}`);
  console.log(`📂 Download Dir: ${DOWNLOAD_DIR}`);
  console.log('');
  console.log('📋 Available Endpoints:');
  console.log('  GET  /health                  - Health check');
  console.log('  GET  /api/servers             - Get server list (via Asset)');
  console.log('  GET  /api/jdk                 - Get JDK list (via Asset)');
  console.log('  GET  /api/files/jdk           - Get JDK files (via Asset)');
  console.log('  GET  /api/files/servers       - Get server files (via Asset)');
  console.log('  GET  /api/health/asset        - Asset server health');
  console.log('  POST /api/download/jdk        - Download JDK');
  console.log('  POST /api/download/server     - Download server');
  console.log('  POST /api/download/cancel/:id - Cancel download');
  console.log('  GET  /api/download/tasks      - Get active tasks');
  console.log('');
  console.log('✅ Server is ready!');
  console.log('');
});

/**
 * Graceful shutdown
 */
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    wsServer.close();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    wsServer.close();
    process.exit(0);
  });
});

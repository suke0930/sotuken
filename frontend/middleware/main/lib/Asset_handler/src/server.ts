import http from 'http';
import app from './app';
import { WebSocketManager } from './lib/WebSocketManager';
import { setWebSocketManager } from './controllers/downloadController';

const PORT = process.env.PORT || 4000;

// HTTPサーバーを作成
const server = http.createServer(app);

// WebSocketマネージャーを初期化
const wsManager = new WebSocketManager(server);
setWebSocketManager(wsManager);

// サーバー起動
server.listen(PORT, () => {
  console.log('========================================');
  console.log('🚀 Backend Proxy Server Started');
  console.log('========================================');
  console.log(`📡 HTTP Server: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket Server: ws://localhost:${PORT}`);
  console.log('========================================');
  console.log('📋 Available Endpoints:');
  console.log(`   GET  /health - Health check`);
  console.log(`   GET  /api/list/servers - Get servers list`);
  console.log(`   GET  /api/list/jdk - Get JDK list`);
  console.log(`   GET  /api/list/assets/:type - Get asset files`);
  console.log(`   POST /api/download - Start download`);
  console.log(`   GET  /api/download/:taskId - Get download status`);
  console.log(`   GET  /api/downloads - Get active downloads`);
  console.log(`   DELETE /api/download/:taskId - Cancel download`);
  console.log('========================================');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  wsManager.close();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, closing server...');
  wsManager.close();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

import app from './app';
import { setupJDKs } from './lib/jdkSetup';
import { setupServers } from './lib/serverSetup';

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || 'localhost';
const PROTOCOL = process.env.PROTOCOL || 'http';
const BASE_URL = (process.env.BASE_URL || `${PROTOCOL}://${HOST}:${PORT}`).replace(/\/$/, '');

// 起動モード判定
const args = process.argv.slice(2);
const isTestMode = args.includes('--test') || process.env.NODE_ENV === 'test';
const isDevMode = process.env.NODE_ENV === 'development';
const shouldSetup = isTestMode || isDevMode;

async function startServer() {
  // JDK自動セットアップ（test/devモードの場合）
  if (shouldSetup) {
    try {
      await setupJDKs(BASE_URL);
    } catch (error) {
      console.error('⚠️  JDK setup failed, but server will continue to start');
      console.error(error);
    }

    // Minecraftサーバー自動セットアップ
    try {
      await setupServers(BASE_URL);
    } catch (error) {
      console.error('⚠️  Server setup failed, but server will continue to start');
      console.error(error);
    }
  }

  const server = app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📡 Health check: ${BASE_URL}/health`);
    console.log(`🎮 Minecraft Servers API: ${BASE_URL}/api/v1/servers`);
    console.log(`☕ JDK API: ${BASE_URL}/api/v1/jdk`);

    if (shouldSetup) {
      console.log(`🔧 Mode: ${isTestMode ? 'TEST' : 'DEVELOPMENT'} (Auto-setup enabled)`);
    } else {
      console.log(`🔧 Mode: PRODUCTION`);
    }
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
    });
  });

  return server;
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

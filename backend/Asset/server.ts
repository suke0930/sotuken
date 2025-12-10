import app from './app';
import { setupJDKs } from './lib/jdkSetup';
import { setupServers } from './lib/serverSetup';

const PORT = process.env.PORT || 3000;

// 起動モード判定
const args = process.argv.slice(2);
const isTestMode = args.includes('--test') || process.env.NODE_ENV === 'test';
const isDevMode = process.env.NODE_ENV === 'development';
const shouldSetup = isTestMode || isDevMode;

async function startServer() {
  // JDK自動セットアップ（test/devモードの場合）
  if (shouldSetup) {
    try {
      await setupJDKs(`http://localhost:${PORT}`);
    } catch (error) {
      console.error('⚠️  JDK setup failed, but server will continue to start');
      console.error(error);
    }

    // Minecraftサーバー自動セットアップ
    try {
      await setupServers(`http://localhost:${PORT}`);
    } catch (error) {
      console.error('⚠️  Server setup failed, but server will continue to start');
      console.error(error);
    }
  }

  const server = app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/health`);
    console.log(`🎮 Minecraft Servers API: http://localhost:${PORT}/api/v1/servers`);
    console.log(`☕ JDK API: http://localhost:${PORT}/api/v1/jdk`);

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

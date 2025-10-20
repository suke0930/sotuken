import express, { Application, Request, Response, NextFunction } from 'express';
import apiRoutes from './routes/index';

const app: Application = express();

// ミドルウェア設定
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS設定（開発環境用）
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// ヘルスチェックエンドポイント
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// API ルート
app.use('/api', apiRoutes);

// 404 ハンドラー
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'エンドポイントが見つかりません',
      code: 'NOT_FOUND',
    },
    timestamp: new Date().toISOString(),
  });
});

// エラーハンドラー
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  
  res.status(500).json({
    success: false,
    error: {
      message: '内部サーバーエラーが発生しました',
      code: 'INTERNAL_ERROR',
    },
    timestamp: new Date().toISOString(),
  });
});

export default app;

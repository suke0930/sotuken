import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import router from './routes';

const app = express();

// ========================================
// Middleware
// ========================================

// CORS設定
app.use(cors({
  origin: '*', // 開発用：すべてのオリジンを許可
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// JSON解析
app.use(express.json());

// リクエストログ
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ========================================
// Routes
// ========================================

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Backend Proxy Server',
  });
});

// API routes
app.use('/api', router);

// Static files (public directory)
app.use(express.static('public'));

// ========================================
// Error Handling
// ========================================

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Endpoint not found',
      code: 'NOT_FOUND',
      path: req.path,
    },
    timestamp: new Date().toISOString(),
  });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('❌ Unhandled error:', err);
  
  res.status(500).json({
    success: false,
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
    },
    timestamp: new Date().toISOString(),
  });
});

export default app;

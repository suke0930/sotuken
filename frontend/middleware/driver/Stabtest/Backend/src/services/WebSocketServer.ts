import { WebSocketServer as WSServer, WebSocket } from 'ws';
import { Server as HTTPServer } from 'http';
import { DownloadProgress } from './DownloadTask';

/**
 * WebSocketメッセージの型定義
 */
export type WSMessageType = 
  | 'download:start'
  | 'download:progress'
  | 'download:complete'
  | 'download:error'
  | 'download:cancel'
  | 'ping'
  | 'pong';

/**
 * WebSocketメッセージの基本構造
 */
export interface WSMessage<T = any> {
  type: WSMessageType;
  taskId?: string;
  data?: T;
  timestamp: string;
}

/**
 * ダウンロード開始リクエスト
 */
export interface DownloadStartRequest {
  url: string;
  filename?: string;
}

/**
 * ダウンロード進捗メッセージ
 */
export interface DownloadProgressMessage extends DownloadProgress {
  taskId: string;
  filename: string;
  speedMBps: string; // "2.5 MB/s" 形式
  progressText: string; // "25.5 MB / 100.0 MB" 形式
}

/**
 * ダウンロード完了メッセージ
 */
export interface DownloadCompleteMessage {
  taskId: string;
  filename: string;
  filepath: string;
  totalBytes: number;
  duration: number; // 秒
}

/**
 * エラーメッセージ
 */
export interface ErrorMessage {
  message: string;
  code?: string;
}

/**
 * WebSocketサーバークラス
 * 
 * クライアントとのWebSocket通信を管理し、
 * ダウンロード進捗をリアルタイムで送信します。
 */
export class WebSocketServer {
  private wss: WSServer;
  private clients: Set<WebSocket> = new Set();
  
  constructor(server: HTTPServer) {
    this.wss = new WSServer({ server, path: '/ws' });
    this.initialize();
  }
  
  /**
   * WebSocketサーバーを初期化
   */
  private initialize(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('✅ WebSocket client connected');
      this.clients.add(ws);
      
      // クライアントからのメッセージを処理
      ws.on('message', (message: Buffer) => {
        try {
          const data = JSON.parse(message.toString()) as WSMessage;
          this.handleMessage(ws, data);
        } catch (error) {
          console.error('Invalid WebSocket message:', error);
        }
      });
      
      // クライアント切断時
      ws.on('close', () => {
        console.log('❌ WebSocket client disconnected');
        this.clients.delete(ws);
      });
      
      // エラー処理
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });
      
      // 接続確認メッセージを送信
      this.sendMessage(ws, {
        type: 'pong',
        data: { message: 'Connected to download server' },
        timestamp: new Date().toISOString(),
      });
    });
    
    console.log('🔌 WebSocket server initialized on path /ws');
  }
  
  /**
   * クライアントからのメッセージを処理
   */
  private handleMessage(ws: WebSocket, message: WSMessage): void {
    switch (message.type) {
      case 'ping':
        this.sendMessage(ws, {
          type: 'pong',
          timestamp: new Date().toISOString(),
        });
        break;
        
      // 他のメッセージタイプは必要に応じて追加
      default:
        console.log('Unhandled message type:', message.type);
    }
  }
  
  /**
   * 特定のクライアントにメッセージを送信
   */
  sendMessage(ws: WebSocket, message: WSMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }
  
  /**
   * すべてのクライアントにメッセージをブロードキャスト
   */
  broadcast(message: WSMessage): void {
    this.clients.forEach((client) => {
      this.sendMessage(client, message);
    });
  }
  
  /**
   * ダウンロード進捗をブロードキャスト
   */
  broadcastProgress(taskId: string, filename: string, progress: DownloadProgress): void {
    const progressMessage: DownloadProgressMessage = {
      ...progress,
      taskId,
      filename,
      speedMBps: this.formatSpeed(progress.speedBytesPerSecond),
      progressText: this.formatProgress(progress.downloadedBytes, progress.totalBytes),
    };
    
    this.broadcast({
      type: 'download:progress',
      taskId,
      data: progressMessage,
      timestamp: new Date().toISOString(),
    });
  }
  
  /**
   * ダウンロード完了をブロードキャスト
   */
  broadcastComplete(taskId: string, filename: string, filepath: string, totalBytes: number, duration: number): void {
    const completeMessage: DownloadCompleteMessage = {
      taskId,
      filename,
      filepath,
      totalBytes,
      duration,
    };
    
    this.broadcast({
      type: 'download:complete',
      taskId,
      data: completeMessage,
      timestamp: new Date().toISOString(),
    });
  }
  
  /**
   * エラーをブロードキャスト
   */
  broadcastError(taskId: string, error: Error): void {
    const errorMessage: ErrorMessage = {
      message: error.message,
      code: 'DOWNLOAD_ERROR',
    };
    
    this.broadcast({
      type: 'download:error',
      taskId,
      data: errorMessage,
      timestamp: new Date().toISOString(),
    });
  }
  
  /**
   * ダウンロード速度をフォーマット
   */
  private formatSpeed(bytesPerSecond: number): string {
    const mbps = bytesPerSecond / (1024 * 1024);
    const kbps = bytesPerSecond / 1024;
    
    if (mbps >= 1) {
      return `${mbps.toFixed(2)} MB/s`;
    } else if (kbps >= 1) {
      return `${kbps.toFixed(2)} KB/s`;
    } else {
      return `${bytesPerSecond.toFixed(0)} B/s`;
    }
  }
  
  /**
   * ダウンロード進捗テキストをフォーマット
   */
  private formatProgress(downloaded: number, total: number): string {
    const downloadedMB = (downloaded / (1024 * 1024)).toFixed(2);
    const totalMB = (total / (1024 * 1024)).toFixed(2);
    return `${downloadedMB} MB / ${totalMB} MB`;
  }
  
  /**
   * WebSocketサーバーをクローズ
   */
  close(): void {
    this.clients.forEach((client) => {
      client.close();
    });
    this.wss.close();
    console.log('🔌 WebSocket server closed');
  }
}

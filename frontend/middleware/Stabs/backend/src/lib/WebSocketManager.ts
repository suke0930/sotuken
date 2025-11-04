import { WebSocket, WebSocketServer } from 'ws';
import { Server as HTTPServer } from 'http';
import { DownloadProgress } from './DownloadTask';

/**
 * WebSocketメッセージタイプ
 */
export type WSMessageType = 
  | 'download_progress'
  | 'download_complete'
  | 'download_error'
  | 'ping'
  | 'pong';

/**
 * WebSocketメッセージフォーマット
 */
export interface WSMessage {
  type: WSMessageType;
  data?: any;
  timestamp: string;
}

/**
 * WebSocket接続管理クラス
 */
export class WebSocketManager {
  private wss: WebSocketServer;
  private clients: Set<WebSocket> = new Set();

  constructor(server: HTTPServer) {
    this.wss = new WebSocketServer({ server });
    this.setupWebSocketServer();
  }

  /**
   * WebSocketサーバーのセットアップ
   */
  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('✅ WebSocket client connected');
      this.clients.add(ws);

      // Ping/Pong for keep-alive
      ws.on('message', (message: Buffer) => {
        try {
          const data = JSON.parse(message.toString()) as WSMessage;
          
          if (data.type === 'ping') {
            this.sendToClient(ws, {
              type: 'pong',
              timestamp: new Date().toISOString(),
            });
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        console.log('❌ WebSocket client disconnected');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });

      // 接続確認メッセージを送信
      this.sendToClient(ws, {
        type: 'ping',
        data: { message: 'Connected to download server' },
        timestamp: new Date().toISOString(),
      });
    });
  }

  /**
   * ダウンロード進捗をブロードキャスト
   */
  broadcastProgress(progress: DownloadProgress): void {
    this.broadcast({
      type: 'download_progress',
      data: progress,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * ダウンロード完了を通知
   */
  broadcastComplete(taskId: string, filename: string): void {
    this.broadcast({
      type: 'download_complete',
      data: { taskId, filename },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * エラーを通知
   */
  broadcastError(taskId: string, error: string): void {
    this.broadcast({
      type: 'download_error',
      data: { taskId, error },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 全クライアントにメッセージをブロードキャスト
   */
  private broadcast(message: WSMessage): void {
    const messageStr = JSON.stringify(message);
    
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }

  /**
   * 特定のクライアントにメッセージを送信
   */
  private sendToClient(client: WebSocket, message: WSMessage): void {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  }

  /**
   * 接続中のクライアント数を取得
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * WebSocketサーバーをクローズ
   */
  close(): void {
    this.clients.forEach((client) => {
      client.close();
    });
    this.wss.close();
  }
}

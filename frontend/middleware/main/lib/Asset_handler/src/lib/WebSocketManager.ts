import { WebSocket } from 'ws';
import { DownloadProgress } from './DownloadTask';
import expressWs from 'express-ws';
import { Request as ExpressRequest } from 'express';
import { MiddlewareManager } from '../../../middleware-manager';

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
 * クライアント情報
 */
interface ClientInfo {
  userId: string;
  connectedAt: Date;
}

/**
 * WebSocket接続管理クラス
 */
export class WebSocketManager {
  private clients: Map<WebSocket, ClientInfo> = new Map();
  private basepath: string;
  private expressWsInstance: expressWs.Instance;
  private middlewareManager: MiddlewareManager;

  constructor(
    serv: expressWs.Instance,
    basepath: string,
    middlewareManager: MiddlewareManager
  ) {
    this.expressWsInstance = serv;
    this.basepath = basepath;
    this.middlewareManager = middlewareManager;
    this.setupWebSocketRoute();
  }

  /**
   * WebSocketルートのセットアップ
   */
  private setupWebSocketRoute(): void {
    this.expressWsInstance.app.ws(this.basepath, (ws: WebSocket, req: ExpressRequest) => {
      console.log('🔌 WebSocket connection attempt from:', req.headers.origin);

      // セッションミドルウェアを明示的に実行
      // express-wsのアップグレード時にミドルウェアチェーンが正しく実行されない場合があるため
      this.middlewareManager.sessionMiddleware(req, {} as any, (err?: any) => {
        if (err) {
          console.error('❌ Session middleware error:', err);
          // エラーメッセージを送信してから切断
          this.sendErrorAndClose(ws, 1011, 'Session processing failed', 'セッション処理中にエラーが発生しました');
          return;
        }

        // WebSocket接続内で認証チェック
        const authResult = this.middlewareManager.checkWebSocketAuth(req);

        if (!authResult.authenticated || !authResult.userId) {
          console.log('❌ WebSocket authentication failed - closing connection');
          // 認証失敗メッセージを送信してから切断
          this.sendErrorAndClose(ws, 1008, 'Authentication failed', '認証に失敗しました。ログインしてください。');
          return;
        }

        console.log('✅ WebSocket client connected - User:', authResult.userId);
        this.handleConnection(ws, authResult.userId);
      });
    });

    console.log(`✅ WebSocket endpoint setup at: ${this.basepath}`);
  }

  /**
   * WebSocket接続のハンドリング
   */
  private handleConnection(ws: WebSocket, userId: string): void {
    // ユーザー情報と一緒にクライアントを保存
    this.clients.set(ws, {
      userId,
      connectedAt: new Date(),
    });

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
      console.log('❌ WebSocket client disconnected - User:', userId);
      this.clients.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.clients.delete(ws);
    });

    // 接続確認メッセージを送信
    this.sendToClient(ws, {
      type: 'ping',
      data: { message: 'Connected to download server', userId },
      timestamp: new Date().toISOString(),
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

    this.clients.forEach((clientInfo, ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
      }
    });
  }

  /**
   * 特定のクライアントにメッセージを送信
   */
  private sendToClient(ws: WebSocket, message: WSMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * エラーメッセージを送信してから接続をクローズ
   */
  private sendErrorAndClose(ws: WebSocket, code: number, reason: string, userMessage: string): void {
    try {
      // エラーメッセージを送信（接続が確立されている場合のみ）
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        const errorMessage: WSMessage = {
          type: 'download_error',
          data: { error: userMessage, reason },
          timestamp: new Date().toISOString(),
        };
        ws.send(JSON.stringify(errorMessage));
      }
    } catch (error) {
      console.error('Failed to send error message:', error);
    } finally {
      // メッセージ送信後、少し待ってから切断
      setTimeout(() => {
        ws.close(code, reason);
      }, 100);
    }
  }

  /**
   * 特定ユーザーにのみメッセージを送信
   */
  sendToUser(userId: string, message: WSMessage): void {
    this.clients.forEach((clientInfo, ws) => {
      if (clientInfo.userId === userId && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    });
  }

  /**
   * 接続中のクライアント数を取得
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * すべてのクライアント接続をクローズ
   */
  close(): void {
    this.clients.forEach((clientInfo, ws) => {
      ws.close();
    });
    this.clients.clear();
  }
}
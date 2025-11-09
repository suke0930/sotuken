import { WebSocket } from 'ws';
import expressWs from 'express-ws';
import { Request as ExpressRequest } from 'express';
import { MiddlewareManager } from '../middleware-manager';
import { createModuleLogger } from '../logger';
import { Logger } from 'pino';

/**
 * WebSocketメッセージフォーマット
 * ジェネリック型で柔軟にメッセージタイプとデータ型を定義可能
 */
export interface WSMessage<T = any, D = any> {
  type: T;
  data?: D;
  timestamp: string;
}

/**
 * クライアント情報
 */
export interface ClientInfo {
  userId: string;
  connectedAt: Date;
  metadata?: Record<string, any>;
}

/**
 * メッセージハンドラーの型定義
 */
export type MessageHandler<T = any, D = any> = (
  ws: WebSocket,
  message: WSMessage<T, D>,
  clientInfo: ClientInfo
) => void | Promise<void>;

/**
 * 接続ハンドラーの型定義
 */
export type ConnectionHandler = (
  ws: WebSocket,
  userId: string,
  req: ExpressRequest
) => void | Promise<void>;

/**
 * 切断ハンドラーの型定義
 */
export type DisconnectionHandler = (
  ws: WebSocket,
  userId: string,
  clientInfo: ClientInfo
) => void | Promise<void>;

/**
 * 汎用WebSocket接続管理クラス
 * 
 * @template MessageType - WebSocketメッセージのタイプ（例: 'ping' | 'pong' | 'data'）
 * @template DataType - WebSocketメッセージのデータ型
 * 
 * @example
 * ```typescript
 * type MyMessageType = 'download_progress' | 'download_complete';
 * type MyDataType = { taskId: string; progress: number };
 * 
 * class DownloadWebSocketManager extends GenericWebSocketManager<MyMessageType, MyDataType> {
 *   constructor(...) {
 *     super(...);
 *     this.on('download_progress', (ws, message) => {
 *       // Handle download progress
 *     });
 *   }
 * }
 * ```
 */
export class GenericWebSocketManager<MessageType = string, DataType = any> {
  protected clients: Map<WebSocket, ClientInfo> = new Map();
  protected basepath: string;
  protected expressWsInstance: expressWs.Instance;
  protected middlewareManager: MiddlewareManager;
  protected logger: Logger;
  protected messageHandlers: Map<MessageType, Set<MessageHandler<MessageType, DataType>>> = new Map();
  protected connectionHandlers: Set<ConnectionHandler> = new Set();
  protected disconnectionHandlers: Set<DisconnectionHandler> = new Set();

  /**
   * コンストラクタ
   * 
   * @param serv - express-wsインスタンス
   * @param basepath - WebSocketエンドポイントのパス（例: '/ws/download'）
   * @param middlewareManager - 認証・セッション管理用のミドルウェアマネージャー
   * @param loggerName - ロガー名（モジュール識別用）
   */
  constructor(
    serv: expressWs.Instance,
    basepath: string,
    middlewareManager: MiddlewareManager,
    loggerName: string
  ) {
    this.expressWsInstance = serv;
    this.basepath = basepath;
    this.middlewareManager = middlewareManager;
    this.logger = createModuleLogger(loggerName);
    
    // デフォルトのping/pongハンドラーを登録
    this.setupDefaultHandlers();
    
    // WebSocketルートをセットアップ
    this.setupWebSocketRoute();
  }

  /**
   * デフォルトハンドラーのセットアップ（ping/pong）
   */
  private setupDefaultHandlers(): void {
    this.on('ping' as any, (ws, message) => {
      this.sendToClient(ws, {
        type: 'pong' as MessageType,
        timestamp: new Date().toISOString(),
      });
    });
  }

  /**
   * WebSocketルートのセットアップ
   */
  private setupWebSocketRoute(): void {
    this.expressWsInstance.app.ws(this.basepath, (ws: WebSocket, req: ExpressRequest) => {
      this.logger.info({ origin: req.headers.origin }, '🔌 WebSocket connection attempt');

      // セッションミドルウェアを明示的に実行
      this.middlewareManager.sessionMiddleware(req, {} as any, (err?: any) => {
        if (err) {
          this.logger.error({ err }, 'Session middleware error');
          this.sendErrorAndClose(ws, 1011, 'Session processing failed', 'セッション処理中にエラーが発生しました');
          return;
        }

        // WebSocket接続内で認証チェック
        const authResult = this.middlewareManager.checkWebSocketAuth(req);

        if (!authResult.authenticated || !authResult.userId) {
          this.logger.warn('WebSocket authentication failed - closing connection');
          this.sendErrorAndClose(ws, 1008, 'Authentication failed', '認証に失敗しました。ログインしてください。');
          return;
        }

        this.logger.info({ userId: authResult.userId }, 'WebSocket client connected');
        this.handleConnection(ws, authResult.userId, req);
      });
    });

    this.logger.info({ basepath: this.basepath }, `WebSocket endpoint setup`);
  }

  /**
   * WebSocket接続のハンドリング
   */
  private handleConnection(ws: WebSocket, userId: string, req: ExpressRequest): void {
    // クライアント情報を保存
    const clientInfo: ClientInfo = {
      userId,
      connectedAt: new Date(),
      metadata: {}
    };
    this.clients.set(ws, clientInfo);

    // 接続ハンドラーを実行
    this.connectionHandlers.forEach(handler => {
      try {
        handler(ws, userId, req);
      } catch (error) {
        this.logger.error({ err: error, userId }, 'Connection handler error');
      }
    });

    // メッセージハンドリング
    ws.on('message', (message: Buffer) => {
      this.handleMessage(ws, message, clientInfo);
    });

    // 切断処理
    ws.on('close', () => {
      this.logger.info({ userId }, 'WebSocket client disconnected');
      
      // 切断ハンドラーを実行
      this.disconnectionHandlers.forEach(handler => {
        try {
          handler(ws, userId, clientInfo);
        } catch (error) {
          this.logger.error({ err: error, userId }, 'Disconnection handler error');
        }
      });
      
      this.clients.delete(ws);
    });

    // エラーハンドリング
    ws.on('error', (error) => {
      this.logger.error({ err: error, userId }, 'WebSocket error');
      this.clients.delete(ws);
    });

    // 接続確認メッセージを送信
    this.sendToClient(ws, {
      type: 'ping' as MessageType,
      data: { message: 'Connected to server', userId } as DataType,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * メッセージハンドリング
   */
  private handleMessage(ws: WebSocket, messageBuffer: Buffer, clientInfo: ClientInfo): void {
    try {
      const message = JSON.parse(messageBuffer.toString()) as WSMessage<MessageType, DataType>;
      
      // メッセージハンドラーを実行
      const handlers = this.messageHandlers.get(message.type);
      if (handlers && handlers.size > 0) {
        handlers.forEach(handler => {
          try {
            handler(ws, message, clientInfo);
          } catch (error) {
            this.logger.error({ err: error, userId: clientInfo.userId, messageType: message.type }, 'Message handler error');
          }
        });
      } else {
        this.logger.debug({ messageType: message.type, userId: clientInfo.userId }, 'No handler registered for message type');
      }
    } catch (error) {
      this.logger.error({ err: error, userId: clientInfo.userId }, 'Failed to parse WebSocket message');
    }
  }

  /**
   * メッセージハンドラーを登録
   * 
   * @param messageType - 監視するメッセージタイプ
   * @param handler - メッセージ受信時のコールバック関数
   */
  public on(messageType: MessageType, handler: MessageHandler<MessageType, DataType>): void {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, new Set());
    }
    this.messageHandlers.get(messageType)!.add(handler);
  }

  /**
   * メッセージハンドラーを解除
   * 
   * @param messageType - 解除するメッセージタイプ
   * @param handler - 解除するコールバック関数
   */
  public off(messageType: MessageType, handler: MessageHandler<MessageType, DataType>): void {
    const handlers = this.messageHandlers.get(messageType);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * 接続時のハンドラーを登録
   * 
   * @param handler - 接続時のコールバック関数
   */
  public onConnection(handler: ConnectionHandler): void {
    this.connectionHandlers.add(handler);
  }

  /**
   * 切断時のハンドラーを登録
   * 
   * @param handler - 切断時のコールバック関数
   */
  public onDisconnection(handler: DisconnectionHandler): void {
    this.disconnectionHandlers.add(handler);
  }

  /**
   * 全クライアントにメッセージをブロードキャスト
   * 
   * @param message - 送信するメッセージ
   */
  public broadcast(message: WSMessage<MessageType, DataType>): void {
    const messageStr = JSON.stringify(message);

    this.clients.forEach((clientInfo, ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
      }
    });
  }

  /**
   * 特定のクライアントにメッセージを送信
   * 
   * @param ws - 送信先WebSocket
   * @param message - 送信するメッセージ
   */
  public sendToClient(ws: WebSocket, message: WSMessage<MessageType, DataType>): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * 特定ユーザーにのみメッセージを送信
   * 
   * @param userId - 送信先ユーザーID
   * @param message - 送信するメッセージ
   */
  public sendToUser(userId: string, message: WSMessage<MessageType, DataType>): void {
    this.clients.forEach((clientInfo, ws) => {
      if (clientInfo.userId === userId && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    });
  }

  /**
   * 条件に一致するクライアントにメッセージを送信
   * 
   * @param predicate - フィルター条件
   * @param message - 送信するメッセージ
   */
  public sendToMatching(
    predicate: (clientInfo: ClientInfo) => boolean,
    message: WSMessage<MessageType, DataType>
  ): void {
    const messageStr = JSON.stringify(message);
    
    this.clients.forEach((clientInfo, ws) => {
      if (predicate(clientInfo) && ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
      }
    });
  }

  /**
   * エラーメッセージを送信してから接続をクローズ
   * 
   * @param ws - 切断するWebSocket
   * @param code - 切断コード
   * @param reason - 切断理由
   * @param userMessage - ユーザー向けエラーメッセージ
   */
  protected sendErrorAndClose(ws: WebSocket, code: number, reason: string, userMessage: string): void {
    try {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        const errorMessage: WSMessage<MessageType, DataType> = {
          type: 'error' as MessageType,
          data: { error: userMessage, reason } as DataType,
          timestamp: new Date().toISOString(),
        };
        ws.send(JSON.stringify(errorMessage));
      }
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to send error message');
    } finally {
      setTimeout(() => {
        ws.close(code, reason);
      }, 100);
    }
  }

  /**
   * 接続中のクライアント数を取得
   * 
   * @returns 接続中のクライアント数
   */
  public getClientCount(): number {
    return this.clients.size;
  }

  /**
   * 特定ユーザーの接続数を取得
   * 
   * @param userId - ユーザーID
   * @returns 指定ユーザーの接続数
   */
  public getUserConnectionCount(userId: string): number {
    let count = 0;
    this.clients.forEach(clientInfo => {
      if (clientInfo.userId === userId) {
        count++;
      }
    });
    return count;
  }

  /**
   * すべてのクライアント接続をクローズ
   */
  public close(): void {
    this.clients.forEach((clientInfo, ws) => {
      ws.close();
    });
    this.clients.clear();
  }

  /**
   * クライアント情報を取得
   * 
   * @param ws - WebSocketインスタンス
   * @returns クライアント情報またはundefined
   */
  public getClientInfo(ws: WebSocket): ClientInfo | undefined {
    return this.clients.get(ws);
  }

  /**
   * 全クライアント情報を取得
   * 
   * @returns 全クライアント情報の配列
   */
  public getAllClients(): ClientInfo[] {
    return Array.from(this.clients.values());
  }
}

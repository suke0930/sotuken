import { GenericWebSocketManager, WSMessage, ClientInfo } from '../../../websocket/GenericWebSocketManager';
import expressWs from 'express-ws';
import { MiddlewareManager } from '../../../middleware-manager';
import { WebSocket } from 'ws';
import { InstanceEventType } from '../types/callbacks';

/**
 * Minecraftサーバー WebSocketメッセージタイプ
 */
export type MCServerWSMessageType =
  | 'server_stdout'           // サーバー標準出力
  | 'server_stderr'           // サーバー標準エラー出力
  | 'server_started'          // サーバー起動
  | 'server_stopped'          // サーバー停止
  | 'server_crashed'          // サーバークラッシュ
  | 'server_auto_restarted'   // 自動再起動
  | 'server_auto_restart_limit_reached'  // 自動再起動上限到達
  | 'server_stop_timeout'     // 停止タイムアウト
  | 'server_forced_kill'      // 強制終了
  | 'subscribe'               // サーバー監視開始リクエスト
  | 'unsubscribe'             // サーバー監視停止リクエスト
  | 'ping'
  | 'pong'
  | 'error';

/**
 * Minecraftサーバー WebSocketデータ型
 */
export type MCServerWSData =
  | { uuid: string; line: string }                    // stdout/stderr
  | { uuid: string }                                  // サーバーイベント（基本）
  | { uuid: string; exitCode: number }                // stopped
  | { uuid: string; error: string }                   // crashed
  | { uuid: string; consecutiveCount: number }        // auto_restarted
  | { uuid: string; message: string }                 // stop_timeout
  | { uuid: string }                                  // subscribe/unsubscribe
  | { message: string; userId?: string }              // ping/pong
  | { error: string; reason?: string };               // error

/**
 * クライアントのサブスクリプション情報を拡張
 */
interface MCClientInfo extends ClientInfo {
  subscribedServers: Set<string>;  // 監視中のサーバーUUID一覧
}

/**
 * Minecraftサーバー専用WebSocketマネージャー
 * 
 * 主な機能:
 * - サーバーの標準出力/エラー出力のリアルタイム配信
 * - サーバーイベント（起動/停止/クラッシュ等）の通知
 * - クライアントごとのサーバー監視サブスクリプション管理
 */
export class MCServerWebSocketManager extends GenericWebSocketManager<MCServerWSMessageType, MCServerWSData> {
  // クライアント情報をMCClientInfo型として再定義
  protected clients!: Map<WebSocket, MCClientInfo>;

  constructor(
    serv: expressWs.Instance,
    basepath: string,
    middlewareManager: MiddlewareManager
  ) {
    super(serv, basepath, middlewareManager, 'mcserver:websocket');

    // 接続時に拡張情報を初期化
    this.onConnection((ws) => {
      const clientInfo = this.clients.get(ws);
      if (clientInfo) {
        (clientInfo as MCClientInfo).subscribedServers = new Set();
      }
    });

    // サブスクリプションリクエストのハンドラー
    this.setupSubscriptionHandlers();
  }

  /**
   * サブスクリプション関連のハンドラーをセットアップ
   */
  private setupSubscriptionHandlers(): void {
    // サーバー監視開始
    this.on('subscribe', (ws, message) => {
      const clientInfo = this.clients.get(ws) as MCClientInfo;
      if (clientInfo && message.data && 'uuid' in message.data) {
        const uuid = message.data.uuid;
        clientInfo.subscribedServers.add(uuid);
        
        this.logger.info(
          { userId: clientInfo.userId, serverUuid: uuid },
          'Client subscribed to server'
        );

        // 確認メッセージを送信
        this.sendToClient(ws, {
          type: 'subscribe',
          data: { uuid, message: 'Subscription successful' },
          timestamp: new Date().toISOString(),
        } as any);
      }
    });

    // サーバー監視停止
    this.on('unsubscribe', (ws, message) => {
      const clientInfo = this.clients.get(ws) as MCClientInfo;
      if (clientInfo && message.data && 'uuid' in message.data) {
        const uuid = message.data.uuid;
        clientInfo.subscribedServers.delete(uuid);
        
        this.logger.info(
          { userId: clientInfo.userId, serverUuid: uuid },
          'Client unsubscribed from server'
        );

        // 確認メッセージを送信
        this.sendToClient(ws, {
          type: 'unsubscribe',
          data: { uuid, message: 'Unsubscription successful' },
          timestamp: new Date().toISOString(),
        } as any);
      }
    });
  }

  /**
   * 特定サーバーを監視中のクライアントにのみメッセージを送信
   * 
   * @param serverUuid - サーバーUUID
   * @param message - 送信するメッセージ
   */
  public sendToServerSubscribers(serverUuid: string, message: WSMessage<MCServerWSMessageType, MCServerWSData>): void {
    const messageStr = JSON.stringify(message);
    
    this.clients.forEach((clientInfo, ws) => {
      const mcClientInfo = clientInfo as MCClientInfo;
      if (mcClientInfo.subscribedServers.has(serverUuid) && ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
      }
    });
  }

  /**
   * サーバーの標準出力を配信
   * 
   * @param serverUuid - サーバーUUID
   * @param line - 出力行
   */
  public sendStdout(serverUuid: string, line: string): void {
    this.sendToServerSubscribers(serverUuid, {
      type: 'server_stdout',
      data: { uuid: serverUuid, line },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * サーバーの標準エラー出力を配信
   * 
   * @param serverUuid - サーバーUUID
   * @param line - エラー出力行
   */
  public sendStderr(serverUuid: string, line: string): void {
    this.sendToServerSubscribers(serverUuid, {
      type: 'server_stderr',
      data: { uuid: serverUuid, line },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * サーバー起動イベントを配信
   * 
   * @param serverUuid - サーバーUUID
   */
  public notifyServerStarted(serverUuid: string): void {
    this.sendToServerSubscribers(serverUuid, {
      type: 'server_started',
      data: { uuid: serverUuid },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * サーバー停止イベントを配信
   * 
   * @param serverUuid - サーバーUUID
   * @param exitCode - 終了コード
   */
  public notifyServerStopped(serverUuid: string, exitCode: number): void {
    this.sendToServerSubscribers(serverUuid, {
      type: 'server_stopped',
      data: { uuid: serverUuid, exitCode },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * サーバークラッシュイベントを配信
   * 
   * @param serverUuid - サーバーUUID
   * @param error - エラー情報
   */
  public notifyServerCrashed(serverUuid: string, error: Error): void {
    this.sendToServerSubscribers(serverUuid, {
      type: 'server_crashed',
      data: { uuid: serverUuid, error: error.message },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * サーバー自動再起動イベントを配信
   * 
   * @param serverUuid - サーバーUUID
   * @param consecutiveCount - 連続再起動回数
   */
  public notifyAutoRestarted(serverUuid: string, consecutiveCount: number): void {
    this.sendToServerSubscribers(serverUuid, {
      type: 'server_auto_restarted',
      data: { uuid: serverUuid, consecutiveCount },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 自動再起動上限到達イベントを配信
   * 
   * @param serverUuid - サーバーUUID
   */
  public notifyAutoRestartLimitReached(serverUuid: string): void {
    this.sendToServerSubscribers(serverUuid, {
      type: 'server_auto_restart_limit_reached',
      data: { uuid: serverUuid },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 停止タイムアウトイベントを配信
   * 
   * @param serverUuid - サーバーUUID
   * @param message - タイムアウトメッセージ
   */
  public notifyStopTimeout(serverUuid: string, message: string): void {
    this.sendToServerSubscribers(serverUuid, {
      type: 'server_stop_timeout',
      data: { uuid: serverUuid, message },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 強制終了イベントを配信
   * 
   * @param serverUuid - サーバーUUID
   */
  public notifyForcedKill(serverUuid: string): void {
    this.sendToServerSubscribers(serverUuid, {
      type: 'server_forced_kill',
      data: { uuid: serverUuid },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 特定サーバーのサブスクライバー数を取得
   * 
   * @param serverUuid - サーバーUUID
   * @returns サブスクライバー数
   */
  public getServerSubscriberCount(serverUuid: string): number {
    let count = 0;
    this.clients.forEach((clientInfo) => {
      const mcClientInfo = clientInfo as MCClientInfo;
      if (mcClientInfo.subscribedServers.has(serverUuid)) {
        count++;
      }
    });
    return count;
  }

  /**
   * クライアントが監視中のサーバー一覧を取得
   * 
   * @param ws - WebSocketインスタンス
   * @returns サーバーUUIDの配列
   */
  public getClientSubscriptions(ws: WebSocket): string[] {
    const clientInfo = this.clients.get(ws) as MCClientInfo;
    if (clientInfo) {
      return Array.from(clientInfo.subscribedServers);
    }
    return [];
  }
}

/**
 * ServerLogManager
 * 
 * 各Minecraftサーバーの標準出力/エラー出力ログを管理するクラス
 * @version 1.0.0
 */

import { Logger } from 'pino';

/**
 * ログエントリの型定義
 */
export interface LogEntry {
  timestamp: string;
  type: 'stdout' | 'stderr';
  line: string;
}

/**
 * サーバーログの型定義
 */
export interface ServerLog {
  uuid: string;
  logs: LogEntry[];
}

/**
 * ログ管理クラス
 * 各サーバーのログをメモリ上に保持し、必要に応じて取得可能にする
 */
export class ServerLogManager {
  private logs: Map<string, LogEntry[]> = new Map();
  private readonly maxLogsPerServer: number;
  private logger: Logger;

  /**
   * コンストラクタ
   * 
   * @param maxLogsPerServer - 各サーバーの最大ログ保持数（デフォルト: 1000）
   * @param logger - Pinoロガーインスタンス
   */
  constructor(maxLogsPerServer: number = 1000, logger: Logger) {
    this.maxLogsPerServer = maxLogsPerServer;
    this.logger = logger;
  }

  /**
   * ログエントリを追加
   * 
   * @param uuid - サーバーUUID
   * @param type - ログタイプ（stdout または stderr）
   * @param line - ログ行
   */
  public addLog(uuid: string, type: 'stdout' | 'stderr', line: string): void {
    if (!this.logs.has(uuid)) {
      this.logs.set(uuid, []);
    }

    const serverLogs = this.logs.get(uuid)!;
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      type,
      line
    };

    serverLogs.push(entry);

    // 最大ログ数を超えた場合、古いログを削除（FIFO）
    if (serverLogs.length > this.maxLogsPerServer) {
      const removed = serverLogs.shift();
      this.logger.debug({
        uuid,
        removedTimestamp: removed?.timestamp,
        currentLogCount: serverLogs.length
      }, 'Removed oldest log entry due to max limit');
    }
  }

  /**
   * 指定したサーバーのログを取得
   * 
   * @param uuid - サーバーUUID
   * @param limit - 取得する最大ログ数（デフォルト: 1000）
   * @returns ログエントリの配列（最新のものから）
   */
  public getLogs(uuid: string, limit: number = 1000): LogEntry[] {
    const serverLogs = this.logs.get(uuid);
    if (!serverLogs || serverLogs.length === 0) {
      return [];
    }

    // 最新のものから limit 件取得
    const startIndex = Math.max(0, serverLogs.length - limit);
    return serverLogs.slice(startIndex);
  }

  /**
   * 指定したサーバーのログをクリア
   * 
   * @param uuid - サーバーUUID
   */
  public clearLogs(uuid: string): void {
    const logCount = this.logs.get(uuid)?.length || 0;
    this.logs.delete(uuid);
    this.logger.info({
      uuid,
      clearedLogCount: logCount
    }, 'Cleared server logs');
  }

  /**
   * 全サーバーのログをクリア
   */
  public clearAllLogs(): void {
    const serverCount = this.logs.size;
    let totalLogCount = 0;
    this.logs.forEach(logs => {
      totalLogCount += logs.length;
    });
    
    this.logs.clear();
    
    this.logger.info({
      serverCount,
      totalLogCount
    }, 'Cleared all server logs');
  }

  /**
   * 指定したサーバーのログ数を取得
   * 
   * @param uuid - サーバーUUID
   * @returns ログ数
   */
  public getLogCount(uuid: string): number {
    return this.logs.get(uuid)?.length || 0;
  }

  /**
   * 全サーバーのログ統計を取得
   * 
   * @returns サーバーUUIDとログ数のマップ
   */
  public getLogStats(): Map<string, number> {
    const stats = new Map<string, number>();
    this.logs.forEach((logs, uuid) => {
      stats.set(uuid, logs.length);
    });
    return stats;
  }

  /**
   * サーバーログが存在するかチェック
   * 
   * @param uuid - サーバーUUID
   * @returns ログが存在する場合true
   */
  public hasLogs(uuid: string): boolean {
    return this.logs.has(uuid) && this.logs.get(uuid)!.length > 0;
  }
}

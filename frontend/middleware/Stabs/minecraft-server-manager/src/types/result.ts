/**
 * Result Types
 * 
 * 操作結果型定義
 * @version 1.0.0
 */

/**
 * サーバーマネージャー専用Result型
 * （JDKManagerのResult型とは別物）
 */
export type ServerManagerResult<T = void> = 
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Void結果型
 */
export type VoidResult = ServerManagerResult<void>;

/**
 * インスタンス追加結果
 */
export interface AddInstanceResult {
  success: boolean;
  uuid?: string;      // 成功時のみ存在
  error?: string;     // 失敗時のみ存在
}

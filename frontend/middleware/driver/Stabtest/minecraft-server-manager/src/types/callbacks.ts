/**
 * Callback Types
 * 
 * イベントコールバック型定義
 * @version 1.0.0
 */

/**
 * インスタンスイベントタイプ
 */
export type InstanceEventType = 
  | 'started'
  | 'stopped'
  | 'crashed'
  | 'autoRestartLimitReached'
  | 'stopTimeout'
  | 'forcedKill';

/**
 * インスタンスイベント
 */
export interface InstanceEvent {
  type: InstanceEventType;
  uuid: string;
  timestamp: number;
  data?: any;
}

/**
 * 通知関数
 */
export type NotifyFunction = (event: InstanceEvent) => void;

/**
 * サーバーイベントコールバック
 */
export interface ServerCallbacks {
  onServerStarted?: (uuid: string) => void;
  onServerStopped?: (uuid: string, exitCode: number) => void;
  onServerCrashed?: (uuid: string, error: Error) => void;
  onAutoRestartLimitReached?: (uuid: string) => void;
  onStopTimeout?: (uuid: string, message: string) => void;
  onForcedKill?: (uuid: string) => void;
}

/**
 * プロセス標準入出力コールバック
 */
export interface ProcessStdCallbacks {
  onStdout?: (line: string) => void;
  onStderr?: (line: string) => void;
}

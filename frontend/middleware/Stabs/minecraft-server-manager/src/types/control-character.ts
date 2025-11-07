/**
 * Control Character Types
 * 
 * 制御文字列挙型定義
 * @version 1.0.0
 */

/**
 * プロセスへ送信可能な制御文字
 */
export enum ControlCharacter {
  ENTER = '\n',      // 必須機能
  CTRL_C = '\x03',   // 推奨機能（プロセス割り込み）
  TAB = '\t'         // 推奨機能（タブ補完）
}

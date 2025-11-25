/**
 * API Messages and Error Codes
 *
 * APIで使用するメッセージとエラーコードの定数定義
 * 一元管理により、一貫性と保守性を向上
 */

/**
 * エラーコード定数
 */
export const ERROR_CODES = {
  // 共通エラー
  SERVER_NOT_RUNNING: 'SERVER_NOT_RUNNING',
  MISSING_PARAMETER: 'MISSING_PARAMETER',
  INVALID_PARAMETER: 'INVALID_PARAMETER',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',

  // サーバー関連エラー
  MISSING_SERVER_ID: 'MISSING_SERVER_ID',
  INSTANCE_NOT_FOUND: 'INSTANCE_NOT_FOUND',
  INSTANCE_RUNNING: 'INSTANCE_RUNNING',
  INSTANCE_NOT_RUNNING: 'INSTANCE_NOT_RUNNING',

  // プロパティ関連エラー
  PROPERTIES_FILE_NOT_FOUND: 'PROPERTIES_FILE_NOT_FOUND',
  PROPERTIES_GET_FAILED: 'PROPERTIES_GET_FAILED',
  PROPERTIES_SET_FAILED: 'PROPERTIES_SET_FAILED',
  INVALID_UPDATE_DATA: 'INVALID_UPDATE_DATA',
  INVALID_PROPERTY_TYPE: 'INVALID_PROPERTY_TYPE',
  EMPTY_UPDATE_DATA: 'EMPTY_UPDATE_DATA',
  TOO_MANY_PROPERTIES: 'TOO_MANY_PROPERTIES',

  // セキュリティ関連エラー
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  CSRF_TOKEN_INVALID: 'CSRF_TOKEN_INVALID'
} as const;

/**
 * エラーメッセージ定数
 */
export const ERROR_MESSAGES = {
  // 共通エラー
  MISSING_PARAMETER: 'パラメータが不足しています',
  INVALID_PARAMETER: 'パラメータの形式が正しくありません',
  VALIDATION_ERROR: '入力内容に誤りがあります',
  INTERNAL_ERROR: 'サーバー内部でエラーが発生しました',

  // サーバー関連エラー
  MISSING_SERVER_ID: 'サーバーIDが指定されていません',
  INSTANCE_NOT_FOUND: '指定されたIDのサーバーが見つかりません',
  INSTANCE_RUNNING: 'サーバーが起動中のため、この操作は実行できません',
  INSTANCE_NOT_RUNNING: 'サーバーが起動していません',

  // プロパティ関連エラー
  PROPERTIES_FILE_NOT_FOUND: 'server.propertiesファイルが存在しません',
  PROPERTIES_GET_FAILED: 'プロパティの取得に失敗しました',
  PROPERTIES_SET_FAILED: 'プロパティの設定に失敗しました',
  INVALID_UPDATE_DATA: '更新データの形式が正しくありません',
  INVALID_PROPERTY_TYPE: 'プロパティのキーと値は文字列である必要があります',
  EMPTY_UPDATE_DATA: '更新するプロパティが指定されていません',
  TOO_MANY_PROPERTIES: '一度に更新できるプロパティの上限を超えています',

  // セキュリティ関連エラー
  RATE_LIMIT_EXCEEDED: 'リクエストが多すぎます。しばらく待ってから再試行してください',
  CSRF_TOKEN_INVALID: 'CSRFトークンが無効です'
} as const;

/**
 * 成功メッセージ定数
 */
export const SUCCESS_MESSAGES = {
  // プロパティ関連
  PROPERTIES_UPDATED: 'サーバープロパティを更新しました',
  PROPERTIES_RETRIEVED: 'サーバープロパティを取得しました',

  // サーバー操作
  SERVER_STARTED: 'サーバーを起動しました',
  SERVER_STOPPED: 'サーバーを停止しました',
  SERVER_CREATED: 'サーバーを作成しました',
  SERVER_DELETED: 'サーバーを削除しました',
  SERVER_UPDATED: 'サーバー情報を更新しました',
  SERVER_FORCE_KILLED: 'サーバーを強制終了しました',

  // ログ操作
  LOGS_CLEARED: 'ログをクリアしました'
} as const;

/**
 * 情報メッセージ定数
 */
export const INFO_MESSAGES = {
  PROPERTIES_FILE_NOT_EXISTS: 'server.propertiesファイルがまだ作成されていません',
  SERVER_NOT_STARTED_YET: 'サーバーはまだ一度も起動されていません'
} as const;

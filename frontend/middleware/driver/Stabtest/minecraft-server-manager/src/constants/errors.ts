/**
 * Error Messages
 * 
 * エラーメッセージ定数
 * @version 1.0.0
 */

export const ServerManagerErrors = {
  // インスタンス管理
  INSTANCE_NOT_FOUND: 'Server instance not found',
  INSTANCE_NAME_DUPLICATE: 'Server name already exists',
  INSTANCE_RUNNING: 'Server is currently running',
  INSTANCE_NOT_RUNNING: 'Server is not running',
  
  // JDK関連
  JDK_NOT_FOUND: 'Required JDK version not found',
  JDK_VERSION_INVALID: 'Invalid JDK version',
  
  // ファイル操作
  FILE_NOT_FOUND: 'File not found',
  FILE_LOCKED: 'File is locked by another process',
  DIRECTORY_RENAME_FAILED: 'Failed to rename directory',
  DIRECTORY_DELETE_FAILED: 'Failed to delete directory',
  FILE_COPY_FAILED: 'Failed to copy file',
  
  // ポート
  PORT_IN_USE: 'Port is already in use by another server',
  PORT_INVALID: 'Invalid port number',
  
  // 設定
  CONFIG_LOAD_FAILED: 'Failed to load configuration',
  CONFIG_SAVE_FAILED: 'Failed to save configuration',
  CONFIG_INVALID: 'Invalid configuration data',
  
  // プロセス
  PROCESS_START_FAILED: 'Failed to start server process',
  PROCESS_STOP_TIMEOUT: 'Server did not stop within timeout period',
  
  // レジストリ
  REGISTRY_NOT_LOADED: 'Registry not loaded',
} as const;

/**
 * デフォルト値定数
 */
export const DefaultValues = {
  PORT: 25565,
  MAX_MEMORY: 2048,
  MIN_MEMORY: 1024,
  JVM_ARGUMENTS: [] as string[],
  SERVER_ARGUMENTS: ['--nogui'] as string[],
  AUTO_RESTART_ENABLED: false,
  AUTO_RESTART_MAX_CONSECUTIVE: 3,
  AUTO_RESTART_RESET_THRESHOLD: 600, // 10分
  CONFIG_VERSION: '1.0.0',
  UPTIME_UPDATE_INTERVAL: 5 * 60 * 1000, // 5分
  DEFAULT_STOP_TIMEOUT: 30000, // 30秒
} as const;

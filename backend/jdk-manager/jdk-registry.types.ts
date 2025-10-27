/**
 * JDK管理システム 型定義
 * バージョン: 1.0.0
 * プロジェクト: Minecraft用Java実行環境管理システム
 */

/**
 * ファイルのチェックサム情報
 */
export interface FileChecksum {
  path: string;           // ファイルの相対パス
  checksum: string;       // SHA-256ハッシュ値
  lastVerified: string;   // 最終確認日時（ISO 8601）
}

/**
 * 検証ステータス
 */
export type VerificationStatus = 
  | 'verified'    // 検証済み・正常
  | 'unverified'  // 未検証
  | 'corrupted'   // 破損検出
  | 'missing';    // ファイル欠損

/**
 * JDKインスタンスの情報
 */
export interface JdkInstance {
  id: string;                           // 一意識別子（ディレクトリ名）
  name: string;                         // 簡易名称（例: "Java 17"）
  structName: string;                   // 正式名称（アーカイブファイル名ベース）
  majorVersion: number;                 // メジャーバージョン
  os: string;                           // OS種別
  installedAt: string;                  // インストール日時（ISO 8601）
  checksums: FileChecksum[];            // ファイル整合性チェック情報
  verificationStatus: VerificationStatus; // 検証ステータス
}

/**
 * グローバルJDK管理データ
 */
export interface JdkRegistry {
  schemaVersion: string;      // スキーマバージョン（例: "1.0.0"）
  baseRuntimePath: string;    // ベースディレクトリ
  activeJdkId?: string;       // アクティブなJDKのID
  instances: JdkInstance[];   // 登録されているJDKインスタンス
  lastUpdated: string;        // 最終更新日時（ISO 8601）
}

/**
 * ランタイムロック情報
 */
export interface RuntimeLock {
  lockId: string;      // UUID
  lockedAt: string;    // ロック取得日時（ISO 8601）
  purpose?: string;    // ロック目的（例: "Minecraft 1.20.1"）
}

/**
 * 汎用Result型
 */
export type Result<T> = 
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * JDK追加パラメータ
 */
export interface AddJdkParams {
  archivePath: string;      // ダウンロード済みアーカイブのフルパス
  majorVersion: number;     // メジャーバージョン
  structName?: string;      // 省略時はアーカイブファイル名から自動生成
  name?: string;           // 省略時は "Java {majorVersion}"
}

/**
 * インストール情報（リスト表示用）
 */
export interface InstallInfo {
  id: string;
  majorVersion: number;
  name: string;
  structName: string;
  verificationStatus: VerificationStatus;
}

/**
 * 利用可能なJDK情報（外部API形式）
 */
export interface AvailableJdk {
  version: string;           // "8", "17", "21"
  downloads: {
    os: string;              // "windows", "linux", "macos"
    downloadUrl: string;
  }[];
  vendor?: string;
  isLTS?: boolean;
}

/**
 * アップデート情報
 */
export interface UpdateInfo {
  currentStructName: string;
  availableStructName: string;
  downloadUrl: string;
  majorVersion: number;
}

/**
 * 検証結果
 */
export interface VerificationResult {
  id: string;
  status: VerificationStatus;
  missingFiles?: string[];
  corruptedFiles?: string[];
}

/**
 * ロガーインターフェース
 */
export interface Logger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  debug(message: string): void;
}

/**
 * JdkManagerコンストラクタオプション
 */
export interface JdkManagerOptions {
  logPath?: string;
  dryRun?: boolean;
  logger?: Logger;
}

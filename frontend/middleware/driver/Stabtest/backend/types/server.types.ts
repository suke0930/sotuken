/**
 * Minecraft サーバーバージョン情報
 */
export interface ServerVersion {
  /** Minecraft のバージョン番号 (例: "1.12.2", "1.16.5") */
  version: string;
  
  /** 対応する JDK バージョン (例: "8", "11", "17") */
  jdk: string;
  
  /** サーバーJarなどのダウンロードURL */
  downloadUrl: string;
}

/**
 * Minecraft サーバーソフトウェア情報
 */
export interface ServerSoftware {
  /** サーバーソフトウェア名 (例: "Vanilla", "Forge", "Fabric", "Paper") */
  name: string;
  
  /** 対応するバージョンの配列 */
  versions: ServerVersion[];
}

/**
 * サーバースキーマ全体の型定義
 * 複数のサーバーソフトウェアを含む配列
 */
export type ServerSchema = ServerSoftware[];

/**
 * API レスポンスの型定義
 */
export interface ServerApiResponse {
  success: boolean;
  data: ServerSchema;
  timestamp: string;
}

/**
 * エラーレスポンスの型定義
 */
export interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
  };
  timestamp: string;
}

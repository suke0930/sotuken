/**
 * JDK ダウンロード情報（OS別）
 */
export interface JDKDownload {
  /** 対応OS */
  os: 'windows' | 'linux' | 'macos';
  
  /** ダウンロードURL */
  downloadUrl: string;
  
  /** ファイルサイズ（オプション、バイト単位） */
  fileSize?: number;
  
  /** SHA-256チェックサム（オプション） */
  sha256?: string;
}

/**
 * JDK バージョン情報
 */
export interface JDKVersion {
  /** JDKバージョン（例: "8", "11", "17", "21"） */
  version: string;
  
  /** OS別のダウンロード情報 */
  downloads: JDKDownload[];
  
  /** リリース日（オプション） */
  releaseDate?: string;
  
  /** ベンダー名（オプション、例: "Oracle", "AdoptOpenJDK", "Amazon Corretto"） */
  vendor?: string;
  
  /** 長期サポート版かどうか（オプション） */
  isLTS?: boolean;
}

/**
 * JDK スキーマ全体の型定義
 * 複数のJDKバージョンを含む配列
 */
export type JDKSchema = JDKVersion[];

/**
 * JDK API レスポンスの型定義
 */
export interface JDKApiResponse {
  success: boolean;
  data: JDKSchema;
  timestamp: string;
}

/**
 * JDK 検索クエリの型定義
 */
export interface JDKQuery {
  version?: string;
  os?: 'windows' | 'linux' | 'macos';
  vendor?: string;
}

/**
 * JDK ダウンロード詳細レスポンス
 */
export interface JDKDownloadResponse {
  success: boolean;
  data: {
    version: string;
    os: string;
    downloadUrl: string;
    fileSize?: number;
    sha256?: string;
  };
  timestamp: string;
}

/**
 * OS型のユニオン型（型ガード用）
 */
export type OSType = 'windows' | 'linux' | 'macos';

/**
 * OS型のバリデーション
 */
export function isValidOS(os: string): os is OSType {
  return os === 'windows' || os === 'linux' || os === 'macos';
}

/**
 * JDKバージョンのバリデーション
 */
export function isValidJDKVersion(version: string): boolean {
  // JDKバージョンは数字のみ、または数字.数字の形式
  return /^\d+(\.\d+)?$/.test(version);
}

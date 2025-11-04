/**
 * リスト取得リクエストパラメータ
 */
export interface ListRequest {
  type: 'server' | 'jdk';
}

/**
 * ダウンロードリクエストパラメータ
 */
export interface DownloadRequest {
  url: string;
  filename?: string;
}

/**
 * APIレスポンス基本型
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
  timestamp: string;
}

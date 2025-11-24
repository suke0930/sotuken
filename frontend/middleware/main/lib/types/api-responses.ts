/**
 * API Response Type Definitions
 *
 * 統一されたAPIレスポンス型定義
 * すべてのAPIエンドポイントはこれらの型に準拠する
 */

/**
 * エラーレスポンスの詳細情報
 */
export interface ApiError {
  /** エラーコード（例: "INSTANCE_NOT_FOUND", "VALIDATION_ERROR"） */
  code: string;
  /** 人間が読めるエラーメッセージ */
  message: string;
  /** 追加のエラー詳細（オプション） */
  details?: unknown;
}

/**
 * エラーレスポンス
 */
export interface ApiErrorResponse {
  ok: false;
  error: ApiError;
}

/**
 * 成功レスポンス
 */
export interface ApiSuccessResponse<T = unknown> {
  ok: true;
  data?: T;
  message?: string;
}

/**
 * APIレスポンスの共用型
 */
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * サーバープロパティ取得レスポンス
 */
export interface GetPropertiesResponse {
  ok: true;
  data: Record<string, string>;
  message?: string;
}

/**
 * サーバープロパティ更新レスポンス
 */
export interface SetPropertiesResponse {
  ok: true;
  message: string;
}

/**
 * エラーレスポンスを生成するヘルパー関数
 */
export function createErrorResponse(code: string, message: string, details?: unknown): ApiErrorResponse {
  return {
    ok: false,
    error: {
      code,
      message,
      details
    }
  };
}

/**
 * 成功レスポンスを生成するヘルパー関数
 */
export function createSuccessResponse<T = unknown>(data?: T, message?: string): ApiSuccessResponse<T> {
  return {
    ok: true,
    ...(data !== undefined && { data }),
    ...(message && { message })
  };
}

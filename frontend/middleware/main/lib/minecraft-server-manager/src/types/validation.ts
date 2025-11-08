/**
 * Validation Types
 * 
 * バリデーション結果型定義
 * @version 1.0.0
 */

/**
 * バリデーション結果
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
}

/**
 * バリデーション結果ヘルパークラス
 */
export class ValidationResultHelper {
  /**
   * 成功結果を生成
   */
  static success(warnings?: string[]): ValidationResult {
    return { valid: true, warnings };
  }
  
  /**
   * 失敗結果を生成
   */
  static failure(error: string): ValidationResult {
    return { valid: false, error };
  }
  
  /**
   * 警告付き成功結果を生成
   */
  static warning(warnings: string[]): ValidationResult {
    return { valid: true, warnings };
  }
}

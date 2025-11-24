/**
 * Input Sanitization Utilities
 *
 * 入力値のサニタイゼーション処理
 * セキュリティとデータ整合性を確保
 */

/**
 * サーバープロパティの値をサニタイズ
 *
 * - 制御文字（改行、null文字など）を除去
 * - 前後の空白をトリム
 * - 最大長を制限
 *
 * @param value - サニタイズする値
 * @param maxLength - 最大文字数（デフォルト: 1000）
 * @returns サニタイズされた値
 */
export function sanitizePropertyValue(value: string, maxLength: number = 1000): string {
  return value
    .replace(/[\r\n\0\x08\x0B\x0C]/g, '') // 制御文字を除去（改行、null、バックスペース、垂直タブ、フォームフィード）
    .trim()
    .substring(0, maxLength);
}

/**
 * サーバープロパティのキーをサニタイズ
 *
 * - 制御文字を除去
 * - 前後の空白をトリム
 * - 最大長を制限
 * - 有効な文字のみ許可（英数字、ハイフン、アンダースコア、ドット）
 *
 * @param key - サニタイズするキー
 * @param maxLength - 最大文字数（デフォルト: 255）
 * @returns サニタイズされたキー
 */
export function sanitizePropertyKey(key: string, maxLength: number = 255): string {
  return key
    .replace(/[\r\n\0\x08\x0B\x0C]/g, '') // 制御文字を除去
    .trim()
    .substring(0, maxLength);
}

/**
 * プロパティの更新データをサニタイズ
 *
 * - すべてのキーと値をサニタイズ
 * - 空のキーを持つエントリを除外
 *
 * @param updates - サニタイズする更新データ
 * @returns サニタイズされた更新データ
 */
export function sanitizePropertyUpdates(updates: Record<string, string>): Record<string, string> {
  const sanitized: Record<string, string> = {};

  for (const [key, value] of Object.entries(updates)) {
    const sanitizedKey = sanitizePropertyKey(key);
    const sanitizedValue = sanitizePropertyValue(value);

    // 空のキーは除外
    if (sanitizedKey.length > 0) {
      sanitized[sanitizedKey] = sanitizedValue;
    }
  }

  return sanitized;
}

/**
 * サーバーIDをバリデート
 *
 * - UUID v4 形式かどうかをチェック
 *
 * @param id - チェックするID
 * @returns 有効なUUIDの場合true
 */
export function isValidServerId(id: string): boolean {
  const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidV4Regex.test(id);
}

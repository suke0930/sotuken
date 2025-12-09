/**
 * 定数定義ファイル
 * 
 * @deprecated このファイルは後方互換性のために残されています。
 * 新しいコードでは lib/config を使用してください。
 * 
 * このファイルは統合設定システム (lib/config) から定数を再エクスポートしています。
 */

// 統合設定システムから定数をインポート
import {
  DEV_SECRET_DIR,
  USERS_FILE,
  SERVERS_FILE,
  USERDATA_DIR,
  SSL_CERT_DIR,
  SSL_KEY_FILE,
  SSL_CERT_FILE,
  SSL_INFO_FILE,
  CERT_VALIDITY_DAYS,
  CERT_RENEWAL_THRESHOLD_DAYS,
  commonName,
  organization,
  SESSION_SECRET,
  SESSION_NAME,
  DEFAULT_SERVER_PORT,
} from './config';

// 既存コードとの互換性のために再エクスポート
export {
  DEV_SECRET_DIR,
  USERS_FILE,
  SERVERS_FILE,
  USERDATA_DIR,
  SSL_CERT_DIR,
  SSL_KEY_FILE,
  SSL_CERT_FILE,
  SSL_INFO_FILE,
  CERT_VALIDITY_DAYS,
  CERT_RENEWAL_THRESHOLD_DAYS,
  commonName,
  organization,
  SESSION_SECRET,
  SESSION_NAME,
  DEFAULT_SERVER_PORT,
};
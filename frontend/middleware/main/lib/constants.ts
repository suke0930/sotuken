import path from 'path';
import crypto from 'crypto';

// 開発環境用のファイルパス設定
export const DEV_SECRET_DIR = path.join(__dirname, '..', '..', 'devsecret');
export const USERS_FILE = path.join(DEV_SECRET_DIR, 'users.json');
export const SERVERS_FILE = path.join(DEV_SECRET_DIR, 'servers.json');

// SSL/TLS証明書のパス設定
export const USERDATA_DIR = path.join(__dirname, '..', 'userdata');
export const SSL_CERT_DIR = path.join(USERDATA_DIR, 'ssl');
export const SSL_KEY_FILE = path.join(SSL_CERT_DIR, 'server.key');
export const SSL_CERT_FILE = path.join(SSL_CERT_DIR, 'server.cert');
export const SSL_INFO_FILE = path.join(SSL_CERT_DIR, 'cert-info.json');

// SSL/TLS証明書の設定
export const CERT_VALIDITY_DAYS = 365;  // 証明書の有効期間（日数）
export const CERT_RENEWAL_THRESHOLD_DAYS = 10;  // 更新する日数（有効期限の何日前）

// セッション設定
export const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(64).toString('hex');
export const SESSION_NAME = 'frontdriver-session';
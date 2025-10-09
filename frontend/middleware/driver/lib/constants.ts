import path from 'path';
import crypto from 'crypto';

// 開発環境用のファイルパス設定
export const DEV_SECRET_DIR = path.join(__dirname, '..', '..', 'devsecret');
export const USERS_FILE = path.join(DEV_SECRET_DIR, 'users.json');
export const SERVERS_FILE = path.join(DEV_SECRET_DIR, 'servers.json');

// 追加: データディレクトリ/JDK格納先
export const DATA_DIR = process.env.DATA_DIR || path.join(DEV_SECRET_DIR, 'servers_data');
export const JDKS_DIR = path.join(DATA_DIR, 'jdks');

// セッション設定
export const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(64).toString('hex');
export const SESSION_NAME = 'frontdriver-session';

// Middle Agent のURL（必要に応じて外部プロセスへ委譲）
export const MIDDLE_BASE_URL = process.env.MIDDLE_BASE_URL || '';
export const WS_PATH = process.env.WS_PATH || '/ws';

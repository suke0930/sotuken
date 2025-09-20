import path from 'path';
import crypto from 'crypto';

// 開発環境用のファイルパス設定
export const DEV_SECRET_DIR = path.join(__dirname, '..', '..', 'devsecret');
export const USERS_FILE = path.join(DEV_SECRET_DIR, 'users.json');
export const SERVERS_FILE = path.join(DEV_SECRET_DIR, 'servers.json');

// セッション設定
export const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(64).toString('hex');
export const SESSION_NAME = 'frontdriver-session';
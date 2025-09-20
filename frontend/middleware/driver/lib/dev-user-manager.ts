import { promises as fs } from 'fs';
import { DEV_SECRET_DIR, USERS_FILE } from './constants';

/**
 * 開発用のユーザー管理クラス
 * JSONベースのユーザー管理（DB代替）を行う
 */
export class DevUserManager {
    /**
     * devsecretディレクトリとデータファイルが存在しない場合に初期化する
     */
    static async initialize() {
        try {
            await fs.mkdir(DEV_SECRET_DIR, { recursive: true });
            await fs.access(USERS_FILE);
        } catch {
            console.log(`Initializing ${USERS_FILE}...`);
            // 開発環境用のデフォルトユーザーを設定
            const defaultUsers = ["dev-123", "dev-abc", "admin-test"];
            await fs.writeFile(USERS_FILE, JSON.stringify(defaultUsers, null, 2));
        }
    }

    /**
     * ユーザー認証を行う関数
     * @param devid ユーザーID
     * @returns 認証成功時はtrue、失敗時はfalse
     */
    static async authenticate(devid: string): Promise<boolean> {
        try {
            const usersData = await fs.readFile(USERS_FILE, 'utf-8');
            const users: string[] = JSON.parse(usersData);
            return users.includes(devid);
        } catch (error) {
            console.error("Failed to authenticate user:", error);
            return false;
        }
    }
}
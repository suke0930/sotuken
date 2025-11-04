import { promises as fs } from 'fs';
import bcrypt from 'bcrypt';
import { DEV_SECRET_DIR, USERS_FILE } from './constants';
import { User } from './types';

const SALT_ROUNDS = 10;

/**
 * シングルユーザーの管理クラス
 * JSONベースで一人のユーザー情報を管理する
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
            // 初期状態ではユーザーは存在しない (null)
            await fs.writeFile(USERS_FILE, JSON.stringify(null));
        }
    }

    /**
     * 登録されているユーザー情報を取得する
     * @returns ユーザーオブジェクト、存在しない場合はnull
     */
    private static async getUser(): Promise<User | null> {
        try {
            const usersData = await fs.readFile(USERS_FILE, 'utf-8');
            const user = JSON.parse(usersData);
            console.log("Read user data:", user);
            if (!user.id || !user.passwordHash) {
                return null;
            } else {
                return user as User | null;
            }

        } catch (error) {
            console.error("Failed to read user file:", error);
            return null;
        }
    }

    /**
     * ユーザーが既に登録されているか確認する
     * @returns 登録されていればtrue
     */
    static async hasUser(): Promise<boolean> {
        const user = await this.getUser();
        return user !== null;
    }

    /**
     * 新しいユーザーを作成する
     * @param id ユーザーID
     * @param password パスワード
     * @returns 作成に成功した場合はtrue
     */
    static async createUser(id: string, password: string): Promise<boolean> {
        if (await this.hasUser()) {
            return false; // 既にユーザーが存在する場合は作成しない
        }
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
        const newUser: User = { id, passwordHash };
        await fs.writeFile(USERS_FILE, JSON.stringify(newUser, null, 2));
        return true;
    }

    /**
     * ユーザー認証を行う
     * @param id ユーザーID
     * @param password パスワード
     * @returns 認証成功時はユーザーID、失敗時はnull
     */
    static async authenticate(id: string, password: string): Promise<string | null> {
        const user = await this.getUser();
        if (!user || user.id !== id) return null;

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        return isMatch ? user.id : null;
    }
}
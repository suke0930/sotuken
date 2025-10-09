import { promises as fs } from 'fs';
import crypto from 'crypto';
import { DEV_SECRET_DIR, SERVERS_FILE } from './constants';
import { MinecraftServerEntry } from './types';

/**
 * 開発用のMinecraftサーバー管理クラス
 * JSONベースのサーバーエントリ管理を行う
 */
export class MinecraftServerManager {
    /**
     * devsecretディレクトリとサーバーデータファイルが存在しない場合に初期化する
     */
    static async initialize() {
        try {
            await fs.mkdir(DEV_SECRET_DIR, { recursive: true });
            await fs.access(SERVERS_FILE);
        } catch {
            console.log(`Initializing ${SERVERS_FILE}...`);
            await fs.writeFile(SERVERS_FILE, JSON.stringify([], null, 2));
        }
    }

    /**
     * サーバーリストをファイルから読み込む
     * @returns サーバーエントリの配列
     */
    private static async readServers(): Promise<MinecraftServerEntry[]> {
        try {
            const serversData = await fs.readFile(SERVERS_FILE, 'utf-8');
            return JSON.parse(serversData);
        } catch (error) {
            console.error("Failed to read servers file:", error);
            return [];
        }
    }

    /**
     * サーバーリストをファイルに書き込む
     * @param servers サーバーエントリの配列
     */
    private static async writeServers(servers: MinecraftServerEntry[]): Promise<void> {
        await fs.writeFile(SERVERS_FILE, JSON.stringify(servers, null, 2));
    }

    /**
     * 指定されたユーザーが管理するすべてのサーバーを取得する
     * @param userId ユーザーID
     * @returns ユーザーが管理するサーバーエントリの配列
     */
    static async getServersForUser(userId: string): Promise<MinecraftServerEntry[]> {
        const allServers = await this.readServers();
        return allServers.filter(server => server.managedBy.includes(userId));
    }

    /**
     * 全サーバーからID検索（権限チェックは呼び出し元で実施）
     */
    static async getById(id: string): Promise<MinecraftServerEntry | undefined> {
        const all = await this.readServers();
        return all.find(s => s.id === id);
    }

    /**
     * 新しいサーバーを追加する
     * @param serverData 新しいサーバーのデータ
     * @param creatorUserId 作成者のユーザーID
     * @returns 作成されたサーバーエントリ
     */
    static async addServer(
        serverData: Omit<MinecraftServerEntry, 'id' | 'createdAt' | 'isRunning' | 'managedBy'>,
        creatorUserId: string
    ): Promise<MinecraftServerEntry> {
        const allServers = await this.readServers();
        const newServer: MinecraftServerEntry = {
            ...serverData,
            id: crypto.randomUUID(),
            managedBy: [creatorUserId],
            createdAt: new Date().toISOString(),
            isRunning: false,
        };
        allServers.push(newServer);
        await this.writeServers(allServers);
        return newServer;
    }

    /**
     * サーバー情報を更新する
     * @param id 更新するサーバーのID
     * @param updates 更新内容
     * @param userId 操作を行うユーザーID
     * @returns 更新後のサーバーエントリ、権限がない場合はnull
     */
    static async updateServer(id: string, updates: Partial<Omit<MinecraftServerEntry, 'id'>>, userId: string): Promise<MinecraftServerEntry | null> {
        const allServers = await this.readServers();
        const serverIndex = allServers.findIndex(s => s.id === id);
        if (serverIndex === -1) {
            return null;
        }
        if (!allServers[serverIndex]) return null;
        if (!allServers[serverIndex].managedBy.includes(userId)) {
            return null; // 権限がない
        }
        const updatedServer = { ...allServers[serverIndex], ...updates, id }; // idは変更不可
        allServers[serverIndex] = updatedServer;
        await this.writeServers(allServers);
        return updatedServer;
    }

    /**
     * サーバーを削除する
     * @param id 削除するサーバーのID
     * @param userId 操作を行うユーザーID
     * @returns 削除が成功した場合はtrue、失敗した場合はfalse
     */
    static async deleteServer(id: string, userId: string): Promise<boolean> {
        const allServers = await this.readServers();
        const server = allServers.find(s => s.id === id);
        if (!server || !server.managedBy.includes(userId)) return false; // サーバーが存在しないか、権限がない
        const newServers = allServers.filter(s => s.id !== id);
        await this.writeServers(newServers);
        return true;
    }
}

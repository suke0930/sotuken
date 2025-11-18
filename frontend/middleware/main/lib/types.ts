// セッション管理用の型定義
declare module 'express-session' {
    interface SessionData {
        userId: string;
        loginAt: string;
    }
}

// リクエスト型の拡張
declare global {
    namespace Express {
        interface Request {
            userId?: string;
        }
    }
}

// ユーザー情報の型定義
export interface User {
    id: string;
    passwordHash: string;
}

// Minecraftサーバーエントリの型定義
export type ServerSoftware = "vanilla" | "mohist" | "paper" | "forge" | "fabric" | "bukkit" | "spigot";

export interface MinecraftServerEntry {
    id: string;
    serverName: string;
    minecraftVersion: string;
    serverSoftware: ServerSoftware;
    jdkVersion: string;
    managedBy: string[];
    connectTo: string;
    createdAt: string;
    isRunning: boolean;
    serverFilePath: string;
}
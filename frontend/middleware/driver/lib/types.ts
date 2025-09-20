// セッション管理用の型定義
declare module 'express-session' {
    interface SessionData {
        devid: string;
        loginAt: string;
    }
}

// リクエスト型の拡張（デバッグ用）
declare global {
    namespace Express {
        interface Request {
            devid?: string;
        }
    }
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
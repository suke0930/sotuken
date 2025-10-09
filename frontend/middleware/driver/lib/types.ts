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
    description?: string; // 追加（任意）
    minecraftVersion: string;
    serverSoftware: ServerSoftware;
    jdkVersion: string;
    jdkPath?: string; // 実インストール先（任意）
    managedBy: string[];
    connectTo: string;
    createdAt: string;
    isRunning: boolean;
    serverFilePath: string;
    ports?: {
        game?: number;
        rcon?: number;
        query?: number;
    };
    frp?: {
        forwardId: string;
        type: "tcp" | "http" | "https";
        remotePort?: number;
        subdomain?: string;
    };
}

// JDK 情報
export interface JDKInfo {
    version: string; // "8" | "11" | "17" | "21" など
    vendor?: string; // "Temurin" など
    home: string;
    installedAt?: string;
}

// ジョブ
export type JobType = "jdk-download" | "server-download" | "server-start" | "server-stop" | "file-op";
export type JobStatus = "queued" | "running" | "success" | "failed" | "canceled";

export interface Job {
    id: string;
    type: JobType;
    owner: string; // userId
    status: JobStatus;
    progress: number; // 0-100
    startedAt: string;
    updatedAt: string;
    payload?: any;
    result?: any;
    error?: { code: string; message: string; detail?: any };
}

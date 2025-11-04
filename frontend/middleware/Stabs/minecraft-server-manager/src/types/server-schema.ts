/**
 * Server Schema Type Definitions
 * 
 * Minecraft Server Management System - データスキーマ定義
 * @version 1.0.0
 */

import { z } from 'zod';

// ========================================
// 基本型定義
// ========================================

/**
 * サーバーステータス
 */
export type ServerStatus = 'stopped' | 'running' | 'crashed';

/**
 * サーバーソフトウェア情報
 */
export interface ServerSoftware {
  name: string;
  version: string;
}

/**
 * サーバー起動設定
 */
export interface ServerLaunchConfig {
  jarPath: string;
  port: number;
  jdkVersion: number;  // ⚠️ number型（JDKManager仕様に合わせる）
  maxMemory: number;
  minMemory: number;
  jvmArguments: string[];
  serverArguments: string[];
}

/**
 * サーバーメタデータ
 */
export interface ServerMetadata {
  createdAt: string;
  updatedAt: string;
  lastStartedAt: string | null;
  totalUptime: number;  // 秒単位
}

/**
 * 自動再起動設定
 */
export interface AutoRestartConfig {
  enabled: boolean;
  maxConsecutiveRestarts: number;
  resetThresholdSeconds: number;
}

/**
 * サーバーインスタンス
 */
export interface ServerInstance {
  uuid: string;
  name: string;
  note: string;
  status: ServerStatus;
  software: ServerSoftware;
  launchConfig: ServerLaunchConfig;
  metadata: ServerMetadata;
  autoRestart: AutoRestartConfig;
}

/**
 * サーバーマネージャー設定
 */
export interface ServerManagerConfig {
  configVersion: string;
  instances: ServerInstance[];
  lastUpdated: string;
}

// ========================================
// 実行時専用型（非永続化）
// ========================================

/**
 * ランタイム状態（実行時のみ）
 */
export interface RuntimeState {
  consecutiveRestartCount: number;
  lastRestartTime: number | null;
  resetTimerId: NodeJS.Timeout | null;
  currentSessionStartTime: number | null;
}

// ========================================
// Zodスキーマ（バリデーション用）
// ========================================

const ServerSoftwareSchema = z.object({
  name: z.string(),
  version: z.string()
});

const ServerLaunchConfigSchema = z.object({
  jarPath: z.string(),
  port: z.number().int().min(1).max(65535),
  jdkVersion: z.number().int().positive(),
  maxMemory: z.number().int().positive(),
  minMemory: z.number().int().positive(),
  jvmArguments: z.array(z.string()),
  serverArguments: z.array(z.string())
});

const ServerMetadataSchema = z.object({
  createdAt: z.string(),
  updatedAt: z.string(),
  lastStartedAt: z.string().nullable(),
  totalUptime: z.number().nonnegative()
});

const AutoRestartConfigSchema = z.object({
  enabled: z.boolean(),
  maxConsecutiveRestarts: z.number().int().positive(),
  resetThresholdSeconds: z.number().int().positive()
});

const ServerInstanceSchema = z.object({
  uuid: z.string().uuid(),
  name: z.string(),
  note: z.string(),
  status: z.enum(['stopped', 'running', 'crashed']),
  software: ServerSoftwareSchema,
  launchConfig: ServerLaunchConfigSchema,
  metadata: ServerMetadataSchema,
  autoRestart: AutoRestartConfigSchema
});

export const ServerManagerConfigSchema = z.object({
  configVersion: z.string(),
  instances: z.array(ServerInstanceSchema),
  lastUpdated: z.string()
});

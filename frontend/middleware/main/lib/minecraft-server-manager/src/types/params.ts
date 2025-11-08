/**
 * Parameter Types
 * 
 * APIパラメータ型定義
 * @version 1.0.0
 */

import { ServerSoftware, AutoRestartConfig } from './server-schema';

/**
 * インスタンス追加パラメータ
 */
export interface AddInstanceParams {
  name: string;
  note: string;
  software: ServerSoftware;
  jdkVersion: number;
  serverBinaryFilePath: string;
  port?: number;
  maxMemory?: number;
  minMemory?: number;
}

/**
 * インスタンス更新パラメータ
 */
export interface UpdateInstanceParams {
  uuid: string;
  updates: {
    name?: string;
    note?: string;
    maxMemory?: number;
    minMemory?: number;
    jvmArguments?: string[];
    serverArguments?: string[];
    autoRestart?: AutoRestartConfig;
    port?: number;
  };
}

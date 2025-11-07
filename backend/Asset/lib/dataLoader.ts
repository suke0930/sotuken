import * as fs from 'fs';
import * as path from 'path';
import { ServerSchema } from '../types/server.types';
import { JDKSchema } from '../types/jdk.types';

/**
 * データファイルのパス
 */
const DATA_DIR = path.join(__dirname, '..', 'data');
const SERVERS_JSON_PATH = path.join(DATA_DIR, 'servers.json');
const JDK_JSON_PATH = path.join(DATA_DIR, 'jdk.json');

/**
 * サーバーデータをJSONファイルから読み込み
 * @returns ServerSchema
 * @throws Error ファイルの読み込みやパースに失敗した場合
 */
export function loadServersData(): ServerSchema {
  try {
    const rawData = fs.readFileSync(SERVERS_JSON_PATH, 'utf-8');
    const data = JSON.parse(rawData) as ServerSchema;
    return data;
  } catch (error) {
    console.error('Failed to load servers.json:', error);
    throw new Error('Failed to load server data from JSON file');
  }
}

/**
 * JDKデータをJSONファイルから読み込み
 * @returns JDKSchema
 * @throws Error ファイルの読み込みやパースに失敗した場合
 */
export function loadJDKData(): JDKSchema {
  try {
    const rawData = fs.readFileSync(JDK_JSON_PATH, 'utf-8');
    const data = JSON.parse(rawData) as JDKSchema;
    return data;
  } catch (error) {
    console.error('Failed to load jdk.json:', error);
    throw new Error('Failed to load JDK data from JSON file');
  }
}

/**
 * サーバーデータファイルが存在するか確認
 * @returns boolean
 */
export function serversFileExists(): boolean {
  return fs.existsSync(SERVERS_JSON_PATH);
}

/**
 * JDKデータファイルが存在するか確認
 * @returns boolean
 */
export function jdkFileExists(): boolean {
  return fs.existsSync(JDK_JSON_PATH);
}

/**
 * サーバーデータをJSONファイルに保存
 * @param data ServerSchema
 * @throws Error ファイルの書き込みに失敗した場合
 */
export function saveServersData(data: ServerSchema): void {
  try {
    const jsonData = JSON.stringify(data, null, 2);
    fs.writeFileSync(SERVERS_JSON_PATH, jsonData, 'utf-8');
  } catch (error) {
    console.error('Failed to save servers.json:', error);
    throw new Error('Failed to save server data to JSON file');
  }
}

/**
 * JDKデータをJSONファイルに保存
 * @param data JDKSchema
 * @throws Error ファイルの書き込みに失敗した場合
 */
export function saveJDKData(data: JDKSchema): void {
  try {
    const jsonData = JSON.stringify(data, null, 2);
    fs.writeFileSync(JDK_JSON_PATH, jsonData, 'utf-8');
  } catch (error) {
    console.error('Failed to save jdk.json:', error);
    throw new Error('Failed to save JDK data to JSON file');
  }
}

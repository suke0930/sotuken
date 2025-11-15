/**
 * Server Properties Manager
 * 
 * server.properties管理クラス（完全独立）
 * 1インスタンス = 1ファイル
 * @version 1.0.0
 */

import * as fs from 'fs/promises';
import type { Logger } from 'pino';

/**
 * server.properties管理クラス
 * 使い捨てインスタンス（呼び出しのたびに生成）
 */
export class ServerPropertiesManager {
  private filePath: string;
  private logger: Logger;

  constructor(filePath: string, logger: Logger) {
    this.filePath = filePath;
    this.logger = logger;
  }

  /**
   * ファイルが存在するか確認
   */
  public exists(): boolean {
    try {
      return require('fs').existsSync(this.filePath);
    } catch {
      return false;
    }
  }

  /**
   * プロパティファイルを新規作成
   * 
   * @param properties - 初期プロパティ（key-value）
   */
  public async create(properties: Record<string, string>): Promise<void> {
    try {
      const content = this.serializeProperties(properties);
      await fs.writeFile(this.filePath, content, 'utf-8');

      this.logger.info({
        file: this.filePath,
        properties: Object.keys(properties)
      }, 'Created server.properties');
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to create server.properties');
      throw error;
    }
  }

  /**
   * プロパティファイルを読み込み
   * 
   * @returns プロパティのMap
   */
  public async read(): Promise<Map<string, string>> {
    try {
      const content = await fs.readFile(this.filePath, 'utf-8');
      return this.parseContent(content);
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to read server.properties');
      throw error;
    }
  }

  /**
   * プロパティファイルを書き込み
   * 
   * @param properties - プロパティのMap
   */
  public async write(properties: Map<string, string>): Promise<void> {
    try {
      const obj: Record<string, string> = {};
      properties.forEach((value, key) => {
        obj[key] = value;
      });

      const content = this.serializeProperties(obj);
      await fs.writeFile(this.filePath, content, 'utf-8');

      this.logger.info({
        file: this.filePath,
        count: properties.size
      }, 'Wrote server.properties');
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to write server.properties');
      throw error;
    }
  }

  /**
   * プロパティを更新（既存ファイルがあれば読み込んで更新、なければ新規作成）
   * 
   * @param key - プロパティキー
   * @param value - プロパティ値
   */
  public async update(key: string, value: string): Promise<void> {
    let properties: Map<string, string>;

    if (this.exists()) {
      properties = await this.read();
    } else {
      properties = new Map();
    }

    // Map.set()で更新または追加
    properties.set(key, value);

    await this.write(properties);

    this.logger.info({
      file: this.filePath
    }, `Updated property: ${key}=${value}`);
  }

  /**
   * 複数のプロパティを一括更新
   * 
   * @param updates - 更新するプロパティ（key-value）
   */
  public async updateMultiple(updates: Record<string, string>): Promise<void> {
    let properties: Map<string, string>;

    if (this.exists()) {
      properties = await this.read();
    } else {
      properties = new Map();
    }

    // すべてのプロパティを更新
    Object.entries(updates).forEach(([key, value]) => {
      properties.set(key, value);
    });

    await this.write(properties);

    this.logger.info({
      file: this.filePath,
      keys: Object.keys(updates)
    }, 'Updated multiple properties');
  }

  /**
   * プロパティを取得
   * 
   * @param key - プロパティキー
   * @returns プロパティ値（存在しない場合undefined）
   */
  public async get(key: string): Promise<string | undefined> {
    if (!this.exists()) {
      return undefined;
    }

    const properties = await this.read();
    return properties.get(key);
  }

  /**
   * ポートを更新（頻繁に使用するため専用メソッド）
   * 
   * @param port - ポート番号
   */
  public async updatePort(port: number): Promise<void> {
    await this.update('server-port', port.toString());
  }

  /**
   * ポートを取得
   *
   * @returns ポート番号（存在しない場合undefined）
   */
  public async getPort(): Promise<number | undefined> {
    const value = await this.get('server-port');
    return value ? parseInt(value, 10) : undefined;
  }

  /**
   * すべてのプロパティを取得
   *
   * @returns プロパティの連想配列（ファイルが存在しない場合はnull）
   * @throws ファイルの読み込みに失敗した場合
   */
  public async getAll(): Promise<Record<string, string> | null> {
    // ファイルが存在しない場合はnullを返す
    if (!this.exists()) {
      this.logger.warn({ file: this.filePath }, 'server.properties does not exist');
      return null;
    }
    try {
      // 既存のread()メソッドを使ってMapを取得
      const properties = await this.read();

      // MapをRecord<string, string>に変換
      const result: Record<string, string> = {};
      properties.forEach((value, key) => {
        result[key] = value;
      });

      this.logger.info({
        file: this.filePath,
        count: properties.size
      }, 'Retrieved all properties');

      return result;
    } catch (error) {
      // 読み込み失敗時は例外をthrow（既存のread()と同じ挙動）
      this.logger.error({ err: error }, 'Failed to get all properties');
      throw error;
    }
  }

  /**
   * プロパティ文字列をパース
   * 
   * @param content - ファイル内容
   * @returns プロパティのMap
   */
  private parseContent(content: string): Map<string, string> {
    const properties = new Map<string, string>();
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();

      // 空行またはコメント行をスキップ
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      // key=value形式をパース
      const equalIndex = trimmed.indexOf('=');
      if (equalIndex === -1) {
        continue; // '='がない行はスキップ
      }

      const key = trimmed.substring(0, equalIndex).trim();
      const value = trimmed.substring(equalIndex + 1).trim();

      properties.set(key, value);
    }

    return properties;
  }

  /**
   * プロパティをシリアライズ
   * 
   * @param properties - プロパティオブジェクト
   * @returns ファイル内容
   */
  private serializeProperties(properties: Record<string, string>): string {
    const lines: string[] = [
      '#Minecraft server properties',
      `#${new Date().toISOString()}`,
      ''
    ];

    Object.entries(properties).forEach(([key, value]) => {
      lines.push(`${key}=${value}`);
    });

    return lines.join('\n');
  }
}

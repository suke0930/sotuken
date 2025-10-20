import { ServerSchema } from '../types/server.types';
import { loadServersData } from './dataLoader';

/**
 * サーバーデータを取得（リアルタイムでJSONファイルから読み込み）
 * 
 * このデータはdata/servers.jsonから読み込まれます。
 * JSONファイルを更新すると、次のリクエスト時に自動的に反映されます。
 */
export function getServersData(): ServerSchema {
  return loadServersData();
}

/**
 * 特定のサーバーソフトウェアを名前で検索
 * @param name サーバーソフトウェア名
 * @returns ServerSoftware | undefined
 */
export function findServerByName(name: string) {
  const data = getServersData();
  return data.find(
    (server) => server.name.toLowerCase() === name.toLowerCase()
  );
}

/**
 * 特定のバージョンをサポートするサーバーソフトウェアを検索
 * @param version Minecraft バージョン
 * @returns ServerSoftware[]
 */
export function findServersByVersion(version: string) {
  const data = getServersData();
  return data.filter((server) =>
    server.versions.some((v) => v.version === version)
  );
}

/**
 * 特定のJDKバージョンをサポートするサーバーソフトウェアを検索
 * @param jdk JDK バージョン
 * @returns ServerSoftware[]
 */
export function findServersByJdk(jdk: string) {
  const data = getServersData();
  return data.filter((server) =>
    server.versions.some((v) => v.jdk === jdk)
  );
}

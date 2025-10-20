import { JDKSchema, JDKVersion, OSType } from '../types/jdk.types';
import { loadJDKData } from './dataLoader';

/**
 * JDKデータを取得（リアルタイムでJSONファイルから読み込み）
 * 
 * このデータはdata/jdk.jsonから読み込まれます。
 * JSONファイルを更新すると、次のリクエスト時に自動的に反映されます。
 * 
 * 推奨ベンダー:
 * - Oracle JDK
 * - Amazon Corretto
 * - AdoptOpenJDK (Eclipse Temurin)
 * - Azul Zulu
 */
export function getJDKData(): JDKSchema {
  return loadJDKData();
}

/**
 * 特定のJDKバージョンを検索
 * @param version JDKバージョン（例: "17"）
 * @returns JDKVersion | undefined
 */
export function findJDKByVersion(version: string): JDKVersion | undefined {
  const data = getJDKData();
  return data.find((jdk) => jdk.version === version);
}

/**
 * 特定のOSに対応するJDKを検索
 * @param os OS種類
 * @returns JDKVersion[]
 */
export function findJDKsByOS(os: OSType): JDKVersion[] {
  const data = getJDKData();
  return data.filter((jdk) =>
    jdk.downloads.some((download) => download.os === os)
  );
}

/**
 * LTS版のJDKのみを取得
 * @returns JDKVersion[]
 */
export function getLTSVersions(): JDKVersion[] {
  const data = getJDKData();
  return data.filter((jdk) => jdk.isLTS === true);
}

/**
 * 特定のベンダーのJDKを検索
 * @param vendor ベンダー名
 * @returns JDKVersion[]
 */
export function findJDKsByVendor(vendor: string): JDKVersion[] {
  const data = getJDKData();
  return data.filter(
    (jdk) => jdk.vendor?.toLowerCase() === vendor.toLowerCase()
  );
}

/**
 * 特定のバージョンと特定のOSのダウンロードURLを取得
 * @param version JDKバージョン
 * @param os OS種類
 * @returns string | undefined
 */
export function getDownloadUrl(
  version: string,
  os: OSType
): string | undefined {
  const jdk = findJDKByVersion(version);
  if (!jdk) return undefined;

  const download = jdk.downloads.find((d) => d.os === os);
  return download?.downloadUrl;
}

/**
 * 最新のLTS JDKバージョンを取得
 * @returns JDKVersion | undefined
 */
export function getLatestLTSVersion(): JDKVersion | undefined {
  const ltsVersions = getLTSVersions();
  if (ltsVersions.length === 0) return undefined;

  // バージョン番号でソート（降順）
  return ltsVersions.sort((a, b) => {
    const aNum = parseInt(a.version.split('.')[0] || '0', 10);
    const bNum = parseInt(b.version.split('.')[0] || '0', 10);
    return bNum - aNum;
  })[0];
}

/**
 * 利用可能なすべてのJDKバージョン番号を取得
 * @returns string[]
 */
export function getAvailableVersions(): string[] {
  const data = getJDKData();
  return data.map((jdk) => jdk.version);
}

/**
 * 利用可能なすべてのベンダーを取得
 * @returns string[]
 */
export function getAvailableVendors(): string[] {
  const data = getJDKData();
  const vendors = data
    .map((jdk) => jdk.vendor)
    .filter((vendor): vendor is string => vendor !== undefined);
  
  // 重複を削除
  return [...new Set(vendors)];
}

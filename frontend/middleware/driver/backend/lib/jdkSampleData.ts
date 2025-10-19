import { JDKSchema, JDKVersion, OSType } from '../types/jdk.types';

/**
 * サンプルデータ: JDK バージョン情報
 * 
 * このデータは開発・テスト用のモックデータです。
 * 本番環境では外部API、データベース、または設定ファイルから取得することを推奨します。
 * 
 * 推奨ベンダー:
 * - Oracle JDK
 * - Amazon Corretto
 * - AdoptOpenJDK (Eclipse Temurin)
 * - Azul Zulu
 */
export const exampleJDKData: JDKSchema = [
  {
    version: '8',
    downloads: [
      {
        os: 'windows',
        downloadUrl: 'https://example.com/jdk/8/jdk-8-windows-x64.zip',
      },
      {
        os: 'linux',
        downloadUrl: 'https://example.com/jdk/8/jdk-8-linux-x64.tar.gz',
      },
      {
        os: 'macos',
        downloadUrl: 'https://example.com/jdk/8/jdk-8-macos-x64.dmg',
      },
    ],
    vendor: 'AdoptOpenJDK',
    isLTS: true,
  },
  {
    version: '11',
    downloads: [
      {
        os: 'windows',
        downloadUrl: 'https://example.com/jdk/11/jdk-11-windows-x64.zip',
      },
      {
        os: 'linux',
        downloadUrl: 'https://example.com/jdk/11/jdk-11-linux-x64.tar.gz',
      },
      {
        os: 'macos',
        downloadUrl: 'https://example.com/jdk/11/jdk-11-macos-x64.dmg',
      },
    ],
    vendor: 'AdoptOpenJDK',
    isLTS: true,
  },
  {
    version: '17',
    downloads: [
      {
        os: 'windows',
        downloadUrl: 'https://example.com/jdk/17/jdk-17-windows-x64.zip',
      },
      {
        os: 'linux',
        downloadUrl: 'https://example.com/jdk/17/jdk-17-linux-x64.tar.gz',
      },
      {
        os: 'macos',
        downloadUrl: 'https://example.com/jdk/17/jdk-17-macos-x64.dmg',
      },
    ],
    vendor: 'Eclipse Temurin',
    isLTS: true,
  },
  {
    version: '21',
    downloads: [
      {
        os: 'windows',
        downloadUrl: 'https://example.com/jdk/21/jdk-21-windows-x64.zip',
      },
      {
        os: 'linux',
        downloadUrl: 'https://example.com/jdk/21/jdk-21-linux-x64.tar.gz',
      },
      {
        os: 'macos',
        downloadUrl: 'https://example.com/jdk/21/jdk-21-macos-x64.dmg',
      },
    ],
    vendor: 'Eclipse Temurin',
    isLTS: true,
  },
];

/**
 * 特定のJDKバージョンを検索
 * @param version JDKバージョン（例: "17"）
 * @returns JDKVersion | undefined
 */
export function findJDKByVersion(version: string): JDKVersion | undefined {
  return exampleJDKData.find((jdk) => jdk.version === version);
}

/**
 * 特定のOSに対応するJDKを検索
 * @param os OS種類
 * @returns JDKVersion[]
 */
export function findJDKsByOS(os: OSType): JDKVersion[] {
  return exampleJDKData.filter((jdk) =>
    jdk.downloads.some((download) => download.os === os)
  );
}

/**
 * LTS版のJDKのみを取得
 * @returns JDKVersion[]
 */
export function getLTSVersions(): JDKVersion[] {
  return exampleJDKData.filter((jdk) => jdk.isLTS === true);
}

/**
 * 特定のベンダーのJDKを検索
 * @param vendor ベンダー名
 * @returns JDKVersion[]
 */
export function findJDKsByVendor(vendor: string): JDKVersion[] {
  return exampleJDKData.filter(
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
  return exampleJDKData.map((jdk) => jdk.version);
}

/**
 * 利用可能なすべてのベンダーを取得
 * @returns string[]
 */
export function getAvailableVendors(): string[] {
  const vendors = exampleJDKData
    .map((jdk) => jdk.vendor)
    .filter((vendor): vendor is string => vendor !== undefined);
  
  // 重複を削除
  return [...new Set(vendors)];
}

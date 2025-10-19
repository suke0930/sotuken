import { ServerSchema } from '../types/server.types';

/**
 * サンプルデータ: Minecraft サーバーソフトウェア情報
 * 
 * このデータは開発・テスト用のモックデータです。
 * 本番環境では外部API、データベース、または設定ファイルから取得することを推奨します。
 */
export const exampleData: ServerSchema = [
  {
    name: 'Vanilla',
    versions: [
      {
        version: '1.12.2',
        jdk: '8',
        downloadUrl: 'https://example.com/vanilla/1.12.2/server.jar',
      },
      {
        version: '1.16.5',
        jdk: '11',
        downloadUrl: 'https://example.com/vanilla/1.16.5/server.jar',
      },
      {
        version: '1.18.2',
        jdk: '17',
        downloadUrl: 'https://example.com/vanilla/1.18.2/server.jar',
      },
      {
        version: '1.20.1',
        jdk: '17',
        downloadUrl: 'https://example.com/vanilla/1.20.1/server.jar',
      },
    ],
  },
  {
    name: 'Forge',
    versions: [
      {
        version: '1.12.2',
        jdk: '8',
        downloadUrl: 'https://example.com/forge/1.12.2/forge-installer.jar',
      },
      {
        version: '1.16.5',
        jdk: '11',
        downloadUrl: 'https://example.com/forge/1.16.5/forge-installer.jar',
      },
      {
        version: '1.18.2',
        jdk: '17',
        downloadUrl: 'https://example.com/forge/1.18.2/forge-installer.jar',
      },
      {
        version: '1.20.1',
        jdk: '17',
        downloadUrl: 'https://example.com/forge/1.20.1/forge-installer.jar',
      },
    ],
  },
  {
    name: 'Fabric',
    versions: [
      {
        version: '1.16.5',
        jdk: '11',
        downloadUrl: 'https://example.com/fabric/1.16.5/fabric-server.jar',
      },
      {
        version: '1.18.2',
        jdk: '17',
        downloadUrl: 'https://example.com/fabric/1.18.2/fabric-server.jar',
      },
      {
        version: '1.20.1',
        jdk: '17',
        downloadUrl: 'https://example.com/fabric/1.20.1/fabric-server.jar',
      },
    ],
  },
  {
    name: 'Paper',
    versions: [
      {
        version: '1.16.5',
        jdk: '11',
        downloadUrl: 'https://example.com/paper/1.16.5/paper-server.jar',
      },
      {
        version: '1.18.2',
        jdk: '17',
        downloadUrl: 'https://example.com/paper/1.18.2/paper-server.jar',
      },
      {
        version: '1.20.1',
        jdk: '17',
        downloadUrl: 'https://example.com/paper/1.20.1/paper-server.jar',
      },
    ],
  },
];

/**
 * 特定のサーバーソフトウェアを名前で検索
 * @param name サーバーソフトウェア名
 * @returns ServerSoftware | undefined
 */
export function findServerByName(name: string) {
  return exampleData.find(
    (server) => server.name.toLowerCase() === name.toLowerCase()
  );
}

/**
 * 特定のバージョンをサポートするサーバーソフトウェアを検索
 * @param version Minecraft バージョン
 * @returns ServerSoftware[]
 */
export function findServersByVersion(version: string) {
  return exampleData.filter((server) =>
    server.versions.some((v) => v.version === version)
  );
}

/**
 * 特定のJDKバージョンをサポートするサーバーソフトウェアを検索
 * @param jdk JDK バージョン
 * @returns ServerSoftware[]
 */
export function findServersByJdk(jdk: string) {
  return exampleData.filter((server) =>
    server.versions.some((v) => v.jdk === jdk)
  );
}

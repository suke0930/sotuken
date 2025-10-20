/**
 * @file makedummy.ts
 * @description
 * このスクリプトは、開発やテスト用にダミーのリソースファイル群を生成します。
 * `DirectoryStructure` に定義された構造に基づいて、指定されたサイズの
 * JDKアーカイブやMinecraftサーバーのjarファイルを模したファイルを作成します。
 *
 * @usage
 * 1. 通常の実行 (定義済みのサイズでファイルを作成):
 *    ts-node makedummy.ts
 *
 * 2. ファイルサイズを一括で指定して実行:
 *    ts-node makedummy.ts --size <size>
 *
 * @example
 * // すべてのファイルを10KBで作成
 * ts-node makedummy.ts --size 10KB
 */

import * as fs from 'fs';
import * as path from 'path';

interface FileConfig {
    path: string;
    size: string; // 例: "100KB", "50MB", "1GB"
}

interface DirectoryStructure {
    jdk: {
        [version: string]: {
            [platform: string]: FileConfig[];
        };
    };
    servers: {
        [type: string]: {
            [version: string]: FileConfig[];
        };
    };
}

/**
 * サイズ文字列をバイト数に変換
 * @param sizeStr - "100KB", "50MB", "1GB" などの形式
 */
function parseSizeToBytes(sizeStr: string): number {
    const match = sizeStr.match(/^(\d+(?:\.\d+)?)(KB|MB|GB)$/i);
    if (!match || !match[1] || !match[2]) {
        throw new Error(`Invalid size format: ${sizeStr}`);
    }

    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();

    const multipliers: { [key: string]: number } = {
        'KB': 1024,
        'MB': 1024 * 1024,
        'GB': 1024 * 1024 * 1024,
    };

    const multiplier = multipliers[unit];
    if (multiplier === undefined) {
        throw new Error(`Unknown size unit: ${unit}`);
    }

    return Math.floor(value * multiplier);
}

/**
 * ダミーファイルを作成
 * @param filePath - 作成するファイルのパス
 * @param sizeInBytes - ファイルサイズ（バイト）
 */
function createDummyFile(filePath: string, sizeInBytes: number): void {
    const dir = path.dirname(filePath);

    // ディレクトリが存在しない場合は作成
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    // ダミーデータを書き込む
    const chunkSize = 1024 * 1024; // 1MB chunks
    const fd = fs.openSync(filePath, 'w');

    let remainingBytes = sizeInBytes;

    while (remainingBytes > 0) {
        const writeSize = Math.min(chunkSize, remainingBytes);
        const buffer = Buffer.alloc(writeSize, 0);
        fs.writeSync(fd, buffer, 0, writeSize);
        remainingBytes -= writeSize;
    }
    fs.closeSync(fd);
    console.log(`Created: ${filePath} (${formatBytes(sizeInBytes)})`);
}

/**
 * バイト数を人間が読みやすい形式に変換
 */
function formatBytes(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

/**
 * ディレクトリ構造に基づいてダミーファイルを作成
 */
function createResourceFiles(baseDir: string = '.', overrideSize?: string) {
    const structure: DirectoryStructure = {
        jdk: {
            '8': {
                'windows': [
                    { path: 'jdk-8u351-windows-x64.zip', size: '150MB' }
                ],
                'linux': [
                    { path: 'jdk-8u351-linux-x64.tar.gz', size: '140MB' }
                ],
                'macos': [
                    { path: 'jdk-8u351-macos-x64.dmg', size: '160MB' }
                ]
            },
            '11': {
                'windows': [
                    { path: 'jdk-11.0.17-windows-x64.zip', size: '170MB' }
                ],
                'linux': [
                    { path: 'jdk-11.0.17-linux-x64.tar.gz', size: '165MB' }
                ],
                'macos': [
                    { path: 'jdk-11.0.17-macos-x64.dmg', size: '175MB' }
                ]
            },
            '17': {
                'windows': [
                    { path: 'jdk-17.0.5-windows-x64.zip', size: '180MB' }
                ],
                'linux': [
                    { path: 'jdk-17.0.5-linux-x64.tar.gz', size: '175MB' }
                ],
                'macos': [
                    { path: 'jdk-17.0.5-macos-x64.dmg', size: '185MB' }
                ]
            },
            '21': {
                'windows': [
                    { path: 'jdk-21.0.1-windows-x64.zip', size: '190MB' }
                ],
                'linux': [
                    { path: 'jdk-21.0.1-linux-x64.tar.gz', size: '185MB' }
                ],
                'macos': [
                    { path: 'jdk-21.0.1-macos-x64.dmg', size: '195MB' }
                ]
            }
        },
        servers: {
            'vanilla': {
                '1.12.2': [
                    { path: 'server.jar', size: '30MB' }
                ],
                '1.16.5': [
                    { path: 'server.jar', size: '40MB' }
                ],
                '1.18.2': [
                    { path: 'server.jar', size: '45MB' }
                ],
                '1.20.1': [
                    { path: 'server.jar', size: '50MB' }
                ]
            },
            'forge': {
                '1.12.2': [
                    { path: 'forge-1.12.2-installer.jar', size: '5MB' }
                ],
                '1.16.5': [
                    { path: 'forge-1.16.5-installer.jar', size: '6MB' }
                ],
                '1.20.1': [
                    { path: 'forge-1.20.1-installer.jar', size: '7MB' }
                ]
            },
            'fabric': {
                '1.18.2': [
                    { path: 'fabric-installer-1.18.2.jar', size: '3MB' }
                ],
                '1.20.1': [
                    { path: 'fabric-installer-1.20.1.jar', size: '3.5MB' }
                ]
            },
            'paper': {
                '1.18.2': [
                    { path: 'paper-1.18.2.jar', size: '42MB' }
                ],
                '1.20.1': [
                    { path: 'paper-1.20.1.jar', size: '48MB' }
                ]
            }
        }
    };

    // JDKファイルの作成
    for (const [version, platforms] of Object.entries(structure.jdk)) {
        for (const [platform, files] of Object.entries(platforms)) {
            for (const file of files) {
                const fullPath = path.join(baseDir, 'jdk', version, platform, file.path);
                const sizeStr = overrideSize ?? file.size;
                const sizeInBytes = parseSizeToBytes(sizeStr);
                createDummyFile(fullPath, sizeInBytes);
            }
        }
    }

    // サーバーファイルの作成
    for (const [serverType, versions] of Object.entries(structure.servers)) {
        for (const [version, files] of Object.entries(versions)) {
            for (const file of files) {
                const fullPath = path.join(baseDir, 'servers', serverType, version, file.path);
                const sizeStr = overrideSize ?? file.size;
                const sizeInBytes = parseSizeToBytes(sizeStr);
                createDummyFile(fullPath, sizeInBytes);
            }
        }
    }

    console.log('\n✅ All dummy files created successfully!');
}

// 実行
try {
    const args = process.argv.slice(2);
    const sizeIndex = args.indexOf('--size');
    let overrideSize: string | undefined;

    if (sizeIndex > -1 && args[sizeIndex + 1]) {
        overrideSize = args[sizeIndex + 1];
        console.log(`\nOverriding all file sizes to: ${overrideSize}\n`);
    }

    createResourceFiles('.', overrideSize);
} catch (error) {
    console.error('❌ Error creating files:', error);
    process.exit(1);
}

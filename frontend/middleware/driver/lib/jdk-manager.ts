import { promises as fs } from 'fs';
import path from 'path';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { Transform } from 'stream';
import axios from 'axios';
import { JDKS_DIR } from './constants';
import { JobManager } from './job-manager';
import { JDKInfo } from './types';

export class JdkManager {
    static async list(): Promise<JDKInfo[]> {
        try {
            const entries = await fs.readdir(JDKS_DIR, { withFileTypes: true });
            return (await Promise.all(entries.filter(e => e.isDirectory()).map(async (e) => {
                const home = path.join(JDKS_DIR, e.name);
                return {
                    version: e.name.replace(/^jdk-?/, ''),
                    home,
                    installedAt: (await fs.stat(home)).mtime.toISOString()
                } as JDKInfo;
            })));
        } catch {
            await fs.mkdir(JDKS_DIR, { recursive: true });
            return [];
        }
    }

    // 内部APIとして直接アセットサーバーにアクセス（認証不要の内部通信）
    static async getAvailable(): Promise<any[]> {
        try {
            // 内部通信なので、直接アセットサーバーにアクセス
            const ASSET_SERVER_URL = process.env.ASSET_SERVER_URL || 'http://localhost:12801';
            const response = await axios.get(`${ASSET_SERVER_URL}/api/resources`, {
                params: { type: 'jdk' }
            });
            return response.data.resources || [];
        } catch (error) {
            console.error('Failed to fetch available JDKs:', error);
            return [];
        }
    }

    static recommend(minecraftVersion: string): string {
        const parts = minecraftVersion.split('.');
        if (!parts[0]) throw Error;
        const major = parseInt(parts[0], 10);
        const minor = parseInt(parts[1] || '0', 10);

        if (major <= 1 && minor <= 16) return "8";
        if (major <= 1 && minor <= 20) return "17";
        return "21";
    }

    static async find(version: string): Promise<JDKInfo | null> {
        const list = await this.list();
        return list.find(j => j.version.startsWith(version)) || null;
    }

    // 内部的にアセットサーバーから直接ダウンロード
    static async download(version: string, owner: string) {
        const job = JobManager.create("jdk-download", owner, { version });

        // アセットサーバーからリソース情報を取得（内部通信）
        const available = await this.getAvailable();
        const resource = available.find(r => r.version === version);

        if (!resource) {
            JobManager.fail(job.id, { message: `JDK ${version} not found in asset server` });
            return job;
        }

        // ダウンロード処理を非同期で実行
        setImmediate(async () => {
            try {
                const targetDir = path.join(JDKS_DIR, `jdk-${version}`);
                await fs.mkdir(targetDir, { recursive: true });

                // 内部通信なので直接アセットサーバーから取得
                const ASSET_SERVER_URL = process.env.ASSET_SERVER_URL || 'http://localhost:12801';
                const downloadUrl = resource.downloadUrl.startsWith('http')
                    ? resource.downloadUrl
                    : resource.downloadUrl.replace('/api/assets', ASSET_SERVER_URL);

                console.log(`[Internal] Downloading JDK from: ${downloadUrl}`);

                const response = await axios({
                    method: 'GET',
                    url: downloadUrl,
                    responseType: 'stream'
                });

                const totalSize = parseInt(response.headers['content-length'] || '0', 10);
                let downloadedSize = 0;

                // プログレス更新用のストリーム変換
                const progressStream = new Transform({
                    transform(chunk: any, encoding: any, callback: any) {
                        downloadedSize += chunk.length;
                        const progress = Math.round((downloadedSize / totalSize) * 100);
                        JobManager.update(job.id, {
                            progress,
                            payload: {
                                ...job.payload,
                                downloadedSize,
                                totalSize
                            }
                        });
                        callback(null, chunk);
                    }
                });

                // ダミーファイルとして保存
                const tempFile = path.join(targetDir, 'jdk.tar.gz');
                const writeStream = createWriteStream(tempFile);

                await pipeline(
                    response.data,
                    progressStream,
                    writeStream
                );

                console.log(`[Internal] JDK ${version} downloaded successfully for user ${owner}`);

                // ダウンロード完了
                JobManager.succeed(job.id, { version, home: targetDir });
            } catch (error: any) {
                console.error(`[Internal] JDK download error for user ${owner}:`, error);
                JobManager.fail(job.id, { message: error.message });
            }
        });

        return job;
    }
}

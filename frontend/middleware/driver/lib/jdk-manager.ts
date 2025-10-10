import { promises as fs } from 'fs';
import path from 'path';
import { JDKS_DIR } from './constants';
import { JobManager } from './job-manager';
import { JDKInfo } from './types';

export class JdkManager {
    static async list(): Promise<JDKInfo[]> {
        try {
            const entries = await fs.readdir(JDKS_DIR, { withFileTypes: true });
            return (await Promise.all(entries.filter(e => e.isDirectory()).map(async (e) => {
                const home = path.join(JDKS_DIR, e.name);
                return { version: e.name.replace(/^jdk-?/, ''), home, installedAt: (await fs.stat(home)).mtime.toISOString() } as JDKInfo;
            })));
        } catch {
            await fs.mkdir(JDKS_DIR, { recursive: true });
            return [];
        }
    }

    // 単純な推奨ロジック（必要あれば差し替え）
    static recommend(minecraftVersion: string): "8" | "11" | "17" | "21" {
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

    // スタブ: ダウンロードを模擬（実運用は Middle Agent に依頼）
    static async download(version: string, owner: string) {
        const job = JobManager.create("jdk-download", owner, { version });
        let p = 0;
        const timer = setInterval(async () => {
            p += Math.floor(Math.random() * 20) + 5;
            if (p >= 100) p = 100;
            JobManager.update(job.id, { progress: p });
            if (p >= 100) {
                clearInterval(timer);
                // ダミーのディレクトリ作成
                const dir = `${JDKS_DIR}/jdk-${version}`;
                await fs.mkdir(dir, { recursive: true });
                JobManager.succeed(job.id, { version, home: dir });
            }
        }, 500);
        return job;
    }
}

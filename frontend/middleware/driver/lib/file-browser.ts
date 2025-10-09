import { promises as fs } from 'fs';
import path from 'path';

export async function listDir(base: string, p?: string) {
    const abs = path.resolve(base, p || '.'); // path traversal 対策
    const safeBase = path.resolve(base);
    if (!abs.startsWith(safeBase)) throw new Error('path_out_of_root');

    const entries = await fs.readdir(abs, { withFileTypes: true });
    const result = await Promise.all(entries.map(async e => {
        const stat = await fs.stat(path.join(abs, e.name));
        return {
            name: e.name,
            type: e.isDirectory() ? 'dir' : 'file',
            size: stat.size,
            mtime: stat.mtime.toISOString()
        };
    }));
    return { cwd: abs, entries: result };
}

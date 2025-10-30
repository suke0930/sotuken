/**
 * JDK管理システム ファイル操作ユーティリティ
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { createReadStream } from 'fs';
import AdmZip from 'adm-zip';
import tar from 'tar';
import { Result } from './jdk-registry.types';

/**
 * SHA-256チェックサムを計算
 */
export async function calculateChecksum(filePath: string): Promise<Result<string>> {
  try {
    const hash = crypto.createHash('sha256');
    const stream = createReadStream(filePath);

    return new Promise((resolve) => {
      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => {
        const checksum = hash.digest('hex');
        resolve({ success: true, data: checksum });
      });
      stream.on('error', (error) => {
        resolve({
          success: false,
          error: `Failed to calculate checksum: ${error.message}`
        });
      });
    });
  } catch (error: any) {
    return {
      success: false,
      error: `Failed to calculate checksum: ${error.message}`
    };
  }
}

/**
 * ZIPファイルを解凍（Windows用）
 */
export async function extractZip(zipPath: string, destPath: string): Promise<Result<void>> {
  try {
    await fs.mkdir(destPath, { recursive: true });
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(destPath, true);
    return { success: true, data: undefined };
  } catch (error: any) {
    return {
      success: false,
      error: `Failed to extract zip: ${error.message}`
    };
  }
}

/**
 * TAR.GZファイルを解凍（Linux用）
 */
export async function extractTarGz(tarPath: string, destPath: string): Promise<Result<void>> {
  try {
    await fs.mkdir(destPath, { recursive: true });
    await tar.x({
      file: tarPath,
      cwd: destPath
    });
    return { success: true, data: undefined };
  } catch (error: any) {
    return {
      success: false,
      error: `Failed to extract tar.gz: ${error.message}`
    };
  }
}

/**
 * アーカイブファイルを解凍（形式を自動判定）
 */
export async function extractArchive(archivePath: string, destPath: string): Promise<Result<void>> {
  const ext = path.extname(archivePath).toLowerCase();
  
  if (ext === '.zip') {
    return await extractZip(archivePath, destPath);
  } else if (ext === '.gz' || archivePath.endsWith('.tar.gz') || archivePath.endsWith('.tgz')) {
    return await extractTarGz(archivePath, destPath);
  } else {
    return {
      success: false,
      error: `Unsupported archive format: ${ext}`
    };
  }
}

/**
 * ディレクトリを再帰的に削除
 */
export async function removeDirectory(dirPath: string): Promise<Result<void>> {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
    return { success: true, data: undefined };
  } catch (error: any) {
    return {
      success: false,
      error: `Failed to remove directory: ${error.message}`
    };
  }
}

/**
 * ディレクトリを移動
 */
export async function moveDirectory(srcPath: string, destPath: string): Promise<Result<void>> {
  try {
    await fs.rename(srcPath, destPath);
    return { success: true, data: undefined };
  } catch (error: any) {
    return {
      success: false,
      error: `Failed to move directory: ${error.message}`
    };
  }
}

/**
 * ディレクトリをコピー（再帰的）
 */
export async function copyDirectory(srcPath: string, destPath: string): Promise<Result<void>> {
  try {
    await fs.mkdir(destPath, { recursive: true });
    const entries = await fs.readdir(srcPath, { withFileTypes: true });

    for (const entry of entries) {
      const srcFile = path.join(srcPath, entry.name);
      const destFile = path.join(destPath, entry.name);

      if (entry.isDirectory()) {
        const result = await copyDirectory(srcFile, destFile);
        if (!result.success) return result;
      } else {
        await fs.copyFile(srcFile, destFile);
      }
    }

    return { success: true, data: undefined };
  } catch (error: any) {
    return {
      success: false,
      error: `Failed to copy directory: ${error.message}`
    };
  }
}

/**
 * ファイルが存在するかチェック
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * ディレクトリ内でファイルを検索
 */
export async function findFile(baseDir: string, fileName: string): Promise<Result<string>> {
  try {
    const search = async (dir: string): Promise<string | null> => {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isFile() && entry.name === fileName) {
          return fullPath;
        } else if (entry.isDirectory()) {
          const found = await search(fullPath);
          if (found) return found;
        }
      }

      return null;
    };

    const result = await search(baseDir);

    if (result) {
      return { success: true, data: result };
    } else {
      return {
        success: false,
        error: `File not found: ${fileName}`
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: `Failed to search file: ${error.message}`
    };
  }
}

/**
 * アーカイブファイル名から structName を生成
 */
export function generateStructName(archivePath: string): string {
  const fileName = path.basename(archivePath);
  const nameWithoutExt = fileName.replace(/\.(zip|tar\.gz|tgz)$/, '');
  return nameWithoutExt;
}

/**
 * structName とメジャーバージョンから ID を生成
 */
export function generateId(majorVersion: number, structName: string): string {
  // structNameからベンダーを推測
  let vendor = 'openjdk';
  const lowerName = structName.toLowerCase();
  
  if (lowerName.includes('temurin')) vendor = 'temurin';
  else if (lowerName.includes('oracle')) vendor = 'oracle';
  else if (lowerName.includes('zulu')) vendor = 'zulu';
  else if (lowerName.includes('corretto')) vendor = 'corretto';
  else if (lowerName.includes('adoptium')) vendor = 'adoptium';
  
  return `jdk-${majorVersion}-${vendor}`;
}

/**
 * 現在のOSを取得
 */
export function getCurrentOS(): string {
  const platform = process.platform;
  if (platform === 'win32') return 'windows';
  if (platform === 'darwin') return 'macos';
  if (platform === 'linux') return 'linux';
  return 'unknown';
}

/**
 * 解凍後のディレクトリ構造を正規化
 * 多くのアーカイブは単一のルートディレクトリを持つため、それを検出して返す
 */
export async function normalizeExtractedPath(extractPath: string): Promise<Result<string>> {
  try {
    const entries = await fs.readdir(extractPath, { withFileTypes: true });

    // エントリが1つだけで、それがディレクトリの場合
    if (entries.length === 1 && entries[0].isDirectory()) {
      return { success: true, data: path.join(extractPath, entries[0].name) };
    }

    // 複数のエントリがある場合、そのまま返す
    return { success: true, data: extractPath };
  } catch (error: any) {
    return {
      success: false,
      error: `Failed to normalize path: ${error.message}`
    };
  }
}

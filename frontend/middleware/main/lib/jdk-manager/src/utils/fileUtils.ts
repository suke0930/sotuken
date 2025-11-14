/**
 * File Utility Functions
 * 
 * ファイル操作に関するユーティリティ関数群
 */

import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';
import AdmZip from 'adm-zip';
import * as tar from 'tar';
import { Result } from '../types/jdk-registry.types';

const execAsync = promisify(exec);

/**
 * 現在のOSを判定
 */
export function getCurrentOS(): string {
  const platform = process.platform;
  if (platform === 'win32') return 'windows';
  if (platform === 'darwin') return 'macos';
  if (platform === 'linux') return 'linux';
  return 'unknown';
}

/**
 * ファイルのSHA-256チェックサムを計算
 */
export async function calculateChecksum(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fsSync.createReadStream(filePath);

    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

/**
 * ディレクトリを再帰的にコピー
 */
export async function copyDirectory(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

/**
 * ディレクトリを再帰的に削除
 */
export async function removeDirectory(dirPath: string): Promise<void> {
  if (fsSync.existsSync(dirPath)) {
    await fs.rm(dirPath, { recursive: true, force: true });
  }
}

/**
 * ディレクトリを移動
 */
export async function moveDirectory(src: string, dest: string): Promise<void> {
  await fs.rename(src, dest);
}

/**
 * ファイルが存在するか確認
 */
export function fileExists(filePath: string): boolean {
  return fsSync.existsSync(filePath);
}

/**
 * ZIPファイルを解凍
 */
export async function extractZip(zipPath: string, destPath: string): Promise<void> {
  const zip = new AdmZip(zipPath);
  await fs.mkdir(destPath, { recursive: true });
  zip.extractAllTo(destPath, true);
}

/**
 * TAR.GZファイルを解凍
 */
export async function extractTarGz(tarPath: string, destPath: string): Promise<void> {
  await fs.mkdir(destPath, { recursive: true });
  await tar.x({
    file: tarPath,
    cwd: destPath
  });
}

/**
 * アーカイブを解凍（形式を自動判定）
 */
export async function extractArchive(archivePath: string, destPath: string): Promise<Result<void>> {
  try {
    const ext = path.extname(archivePath).toLowerCase();

    if (ext === '.zip') {
      await extractZip(archivePath, destPath);
    } else if (ext === '.gz' || archivePath.endsWith('.tar.gz')) {
      await extractTarGz(archivePath, destPath);
    } else {
      return {
        success: false,
        error: `Unsupported archive format: ${ext}`
      };
    }

    return { success: true, data: undefined };
  } catch (error: any) {
    console.warn(error);
    return {
      success: false,
      error: `Failed to extract archive: ${error.message}`
    };
  }
}

/**
 * ディレクトリ内でファイルを検索
 */
export async function findFile(
  baseDir: string,
  fileName: string,
  maxDepth: number = 5
): Promise<string | null> {
  async function search(dir: string, depth: number): Promise<string | null> {
    if (depth > maxDepth) return null;

    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isFile() && entry.name === fileName) {
        return fullPath;
      }

      if (entry.isDirectory()) {
        const found = await search(fullPath, depth + 1);
        if (found) return found;
      }
    }

    return null;
  }

  return search(baseDir, 0);
}

/**
 * Javaバージョンを取得
 */
export async function getJavaVersion(javaPath: string): Promise<Result<number>> {
  try {
    const { stdout, stderr } = await execAsync(`"${javaPath}" -version`);
    const output = stderr || stdout;

    // 例: "openjdk version "1.8.0_462"" から 8 を抽出
    // 例: "openjdk version "21.0.5"" から 21 を抽出
    const match = output.match(/version "(\d+)\.?(\d+)?\.?(\d+)?/);

    if (match) {
      const major = parseInt(match[1]);
      const version = major === 1 ? parseInt(match[2]) : major; // Java 8以前は "1.8" 形式
      return { success: true, data: version };
    }

    return {
      success: false,
      error: 'Failed to parse Java version from output'
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Failed to execute java -version: ${error.message}`
    };
  }
}

/**
 * structNameを自動生成
 */
export function generateStructName(archivePath: string): string {
  const fileName = path.basename(archivePath);
  const nameWithoutExt = fileName.replace(/\.(zip|tar\.gz|tgz)$/, '');
  return nameWithoutExt;
}

/**
 * IDを生成
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
 * 推奨チェックサム対象ファイルのパスを取得
 */
export function getRecommendedChecksumFiles(jdkPath: string, os: string): string[] {
  const files: string[] = [];

  if (os === 'windows') {
    files.push(
      path.join(jdkPath, 'bin', 'java.exe'),
      path.join(jdkPath, 'bin', 'javaw.exe'),
      path.join(jdkPath, 'bin', 'javac.exe')
    );
  } else {
    files.push(
      path.join(jdkPath, 'bin', 'java'),
      path.join(jdkPath, 'bin', 'javac')
    );
  }

  // 共通ファイル
  files.push(
    path.join(jdkPath, 'lib', 'modules'),
    path.join(jdkPath, 'lib', 'jrt-fs.jar')
  );

  // 存在するファイルのみを返す
  return files.filter(f => fileExists(f));
}

/**
 * 解凍後のJDKルートディレクトリを検索
 * （解凍したディレクトリ内に1階層目のディレクトリがある場合がある）
 */
export async function findJdkRoot(extractedPath: string): Promise<string> {
  const javaExeName = getCurrentOS() === 'windows' ? 'java.exe' : 'java';
  const javaPath = await findFile(extractedPath, javaExeName, 3);

  if (!javaPath) {
    return extractedPath;
  }

  // bin/java.exe のパスから、JDKルートを取得
  // 例: /extracted/jdk-17/bin/java.exe → /extracted/jdk-17
  const binDir = path.dirname(javaPath);
  const jdkRoot = path.dirname(binDir);

  return jdkRoot;
}

/**
 * アーカイブファイル名からOSを検出
 * @param archivePath アーカイブファイルのパス
 * @returns 検出されたOS ('windows' | 'linux' | 'macos') または null
 */
export function detectArchiveOS(archivePath: string): string | null {
  const fileName = path.basename(archivePath).toLowerCase();
  const ext = path.extname(archivePath).toLowerCase();

  // ファイル名から検出（jdk.jsonの命名規則に基づく）
  // 例: OpenJDK21U-jdk_x64_windows_hotspot_21.0.9_10.zip
  // 例: OpenJDK21U-jdk_x64_linux_hotspot_21.0.9_10.tar.gz
  // 例: OpenJDK21U-jdk_x64_mac_hotspot_21.0.9_10.tar.gz
  if (fileName.includes('windows')) return 'windows';
  if (fileName.includes('linux')) return 'linux';
  if (fileName.includes('macos') || fileName.includes('mac')) return 'macos';

  // ファイル名から検出できない場合、拡張子から推測
  if (ext === '.zip') return 'windows';
  if (ext === '.gz' || archivePath.endsWith('.tar.gz')) {
    // tar.gzはlinuxまたはmacOSだが、ここではlinuxとして扱う
    // より正確な判定はファイル名に依存
    return 'linux';
  }

  return null;
}

/**
 * JDKバイナリが現在のOSで実行可能かを検証
 * @param javaPath Javaバイナリのパス
 * @param expectedOS 期待されるOS
 * @returns 検証結果
 */
export async function validateJdkExecutable(
  javaPath: string,
  expectedOS: string
): Promise<Result<void>> {
  try {
    // java -version を実際に実行して実行可能性を確認
    const versionResult = await getJavaVersion(javaPath);

    if (!versionResult.success) {
      return {
        success: false,
        error: `JDKバイナリが${expectedOS}上で実行できません。クロスプラットフォームインストールの問題の可能性があります: ${versionResult.error}`
      };
    }

    return { success: true, data: undefined };
  } catch (error: any) {
    return {
      success: false,
      error: `JDKバイナリの検証に失敗しました: ${error.message}`
    };
  }
}

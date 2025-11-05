import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { Throttle } from 'stream-throttle';

const router = Router();

/**
 * アセット配信のベースディレクトリ
 * プロジェクトルートの resources ディレクトリ
 */
const RESOURCES_BASE = path.join(__dirname, '../resources');

/**
 * ファイルの存在確認とセキュリティチェック
 */
function validateFilePath(requestedPath: string, baseDir: string): string | null {
  try {
    // パスを正規化
    const resolvedPath = path.resolve(baseDir, requestedPath);

    // パストラバーサル攻撃を防ぐ：ベースディレクトリ外へのアクセスを禁止
    if (!resolvedPath.startsWith(baseDir)) {
      return null;
    }

    // ファイルの存在確認
    if (!fs.existsSync(resolvedPath)) {
      return null;
    }

    // ディレクトリでないことを確認（ファイルのみ配信）
    const stat = fs.statSync(resolvedPath);
    if (!stat.isFile()) {
      return null;
    }

    return resolvedPath;
  } catch (error) {
    return null;
  }
}

/**
 * GET /assets/jdk/*
 * JDKファイルの配信
 * 
 * 例: GET /assets/jdk/8/windows/jdk-8u351-windows-x64.zip
 */
router.get(/^\/jdk\/(.+)$/, (req: Request, res: Response): void => {
  const requestedPath = req.params[0] || '';
  const jdkBaseDir = path.join(RESOURCES_BASE, 'jdk');

  const filePath = validateFilePath(requestedPath, jdkBaseDir);

  if (!filePath) {
    res.status(404).json({
      success: false,
      error: {
        message: 'ファイルが見つかりません',
        code: 'FILE_NOT_FOUND',
      },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const stat = fs.statSync(filePath);
  const fileName = path.basename(filePath);

  res.setHeader('Content-Length', stat.size);
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

  const fileStream = fs.createReadStream(filePath);

  // 帯域制限を設定（例: 1MB/秒 = 1024 * 1024 バイト/秒）
  const throttle = new Throttle({ rate: 1024 * 20240 });

  fileStream.on('error', (error) => {
    console.error('File streaming error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: {
          message: 'ファイル配信中にエラーが発生しました',
          code: 'STREAMING_ERROR',
        },
        timestamp: new Date().toISOString(),
      });
    }
  });

  // throttleを経由してレスポンスに送信
  fileStream.pipe(throttle).pipe(res);
});

/**
 * GET /assets/servers/*
 * サーバーソフトウェアファイルの配信
 * 
 * 例: GET /assets/servers/vanilla/1.20.1/server.jar
 *     GET /assets/servers/forge/1.20.1/forge-1.20.1-installer.jar
 */
router.get(/^\/servers\/(.+)$/, (req: Request, res: Response): void => {
  const requestedPath = req.params[0] || '';
  const serversBaseDir = path.join(RESOURCES_BASE, 'servers');

  const filePath = validateFilePath(requestedPath, serversBaseDir);

  if (!filePath) {
    res.status(404).json({
      success: false,
      error: {
        message: 'ファイルが見つかりません',
        code: 'FILE_NOT_FOUND',
      },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const stat = fs.statSync(filePath);
  const fileName = path.basename(filePath);

  res.setHeader('Content-Length', stat.size);
  res.setHeader('Content-Type', 'application/java-archive');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

  const fileStream = fs.createReadStream(filePath);

  fileStream.on('error', (error) => {
    console.error('File streaming error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: {
          message: 'ファイル配信中にエラーが発生しました',
          code: 'STREAMING_ERROR',
        },
        timestamp: new Date().toISOString(),
      });
    }
  });

  fileStream.pipe(res);
});

/**
 * GET /assets/list/jdk
 * JDKディレクトリ内の利用可能なファイル一覧を取得
 */
router.get('/list/jdk', (req: Request, res: Response): void => {
  try {
    const jdkBaseDir = path.join(RESOURCES_BASE, 'jdk');

    if (!fs.existsSync(jdkBaseDir)) {
      res.status(200).json({
        success: true,
        data: [],
        message: 'JDKディレクトリが存在しません',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // 再帰的にファイル一覧を取得
    const files = getFileList(jdkBaseDir, jdkBaseDir);

    res.status(200).json({
      success: true,
      data: files,
      count: files.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error listing JDK files:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'ファイル一覧の取得に失敗しました',
        code: 'LIST_ERROR',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /assets/list/servers
 * サーバーディレクトリ内の利用可能なファイル一覧を取得
 */
router.get('/list/servers', (req: Request, res: Response): void => {
  try {
    const serversBaseDir = path.join(RESOURCES_BASE, 'servers');

    if (!fs.existsSync(serversBaseDir)) {
      res.status(200).json({
        success: true,
        data: [],
        message: 'サーバーディレクトリが存在しません',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const files = getFileList(serversBaseDir, serversBaseDir);

    res.status(200).json({
      success: true,
      data: files,
      count: files.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error listing server files:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'ファイル一覧の取得に失敗しました',
        code: 'LIST_ERROR',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * ヘルパー関数：ディレクトリ内のファイル一覧を再帰的に取得
 */
function getFileList(dir: string, baseDir: string): Array<{
  path: string;
  size: number;
  name: string;
}> {
  const files: Array<{ path: string; size: number; name: string }> = [];

  function traverse(currentPath: string) {
    const items = fs.readdirSync(currentPath);

    for (const item of items) {
      const fullPath = path.join(currentPath, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        traverse(fullPath);
      } else if (stat.isFile()) {
        // ベースディレクトリからの相対パスを取得
        const relativePath = path.relative(baseDir, fullPath);
        files.push({
          path: relativePath.replace(/\\/g, '/'), // Windows対応
          size: stat.size,
          name: item,
        });
      }
    }
  }

  traverse(dir);
  return files;
}

export default router;

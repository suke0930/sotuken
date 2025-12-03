import { Router, Request, Response } from 'express';

const router = Router();

/**
 * FRP バイナリダウンロードURLの設定
 * 環境変数から取得、未設定時はデフォルトURL
 */
const FRP_BINARY_RELEASE_URL =
  process.env.FRP_BINARY_RELEASE_URL ||
  'https://github.com/fatedier/frp/releases/download/v0.65.0/frp_0.65.0_linux_amd64.tar.gz';

const FRP_VERSION = process.env.FRP_VERSION || '0.65.0';

/**
 * GET /frp/client-binary
 * FRPクライアント(frpc)バイナリのダウンロードURLを返す
 *
 * クライアント側でこのURLを使ってダウンロードを行う
 * frpcとfrpsは同じアーカイブに含まれている
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "downloadUrl": "https://github.com/fatedier/frp/releases/download/v0.65.0/frp_0.65.0_linux_amd64.tar.gz",
 *     "version": "0.65.0",
 *     "platform": "linux",
 *     "arch": "amd64",
 *     "binaryName": "frpc",
 *     "archivePath": "frp_0.65.0_linux_amd64/frpc"
 *   }
 * }
 */
router.get('/client-binary', (req: Request, res: Response): void => {
  try {
    // URLから情報を抽出
    const urlMatch = FRP_BINARY_RELEASE_URL.match(/frp_([^_]+)_([^_]+)_([^.]+)/);

    let platform = 'linux';
    let arch = 'amd64';

    if (urlMatch) {
      platform = urlMatch[2];
      arch = urlMatch[3];
    }

    res.status(200).json({
      success: true,
      data: {
        downloadUrl: FRP_BINARY_RELEASE_URL,
        version: FRP_VERSION,
        platform: platform,
        arch: arch,
        binaryName: 'frpc',
        archivePath: `frp_${FRP_VERSION}_${platform}_${arch}/frpc`,
        notes: [
          'Download the archive and extract the frpc binary',
          'The frpc binary is located at the archivePath within the archive',
          'Make sure to set executable permissions (chmod +x frpc on Unix-like systems)'
        ]
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error providing FRP binary URL:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'FRPバイナリ情報の取得に失敗しました',
        code: 'FRP_BINARY_ERROR',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /frp/info
 * FRP関連情報のエンドポイント
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "version": "0.65.0",
 *     "clientBinaryEndpoint": "/api/assets/frp/client-binary",
 *     "serverBinaryEndpoint": "/api/assets/frp/server-binary"
 *   }
 * }
 */
router.get('/info', (req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    data: {
      version: FRP_VERSION,
      releaseUrl: FRP_BINARY_RELEASE_URL,
      clientBinaryEndpoint: '/api/assets/frp/client-binary',
      serverBinaryEndpoint: '/api/assets/frp/server-binary',
      description: 'FRP (Fast Reverse Proxy) binary distribution endpoints'
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /frp/server-binary
 * FRPサーバー(frps)バイナリのダウンロードURLを返す
 *
 * Response形式はclient-binaryと同じ
 */
router.get('/server-binary', (req: Request, res: Response): void => {
  try {
    const urlMatch = FRP_BINARY_RELEASE_URL.match(/frp_([^_]+)_([^_]+)_([^.]+)/);

    let platform = 'linux';
    let arch = 'amd64';

    if (urlMatch) {
      platform = urlMatch[2];
      arch = urlMatch[3];
    }

    res.status(200).json({
      success: true,
      data: {
        downloadUrl: FRP_BINARY_RELEASE_URL,
        version: FRP_VERSION,
        platform: platform,
        arch: arch,
        binaryName: 'frps',
        archivePath: `frp_${FRP_VERSION}_${platform}_${arch}/frps`,
        notes: [
          'Download the archive and extract the frps binary',
          'The frps binary is located at the archivePath within the archive',
          'Make sure to set executable permissions (chmod +x frps on Unix-like systems)'
        ]
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error providing FRP server binary URL:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'FRPサーバーバイナリ情報の取得に失敗しました',
        code: 'FRP_SERVER_BINARY_ERROR',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;

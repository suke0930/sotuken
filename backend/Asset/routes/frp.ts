import { Router, Request, Response } from 'express';

const router = Router();

/**
 * FRP バイナリダウンロードURLの設定
 */
const FRP_VERSION = process.env.FRP_VERSION || '0.65.0';
const FRP_RELEASE_BASE_URL = `https://github.com/fatedier/frp/releases/download/v${FRP_VERSION}`;

/**
 * サポートされているプラットフォームとアーキテクチャの組み合わせ
 */
interface PlatformConfig {
  platform: string;
  arch: string;
  extension: string;
  binaryExtension: string;
}

const SUPPORTED_PLATFORMS: PlatformConfig[] = [
  { platform: 'linux', arch: 'amd64', extension: 'tar.gz', binaryExtension: '' },
  { platform: 'linux', arch: 'arm64', extension: 'tar.gz', binaryExtension: '' },
  { platform: 'darwin', arch: 'amd64', extension: 'tar.gz', binaryExtension: '' },
  { platform: 'darwin', arch: 'arm64', extension: 'tar.gz', binaryExtension: '' },
  { platform: 'windows', arch: 'amd64', extension: 'zip', binaryExtension: '.exe' },
  { platform: 'windows', arch: 'arm64', extension: 'zip', binaryExtension: '.exe' },
];

/**
 * プラットフォーム設定を取得
 */
function getPlatformConfig(platform: string, arch: string): PlatformConfig | null {
  return SUPPORTED_PLATFORMS.find(
    (p) => p.platform === platform && p.arch === arch
  ) || null;
}

/**
 * ダウンロードURLを生成
 */
function generateDownloadUrl(platform: string, arch: string): string {
  const config = getPlatformConfig(platform, arch);
  if (!config) {
    throw new Error(`Unsupported platform: ${platform}/${arch}`);
  }
  return `${FRP_RELEASE_BASE_URL}/frp_${FRP_VERSION}_${platform}_${arch}.${config.extension}`;
}

/**
 * GET /frp/binaries
 * すべてのサポートされているプラットフォームのバイナリ情報を返す
 */
router.get('/binaries', (req: Request, res: Response): void => {
  try {
    const binaries = SUPPORTED_PLATFORMS.map((config) => ({
      platform: config.platform,
      arch: config.arch,
      downloadUrl: generateDownloadUrl(config.platform, config.arch),
      version: FRP_VERSION,
      extension: config.extension,
      clientBinaryName: `frpc${config.binaryExtension}`,
      serverBinaryName: `frps${config.binaryExtension}`,
      archivePath: `frp_${FRP_VERSION}_${config.platform}_${config.arch}`,
    }));

    res.status(200).json({
      success: true,
      data: {
        version: FRP_VERSION,
        binaries,
        supportedPlatforms: SUPPORTED_PLATFORMS.map((p) => ({
          platform: p.platform,
          arch: p.arch,
        })),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error listing FRP binaries:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'FRPバイナリ一覧の取得に失敗しました',
        code: 'FRP_BINARIES_ERROR',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /frp/client-binary
 * FRPクライアント(frpc)バイナリのダウンロードURLを返す
 *
 * Query Parameters:
 * - platform: linux, darwin, windows (デフォルト: linux)
 * - arch: amd64, arm64 (デフォルト: amd64)
 */
router.get('/client-binary', (req: Request, res: Response): void => {
  try {
    const platform = (req.query.platform as string) || 'linux';
    const arch = (req.query.arch as string) || 'amd64';

    const config = getPlatformConfig(platform, arch);
    if (!config) {
      res.status(400).json({
        success: false,
        error: {
          message: `Unsupported platform/arch combination: ${platform}/${arch}`,
          code: 'UNSUPPORTED_PLATFORM',
          supportedPlatforms: SUPPORTED_PLATFORMS.map((p) => ({
            platform: p.platform,
            arch: p.arch,
          })),
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const downloadUrl = generateDownloadUrl(platform, arch);
    const binaryName = `frpc${config.binaryExtension}`;
    const archivePath = `frp_${FRP_VERSION}_${platform}_${arch}/${binaryName}`;

    const notes =
      platform === 'windows'
        ? [
            'Download the ZIP archive and extract the frpc.exe binary',
            `The frpc.exe binary is located at ${archivePath} within the archive`,
            'Windows Defender may flag the binary - add an exception if needed',
          ]
        : [
            'Download the archive and extract the frpc binary',
            `The frpc binary is located at ${archivePath} within the archive`,
            'Make sure to set executable permissions (chmod +x frpc on Unix-like systems)',
          ];

    res.status(200).json({
      success: true,
      data: {
        downloadUrl,
        version: FRP_VERSION,
        platform,
        arch,
        binaryName,
        archivePath,
        extension: config.extension,
        notes,
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
 * GET /frp/server-binary
 * FRPサーバー(frps)バイナリのダウンロードURLを返す
 *
 * Query Parameters:
 * - platform: linux, darwin, windows (デフォルト: linux)
 * - arch: amd64, arm64 (デフォルト: amd64)
 */
router.get('/server-binary', (req: Request, res: Response): void => {
  try {
    const platform = (req.query.platform as string) || 'linux';
    const arch = (req.query.arch as string) || 'amd64';

    const config = getPlatformConfig(platform, arch);
    if (!config) {
      res.status(400).json({
        success: false,
        error: {
          message: `Unsupported platform/arch combination: ${platform}/${arch}`,
          code: 'UNSUPPORTED_PLATFORM',
          supportedPlatforms: SUPPORTED_PLATFORMS.map((p) => ({
            platform: p.platform,
            arch: p.arch,
          })),
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const downloadUrl = generateDownloadUrl(platform, arch);
    const binaryName = `frps${config.binaryExtension}`;
    const archivePath = `frp_${FRP_VERSION}_${platform}_${arch}/${binaryName}`;

    const notes =
      platform === 'windows'
        ? [
            'Download the ZIP archive and extract the frps.exe binary',
            `The frps.exe binary is located at ${archivePath} within the archive`,
            'Windows Defender may flag the binary - add an exception if needed',
          ]
        : [
            'Download the archive and extract the frps binary',
            `The frps binary is located at ${archivePath} within the archive`,
            'Make sure to set executable permissions (chmod +x frps on Unix-like systems)',
          ];

    res.status(200).json({
      success: true,
      data: {
        downloadUrl,
        version: FRP_VERSION,
        platform,
        arch,
        binaryName,
        archivePath,
        extension: config.extension,
        notes,
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

/**
 * GET /frp/info
 * FRP関連情報のエンドポイント
 */
router.get('/info', (req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    data: {
      version: FRP_VERSION,
      releaseUrl: `${FRP_RELEASE_BASE_URL}`,
      clientBinaryEndpoint: '/api/assets/frp/client-binary',
      serverBinaryEndpoint: '/api/assets/frp/server-binary',
      binariesEndpoint: '/api/assets/frp/binaries',
      description: 'FRP (Fast Reverse Proxy) binary distribution endpoints',
      supportedPlatforms: SUPPORTED_PLATFORMS.map((p) => ({
        platform: p.platform,
        arch: p.arch,
        extension: p.extension,
      })),
    },
    timestamp: new Date().toISOString(),
  });
});

export default router;

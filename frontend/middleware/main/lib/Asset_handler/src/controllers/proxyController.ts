import { Request, Response } from 'express';
import axios from 'axios';
import { ApiResponse } from '../types';
import { backendURL } from '../app';
import { getCurrentOS } from '../../../jdk-manager/src/utils/fileUtils';
// Asset サーバーのベースURL（環境変数または設定から取得）
/**
 * Assetサーバーからサーバーリストを取得
 * GET /api/list/servers
 */
export const getServersList = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('📡 Proxying request to Asset server: /api/v1/servers');

    const response = await axios.get(`${backendURL}/api/v1/servers`);

    const apiResponse: ApiResponse = {
      success: true,
      data: response.data.data,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(apiResponse);
  } catch (error: any) {
    console.error('Failed to fetch servers list:', error.message);

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch servers list from Asset server',
        code: 'PROXY_ERROR',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * AssetサーバーからJDKリストを取得
 * GET /api/list/jdk
 */
export const getJDKList = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('📡 Proxying request to Asset server: /api/v1/jdk');

    const response = await axios.get(`${backendURL}/api/v1/jdk`);

    // 現在のサーバーOSを取得
    const serverOS = getCurrentOS();

    // 各JDKのダウンロードにrecommendedフラグを追加
    const enrichedData = response.data.data.map((jdk: any) => ({
      ...jdk,
      downloads: jdk.downloads.map((download: any) => {
        // macOSの場合は'mac'も'macos'も推奨とする
        const isRecommended = download.os === serverOS ||
                            (serverOS === 'macos' && download.os === 'mac') ||
                            (serverOS === 'mac' && download.os === 'macos');

        return {
          ...download,
          recommended: isRecommended
        };
      })
    }));

    const apiResponse: ApiResponse = {
      success: true,
      data: enrichedData,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(apiResponse);
  } catch (error: any) {
    console.error('Failed to fetch JDK list:', error.message);

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch JDK list from Asset server',
        code: 'PROXY_ERROR',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Assetサーバーからファイルリストを取得
 * GET /api/list/assets/:type (type = 'jdk' | 'servers')
 */
export const getAssetFilesList = async (req: Request, res: Response): Promise<void> => {
  try {
    const { type } = req.params;

    if (type !== 'jdk' && type !== 'servers') {
      res.status(400).json({
        success: false,
        error: {
          message: 'Invalid type parameter. Must be "jdk" or "servers"',
          code: 'INVALID_PARAMETER',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    console.log(`📡 Proxying request to Asset server: /api/assets/list/${type}`);

    const response = await axios.get(`${backendURL}/api/assets/list/${type}`);

    const apiResponse: ApiResponse = {
      success: true,
      data: response.data.data,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(apiResponse);
  } catch (error: any) {
    console.error('Failed to fetch asset files list:', error.message);

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch asset files list from Asset server',
        code: 'PROXY_ERROR',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

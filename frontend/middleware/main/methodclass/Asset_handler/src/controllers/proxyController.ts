import { Request, Response } from 'express';
import axios from 'axios';
import { ApiResponse } from '../types';

// Asset サーバーのベースURL（環境変数または設定から取得）
const ASSET_SERVER_URL = process.env.ASSET_SERVER_URL || 'http://localhost:3000';

/**
 * Assetサーバーからサーバーリストを取得
 * GET /api/list/servers
 */
export const getServersList = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('📡 Proxying request to Asset server: /api/v1/servers');
    
    const response = await axios.get(`${ASSET_SERVER_URL}/api/v1/servers`);
    
    const apiResponse: ApiResponse = {
      success: true,
      data: response.data.data,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(apiResponse);
  } catch (error: any) {
    console.error('❌ Failed to fetch servers list:', error.message);
    
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
    
    const response = await axios.get(`${ASSET_SERVER_URL}/api/v1/jdk`);
    
    const apiResponse: ApiResponse = {
      success: true,
      data: response.data.data,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(apiResponse);
  } catch (error: any) {
    console.error('❌ Failed to fetch JDK list:', error.message);
    
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
    
    const response = await axios.get(`${ASSET_SERVER_URL}/api/assets/list/${type}`);
    
    const apiResponse: ApiResponse = {
      success: true,
      data: response.data.data,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(apiResponse);
  } catch (error: any) {
    console.error('❌ Failed to fetch asset files list:', error.message);
    
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

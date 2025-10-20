import { Request, Response } from 'express';
import { AssetProxyService } from '../services/AssetProxyService';

/**
 * Asset Serverプロキシコントローラー
 * 
 * クライアントからのリクエストをAsset Serverに中継します。
 */
export class ProxyController {
  private assetProxy: AssetProxyService;
  
  constructor(assetServerUrl: string) {
    this.assetProxy = new AssetProxyService(assetServerUrl);
  }
  
  /**
   * Minecraftサーバー情報を取得
   * GET /api/servers
   */
  getServers = async (req: Request, res: Response): Promise<void> => {
    try {
      const data = await this.assetProxy.getServers();
      res.status(200).json(data);
    } catch (error) {
      console.error('Error in getServers:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'サーバー情報の取得に失敗しました',
          code: 'PROXY_ERROR',
        },
        timestamp: new Date().toISOString(),
      });
    }
  };
  
  /**
   * JDK情報を取得
   * GET /api/jdk
   */
  getJDKs = async (req: Request, res: Response): Promise<void> => {
    try {
      const data = await this.assetProxy.getJDKs();
      res.status(200).json(data);
    } catch (error) {
      console.error('Error in getJDKs:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'JDK情報の取得に失敗しました',
          code: 'PROXY_ERROR',
        },
        timestamp: new Date().toISOString(),
      });
    }
  };
  
  /**
   * JDKファイルリストを取得
   * GET /api/files/jdk
   */
  getJDKFiles = async (req: Request, res: Response): Promise<void> => {
    try {
      const data = await this.assetProxy.getJDKFileList();
      res.status(200).json(data);
    } catch (error) {
      console.error('Error in getJDKFiles:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'JDKファイルリストの取得に失敗しました',
          code: 'PROXY_ERROR',
        },
        timestamp: new Date().toISOString(),
      });
    }
  };
  
  /**
   * サーバーファイルリストを取得
   * GET /api/files/servers
   */
  getServerFiles = async (req: Request, res: Response): Promise<void> => {
    try {
      const data = await this.assetProxy.getServerFileList();
      res.status(200).json(data);
    } catch (error) {
      console.error('Error in getServerFiles:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'サーバーファイルリストの取得に失敗しました',
          code: 'PROXY_ERROR',
        },
        timestamp: new Date().toISOString(),
      });
    }
  };
  
  /**
   * Asset Serverのヘルスチェック
   * GET /api/health/asset
   */
  checkAssetHealth = async (req: Request, res: Response): Promise<void> => {
    try {
      const isHealthy = await this.assetProxy.healthCheck();
      
      if (isHealthy) {
        res.status(200).json({
          success: true,
          status: 'healthy',
          message: 'Asset Server is running',
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(503).json({
          success: false,
          status: 'unhealthy',
          message: 'Asset Server is not responding',
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Error in checkAssetHealth:', error);
      res.status(503).json({
        success: false,
        status: 'error',
        message: 'Failed to check Asset Server health',
        timestamp: new Date().toISOString(),
      });
    }
  };
}

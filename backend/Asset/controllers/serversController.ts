import { Request, Response } from 'express';
import { getServersData } from '../lib/sampleData';
import { ServerApiResponse } from '../types/server.types';

/**
 * 全サーバーソフトウェア情報を取得
 * GET /api/v1/servers
 * 
 * JSONファイルからリアルタイムでデータを読み込みます
 */
export const getAllServers = (req: Request, res: Response): void => {
  try {
    // リアルタイムでJSONファイルから読み込み
    const data = getServersData();
    
    const response: ServerApiResponse = {
      success: true,
      data: data,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching servers:', error);
    
    res.status(500).json({
      success: false,
      error: {
        message: 'サーバー情報の取得に失敗しました',
        code: 'INTERNAL_ERROR',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

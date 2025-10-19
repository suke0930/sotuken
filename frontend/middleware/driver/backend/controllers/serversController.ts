import { Request, Response } from 'express';
import { exampleData } from '../lib/sampleData';
import { ServerApiResponse } from '../types/server.types';

/**
 * 全サーバーソフトウェア情報を取得
 * GET /api/v1/servers
 */
export const getAllServers = (req: Request, res: Response): void => {
  try {
    const response: ServerApiResponse = {
      success: true,
      data: exampleData,
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

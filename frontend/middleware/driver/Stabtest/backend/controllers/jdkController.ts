import { Request, Response } from 'express';
import { getJDKData } from '../lib/jdkSampleData';
import { JDKApiResponse } from '../types/jdk.types';

/**
 * 全JDKバージョン情報を取得
 * GET /api/v1/jdk
 * 
 * JSONファイルからリアルタイムでデータを読み込みます
 */
export const getAllJDKs = (req: Request, res: Response): void => {
  try {
    // リアルタイムでJSONファイルから読み込み
    const data = getJDKData();
    
    const response: JDKApiResponse = {
      success: true,
      data: data,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching JDKs:', error);
    
    res.status(500).json({
      success: false,
      error: {
        message: 'JDK情報の取得に失敗しました',
        code: 'INTERNAL_ERROR',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

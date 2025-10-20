import axios, { AxiosResponse } from 'axios';

/**
 * Asset Serverプロキシサービス
 * 
 * Asset Serverへのリクエストを中継します。
 * CORS対策とアセットサーバーのブラックボックス化を実現します。
 */
export class AssetProxyService {
  private assetServerUrl: string;
  
  /**
   * コンストラクタ
   * @param assetServerUrl Asset ServerのベースURL（例: http://localhost:3000）
   */
  constructor(assetServerUrl: string) {
    this.assetServerUrl = assetServerUrl.replace(/\/$/, ''); // 末尾のスラッシュを削除
  }
  
  /**
   * Asset ServerからMinecraftサーバーリストを取得
   */
  async getServers(): Promise<any> {
    try {
      const response: AxiosResponse = await axios.get(
        `${this.assetServerUrl}/api/v1/servers`,
        {
          timeout: 10000, // 10秒タイムアウト
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Failed to fetch servers from Asset Server:', error);
      throw new Error('Asset Serverからサーバー情報の取得に失敗しました');
    }
  }
  
  /**
   * Asset ServerからJDKリストを取得
   */
  async getJDKs(): Promise<any> {
    try {
      const response: AxiosResponse = await axios.get(
        `${this.assetServerUrl}/api/v1/jdk`,
        {
          timeout: 10000,
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Failed to fetch JDKs from Asset Server:', error);
      throw new Error('Asset ServerからJDK情報の取得に失敗しました');
    }
  }
  
  /**
   * Asset Serverのヘルスチェック
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response: AxiosResponse = await axios.get(
        `${this.assetServerUrl}/health`,
        {
          timeout: 5000,
        }
      );
      
      return response.status === 200;
    } catch (error) {
      console.error('Asset Server health check failed:', error);
      return false;
    }
  }
  
  /**
   * Asset ServerからJDKファイルリストを取得
   */
  async getJDKFileList(): Promise<any> {
    try {
      const response: AxiosResponse = await axios.get(
        `${this.assetServerUrl}/api/assets/list/jdk`,
        {
          timeout: 10000,
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Failed to fetch JDK file list from Asset Server:', error);
      throw new Error('Asset ServerからJDKファイルリストの取得に失敗しました');
    }
  }
  
  /**
   * Asset Serverからサーバーファイルリストを取得
   */
  async getServerFileList(): Promise<any> {
    try {
      const response: AxiosResponse = await axios.get(
        `${this.assetServerUrl}/api/assets/list/servers`,
        {
          timeout: 10000,
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Failed to fetch server file list from Asset Server:', error);
      throw new Error('Asset Serverからサーバーファイルリストの取得に失敗しました');
    }
  }
  
  /**
   * ダウンロード用のAsset Server URLを構築
   * @param type 'jdk' | 'servers'
   * @param path ファイルパス（例: "8/windows/jdk-8-windows-x64.zip"）
   */
  buildDownloadUrl(type: 'jdk' | 'servers', filePath: string): string {
    return `${this.assetServerUrl}/api/assets/${type}/${filePath}`;
  }
}

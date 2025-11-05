import * as fs from 'fs';
import * as os from 'os';
import { SSL_INFO_FILE } from '../constants';
import { CertificateInfo } from './CertificateGenerator';
import { NetworkUtils } from './NetworkUtils';

/**
 * SSL証明書情報の表示を担当するクラス
 */
export class SSLCertificateDisplay {
  /**
   * 証明書情報を表示
   */
  public static displayCertificateInfo(): void {
    try {
      const certInfo: CertificateInfo = JSON.parse(fs.readFileSync(SSL_INFO_FILE, 'utf-8'));

      console.log('📋 Certificate Information:');
      console.log(`  - Common Name: ${certInfo.commonName}`);
      console.log(`  - Organization: ${certInfo.organization}`);
      console.log(`  - Key Algorithm: ${certInfo.keyAlgorithm}`);
      console.log(`  - Valid From: ${certInfo.generatedAt}`);
      console.log(`  - Valid Until: ${certInfo.expiresAt}`);
      console.log(`  - Subject Alternative Names (${certInfo.subjectAltNames.length}):`);
    } catch (error) {
      // 情報表示に失敗しても続行
      console.warn('⚠️  Failed to display certificate info:', error);
    }
  }

  /**
   * アクセス可能なURLを表示
   * @param port サーバーのポート番号
   * @param protocol プロトコル（'https' または 'http'）
   */
  public static displayAccessURLs(port: number, protocol: 'https' | 'http' = 'https'): void {
    const hostname = os.hostname();
    const localIPs = NetworkUtils.getLocalIPs().filter(ip => !ip.includes(':'));  // IPv4のみ
    const wsProtocol = protocol === 'https' ? 'wss' : 'ws';

    console.log(`🔒 ${protocol.toUpperCase()} Server will be accessible at:`);
    console.log(`  - ${protocol}://localhost:${port}`);

    console.log(`🔐 ${wsProtocol.toUpperCase()} (${protocol === 'https' ? 'Secure ' : ''}WebSocket) enabled at:`);


    if (protocol === 'https') {
      console.log('');
      console.log('⚠️  Note: Self-signed certificate will show browser warnings');
      console.log('   Click "Advanced" → "Proceed to localhost" to accept');
    }
  }
}

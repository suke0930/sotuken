import * as fs from 'fs';
import * as os from 'os';
import { SSL_INFO_FILE } from '../constants';
import { CertificateInfo } from './CertificateGenerator';
import { NetworkUtils } from './NetworkUtils';
import { createModuleLogger } from '../logger';

const log = createModuleLogger('ssl:display');

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

      log.info({
        commonName: certInfo.commonName,
        organization: certInfo.organization,
        keyAlgorithm: certInfo.keyAlgorithm,
        validFrom: certInfo.generatedAt,
        validUntil: certInfo.expiresAt,
        sanCount: certInfo.subjectAltNames.length
      }, ' Certificate Information');
    } catch (error) {
      // 情報表示に失敗しても続行
      log.warn({ err: error }, 'Failed to display certificate info');
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

    log.info({
      protocol: protocol.toUpperCase(),
      port,
      url: `${protocol}://localhost:${port}`,
      wsProtocol: wsProtocol.toUpperCase(),
      hostname,
      localIPs
    }, ` ${protocol.toUpperCase()} Server accessible`);

    if (protocol === 'https') {
      log.info('Note: Self-signed certificate will show browser warnings - Click "Advanced"  "Proceed to localhost"');
    }
  }
}

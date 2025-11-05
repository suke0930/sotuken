import * as fs from 'fs';
import * as https from 'https';
import * as os from 'os';
import { SSL_KEY_FILE, SSL_CERT_FILE } from '../constants';
import { CertificateGenerator } from './CertificateGenerator';
import { CertificateValidator } from './CertificateValidator';

/**
 * SSL/TLS証明書の管理を統括するクラス
 */
export class SSLCertificateManager {
  /**
   * SSL証明書を初期化し、HTTPSサーバーオプションを返す
   * @param maxRetries 証明書生成の最大リトライ回数
   * @returns HTTPSサーバーオプション、失敗時はnull
   */
  public static async initialize(maxRetries: number = 3): Promise<https.ServerOptions | null> {
    console.log('🔒 SSL Certificate Manager initializing...');

    try {
      // 証明書の検証
      const isValid = CertificateValidator.validate();

      if (!isValid) {
        console.log('🔄 Certificate needs to be generated or renewed');

        // 証明書を生成（リトライ付き）
        let success = false;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            console.log(`📝 Generation attempt ${attempt}/${maxRetries}`);
            await CertificateGenerator.generate();
            success = true;
            break;
          } catch (error) {
            console.error(`❌ Generation attempt ${attempt} failed:`, error);
            if (attempt < maxRetries) {
              console.log('⏳ Retrying in 2 seconds...');
              await this.sleep(2000);
            }
          }
        }

        if (!success) {
          console.error('❌ Failed to generate certificate after all retries');
          console.error('⚠️  Server will start without HTTPS (HTTP only)');
          return null;
        }
      }

      // 証明書を読み込み
      const sslOptions = this.loadCertificates();
      if (!sslOptions) {
        console.error('❌ Failed to load certificates');
        console.error('⚠️  Server will start without HTTPS (HTTP only)');
        return null;
      }

      this.displayCertificateInfo();
      this.displayAccessURLs();

      return sslOptions;

    } catch (error) {
      console.error('❌ SSL Certificate Manager initialization failed:', error);
      console.error('⚠️  Server will start without HTTPS (HTTP only)');
      return null;
    }
  }

  /**
   * 証明書ファイルを読み込み、HTTPSサーバーオプションを返す
   */
  private static loadCertificates(): https.ServerOptions | null {
    try {
      const key = fs.readFileSync(SSL_KEY_FILE, 'utf-8');
      const cert = fs.readFileSync(SSL_CERT_FILE, 'utf-8');

      return {
        key,
        cert
      };
    } catch (error) {
      console.error('Failed to read certificate files:', error);
      return null;
    }
  }

  /**
   * 証明書情報を表示
   */
  private static displayCertificateInfo(): void {
    try {
      const certInfoPath = require('../constants').SSL_INFO_FILE;
      const certInfo = JSON.parse(fs.readFileSync(certInfoPath, 'utf-8'));

      console.log('📋 Certificate Information:');
      console.log(`  - Common Name: ${certInfo.commonName}`);
      console.log(`  - Organization: ${certInfo.organization}`);
      console.log(`  - Key Algorithm: ${certInfo.keyAlgorithm}`);
      console.log(`  - Valid From: ${certInfo.generatedAt}`);
      console.log(`  - Valid Until: ${certInfo.expiresAt}`);
      console.log(`  - Subject Alternative Names (${certInfo.subjectAltNames.length}):`);
      certInfo.subjectAltNames.forEach((san: string) => {
        console.log(`    - ${san}`);
      });
    } catch (error) {
      // 情報表示に失敗しても続行
      console.log('  (Certificate info display failed)');
    }
  }

  /**
   * アクセス可能なURLを表示
   */
  private static displayAccessURLs(): void {
    const hostname = os.hostname();
    const localIPs = this.getLocalIPs();

    console.log('🔒 HTTPS Server will be accessible at:');
    console.log(`  - https://localhost:12800`);
    console.log(`  - https://127.0.0.1:12800`);

    if (localIPs.length > 0) {
      console.log(`  - https://${hostname}.local:12800 (mDNS)`);
      localIPs.forEach(ip => {
        console.log(`  - https://${ip}:12800 (LAN)`);
      });
    }

    console.log('🔐 WSS (Secure WebSocket) enabled at:');
    console.log(`  - wss://localhost:12800/ws`);
    if (localIPs.length > 0) {
      localIPs.forEach(ip => {
        console.log(`  - wss://${ip}:12800/ws (LAN)`);
      });
    }

    console.log('');
    console.log('⚠️  Note: Self-signed certificate will show browser warnings');
    console.log('   Click "Advanced" → "Proceed to localhost" to accept');
  }

  /**
   * ローカルIPアドレスを取得
   */
  private static getLocalIPs(): string[] {
    const interfaces = os.networkInterfaces();
    const ips: string[] = [];

    for (const name of Object.keys(interfaces)) {
      const iface = interfaces[name];
      if (!iface) continue;

      for (const addr of iface) {
        if (addr.internal) continue;
        if (addr.family === 'IPv4') {
          ips.push(addr.address);
        }
      }
    }

    return ips;
  }

  /**
   * 指定時間スリープ
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

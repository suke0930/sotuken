import * as fs from 'fs';
import * as https from 'https';
import { SSL_KEY_FILE, SSL_CERT_FILE, DEFAULT_SERVER_PORT } from '../constants';
import { CertificateGenerator } from './CertificateGenerator';
import { CertificateValidator } from './CertificateValidator';
import { SSLCertificateDisplay } from './SSLCertificateDisplay';
import { createModuleLogger } from '../logger';

const log = createModuleLogger('ssl:manager');

/**
 * SSL/TLS証明書の管理を統括するクラス
 */
export class SSLCertificateManager {
  /**
   * SSL証明書を初期化し、HTTPSサーバーオプションを返す
   * @param port サーバーポート番号（表示用）
   * @param maxRetries 証明書生成の最大リトライ回数
   * @returns HTTPSサーバーオプション、失敗時はnull
   */
  public static async initialize(port: number = DEFAULT_SERVER_PORT, maxRetries: number = 3): Promise<https.ServerOptions | null> {
    log.info('🔒 SSL Certificate Manager initializing...');

    try {
      // 証明書の検証
      const isValid = CertificateValidator.validate();

      if (!isValid) {
        log.info('🔄 Certificate needs to be generated or renewed');

        // 証明書を生成（リトライ付き）
        let success = false;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            log.info({ attempt, maxRetries }, `📝 Generation attempt ${attempt}/${maxRetries}`);
            await CertificateGenerator.generate();
            success = true;
            break;
          } catch (error) {
            log.error({ err: error, attempt, maxRetries }, `❌ Generation attempt ${attempt} failed`);
            if (attempt < maxRetries) {
              log.info('⏳ Retrying in 2 seconds...');
              await this.sleep(2000);
            }
          }
        }

        if (!success) {
          log.error('❌ Failed to generate certificate after all retries');
          log.warn('⚠️  Server will start without HTTPS (HTTP only)');
          return null;
        }
      }

      // 証明書を読み込み
      const sslOptions = this.loadCertificates();
      if (!sslOptions) {
        log.error('❌ Failed to load certificates');
        log.warn('⚠️  Server will start without HTTPS (HTTP only)');
        return null;
      }

      SSLCertificateDisplay.displayCertificateInfo();
      SSLCertificateDisplay.displayAccessURLs(port, 'https');

      return sslOptions;

    } catch (error) {
      log.error({ err: error }, '❌ SSL Certificate Manager initialization failed');
      log.warn('⚠️  Server will start without HTTPS (HTTP only)');
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
      log.error({ err: error }, 'Failed to read certificate files');
      return null;
    }
  }

  /**
   * 指定時間スリープ
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

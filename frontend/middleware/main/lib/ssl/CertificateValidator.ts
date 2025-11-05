import * as forge from 'node-forge';
import * as fs from 'fs';
import * as os from 'os';
import {
  SSL_KEY_FILE,
  SSL_CERT_FILE,
  SSL_INFO_FILE,
  CERT_RENEWAL_THRESHOLD_DAYS
} from '../constants';
import { CertificateInfo } from './CertificateGenerator';

/**
 * SSL証明書の検証を管理するクラス
 */
export class CertificateValidator {
  /**
   * 証明書ファイルが存在するかチェック
   */
  public static filesExist(): boolean {
    return (
      fs.existsSync(SSL_KEY_FILE) &&
      fs.existsSync(SSL_CERT_FILE) &&
      fs.existsSync(SSL_INFO_FILE)
    );
  }

  /**
   * 証明書情報を読み込み
   */
  private static loadCertInfo(): CertificateInfo | null {
    try {
      const data = fs.readFileSync(SSL_INFO_FILE, 'utf-8');
      return JSON.parse(data) as CertificateInfo;
    } catch (error) {
      console.error('Failed to load certificate info:', error);
      return null;
    }
  }

  /**
   * ローカルIPアドレスを取得（CertificateGeneratorと同じロジック）
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
        if (addr.family === 'IPv6') {
          ips.push(addr.address);
        }
      }
    }

    return ips;
  }

  /**
   * 証明書の有効期限をチェック
   * @returns 有効ならtrue、期限切れまたは更新が必要ならfalse
   */
  public static isValid(): boolean {
    const certInfo = this.loadCertInfo();
    if (!certInfo) {
      return false;
    }

    const now = new Date();
    const expiresAt = new Date(certInfo.expiresAt);
    const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    console.log(`📋 Certificate Status:`);
    console.log(`  - Expires: ${certInfo.expiresAt}`);
    console.log(`  - Days remaining: ${daysUntilExpiry}`);

    // 有効期限切れ
    if (now > expiresAt) {
      console.log('  ⚠️  Certificate has expired');
      return false;
    }

    // 更新期限（10日前）に達している
    if (daysUntilExpiry <= CERT_RENEWAL_THRESHOLD_DAYS) {
      console.log(`  ⚠️  Certificate expires in ${daysUntilExpiry} days, renewal needed`);
      return false;
    }

    console.log('  ✅ Certificate is valid');
    return true;
  }

  /**
   * IP変更により証明書の再生成が必要かチェック
   * @returns 再生成が必要ならtrue
   */
  public static needsRegenerationDueToIPChange(): boolean {
    const certInfo = this.loadCertInfo();
    if (!certInfo) {
      return true;
    }

    const currentIPs = this.getLocalIPs();
    const certSANs = certInfo.subjectAltNames;

    // 現在のIPが証明書のSANに含まれているかチェック
    for (const ip of currentIPs) {
      if (!certSANs.includes(ip)) {
        console.log(`  ⚠️  New IP detected: ${ip}, certificate needs regeneration`);
        return true;
      }
    }

    return false;
  }

  /**
   * 証明書と秘密鍵のペアを検証
   */
  public static validateKeyPair(): boolean {
    try {
      // 秘密鍵を読み込み
      const privateKeyPem = fs.readFileSync(SSL_KEY_FILE, 'utf-8');
      const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);

      // 証明書を読み込み
      const certPem = fs.readFileSync(SSL_CERT_FILE, 'utf-8');
      const cert = forge.pki.certificateFromPem(certPem);

      // 公開鍵を取得
      const publicKey = cert.publicKey as forge.pki.rsa.PublicKey;

      // 秘密鍵と公開鍵が対応しているか検証
      // テストデータで署名・検証を行う
      const testData = 'test';
      const md = forge.md.sha256.create();
      md.update(testData, 'utf8');

      const signature = (privateKey as forge.pki.rsa.PrivateKey).sign(md);
      const verified = publicKey.verify(md.digest().bytes(), signature);

      if (!verified) {
        console.error('  ❌ Private key and certificate do not match');
        return false;
      }

      console.log('  ✅ Key pair validation successful');
      return true;

    } catch (error) {
      console.error('  ❌ Failed to validate key pair:', error);
      return false;
    }
  }

  /**
   * 証明書の完全な検証
   * @returns 証明書が有効で使用可能ならtrue
   */
  public static validate(): boolean {
    console.log('🔍 Validating SSL certificate...');

    // ファイル存在チェック
    if (!this.filesExist()) {
      console.log('  ❌ Certificate files not found');
      return false;
    }

    // 有効期限チェック
    if (!this.isValid()) {
      return false;
    }

    // IP変更チェック
    if (this.needsRegenerationDueToIPChange()) {
      return false;
    }

    // 鍵ペア検証
    if (!this.validateKeyPair()) {
      return false;
    }

    console.log('✅ Certificate validation successful');
    return true;
  }
}

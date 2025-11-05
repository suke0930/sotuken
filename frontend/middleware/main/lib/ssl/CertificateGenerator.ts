import * as forge from 'node-forge';
import * as fs from 'fs';
import * as os from 'os';
import {
  SSL_KEY_FILE,
  SSL_CERT_FILE,
  SSL_INFO_FILE,
  SSL_CERT_DIR,
  CERT_VALIDITY_DAYS
} from '../constants';

/**
 * 証明書情報のメタデータ
 */
export interface CertificateInfo {
  generatedAt: string;
  expiresAt: string;
  commonName: string;
  organization: string;
  subjectAltNames: string[];
  keyAlgorithm: string;
  serialNumber: string;
}

/**
 * 自己署名SSL証明書の生成を管理するクラス
 */
export class CertificateGenerator {
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
        // 内部アドレス（loopback）を除外
        if (addr.internal) continue;

        // IPv4アドレスを追加
        if (addr.family === 'IPv4') {
          ips.push(addr.address);
        }
        // IPv6アドレスも追加
        if (addr.family === 'IPv6') {
          ips.push(addr.address);
        }
      }
    }

    return ips;
  }

  /**
   * Subject Alternative Names（SAN）を構築
   */
  private static buildSubjectAltNames(): string[] {
    const sans: string[] = [
      'localhost',
      '127.0.0.1',
      '::1'
    ];

    // ホスト名を追加
    const hostname = os.hostname();
    sans.push(hostname);
    sans.push(`${hostname}.local`);

    // ローカルIPアドレスを追加
    const localIPs = this.getLocalIPs();
    sans.push(...localIPs);

    // 重複を削除
    return [...new Set(sans)];
  }

  /**
   * 自己署名証明書を生成
   */
  public static async generate(): Promise<void> {
    console.log('🔐 Generating new SSL certificate...');

    try {
      // ディレクトリが存在しない場合は作成
      if (!fs.existsSync(SSL_CERT_DIR)) {
        fs.mkdirSync(SSL_CERT_DIR, { recursive: true });
      }

      // SANを構築
      const subjectAltNames = this.buildSubjectAltNames();
      const commonName = 'localhost';
      const organization = 'FrontDriver Development';

      console.log('  - Common Name:', commonName);
      console.log('  - Organization:', organization);
      console.log('  - Validity:', CERT_VALIDITY_DAYS, 'days');
      console.log('  - Key Algorithm: RSA 4096 (Ed25519 equivalent security)');
      console.log('  - Subject Alternative Names:');
      subjectAltNames.forEach(san => console.log(`    - ${san}`));

      // RSA 4096bit鍵ペアを生成（Ed25519と同等のセキュリティ強度）
      console.log('  ⏳ Generating RSA 4096-bit key pair (this may take a moment)...');
      const keys = forge.pki.rsa.generateKeyPair(4096);
      console.log('  ✅ Key pair generated');

      // 証明書を作成
      const cert = forge.pki.createCertificate();
      cert.publicKey = keys.publicKey;

      // シリアル番号を生成
      cert.serialNumber = this.generateSerialNumber();

      // 有効期間を設定
      const notBefore = new Date();
      const notAfter = new Date();
      notAfter.setDate(notAfter.getDate() + CERT_VALIDITY_DAYS);

      cert.validity.notBefore = notBefore;
      cert.validity.notAfter = notAfter;

      // Subject（発行先）を設定
      const attrs = [
        { name: 'commonName', value: commonName },
        { name: 'organizationName', value: organization },
        { name: 'countryName', value: 'JP' }
      ];
      cert.setSubject(attrs);

      // Issuer（発行元）を設定（自己署名なのでSubjectと同じ）
      cert.setIssuer(attrs);

      // 拡張情報を設定
      const extensions = [
        {
          name: 'basicConstraints',
          cA: true
        },
        {
          name: 'keyUsage',
          keyCertSign: true,
          digitalSignature: true,
          nonRepudiation: true,
          keyEncipherment: true,
          dataEncipherment: true
        },
        {
          name: 'extKeyUsage',
          serverAuth: true,
          clientAuth: true,
          codeSigning: true,
          emailProtection: true,
          timeStamping: true
        },
        {
          name: 'subjectAltName',
          altNames: subjectAltNames.map(san => {
            // IPアドレスかDNS名かを判定
            const isIPv4 = /^(\d{1,3}\.){3}\d{1,3}$/.test(san);
            const isIPv6 = /^([0-9a-fA-F:]+)$/.test(san) && san.includes(':');

            if (isIPv4 || isIPv6) {
              return { type: 7, ip: san };  // IP Address
            } else {
              return { type: 2, value: san };  // DNS Name
            }
          })
        }
      ];

      cert.setExtensions(extensions);

      // 自己署名
      cert.sign(keys.privateKey, forge.md.sha256.create());

      // PEM形式に変換
      const privateKeyPem = forge.pki.privateKeyToPem(keys.privateKey);
      const certPem = forge.pki.certificateToPem(cert);

      // ファイルに保存
      fs.writeFileSync(SSL_KEY_FILE, privateKeyPem, { mode: 0o600 });
      fs.writeFileSync(SSL_CERT_FILE, certPem);

      // メタデータを保存
      const certInfo: CertificateInfo = {
        generatedAt: notBefore.toISOString(),
        expiresAt: notAfter.toISOString(),
        commonName,
        organization,
        subjectAltNames,
        keyAlgorithm: 'RSA 4096',
        serialNumber: cert.serialNumber
      };

      fs.writeFileSync(SSL_INFO_FILE, JSON.stringify(certInfo, null, 2));

      console.log('✅ Certificate generated successfully');
      console.log(`  - Saved to: ${SSL_CERT_DIR}`);
      console.log(`  - Expires: ${notAfter.toISOString()}`);

    } catch (error) {
      console.error('❌ Failed to generate certificate:', error);
      throw error;
    }
  }

  /**
   * シリアル番号を生成（16進数文字列）
   */
  private static generateSerialNumber(): string {
    // forge.util.bytesToHexを使用してランダムなシリアル番号を生成
    const bytes = forge.random.getBytesSync(16);
    return forge.util.bytesToHex(bytes);
  }
}

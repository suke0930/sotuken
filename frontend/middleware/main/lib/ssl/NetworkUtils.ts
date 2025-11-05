import * as os from 'os';

/**
 * ネットワーク関連のユーティリティクラス
 */
export class NetworkUtils {
  /**
   * ローカルIPアドレスを取得
   * @returns IPv4の配列
   */
  public static getLocalIPs(): string[] {
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
      }
    }

    return ips;
  }

  /**
   * Subject Alternative Names（SAN）を構築
   * @returns SAN用のホスト名とIPアドレスの配列
   */
  public static buildSubjectAltNames(): string[] {
    const sans: string[] = [
      'localhost',
      '127.0.0.1',
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
}

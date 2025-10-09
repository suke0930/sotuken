import crypto from 'crypto';

export class FrpManager {
    static async assign(serverId: string, type: 'tcp' | 'http' | 'https', opt: any) {
        // 実運用は FRP API / INI を編集
        return { forwardId: crypto.randomUUID(), type, ...opt };
    }
    static async unassign(forwardId: string) { return true; }
}

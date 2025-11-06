/**
 * JDK Manager - Entry Point
 * 
 * Minecraft用Java実行環境管理システム
 * @version 1.0.0
 */

import e from 'express';
import { JdkManager } from './lib/JdkManager';

export { JdkManager } from './lib/JdkManager';
export { JDKEntry } from './lib/JDKEntry';
export { UpdateHandler } from './lib/UpdateHandler';

export * from './types/jdk-registry.types';
export * from './utils/fileUtils';

export class JDKManagerAPP {
    public app: JdkManager
    constructor(app: JdkManager) {
        this.app = app;
        this.setup()
    };
    async setup() {
        const app = this.app;
        const tryload = await app.Data.load();
        if (!tryload.success) {
            if (tryload.error.includes("Registry file not found")) {
                //レジストリないよ！
            }
        }
    }
}
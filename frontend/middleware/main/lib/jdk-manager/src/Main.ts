/**
 * JDK Manager - Entry Point
 * 
 * Minecraft用Java実行環境管理システム
 * @version 1.0.0
 */

import e from 'express';
import { JdkManager } from './lib/JdkManager';
import pino from 'pino';
import { createModuleLogger } from '../../logger';
import { CrashThisapp } from '../../CrashAPP';
import { machine } from 'os';
import { log } from 'console';

export { JdkManager } from './lib/JdkManager';
export { JDKEntry } from './lib/JDKEntry';
export { UpdateHandler } from './lib/UpdateHandler';

export * from './types/jdk-registry.types';
export * from './utils/fileUtils';

export class JDKManagerAPP {
    public app: JdkManager
    private logger: pino.Logger;
    constructor(app: JdkManager) {
        this.logger = createModuleLogger("JDKmanager");
        this.app = app;
        this.setup();
    };
    async setup() {
        /**
         * 初期化を試みる
         * @param logger 
         */
        async function initdata(logger: pino.Logger) {
            logger.info("Registry file not found, initializing...");
            console.log("JDKマネージャの設定ファイルが見つかりません。初期化を実行します。");
            const init = await app.Data.init();
            if (!init.success) {
                CrashThisapp(JSON.stringify(init.error), "初期化に失敗しました。");
            }
            logger.info("Registry initialized");
            console.log("初期化は正常に終了しました。");
            const trysave = await app.Data.save();
            if (trysave.success) {
                logger.info("Save Registry after init");
                return;
            } else {
                console.log(tryload + "初期化後のファイルのセーブに失敗しました");
                logger.error("Failed Save Registry after init");
            }

        }
        async function healthcheck(logger: pino.Logger) {
            const result = await app.Entrys.checkFileHealthAll();
            if (!result.success) {
                //ヘルスチェック失敗を通知
                logger.warn("Health check failed:" + result.error)
                console.log(result.error + "\nJDKヘルスチェックに失敗しました\n大変なエラーが怒っている可能性があります");
                return;
            }
            const brokenlist = result.data.filter(data => data.status != "verified");
            if (brokenlist.length != 0) {
                const brokenJDKs = brokenlist.map(async data => {
                    const elem = await app.Entrys.getById(data.id);
                    if (elem.success) {
                        return ([elem.data.getStructName(), elem.data.getMajorVersion()])
                    }
                });
                console.log("壊れているJDKパッケージが存在します 修復を行ってください:" + brokenJDKs.join("."))
                logger.warn("detected broken JDK packages!!! :" + brokenJDKs.join("."))
                return;
            } else {
                logger.info("JDK package is seem Good.");
                return;
            }
        }
        const app = this.app;
        const tryload = await app.Data.load();
        if (!tryload.success) {
            if (tryload.error.includes("Registry file not found")) initdata(this.logger);
        } else {
            //ロード完了
            this.logger.info("Registry loaded");
            console.log("JDKマネージャデータロード完了....");
            const list = await app.Entrys.getInstallList().map(data => { return data.majorVersion });
            console.log("以下のJDKがインストールされています:" + list.join(","));
            this.logger.info("installed jdk:" + list.join(","));
            //ヘルスチェック
            healthcheck(this.logger);
        }

    }
}
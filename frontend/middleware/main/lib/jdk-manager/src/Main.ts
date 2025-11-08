/**
 * JDK Manager - Entry Point
 * 
 * Minecraft用Java実行環境管理システム
 * @version 1.0.0
 */

import express from 'express';

import { JdkManager } from './lib/JdkManager';
import pino from 'pino';
import { createModuleLogger } from '../../logger';
import { CrashThisapp } from '../../CrashAPP';
import { machine } from 'os';
import { log } from 'console';
import { publicDecrypt } from 'crypto';
import { r } from 'tar';
import { DOWNLOAD_TEMP_PATH } from '../../../index';
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
    /**
     * 初回ロード処理のメイン
     */
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

    public installlist: express.RequestHandler = async (req, res) => {
        try {
            const list = await this.app.Entrys.getInstallList();
            res.json({ ok: true, list });
        } catch (error) {
            res.json({ ok: false });
        }
    };
    public getbyId: express.RequestHandler = async (req, res) => {
        if (!req.params.id) res.json({ ok: false, message: "パラメータがありません" });
        try {
            const list = await this.app.Entrys.getById(req.params.id);
            res.json({ ok: true, list });
        } catch (error) {
            console.log(error);
            res.json({ ok: false, error });
        }
    };
    public addJDK: express.RequestHandler = async (req, res) => {
        if (!req.body) { res.json({ ok: false, message: "Bodyがありません" }); return; };
        if (!req.body.archivePath || !req.body.majorVersion) { res.json({ ok: false, message: "パラメータがありません" }); return; };

        if (isNaN(Number(req.body.majorVersion))) { res.json({ ok: false, message: "バージョンが数値ではありません" }); return; }
        try {
            const list = await this.app.Entrys.add({ archivePath: DOWNLOAD_TEMP_PATH + req.body.archivePath, majorVersion: req.body.majorVersion });
            res.json(list);
            await this.app.Data.save();
        } catch (error) {
            console.log(error);
            res.json({ ok: false, error });
        }

    };
    public removeJDK: express.RequestHandler = async (req, res) => {
        if (!req.params) { res.json({ ok: false, message: "paramsがありません" }); return; };
        if (!req.params.id) { res.json({ ok: false, message: "パラメータがありません" }); return; };
        try {
            const list = await this.app.Entrys.remove(req.params.id);
            res.json(list);
            await this.app.Data.save();
        } catch (error) {
            console.log(error);
            res.json({ ok: false, error });
        }
    };

    public getbyMajorVersion: express.RequestHandler = async (req, res) => {
        if (!req.params.verison) { res.json({ ok: false, message: "パラメータがありません" }); return; };
        if (isNaN(Number(req.params.verison))) { res.json({ ok: false, message: "入力値が数値ではありません" }); return; };
        try {
            const list = await this.app.Entrys.getByVersion(Number(req.params.verison));
            res.json({ ok: true, list });
        } catch (error) {
            console.log(error);
            res.json({ ok: false, error });
        }
    };
}

import path from "path";
import { JdkManager, JDKManagerAPP } from "../jdk-manager/src/Main"
import { ProcessStdCallbacks, ServerManager } from "./src";
import { da, fa, th, tr } from "zod/v4/locales";
import express from "express";
import { error } from "console";
import { r } from "tar";
import { promises } from "dns";
import { StreamEntry } from "pino";
import { StackFrame } from "next/dist/build/swc/generated-native";
export class MCserverManagerAPP {
    private jdkmanager: JdkManager
    private servermanager!: ServerManager
    private watchinglist: Map<string, ProcessStdCallbacks>
    private download_dir: string;
    constructor(jdkmanager: JDKManagerAPP, DownloadPath: string, mcdatadir: string) {
        this.jdkmanager = jdkmanager.app;
        this.setup(mcdatadir);
        this.download_dir = DownloadPath;
        this.watchinglist = new Map<string, ProcessStdCallbacks>();
    }
    async setup(mcdatadir: string) {
        this.servermanager = await ServerManager.initialize(path.join(mcdatadir, "server.json"), path.join(mcdatadir + "/serv/"), path.join(mcdatadir, "log.json"), this.jdkmanager,
            {
                onServerStopped: (uuid) => {
                    console.log(`Server with UUID ${uuid} has stopped.`);
                },
                onServerCrashed: (uuid, crashReport) => {
                    console.log(`Server with UUID ${uuid} has crashed. Crash report: ${crashReport}`);
                },
                onServerStarted: (uuid) => {
                    console.log(`Server with UUID ${uuid} has started.`);
                },
                onAutoRestarted(uuid, consecutiveCount) {
                    console.log(`Server with UUID ${uuid} has been auto-restarted. Consecutive restart count: ${consecutiveCount}`);
                },
            });
    }
    /**
     * サーバーリスト取得
     * @param req 
     * @param res 
     */
    public list: express.RequestHandler = async (req, res) => {
        try {
            res.json({ ok: true, data: this.servermanager.getAllInstances() });
        } catch (error) {
            res.json({ ok: false, error: error });
        }
    }

    /**
     * サーバー追加
     * @param req 
     * @param res 
     * @returns 
     */
    public addserver: express.RequestHandler = async (req, res) => {
        /**
         * バリデーション関数
         * @param req 
         * @param res 
         * @param jdkmanager 
         * @returns 
         */
        async function validateAddServerRequest(req: express.Request, res: express.Response, jdkmanager: JdkManager): Promise<boolean> {
            if (!req.body) {
                res.status(400).json({ ok: false, err: "JSONの形式が間違っています" });
                return false;
            }

            const { name, note, software, jdkVersion, port, maxMemory, minMemory, serverBinaryFilePath } = req.body;
            const requiredFields = { name, note, software, jdkVersion, port, maxMemory, minMemory, serverBinaryFilePath };

            for (const [field, value] of Object.entries(requiredFields)) {
                if (value === undefined) {
                    res.status(400).json({ ok: false, err: `必須フィールドが不足しています: ${field}` });
                    return false;
                }
            }

            if (typeof software !== 'object' || software === null || !software.name || !software.version) {
                res.status(400).json({ ok: false, err: "softwareオブジェクトの形式が正しくありません" });
                return false;
            }

            const jdkResult = await jdkmanager.Entrys.getByVersion(jdkVersion);
            if (!jdkResult.success) {
                res.status(400).json({ ok: false, err: `指定されたJDKバージョンが見つかりません: ${jdkVersion}` });
                return false;
            }

            return true;
        }
        try {
            if (!await validateAddServerRequest(req, res, this.jdkmanager)) return;
            const { name, note, software, jdkVersion, port, maxMemory, minMemory, serverBinaryFilePath } = req.body;
            const result = await this.servermanager.addInstance({
                name: name,
                note: note,
                software: { name: software.name, version: software.version },
                jdkVersion: jdkVersion,
                serverBinaryFilePath: path.join(this.download_dir, serverBinaryFilePath),
                port: port,
                maxMemory: maxMemory,
                minMemory: minMemory
            });
            if (result.success) {
                res.json({ ok: true, data: result.uuid });
                return;
            } else {
                console.log(result.error);
                res.json({ ok: false, err: result.error });
                return;
            }
        } catch (error: any) {
            console.log(error);
            res.json({ ok: false, err: error });
            return;
        }
    }

    /**
     * 削除メソッド
     * @param req 
     * @param res 
     * @returns 
     */
    public del: express.RequestHandler = async (req, res) => {
        try {
            if (!req.params.id) { res.json({ ok: false, message: "IDがありません" }); return; }
            const trydel = await this.servermanager.removeInstance(req.params.id);
            if (!trydel.success) {
                res.json({ ok: false, error: trydel.error });
                return;
            }
            res.json({ ok: true });
            return;
        } catch (error) {
            res.json({ ok: false, error: error });
        }
    }
    /**
     * テンプレートメソッド
     * @param req 
     * @param res 
     * @returns 
     */
    private template: express.RequestHandler = async (req, res) => {
        try {
            if (!req.params.id) { res.json({ ok: false, message: "IDがありません" }); return; }
            const trydel = await this.servermanager.removeInstance(req.params.id);
            if (!trydel.success) {
                res.json({ ok: false, error: trydel.error });
                return;
            }
            res.json({ ok: true });
            return;
        } catch (error) {
            res.json({ ok: false, error: error });
        }
    }

    public runserver: express.RequestHandler = async (req, res) => {
        try {
            if (!req.params.id) { res.json({ ok: false, message: "IDがありません" }); return; }
            const trydel = await this.servermanager.startServer(req.params.id);
            if (!trydel.success) {

                res.json({ ok: false, error: trydel.error });
                return;
            }
            const listencallback: ProcessStdCallbacks = {
                onStderr: (data: string) => {
                    console.log("stdout:" + data);
                },
                onStdout: (data: string) => {
                    console.log("stderr:" + data);
                }
            };
            try {
                await this.servermanager.openProcessStd(req.params.id, listencallback);
                this.watchinglist.set(req.params.id, listencallback);
            } catch (error) {
                console.warn("failed set watching")
            }
            res.json({ ok: true });
            return;
        } catch (error) {
            console.log(error);
            res.json({ ok: false, error: error });
        }
    }

    public stopserver: express.RequestHandler = async (req, res) => {
        try {
            if (!req.params.id) { res.json({ ok: false, message: "IDがありません" }); return; }
            const trydel = await this.servermanager.stopServer(req.params.id);
            if (!trydel.success) {
                res.json({ ok: false, error: trydel.error });
                return;
            }
            const watcher = this.watchinglist.get(req.params.id);
            if (watcher) {
                await this.servermanager.closeProcessStd(req.params.id, watcher);
            }
            res.json({ ok: true });
            return;
        } catch (error) {
            res.json({ ok: false, error: error });
        }
    }
    public sendcommand: express.RequestHandler = async (req, res) => {
        try {
            if (!req.params.id) { res.json({ ok: false, message: "IDがありません" }); return; }
            if (!req.body.command) { res.json({ ok: false, message: "コマンドがありません" }); return; }
            await this.servermanager.sendCommand(req.params.id, req.body.command);
            res.json({ ok: true });
            return;
        } catch (error) {
            res.json({ ok: false, error: error });
        }
    }
}

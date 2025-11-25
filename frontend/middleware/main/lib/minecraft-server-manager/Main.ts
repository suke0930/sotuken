
import path from "path";
import { JdkManager, JDKManagerAPP } from "../jdk-manager/src/Main"
import { ProcessStdCallbacks, ServerManager } from "./src";
import express from "express";
import { MCServerWebSocketManager } from "./src/websocket/MCServerWebSocketManager";
import { boolean } from "zod";
import { createModuleLogger } from '../logger';
import type { Logger } from 'pino';
import { createErrorResponse, createSuccessResponse } from '../types/api-responses';
import { ERROR_CODES, ERROR_MESSAGES, SUCCESS_MESSAGES, INFO_MESSAGES } from '../constants/api-messages';
import { sanitizePropertyUpdates } from '../utils/sanitization';

export class MCserverManagerAPP {
    private jdkmanager: JdkManager
    private servermanager!: ServerManager
    private watchinglist: Map<string, ProcessStdCallbacks>
    private download_dir: string;
    private wsManager?: MCServerWebSocketManager;
    private logger: Logger;

    constructor(jdkmanager: JDKManagerAPP, DownloadPath: string, mcdatadir: string) {
        this.logger = createModuleLogger('mc-server-api');
        this.jdkmanager = jdkmanager.app;
        this.setup(mcdatadir);
        this.download_dir = DownloadPath;
        this.watchinglist = new Map<string, ProcessStdCallbacks>();
    }

    /**
     * WebSocketマネージャーを設定
     */
    public setWebSocketManager(manager: MCServerWebSocketManager): void {
        this.wsManager = manager;
    }

    async setup(mcdatadir: string) {
        const self = this; // thisをキャプチャ
        this.servermanager = await ServerManager.initialize(path.join(mcdatadir, "server.json"), path.join(mcdatadir + "/serv/"), path.join(mcdatadir, "log.json"), this.jdkmanager,
            {
                onServerStopped: (uuid, exitCode) => {
                    console.log(`Server with UUID ${uuid} has stopped with exit code ${exitCode}.`);
                    self.wsManager?.notifyServerStopped(uuid, exitCode);
                },
                onServerCrashed: (uuid, crashReport) => {
                    console.log(`Server with UUID ${uuid} has crashed. Crash report: ${crashReport}`);
                    self.wsManager?.notifyServerCrashed(uuid, crashReport);
                },
                onServerStarted: (uuid) => {
                    console.log(`Server with UUID ${uuid} has started.`);
                    self.wsManager?.notifyServerStarted(uuid);
                },
                onAutoRestarted(uuid, consecutiveCount) {
                    console.log(`Server with UUID ${uuid} has been auto-restarted. Consecutive restart count: ${consecutiveCount}`);
                    self.wsManager?.notifyAutoRestarted(uuid, consecutiveCount);
                },
                onAutoRestartLimitReached(uuid) {
                    console.log(`Server with UUID ${uuid} has reached auto-restart limit.`);
                    self.wsManager?.notifyAutoRestartLimitReached(uuid);
                },
                onStopTimeout(uuid, message) {
                    console.log(`Server with UUID ${uuid} stop timeout: ${message}`);
                    self.wsManager?.notifyStopTimeout(uuid, message);
                },
                onForcedKill(uuid) {
                    console.log(`Server with UUID ${uuid} was forcefully killed.`);
                    self.wsManager?.notifyForcedKill(uuid);
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

            // 削除前にリスナーをクリーンアップ（メモリリーク防止）
            const watcher = this.watchinglist.get(req.params.id);
            if (watcher) {
                try {
                    await this.servermanager.closeProcessStd(req.params.id, watcher);
                } catch (err) {
                    console.warn(`Failed to close process std for ${req.params.id}:`, err);
                }
                this.watchinglist.delete(req.params.id);
            }

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

            // メモリリーク防止: 既存のリスナーがあれば削除
            const existingWatcher = this.watchinglist.get(req.params.id);
            if (existingWatcher) {
                try {
                    await this.servermanager.closeProcessStd(req.params.id, existingWatcher);
                    this.watchinglist.delete(req.params.id);
                } catch (err) {
                    console.warn(`Failed to close existing process std for ${req.params.id}:`, err);
                }
            }

            const trydel = await this.servermanager.startServer(req.params.id);
            if (!trydel.success) {
                res.json({ ok: false, error: trydel.error });
                return;
            }

            // WebSocketマネージャー経由で標準出力/エラー出力を配信
            const listencallback: ProcessStdCallbacks = {
                onStderr: (data: string) => {
                    console.log("stderr:" + data);
                    this.wsManager?.sendStderr(req.params.id!, data);
                },
                onStdout: (data: string) => {
                    console.log("stdout:" + data);
                    this.wsManager?.sendStdout(req.params.id!, data);
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
            // リスナーをクリーンアップしてメモリリークを防止
            const watcher = this.watchinglist.get(req.params.id);
            if (watcher) {
                await this.servermanager.closeProcessStd(req.params.id, watcher);
                this.watchinglist.delete(req.params.id); // メモリリーク防止
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

    /**
     * サーバーを強制終了
     * @param req
     * @param res
     */
    public forceKill: express.RequestHandler = async (req, res) => {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json(createErrorResponse(ERROR_CODES.MISSING_SERVER_ID, ERROR_MESSAGES.MISSING_SERVER_ID));
        }

        const instance = this.servermanager.getInstanceData(id);
        if (!instance) {
            this.logger.warn({ serverId: id }, 'Server instance not found for force kill');
            return res.status(404).json(createErrorResponse(ERROR_CODES.INSTANCE_NOT_FOUND, ERROR_MESSAGES.INSTANCE_NOT_FOUND));
        }

        // サーバーが実行中でない場合はエラーを返す
        if (instance.status !== 'running') {
            this.logger.warn({ serverId: id, status: instance.status }, 'Attempted to force kill a non-running server');
            return res.status(409).json(createErrorResponse(ERROR_CODES.SERVER_NOT_RUNNING, ERROR_MESSAGES.INSTANCE_NOT_RUNNING));
        }

        try {
            this.logger.info({ serverId: id }, 'Attempting to force kill server');
            this.servermanager.forceKillServer(id);
            this.logger.info({ serverId: id }, 'Force kill command issued successfully');
            return res.json(createSuccessResponse(undefined, SUCCESS_MESSAGES.SERVER_FORCE_KILLED));
        } catch (error) {
            this.logger.error({ err: error, serverId: id }, 'Failed to force kill server');
            return res.status(500).json(
                createErrorResponse(
                    ERROR_CODES.INTERNAL_ERROR,
                    error instanceof Error ? error.message : ERROR_MESSAGES.INTERNAL_ERROR
                )
            );
        }
    }
    /**
     * サーバーインスタンスの情報を更新します。
     * @param req 
     * @param res 
     * @returns 
     */
    public update: express.RequestHandler = async (req, res) => {
        try {
            const { id } = req.params;
            const { updates } = req.body;

            if (!id) {
                return res.status(400).json({ ok: false, message: "サーバーIDが指定されていません。" });
            }
            if (!req.body) {
                return res.status(400).json({ ok: false, message: "Bodyがありません" });
            }
            if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
                return res.status(400).json({ ok: false, message: "更新内容が指定されていないか、形式が正しくありません。" });
            }
            const result = await this.servermanager.updateInstance({
                uuid: id,
                updates: updates
            });

            if (result.success) {
                return res.json({ ok: true });
            } else {
                return res.status(400).json({ ok: false, error: result.error });
            }
        } catch (error: any) {
            return res.status(500).json({ ok: false, error: error.message || "サーバー内部でエラーが発生しました。" });
        }
    }

    /**
     * サーバーのログを取得
     * @param req 
     * @param res 
     * @returns 
     */
    public getLogs: express.RequestHandler = async (req, res) => {
        try {
            if (!req.params.id) {
                return res.status(400).json({ ok: false, message: "サーバーIDがありません" });
            }

            // クエリパラメータからlimitを取得（デフォルト: 1000）
            const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 1000;

            // limitのバリデーション
            if (isNaN(limit) || limit < 1 || limit > 10000) {
                return res.status(400).json({
                    ok: false,
                    message: "limitは1から10000の間の数値である必要があります"
                });
            }

            const logs = this.servermanager.getServerLogs(req.params.id, limit);
            const logCount = this.servermanager.getServerLogCount(req.params.id);

            return res.json({
                ok: true,
                data: {
                    uuid: req.params.id,
                    logs: logs,
                    totalLogCount: logCount,
                    returnedLogCount: logs.length
                }
            });
        } catch (error) {
            console.error('Failed to get logs:', error);
            return res.status(500).json({
                ok: false,
                error: error instanceof Error ? error.message : "ログの取得に失敗しました"
            });
        }
    }

    /**
     * サーバーのログをクリア
     * @param req 
     * @param res 
     * @returns 
     */
    public clearLogs: express.RequestHandler = async (req, res) => {
        try {
            if (!req.params.id) {
                return res.status(400).json({ ok: false, message: "サーバーIDがありません" });
            }

            const logCount = this.servermanager.getServerLogCount(req.params.id);
            this.servermanager.clearServerLogs(req.params.id);

            return res.json({
                ok: true,
                message: `${logCount}件のログをクリアしました`
            });
        } catch (error) {
            console.error('Failed to clear logs:', error);
            return res.status(500).json({
                ok: false,
                error: error instanceof Error ? error.message : "ログのクリアに失敗しました"
            });
        }
    }


    /**
     * サーバのProperty問い合わせ
     * @param req
     * @param res
     * @returns
     */
    public getProperties: express.RequestHandler = async (req, res) => {
        const { id } = req.params;

        // IDパラメータの検証
        if (!id) {
            return res.status(400).json(
                createErrorResponse(ERROR_CODES.MISSING_SERVER_ID, ERROR_MESSAGES.MISSING_SERVER_ID)
            );
        }

        // サーバーインスタンスの存在確認
        const instance = this.servermanager.getInstanceData(id);
        if (!instance) {
            this.logger.warn({ serverId: id }, 'Server instance not found for properties retrieval');
            return res.status(404).json(
                createErrorResponse(ERROR_CODES.INSTANCE_NOT_FOUND, ERROR_MESSAGES.INSTANCE_NOT_FOUND)
            );
        }

        try {
            const properties = await this.servermanager.getServerProperties(id);

            if (properties === null) {
                // server.propertiesファイルが存在しない場合（正常なケース）
                this.logger.info({ serverId: id }, 'Properties file does not exist yet');
                return res.json(
                    createSuccessResponse({}, INFO_MESSAGES.PROPERTIES_FILE_NOT_EXISTS)
                );
            }

            this.logger.debug({ serverId: id, propertyCount: Object.keys(properties).length }, 'Properties retrieved successfully');
            return res.json(createSuccessResponse(properties));

        } catch (error) {
            this.logger.error({
                err: error,
                serverId: id,
                endpoint: 'getProperties'
            }, 'Failed to get server properties');

            return res.status(500).json(
                createErrorResponse(
                    ERROR_CODES.PROPERTIES_GET_FAILED,
                    error instanceof Error ? error.message : ERROR_MESSAGES.PROPERTIES_GET_FAILED
                )
            );
        }
    }

    /**
     * 後方互換性のための旧メソッド名（非推奨）
     * @deprecated getProperties を使用してください
     */
    public getPropties: express.RequestHandler = this.getProperties;
    /**
     * サーバのProperty設定
     * @param req
     * @param res
     * @returns
     */
    public setProperties: express.RequestHandler = async (req, res) => {
        const { id } = req.params;

        // IDパラメータの検証
        if (!id) {
            return res.status(400).json(
                createErrorResponse(ERROR_CODES.MISSING_SERVER_ID, ERROR_MESSAGES.MISSING_SERVER_ID)
            );
        }

        const updates = req.body?.data;

        // body.dataの存在と形式をチェック
        if (!req.body || !updates || typeof updates !== 'object' || Array.isArray(updates)) {
            this.logger.warn({ serverId: id, bodyType: typeof req.body }, 'Invalid update data format');
            return res.status(400).json(
                createErrorResponse(ERROR_CODES.INVALID_UPDATE_DATA, ERROR_MESSAGES.INVALID_UPDATE_DATA)
            );
        }

        // 空オブジェクトチェック
        if (Object.keys(updates).length === 0) {
            this.logger.warn({ serverId: id }, 'Empty update data provided');
            return res.status(400).json(
                createErrorResponse(ERROR_CODES.EMPTY_UPDATE_DATA, ERROR_MESSAGES.EMPTY_UPDATE_DATA)
            );
        }

        // プロパティ数の上限チェック
        if (Object.keys(updates).length > 100) {
            this.logger.warn({ serverId: id, count: Object.keys(updates).length }, 'Too many properties in single request');
            return res.status(400).json(
                createErrorResponse(ERROR_CODES.TOO_MANY_PROPERTIES, ERROR_MESSAGES.TOO_MANY_PROPERTIES)
            );
        }

        // Map<string, string>に変換できるかバリデーション
        for (const [key, value] of Object.entries(updates)) {
            if (typeof key !== 'string' || typeof value !== 'string') {
                this.logger.warn({ serverId: id, invalidKey: key, keyType: typeof key, valueType: typeof value }, 'Invalid property type');
                return res.status(400).json(
                    createErrorResponse(
                        ERROR_CODES.INVALID_PROPERTY_TYPE,
                        `${ERROR_MESSAGES.INVALID_PROPERTY_TYPE}: key=${key}`
                    )
                );
            }
        }

        // サーバーインスタンスの存在確認
        const instance = this.servermanager.getInstanceData(id);
        if (!instance) {
            this.logger.warn({ serverId: id }, 'Server instance not found for properties update');
            return res.status(404).json(
                createErrorResponse(ERROR_CODES.INSTANCE_NOT_FOUND, ERROR_MESSAGES.INSTANCE_NOT_FOUND)
            );
        }

        try {
            // 入力のサニタイゼーション
            const sanitizedUpdates = sanitizePropertyUpdates(updates);

            // 監査ログ（誰が・いつ・何を変更したか）
            this.logger.info({
                event: 'properties_update_attempt',
                serverId: id,
                userId: (req as any).userId || 'unknown',
                changedKeys: Object.keys(sanitizedUpdates),
                propertyCount: Object.keys(sanitizedUpdates).length,
                timestamp: new Date().toISOString()
            }, 'Attempting to update server properties');

            const result = await this.servermanager.setServerProperties(id, sanitizedUpdates);

            if (result.success) {
                this.logger.info({
                    event: 'properties_updated',
                    serverId: id,
                    userId: (req as any).userId || 'unknown',
                    changedKeys: Object.keys(sanitizedUpdates),
                    timestamp: new Date().toISOString()
                }, 'Server properties updated successfully');

                return res.json(createSuccessResponse(undefined, SUCCESS_MESSAGES.PROPERTIES_UPDATED));
            } else {
                // setServerProperties内でエラーが発生した場合
                this.logger.error({ serverId: id, error: result.error }, 'ServerManager returned error');
                return res.status(500).json(
                    createErrorResponse(
                        ERROR_CODES.PROPERTIES_SET_FAILED,
                        result.error || ERROR_MESSAGES.PROPERTIES_SET_FAILED
                    )
                );
            }
        } catch (error) {
            this.logger.error({
                err: error,
                serverId: id,
                endpoint: 'setProperties'
            }, 'Failed to set server properties');

            return res.status(500).json(
                createErrorResponse(
                    ERROR_CODES.INTERNAL_ERROR,
                    error instanceof Error ? error.message : ERROR_MESSAGES.INTERNAL_ERROR
                )
            );
        }
    }

    /**
     * 後方互換性のための旧メソッド名（非推奨）
     * @deprecated setProperties を使用してください
     */
    public SetPropties: express.RequestHandler = this.setProperties;

};

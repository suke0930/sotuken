import { createModuleLogger } from "./logger";

/**
 * 致命的なエラー発生時にクリーンアップなどをガン無視してプロセスをぶっ殺します
 * 将来的にはクリーンアップを入れます（レジストリセーブ系)
 * @param err 
 * @param msg 
 */
export function CrashThisapp(err: string, msg: string) {
    const errmsg = "-------ERR StuckTrace-------\n" + err + "\n" + msg;
    createModuleLogger("CrashThisapp").error(errmsg);
    throw new Error(errmsg);
    process.exit();
}
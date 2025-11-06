/**
 * 致命的なエラー発生時にクリーンアップなどをガン無視してプロセスをぶっ殺します
 * 将来的にはクリーンアップを入れます（レジストリセーブ系)
 * @param err 
 * @param msg 
 */
export function CrashThisapp(err: string, msg: string) {
    throw new Error("-------ERR StuckTrace-------\n" + err + "\n" + msg);
    process.exit();
}
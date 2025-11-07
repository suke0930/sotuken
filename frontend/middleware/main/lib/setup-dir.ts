import { existsSync, mkdirSync } from "node:fs";
import { CrashThisapp } from "./CrashAPP";
export function SetupUserdata(mainuserpath: string, paths: string[]) {
    try {
        if (!existsSync(mainuserpath)) mkdirSync(mainuserpath, { recursive: true });
        paths.forEach((path) => {
            if (!existsSync(path)) mkdirSync(path, { recursive: true });
        });
        return;
    } catch (error) {
        CrashThisapp(JSON.stringify(error), "致命的エラー:何らかの理由でユーザーデータを初期化できませんでした");
    }

}
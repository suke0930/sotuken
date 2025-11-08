
import path from "path";
import { JdkManager, JDKManagerAPP } from "../jdk-manager/src/Main"
import { ServerManager } from "./src";
import { th } from "zod/v4/locales";
export class MCserverManagerAPP {
    private jdkmanager: JdkManager
    private servermanager!: ServerManager
    constructor(jdkmanager: JDKManagerAPP) {
        this.jdkmanager = jdkmanager.app;
        this.setup();
    }
    async setup() {

        this.servermanager = await ServerManager.initialize("./tmp/serv/server.json", path.join(__dirname + "/tmp/serv/"), "./tmp/serv/logs.json", this.jdkmanager,
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
}
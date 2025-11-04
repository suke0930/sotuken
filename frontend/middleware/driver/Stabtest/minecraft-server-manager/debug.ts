
import path from "path";
import { JdkManager } from "../jdk-manager/src";
import { ServerManager } from "./src";
import { JsxFlags } from "typescript";
import { privateDecrypt } from "crypto";

async function main() {
    const JDKManager = new JdkManager(path.join(__dirname + "/tmp/java"));
    // await JDKManager.Data.init();
    // const B = await JDKManager.Entrys.add({ archivePath: "C:\\Users\\jpas\\Downloads\\OpenJDK21U-jdk_x64_windows_hotspot_21.0.9_10.zip", majorVersion: 21 });
    // await JDKManager.Data.save();
    // console.log(B);
    // process.exit(0);
    const tryload = await JDKManager.Data.load();
    //JDK正常性チェック
    if (!(tryload.success)) { throw new Error("Failed to load JDK data:" + tryload.error); process.exit(1) };
    const MCmanager = ServerManager.initialize("./tmp/serv/server.json", path.join(__dirname + "/tmp/serv/"), "./tmp/serv/logs.json", JDKManager);


    const uuid = await (await MCmanager).getAllInstances()[0]?.uuid || "";
    console.log(await (await MCmanager).startServer(uuid));
    (await MCmanager).openProcessStd(uuid, { onStderr: data => { console.log(data) }, onStdout: data => { console.log(data) } });
}
main();
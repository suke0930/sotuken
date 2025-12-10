
import path from "path";
import { JdkManager } from "../jdk-manager/src/lib/JdkManager";
import { ServerManager } from "./src";
import express from 'express';

async function main() {
    const JDKManager = new JdkManager(path.join(__dirname + "/tmp/java"));

    await JDKManager.Data.load();
    const B = await JDKManager.Entrys.add(
        {
            archivePath: "C:\\Users\\jpas\\Downloads\\sotuken\\backend\\Asset\\resources\\jdk\\21\\windows\\OpenJDK17U-jdk_x64_windows_hotspot_17.0.17_10.zip",
            majorVersion: 17
        });
    await JDKManager.Data.save();
    // console.log(B);
    console.log(await JDKManager.Entrys.getByVersion(21));
    process.exit();





    // await JDKManager.Data.save();
    // console.log(B);
    // process.exit(0);

    const MCmanager = ServerManager.initialize("./tmp/serv/server.json", path.join(__dirname + "/tmp/serv/"), "./tmp/serv/logs.json", JDKManager,
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

    const Manager = (await MCmanager);//解決方法としてはさすがにひどいがawaitをここでやる

    //UUID取得(サーバーが存在しない場合は作成)
    const uuid: string = await (() => {

        return new Promise<string>(async (resolve, reject) => {
            if (Manager.getAllInstances().length === 0) {


                const uuid = await Manager.addInstance({
                    name: "Test Server",
                    note: "for debug server",
                    jdkVersion: 21,
                    serverBinaryFilePath: "C:\\Users\\jpas\\Downloads\\paper-1.21.8-60.jar",
                    software: { name: "paper", version: "1.20.4" },
                });
                console.log(uuid);
                process.exit();



                resolve(uuid.uuid || "");
            }
            resolve(await Manager.getAllInstances()[0].uuid);
        })
    })();

    console.log(await Manager.startServer(uuid));

    Manager.openProcessStd(uuid, {
        onStderr: data => { console.log(data) },
        onStdout: data => { console.log(data) }
    });

    // --- ここからExpressサーバーのセットアップ ---
    const app = express();
    const port = 3000;

    // [GET] /api/servers - 全てのサーバーインスタンスを取得
    app.get('/api/servers', (req, res) => {
        try {
            const instances = Manager.getAllInstances();
            res.json({ success: true, data: instances });
        } catch (error) {
            res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
        }
    });

    // [GET] /api/servers/:uuid/start - サーバーを起動
    app.get('/api/servers/:uuid/start', async (req, res) => {
        try {
            const { uuid } = req.params;
            const result = await Manager.startServer(uuid);
            res.json({ success: true, data: result });
        } catch (error) {
            res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
        }
    });

    // [GET] /api/servers/:uuid/stop - サーバーを停止
    app.get('/api/servers/:uuid/stop', async (req, res) => {
        try {
            const { uuid } = req.params;
            const result = await Manager.stopServer(uuid);
            res.json({ success: true, data: result });
        } catch (error) {
            res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
        }
    });

    // [GET] /api/servers/:uuid/command - サーバーにコマンドを送信
    app.get('/api/servers/:uuid/command', (req, res) => {
        try {
            const { uuid } = req.params;
            const { cmd } = req.query; // クエリパラメータからコマンドを取得 (例: ?cmd=say%20hello)

            if (!cmd || typeof cmd !== 'string') {
                return res.status(400).json({ success: false, error: 'A "cmd" query parameter is required.' });
            }

            Manager.sendCommand(uuid, cmd);
            res.json({ success: true, message: `Command "${cmd}" sent to server ${uuid}.` });
        } catch (error) {
            res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
        }
    });

    app.listen(port, () => {
        console.log(`\nMinecraft Server Manager API listening at http://localhost:${port}`);
        console.log('Endpoints:');
        console.log(`  GET /api/servers`);
        console.log(`  GET /api/servers/:uuid/start`);
        console.log(`  GET /api/servers/:uuid/stop`);
        console.log(`  GET /api/servers/:uuid/command?cmd=<your_command>`);
    });
}
main();
import { EventEmitter } from 'events';
import { MinecraftServerEntry } from './types';
import { MinecraftServerManager } from './minecraft-server-manager';
import { JobManager } from './job-manager';

type Runner = { interval?: NodeJS.Timeout; lines: number; };

export class MinecraftProcessManager {
    // serverId -> runner
    private static runners = new Map<string, Runner>();
    // コンソール/ステータスイベント
    static readonly events = new EventEmitter(); // 'console' | 'status'

    static async start(server: MinecraftServerEntry, owner: string) {
        if (this.runners.has(server.id)) {
            throw new Error('already running');
        }
        const job = JobManager.create('server-start', owner, { serverId: server.id });
        // 疑似コンソール
        const runner: Runner = { lines: 0 };
        runner.interval = setInterval(() => {
            runner.lines++;
            this.events.emit('console', { serverId: server.id, line: `[${new Date().toLocaleTimeString()}] tick ${runner.lines}` });
        }, 1000);
        this.runners.set(server.id, runner);
        await MinecraftServerManager.updateServer(server.id, { isRunning: true }, owner);
        this.events.emit('status', { serverId: server.id, isRunning: true });
        JobManager.succeed(job.id, { pid: 0 });
        return job;
    }

    static async stop(serverId: string, owner: string) {
        const runner = this.runners.get(serverId);
        const job = JobManager.create('server-stop', owner, { serverId });
        if (runner?.interval) {
            clearInterval(runner.interval);
        }
        this.runners.delete(serverId);
        await MinecraftServerManager.updateServer(serverId, { isRunning: false }, owner);
        this.events.emit('status', { serverId, isRunning: false });
        JobManager.succeed(job.id);
        return job;
    }

    static sendCommand(serverId: string, command: string) {
        const runner = this.runners.get(serverId);
        if (!runner) throw new Error('server not running');
        this.events.emit('console', { serverId, line: `> ${command}` });
    }
}

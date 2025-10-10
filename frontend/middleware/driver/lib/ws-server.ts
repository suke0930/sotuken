import { Server as HttpServer } from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import cookie from 'cookie';
import { SESSION_NAME, WS_PATH } from './constants';
import { JobManager } from './job-manager';

interface Client {
    ws: WebSocket;
    userId: string;
    channels: Set<string>;
}

export class WsHub {
    private wss!: WebSocketServer;
    private clients = new Set<Client>();

    constructor(private http: HttpServer, private getUserIdFromCookie: (sid: string) => Promise<string | null>) { }

    start() {
        this.wss = new WebSocketServer({ server: this.http, path: WS_PATH });

        this.wss.on('connection', async (ws, req) => {
            const cookies = cookie.parse(req.headers.cookie || '');
            const sid = cookies[SESSION_NAME];
            const userId = sid ? await this.getUserIdFromCookie(sid) : null;
            if (!userId) {
                ws.close(4401, 'unauthorized');
                return;
            }
            const client: Client = { ws, userId, channels: new Set() };
            this.clients.add(client);

            ws.on('message', (data) => {
                try {
                    const msg = JSON.parse(String(data));
                    if (msg.type === 'subscribe' && Array.isArray(msg.channels)) {
                        msg.channels.forEach((c: string) => client.channels.add(c));
                    } else if (msg.type === 'unsubscribe' && Array.isArray(msg.channels)) {
                        msg.channels.forEach((c: string) => client.channels.delete(c));
                    }
                } catch { /* ignore */ }
            });
            ws.on('close', () => this.clients.delete(client));
        });

        JobManager.events.on('job:progress', (job) => this.broadcast(`job:${job.id}`, job.owner, { event: 'job:progress', job }));
        JobManager.events.on('job:completed', (job) => this.broadcast(`job:${job.id}`, job.owner, { event: 'job:completed', job }));
        JobManager.events.on('job:failed', (job) => this.broadcast(`job:${job.id}`, job.owner, { event: 'job:failed', job }));
    }

    emitTo(userId: string, channel: string, payload: any) {
        this.broadcast(channel, userId, payload);
    }

    private broadcast(channel: string, userId: string, payload: any) {
        const json = JSON.stringify(payload);
        for (const c of this.clients) {
            if (userId !== '*' && c.userId !== userId) continue;
            if (!this.match(c.channels, channel)) continue;
            if (c.ws.readyState === WebSocket.OPEN) {
                c.ws.send(json);
            }
        }
    }

    private match(channels: Set<string>, name: string) {
        if (channels.has(name)) return true;
        for (const ch of channels) {
            if (ch.endsWith('*') && name.startsWith(ch.slice(0, -1))) return true;
        }
        return false;
    }
}

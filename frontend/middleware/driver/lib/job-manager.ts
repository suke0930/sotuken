import crypto from 'crypto';
import { EventEmitter } from 'events';
import { Job, JobType } from './types';

export class JobManager {
    private static jobs = new Map<string, Job>();
    // job:progress | job:completed | job:failed を発火
    static readonly events = new EventEmitter();

    static create(type: JobType, owner: string, payload?: any): Job {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        const job: Job = {
            id, type, owner, payload,
            status: 'queued', progress: 0,
            startedAt: now, updatedAt: now
        };
        this.jobs.set(id, job);
        // 直ちに running に遷移
        this.update(id, { status: 'running', progress: 0 });
        return job;
    }

    static get(id: string): Job | undefined {
        return this.jobs.get(id);
    }

    static list(filter?: Partial<Pick<Job, 'type' | 'status' | 'owner'>>): Job[] {
        return [...this.jobs.values()].filter(j => {
            if (filter?.type && j.type !== filter.type) return false;
            if (filter?.status && j.status !== filter.status) return false;
            if (filter?.owner && j.owner !== filter.owner) return false;
            return true;
        });
    }

    static update(id: string, patch: Partial<Job>): Job | undefined {
        const job = this.jobs.get(id);
        if (!job) return;
        Object.assign(job, patch);
        job.updatedAt = new Date().toISOString();

        if (job.status === 'running') this.events.emit('job:progress', job);
        if (job.status === 'success') this.events.emit('job:completed', job);
        if (job.status === 'failed' || job.status === 'canceled') this.events.emit('job:failed', job);
        return job;
    }

    static succeed(id: string, result?: any) {
        this.update(id, { status: 'success', progress: 100, result });
    }
    static fail(id: string, error: any) {
        this.update(id, { status: 'failed', error });
    }
}

import { Queue, Worker, type ConnectionOptions, type WorkerOptions, type QueueOptions } from 'bullmq';

// ── Shared connection options ─────────────────────────────────────────────────
// Use a plain ConnectionOptions object (host/port/password) rather than an
// IORedis instance to avoid the dual-version type conflict in this monorepo
// (wrkly-api: ioredis@5.10.0 vs root: ioredis@5.9.3).

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const parsedUrl = new URL(redisUrl);

export const connection: ConnectionOptions = {
  host:     process.env.REDIS_HOST     ?? parsedUrl.hostname,
  port:     parseInt(process.env.REDIS_PORT ?? parsedUrl.port ?? '6379', 10),
  password: process.env.REDIS_PASSWORD ?? parsedUrl.password || undefined,
  maxRetriesPerRequest: null, // Required by BullMQ
};

// ── Factory helpers ───────────────────────────────────────────────────────────

/** Standard Queue options applied to all Wrkly queues. */
const defaultQueueOptions: QueueOptions = {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff:  { type: 'exponential', delay: 2000 },
    removeOnComplete: 100, // keep last 100 completed jobs
    removeOnFail:     200, // keep last 200 failed for inspection
  },
};

/** Standard Worker options — concurrency 1 prevents concurrent cron runs. */
const defaultWorkerOptions: WorkerOptions = {
  connection,
  concurrency: 1,
};

export function createQueue(name: string, options?: Partial<QueueOptions>): Queue {
  return new Queue(name, { ...defaultQueueOptions, ...options, connection });
}

export function createWorker<T = unknown, R = unknown>(
  name: string,
  processor: ConstructorParameters<typeof Worker<T, R>>[1],
  options?: Partial<WorkerOptions>
): Worker<T, R> {
  return new Worker<T, R>(name, processor, { ...defaultWorkerOptions, ...options, connection });
}

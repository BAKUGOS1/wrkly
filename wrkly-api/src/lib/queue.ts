import { Queue, Worker, type ConnectionOptions, type WorkerOptions, type QueueOptions } from 'bullmq';

// ── Redis connection ───────────────────────────────────────────────────────────
// Parses REDIS_URL (Railway private URL) into host/port/password parts.
// BullMQ requires a plain ConnectionOptions object (not an ioredis instance)
// to avoid the dual-version type conflict in this monorepo.

const REDIS_URL = process.env.REDIS_URL;

function buildConnection(): ConnectionOptions {
  if (!REDIS_URL) {
    // No Redis configured — return localhost as placeholder.
    // Workers will fail gracefully (error events only, no crash).
    console.warn('[queue] REDIS_URL not set — BullMQ will not connect');
    return { host: '127.0.0.1', port: 6379, maxRetriesPerRequest: null };
  }

  const url = new URL(REDIS_URL);
  const conn: ConnectionOptions = {
    host:     url.hostname,
    port:     parseInt(url.port || '6379', 10),
    password: url.password || undefined,
    tls:      url.protocol === 'rediss:' ? {} : undefined,
    maxRetriesPerRequest: null, // Required by BullMQ
  };

  console.log(`[queue] Connecting to Redis at ${url.hostname}:${url.port}`);
  return conn;
}

export const connection: ConnectionOptions = buildConnection();

// ── Factory helpers ───────────────────────────────────────────────────────────

/** Standard Queue options applied to all Wrkly queues. */
const defaultQueueOptions: QueueOptions = {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff:  { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail:     200,
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

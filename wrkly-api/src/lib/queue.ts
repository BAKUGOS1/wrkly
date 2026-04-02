import { Queue, Worker, type ConnectionOptions, type WorkerOptions, type QueueOptions } from 'bullmq';

let REDIS_URL = process.env.REDIS_URL;

function buildConnection(): ConnectionOptions {
  if (!REDIS_URL) {
    console.warn('[queue] REDIS_URL not set — BullMQ will not connect');
    return { host: '127.0.0.1', port: 6379, maxRetriesPerRequest: null };
  }

  // Strip literal quotes if set incorrectly from CLI
  REDIS_URL = REDIS_URL.replace(/^["']|["']$/g, '');

  const fullUrl = REDIS_URL.startsWith('redis://') || REDIS_URL.startsWith('rediss://') 
    ? REDIS_URL 
    : `redis://${REDIS_URL}`;

  try {
    const url = new URL(fullUrl);
    const conn: ConnectionOptions = {
      host:     url.hostname,
      port:     parseInt(url.port || '6379', 10),
      password: url.password || undefined,
      tls:      url.protocol === 'rediss:' ? {} : undefined,
      maxRetriesPerRequest: null,
    };
    console.log(`[queue] URL parsed successfully. Host: ${url.hostname}`);
    return conn;
  } catch (err) {
    console.warn(`[queue] Failed to parse REDIS_URL ("${REDIS_URL}"). Disabling BullMQ connection.`);
    return { host: '127.0.0.1', port: 6379, maxRetriesPerRequest: null };
  }
}

export const connection: ConnectionOptions = buildConnection();

// ── Factory helpers ───────────────────────────────────────────────────────────

const defaultQueueOptions: QueueOptions = {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff:  { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail:     200,
  },
};

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

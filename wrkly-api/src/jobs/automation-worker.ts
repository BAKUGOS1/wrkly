import { createWorker, createQueue } from '../lib/queue';
import { automationEngine, type BoardEvent } from '../services/automation-engine';

export const AUTOMATION_QUEUE_NAME = 'automation';

export interface AutomationJobData {
  event: BoardEvent;
}

// Lazy singleton — only created when Redis is available.
// Using a function getter prevents the Queue from connecting at import time.
let _automationQueue: ReturnType<typeof createQueue> | null = null;

/** Singleton queue — import this wherever you need to enqueue automation jobs. */
export function getAutomationQueue() {
  if (!process.env.REDIS_URL) return null;
  if (!_automationQueue) {
    _automationQueue = createQueue(AUTOMATION_QUEUE_NAME, {
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 50,
        removeOnFail: 100,
      },
    });
  }
  return _automationQueue;
}

/** Launch the automation worker. Call this from initializeJobs(). */
export function startAutomationWorker() {
  if (!process.env.REDIS_URL) {
    console.warn('[automation] REDIS_URL not set — automation worker not started');
    return null;
  }

  const worker = createWorker<AutomationJobData>(
    AUTOMATION_QUEUE_NAME,
    async (job) => {
      const { event } = job.data;
      await automationEngine.evaluate(event);
    },
    { concurrency: 5 }
  );

  worker.on('completed', (job) => {
    console.log(`[automation] Job ${job.id} completed (event: ${job.data.event.type})`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[automation] Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    // Swallow — logged but won't crash the process
    console.error(`[automation] Worker error:`, err.message);
  });

  console.log(`[automation] Worker started — queue: "${AUTOMATION_QUEUE_NAME}"`);
  return worker;
}

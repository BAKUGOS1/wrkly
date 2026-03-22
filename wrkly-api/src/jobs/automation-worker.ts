import { createWorker, createQueue } from '../lib/queue';
import { automationEngine, type BoardEvent } from '../services/automation-engine';

export const AUTOMATION_QUEUE_NAME = 'automation';

export interface AutomationJobData {
  event: BoardEvent;
}

/** Singleton queue — import this wherever you need to enqueue automation jobs. */
export const automationQueue = createQueue(AUTOMATION_QUEUE_NAME, {
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: 50,
    removeOnFail: 100,
  },
});

/** Launch the automation worker. Call this from initializeJobs(). */
export function startAutomationWorker() {
  const worker = createWorker<AutomationJobData>(
    AUTOMATION_QUEUE_NAME,
    async (job) => {
      const { event } = job.data;
      await automationEngine.evaluate(event);
    },
    { concurrency: 5 }  // Allow up to 5 concurrent automation evaluations
  );

  worker.on('completed', (job) => {
    console.log(`[automation] Job ${job.id} completed (event: ${job.data.event.type})`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[automation] Job ${job?.id} failed:`, err.message);
  });

  console.log(`[automation] Worker started — queue: "${AUTOMATION_QUEUE_NAME}"`);

  return worker;
}

import { createQueue, createWorker } from '../lib/queue';
import { processReminders, scanDueDateAutomations, QUEUE_NAME } from './reminder-scheduler';
import { startAutomationWorker } from './automation-worker';
import { consolidateBoardMemories, QUEUE_NAME as MEMORY_QUEUE } from './memory-consolidation';

const REPEATABLE_KEY = 'reminder-tick';
const REPEAT_EVERY_MS = 60_000; // 60 seconds

const MEMORY_KEY = 'memory-consolidation-tick';
const MEMORY_REPEAT_MS = 24 * 60 * 60 * 1000; // 24 hours

// ── Initialize job system ─────────────────────────────────────────────────────

export async function initializeJobs(): Promise<void> {

  // Guard: skip the entire job system if REDIS_URL is not configured.
  // This prevents the app from crashing on startup when Redis is unavailable.
  if (!process.env.REDIS_URL) {
    console.warn('[jobs] REDIS_URL not set — skipping background job system. Set REDIS_URL to enable reminders and automations.');
    return;
  }

  try {
    // ── Reminder Queue ────────────────────────────────────────────────────────
    const queue = createQueue(QUEUE_NAME);

    // Remove any stale repeatable job before re-registering (idempotent on restart)
    const existing = await queue.getRepeatableJobs();
    for (const job of existing) {
      if (job.name === REPEATABLE_KEY) {
        await queue.removeRepeatableByKey(job.key);
      }
    }

    // Add the repeatable reminder job
    await queue.add(
      REPEATABLE_KEY,
      {}, // no payload needed — processor queries DB directly
      {
        repeat: { every: REPEAT_EVERY_MS },
        jobId:  REPEATABLE_KEY, // stable ID prevents duplicate registrations
      }
    );

    // ── Worker ─────────────────────────────────────────────────────────────────
    const worker = createWorker(QUEUE_NAME, async () => {
      await processReminders();
      // Also scan due dates and queue automation events (fire-and-forget safe)
      await scanDueDateAutomations();
    });

    worker.on('completed', () => {
      console.log(`[jobs] ${QUEUE_NAME} tick completed`);
    });

    worker.on('failed', (_job, err) => {
      console.error(`[jobs] ${QUEUE_NAME} tick failed:`, err);
    });

    worker.on('error', (err) => {
      // Swallow connection errors — logged but don't crash the process
      console.error(`[jobs] ${QUEUE_NAME} worker error:`, err.message);
    });

    console.log(`[jobs] Reminder job initialized — running every ${REPEAT_EVERY_MS / 1000}s`);

    // Start the automation worker (event-driven, no polling needed)
    startAutomationWorker();

    // ── Memory Consolidation Queue ────────────────────────────────────────────
    const memoryQueue = createQueue(MEMORY_QUEUE);

    const memoryExisting = await memoryQueue.getRepeatableJobs();
    for (const job of memoryExisting) {
      if (job.name === MEMORY_KEY) {
        await memoryQueue.removeRepeatableByKey(job.key);
      }
    }

    await memoryQueue.add(
      MEMORY_KEY,
      {},
      {
        repeat: { every: MEMORY_REPEAT_MS },
        jobId:  MEMORY_KEY,
      }
    );

    const memoryWorker = createWorker(MEMORY_QUEUE, async () => {
      await consolidateBoardMemories();
    });

    memoryWorker.on('completed', () => {
      console.log(`[jobs] ${MEMORY_QUEUE} tick completed`);
    });

    memoryWorker.on('failed', (_job, err) => {
      console.error(`[jobs] ${MEMORY_QUEUE} tick failed:`, err);
    });

    memoryWorker.on('error', (err) => {
      console.error(`[jobs] ${MEMORY_QUEUE} worker error:`, err.message);
    });

    console.log(`[jobs] Memory consolidation initialized — running every ${MEMORY_REPEAT_MS / 1000 / 3600}h`);

  } catch (err) {
    // Redis connection failed at startup — log the error but DO NOT crash.
    // The HTTP API and Socket.io will still work.
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[jobs] Failed to initialize job system (Redis unavailable?): ${msg}`);
    console.warn('[jobs] Background jobs are disabled. The REST API will still work normally.');
  }
}

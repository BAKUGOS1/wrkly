import { createQueue, createWorker } from '../lib/queue';
import { processReminders, scanDueDateAutomations, QUEUE_NAME } from './reminder-scheduler';
import { startAutomationWorker } from './automation-worker';

const REPEATABLE_KEY = 'reminder-tick';
const REPEAT_EVERY_MS = 60_000; // 60 seconds

// ── Initialize job system ─────────────────────────────────────────────────────

export async function initializeJobs(): Promise<void> {
  // ── Queue ────────────────────────────────────────────────────────────────────
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

  // ── Worker ───────────────────────────────────────────────────────────────────
  // concurrency:1 (from default options) ensures only one tick runs at a time
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

  console.log(`[jobs] Job system initialized — ${QUEUE_NAME} running every ${REPEAT_EVERY_MS / 1000}s`);

  // Start the automation worker (event-driven, no polling needed)
  startAutomationWorker();
}

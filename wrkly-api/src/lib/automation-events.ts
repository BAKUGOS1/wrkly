import { getAutomationQueue } from '../jobs/automation-worker';
import type { BoardEvent } from '../services/automation-engine';

/**
 * Queues an automation evaluation job for the given event.
 * Fire-and-forget — never throws or awaits the result.
 * No-ops silently if Redis / the queue is not configured.
 */
export function triggerAutomation(event: BoardEvent): void {
  const queue = getAutomationQueue();
  if (!queue) return; // Redis not configured — skip silently

  queue
    .add('evaluate', { event }, { removeOnComplete: true, removeOnFail: 100 })
    .catch((err: unknown) => {
      // Redis may be temporarily unavailable — log and continue.
      console.warn('[automation] Failed to queue event:', (err as Error)?.message ?? err);
    });
}

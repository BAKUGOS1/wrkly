import { automationQueue } from '../jobs/automation-worker';
import type { BoardEvent } from '../services/automation-engine';

/**
 * Queues an automation evaluation job for the given event.
 * Fire-and-forget — never throws or awaits the result.
 * Keep this super lightweight: the heavy lifting happens in the BullMQ worker.
 */
export function triggerAutomation(event: BoardEvent): void {
  automationQueue
    // The worker processor expects { event } — wrap the raw event here
    .add('evaluate', { event }, { removeOnComplete: true, removeOnFail: 100 })
    .catch((err: unknown) => {
      // Redis may be unavailable — log and continue. Never block the API response.
      console.warn('[automation] Failed to queue event:', (err as Error)?.message ?? err);
    });
}

export function calculatePosition(before: number | null, after: number | null): number {
  if (before === null && after === null) {
    return 1.0;
  }

  if (before === null) {
    // Insert before the first item — always positive
    return after! / 2.0;
  }

  if (after === null) {
    // Insert after the last item
    return before + 1.0;
  }

  // Insert between two items
  return (before + after) / 2.0;
}

/**
 * Checks if two adjacent positions are so close that a rebalance is needed.
 * Uses a mathematical epsilon — avoids string-based float inspection.
 */
export function needsRebalance(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.001;
}

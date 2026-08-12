/**
 * Phase 1 statistics helpers — binomial test, streak, and session summary.
 *
 * This module reuses the canonical analytics engine (`src/features/statistics/
 * analytics.ts`) as the single source of truth for the binomial p-value and
 * chance comparison. What it adds here are the Phase-1-specific, lightweight
 * helpers the Contrast Discrimination exercises need directly:
 *   - in-session streak (consecutive correct rounds)
 *   - a compact session summary (accuracy %, p-value, chance comparison)
 *   - the Phase 2 unlock rule (accuracy >= 60%, above chance for binary)
 *
 * Kept framework-agnostic (no React / DOM) so the logic is unit-testable.
 */

import {
  binomialPValue,
  computeChanceComparison,
  P_VALUE_THRESHOLD,
} from '../features/statistics/analytics';
import type { ChanceComparison } from '../features/statistics/types';

/* ==========================================================================
 * Constants
 * ========================================================================= */

/** Minimum accuracy (as a ratio) to unlock Phase 2. */
export const PHASE2_UNLOCK_ACCURACY = 0.6;

/** Chance rate for a binary (2-choice) contrast discrimination. */
export const BINARY_CHANCE_RATE = 0.5;

/** Significance threshold for "above chance". Mirrors analytics engine. */
export const SIGNIFICANCE_THRESHOLD = P_VALUE_THRESHOLD;

/* ==========================================================================
 * Streak
 * ========================================================================= */

/**
 * Longest run of consecutive `true` values (correct answers) in a sequence.
 * Returns 0 for an empty sequence.
 */
export function maxStreak(results: readonly boolean[]): number {
  let best = 0;
  let run = 0;
  for (const r of results) {
    if (r) {
      run++;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }
  return best;
}

/** Current (trailing) streak: consecutive correct answers at the end. */
export function currentStreak(results: readonly boolean[]): number {
  let run = 0;
  for (let i = results.length - 1; i >= 0; i--) {
    if (results[i]) run++;
    else break;
  }
  return run;
}

/* ==========================================================================
 * Session summary
 * ========================================================================= */

export interface Phase1SessionMetrics {
  /** Correct round count. */
  readonly correct: number;
  /** Total committed rounds. */
  readonly total: number;
  /** Accuracy as a ratio (0-1). */
  readonly accuracy: number;
  /** Accuracy as a percentage string (e.g. "58.3%"). */
  readonly accuracyPercent: string;
  /** Longest consecutive-correct streak within the session. */
  readonly maxStreak: number;
  /** Trailing consecutive-correct streak. */
  readonly trailingStreak: number;
  /** Two-tailed binomial p-value vs chance (0.5 for binary). */
  readonly pValue: number;
  /** Whether p < 0.05 (statistically above chance). */
  readonly aboveChance: boolean;
  /** Chance comparison result (reused from analytics engine). */
  readonly chanceComparison: ChanceComparison;
  /** Whether Phase 2 should unlock (accuracy >= 60% AND above chance). */
  readonly unlocksPhase2: boolean;
}

/**
 * Compute the full Phase 1 session summary from a list of per-round
 * correct/incorrect flags. `chanceRate` defaults to 0.5 (binary contrast).
 */
export function summarizeSession(
  correctness: readonly boolean[],
  chanceRate: number = BINARY_CHANCE_RATE,
): Phase1SessionMetrics {
  const total = correctness.length;
  const correct = correctness.filter(Boolean).length;
  const accuracy = total > 0 ? correct / total : 0;

  // Binomial test vs chance. Guard against total === 0 (returns NaN).
  const pValue = total > 0 ? binomialPValue(correct, total, chanceRate) : NaN;

  const chanceComparison = computeChanceComparison(correct, total, chanceRate);
  const aboveChance = !isNaN(pValue) && pValue < SIGNIFICANCE_THRESHOLD;

  // Phase 2 unlock: >= 60% accuracy, and the result is above chance.
  const unlocksPhase2 =
    total > 0 && accuracy >= PHASE2_UNLOCK_ACCURACY && aboveChance;

  return {
    correct,
    total,
    accuracy,
    accuracyPercent: `${(accuracy * 100).toFixed(1)}%`,
    maxStreak: maxStreak(correctness),
    trailingStreak: currentStreak(correctness),
    pValue,
    aboveChance,
    chanceComparison,
    unlocksPhase2,
  };
}

/** Human-readable verdict for the session summary display. */
export function sessionVerdict(m: Pick<Phase1SessionMetrics, 'aboveChance' | 'accuracy'>): string {
  if (!m.aboveChance) {
    return 'Result not distinguishable from chance — keep practicing.';
  }
  return `Result significantly above chance (${(m.accuracy * 100).toFixed(1)}% accuracy).`;
}

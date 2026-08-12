/**
 * Difficulty tier progression (spec: 5 tiers, acceptance-bar driven).
 *
 * Tier determines how many distractors the forced-choice engine presents:
 *   - beginner     : show minimum choices (easiest, highest chance floor)
 *   - elementary   :
 *   - intermediate :
 *   - advanced     :
 *   - expert       : show maximum choices (hardest, most distractors)
 *
 * The engine picks `choicesPerTier(tier, minChoices, poolSize)` choice options
 * per round. As the tier rises, more distractor options appear, lowering the
 * chance baseline and making "above chance" harder to achieve.
 *
 * Progression uses the spec's acceptance bar:
 *   - ADVANCE when accuracy >= 80% across 3 consecutive sessions
 *   - REVERT when accuracy < 60% across 3 consecutive sessions
 */
import type { DifficultyTier } from '../../types';

/** Ordered tier list (index = rank). */
export const TIER_ORDER: readonly DifficultyTier[] = [
  'beginner',
  'elementary',
  'intermediate',
  'advanced',
  'expert',
];

/** Human label for each tier. */
export const TIER_LABELS: Record<DifficultyTier, string> = {
  beginner: 'Beginner',
  elementary: 'Elementary',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  expert: 'Expert',
};

/** Acceptance bar: advance at/above this accuracy. */
export const ADVANCE_ACCURACY = 0.8;
/** Reversion bar: revert at/below this accuracy. */
export const REVERT_ACCURACY = 0.6;
/** Consecutive sessions required to trigger a tier change. */
export const TIER_WINDOW = 3;

/**
 * How many force-choice options to present at a given tier.
 * Scales from the exercise's minimum up toward its full pool size.
 */
export function choicesAtTier(
  tier: DifficultyTier,
  minChoices: number,
  poolSize: number,
): number {
  const rank = TIER_ORDER.indexOf(tier);
  if (rank < 0) return minChoices;
  // Add one extra distractor per tier step above beginner.
  const count = Math.min(poolSize, minChoices + rank);
  return Math.max(2, count);
}

/** The chance baseline (1 / choices) at a tier. */
export function chanceAtTier(tier: DifficultyTier, minChoices: number, poolSize: number): number {
  const choices = choicesAtTier(tier, minChoices, poolSize);
  return 1 / choices;
}

/**
 * Decide the next tier given the recent-accuracy history.
 * Returns the same tier if the acceptance bar isn't met in either direction.
 */
export function nextTier(
  current: DifficultyTier,
  recentAccuracies: readonly number[],
): DifficultyTier {
  const rank = TIER_ORDER.indexOf(current);
  const last3 = recentAccuracies.slice(-TIER_WINDOW);
  if (last3.length < TIER_WINDOW) return current;

  const allHigh = last3.every((a) => a >= ADVANCE_ACCURACY);
  const allLow = last3.every((a) => a < REVERT_ACCURACY);

  if (allHigh && rank < TIER_ORDER.length - 1) return TIER_ORDER[rank + 1]!;
  if (allLow && rank > 0) return TIER_ORDER[rank - 1]!;
  return current;
}

/** Convenience: does applying nextTier change the tier? */
export function tierChanges(onward: DifficultyTier, current: DifficultyTier): boolean {
  return onward !== current;
}

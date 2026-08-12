/**
 * Tests for the statistics analytics engine.
 *
 * These are pure-unit tests (no DOM, no IndexedDB) — the analytics engine
 * is framework-agnostic so we can verify the math directly.
 */
import { describe, it, expect } from 'vitest';
import {
  binomialPValue,
  wilsonCI,
  computeSessionAccuracy,
  computeChanceComparison,
  computeReactionTimeDistribution,
  computeCorrelation,
  computeLinearRegression,
  movingAverage,
  computeTrendAnalysis,
  computeSessionVariance,
  computeRegressionToMean,
  computeStreaks,
  computeConfusionMatrix,
  computeFatigueCurve,
  computeProfileAnalytics,
  chanceRateForExercise,
  formatAccuracy,
  formatPValue,
  EXERCISE_CHOICES,
} from '../../../src/features/statistics/analytics';
import type { ExerciseRound, Session } from '../../../src/types';

/* =======================================================================
 * Helpers — build minimal Session/ExerciseRound fixtures
 * ===================================================================== */

function makeRound(
  overrides: Partial<ExerciseRound> & Pick<ExerciseRound, 'exerciseType' | 'target'>,
): ExerciseRound {
  return {
    id: `r-${Math.random().toString(36).slice(2)}`,
    sessionId: 'sess-1',
    roundNumber: 1,
    ...overrides,
  };
}

function makeSession(
  rounds: ExerciseRound[],
  overrides: Partial<Session> = {},
): Session {
  return {
    id: 'sess-1',
    profileId: 'p1',
    phaseId: 1,
    dayInPhase: 1,
    absoluteDay: 8,
    difficulty: 'beginner',
    startedAt: Date.now(),
    maxStreak: 0,
    integrityScore: 1.0,
    integrityFlags: [],
    outcome: 'complete',
    accuracy: 0,
    rounds,
    ...overrides,
  };
}

function makeForcedChoiceRounds(
  correct: number,
  total: number,
  exerciseType: string,
  target: string,
  correctAnswer: string,
  wrongAnswer: string,
): ExerciseRound[] {
  const rounds: ExerciseRound[] = [];
  for (let i = 0; i < total; i++) {
    const isCorrect = i < correct;
    rounds.push(
      makeRound({
        exerciseType: exerciseType as ExerciseRound['exerciseType'],
        target,
        targetMeta: { label: target },
        committedAt: 1000 + i * 100,
        responseTimeMs: 1000 + i * 50,
        committedAnswer: isCorrect ? correctAnswer : wrongAnswer,
        correct: isCorrect,
        confidenceRating: 3,
      }),
    );
  }
  return rounds;
}

/* =======================================================================
 * Binomial p-value & Wilson CI
 * ===================================================================== */

describe('binomialPValue', () => {
  it('returns NaN for total=0', () => {
    expect(binomialPValue(0, 0, 0.25)).toBeNaN();
  });

  it('returns 1 when all correct at chance rate', () => {
    // 1 out of 1 correct, chance = 0.25 — not significant
    const p = binomialPValue(1, 1, 0.25);
    expect(p).toBeGreaterThan(0);
  });

  it('returns very small p-value for strong evidence against chance', () => {
    // 10/12 correct at 0.25 chance — well above chance
    const p = binomialPValue(10, 12, 0.25);
    expect(p).toBeLessThan(0.05);
  });

  it('returns 1 when chance rate is 0 or 1', () => {
    expect(binomialPValue(5, 10, 0)).toBe(0); // never happens unless all correct
    expect(binomialPValue(10, 10, 0)).toBe(1);
    expect(binomialPValue(5, 10, 1)).toBe(0);
  });

  it('is symmetric in the two-tailed sense', () => {
    // For binomial, being 2/12 correct at p=0.75 should give a different
    // p-value than 10/12 correct at p=0.25 — but both are "extreme"
    const p1 = binomialPValue(2, 12, 0.75);
    const p2 = binomialPValue(10, 12, 0.25);
    expect(p1).toBeCloseTo(p2, 10);
  });
});

describe('wilsonCI', () => {
  it('returns [0, 0] for total=0', () => {
    expect(wilsonCI(0, 0)).toEqual([0, 0]);
  });

  it('contains the observed proportion', () => {
    const [lo, hi] = wilsonCI(7, 10);
    expect(lo).toBeLessThanOrEqual(0.7);
    expect(hi).toBeGreaterThanOrEqual(0.7);
  });

  it('is wider for smaller samples', () => {
    const ci5 = wilsonCI(4, 5);
    const ci50 = wilsonCI(40, 50);
    const width5 = ci5[1] - ci5[0];
    const width50 = ci50[1] - ci50[0];
    expect(width5).toBeGreaterThan(width50);
  });

  it('clamps to [0, 1]', () => {
    const [lo, hi] = wilsonCI(0, 10);
    expect(lo).toBeGreaterThanOrEqual(0);
    const [lo2, hi2] = wilsonCI(10, 10);
    expect(hi2).toBeLessThanOrEqual(1);
  });
});

/* =======================================================================
 * Session accuracy
 * ===================================================================== */

describe('computeSessionAccuracy', () => {
  it('only counts committed rounds', () => {
    const rounds = [
      makeRound({ exerciseType: 'contrast', target: 'black', committedAt: 1, correct: true }),
      makeRound({ exerciseType: 'contrast', target: 'white', committedAt: 2, correct: false }),
      makeRound({ exerciseType: 'contrast', target: 'black' }), // not committed
    ];
    const session = makeSession(rounds);
    const acc = computeSessionAccuracy(session);
    expect(acc.attempted).toBe(2);
    expect(acc.correct).toBe(1);
    expect(acc.ratio).toBe(0.5);
  });

  it('computes chance rate from exercise types (contrast=2 choices)', () => {
    const rounds = makeForcedChoiceRounds(6, 6, 'contrast', 'black', 'black', 'white');
    const session = makeSession(rounds);
    const acc = computeSessionAccuracy(session);
    expect(acc.choicesPerRound).toBe(2);
    expect(acc.ratio).toBe(1);
  });

  it('computes p-value for a perfect session against chance', () => {
    const rounds = makeForcedChoiceRounds(12, 12, 'color', 'red', 'red', 'blue');
    const session = makeSession(rounds);
    const acc = computeSessionAccuracy(session);
    expect(acc.pValue).toBeLessThan(0.05);
  });

  it('returns [0, 0] CI for empty rounds', () => {
    const session = makeSession([]);
    const acc = computeSessionAccuracy(session);
    expect(acc.ratio).toBe(0);
    expect(acc.correct).toBe(0);
    expect(acc.attempted).toBe(0);
    expect(acc.ci).toEqual([0, 0]);
    expect(isNaN(acc.pValue)).toBe(true);
  });
});

/* =======================================================================
 * Chance comparison
 * ===================================================================== */

describe('computeChanceComparison', () => {
  it('classifies above-chance performance as "above"', () => {
    const cc = computeChanceComparison(11, 12, 0.25);
    expect(cc.status).toBe('above');
    expect(cc.observedRate).toBeCloseTo(11 / 12);
  });

  it('classifies at-chance performance as "consistent"', () => {
    const cc = computeChanceComparison(3, 12, 0.25);
    expect(cc.status).toBe('consistent');
  });

  it('classifies below-chance as "below"', () => {
    // 0/12 at chance 0.25 — significantly below
    const cc = computeChanceComparison(0, 12, 0.25);
    expect(cc.status).toBe('below');
  });

  it('returns NaN zScore for total=0', () => {
    const cc = computeChanceComparison(0, 0, 0.25);
    expect(isNaN(cc.zScore)).toBe(true);
    expect(cc.status).toBe('consistent');
  });
});

/* =======================================================================
 * Reaction time distribution
 * ===================================================================== */

describe('computeReactionTimeDistribution', () => {
  it('returns null for empty rounds', () => {
    expect(computeReactionTimeDistribution([])).toBeNull();
  });

  it('returns null when no valid response times', () => {
    const rounds = [
      makeRound({ exerciseType: 'contrast', target: 'black', responseTimeMs: undefined }),
      makeRound({ exerciseType: 'contrast', target: 'black', responseTimeMs: 0 }),
    ];
    expect(computeReactionTimeDistribution(rounds)).toBeNull();
  });

  it('computes summary stats correctly', () => {
    const rts = [100, 200, 300, 400, 500];
    const rounds = rts.map((rt) =>
      makeRound({ exerciseType: 'contrast', target: 'black', responseTimeMs: rt }),
    );
    const dist = computeReactionTimeDistribution(rounds);
    expect(dist).not.toBeNull();
    expect(dist!.mean).toBeCloseTo(300);
    expect(dist!.median).toBe(300);
    expect(dist!.min).toBe(100);
    expect(dist!.max).toBe(500);
  });

  it('uses at least 5 bins for large samples', () => {
    const rts = Array.from({ length: 100 }, (_, i) => 100 + i * 10);
    const rounds = rts.map((rt) =>
      makeRound({ exerciseType: 'contrast', target: 'black', responseTimeMs: rt }),
    );
    const dist = computeReactionTimeDistribution(rounds);
    expect(dist).not.toBeNull();
    expect(dist!.counts.length).toBeGreaterThanOrEqual(5);
    expect(dist!.binEdges.length).toBe(dist!.counts.length + 1);
    expect(dist!.counts.reduce((a: number, b: number) => a + b, 0)).toBe(100);
  });
});

/* =======================================================================
 * Correlation
 * ===================================================================== */

describe('computeCorrelation', () => {
  it('returns NaN r for fewer than 2 points', () => {
    const r = computeCorrelation([1], [3]);
    expect(isNaN(r.r)).toBe(true);
    expect(r.n).toBe(1);
  });

  it('detects perfect positive correlation', () => {
    const r = computeCorrelation([1, 2, 3, 4, 5], [2, 4, 6, 8, 10]);
    expect(r.r).toBeCloseTo(1, 10);
    expect(r.interpretation).toBe('strong-positive');
  });

  it('detects perfect negative correlation', () => {
    const r = computeCorrelation([1, 2, 3, 4, 5], [10, 8, 6, 4, 2]);
    expect(r.r).toBeCloseTo(-1, 10);
    expect(r.interpretation).toBe('strong-negative');
  });

  it('detects no correlation', () => {
    const r = computeCorrelation([1, 2, 3, 4, 5], [3, 1, 4, 1, 5]);
    expect(r.r).toBeLessThan(0.5);
  });
});

/* =======================================================================
 * Linear regression
 */

describe('computeLinearRegression', () => {
  it('returns zeros for fewer than 2 points', () => {
    const reg = computeLinearRegression([1], [3]);
    expect(reg.slope).toBe(0);
    expect(reg.n).toBe(1);
    expect(isNaN(reg.pValue)).toBe(true);
  });

  it('finds correct slope for linear data', () => {
    const xs = [1, 2, 3, 4, 5];
    const ys = [3, 5, 7, 9, 11]; // y = 2x + 1
    const reg = computeLinearRegression(xs, ys);
    expect(reg.slope).toBeCloseTo(2, 6);
    expect(reg.intercept).toBeCloseTo(1, 6);
    expect(reg.rSquared).toBeCloseTo(1, 6);
  });

  it('detects zero slope for flat data', () => {
    const xs = [1, 2, 3, 4, 5];
    const ys = [5, 5, 5, 5, 5];
    const reg = computeLinearRegression(xs, ys);
    expect(reg.slope).toBeCloseTo(0, 10);
  });
});

/* =======================================================================
 * Moving average & trend
 * ===================================================================== */

describe('movingAverage', () => {
  it('returns same length as input', () => {
    const result = movingAverage([1, 2, 3, 4, 5]);
    expect(result).toHaveLength(5);
  });

  it('centers window on each point', () => {
    const result = movingAverage([1, 2, 3, 4, 5]);
    // Middle point: avg of [2,3,4] = 3
    expect(result[2]!.y).toBeCloseTo(3);
  });

  it('shrinks window at edges', () => {
    const result = movingAverage([1, 2, 3, 4, 5]);
    // First point: avg of [1,2] = 1.5
    expect(result[0]!.y).toBeCloseTo(1.5);
  });
});

describe('computeTrendAnalysis', () => {
  it('detects improving trend', () => {
    const series = [0.25, 0.4, 0.55, 0.7, 0.85];
    const trend = computeTrendAnalysis(series);
    expect(trend.direction).toBe('improving');
    expect(trend.regression.slope).toBeGreaterThan(0);
    expect(trend.movingAverage).toHaveLength(5);
  });

  it('detects declining trend', () => {
    const series = [0.85, 0.7, 0.55, 0.4, 0.25];
    const trend = computeTrendAnalysis(series);
    expect(trend.direction).toBe('declining');
    expect(trend.regression.slope).toBeLessThan(0);
  });

  it('detects flat trend', () => {
    const series = [0.5, 0.5, 0.5, 0.5];
    const trend = computeTrendAnalysis(series);
    expect(trend.direction).toBe('flat');
  });
});

/* =======================================================================
 * Session variance
 * ===================================================================== */

describe('computeSessionVariance', () => {
  it('returns 0 for fewer than 2 sessions', () => {
    expect(computeSessionVariance([0.5])).toBe(0);
    expect(computeSessionVariance([])).toBe(0);
  });

  it('computes population variance', () => {
    const variance = computeSessionVariance([0.25, 0.5, 0.75, 1.0]);
    const mean = 0.625;
    const expected = ((0.25 - mean) ** 2 + (0.5 - mean) ** 2 + (0.75 - mean) ** 2 + (1 - mean) ** 2) / 4;
    expect(variance).toBeCloseTo(expected);
  });
});

/* =======================================================================
 * Regression to mean
 * ===================================================================== */

describe('computeRegressionToMean', () => {
  it('does not flag when no previous session', () => {
    const flag = computeRegressionToMean(0.8, null, 0.5, 0.1);
    expect(flag.flagged).toBe(false);
  });

  it('flags when previous was an outlier and current regresses toward mean', () => {
    // previous = 0.9, mean = 0.5, std = 0.1 → z=4 (outlier)
    // current = 0.6 → closer to mean
    const flag = computeRegressionToMean(0.6, 0.9, 0.5, 0.1);
    expect(flag.flagged).toBe(true);
    expect(flag.reason).toContain('outlier');
  });

  it('does not flag when previous was not an outlier', () => {
    const flag = computeRegressionToMean(0.55, 0.6, 0.5, 0.1);
    expect(flag.flagged).toBe(false);
  });
});

/* =======================================================================
 * Streaks
 * ===================================================================== */

describe('computeStreaks', () => {
  it('returns zeros for empty sessions', () => {
    const { currentStreak, recordStreak } = computeStreaks([]);
    expect(currentStreak).toBe(0);
    expect(recordStreak).toBe(0);
  });

  it('counts consecutive above-chance sessions', () => {
    const sessions = Array.from({ length: 5 }, (_, i) =>
      makeSession(makeForcedChoiceRounds(10, 12, 'contrast', 'black', 'black', 'white'), { id: `s${i}`, startedAt: i }),
    );
    const { currentStreak, recordStreak } = computeStreaks(sessions);
    expect(currentStreak).toBe(5);
    expect(recordStreak).toBe(5);
  });

  it('breaks streak on at-chance session', () => {
    const good = makeSession(makeForcedChoiceRounds(10, 12, 'contrast', 'black', 'black', 'white'), { id: 's1', startedAt: 1 });
    const bad = makeSession(makeForcedChoiceRounds(3, 12, 'contrast', 'black', 'black', 'white'), { id: 's2', startedAt: 2 });
    const good2 = makeSession(makeForcedChoiceRounds(10, 12, 'contrast', 'black', 'black', 'white'), { id: 's3', startedAt: 3 });
    const { currentStreak, recordStreak } = computeStreaks([good, bad, good2]);
    expect(currentStreak).toBe(1);
    expect(recordStreak).toBe(1);
  });
});

/* =======================================================================
 * Confusion matrix
 * ===================================================================== */

describe('computeConfusionMatrix', () => {
  it('returns null for empty rounds', () => {
    expect(computeConfusionMatrix([])).toBeNull();
  });

  it('builds a 2x2 matrix for binary targets', () => {
    const rounds = [
      makeRound({ exerciseType: 'color', target: 'red', committedAnswer: 'red', correct: true }),
      makeRound({ exerciseType: 'color', target: 'red', committedAnswer: 'blue', correct: false }),
      makeRound({ exerciseType: 'color', target: 'blue', committedAnswer: 'blue', correct: true }),
      makeRound({ exerciseType: 'color', target: 'blue', committedAnswer: 'red', correct: false }),
    ];
    const cm = computeConfusionMatrix(rounds);
    expect(cm).not.toBeNull();
    expect(cm!.labels).toEqual(['blue', 'red']); // sorted
    expect(cm!.matrix[0]![0]).toBe(1); // blue predicted blue
    expect(cm!.matrix[0]![1]).toBe(1); // blue predicted red
    expect(cm!.matrix[1]![0]).toBe(1); // red predicted blue
    expect(cm!.matrix[1]![1]).toBe(1); // red predicted red
  });

  it('ignores rounds without target/committedAnswer', () => {
    const rounds = [
      makeRound({ exerciseType: 'color', target: 'red', committedAnswer: 'red', correct: true }),
      makeRound({ exerciseType: 'color', correct: false }), // missing target/answered
    ];
    const cm = computeConfusionMatrix(rounds);
    expect(cm).not.toBeNull();
    expect(cm!.labels).toEqual(['red']);
    expect(cm!.matrix[0]![0]).toBe(1);
  });
});

/* =======================================================================
 * Fatigue curve
 * =======================================================================

describe('computeFatigueCurve', () => {
  it('returns points ordered by round number', () => {
    const rounds = Array.from({ length: 6 }, (_, i) =>
      makeRound({
        exerciseType: 'contrast',
        target: 'black',
        roundNumber: i + 1,
        correct: i < 5, // 5 correct, 1 wrong
        committedAt: 1,
      }),
    );
    const curve = computeFatigueCurve(rounds);
    // Each roundNumber is unique, so 6 points, each with accuracy 1.0 or 0.0
    expect(curve).toHaveLength(6);
    expect(curve[0]!.x).toBe(1);
    expect(curve[0]!.y).toBe(1); // round 1: correct=true
    expect(curve[5]!.x).toBe(6);
    expect(curve[5]!.y).toBe(0); // round 6: correct=false
  });

  it('aggregates rounds with same roundNumber across sessions', () => {
    // Two sessions both with round 1, one correct one wrong
    const rounds1 = makeRound({ exerciseType: 'contrast', target: 'black', roundNumber: 1, correct: true });
    const rounds2 = makeRound({ exerciseType: 'contrast', target: 'black', roundNumber: 1, correct: false });
    const rounds3 = makeRound({ exerciseType: 'contrast', target: 'black', roundNumber: 2, correct: true });
    const curve = computeFatigueCurve([rounds1, rounds2, rounds3]);
    expect(curve).toHaveLength(2);
    expect(curve[0]!.x).toBe(1);
    expect(curve[0]!.y).toBe(0.5); // 1/2
  });

  it('returns empty array for empty rounds', () => {
    expect(computeFatigueCurve([])).toEqual([]);
  });
});

/* =======================================================================
 * Chance rate helper
 * ===================================================================== */

describe('chanceRateForExercise', () => {
  it('returns 1/nChoices for known exercises', () => {
    expect(chanceRateForExercise('contrast')).toBe(0.5);
    expect(chanceRateForExercise('color')).toBe(0.25);
    expect(chanceRateForExercise('shape')).toBe(0.25);
    expect(chanceRateForExercise('symbol')).toBe(0.1);
  });

  it('returns 0.5 for unknown exercises', () => {
    expect(chanceRateForExercise('unknown')).toBe(0.5);
  });
});

/* =======================================================================
 * Format helpers
 * ===================================================================== */

describe('formatAccuracy', () => {
  it('formats as percentage with 1 decimal', () => {
    expect(formatAccuracy(0.5)).toBe('50.0%');
    expect(formatAccuracy(0.333)).toBe('33.3%');
    expect(formatAccuracy(1)).toBe('100.0%');
  });
});

describe('formatPValue', () => {
  it('returns em-dash for NaN', () => {
    expect(formatPValue(NaN)).toBe('—');
  });

  it('formats very small p-values', () => {
    expect(formatPValue(0.0001)).toBe('p < 0.001');
  });

  it('formats normal p-values', () => {
    expect(formatPValue(0.04321)).toBe('p = 0.0432');
  });
});

/* =======================================================================
 * Profile analytics (integration)
 * ===================================================================== */

describe('computeProfileAnalytics', () => {
  it('handles empty sessions', () => {
    const analytics = computeProfileAnalytics([]);
    expect(analytics.lifetime.ratio).toBe(0);
    expect(analytics.lifetime.correct).toBe(0);
    expect(analytics.currentStreak).toBe(0);
    expect(analytics.recordStreak).toBe(0);
    expect(analytics.sessionVariance).toBe(0);
  });

  it('aggregates multiple sessions', () => {
    const sessions = [
      makeSession(
        makeForcedChoiceRounds(10, 12, 'contrast', 'black', 'black', 'white'),
        { id: 's1', startedAt: 1000 },
      ),
      makeSession(
        makeForcedChoiceRounds(11, 12, 'contrast', 'black', 'black', 'white'),
        { id: 's2', startedAt: 2000 },
      ),
    ];
    const analytics = computeProfileAnalytics(sessions);
    expect(analytics.lifetime.correct).toBe(21);
    expect(analytics.lifetime.attempted).toBe(24);
    expect(analytics.lifetime.ratio).toBeCloseTo(21 / 24);
    expect(analytics.currentStreak).toBe(2);
    expect(analytics.trend.direction).toBe('improving');
  });

  it('computes per-exercise chance comparisons', () => {
    const sessions = [
      makeSession(
        [
          ...makeForcedChoiceRounds(4, 4, 'color', 'red', 'red', 'blue'),
          ...makeForcedChoiceRounds(3, 4, 'color', 'red', 'red', 'blue'),
        ],
        { id: 's1', startedAt: 1000 },
      ),
    ];
    const analytics = computeProfileAnalytics(sessions);
    expect(analytics.chanceComparisons).toHaveProperty('color');
    expect(analytics.chanceComparisons.color!.observedRate).toBeCloseTo(7 / 8);
    expect(analytics.chanceComparisons.color!.chanceRate).toBe(0.25);
  });

  it('computes Wilson CI for lifetime accuracy', () => {
    const sessions = [
      makeSession(
        makeForcedChoiceRounds(10, 12, 'contrast', 'black', 'black', 'white'),
        { id: 's1', startedAt: 1000 },
      ),
    ];
    const analytics = computeProfileAnalytics(sessions);
    const [lo, hi] = analytics.lifetime.ci;
    expect(lo).toBeLessThanOrEqual(analytics.lifetime.ratio);
    expect(hi).toBeGreaterThanOrEqual(analytics.lifetime.ratio);
  });
});

/* =======================================================================
 * EXERCISE_CHOICES sanity
 * ===================================================================== */

describe('EXERCISE_CHOICES', () => {
  it('has chance rates consistent with spec', () => {
    // 2-choice (contrast) = 50% chance
    expect(EXERCISE_CHOICES.contrast).toBe(2);
    // 4-choice (color/shape) = 25% chance
    expect(EXERCISE_CHOICES.color).toBe(4);
    expect(EXERCISE_CHOICES.shape).toBe(4);
    // 10-choice (symbol) = 10% chance
    expect(EXERCISE_CHOICES.symbol).toBe(10);
    // 16-choice (complex-target) = 6.25% chance
    expect(EXERCISE_CHOICES['complex-target']).toBe(16);
  });
});

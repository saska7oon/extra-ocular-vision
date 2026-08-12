/**
 * Statistics Dashboard & Analytics — type definitions.
 *
 * All types are serializable and storable. Computations that need heavy
 * number-crunching live in `analytics.ts` (pure, framework-agnostic, Web-Worker
 * friendly). The persisted `StatisticsAggregate` type already lives in
 * `src/types/index.ts` and is re-exported here for convenience.
 */

/* =======================================================================
 * Re-exported core domain types
 * ===================================================================== */

import type { Session } from '../../types';
export type { ExerciseType, DifficultyTier, Scale1to10, Session } from '../../types';
export type { StatisticsAggregate, ExerciseStat, LifetimeStat } from '../../types';

/* =======================================================================
 * Derived analytics result types (computed, not persisted)
 * ===================================================================== */

/** Overall accuracy summary for a single session. */
export interface SessionAccuracy {
  /** Session identifier. */
  readonly sessionId: string;
  /** StartedAt epoch ms (for trend ordering). */
  readonly startedAt: number;
  /** Correct rounds / total committed rounds. */
  readonly ratio: number;
  /** Absolute correct count. */
  readonly correct: number;
  /** Committed (attempted) round count. */
  readonly attempted: number;
  /** Session p-value (binomial test vs chance). May be NaN if n=0. */
  readonly pValue: number;
  /** Wilson score interval [lower, upper] for the accuracy ratio. */
  readonly ci: [number, number];
  /** How many choices were typical per round (for chance baseline). */
  readonly choicesPerRound: number;
}

/** Chance-level comparison for an exercise type. */
export interface ChanceComparison {
  /** Theoretical chance rate for this exercise (1 / nChoices). */
  readonly chanceRate: number;
  /** Observed accuracy. */
  readonly observedRate: number;
  /** Color-coded assessment. */
  readonly status: 'below' | 'above' | 'consistent';
  /** Z-score of observed rate vs chance (NaN if variance is 0). */
  readonly zScore: number;
}

/** Binned histogram of reaction times (ms). */
export interface ReactionTimeDistribution {
  /** Bin edges in ms (n+1 for n bins). */
  readonly binEdges: number[];
  /** Count of responses in each bin. */
  readonly counts: number[];
  /** Summary statistics. */
  readonly mean: number;
  readonly median: number;
  readonly stdDev: number;
  readonly min: number;
  readonly max: number;
}

/** Pearson correlation between two series. */
export interface CorrelationResult {
  /** Pearson r (-1..1). NaN if undefined. */
  readonly r: number;
  /** Coefficient of determination r². */
  readonly rSquared: number;
  /** p-value for significance (two-tailed t-test). NaN if undefined. */
  readonly pValue: number;
  /** Number of paired observations. */
  readonly n: number;
  /** Human-readable interpretation. */
  readonly interpretation: 'strong-positive' | 'moderate-positive' | 'weak-positive' | 'none' | 'weak-negative' | 'moderate-negative' | 'strong-negative';
}

/** Linear regression result. */
export interface RegressionResult {
  /** Slope (change in y per unit x). */
  readonly slope: number;
  /** Intercept (y at x=0). */
  readonly intercept: number;
  /** Coefficient of determination r². */
  readonly rSquared: number;
  /** Standard error of the slope. */
  readonly stdErrorSlope: number;
  /** p-value for the slope being non-zero (two-tailed). NaN if undefined. */
  readonly pValue: number;
  /** Number of observations. */
  readonly n: number;
}

/** A point in a trend series. */
export interface TrendPoint {
  readonly x: number;
  readonly y: number;
}

/** Trend analysis for a series of accuracy values over time. */
export interface TrendAnalysis {
  /** Moving averages (window = 3 sessions). */
  readonly movingAverage: TrendPoint[];
  /** Linear regression line endpoints for the raw series. */
  readonly regression: RegressionResult;
  /** Whether the regression slope is statistically significant (p < 0.05). */
  readonly significantTrend: boolean;
  /** Direction of the trend. */
  readonly direction: 'improving' | 'declining' | 'flat';
}

/** Flags for regression-to-mean and anomalies. */
export interface RegressionToMeanFlag {
  /** Whether the session was flagged. */
  readonly flagged: boolean;
  /** Human-readable reason. */
  readonly reason: string;
}

/** A point on a fatigue curve (round number vs accuracy). */
export interface FatiguePoint {
  /** Round number within a session. */
  readonly x: number;
  /** Accuracy (correct / total) for this round number. */
  readonly y: number;
}

/** Full analytics result for a session. */
export interface SessionAnalytics {
  /** The session this analytics covers. */
  readonly session: Session;
  /** Session-level accuracy summary. */
  readonly accuracy: SessionAccuracy;
  /** Chance comparison for the session. */
  readonly chanceComparison: ChanceComparison;
  /** Regression-to-mean flag. */
  readonly regressionToMean: RegressionToMeanFlag;
  /** Reaction-time distribution (if enough data). */
  readonly reactionTimeDistribution: ReactionTimeDistribution | null;
  /** Confusion matrix (if enough data). */
  readonly confusion: ConfusionMatrixData | null;
  /** Fatigue curve (round number vs accuracy). */
  readonly fatigue: FatiguePoint[];
}

/** Full analytics result for a profile across all sessions. */
export interface ProfileAnalytics {
  /** Lifetime accuracy summary. */
  readonly lifetime: SessionAccuracy;
  /** Per-exercise chance comparisons. */
  readonly chanceComparisons: Record<string, ChanceComparison>;
  /** Trend over all sessions. */
  readonly trend: TrendAnalysis;
  /** Session-to-session accuracy variance. */
  readonly sessionVariance: number;
  /** Current streak length (consecutive sessions above chance). */
  readonly currentStreak: number;
  /** Record (longest) streak. */
  readonly recordStreak: number;
}

/** Confusion matrix entry for per-color/per-shape analysis. */
export interface ConfusionMatrixData {
  /** Actual target labels (row axis). */
  readonly labels: string[];
  /** Matrix: matrix[actual][predicted] = count. */
  readonly matrix: number[][];
}

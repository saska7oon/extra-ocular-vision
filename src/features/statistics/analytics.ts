/**
 * Pure analytics engine for the Statistics Dashboard.
 *
 * Every function here is framework-agnostic (no React, no DOM, no IndexedDB)
 * so it can run directly in tests and inside a Web Worker. All statistical
 * methods are documented per-function.
 */

import type { ExerciseRound, Session } from '../../types';
import type {
  SessionAccuracy,
  ChanceComparison,
  ReactionTimeDistribution,
  CorrelationResult,
  RegressionResult,
  TrendPoint,
  TrendAnalysis,
  RegressionToMeanFlag,
  SessionAnalytics,
  ProfileAnalytics,
  ConfusionMatrixData,
} from './types';

/* =======================================================================
 * Constants
 * ===================================================================== */

/** Exercise types that are forced-choice (have a known chance baseline). */
export const FORCED_CHOICE_EXERCISES = new Set([
  'contrast',
  'color',
  'shape',
  'complex-target',
  'text-reading',
]);

/** Exercise types that are free-response (no forced choice). */
export const FREE_RESPONSE_EXERCISES = new Set(['free-response', 'environmental-mapping'] as const);

/** Number of choices per forced-choice exercise (for chance baseline). */
export const EXERCISE_CHOICES: Record<string, number> = {
  contrast: 2,
  color: 4,
  shape: 4,
  symbol: 10,
  'complex-target': 16,
  'text-reading': 26,
};

/** Moving-average window size (in sessions). */
export const MOVING_AVERAGE_WINDOW = 3;

/** Significance threshold for trend/regression tests. */
export const P_VALUE_THRESHOLD = 0.05;

/* =======================================================================
 * Math helpers
 * ===================================================================== */

/**
 * Log-factorial via Stirling's approximation for large n, exact for small.
 * Uses a cache for performance.
 */
const _lfactCache = new Map<number, number>();
function logFactorial(n: number): number {
  if (_lfactCache.has(n)) return _lfactCache.get(n)!;
  let result: number;
  if (n <= 1) {
    result = 0;
  } else if (n <= 170) {
    // Exact product (log sum)
    let s = 0;
    for (let i = 2; i <= n; i++) s += Math.log(i);
    result = s;
  } else {
    // Stirling's approximation for large n
    result =
      n * Math.log(n) -
      n +
      0.5 * Math.log(2 * Math.PI * n) +
      1 / (12 * n) -
      1 / (360 * n ** 3);
  }
  _lfactCache.set(n, result);
  return result;
}

/**
 * Regularized incomplete beta function I_x(a, b).
 * Uses continued fraction expansion (Lentz's algorithm).
 */
function regularizedIncompleteBeta(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const lbeta = logGamma(a) + logGamma(b) - logGamma(a + b);
  const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lbeta);
  if (x < (a + 1) / (a + b + 2)) {
    return (front * betaCF(a, b, x)) / a;
  }
  return 1 - (front * betaCF(b, a, 1 - x)) / b;
}

/** Log of the Gamma function via Lanczos approximation. */
function logGamma(x: number): number {
  const g = 7;
  const c = [
    0.99999999999980993, 27.350136561752, -30.6346565820528,
    15.6644473924787, -3.42266972787138, 0.238766366336439,
    -0.00581941667058742,
  ];
  if (x < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  }
  x -= 1;
  let a = c[0]!;
  const t = x + g + 0.5;
  for (let i = 1; i < c.length; i++) a += c[i]! / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

/** Continued fraction for the incomplete beta function. */
function betaCF(a: number, b: number, x: number): number {
  const maxIter = 200;
  const epsilon = 1e-15;
  let d = 1 - (a + b) * x / (a + 1);
  if (Math.abs(d) < 1e-30) d = 1e-30;
  d = 1 / d;
  let result = d;
  for (let m = 1; m <= maxIter; m++) {
    const m2 = 2 * m;
    const aa = (m * (b - m) * x) / ((a + m2 - 1) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    let c = 1 + aa / (d === 0 ? 1e-30 : d);
    // Actually let's do the standard Lentz approach properly
    d = 1 + aa / (d === 0 ? 1e-30 : d);
    if (Math.abs(d) < 1e-30) d = 1e-30;
    result *= d;
    const ab = -(a + m) * (a + b + m) * x / ((a + m2) * (a + m2 + 1));
    d = 1 + ab * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + ab / (d === 0 ? 1e-30 : d);
    d = 1 + ab / d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    const delta = d * c;
    result *= delta;
    if (Math.abs(delta - 1) < epsilon) break;
  }
  return result;
}

/**
 * Two-tailed binomial test p-value.
 * Tests H0: the true success rate equals `chanceRate`.
 * Returns the probability of observing a result at least as extreme as `correct`.
 */
export function binomialPValue(correct: number, total: number, chanceRate: number): number {
  if (total <= 0) return NaN;
  if (chanceRate <= 0 || chanceRate >= 1) return correct === total ? 1 : 0;
  const k = correct;
  const n = total;
  const p = chanceRate;
  // Two-tailed: sum probabilities <= P(k) under H0
  // Compute the probability mass at k
  const logBinomCoeff = logFactorial(n) - logFactorial(k) - logFactorial(n - k);
  const logPmfAtK = logBinomCoeff + k * Math.log(p) + (n - k) * Math.log(1 - p);
  const pmfAtK = Math.exp(logPmfAtK);
  let leftTail = 0;
  let rightTail = 0;
  for (let i = 0; i <= n; i++) {
    if (i === k) continue;
    const logPmfI = logBinomCoeffAt(i, n, p);
    const pmfI = Math.exp(logPmfI);
    if (pmfI <= pmfAtK + 1e-15) {
      if (i < k) leftTail += pmfI;
      else rightTail += pmfI;
    }
  }
  const pValue = leftTail + rightTail + pmfAtK;
  // Clamp to [0, 1] — floating point can push slightly over
  return Math.min(Math.max(pValue, 0), 1);
}

/** Log of binomial PMF at k for n, p. */
function logBinomCoeffAt(k: number, n: number, p: number): number {
  if (k < 0 || k > n) return -Infinity;
  const logCoeff = logFactorial(n) - logFactorial(k) - logFactorial(n - k);
  return logCoeff + k * Math.log(p) + (n - k) * Math.log(1 - p);
}

/** Clamp a number to [0, 1]. */
function clamp01(x: number): number {
  return Math.min(Math.max(x, 0), 1);
}

/**
 * Wilson score confidence interval for a binomial proportion.
 * Returns [lower, upper] bounds.
 */
export function wilsonCI(correct: number, total: number, z = 1.96): [number, number] {
  if (total <= 0) return [0, 0];
  const p = correct / total;
  const n = total;
  const denom = 1 + z * z / n;
  const center = (p + (z * z) / (2 * n)) / denom;
  const margin =
    (z * Math.sqrt((p * (1 - p) + z * z / (4 * n)) / n)) / denom;
  return [clamp01(center - margin), clamp01(center + margin)];
}

/**
 * Normal CDF Φ(x) using the error function approximation (Abramowitz & Stegun).
 */
function normalCDF(x: number): number {
  return 0.5 * (1 + erf(x / Math.SQRT2));
}

/**
 * Error function approximation (Abramowitz & Stegun 7.1.26).
 * Maximum error ~1.5e-7.
 */
function erf(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);
  const t = 1.0 / (1.0 + p * x);
  // Horner's method: ((((a5*t + a4)*t + a3)*t + a2)*t + a1)*t
  const y =
    1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t *
    Math.exp(-x * x);
  return sign * y;
}

/* =======================================================================
 * Core analytics functions
 * ===================================================================== */

/**
 * Compute session-level accuracy summary.
 * Filters to only committed rounds (those with a committed answer).
 */
export function computeSessionAccuracy(session: Session): SessionAccuracy {
  const committed = session.rounds.filter((r) => r.committedAt !== undefined);
  const total = committed.length;
  const correct = committed.filter((r) => r.correct === true).length;
  const ratio = total > 0 ? correct / total : 0;

  // Determine typical choices per round (for chance baseline)
  let totalChoices = 0;
  let choiceCount = 0;
  for (const r of committed) {
    const n = EXERCISE_CHOICES[r.exerciseType as string];
    if (n !== undefined) {
      totalChoices += n;
      choiceCount++;
    }
  }
  const choicesPerRound = choiceCount > 0 ? totalChoices / choiceCount : 1;
  const chanceRate = choicesPerRound > 0 ? 1 / choicesPerRound : 0.5;

  const pValue = total > 0 ? binomialPValue(correct, total, chanceRate) : NaN;
  const ci = wilsonCI(correct, total);

  return {
    sessionId: session.id,
    startedAt: session.startedAt,
    ratio,
    correct,
    attempted: total,
    pValue,
    ci,
    choicesPerRound,
  };
}

/**
 * Compare observed accuracy against chance level.
 * Status: 'below' (significantly worse), 'above' (significantly better),
 * or 'consistent' (not significantly different from chance).
 */
export function computeChanceComparison(
  correct: number,
  total: number,
  chanceRate: number,
): ChanceComparison {
  if (total <= 0) {
    return { chanceRate, observedRate: 0, status: 'consistent', zScore: NaN };
  }
  const observedRate = correct / total;
  // Z-score against chance
  const se = Math.sqrt((chanceRate * (1 - chanceRate)) / total);
  const zScore = se > 0 ? (observedRate - chanceRate) / se : NaN;
  const p = se > 0 ? 2 * (1 - normalCDF(Math.abs(zScore))) : NaN;
  let status: 'below' | 'above' | 'consistent';
  if (isNaN(p) || p > P_VALUE_THRESHOLD) {
    status = 'consistent';
  } else if (observedRate > chanceRate) {
    status = 'above';
  } else {
    status = 'below';
  }
  return { chanceRate, observedRate, status, zScore };
}

/**
 * Compute a histogram of reaction times from round data.
 * Uses square-root binning.
 */
export function computeReactionTimeDistribution(
  rounds: ExerciseRound[],
): ReactionTimeDistribution | null {
  const rts = rounds
    .map((r) => r.responseTimeMs)
    .filter((rt): rt is number => rt !== undefined && rt > 0);
  if (rts.length === 0) return null;

  const min = Math.min(...rts);
  const max = Math.max(...rts);
  const range = max - min;
  if (range <= 0) {
    // All same value
    const binEdges = [min, max + 1];
    const counts = [rts.length];
    return makeRTD(rts, counts, binEdges);
  }

  const binCount = Math.max(5, Math.ceil(Math.sqrt(rts.length)));
  const binWidth = range / binCount;
  const binEdges: number[] = [];
  const counts: number[] = new Array(binCount).fill(0);
  for (let i = 0; i <= binCount; i++) {
    binEdges.push(min + i * binWidth);
  }
  for (const rt of rts) {
    const idx = Math.min(binCount - 1, Math.floor((rt - min) / binWidth));
    counts[idx]!++;
  }

  return makeRTD(rts, counts, binEdges);
}

function makeRTD(
  rts: number[],
  counts: number[],
  binEdges: number[],
): ReactionTimeDistribution {
  rts.sort((a, b) => a - b);
  const n = rts.length;
  const mean = rts.reduce((a, b) => a + b, 0) / n;
  const median = n % 2 === 1 ? rts[Math.floor(n / 2)]! : (rts[n / 2 - 1]! + rts[n / 2]!) / 2;
  const variance = rts.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);
  return {
    binEdges,
    counts,
    mean,
    median,
    stdDev,
    min: rts[0]!,
    max: rts[n - 1]!,
  };
}

/**
 * Compute Pearson correlation between two numeric series.
 */
export function computeCorrelation(
  xs: number[],
  ys: number[],
): CorrelationResult {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) {
    return { r: NaN, rSquared: NaN, pValue: NaN, n, interpretation: 'none' };
  }
  let sx = 0,
    sy = 0,
    sxx = 0,
    syy = 0,
    sxy = 0;
  for (let i = 0; i < n; i++) {
    const x = xs[i]!;
    const y = ys[i]!;
    sx += x;
    sy += y;
    sxx += x * x;
    sxy += x * y;
    syy += y * y;
  }
  const denom = Math.sqrt((n * sxx - sx * sx) * (n * syy - sy * sy));
  if (denom === 0) {
    return { r: NaN, rSquared: NaN, pValue: NaN, n, interpretation: 'none' };
  }
  const r = (n * sxy - sx * sy) / denom;
  const r2 = r * r;
  // p-value via t-distribution: t = r * sqrt((n-2)/(1-r^2)), df = n-2
  const df = n - 2;
  const tStat = Math.abs(r) * Math.sqrt(df / (1 - r2));
  const pValue = df > 0 ? 2 * (1 - tCDF(tStat, df)) : NaN;

  let interpretation: CorrelationResult['interpretation'];
  const absR = Math.abs(r);
  if (absR >= 0.7) interpretation = r >= 0 ? 'strong-positive' : 'strong-negative';
  else if (absR >= 0.4) interpretation = r >= 0 ? 'moderate-positive' : 'moderate-negative';
  else if (absR >= 0.2) interpretation = r >= 0 ? 'weak-positive' : 'weak-negative';
  else interpretation = 'none';

  return { r, rSquared: r2, pValue, n, interpretation };
}

/**
 * Student's t-distribution CDF (for p-value computation).
 * Uses the regularized incomplete beta function.
 */
function tCDF(t: number, df: number): number {
  const x = df / (df + t * t);
  const ib = regularizedIncompleteBeta(df / 2, 0.5, x);
  return t >= 0 ? 1 - 0.5 * ib : 0.5 * ib;
}

/**
 * Compute linear regression (least squares) on paired data.
 */
export function computeLinearRegression(
  xs: number[],
  ys: number[],
): RegressionResult {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) {
    return { slope: 0, intercept: 0, rSquared: 0, stdErrorSlope: 0, pValue: NaN, n };
  }
  let sx = 0,
    sy = 0,
    sxx = 0,
    sxy = 0;
  for (let i = 0; i < n; i++) {
    const x = xs[i]!;
    const y = ys[i]!;
    sx += x;
    sy += y;
    sxx += x * x;
    sxy += x * y;
  }
  const denom = n * sxx - sx * sx;
  if (denom === 0) {
    return { slope: 0, intercept: sy / n, rSquared: 0, stdErrorSlope: 0, pValue: NaN, n };
  }
  const slope = (n * sxy - sx * sy) / denom;
  const intercept = (sy - slope * sx) / n;

  // R²
  const meanY = sy / n;
  let ssTot = 0,
    ssRes = 0;
  for (let i = 0; i < n; i++) {
    const y = ys[i]!;
    const yhat = slope * xs[i]! + intercept;
    ssTot += (y - meanY) ** 2;
    ssRes += (y - yhat) ** 2;
  }
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  // Standard error of slope
  const df = n - 2;
  const seSlope = df > 0 && ssRes > 0
    ? Math.sqrt((ssRes / df) / (sxx - sx * sx / n))
    : 0;
  const tStat = seSlope > 0 ? Math.abs(slope) / seSlope : 0;
  const pValue = df > 0 ? 2 * (1 - tCDF(tStat, df)) : NaN;

  return { slope, intercept, rSquared: r2, stdErrorSlope: seSlope, pValue, n };
}

/**
 * Compute moving average (simple) over a window.
 */
export function movingAverage(values: number[], window = MOVING_AVERAGE_WINDOW): TrendPoint[] {
  const result: TrendPoint[] = [];
  for (let i = 0; i < values.length; i++) {
    const half = Math.floor(window / 2);
    const start = Math.max(0, i - half);
    const end = Math.min(values.length, i + half + 1);
    const slice = values.slice(start, end);
    const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
    result.push({ x: i, y: avg });
  }
  return result;
}

/**
 * Full trend analysis: moving average + regression + direction.
 */
export function computeTrendAnalysis(accuracySeries: number[]): TrendAnalysis {
  const ma = movingAverage(accuracySeries);
  const xs = accuracySeries.map((_, i) => i);
  const regression = computeLinearRegression(xs, accuracySeries);
  const direction = regression.slope > 0.01
    ? 'improving'
    : regression.slope < -0.01
      ? 'declining'
      : 'flat';
  const significantTrend = !isNaN(regression.pValue) && regression.pValue < P_VALUE_THRESHOLD;
  return { movingAverage: ma, regression, significantTrend, direction };
}

/**
 * Session-to-session variance of accuracy.
 */
export function computeSessionVariance(accuracySeries: number[]): number {
  if (accuracySeries.length < 2) return 0;
  const mean = accuracySeries.reduce((a, b) => a + b, 0) / accuracySeries.length;
  const variance = accuracySeries.reduce((s, v) => s + (v - mean) ** 2, 0) / accuracySeries.length;
  return variance;
}

/**
 * Flag regression-to-mean: a session that follows an unusually extreme one
 * and returns closer to the long-run mean.
 */
export function computeRegressionToMean(
  sessionAccuracy: number,
  previousAccuracy: number | null,
  lifetimeMean: number,
  lifetimeStd: number,
): RegressionToMeanFlag {
  if (previousAccuracy === null || lifetimeStd <= 0) {
    return { flagged: false, reason: '' };
  }
  // Is the previous session an outlier (beyond 2 sigma)?
  const prevZ = Math.abs(previousAccuracy - lifetimeMean) / lifetimeStd;
  if (prevZ < 2) {
    return { flagged: false, reason: '' };
  }
  // Is the current session closer to the mean than the previous?
  const prevDist = Math.abs(previousAccuracy - lifetimeMean);
  const currDist = Math.abs(sessionAccuracy - lifetimeMean);
  const regressing = currDist < prevDist;
  if (regressing) {
    return {
      flagged: true,
      reason: `Previous session was an outlier (${prevZ.toFixed(1)}σ from mean); this session regressed toward the mean.`,
    };
  }
  return { flagged: false, reason: '' };
}

/**
 * Streak computation: count consecutive sessions where accuracy
 * is above chance (binomial p < threshold).
 */
export function computeStreaks(
  sessions: Session[],
): { currentStreak: number; recordStreak: number } {
  // We need per-session accuracy + chance comparison
  const sessionResults = sessions
    .slice()
    .sort((a, b) => a.startedAt - b.startedAt)
    .map((s) => computeSessionAccuracy(s));

  let currentStreak = 0;
  let recordStreak = 0;
  let running = 0;

  for (const acc of sessionResults) {
    const isAboveChance = !isNaN(acc.pValue) && acc.pValue < P_VALUE_THRESHOLD && acc.ratio > 0.5;
    if (isAboveChance) {
      running++;
      if (running > recordStreak) recordStreak = running;
    } else {
      running = 0;
    }
  }
  // Current streak = consecutive above-chance from the most recent session backwards
  for (let i = sessionResults.length - 1; i >= 0; i--) {
    const acc = sessionResults[i]!;
    const isAboveChance = !isNaN(acc.pValue) && acc.pValue < P_VALUE_THRESHOLD && acc.ratio > 0.5;
    if (isAboveChance) {
      currentStreak++;
    } else {
      break;
    }
  }
  return { currentStreak, recordStreak };
}

/**
 * Compute confusion matrix for a set of rounds.
 * matrix[actual][predicted] = count.
 */
export function computeConfusionMatrix(
  rounds: ExerciseRound[],
): ConfusionMatrixData | null {
  const valid = rounds.filter(
    (r) => r.target !== undefined && r.committedAnswer !== undefined && r.correct !== undefined,
  );
  if (valid.length === 0) return null;

  const labels = Array.from(
    new Set(valid.map((r) => r.target!).concat(valid.map((r) => r.committedAnswer!))),
  ).sort();

  const labelIndex = new Map(labels.map((l, i) => [l, i]));
  const matrix: number[][] = labels.map(() => new Array(labels.length).fill(0));

  for (const r of valid) {
    const actualIdx = labelIndex.get(r.target!);
    const predictedIdx = labelIndex.get(r.committedAnswer!);
    if (actualIdx !== undefined && predictedIdx !== undefined) {
      matrix[actualIdx]![predictedIdx]!++;
    }
  }

  return { labels, matrix };
}

/**
 * Compute the fatigue curve: accuracy at each position within a session
 * (round 1, round 2, ..., round N). Returns array of {x: roundNumber, y: accuracy}.
 */
export function computeFatigueCurve(rounds: ExerciseRound[]): TrendPoint[] {
  const byRound = new Map<number, { correct: number; total: number }>();
  for (const r of rounds) {
    if (r.roundNumber === undefined || r.correct === undefined) continue;
    const existing = byRound.get(r.roundNumber) ?? { correct: 0, total: 0 };
    existing.correct += r.correct ? 1 : 0;
    existing.total += 1;
    byRound.set(r.roundNumber, existing);
  }
  const sorted = Array.from(byRound.entries()).sort(([a], [b]) => a - b);
  return sorted.map(([roundNum, stats]) => ({
    x: roundNum,
    y: stats.total > 0 ? stats.correct / stats.total : 0,
  }));
}

/* =======================================================================
 * High-level aggregations
 * ===================================================================== */

/**
 * Compute full analytics for a single session.
 */
export function computeSessionAnalytics(session: Session): SessionAnalytics {
  const accuracy = computeSessionAccuracy(session);
  const chance = computeChanceComparison(
    accuracy.correct,
    accuracy.attempted,
    1 / accuracy.choicesPerRound,
  );
  const regressionToMean = computeRegressionToMean(
    accuracy.ratio,
    null, // single session has no previous
    accuracy.ratio,
    0,
  );
  const rtd = computeReactionTimeDistribution(session.rounds);
  const confusion = computeConfusionMatrix(session.rounds);
  const fatigue = computeFatigueCurve(session.rounds);

  return {
    session,
    accuracy,
    chanceComparison: chance,
    regressionToMean,
    reactionTimeDistribution: rtd,
    confusion,
    fatigue,
  };
}

/**
 * Compute full profile analytics across all sessions.
 * Sessions should be sorted chronologically (ascending).
 */
export function computeProfileAnalytics(sessions: Session[]): ProfileAnalytics {
  // Lifetime aggregation
  let totalCorrect = 0;
  let totalAttempted = 0;
  let totalChoices = 0;
  let choiceCount = 0;

  const accuracySeries: number[] = [];
  const startedAtSeries: number[] = [];

  for (const session of sessions) {
    const acc = computeSessionAccuracy(session);
    totalCorrect += acc.correct;
    totalAttempted += acc.attempted;
    totalChoices += acc.choicesPerRound * acc.attempted;
    if (acc.choicesPerRound > 0) {
      choiceCount += acc.attempted;
    }
    accuracySeries.push(acc.ratio);
    startedAtSeries.push(session.startedAt);
  }

  const lifetimeChoicesPerRound = choiceCount > 0 ? totalChoices / choiceCount : 1;
  const lifetimeChanceRate = 1 / lifetimeChoicesPerRound;
  const lifetimeAccuracy: SessionAccuracy = {
    sessionId: 'lifetime',
    startedAt: startedAtSeries[0] ?? 0,
    ratio: totalAttempted > 0 ? totalCorrect / totalAttempted : 0,
    correct: totalCorrect,
    attempted: totalAttempted,
    pValue:
      totalAttempted > 0
        ? binomialPValue(totalCorrect, totalAttempted, lifetimeChanceRate)
        : NaN,
    ci: wilsonCI(totalCorrect, totalAttempted),
    choicesPerRound: lifetimeChoicesPerRound,
  };

  // Chance comparisons per exercise type
  const perExercise: Record<string, { correct: number; total: number; choices: number }> = {};
  for (const session of sessions) {
    for (const round of session.rounds) {
      if (round.committedAt === undefined || round.correct === undefined) continue;
      const n = EXERCISE_CHOICES[round.exerciseType as string];
      if (n === undefined) continue;
      const key = round.exerciseType;
      const existing = perExercise[key] ?? { correct: 0, total: 0, choices: 0 };
      existing.correct += round.correct ? 1 : 0;
      existing.total += 1;
      existing.choices += n;
      perExercise[key] = existing;
    }
  }

  const chanceComparisons: Record<string, ChanceComparison> = {};
  for (const [exType, stats] of Object.entries(perExercise)) {
    const avgChoices = stats.choices / stats.total;
    chanceComparisons[exType] = computeChanceComparison(
      stats.correct,
      stats.total,
      1 / avgChoices,
    );
  }

  // Trend
  const trend = computeTrendAnalysis(accuracySeries);
  const sessionVariance = computeSessionVariance(accuracySeries);
  const { currentStreak, recordStreak } = computeStreaks(sessions);

  return {
    lifetime: lifetimeAccuracy,
    chanceComparisons,
    trend,
    sessionVariance,
    currentStreak,
    recordStreak,
  };
}

/**
 * Compute chance level for a given exercise type.
 * Returns the theoretical chance rate (1 / nChoices).
 */
export function chanceRateForExercise(exerciseType: string): number {
  const n = EXERCISE_CHOICES[exerciseType];
  return n !== undefined ? 1 / n : 0.5;
}

/**
 * Format an accuracy ratio as a percentage string.
 */
export function formatAccuracy(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}

/**
 * Format a p-value with significance indicator.
 */
export function formatPValue(p: number): string {
  if (isNaN(p)) return '—';
  if (p < 0.001) return 'p < 0.001';
  return `p = ${p.toFixed(4)}`;
}

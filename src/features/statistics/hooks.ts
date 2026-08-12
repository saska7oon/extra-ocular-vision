/**
 * React hooks for the Statistics Dashboard feature.
 *
 * These hooks wrap the analytics engine (pure, framework-agnostic) with
 * React lifecycle. The heavy computation in `analytics.ts` is pure and
 * can optionally be offloaded to a Web Worker (see analytics.worker.ts),
 * but these hooks compute synchronously for simplicity and testability.
 *
 * Pattern: every hook returns { data, isLoading, error, refresh },
 * matching the existing hooks/index.ts conventions.
 */

import { useCallback, useEffect, useState } from 'react';
import type { Session, ExerciseRound } from '../../types';
import {
  computeSessionAccuracy,
  computeReactionTimeDistribution,
  computeConfusionMatrix,
  computeFatigueCurve,
  computeTrendAnalysis,
  computeChanceComparison,
  computeProfileAnalytics,
  formatAccuracy,
} from './analytics';
import type {
  SessionAnalytics,
  ProfileAnalytics,
  ReactionTimeDistribution,
  ConfusionMatrixData,
  TrendAnalysis,
  FatiguePoint,
  ChanceComparison,
} from './types';

/** Hook result shape — mirrors existing hooks/index.ts conventions. */
export interface StatisticsResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

/* =======================================================================
 * Profile-level analytics (lifetime across sessions)
 * ===================================================================== */

/**
 * Compute full profile analytics across all sessions.
 */
export function useProfileAnalytics(
  sessions: Session[],
): StatisticsResult<ProfileAnalytics> {
  const [data, setData] = useState<ProfileAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const compute = useCallback(async () => {
    if (sessions.length === 0) {
      const empty = computeProfileAnalytics([]);
      setData(empty);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = computeProfileAnalytics(sessions);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [sessions]);

  useEffect(() => {
    void compute();
  }, [compute]);

  return { data, isLoading, error, refresh: compute };
}

/* =======================================================================
 * Session-level analytics
 * ===================================================================== */

/**
 * Compute analytics for a single session.
 */
export function useSessionAnalytics(
  session: Session | null,
): StatisticsResult<SessionAnalytics> {
  const [data, setData] = useState<SessionAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const compute = useCallback(async () => {
    if (!session) {
      setData(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = computeSessionAnalyticsInline(session);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    void compute();
  }, [compute]);

  return { data, isLoading, error, refresh: compute };
}

/** Inline session analytics computation. */
function computeSessionAnalyticsInline(session: Session): SessionAnalytics {
  const accuracy = computeSessionAccuracy(session);
  const chanceComparison = computeChanceComparison(
    accuracy.correct,
    accuracy.attempted,
    accuracy.choicesPerRound > 0 ? 1 / accuracy.choicesPerRound : 0.5,
  );
  const rt = computeReactionTimeDistribution(session.rounds);
  const confusion = computeConfusionMatrix(session.rounds);
  const fatigue = computeFatigueCurve(session.rounds);
  return {
    session,
    accuracy,
    chanceComparison,
    regressionToMean: { flagged: false, reason: '' },
    reactionTimeDistribution: rt,
    confusion,
    fatigue,
  };
}

/* =======================================================================
 * Trend analysis (accuracy over time)
 * ===================================================================== */

/**
 * Compute trend analysis for a series of accuracy values across sessions.
 */
export function useTrendAnalysis(
  sessions: Session[],
): StatisticsResult<TrendAnalysis> {
  const [data, setData] = useState<TrendAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const compute = useCallback(async () => {
    if (sessions.length === 0) {
      setData(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const ratios = sessions.map((s) => computeSessionAccuracy(s).ratio);
      const trend = computeTrendAnalysis(ratios);
      setData(trend);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [sessions]);

  useEffect(() => {
    void compute();
  }, [compute]);

  return { data, isLoading, error, refresh: compute };
}

/* =======================================================================
 * Reaction time distribution
 * ===================================================================== */

/**
 * Compute reaction time distribution for a session.
 */
export function useReactionTimeDistribution(
  rounds: ExerciseRound[],
): StatisticsResult<ReactionTimeDistribution | null> {
  const [data, setData] = useState<ReactionTimeDistribution | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const compute = useCallback(async () => {
    if (rounds.length === 0) {
      setData(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const dist = computeReactionTimeDistribution(rounds);
      setData(dist);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [rounds]);

  useEffect(() => {
    void compute();
  }, [compute]);

  return { data, isLoading, error, refresh: compute };
}

/* =======================================================================
 * Confusion matrix
 * ===================================================================== */

/**
 * Compute confusion matrix for a session's rounds.
 */
export function useConfusionMatrix(
  rounds: ExerciseRound[],
): StatisticsResult<ConfusionMatrixData | null> {
  const [data, setData] = useState<ConfusionMatrixData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const compute = useCallback(async () => {
    if (rounds.length === 0) {
      setData(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const cm = computeConfusionMatrix(rounds);
      setData(cm);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [rounds]);

  useEffect(() => {
    void compute();
  }, [compute]);

  return { data, isLoading, error, refresh: compute };
}

/* =======================================================================
 * Fatigue curve
 * ===================================================================== */

/**
 * Compute fatigue curve for a session's rounds.
 */
export function useFatigueCurve(
  rounds: ExerciseRound[],
): StatisticsResult<FatiguePoint[]> {
  const [data, setData] = useState<FatiguePoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const compute = useCallback(async () => {
    if (rounds.length === 0) {
      setData([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const curve = computeFatigueCurve(rounds);
      setData(curve);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [rounds]);

  useEffect(() => {
    void compute();
  }, [compute]);

  return { data, isLoading, error, refresh: compute };
}

/* =======================================================================
 * Chance comparison per exercise
 * ===================================================================== */

/**
 * Compute chance comparison summary for all exercises in sessions.
 */
export function useChanceComparisons(
  sessions: Session[],
): StatisticsResult<Record<string, ChanceComparison>> {
  const [data, setData] = useState<Record<string, ChanceComparison>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const compute = useCallback(async () => {
    if (sessions.length === 0) {
      setData({});
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const allRounds = sessions.flatMap((s) => s.rounds);
      const committed = allRounds.filter((r) => r.committedAt !== undefined);

      // Group by exercise type
      const byExercise = new Map<string, ExerciseRound[]>();
      for (const r of committed) {
        const key = r.exerciseType;
        if (!byExercise.has(key)) byExercise.set(key, []);
        byExercise.get(key)!.push(r);
      }

      const result: Record<string, ChanceComparison> = {};
      for (const [key, rounds] of byExercise) {
        const accuracy = computeSessionAccuracy({
          ...sessions[0]!,
          rounds,
        });
        result[key] = computeChanceComparison(
          accuracy.correct,
          accuracy.attempted,
          accuracy.choicesPerRound > 0 ? 1 / accuracy.choicesPerRound : 0.5,
        );
      }
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [sessions]);

  useEffect(() => {
    void compute();
  }, [compute]);

  return { data, isLoading, error, refresh: compute };
}

/* =======================================================================
 * Re-export formatters for convenience
 * ===================================================================== */

export { formatAccuracy };

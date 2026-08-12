/**
 * AccuracyDashboard — lifetime accuracy, per-exercise breakdown, and streaks.
 *
 * Shows:
 *  - Lifetime accuracy with Wilson CI and p-value vs chance
 *  - Per-exercise chance comparisons (BarChart)
 *  - Current streak and record streak
 *  - Session-to-session variance
 *
 * Uses the useProfileAnalytics hook (pure analytics, no live DB queries here).
 */

import { type ReactElement } from 'react';
import { Card } from '../ui';
import { LineChart, BarChart } from './charts';
import { useProfileAnalytics, formatAccuracy } from '../features/statistics/hooks';
import { useRecentSessions } from '../hooks';
import type { Session } from '../types';
import { clsx } from '../utils/clsx';
import type { ChanceComparison, ProfileAnalytics } from '../features/statistics/types';

interface AccuracyDashboardProps {
  profileId: string;
}

function chanceStatusBadge(status: ChanceComparison['status']): ReactElement {
  const labels: Record<ChanceComparison['status'], string> = {
    above: 'Above Chance',
    below: 'Below Chance',
    consistent: 'At Chance',
  };
  const colors: Record<ChanceComparison['status'], string> = {
    above: 'var(--color-success)',
    below: 'var(--color-error)',
    consistent: 'var(--color-warning)',
  };
  return (
    <span
      className="chance-badge"
      style={{ color: colors[status], border: `1px solid ${colors[status]}` }}
    >
      {labels[status]}
    </span>
  );
}

export function AccuracyDashboard({ profileId }: AccuracyDashboardProps): ReactElement {
  const { sessions } = useRecentSessions(200);
  const profileSessions = sessions.filter((s: Session) => s.profileId === profileId);
  const { data: analytics, isLoading, error } = useProfileAnalytics(profileSessions);

  if (isLoading) {
    return (
      <Card>
        <p className="text-sm text-muted">Loading analytics…</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <p className="text-sm text-error">Error: {error.message}</p>
      </Card>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <p className="text-sm text-muted">No session data yet.</p>
      </Card>
    );
  }

  const { lifetime, chanceComparisons, trend, sessionVariance, currentStreak, recordStreak } =
    analytics as ProfileAnalytics;

  // Per-exercise bar chart data
  const barData = Object.entries(chanceComparisons).map(([exercise, cc]) => ({
    label: exercise,
    value: cc.observedRate,
    description: `${exercise}: ${formatAccuracy(cc.observedRate)} vs chance ${formatAccuracy(cc.chanceRate)} (${cc.status})`,
  }));

  // Per-session accuracy points for the trend line
  const trendData = trend.movingAverage.map((p) => ({
    name: 'Moving Average',
    data: [{ x: p.x, y: p.y }],
  }));

  return (
    <div className={clsx('accuracy-dashboard')}>
      <div className="accuracy-dashboard__header">
        <h2>Lifetime Accuracy</h2>
      </div>

      <div className="accuracy-dashboard__summary grid gap-4 md:grid-cols-4">
        <Card>
          <h3>Overall</h3>
          <p className="accuracy-value">{formatAccuracy(lifetime.ratio)}</p>
          <p className="text-sm text-muted">
            {lifetime.correct} / {lifetime.attempted} correct
          </p>
          <p className="text-xs text-muted mt-1">
            95% CI: {formatAccuracy(lifetime.ci[0])} – {formatAccuracy(lifetime.ci[1])}
          </p>
        </Card>

        <Card>
          <h3>Performance vs Chance</h3>
          <p className="text-sm">
            {isNaN(lifetime.pValue)
              ? 'No data'
              : lifetime.pValue < 0.001
                ? 'Significantly above chance (p &lt; 0.001)'
                : `p = ${lifetime.pValue.toFixed(4)}`}
          </p>
        </Card>

        <Card>
          <h3>Streak</h3>
          <p className="accuracy-value">
            {currentStreak} <span className="text-sm">current</span>
          </p>
          <p className="text-xs text-muted">Record: {recordStreak}</p>
        </Card>

        <Card>
          <h3>Session Variance</h3>
          <p className="accuracy-value">{sessionVariance.toFixed(4)}</p>
          <p className="text-xs text-muted">Lower = more consistent</p>
        </Card>
      </div>

      {/* Per-exercise breakdown */}
      {barData.length > 0 && (
        <Card>
          <h3>Accuracy by Exercise</h3>
          <BarChart
            title="Per-exercise accuracy"
            description="Accuracy rate by exercise type compared to chance"
            data={barData}
            yAxisLabel="Accuracy"
          />
          <div className="exercise-comparison-list">
            {Object.entries(chanceComparisons).map(([exercise, cc]) => (
              <div key={exercise} className="exercise-row flex items-center gap-2">
                <span className="exercise-name">{exercise}</span>
                <span className="exercise-accuracy">{formatAccuracy(cc.observedRate)}</span>
                {chanceStatusBadge(cc.status)}
                <span className="exercise-pvalue text-xs text-muted">z = {cc.zScore.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Trend chart */}
      {trend.regression.n >= 2 && (
        <Card>
          <h3>Trend Over Time</h3>
          <p className="text-xs text-muted mb-2">
            Direction: <strong>{trend.direction}</strong>{' '}
            • {trend.significantTrend ? 'Statistically significant' : 'Not significant'}
          </p>
          <LineChart
            title="Session accuracy trend"
            description="Accuracy over sessions with 3-session moving average"
            series={trendData}
            xLabel="Session"
            yLabel="Accuracy"
          />
        </Card>
      )}
    </div>
  );
}

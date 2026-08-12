/**
 * SensoryProfile — per-sensory-modality performance overview.
 *
 * Groups sessions by exercise type (the sensory modality being tested:
 * contrast, color, motion, etc.) and shows accuracy, p-value, and
 * confidence for each. This lets the trader/user identify which sensory
 * channels are strongest/weakest.
 *
 * Uses useChanceComparisons and useProfileAnalytics hooks.
 */

import { type ReactElement } from 'react';
import { Card } from '../ui';
import { BarChart } from './charts';
import { useChanceComparisons, useProfileAnalytics, formatAccuracy } from '../features/statistics/hooks';
import { useRecentSessions } from '../hooks';
import type { Session } from '../types';
import type { ChanceComparison } from '../features/statistics/types';
import { EXERCISE_CHOICES } from '../features/statistics/analytics';

interface SensoryProfileProps {
  profileId: string;
}

/** Human-readable labels for exercise types. */
const EXERCISE_LABELS: Record<string, string> = {
  contrast: 'Contrast Sensitivity',
  color: 'Color Discrimination',
  shape: 'Shape Recognition',
  symbol: 'Symbol Identification',
  'complex-target': 'Complex Target Detection',
  'text-reading': 'Text Reading',
  reaction: 'Reaction Time',
  'peripheral-vision': 'Peripheral Vision',
  motion: 'Motion Detection',
  depth: 'Depth Perception',
};

function getStatusColor(status: ChanceComparison['status']): string {
  switch (status) {
    case 'above':
      return 'var(--color-success)';
    case 'below':
      return 'var(--color-error)';
    default:
      return 'var(--color-warning)';
  }
}

export function SensoryProfile({ profileId }: SensoryProfileProps): ReactElement {
  const { sessions } = useRecentSessions(200);
  const profileSessions = sessions.filter((s: Session) => s.profileId === profileId);
  const { data: analytics, isLoading: isLoadingAnalytics, error: analyticsError } = useProfileAnalytics(profileSessions);
  const { data: chanceComparisons, isLoading: isLoadingComparisons } = useChanceComparisons(profileSessions);

  const isLoading = isLoadingAnalytics || isLoadingComparisons;
  const error = analyticsError;

  if (isLoading || !analytics) {
    return (
      <Card>
        <p className="text-sm text-muted">Loading sensory profile…</p>
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

  const { lifetime, trend, sessionVariance } = analytics;
  const comparisons = chanceComparisons ?? {};

  // Build sensory-modality bars from chance comparisons
  const sensoryBars = Object.entries(comparisons).map(([key, cc]) => {
    const label = EXERCISE_LABELS[key] ?? key;
    const nChoices = EXERCISE_CHOICES[key];
    const chanceStr = nChoices ? `${(1 / nChoices * 100).toFixed(0)}%` : '—';
    return {
      label: label.split(' ')[0]!,
      value: cc.observedRate,
      description: `${label}: ${formatAccuracy(cc.observedRate)} (chance: ${chanceStr}) — ${cc.status}`,
      color: getStatusColor(cc.status),
    };
  });

  // Sort: below chance first, then consistent, then above chance
  const statusOrder: Record<string, number> = { below: 0, consistent: 1, above: 2 };
  sensoryBars.sort((a, b) => {
    // Re-derive status from the comparisons for sorting
    const keyA = Object.keys(comparisons).find((k) => (EXERCISE_LABELS[k] ?? k).split(' ')[0] === a.label) ?? '';
    const keyB = Object.keys(comparisons).find((k) => (EXERCISE_LABELS[k] ?? k).split(' ')[0] === b.label) ?? '';
    const orderA = statusOrder[comparisons[keyA]?.status ?? 'consistent'] ?? 1;
    const orderB = statusOrder[comparisons[keyB]?.status ?? 'consistent'] ?? 1;
    return orderA - orderB;
  });

  return (
    <div className="sensory-profile">
      <div className="sensory-profile__header">
        <h2>Sensory Profile</h2>
        <p className="text-sm text-muted">
          {formatAccuracy(lifetime.ratio)} lifetime • {lifetime.attempted} trials across{' '}
          {Object.keys(comparisons).length} modalities
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <h3>Session Variance</h3>
          <p className="accuracy-value">{sessionVariance.toFixed(4)}</p>
          <p className="text-xs text-muted">{sessionVariance < 0.01 ? 'Very consistent' : sessionVariance < 0.05 ? 'Moderate consistency' : 'High variability'}</p>
        </Card>
        <Card>
          <h3>Trend Direction</h3>
          <p className="accuracy-value">{trend.direction}</p>
          <p className="text-xs text-muted">{trend.significantTrend ? 'Significant' : 'Not significant'}</p>
        </Card>
        <Card>
          <h3>Total Streak</h3>
          <p className="accuracy-value">{analytics.currentStreak}</p>
          <p className="text-xs text-muted">Record: {analytics.recordStreak}</p>
        </Card>
      </div>

      {/* Sensory modality bars */}
      {sensoryBars.length > 0 ? (
        <Card>
          <h3>Accuracy by Sensory Modality</h3>
          <BarChart
            title="Sensory modality accuracy"
            description="Accuracy by exercise type, color-coded by chance comparison status"
            data={sensoryBars}
            yAxisLabel="Accuracy"
          />
        </Card>
      ) : (
        <Card>
          <p className="text-sm text-muted">No exercise data available.</p>
        </Card>
      )}

      {/* Detailed table */}
      <Card>
        <h3>Detailed Breakdown</h3>
        <table className="sensory-table w-full text-sm">
          <thead>
            <tr>
              <th scope="col" className="text-left">Modality</th>
              <th scope="col" className="text-left">Accuracy</th>
              <th scope="col" className="text-left">Chance</th>
              <th scope="col" className="text-left">z-score</th>
              <th scope="col" className="text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(comparisons).map(([key, cc]) => {
              const label = EXERCISE_LABELS[key] ?? key;
              const nChoices = EXERCISE_CHOICES[key];
              const chanceStr = nChoices ? `${(1 / nChoices * 100).toFixed(0)}%` : '—';
              return (
                <tr key={key}>
                  <td>{label}</td>
                  <td>{formatAccuracy(cc.observedRate)}</td>
                  <td>{chanceStr}</td>
                  <td>{cc.zScore.toFixed(2)}</td>
                  <td>
                    <span
                      className="chance-badge"
                      style={{
                        color: getStatusColor(cc.status),
                        border: `1px solid ${getStatusColor(cc.status)}`,
                      }}
                    >
                      {cc.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/**
 * StatisticalAnalysis — detailed statistical views for individual sessions.
 *
 * Shows:
 *  - Confusion matrix (what the user confuses with what)
 *  - Reaction-time distribution histogram
 *  - Fatigue curve (accuracy drop-off across rounds)
 *  - Regression-to-mean flagging
 *
 * Uses useSessionAnalytics hook which wraps the pure analytics engine.
 */

import { type ReactElement } from 'react';
import { Card } from '../ui';
import { Heatmap, BarChart } from './charts';
import { useSessionAnalytics } from '../features/statistics/hooks';
import { formatAccuracy } from '../features/statistics/analytics';
import type { Session } from '../types';
import type { SessionAnalytics, FatiguePoint } from '../features/statistics/types';

interface StatisticalAnalysisProps {
  session: Session;
}

export function StatisticalAnalysis({ session }: StatisticalAnalysisProps): ReactElement {
  const { data: analytics, isLoading, error } = useSessionAnalytics(session);

  if (isLoading) {
    return (
      <Card>
        <p className="text-sm text-muted">Loading analysis…</p>
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
        <p className="text-sm text-muted">No data for this session.</p>
      </Card>
    );
  }

  const { accuracy, confusion, reactionTimeDistribution, fatigue, regressionToMean } =
    analytics as SessionAnalytics;

  const hasConfusion = confusion !== null && confusion.labels.length > 0;
  const hasRT = reactionTimeDistribution !== null;
  const hasFatigue = fatigue.length > 0;

  // RT distribution bar chart data
  const rtBarData = hasRT
    ? reactionTimeDistribution!.binEdges.slice(0, -1).map((edge, i) => {
        const nextEdge = reactionTimeDistribution!.binEdges[i + 1];
        const midLabel = `${Math.round(edge)}–${Math.round(nextEdge!)}ms`;
        return {
          label: midLabel,
          value: reactionTimeDistribution!.counts[i]! / reactionTimeDistribution!.counts.reduce((a, b) => a + b, 0),
          description: `${reactionTimeDistribution!.counts[i]} responses in ${midLabel} range`,
        };
      })
    : [];

  // Fatigue curve data (accuracy per round number)
  const fatigueBarData = fatigue.map((p: FatiguePoint) => ({
    label: `R${p.x}`,
    value: p.y,
    description: `Round ${p.x}: ${formatAccuracy(p.y)}`,
  }));

  return (
    <div className="statistical-analysis">
      <h2>Statistical Analysis</h2>
      <p className="text-sm text-muted mb-4">
        Session accuracy: {formatAccuracy(accuracy.ratio)} ({accuracy.correct}/{accuracy.attempted})
      </p>

      {/* Regression to mean alert */}
      {regressionToMean.flagged && (
        <Card className="border-warning">
          <h3>Anomaly Detected</h3>
          <p className="text-sm text-warning">{regressionToMean.reason}</p>
        </Card>
      )}

      <div className="statistical-analysis__grid grid gap-6 md:grid-cols-2">
        {/* Confusion Matrix */}
        {hasConfusion && confusion && (
          <Card>
            <h3>Response Confusion Matrix</h3>
            <p className="text-xs text-muted mb-2">
              Rows = actual target, Columns = committed answer
            </p>
            <Heatmap
              title="Confusion matrix"
              description="Shows which targets are confused with which answers"
              labels={confusion.labels}
              matrix={confusion.matrix}
            />
          </Card>
        )}

        {/* Reaction Time Distribution */}
        {hasRT && reactionTimeDistribution && (
          <Card>
            <h3>Reaction Time Distribution</h3>
            <p className="text-xs text-muted mb-2">
              Mean: {reactionTimeDistribution.mean.toFixed(0)}ms • SD: {reactionTimeDistribution.stdDev.toFixed(0)}ms • Range: {reactionTimeDistribution.min.toFixed(0)}–{reactionTimeDistribution.max.toFixed(0)}ms
            </p>
            <BarChart
              title="RT distribution"
              description="Histogram of response times"
              data={rtBarData}
              yAxisLabel="Proportion"
            />
          </Card>
        )}

        {/* Fatigue Curve */}
        {hasFatigue && (
          <Card>
            <h3>Fatigue Curve</h3>
            <p className="text-xs text-muted mb-2">
              Accuracy by round number within the session
            </p>
            <BarChart
              title="Fatigue curve"
              description="Accuracy decline across rounds"
              data={fatigueBarData}
              yAxisLabel="Accuracy"
            />
          </Card>
        )}

        {/* Chance Comparison */}
        <Card>
          <h3>Chance Comparison</h3>
          <p className="text-sm">
            <span className="font-medium">Observed:</span> {formatAccuracy(accuracy.ratio)}
          </p>
          <p className="text-sm">
            <span className="font-medium">Chance rate:</span> {formatAccuracy(1 / accuracy.choicesPerRound)}
          </p>
          <p className="text-sm">
            <span className="font-medium">p-value:</span>{' '}
            {isNaN(accuracy.pValue) ? '—' : accuracy.pValue < 0.001 ? 'p < 0.001' : `p = ${accuracy.pValue.toFixed(4)}`}
          </p>
          <p className="text-sm">
            <span className="font-medium">95% CI:</span> {formatAccuracy(accuracy.ci[0])} – {formatAccuracy(accuracy.ci[1])}
          </p>
        </Card>
      </div>
    </div>
  );
}

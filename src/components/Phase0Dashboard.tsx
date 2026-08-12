/**
 * Phase 0 Dashboard — day-by-day progress tracking.
 *
 * Shows the 7-day Phase 0 curriculum as a grid of day columns. Each day is
 * locked until the prior day is completed; completed days show the
 * pre/post state-rating trend. Once all 7 days are done, a Phase 1
 * unlock banner appears.
 *
 * State is sourced from the Phase0Repository (IndexedDB) via the
 * usePhase0Progress hook, with graceful offline fallback.
 */
import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { Card } from '../ui';
import { useDatabase } from '../hooks';
import type {
  Phase0ProgressSummary,
  Phase0SessionRecord,
  Phase0DayView,
} from '../features/phase0/types';
import { Phase0SessionCard } from './Phase0SessionCard';

interface Phase0DashboardProps {
  profileId: string;
  /** Absolute day number (1-based) from app start. */
  absoluteDay: number;
  /** Called when the user wants to start a session for a given day. */
  onStartSession?: (day: number) => void;
  /** Bump to force a reload of progress (e.g. after a session completes). */
  refreshKey?: number;
}

/** Hook: load Phase 0 progress summary + recent sessions for a profile. */
function usePhase0Progress(profileId: string, refreshKey?: number) {
  const repos = useDatabase();
  const [summary, setSummary] = useState<Phase0ProgressSummary | null>(null);
  const [sessions, setSessions] = useState<Phase0SessionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!repos) {
        setError(new Error('Database not available'));
        setIsLoading(false);
        return;
      }
      try {
        const phase0 = repos.phase0;
        const [s, recent] = await Promise.all([
          phase0.getProgressSummary(profileId),
          phase0.getSessions(profileId, 50),
        ]);
        if (cancelled) return;
        setSummary(s);
        setSessions(recent);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [repos, profileId, refreshKey]);

  return { summary, sessions, isLoading, error };
}

/**
 * Build per-day views by combining summary day statuses with the most
 * recent session for each day.
 */
function buildDayViews(
  summary: Phase0ProgressSummary | null,
  sessions: Phase0SessionRecord[],
): Phase0DayView[] {
  if (!summary) return [];
  // Index sessions by absolute day (most recent first due to reverse ordering).
  const latestByDay = new Map<number, Phase0SessionRecord>();
  for (const s of sessions) {
    if (!latestByDay.has(s.absoluteDay)) {
      latestByDay.set(s.absoluteDay, s);
    }
  }
  return summary.days.map((status, idx) => {
    const day = idx + 1;
    const latest = latestByDay.get(day);
    return latest !== undefined
      ? { day, status, latestSession: latest }
      : { day, status };
  });
}

const DAY_LABELS: Record<number, string> = {
  1: 'Day 1',
  2: 'Day 2',
  3: 'Day 3',
  4: 'Day 4',
  5: 'Day 5',
  6: 'Day 6',
  7: 'Day 7',
};

const DAY_OBJECTIVES: Record<number, string> = {
  1: 'Cardiac coherence — 0.1 Hz breathing',
  2: 'Cardiac coherence breathing',
  3: 'Cardiac coherence breathing',
  4: 'Alpha binaural beats (10 Hz)',
  5: 'Theta binaural beats (6 Hz)',
  6: 'Combined: breathing → binaural',
  7: 'Combined: breathing → binaural → visualization',
};

/** Render a simple state-rating sparkline for a completed day. */
function StateTrendSpark({
  session,
}: {
  session: Phase0SessionRecord;
}): ReactElement {
  const pre = session.preStateRating;
  const post = session.postStateRating;
  const dots = Array.from({ length: 10 }, (_, i) => i + 1);
  return (
    <div className="state-trend" aria-label="State rating trend">
      {pre !== undefined && (
        <span className="trend-dot" aria-label={`Before: ${pre}/10`}>
          ●
        </span>
      )}
      {post !== undefined && (
        <span className="trend-dot" aria-label={`After: ${post}/10`}>
          ●
        </span>
      )}
      <span className="trend-scale" aria-hidden="true">
        {dots.map((n) => (
          <span key={n} className="trend-tick" />
        ))}
      </span>
    </div>
  );
}

/**
 * Phase 0 Dashboard.
 *
 * Renders the 7-day day grid, session cards for the current day, and a
 * Phase 1 unlock banner when all days are complete.
 */
export function Phase0Dashboard({
  profileId,
  absoluteDay,
  onStartSession,
  refreshKey,
}: Phase0DashboardProps): ReactElement {
  const { summary, sessions, isLoading, error } = usePhase0Progress(profileId, refreshKey);
  const dayViews = buildDayViews(summary, sessions);
  const currentDayView = dayViews.find((d) => d.day === absoluteDay);

  if (isLoading) {
    return (
      <Card asArticle className="phase0-dashboard">
        <p>Loading Phase 0 progress…</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card asArticle className="phase0-dashboard">
        <p role="alert">⚠ {error.message}</p>
      </Card>
    );
  }

  return (
    <section className="phase0-dashboard" aria-labelledby="phase0-title">
      <header className="phase0-header">
        <h2 id="phase0-title">Phase 0: Foundations</h2>
        {summary && (
          <p className="phase0-progress-meta">
            {summary.completedDays} of {summary.totalDays} days complete
          </p>
        )}
      </header>

      {/* Phase 1 unlock banner */}
      {summary?.phase1Unlocked && (
        <div className="phase1-unlock" role="status">
          <p>🎉 Phase 1 unlocked! All 7 foundation days completed.</p>
        </div>
      )}

      {/* Day grid */}
      <div className="day-grid" role="table" aria-label="Phase 0 curriculum days">
        {dayViews.map((dv) => {
          const isLocked = dv.status === 'locked';
          const isCompleted = dv.status === 'completed';
          return (
            <div
              key={dv.day}
              className={`day-col day-${dv.day}`}
              role="cell"
            >
              <Card
                asArticle
                className="day-card"
                aria-busy={isLocked ? undefined : undefined}
              >
                <header className="day-header">
                  <span className="day-label">{DAY_LABELS[dv.day]}</span>
                  {isLocked && <span className="day-status" aria-label="locked">🔒</span>}
                  {isCompleted && <span className="day-status" aria-label="completed">✓</span>}
                </header>
                <p className="day-objective">{DAY_OBJECTIVES[dv.day]}</p>
                {isCompleted && dv.latestSession && <StateTrendSpark session={dv.latestSession} />}
                {isLocked && (
                  <p className="day-locked-hint">
                    Complete the previous day to unlock.
                  </p>
                )}
              </Card>
            </div>
          );
        })}
      </div>

      {/* Current day session card */}
      {currentDayView && currentDayView.status !== 'locked' && (
        <section className="current-day" aria-labelledby="current-day-title">
          <h3 id="current-day-title">{DAY_LABELS[currentDayView.day]}</h3>
          <Phase0SessionCard
            profileId={profileId}
            absoluteDay={absoluteDay}
            day={currentDayView.day}
            status={currentDayView.status}
            {...(onStartSession ? { onStartSession } : {})}
            {...(currentDayView.latestSession
              ? { latestSession: currentDayView.latestSession }
              : {})}
          />
        </section>
      )}
    </section>
  );
}

export default Phase0Dashboard;

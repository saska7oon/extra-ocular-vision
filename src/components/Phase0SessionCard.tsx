/**
 * Phase 0 Session Card.
 *
 * Renders the session launcher for a given Phase 0 day. The session type is
 * determined by the day (Days 1-3 breathing, Days 4-5 binaural, Days 6-7
 * combined). Shows the last session's pre/post rating trend and a call-to-action
 * to start a new session.
 */
import { useState } from 'react';
import type { ReactElement } from 'react';
import { Button, Card } from '../ui';
import { clsx } from '../utils/clsx';
import { uuid4 } from '../utils/crypto';
import type {
  Phase0SessionRecord,
  Phase0SessionType,
  DayCompletion,
  BinauralFrequency,
} from '../features/phase0/types';

interface Phase0SessionCardProps {
  profileId: string;
  absoluteDay: number;
  /** Day number within Phase 0 (1-7). */
  day: number;
  /** Completion status for this day. */
  status: DayCompletion;
  /** Most recent session for this day, if any. */
  latestSession?: Phase0SessionRecord;
  /** Called to actually launch the training session for this day. */
  onStartSession?: (day: number) => void;
  /** Called after a session is created/saved. */
  onSaveSession?: (record: Phase0SessionRecord) => void;
}

/** Determine the session type for a given Phase 0 day. */
function sessionTypeForDay(day: number): Phase0SessionType {
  if (day <= 3) return 'breathing';
  if (day <= 5) return 'binaural';
  return 'combined';
}

/** Recommended binaural track for Days 4-5. */
function defaultTrackForDay(day: number): BinauralFrequency {
  return day === 4 ? 'alpha' : 'theta';
}

const DAY_OBJECTIVES: Record<number, string> = {
  1: 'Cardiac coherence — 0.1 Hz breathing',
  2: 'Cardiac coherence breathing',
  3: 'Cardiac coherence breathing',
  4: 'Alpha binaural beats (10 Hz)',
  5: 'Theta binaural beats (6 Hz)',
  6: 'Combined: breathing → binaural',
  7: 'Combined: breathing → binaural → visualization',
};

/**
 * Phase 0 Session Card.
 */
export function Phase0SessionCard({
  profileId,
  absoluteDay,
  day,
  status,
  latestSession,
  onStartSession,
  onSaveSession,
}: Phase0SessionCardProps): ReactElement {
  const [isStarting, setIsStarting] = useState(false);
  const sessionType = sessionTypeForDay(day);
  const track = defaultTrackForDay(day);

  // Launch the real training session for this day via the parent router.
  const handleStart = async () => {
    setIsStarting(true);
    try {
      if (onStartSession) {
        onStartSession(day);
      } else if (onSaveSession) {
        // Fallback: emit a placeholder record for headless tests.
        const now = Date.now();
        const record: Phase0SessionRecord = {
          id: uuid4(),
          profileId,
          sessionType,
          absoluteDay,
          startedAt: now,
          completed: false,
          ...(sessionType === 'binaural' ? { binauralTrackId: track } : {}),
        };
        onSaveSession(record);
      }
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <Card asArticle className="phase0-session-card">
      <header className="session-card-header">
        <h3 className="session-type-label">
          {sessionType === 'breathing' && 'Cardiac Coherence Breathing'}
          {sessionType === 'binaural' && `Binaural Beats — ${track} track`}
          {sessionType === 'combined' && 'Combined Guided Session'}
        </h3>
        <span
          className={clsx(
            'session-day-badge',
            `day-${day}`,
            status === 'completed' ? 'is-completed' : '',
          )}
          aria-label={`Day ${day} of 7`}
        >
          Day {day} / 7
        </span>
      </header>

      <p className="session-objective">{DAY_OBJECTIVES[day]}</p>

      {latestSession && (
        <div className="session-history">
          <p className="history-label">Last session:</p>
          <ul className="rating-summary">
            {latestSession.preStateRating !== undefined && (
              <li>Before: {latestSession.preStateRating} / 10</li>
            )}
            {latestSession.postStateRating !== undefined && (
              <li>After: {latestSession.postStateRating} / 10</li>
            )}
            {latestSession.completed && <li>Status: Completed</li>}
          </ul>
        </div>
      )}

      <div className="session-actions">
        {status === 'completed' ? (
          <Button variant="outline" onClick={handleStart} loading={isStarting}>
            Repeat this day
          </Button>
        ) : (
          <Button variant="primary" onClick={handleStart} loading={isStarting}>
            Start session
          </Button>
        )}
      </div>
    </Card>
  );
}

export default Phase0SessionCard;

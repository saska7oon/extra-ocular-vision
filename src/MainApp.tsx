/**
 * MainApp — the wired post-launch experience for Extra-Ocular Vision.
 *
 * After profile creation, this renders a small view router:
 *   - Home        : Phase 0 dashboard (day-by-day progress grid)
 *   - Session     : the actual training session (launches the real
 *                   BreathingGuide / BinauralPlayer / CombinedSession component
 *                   for the current day, NOT a simulated stub)
 *   - Statistics  : accuracy / chance / sensory-profile analytics
 *   - Journal     : training reflection log
 *
 * Session completion is persisted through the Phase0Repository (IndexedDB),
 * and day completion is marked so the dashboard progress advances.
 */
import { useCallback, useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { useDatabase } from './hooks';
import { Button, Card } from './ui';
import { Phase0Dashboard } from './components/Phase0Dashboard';
import { AccuracyDashboard } from './components/AccuracyDashboard';
import { SensoryProfile } from './components/SensoryProfile';
import { PhaseGym, PHASE_TITLES } from './components/PhaseGym';
import { FreeResponseSession } from './components/FreeResponseSession';
import { FreePlay } from './components/FreePlay';
import { MasteryMode } from './components/MasteryMode';
import { Tutorial } from './components/Tutorial';
import { BUILTIN_CATEGORIES } from './features/judging/templates';
import { BreathingGuide } from './components/BreathingGuide';
import { BinauralPlayer } from './components/BinauralPlayer';
import { CombinedSession } from './components/CombinedSession';
import type { Phase0SessionRecord, Phase0SessionType } from './features/phase0/types';

type View =
  | 'home'
  | 'session'
  | 'stats'
  | 'journal'
  | 'phases'
  | 'phase'
  | 'free'
  | 'mastery'
  | 'freeplay'
  | 'tutorial';

/**
 * Map a Phase 0 day (1-7) to its session type, matching
 * Phase0SessionCard.sessionTypeForDay.
 */
function sessionTypeForDay(day: number): Phase0SessionType {
  if (day <= 3) return 'breathing';
  if (day <= 5) return 'binaural';
  return 'combined';
}

interface MainAppProps {
  profileId: string;
}

export function MainApp({ profileId }: MainAppProps): ReactElement {
  const repos = useDatabase();
  const [view, setView] = useState<View>('home');
  const [absoluteDay, setAbsoluteDay] = useState(1);
  const [runningDay, setRunningDay] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedPhase, setSelectedPhase] = useState<1 | 2 | 3 | 4 | 7>(1);
  const [freeCategory, setFreeCategory] = useState<string | null>(null);

  // Determine the current absolute day (the first "available" day; fallback 1).
  useEffect(() => {
    const load = async () => {
      if (!repos) return;
      try {
        const s = await repos.phase0.getProgressSummary(profileId);
        const dayIdx = s.days.findIndex((d) => d === 'available');
        if (dayIdx >= 0) setAbsoluteDay(dayIdx + 1);
        else if (s.completedDays > 0) setAbsoluteDay(s.completedDays);
      } catch {
        // ignore — default to day 1
      }
    };
    void load();
  }, [repos, profileId, refreshKey]);

  /** Persist a completed session record and bump the dashboard. */
  const handleSessionComplete = useCallback(
    async (record: unknown) => {
      if (!repos || !record) return;
      const rec = record as Phase0SessionRecord;
      try {
        await repos.phase0.createSession(rec);
        // Mark the day complete if the session finished.
        if (rec.completed) {
          await repos.phase0.setDayCompletion(profileId, rec.absoluteDay);
        }
      } catch (err) {
        console.error('Failed to persist session:', err);
      } finally {
        setRunningDay(null);
        setRefreshKey((k) => k + 1);
      }
    },
    [repos, profileId],
  );

  /** Begin a session for the given day. */
  const startSession = (day: number) => {
    setRunningDay(day);
    setView('session');
  };

  /** Journal text for the active training day. */
  const [journalText, setJournalText] = useState('');
  const [journalSaved, setJournalSaved] = useState(false);

  const saveJournal = useCallback(async () => {
    if (!repos || !journalText.trim()) return;
    try {
      await repos.journal.create({
        profileId,
        title: `Day ${absoluteDay}`,
        content: journalText.trim(),
        tags: ['phase0'],
      });
      setJournalSaved(true);
    } catch (err) {
      console.error('Failed to save journal:', err);
    }
  }, [repos, journalText, absoluteDay, profileId]);

  // ---- View router ----
  if (view === 'session' && runningDay !== null) {
    const day = runningDay;
    const type = sessionTypeForDay(day);
    return (
      <section className="session-view" aria-labelledby="session-title">
        <header className="session-view-header">
          <Button variant="outline" onClick={() => setView('home')}>
            ← Back to dashboard
          </Button>
          <h2 id="session-title">Day {day} — Session</h2>
        </header>

        {type === 'breathing' && (
          <BreathingGuide
            profileId={profileId}
            absoluteDay={absoluteDay}
            onSessionComplete={handleSessionComplete}
          />
        )}
        {type === 'binaural' && (
          <BinauralPlayer
            profileId={profileId}
            absoluteDay={absoluteDay}
            onSessionComplete={handleSessionComplete}
          />
        )}
        {type === 'combined' && (
          <CombinedSession
            profileId={profileId}
            absoluteDay={absoluteDay}
            onSessionComplete={handleSessionComplete}
          />
        )}
      </section>
    );
  }

  return (
    <section className="main-app" aria-label="Main application">
      {/* Top nav */}
      <nav className="app-nav" aria-label="Main navigation">
        <Button
          variant={view === 'home' ? 'primary' : 'outline'}
          onClick={() => setView('home')}
        >
          Home
        </Button>
        <Button
          variant={view === 'tutorial' ? 'primary' : 'outline'}
          onClick={() => setView('tutorial')}
        >
          Tutorials
        </Button>
        <Button
          variant={view === 'freeplay' ? 'primary' : 'outline'}
          onClick={() => setView('freeplay')}
        >
          Free Play
        </Button>
        <Button
          variant={view === 'stats' ? 'primary' : 'outline'}
          onClick={() => setView('stats')}
        >
          Statistics
        </Button>
        <Button
          variant={view === 'phases' || view === 'phase' ? 'primary' : 'outline'}
          onClick={() => setView('phases')}
        >
          Drills
        </Button>
        <Button
          variant={view === 'mastery' ? 'primary' : 'outline'}
          onClick={() => setView('mastery')}
        >
          Mastery
        </Button>
        <Button
          variant={view === 'journal' ? 'primary' : 'outline'}
          onClick={() => setView('journal')}
        >
          Journal
        </Button>
      </nav>

      {view === 'home' && (
        <Phase0Dashboard
          profileId={profileId}
          absoluteDay={absoluteDay}
          onStartSession={startSession}
          refreshKey={refreshKey}
        />
      )}

      {view === 'phases' && (
        <section className="phase-selector" aria-label="Choose a drill phase">
          <h2>Drill Phases</h2>
          <div className="phase-grid" role="list">
            {([1, 2, 3, 4, 7] as const).map((p) => (
              <Card
                asArticle
                key={p}
                className="phase-card"
                interactive
              >
                <h3>{PHASE_TITLES[p]}</h3>
                <Button
                  variant="primary"
                  onClick={() => {
                    setSelectedPhase(p);
                    setView('phase');
                  }}
                >
                  Enter
                </Button>
              </Card>
            ))}
            <Card asArticle className="phase-card" interactive>
              <h3>Phase 5: Complex Targets</h3>
              <Button
                variant="primary"
                onClick={() => {
                  setFreeCategory(null);
                  setView('free');
                }}
              >
                Enter
              </Button>
            </Card>
            <Card asArticle className="phase-card" interactive>
              <h3>Phase 6: Environmental Mapping</h3>
              <Button
                variant="primary"
                onClick={() => {
                  setFreeCategory('environmental-mapping');
                  setView('free');
                }}
              >
                Enter
              </Button>
            </Card>
          </div>
        </section>
      )}

      {view === 'phase' && (
        <PhaseGym
          profileId={profileId}
          phaseId={selectedPhase}
          dayInPhase={1}
          absoluteDay={absoluteDay}
        />
      )}

      {view === 'free' && !freeCategory && (
        <section className="phase-selector" aria-label="Choose a complex-target category">
          <h2>Phase 5: Complex Targets</h2>
          <p>
            Pick a target family. You will perceive a hidden member of the set,
            describe it before reveal, and get a transparent similarity score.
          </p>
          <div className="phase-grid" role="list">
            {BUILTIN_CATEGORIES.map((c) => (
              <Card asArticle key={c} className="phase-card" interactive>
                <h3>{c.replace(/-/g, ' ')}</h3>
                <Button variant="primary" onClick={() => setFreeCategory(c)}>
                  Enter
                </Button>
              </Card>
            ))}
          </div>
        </section>
      )}

      {view === 'free' && freeCategory && (
        <FreeResponseSession
          key={freeCategory}
          category={freeCategory}
          onComplete={() => setFreeCategory(null)}
        />
      )}

      {view === 'stats' && (
        <div className="stats-views">
          <AccuracyDashboard profileId={profileId} />
          <SensoryProfile profileId={profileId} />
        </div>
      )}

      {view === 'mastery' && <MasteryMode profileId={profileId} />}

      {view === 'freeplay' && (
        <FreePlay
          profileId={profileId}
          absoluteDay={absoluteDay}
          onSessionComplete={handleSessionComplete}
        />
      )}

      {view === 'tutorial' && (
        <Tutorial
          profileId={profileId}
          absoluteDay={absoluteDay}
          onSessionComplete={handleSessionComplete}
        />
      )}

      {view === 'journal' && (
        <Card asArticle className="journal-view">
          <h2>Training Journal</h2>
          <p>
            Reflect on today&apos;s session — what you sensed, what state you were
            in, anything that stood out.
          </p>
          <label htmlFor="journal-input">Today&apos;s reflection</label>
          <textarea
            id="journal-input"
            value={journalText}
            onChange={(e) => {
              setJournalText(e.target.value);
              setJournalSaved(false);
            }}
            rows={6}
            placeholder="e.g. During the breathing, I noticed a warm sensation behind my eyes…"
          />
          <div className="journal-actions">
            <Button
              variant="primary"
              onClick={() => void saveJournal()}
              disabled={!journalText.trim()}
            >
              Save entry
            </Button>
            {journalSaved && <span role="status">Saved ✓</span>}
          </div>
        </Card>
      )}
    </section>
  );
}

export default MainApp;

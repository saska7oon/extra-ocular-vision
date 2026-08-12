/**
 * Cardiac Coherence Breathing Guide (Phase 0, Days 1-3).
 *
 * Features (per acceptance criteria):
 *  - Visual breathing guide (expanding/collapsing circle) at 0.1 Hz
 *  - Optional heartbeat audio track
 *  - 5 cycles per set, 3 sets per session (with inter-set rest)
 *  - Session timer with progress indicator
 *  - Subjective state rating (1-10) captured before/after
 *  - ARIA live regions for screen-reader timer announcements
 *
 * The breathing timing math is handled by the pure state machine in
 * ../../audio/breathing-session.ts; this component polls it on an animation
 * frame and renders the UI.
 */
import {
  useEffect,
  useRef,
  useState,
} from 'react';
import type { ReactElement, CSSProperties } from 'react';
import { clsx } from '../utils/clsx';
import { Button, Card } from '../ui';
import {
  DEFAULT_BREATHING_CONFIG,
  BREATH_INHALE_SECONDS,
  BREATH_EXHALE_SECONDS,
  BREATH_CYCLES_PER_SET,
  BREATH_SETS_PER_SESSION,
  type BreathingConfig,
} from '../features/phase0/types';
import {
  breathSessionDuration,
  breathAnimationScale,
} from '../audio/breathing-session';
import { AudioEngine, createAudioContext } from '../audio';
import type { BreathCycle } from '../audio/breathing-session';
import { createBreathingController } from '../features/phase0/session';
import type { BreathingSessionController } from '../features/phase0/session';

/* A 1-10 rating scale. */
const RATING_OPTIONS: ReadonlyArray<number> = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

interface BreathingGuideProps {
  /** Profile id the session belongs to. */
  profileId: string;
  /** Absolute day number (Day 1 = first training day). */
  absoluteDay: number;
  /** Called when a session completes (with the persisted record). */
  onSessionComplete?: (record: unknown) => void;
  /** Optional initial config (defaults to cardiac coherence). */
  config?: BreathingConfig;
}

/**
 * State-rating prompt shown before and after a session.
 */
function StateRatingPrompt({
  onSubmit,
  label,
}: {
  onSubmit: (rating: number) => void;
  label: string;
}): ReactElement {
  const [selected, setSelected] = useState<number | null>(null);
  return (
    <fieldset className="rating-prompt">
      <legend>{label}</legend>
      <p className="rating-hint">Tap a number (1 = very low, 10 = very high)</p>
      <div className="rating-grid">
        {RATING_OPTIONS.map((n) => (
          <button
            key={n}
            type="button"
            className={clsx(
              'rating-btn',
              selected === n ? 'is-selected' : '',
            )}
            aria-pressed={selected === n}
            onClick={() => setSelected(n)}
          >
            {n}
          </button>
        ))}
      </div>
      <Button
        variant="primary"
        disabled={selected === null}
        onClick={() => {
          if (selected !== null) onSubmit(selected);
        }}
      >
        Confirm {label.toLowerCase()}
      </Button>
    </fieldset>
  );
}

/**
 * The breathing guide component.
 */
export function BreathingGuide({
  profileId,
  absoluteDay,
  onSessionComplete,
  config = DEFAULT_BREATHING_CONFIG,
}: BreathingGuideProps): ReactElement {
  const audioRef = useRef<AudioEngine | null>(null);
  const controllerRef = useRef<BreathingSessionController | null>(null);
  const rafRef = useRef<number | null>(null);

  const [phase, setPhase] = useState<BreathCycle | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [preRating, setPreRating] = useState<number | null>(null);
  const [showPreRating, setShowPreRating] = useState(false);
  const [showPostRating, setShowPostRating] = useState(false);
  const [heartbeatEnabled, setHeartbeatEnabled] = useState(false);

  // Lazily create the AudioEngine and controller on first mount.
  if (audioRef.current === null) {
    audioRef.current = new AudioEngine(createAudioContext());
  }
  if (controllerRef.current === null) {
    const audio = audioRef.current ?? new AudioEngine(createAudioContext());
    controllerRef.current = createBreathingController(
      audio,
      profileId,
      absoluteDay,
      config,
    );
  }

  const controller = controllerRef.current;

  // Animation-frame loop: polls the pure state machine and updates UI.
  useEffect(() => {
    const current = controllerRef.current;
    if (!current) return;
    if (current.state.kind !== 'running') return;

    const loop = (t: number) => {
      const c = current.currentPhase(t);
      setPhase(c);
      setTimeRemaining(Math.ceil(current.timeRemaining(t)));
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [controller]);

  // React to state transitions that require rating input.
  const state = controller.state;
  useEffect(() => {
    if (showPreRating && state.kind === 'ready') {
      setShowPreRating(true);
    }
  }, [showPreRating, state.kind]);

  const startSession = (rating: number) => {
    setPreRating(rating);
    setShowPreRating(false);
    controller.start(rating);
    void startHeartbeatIfNeeded();
  };

  const startHeartbeatIfNeeded = () => {
    if (!heartbeatEnabled) return;
    const audio = audioRef.current;
    if (!audio) return;
    const total = breathSessionDuration(config);
    const h = audio.startHeartbeat(total);
    // Keep the handle so we can stop it.
    void h;
  };

  const pauseSession = () => {
    controller.pause();
  };

  const resumeSession = () => {
    controller.resume();
  };

  const finishSession = (rating: number) => {
    const { record } = controller.complete(rating);
    setPhase(null);
    setShowPostRating(false);
    onSessionComplete?.(record);
  };

  const resetSession = () => {
    // Recreate the controller for a fresh start.
    const audio = audioRef.current ?? new AudioEngine(createAudioContext());
    controllerRef.current = createBreathingController(audio, profileId, absoluteDay, config);
    setPhase(null);
    setTimeRemaining(breathSessionDuration(config));
    setPreRating(null);
    setShowPostRating(false);
  };

  // Format seconds as MM:SS.
  const fmt = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  // --- Render states -------------------------------------------------------

  if (showPreRating) {
    return (
      <Card asArticle className="breathing-guide">
        <h2>Pre-session state rating</h2>
        <StateRatingPrompt label="Before starting" onSubmit={startSession} />
      </Card>
    );
  }

  if (state.kind === 'complete' && !showPreRating) {
    return (
      <Card asArticle className="breathing-guide">
        <h2>Breathing session complete</h2>
        <p>Pre-session rating: {preRating ?? '—'}</p>
        <Button variant="outline" onClick={resetSession}>
          Start another session
        </Button>
      </Card>
    );
  }

  if (showPostRating && state.kind === 'running') {
    // After the natural timer elapses, prompt for post rating.
    return (
      <Card asArticle className="breathing-guide">
        <h2>Post-session reflection</h2>
        <StateRatingPrompt label="How do you feel now?" onSubmit={finishSession} />
      </Card>
    );
  }

  // Running / idle state.
  const isRunning = state.kind === 'running';
  const scale = phase ? breathAnimationScale(phase) : 0;
  const total = breathSessionDuration(config);
  const pct = isRunning ? (1 - timeRemaining / total) * 100 : 0;

  return (
    <Card asArticle className="breathing-guide">
      <header className="breathing-header">
        <h2>Cardiac Coherence Breathing</h2>
        <p className="breathing-meta">
          0.1 Hz · {BREATH_INHALE_SECONDS}s inhale / {BREATH_EXHALE_SECONDS}s exhale ·
          {BREATH_CYCLES_PER_SET} cycles × {BREATH_SETS_PER_SESSION} sets
        </p>
      </header>

      {/* ARIA live region announces the current phase to screen readers. */}
      <div
        aria-live="polite"
        className="breathing-instruction"
        role="status"
      >
        {phase ? phase.instruction : 'Press start to begin.'}
      </div>

      {/* The expanding/collapsing circle — driven by breathAnimationScale. */}
      <div className="breathing-visual">
        <div
          className="breathing-circle"
          style={
            {
              '--breath-scale': scale,
            } as CSSProperties
          }
          aria-hidden="true"
        />
      </div>

      {/* Timer + progress */}
      <div className="breathing-timer" aria-label="Session timer">
        <span
          className="timer-text"
          aria-live="polite"
          aria-label={`Time remaining: ${fmt(timeRemaining)} of ${fmt(total)}`}
        >
          {fmt(timeRemaining)} / {fmt(total)}
        </span>
        <div className="progress-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Set/cycle indicator */}
      {phase && (
        <div className="breathing-stats" aria-hidden="true">
          <span>Set {phase.setIndex + 1} / {phase.totalSets}</span>
          <span>Cycle {phase.cycleNumber} / {BREATH_CYCLES_PER_SET}</span>
          <span className={clsx('phase-label', `phase-${phase.phase}`)}>
            {phase.phase}
          </span>
        </div>
      )}

      {/* Controls */}
      <div className="breathing-controls">
        {!isRunning && state.kind === 'ready' && (
          <Button variant="primary" onClick={() => setShowPreRating(true)}>
            Start session
          </Button>
        )}
        {isRunning && (
          <>
            <Button variant="outline" onClick={pauseSession}>
              Pause
            </Button>
            <Button variant="outline" onClick={controller.isFinished(Date.now()) ? () => setShowPostRating(true) : pauseSession}>
              {controller.isFinished(Date.now()) ? 'Finish' : 'Skip'}
            </Button>
          </>
        )}
        {state.kind === 'paused' && (
          <Button variant="primary" onClick={resumeSession}>
            Resume
          </Button>
        )}
      </div>

      {/* Heartbeat toggle */}
      <label className="heartbeat-toggle">
        <input
          type="checkbox"
          checked={heartbeatEnabled}
          onChange={(e) => setHeartbeatEnabled(e.target.checked)}
        />
        Optional heartbeat audio
      </label>
    </Card>
  );
}

export default BreathingGuide;

/**
 * Combined Phase 0 Session (Days 6-7).
 *
 * A 15-minute guided flow with three stages:
 *   1. Cardiac coherence breathing (5 min)  — expands/collapses circle + heartbeat
 *   2. Binaural beats (5 min)               — Alpha 10 Hz carrier at 150 Hz
 *   3. Heart-center visualization (5 min)   — pulsing focal point for inner vision
 *
 * The stage/timing logic lives in ../features/phase0/session.ts
 * (createCombinedController). This component orchestrates the three stages,
 * drives the audio engine, and renders each stage's UI with a live timer.
 */
import {
  useEffect,
  useRef,
  useState,
} from 'react';
import type { ReactElement, CSSProperties } from 'react';
import { clsx } from '../utils/clsx';
import { Button, Card } from '../ui';
import { AudioEngine, createAudioContext } from '../audio';
import { createCombinedController } from '../features/phase0/session';
import type { CombinedSessionController, CombinedStage } from '../features/phase0/session';
import { BINAURAL_TRACKS } from '../features/phase0/types';

interface CombinedSessionProps {
  profileId: string;
  absoluteDay: number;
  onSessionComplete?: (record: unknown) => void;
}

/** Heart-center visualization: a softly pulsing focal dot. */
function HeartCenterViz({
  breathScale,
}: {
  breathScale: number;
}): ReactElement {
  return (
    <div className="heart-center" aria-label="Heart center visualization">
      <div
        className="heart-center__ring"
        style={{ '--pulse-scale': breathScale } as CSSProperties}
      >
        <div className="heart-center__dot" />
      </div>
      <p className="heart-center__hint">Soften your gaze. Rest attention at the center.</p>
    </div>
  );
}

export function CombinedSession({
  profileId,
  absoluteDay,
  onSessionComplete,
}: CombinedSessionProps): ReactElement {
  const audioRef = useRef<AudioEngine | null>(null);
  const controllerRef = useRef<CombinedSessionController | null>(null);
  const rafRef = useRef<number | null>(null);
  const heartbeatRef = useRef<ReturnType<AudioEngine['startHeartbeat']> | null>(null);

  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showPreRating, setShowPreRating] = useState(false);
  const [ratingInput, setRatingInput] = useState(5);

  if (audioRef.current === null) {
    audioRef.current = new AudioEngine(createAudioContext());
  }

  const getController = (): CombinedSessionController => {
    if (controllerRef.current === null) {
      const audio = audioRef.current ?? new AudioEngine(createAudioContext());
      controllerRef.current = createCombinedController(audio, profileId, absoluteDay);
    }
    return controllerRef.current;
  };

  const controller = getController();
  const state = controller.state;
  const totalSec = 15 * 60; // 15 minutes
  const pct = totalSec > 0 ? (1 - timeRemaining / totalSec) * 100 : 0;

  // Heartbeat sound during the breathing stage.
  useEffect(() => {
    if (state.stage === 'breathing' && !heartbeatRef.current) {
      const audio = audioRef.current;
      if (audio) {
        heartbeatRef.current = audio.startHeartbeat(300);
      }
    } else if (state.stage !== 'breathing' && heartbeatRef.current) {
      heartbeatRef.current.stop();
      heartbeatRef.current = null;
    }
  }, [state.stage]);

  // Animation loop while in breathing or visualization stages.
  useEffect(() => {
    if (state.stage !== 'breathing' && state.stage !== 'visualization') return;

    const loop = () => {
      setTimeRemaining(controller.timeRemaining());
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [controller, state.stage]);

  const fmt = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const stageLabel = (stage: CombinedStage): string => {
    switch (stage) {
      case 'breathing':
        return 'Cardiac Coherence Breathing';
      case 'binaural':
        return 'Binaural Beats (Alpha 10 Hz)';
      case 'visualization':
        return 'Heart-Center Visualization';
      case 'complete':
        return 'Complete';
    }
  };

  // --- Pre-start rating ---
  if (showPreRating) {
    return (
      <Card asArticle className="combined-session">
        <h2>Pre-session state rating</h2>
        <p>Rate how you feel right now (1-10):</p>
        <div className="rating-grid">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <button
              key={n}
              type="button"
              className={clsx('rating-btn', ratingInput === n ? 'is-selected' : '')}
              onClick={() => {
                setRatingInput(n);
                setShowPreRating(false);
                controller.start(n);
              }}
            >
              {n}
            </button>
          ))}
        </div>
      </Card>
    );
  }

  // --- Stage views ---
  const renderStage = (): ReactElement => {
    switch (state.stage) {
      case 'breathing':
        return (
          <div className="combined-stage breathing-stage">
            <div className="breathing-circle-container">
              <div
                className="breathing-circle-combined"
                style={{ '--breath-scale': 1 } as CSSProperties}
                aria-hidden="true"
              />
            </div>
            <p className="stage-instruction" aria-live="polite">
              Breathe in for 5 seconds, out for 5 seconds.
            </p>
          </div>
        );
      case 'binaural':
        return (
          <div className="combined-stage binaural-stage">
            <p className="stage-instruction">
              Listening to Alpha binaural beats (10 Hz). 150 Hz carrier.
            </p>
            <p className="track-meta">{BINAURAL_TRACKS.alpha.description}</p>
          </div>
        );
      case 'visualization':
        return (
          <div className="combined-stage visualization-stage">
            <HeartCenterViz breathScale={1} />
          </div>
        );
      default:
        return (
          <div className="combined-stage">
            <p>Session complete.</p>
          </div>
        );
    }
  };

  return (
    <Card asArticle className="combined-session">
      <header className="combined-header">
        <h2>Phase 0: Combined Session</h2>
        <p className="stage-name">{stageLabel(state.stage)}</p>
      </header>

      {renderStage()}

      {/* Timer */}
      <div className="combined-timer" aria-label="Session timer">
        <span
          className="timer-text"
          aria-live="polite"
          aria-label={`Time remaining: ${fmt(timeRemaining)}`}
        >
          {fmt(timeRemaining)} / {fmt(totalSec)}
        </span>
        <div
          className="progress-bar"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Controls */}
      <div className="combined-controls">
        {state.stage === 'complete' ? (
          <Button
            variant="primary"
            onClick={() => {
              const record = controller.complete(5);
              onSessionComplete?.(record);
            }}
          >
            Finish & save
          </Button>
        ) : (
          <>
            <Button variant="outline" onClick={() => controller.advance()}>
              Next stage
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const record = controller.complete(5);
                onSessionComplete?.(record);
              }}
            >
              Stop early
            </Button>
          </>
        )}
      </div>

      {state.stage !== 'complete' && (
        <button
          className="btn btn--ghost"
          onClick={() => setShowPreRating(true)}
          disabled={state.stage !== 'breathing'}
        >
          Set pre-session rating
        </button>
      )}
    </Card>
  );
}

export default CombinedSession;

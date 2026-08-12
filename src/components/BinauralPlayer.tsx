/**
 * Binaural Beats Player (Phase 0, Days 4-5).
 *
 * Features (per acceptance criteria):
 *  - Three preset tracks: Alpha (10 Hz), Theta (6 Hz), Gamma (40 Hz)
 *  - 150 Hz carrier tone with binaural beat offset
 *  - On-device headphone detection (via shared-channel latency heuristic)
 *  - Volume control with smooth fade-in / fade-out envelopes
 *  - Session timer + progress bar
 *  - Post-session state rating (1-10)
 *
 * The timing/scoring math lives in ../features/phase0/session.ts
 * (createBinauralController); this component wires it to the Web Audio engine
 * and renders the UI.
 */
import {
  useEffect,
  useRef,
  useState,
} from 'react';
import type { ReactElement } from 'react';
import { clsx } from '../utils/clsx';
import { Button, Card } from '../ui';
import {
  BINAURAL_TRACKS,
  type BinauralFrequency,
  DEFAULT_VOLUME,
} from '../features/phase0/types';
import { AudioEngine, createAudioContext, detectHeadphones } from '../audio';
import { createBinauralController } from '../features/phase0/session';
import type { BinauralSessionController } from '../features/phase0/session';

const TRACK_ORDER: ReadonlyArray<BinauralFrequency> = ['alpha', 'theta', 'gamma'];
const RATING_OPTIONS: ReadonlyArray<number> = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function TrackSelector({
  selected,
  onSelect,
}: {
  selected: BinauralFrequency;
  onSelect: (track: BinauralFrequency) => void;
}): ReactElement {
  return (
    <div className="track-selector" role="radiogroup" aria-label="Binaural beat track">
      {TRACK_ORDER.map((t) => {
        const spec = BINAURAL_TRACKS[t];
        const isSelected = selected === t;
        return (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={isSelected}
            className={clsx('track-btn', isSelected ? 'is-active' : '')}
            onClick={() => onSelect(t)}
          >
            <span className="track-name">{spec.label}</span>
            <span className="track-beat">{spec.beatHz} Hz</span>
          </button>
        );
      })}
    </div>
  );
}

interface BinauralPlayerProps {
  profileId: string;
  absoluteDay: number;
  onSessionComplete?: (record: unknown) => void;
}

type View = 'setup' | 'preRating' | 'running' | 'complete';

export function BinauralPlayer({
  profileId,
  absoluteDay,
  onSessionComplete,
}: BinauralPlayerProps): ReactElement {
  const audioRef = useRef<AudioEngine | null>(null);
  const controllerRef = useRef<BinauralSessionController | null>(null);
  const rafRef = useRef<number | null>(null);

  const [volume, setVolume] = useState(DEFAULT_VOLUME);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [headphonesOk, setHeadphonesOk] = useState<boolean | null>(null);
  const [headphoneReason, setHeadphoneReason] = useState('');
  const [selectedTrack, setSelectedTrack] = useState<BinauralFrequency>('alpha');
  const [view, setView] = useState<View>('setup');

  // Lazily create audio engine on mount.
  if (audioRef.current === null) {
    audioRef.current = new AudioEngine(createAudioContext());
  }

  // Detect headphones on mount.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    let cancelled = false;
    void (async () => {
      const result = await detectHeadphones(audio.context);
      if (cancelled) return;
      setHeadphonesOk(result.connected);
      setHeadphoneReason(result.reason);
    })();
    return () => { cancelled = true; };
  }, []);

  // Animation loop while running.
  useEffect(() => {
    const current = controllerRef.current;
    if (!current) return;
    if (current.state.kind !== 'running') return;

    const loop = (t: number) => {
      setTimeRemaining(Math.ceil(current.timeRemaining(t)));
      if (current.state.kind === 'running') {
        rafRef.current = requestAnimationFrame(loop);
      }
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const startSession = (rating: number) => {
    const audio = audioRef.current ?? new AudioEngine(createAudioContext());
    audio.setVolume(volume);
    controllerRef.current = createBinauralController(audio, profileId, absoluteDay, selectedTrack);
    controllerRef.current.start(rating);
    setView('running');
  };

  const stopSession = (rating: number) => {
    const current = controllerRef.current;
    if (!current) return;
    const { record } = current.complete(rating);
    onSessionComplete?.(record);
    setView('complete');
  };

  const fmt = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const state = controllerRef.current?.state ?? { kind: 'ready' as const, trackId: selectedTrack };
  const isRunning = state.kind === 'running';
  const fullDuration =
    state.kind === 'running'
      ? state.durationSec
      : BINAURAL_TRACKS[selectedTrack].durationMin * 60;
  const pct = fullDuration > 0 ? (1 - timeRemaining / fullDuration) * 100 : 0;

  // --- Setup view ---
  if (view === 'setup' || view === 'preRating') {
    const showRating = view === 'preRating';
    return (
      <Card asArticle className="binaural-player">
        <header>
          <h2>Binaural Beats Player</h2>
          <p className="binaural-meta">
            Carrier: 150 Hz · Beat frequencies: Alpha 10 Hz, Theta 6 Hz, Gamma 40 Hz
          </p>
        </header>

        {!showRating && <TrackSelector selected={selectedTrack} onSelect={setSelectedTrack} />}

        {/* Headphone notice */}
        {headphonesOk === false && (
          <div className="headphone-warning" role="alert">
            <p>⚠ Headphones not detected. Binaural beats require stereo headphones.</p>
            <p className="headphone-reason">{headphoneReason}</p>
          </div>
        )}
        {headphonesOk === true && (
          <p className="headphone-ok">✓ Headphones detected.</p>
        )}

        <div className="volume-control">
          <label htmlFor="binaural-volume">Volume</label>
          <input
            id="binaural-volume"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            aria-label="Volume"
          />
        </div>

        {!showRating ? (
          <button
            className={clsx('start-btn', 'btn', 'btn--primary')}
            onClick={() => setView('preRating')}
            disabled={headphonesOk === false}
          >
            Start session
          </button>
        ) : (
          <div className="rating-prompt">
            <p>Pre-session state rating (1-10):</p>
            <div className="rating-grid">
              {RATING_OPTIONS.map((n) => (
                <button key={n} type="button" className="rating-btn" onClick={() => startSession(n)}>
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>
    );
  }

  // --- Running view ---
  if (isRunning) {
    return (
      <Card asArticle className="binaural-player">
        <div className="binaural-running">
          <div className="binaural-timer" aria-label="Session timer">
            <span
              className="timer-text"
              aria-live="polite"
              aria-label={`Time remaining: ${fmt(timeRemaining)}`}
            >
              {fmt(timeRemaining)}
            </span>
            <div className="progress-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
              <div className="progress-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
          {state.kind === 'running' && (
            <p className="active-track">{BINAURAL_TRACKS[state.trackId].label}</p>
          )}
          <button className="stop-btn btn btn--outline" onClick={() => stopSession(5)}>
            Stop session
          </button>
        </div>
      </Card>
    );
  }

  // --- Complete view ---
  return (
    <Card asArticle className="binaural-player">
      <h2>Session complete</h2>
      <p>You completed the {BINAURAL_TRACKS[selectedTrack].label} session.</p>
      <Button variant="outline" onClick={() => { setView('setup'); setTimeRemaining(0); }}>
        Start another
      </Button>
    </Card>
  );
}

export default BinauralPlayer;

/**
 * Phase 0 session controllers — pure state machines that drive the audio
 * engine and produce session records.
 *
 * These are kept framework-agnostic (no React) so the timing/scoring logic
 * is unit-testable. The React components (BreathingGuide, BinauralPlayer,
 * CombinedSession) wrap these controllers.
 *
 * Curriculum reference (docs/extra-ocular-vision-app-spec.md §Phase 0):
 *   - Days 1-3: Cardiac coherence breathing (5 cycles x 3 sets, 15 min)
 *   - Days 4-5: Binaural beats (alpha 10 / theta 6 / gamma 40 Hz)
 *   - Days 6-7: Combined breathing → binaural → heart-center visualization
 */
import { BINAURAL_TRACKS } from './types';
import type {
  BreathingConfig,
  BinauralFrequency,
  Phase0SessionRecord,
} from './types';
import {
  computeBreathPhase,
  breathSessionDuration,
} from '../../audio/breathing-session';
import {
  AudioEngine,
  clampBinauralDuration,
  minutesToSeconds,
  CARRIER_HZ,
  type ActiveSound,
} from '../../audio';
import { uuid4 } from '../../utils/crypto';

import type { BreathCycle } from '../../audio/breathing-session';

export type { BreathCycle };

/* ==========================================================================
 * Helpers
 * ========================================================================= */

/**
 * Conditionally attach an optional field onto a partially-built record.
 * Works around `exactOptionalPropertyTypes: true` which forbids assigning
 * `undefined` to an optional property directly.
 */
function withOpt<K extends keyof Phase0SessionRecord>(
  obj: Phase0SessionRecord,
  key: K,
  value: unknown,
): Phase0SessionRecord {
  if (value !== undefined) {
    // Cast is safe: caller passes a value of the correct type for this key.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { ...obj, [key]: value as any } as Phase0SessionRecord;
  }
  return obj;
}

/* ==========================================================================
 * Breathing session controller
 * ========================================================================= */

export type BreathingSessionState =
  | { readonly kind: 'ready' }
  | { readonly kind: 'running'; readonly since: number; readonly elapsedSec: number }
  | { readonly kind: 'paused'; readonly elapsedSec: number }
  | { readonly kind: 'complete'; readonly preRating?: number; readonly postRating?: number; readonly setsCompleted: number }
  | { readonly kind: 'rating' };

export interface BreathingSessionController {
  /** Start the session (begins countdown). */
  start(preRating?: number): BreathingSessionState;
  /** Pause the session. */
  pause(): BreathingSessionState;
  /** Resume a paused session. */
  resume(): BreathingSessionState;
  /** Stop and finalize. Captures post-rating. */
  complete(postRating?: number): { state: BreathingSessionState; record: Phase0SessionRecord };
  /** Current state snapshot. */
  get state(): BreathingSessionState;
  /** Current breath phase for a given now(). */
  currentPhase(now: number): BreathCycle;
  /** Seconds remaining in the whole session. */
  timeRemaining(now: number): number;
  /** Whether the session naturally completed (all sets done). */
  isFinished(now: number): boolean;
}

/**
 * Create a breathing session controller.
 */
export function createBreathingController(
  audio: AudioEngine,
  profileId: string,
  absoluteDay: number,
  cfg: BreathingConfig,
): BreathingSessionController {
  const startedAt = Date.now();
  let state: BreathingSessionState = { kind: 'ready' };
  let _preRating: number | undefined;

  const total = breathSessionDuration(cfg);
  const setWork = cfg.cyclesPerSet * (cfg.inhaleSeconds + cfg.exhaleSeconds);

  const currentPhase = (now: number): BreathCycle => {
    if (state.kind === 'running') {
      const elapsed = (now - state.since) / 1000 + state.elapsedSec;
      return computeBreathPhase(elapsed, cfg);
    }
    if (state.kind === 'paused') {
      return computeBreathPhase(state.elapsedSec, cfg);
    }
    return computeBreathPhase(0, cfg);
  };

  const timeRemaining = (now: number): number => {
    if (state.kind !== 'running') {
      if (state.kind === 'paused') return total - state.elapsedSec;
      return total;
    }
    const elapsed = (now - state.since) / 1000 + state.elapsedSec;
    return Math.max(0, total - elapsed);
  };

  return {
    get state() {
      return state;
    },
    start(preRating) {
      _preRating = preRating;
      state = { kind: 'running', since: Date.now(), elapsedSec: 0 };
      void audio.playBeep(440, 200);
      return state;
    },
    pause() {
      if (state.kind === 'running') {
        const elapsed = (Date.now() - state.since) / 1000;
        state = { kind: 'paused', elapsedSec: elapsed };
      }
      return state;
    },
    resume() {
      if (state.kind === 'paused') {
        state = { kind: 'running', since: Date.now(), elapsedSec: state.elapsedSec };
      }
      return state;
    },
    complete(postRating) {
      const now = Date.now();
      const finished = this.isFinished(now);
      const elapsed =
        state.kind === 'running'
          ? (now - state.since) / 1000 + state.elapsedSec
          : state.kind === 'paused'
            ? state.elapsedSec
            : 0;
      const setsDone = Math.min(
        cfg.setsPerSession,
        Math.floor(elapsed / (setWork + cfg.setRestSeconds)),
      );
      const setsCompleted = finished ? cfg.setsPerSession : setsDone;
      const completeState: BreathingSessionState = {
        kind: 'complete',
        setsCompleted,
      };
      if (_preRating !== undefined) {
        (completeState as { preRating?: number }).preRating = _preRating;
      }
      if (postRating !== undefined) {
        (completeState as { postRating?: number }).postRating = postRating;
      }
      state = completeState;

      let record: Phase0SessionRecord = {
        id: uuid4(),
        profileId,
        sessionType: 'breathing',
        absoluteDay,
        startedAt,
        endedAt: now,
        completed: true,
      };
      record = withOpt(record, 'preStateRating', _preRating);
      record = withOpt(record, 'postStateRating', postRating);
      record = withOpt(record, 'setsCompleted', setsCompleted);

      void audio.playBeep(523, 150); // pleasant completion tone
      return { state, record };
    },
    currentPhase,
    timeRemaining,
    isFinished(now) {
      return timeRemaining(now) <= 0;
    },
  };
}

/* ==========================================================================
 * Binaural session controller
 * ========================================================================= */

export type BinauralSessionState =
  | { readonly kind: 'ready'; readonly trackId: BinauralFrequency }
  | { readonly kind: 'checking-headphones' }
  | { readonly kind: 'running'; readonly startedAt: number; readonly durationSec: number; readonly trackId: BinauralFrequency }
  | { readonly kind: 'complete'; readonly record: Phase0SessionRecord; readonly trackId: BinauralFrequency }
  | { readonly kind: 'rating' };

export interface BinauralSessionController {
  /** Begin headphone check (async, resolves when check completes). */
  checkHeadphones(): Promise<BinauralSessionState>;
  /** Start playback of the selected binaural track. */
  start(preRating?: number): BinauralSessionState;
  /** Stop playback and finalize. */
  complete(postRating?: number): { state: BinauralSessionState; record: Phase0SessionRecord };
  /** Current state. */
  get state(): BinauralSessionState;
  /** Seconds remaining. */
  timeRemaining(now: number): number;
  get trackId(): BinauralFrequency;
  get trackSpec(): (typeof BINAURAL_TRACKS)[BinauralFrequency];
}

export function createBinauralController(
  audio: AudioEngine,
  profileId: string,
  absoluteDay: number,
  trackId: BinauralFrequency,
): BinauralSessionController {
  const trackSpec = BINAURAL_TRACKS[trackId];
  let state: BinauralSessionState = { kind: 'ready', trackId };
  let startedAt = 0;
  let _preRating: number | undefined;
  let _sound: ActiveSound | null = null;
  let _headphonesOk = false;

  const durationSec = minutesToSeconds(
    clampBinauralDuration(trackSpec.durationMin),
  );

  const stopAudio = () => {
    _sound?.stop();
    _sound = null;
  };

  return {
    get state() {
      return state;
    },
    get trackId() {
      return trackId;
    },
    get trackSpec() {
      return trackSpec;
    },
    async checkHeadphones() {
      state = { kind: 'checking-headphones' };
      // Actual detection is performed by the React layer via detectHeadphones();
      // this transition just advances UI state.
      return state;
    },
    start(preRating) {
      _preRating = preRating;
      startedAt = Date.now();
      state = {
        kind: 'running',
        startedAt,
        durationSec,
        trackId,
      };
      // Begin binaural playback.
      _sound = audio.startBinauralBeat({
        beatHz: trackSpec.beatHz,
        carrierHz: CARRIER_HZ,
        durationSec,
      });
      return state;
    },
    complete(postRating) {
      const now = Date.now();
      stopAudio();
      let record: Phase0SessionRecord = {
        id: uuid4(),
        profileId,
        sessionType: 'binaural',
        absoluteDay,
        startedAt,
        endedAt: now,
        completed: true,
      };
      record = withOpt(record, 'preStateRating', _preRating);
      record = withOpt(record, 'postStateRating', postRating);
      record = withOpt(record, 'binauralTrackId', trackId);
      record = withOpt(record, 'headphonesOk', _headphonesOk);
      state = { kind: 'complete', record, trackId };
      return { state, record };
    },
    timeRemaining(now: number) {
      if (state.kind !== 'running') return 0;
      return Math.max(0, durationSec - (now - startedAt) / 1000);
    },
  };
}

/* ==========================================================================
 * Combined session controller (breathing → binaural → visualization)
 * ========================================================================= */

export type CombinedStage = 'breathing' | 'binaural' | 'visualization' | 'complete';

export interface CombinedSessionState {
  readonly stage: CombinedStage;
  readonly elapsedSec: number;
  readonly totalSec: number;
}

export interface CombinedSessionController {
  get state(): CombinedSessionState;
  start(preRating?: number): void;
  stop(): void;
  advance(): void;
  complete(postRating?: number): Phase0SessionRecord;
  timeRemaining(): number;
  isFinished(): boolean;
}

/**
 * Combined 15-minute guided flow: breathing (5 min) → binaural (5 min) →
 * heart-center visualization (5 min).
 */
export function createCombinedController(
  audio: AudioEngine,
  profileId: string,
  absoluteDay: number,
): CombinedSessionController {
  // Stage durations (seconds) — 5 min each = 15 min total.
  const STAGE_DURATIONS: Record<CombinedStage, number> = {
    breathing: 300,
    binaural: 300,
    visualization: 300,
    complete: 0,
  };
  const STAGE_ORDER: CombinedStage[] = ['breathing', 'binaural', 'visualization', 'complete'];

  let startedAt = 0;
  let currentStageIndex = 0;
  let _sound: ActiveSound | null = null;
  let _preRating: number | undefined;

  const totalSec = STAGE_DURATIONS.breathing + STAGE_DURATIONS.binaural + STAGE_DURATIONS.visualization;

  const current = (): CombinedSessionState => {
    const stage = STAGE_ORDER[currentStageIndex]!;
    return {
      stage,
      elapsedSec: 0,
      totalSec,
    };
  };

  const startStage = (stage: CombinedStage) => {
    _sound?.stop();
    if (stage === 'binaural') {
      _sound = audio.startBinauralBeat({
        beatHz: 10, // alpha as the bridge frequency
        carrierHz: CARRIER_HZ,
        durationSec: STAGE_DURATIONS.binaural,
      });
    } else if (stage === 'breathing') {
      // subtle heartbeat cue
      _sound = audio.startHeartbeat(STAGE_DURATIONS.breathing);
    }
  };

  return {
    get state() {
      return current();
    },
    start(preRating) {
      _preRating = preRating;
      startedAt = Date.now();
      currentStageIndex = 0;
      startStage('breathing');
    },
    stop() {
      _sound?.stop();
      _sound = null;
      currentStageIndex = STAGE_ORDER.length - 1; // 'complete'
    },
    advance() {
      if (currentStageIndex < STAGE_ORDER.length - 1) {
        currentStageIndex++;
        startStage(STAGE_ORDER[currentStageIndex]!);
      }
    },
    complete(postRating) {
      _sound?.stop();
      _sound = null;
      currentStageIndex = STAGE_ORDER.length - 1;
      let record: Phase0SessionRecord = {
        id: uuid4(),
        profileId,
        sessionType: 'combined',
        absoluteDay,
        startedAt,
        endedAt: Date.now(),
        completed: true,
      };
      record = withOpt(record, 'preStateRating', _preRating);
      record = withOpt(record, 'postStateRating', postRating);
      return record;
    },
    timeRemaining() {
      if (currentStageIndex >= STAGE_ORDER.length - 1) return 0;
      const elapsed = (Date.now() - startedAt) / 1000;
      return Math.max(0, totalSec - elapsed);
    },
    isFinished() {
      return this.timeRemaining() <= 0;
    },
  };
}

/**
 * Phase 0: Foundations — Preparation & State Management
 *
 * Type definitions for the breathing guide, binaural beats, and combined
 * sessions. All types are serializable and storable in IndexedDB.
 *
 * Curriculum reference (docs/extra-ocular-vision-app-spec.md §Phase 0):
 *   - Days 1-3: Cardiac coherence breathing (0.1 Hz, 6 breaths/min, 5s/5s)
 *   - Days 4-5: Hemi-Sync binaural beats (alpha 10 Hz, theta 6 Hz, gamma 40 Hz)
 *   - Days 6-7: Combined breathing → binaural → heart-center visualization
 *
 * Technical notes from the task spec:
 *   - Audio generated via Web Audio API (not bundled long files)
 *   - 150 Hz carrier with difference tone for binaural effect
 *   - State persisted to IndexedDB
 */
import type { Scale1to10 } from '../../types';

/* ==========================================================================
 * Enums / String Unions
 * ========================================================================= */

/** Binaural beats carrier frequencies. The difference tone is created by
 *  playing two tones (carrier ± halfDelta) in each ear. */
export const BINAURAL_CARRIER_HZ = 150;

/** Binaural beat frequencies supported in Phase 0. */
export type BinauralFrequency = 'alpha' | 'theta' | 'gamma';

export interface BinauralTrackSpec {
  readonly id: BinauralFrequency;
  /** Display label. */
  readonly label: string;
  /** Beat frequency in Hz (the difference tone the brain perceives). */
  readonly beatHz: number;
  /** Human description / subjective quality. */
  readonly description: string;
  /** Session duration target in minutes. */
  readonly durationMin: number;
}

export const BINAURAL_TRACKS: Record<BinauralFrequency, BinauralTrackSpec> = {
  alpha: {
    id: 'alpha',
    label: 'Alpha (10 Hz)',
    beatHz: 10,
    description: 'Relaxed awareness — the hypnagogic bridge state.',
    durationMin: 10,
  },
  theta: {
    id: 'theta',
    label: 'Theta (6 Hz)',
    beatHz: 6,
    description: 'Deep meditation — access to the unconscious.',
    durationMin: 12,
  },
  gamma: {
    id: 'gamma',
    label: 'Gamma (40 Hz)',
    beatHz: 40,
    description: 'Heightened perception — the neural "binding" state.',
    durationMin: 15,
  },
};

/** The phase-0 session type. */
export type Phase0SessionType = 'breathing' | 'binaural' | 'combined';

/** Default playback volume (0–1) for binaural / heartbeat audio. */
export const DEFAULT_VOLUME = 0.5;
/** Fade-in duration for binaural beats (seconds). */
export const FADE_SECONDS = 5;

/** Current status of a day's completion. */
export type DayCompletion = 'locked' | 'available' | 'completed';

/** A subjective state rating (1-10) captured at a specific point. */
export type StateRating = Scale1to10;

/* ==========================================================================
 * Breathing configuration
 * ========================================================================= */

/** Cardiac coherence: 0.1 Hz = 6 breaths/min = 10s cycle (5s inhale, 5s exhale). */
export const BREATH_PACE_HZ = 0.1;
export const BREATH_CYCLE_SECONDS = 10; // 1 / 0.1
export const BREATH_INHALE_SECONDS = 5;
export const BREATH_EXHALE_SECONDS = 5;

/** 5 cycles per set, 3 sets per session = 15 min total. */
export const BREATH_CYCLES_PER_SET = 5;
export const BREATH_SETS_PER_SESSION = 3;
export const BREATH_SET_DURATION_SECONDS = BREATH_CYCLE_SECONDS * BREATH_CYCLES_PER_SET; // 50s
export const BREATH_SESSION_DURATION_SECONDS =
  BREATH_SET_DURATION_SECONDS * BREATH_SETS_PER_SESSION; // 150s = 15 min (incl. rests)

/** Rest between sets (seconds). */
export const BREATH_SET_REST_SECONDS = 10;

export interface BreathingConfig {
  readonly cycleSeconds: number;
  readonly inhaleSeconds: number;
  readonly exhaleSeconds: number;
  readonly cyclesPerSet: number;
  readonly setsPerSession: number;
  readonly setRestSeconds: number;
  readonly totalSeconds: number;
}

export const DEFAULT_BREATHING_CONFIG: BreathingConfig = {
  cycleSeconds: BREATH_CYCLE_SECONDS,
  inhaleSeconds: BREATH_INHALE_SECONDS,
  exhaleSeconds: BREATH_EXHALE_SECONDS,
  cyclesPerSet: BREATH_CYCLES_PER_SET,
  setsPerSession: BREATH_SETS_PER_SESSION,
  setRestSeconds: BREATH_SET_REST_SECONDS,
  totalSeconds: BREATH_SESSION_DURATION_SECONDS + BREATH_SET_REST_SECONDS * (BREATH_SETS_PER_SESSION - 1),
};

/* ==========================================================================
 * Session records (persisted to IndexedDB)
 * ========================================================================= */

/**
 * A completed (or in-progress) Phase 0 session record.
 * One row per session; pre/post ratings and completion stored together.
 */
export interface Phase0SessionRecord {
  /** Primary key. */
  readonly id: string;
  /** ID of the user profile this session belongs to. */
  readonly profileId: string;
  /** Which kind of Phase 0 session. */
  readonly sessionType: Phase0SessionType;
  /** Absolute day number from app start (Day 1 = first training day). */
  readonly absoluteDay: number;
  /** When the session started (epoch ms). */
  readonly startedAt: number;
  /** When the session completed (epoch ms), if finished. */
  readonly endedAt?: number;
  /** Subjective state rating captured before starting (1-10). */
  readonly preStateRating?: StateRating;
  /** Subjective state rating captured after completing (1-10). */
  readonly postStateRating?: StateRating;
  /** For breathing sessions: how many sets actually completed. */
  readonly setsCompleted?: number;
  /** For binaural sessions: which track frequency was selected. */
  readonly binauralTrackId?: BinauralFrequency;
  /** For binaural sessions: whether headphones were detected/required-ok. */
  readonly headphonesOk?: boolean;
  /** Whether the user marked this session as complete. */
  readonly completed: boolean;
  /** Free-text reflection (the "heart-center visualization" notes). */
  readonly reflection?: string;
}

/**
 * Day-by-day completion tracking for Phase 0 (Days 1-7).
 * One record per day per profile (7 rows max).
 */
export interface Phase0Progress {
  /** Primary key (auto-generated). */
  readonly id: string;
  /** FK to the user profile. */
  readonly profileId: string;
  /** Day index within the week (1–7). */
  readonly day: number;
  /** Whether this day is completed. */
  readonly completed: boolean;
  /** When the day was completed (epoch ms). */
  readonly completedAt?: number;
}

/** Compact view of Phase 0 progress for a profile (all 7 days). */
export interface Phase0ProgressSummary {
  /** How many of the 7 days are completed. */
  readonly completedDays: number;
  /** Total days (always 7). */
  readonly totalDays: number;
  /** Whether Phase 1 is unlocked (all 7 days done). */
  readonly phase1Unlocked: boolean;
  /** Per-day completion status (1-7). */
  readonly days: DayCompletion[];
  /** History of state ratings across sessions (for trend chart). */
  readonly stateHistory: StateHistoryEntry[];
}

/**
 * A single pre/post state rating pair from a session.
 */
export interface StateHistoryEntry {
  readonly sessionId: string;
  readonly sessionType: Phase0SessionType;
  readonly startedAt: number;
  readonly preStateRating?: StateRating;
  readonly postStateRating?: StateRating;
}

/**
 * A day's view in the Phase 0 dashboard: completion status plus the most
 * recent session record for that day (if any), used to render the state-rating
 * trend sparkline.
 */
export interface Phase0DayView {
  /** Day number within the week (1–7). */
  readonly day: number;
  /** Completion status (locked / available / completed). */
  readonly status: DayCompletion;
  /** Most recent session for this day, if any. */
  readonly latestSession?: Phase0SessionRecord;
}

/* ==========================================================================
 * Re-export the concrete 1-10 scale (Phase 0 uses the global one).
 * ========================================================================= */
export type { Scale1to10 };

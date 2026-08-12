/**
 * Core type definitions for the Extra-Ocular Vision app.
 *
 * Design principles:
 *  - All types are fully serializable and storable in IndexedDB
 *  - IDs are ULIDs/UUIDs (generated client-side) for multi-profile safety
 *  - All enums are string union types for JSON-friendliness
 *  - Optional fields use `exactOptionalPropertyTypes` semantics
 */

/* ==========================================================================
 * Enums
 * ========================================================================== */

/** The 5 progressive difficulty tiers from the spec. */
export type DifficultyTier = 'beginner' | 'elementary' | 'intermediate' | 'advanced' | 'expert';

/** The 8 curriculum phases (Phase 0 Foundations through Phase 8 Sustained Practice). */
export type PhaseId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/** Exercise categories aligned to phases. */
export type ExerciseType =
  | 'contrast'
  | 'color'
  | 'shape'
  | 'symbol'
  | 'complex-target'
  | 'free-response'
  | 'environmental-mapping'
  | 'text-reading';

/** Free-response judging methods per the spec. */
export type JudgeMethod = 'tfidf' | 'embedding' | 'string-match';

/** Session result outcome. */
export type SessionOutcome = 'pending' | 'complete' | 'skipped' | 'integrity-failed';

/** Integrity score flags for rigor controls. */
export type IntegrityFlag =
  | 'time-gap-suspicious'
  | 'commit-before-reveal-violation'
  | 'accuracy-spike'
  | 'low-trial-count'
  | 'peek-detected';

/** State rating scales (1-10). */
export type Scale1to10 = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

/** Theme preference. */
export type Theme = 'light' | 'dark' | 'system';

/** Accessibility mode. */
export type AccessibilityMode = 'standard' | 'screen-reader' | 'high-contrast';

/**
 * Phase metadata for curriculum navigation.
 * Each phase maps to a contiguous day range from the spec.
 */
export interface PhaseMeta {
  readonly id: PhaseId;
  readonly title: string;
  readonly description: string;
  readonly dayStart: number;
  readonly dayEnd: number;
  readonly difficultyTier: DifficultyTier;
  readonly exerciseTypes: ExerciseType[];
}

/* ==========================================================================
 * User Profile
 * ========================================================================== */

/** Local user profile. Multiple profiles supported per-device. */
export interface UserProfile {
  readonly id: string;
  readonly name: string;
  /** Optional base64-encoded avatar image data URI (no external storage). */
  readonly avatarDataUri?: string;
  readonly createdAt: number; // epoch ms
  readonly lastActiveAt: number; // epoch ms
  readonly preferences: UserPreferences;
  /** Whether this profile is the currently active one (only one active at a time). */
  readonly isActive: boolean;
}

/** User-level preferences stored per profile. */
export interface UserPreferences {
  /** Theme: light, dark, or system-prefers-color-scheme. */
  readonly theme: Theme;
  /** Accessibility mode for visually impaired users. */
  readonly accessibilityMode: AccessibilityMode;
  /** Whether audio is enabled (binaural beats, voice instructions). */
  readonly audioEnabled: boolean;
  /** Whether to show scientific skepticism warnings. */
  readonly showSkepticismWarnings: boolean;
  /** Whether to enforce rigor controls strictly. */
  readonly strictRigor: boolean;
  /** Voice instruction speed (0.5–2.0). */
  readonly voiceSpeed: number;
  /** Seizure-risk safety: opt-in for entrainment features. */
  readonly entrainmentEnabled: boolean;
}

/* ==========================================================================
 * Curriculum / Session
 * ========================================================================== */

/**
 * A single exercise round within a session.
 * The user perceives a target, commits an answer, and the target is revealed.
 */
export interface ExerciseRound {
  readonly id: string;
  readonly sessionId: string;
  /** Human-readable round index within the session (1-based). */
  readonly roundNumber: number;
  /** The exercise type for this round. */
  readonly exerciseType: ExerciseType;
  /** Difficulty tier at the time of the round. */
  readonly difficulty: DifficultyTier;
  /**
   * Cryptographic target lock: SHA-256 hash of the target + random salt,
   * computed before the round starts and revealed post-session.
   * Format: "<salt>:<hash>"
   */
  readonly targetHash: string;
  /**
   * The actual target (revealed post-commit). Opaque string — interpretation
   * depends on exerciseType. e.g. "black", "red", "circle", "A", etc.
   */
  readonly target: string;
  /** The target metadata (color, shape, rank, etc.) for display/judging. */
  readonly targetMeta: Record<string, unknown>;
  /** When the round became active (epoch ms). */
  readonly startedAt: number;
  /** When the user committed their answer (epoch ms). */
  readonly committedAt?: number;
  /** Time between target reveal and user commitment, in ms. */
  readonly responseTimeMs?: number;
  /** User's committed answer before reveal. */
  readonly committedAnswer?: string;
  /** Whether the user's answer matched the target. */
  readonly correct?: boolean;
  /** User's confidence rating (1-5, self-reported). */
  readonly confidenceRating?: number;
  /** Subjective state rating pre-round (1-10). */
  readonly preStateRating?: Scale1to10;
  /** Subjective state rating post-round (1-10). */
  readonly postStateRating?: Scale1to10;
}

/** A complete session record. */
export interface Session {
  readonly id: string;
  readonly profileId: string;
  /** Phase this session belongs to (0–8). */
  readonly phaseId: PhaseId;
  /** Day number within the phase (1-based within phase). */
  readonly dayInPhase: number;
  /** Absolute day number from app start (Day 1 = first training day). */
  readonly absoluteDay: number;
  /** Difficulty tier at session start. */
  readonly difficulty: DifficultyTier;
  /** Rounds completed in this session. */
  readonly rounds: ExerciseRound[];
  /** Session start timestamp (epoch ms). */
  readonly startedAt: number;
  /** Session end timestamp (epoch ms), set when complete. */
  readonly endedAt?: number;
  /** Overall accuracy: correct / total committed rounds. */
  readonly accuracy?: number;
  /** Binomial p-value for the accuracy (statistical significance). */
  readonly pValue?: number;
  /** Current streak length (consecutive correct rounds in this session). */
  readonly maxStreak: number;
  /** Session integrity score (0.0–1.0). Below 0.5 flags rigor concerns. */
  readonly integrityScore: number;
  /** Integrity flags raised during the session. */
  readonly integrityFlags: IntegrityFlag[];
  /** User's free-text reflection (post-session calibration). */
  readonly reflection?: string;
  /** Overall outcome. */
  readonly outcome: SessionOutcome;
  /** Free-response score for Tier 4/5 exercises (0-10 scale). */
  readonly freeResponseScore?: number;
}

/* ==========================================================================
 * Curriculum Progress
 * ========================================================================== */

/** Tracks the user's position in the curriculum. */
export interface CurriculumProgress {
  /** Current profile ID. */
  readonly profileId: string;
  /** Current phase ID (0–8). */
  readonly phaseId: PhaseId;
  /** Current day within the phase (1-based). */
  readonly dayInPhase: number;
  /** Total sessions completed (cumulative). */
  readonly totalSessions: number;
  /** Absolute day number (Day 1 = first training day). */
  readonly absoluteDay: number;
  /** Date string of last session completion (YYYY-MM-DD, local time). */
  readonly lastSessionDate?: string;
  /** Current streak of consecutive daily sessions. */
  readonly streak: number;
  /** Best streak achieved. */
  readonly bestStreak: number;
  /** Per-phase completion flags. */
  readonly phaseCompletion: Record<number, PhaseCompletion>;
}

export interface PhaseCompletion {
  /** Whether this phase is unlocked. */
  readonly unlocked: boolean;
  /** Whether this phase is fully completed. */
  readonly completed: boolean;
  /** Day reached within this phase (1-based). */
  readonly dayReached: number;
}

/* ==========================================================================
 * Difficulty / Rigor
 * ========================================================================== */

/** Difficulty tier advancement state for a profile. */
export interface TierProgression {
  readonly profileId: string;
  /** Current active difficulty tier. */
  readonly tier: DifficultyTier;
  /** Sessions at the current tier that passed the advancement threshold. */
  readonly consecutiveAdvancingSessions: number;
  /** Sessions at the current tier that triggered regression. */
  readonly consecutiveFailingSessions: number;
  /** History of tier changes. */
  readonly tierHistory: TierHistoryEntry[];
}

export interface TierHistoryEntry {
  readonly tier: DifficultyTier;
  readonly enteredAt: number;
  readonly reason: 'advanced' | 'regressed' | 'reset';
  readonly accuracyAtChange: number;
}

/** Rigor control audit trail. */
export interface IntegrityAudit {
  readonly id: string;
  readonly sessionId: string;
  readonly timestamp: number;
  readonly check: string;
  readonly passed: boolean;
  readonly detail: string;
}

/* ==========================================================================
 * Statistics
 * ========================================================================== */

/** Aggregate statistics for a profile, per exercise type. */
export interface StatisticsAggregate {
  readonly profileId: string;
  /** Per-exercise-type lifetime stats. */
  readonly exerciseStats: Record<ExerciseType, ExerciseStat>;
  /** Overall lifetime stats. */
  readonly lifetime: LifetimeStat;
  /** Computed at this time (epoch ms). */
  readonly computedAt: number;
}

export interface ExerciseStat {
  readonly exerciseType: ExerciseType;
  readonly totalRounds: number;
  readonly totalCorrect: number;
  readonly overallAccuracy: number;
  readonly bestStreak: number;
  readonly maxStreak: number;
  readonly avgResponseTimeMs: number;
  readonly avgConfidence: number;
  readonly totalSessions: number;
  /** Confusion matrix (for forced-choice exercises). */
  readonly confusionMatrix?: Record<string, Record<string, number>>;
}

export interface LifetimeStat {
  readonly totalSessions: number;
  readonly totalRounds: number;
  readonly totalCorrect: number;
  readonly overallAccuracy: number;
  readonly longestStreak: number;
  readonly currentStreak: number;
  readonly startDate: number;
  readonly lastSessionDate?: number;
}

/* ==========================================================================
 * Journal
 * ========================================================================== */

/** Free-form journal entry tied to a session or standalone. */
export interface JournalEntry {
  readonly id: string;
  readonly profileId: string;
  /** Associated session, if any. */
  readonly sessionId?: string;
  readonly createdAt: number;
  readonly updatedAt: number;
  /** Optional title. */
  readonly title?: string;
  /** Entry body text. */
  readonly content: string;
  /** Tags for filtering (e.g. "phase-0", "technique", "insight"). */
  readonly tags: string[];
  /** Mood rating (1-10), self-reported. */
  readonly mood?: Scale1to10;
}

/* ==========================================================================
 * Template Library
 * ========================================================================== */

/** A free-response judging template — a target word/phrase that the judge
 * matches against user descriptions. */
export interface TemplateEntry {
  readonly id: string;
  readonly profileId: string;
  /** Template category (e.g. "playing-cards", "objects", "text"). */
  readonly category: string;
  /** The target label. */
  readonly label: string;
  /** Keywords that, if present, count as a match. */
  readonly keywords: string[];
  /** Weight (0–1) applied to this keyword match in scoring. */
  readonly weight: number;
  /** Synonyms / alternate phrasings */
  readonly aliases: string[];
  /** Whether this is a user-created template (vs built-in). */
  readonly isCustom: boolean;
  readonly createdAt: number;
}

/** A free-response judging result — full transparency per spec. */
export interface JudgingResult {
  readonly id: string;
  readonly sessionId: string;
  readonly roundId: string;
  /** The target that was being scored. */
  readonly targetLabel: string;
  /** Method used (tfidf, embedding, string-match). */
  readonly method: JudgeMethod;
  /** Raw similarity score (0–1). */
  readonly rawScore: number;
  /** Chance-adjusted score (0–1). */
  readonly chanceAdjustedScore: number;
  /** Which keywords matched. */
  readonly matchedKeywords: string[];
  /** Which keywords were missing. */
  readonly missingKeywords: string[];
  /** Which other targets would have matched (for chance baseline). */
  readonly chanceMatches: string[];
  /** User-visible detail of the scoring breakdown. */
  readonly breakdown: string;
  readonly scoredAt: number;
}

/* ==========================================================================
 * Target Generation (SHA-256 lock)
 * ========================================================================== */

/** Pre-session target generation chain. */
export interface TargetChain {
  readonly sessionId: string;
  /** Array of salt:hash strings, one per round, in order. */
  readonly roundHashes: string[];
  /** The PRNG seed used (stored for audit; user can re-run). */
  readonly seed: string;
  /** Timestamp of generation. */
  readonly generatedAt: number;
  /** Human-readable audit string of the target selection. */
  readonly auditTrail: string[];
}

/* ==========================================================================
 * App State
 * ========================================================================== */

/** App-level settings persisted across all profiles. */
export interface AppSettings {
  /** Dexie primary key (fixed value 'app'). */
  readonly key: string;
  readonly version: string;
  /** ID of the active profile. */
  readonly activeProfileId?: string | null;
  /** First-launch flag. */
  readonly firstLaunchComplete: boolean;
  /** App installed as PWA (for UI tweaks). */
  readonly isPwa: boolean;
  /** Last DB schema version migrated to. */
  readonly dbVersion: number;
}

/* ==========================================================================
 * Utility types
 * ========================================================================== */

/** A result type for operations that can fail. */
export type Result<T, E = Error> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

/** Deep partial for update operations. */
export type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

/* ==========================================================================
 * PWA / Browser extensions
 * ========================================================================== */

/** Extended Window with PWA install prompt support. */
declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
    appinstalled: Event;
  }

  /** Synthetic event from the browser when a PWA can be installed. */
  interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
    prompt(): Promise<void>;
  }
}

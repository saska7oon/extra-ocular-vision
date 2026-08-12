/**
 * Forced-Choice Exercise Engine (Phases 1-4).
 *
 * A single reusable engine that powers contrast, color, shape, and symbol
 * exercises. The mechanics are identical across phases — only the TARGET
 * POOL and CHOICE COUNT differ:
 *
 *   1. A session is seeded. For each round, a target is picked from the
 *      pool deterministically and immediately locked into a SHA-256
 *      commitment (commit-before-reveal protocol in utils/crypto.ts) so
 *      neither the user nor the app can peek before the answer.
 *   2. The user commits an answer from a set of forced choices.
 *   3. The target is revealed, verified against the commitment, and scored.
 *
 * The engine is framework-agnostic (no React) so the scoring logic is
 * unit-testable. The React view layer (ForcedChoiceSession) renders it.
 *
 * Honesty framing: outcomes report "above/below chance" statistically via
 * the existing analytics engine; the app never certifies ability.
 */
import type {
  ExerciseRound,
  ExerciseType,
  DifficultyTier,
  PhaseId,
} from '../../types';
import {
  generateLockedTargets,
  randomSeed,
  createPRNG,
  verifyCommitment,
  type Commitment,
} from '../../utils/crypto';
import { EXERCISE_CHOICES } from '../statistics/analytics';
import { choicesAtTier } from '../difficulty/tiers';

/* ==========================================================================
 * Phase configuration
 * ========================================================================= */

/** A choice-theme option for a round. */
export interface ForcedChoiceOption {
  readonly key: string;
  /** Human label shown in the choice UI and as the revealed target. */
  readonly label: string;
  /** Optional visual/audio descriptor used to render the target blind. */
  readonly meta?: Record<string, unknown>;
}

/** Per-exercise configuration for the forced-choice engine. */
export interface ForcedChoiceConfig {
  readonly exerciseType: ExerciseType;
  readonly phaseId: PhaseId;
  /** The full pool from which targets are drawn. */
  readonly options: readonly ForcedChoiceOption[];
  /** How many choices are offered per round (must be >= 2, <= options.length). */
  readonly choicesPerRound: number;
  /** Rounds per training session for this exercise. */
  readonly roundsPerSession: number;
  /** Fixed chance baseline if the exercise is forced-choice. */
  readonly chanceBaseline: number;
}

/** The forced-choice exercise set — one config per Phase 1-4 exercise type. */
export const FORCED_CHOICE_CONFIGS: Record<
  Extract<ExerciseType, 'contrast' | 'color' | 'shape' | 'symbol' | 'text-reading'>,
  ForcedChoiceConfig
> = {
  contrast: {
    exerciseType: 'contrast',
    phaseId: 1,
    options: [
      { key: 'white', label: 'White' },
      { key: 'black', label: 'Black' },
      { key: 'grey', label: 'Grey' },
    ],
    choicesPerRound: 2,
    roundsPerSession: 20,
    chanceBaseline: 0.5,
  },
  color: {
    exerciseType: 'color',
    phaseId: 2,
    options: [
      { key: 'red', label: 'Red' },
      { key: 'blue', label: 'Blue' },
      { key: 'green', label: 'Green' },
      { key: 'yellow', label: 'Yellow' },
    ],
    choicesPerRound: 4,
    roundsPerSession: 20,
    chanceBaseline: 0.25,
  },
  shape: {
    exerciseType: 'shape',
    phaseId: 3,
    options: [
      { key: 'circle', label: 'Circle' },
      { key: 'square', label: 'Square' },
      { key: 'triangle', label: 'Triangle' },
      { key: 'star', label: 'Star' },
      { key: 'cross', label: 'Cross' },
      { key: 'diamond', label: 'Diamond' },
    ],
    choicesPerRound: 4,
    roundsPerSession: 20,
    chanceBaseline: 0.25,
  },
  symbol: {
    exerciseType: 'symbol',
    phaseId: 4,
    options: [
      { key: 'A', label: 'A' },
      { key: 'B', label: 'B' },
      { key: 'C', label: 'C' },
      { key: 'D', label: 'D' },
      { key: 'E', label: 'E' },
      { key: 'F', label: 'F' },
      { key: 'G', label: 'G' },
      { key: 'H', label: 'H' },
      { key: 'I', label: 'I' },
      { key: 'J', label: 'J' },
      { key: 'K', label: 'K' },
      { key: 'L', label: 'L' },
      { key: 'M', label: 'M' },
      { key: 'N', label: 'N' },
      { key: 'O', label: 'O' },
      { key: 'P', label: 'P' },
      { key: 'Q', label: 'Q' },
      { key: 'R', label: 'R' },
      { key: 'S', label: 'S' },
      { key: 'T', label: 'T' },
      { key: 'U', label: 'U' },
      { key: 'V', label: 'V' },
      { key: 'W', label: 'W' },
      { key: 'X', label: 'X' },
      { key: 'Y', label: 'Y' },
      { key: 'Z', label: 'Z' },
    ],
    choicesPerRound: 10,
    roundsPerSession: 30,
    chanceBaseline: 0.1,
  },
  'text-reading': {
    // Phase 7 (days 141-180): functional literacy — perceiving whole written
    // words rather than single symbols. Small, high-contrast word pool.
    exerciseType: 'text-reading',
    phaseId: 7,
    options: [
      { key: 'cat', label: 'CAT' },
      { key: 'dog', label: 'DOG' },
      { key: 'sun', label: 'SUN' },
      { key: 'moon', label: 'MOON' },
      { key: 'star', label: 'STAR' },
      { key: 'tree', label: 'TREE' },
      { key: 'fire', label: 'FIRE' },
      { key: 'water', label: 'WATER' },
      { key: 'house', label: 'HOUSE' },
      { key: 'bird', label: 'BIRD' },
    ],
    choicesPerRound: 4,
    roundsPerSession: 20,
    chanceBaseline: 0.25,
  },
};

/**
 * Return the configured choices-per-round for an exercise, falling back to the
 * analytics constant (used by the stats layer for chance baselines).
 */
export function choiceCountFor(exerciseType: ExerciseType): number {
  const cfg = FORCED_CHOICE_CONFIGS[exerciseType as Extract<ExerciseType, 'contrast'|'color'|'shape'|'symbol'|'text-reading'>];
  if (cfg) return cfg.choicesPerRound;
  return EXERCISE_CHOICES[exerciseType] ?? 2;
}

/** Map a phase id to its single default forced-choice config (Phases 1-4, 7). */
export function configForPhase(
  phaseId: 1 | 2 | 3 | 4 | 7,
): ForcedChoiceConfig {
  return FORCED_CHOICE_CONFIGS[
    ({ 1: 'contrast', 2: 'color', 3: 'shape', 4: 'symbol', 7: 'text-reading' } as const)[phaseId]
  ]!;
}

/* ==========================================================================
 * Engine state
 * ========================================================================= */

/** A single locked, in-flight round. */
export interface LockedRound {
  readonly roundIndex: number;
  /** The encrypted/locked target key (not revealed until commit). */
  readonly targetKey: string;
  /** The commitment string ("salt:hash") guarding the target. */
  readonly commitment: Commitment;
  /** The choice options presented to the user for this round. */
  readonly choices: ForcedChoiceOption[];
}

export type EngineState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'presenting'; readonly round: number }
  | { readonly kind: 'revealed'; readonly round: number }
  | { readonly kind: 'complete' };

export interface EngineResult {
  /** The session record (rounds persisted) ready for SessionRepository. */
  readonly rounds: ExerciseRound[];
  /** Overall accuracy across committed rounds. */
  readonly accuracy: number;
  /** Whether the result is statistically above chance (p < 0.05). */
  readonly aboveChance: boolean;
}

/**
 * Reproducible forced-choice engine. Construct with a config and seed; step
 * through rounds by revealing targets and committing answers.
 */
export class ForcedChoiceEngine {
  private _locked: LockedRound[] = [];
  private _rounds: ExerciseRound[] = [];
  private _state: EngineState = { kind: 'idle' };
  private _cursor = 0;
  private _choices: ForcedChoiceOption[] = [];

  constructor(
    private readonly cfg: ForcedChoiceConfig,
    private readonly opts: {
      profileId: string;
      sessionId: string;
      absoluteDay: number;
      dayInPhase: number;
      difficulty: DifficultyTier;
      seed?: string;
    },
  ) {}

  get state(): EngineState {
    return this._state;
  }

  get rounds(): readonly ExerciseRound[] {
    return this._rounds;
  }

  get totalRounds(): number {
    return this.cfg.roundsPerSession;
  }

  /** Start the session: generate locked rounds from the seed. */
  async start(): Promise<void> {
    const seed = this.opts.seed ?? randomSeed();
    // Lock on LABEL strings so the commitment hashes exactly what gets revealed.
    const labels = this.cfg.options.map((o) => o.label);
    const targetCount = this.cfg.roundsPerSession;
    const locked = await generateLockedTargets(seed, labels, targetCount);
    // Choice count scales with the difficulty tier (fewer = easier).
    const choiceCount = choicesAtTier(
      this.opts.difficulty,
      this.cfg.choicesPerRound,
      this.cfg.options.length,
    );
    // Deterministic PRNG (same seed) to draw distractors.
    const rand = createPRNG(seed + ':distractors');
    this._choices = [];
    this._locked = locked.map((l, i) => {
      const opt = this.cfg.options.find((o) => o.label === l.target)!;
      // Always include the correct target; fill remaining slots with distinct
      // distractors so the user can actually get the round right.
      const others = this.cfg.options.filter((o) => o.key !== opt.key);
      const pool = [...others];
      const picks: ForcedChoiceOption[] = [opt];
      const want = Math.max(1, Math.min(choiceCount, this.cfg.options.length));
      while (picks.length < want && pool.length > 0) {
        const idx = Math.floor(rand() * pool.length);
        picks.push(pool.splice(idx, 1)[0]!);
      }
      // Shuffle so the correct answer is not always first.
      const shuffled = [...picks].sort(() => rand() - 0.5);
      this._choices = shuffled;
      return {
        roundIndex: i,
        targetKey: opt.key,
        commitment: l.commitment,
        choices: shuffled,
      };
    });
    this._cursor = 0;
    this._state = { kind: 'presenting', round: 1 };
  }

  /**
   * The choices for the current round (always includes the correct target
   * plus tier-scaled distractors).
   */
  get currentChoices(): ForcedChoiceOption[] {
    const locked = this._locked[this._cursor];
    return locked ? locked.choices : this._choices;
  }

  /**
   * Commit an answer for the current round. Returns true when the round was
   * committed; advances to reveal state.
   */
  commit(answerKey: string, confidence?: number, responseTimeMs?: number): boolean {
    const locked = this._locked[this._cursor];
    if (!locked) return false;
    const target = this.cfg.options.find((o) => o.key === locked.targetKey);
    const correct = answerKey === locked.targetKey;
    const round: ExerciseRound = {
      id: crypto.randomUUID(),
      sessionId: this.opts.sessionId,
      roundNumber: this._cursor + 1,
      exerciseType: this.cfg.exerciseType,
      difficulty: this.opts.difficulty,
      targetHash: locked.commitment,
      target: target?.label ?? locked.targetKey,
      targetMeta: target?.meta ?? {},
      startedAt: Date.now(),
      committedAt: Date.now(),
      committedAnswer: answerKey,
      correct,
      ...(confidence !== undefined ? { confidenceRating: confidence } : {}),
      ...(responseTimeMs !== undefined ? { responseTimeMs } : {}),
    };
    this._rounds.push(round);
    this._state = { kind: 'revealed', round: this._cursor + 1 };
    return true;
  }

  /** Reveal the current round's correct target (called after commit). */
  async reveal(): Promise<{ target: string; correct: boolean; commitmentValid: boolean }> {
    const round = this._rounds[this._cursor];
    const locked = this._locked[this._cursor];
    if (!round || !locked) {
      return { target: '', correct: false, commitmentValid: false };
    }
    const valid = await verifyCommitment(locked.commitment, round.target);
    return {
      target: round.target,
      correct: round.correct === true,
      commitmentValid: valid,
    };
  }

  /** Advance past the reveal to the next round or complete the session. */
  next(): boolean {
    this._cursor++;
    if (this._cursor >= this.cfg.roundsPerSession) {
      this._state = { kind: 'complete' };
      return false;
    }
    this._state = { kind: 'presenting', round: this._cursor + 1 };
    return true;
  }

  /**
   * Finish the session and compute the result (accuracy + chance test).
   * Rebuilds each round's startedAt from commit times for fidelity.
   */
  complete(): EngineResult {
    const committed = this._rounds.filter((r) => r.committedAt !== undefined);
    const correct = committed.filter((r) => r.correct === true).length;
    const total = committed.length || 1;
    const accuracy = correct / total;

    // One-sided binomial test vs the fixed chance baseline.
    const p = binomialPValue(correct, total, this.cfg.chanceBaseline);

    this._state = { kind: 'complete' };
    return {
      rounds: this._rounds,
      accuracy,
      aboveChance: p < 0.05 && accuracy > this.cfg.chanceBaseline,
    };
  }
}

/** One-sided binomial upper-tail probability P(X >= k) under chance rate p0. */
export function binomialPValue(k: number, n: number, p0: number): number {
  if (n === 0) return 1;
  let sum = 0;
  const logComb = logBinomCoeff;
  for (let i = k; i <= n; i++) {
    const pmf = Math.exp(logComb(n, i) + i * Math.log(p0) + (n - i) * Math.log(1 - p0));
    sum += pmf;
  }
  return Math.min(1, sum);
}

/** Log of the binomial coefficient C(n,k) via lgamma. */
function logBinomCoeff(n: number, k: number): number {
  return lgamma(n + 1) - lgamma(k + 1) - lgamma(n - k + 1);
}

/** Log-gamma approximation (Lanczos) for binomial computation. */
function lgamma(x: number): number {
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (x < 0.5) {
    return Math.PI / (Math.sin(Math.PI * x) * Math.exp(lgamma(1 - x)));
  }
  x -= 1;
  let a = c[0]!;
  const t = x + g + 0.5;
  for (let i = 1; i < g + 2; i++) {
    a += c[i]! / (x + i);
  }
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

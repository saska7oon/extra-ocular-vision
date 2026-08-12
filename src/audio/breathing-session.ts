/**
 * Breathing session state machine — pure, React-independent logic.
 *
 * The machine computes, for a given elapsed time, the current phase of the
 * cardiac-coherence breathing cycle:
 *
 *   inhale 5s -> (hold 0s) -> exhale 5s -> (rest of cycle) -> repeat
 *
 * A full set = N breath cycles. A session = M sets with rests between sets.
 *
 * Keeping this pure (no DOM / no AudioContext) makes it unit-testable with
 * deterministic time inputs.
 */
import type { BreathingConfig } from '../features/phase0/types';

export type BreathPhase = 'inhale' | 'exhale' | 'set-rest' | 'session-complete';

export interface BreathCycle {
  /** 0-based index of the cycle within the current set. */
  readonly cycleIndex: number;
  /** The active phase name. */
  readonly phase: BreathPhase;
  /** Time remaining in this phase (seconds, floored to ms). */
  readonly timeRemaining: number;
  /** Fraction of the phase completed (0..1). */
  readonly phaseProgress: number;
  /** 0-based set index. */
  readonly setIndex: number;
  /** Total sets in the session. */
  readonly totalSets: number;
  /** 1-based cycle number within the set, for display. */
  readonly cycleNumber: number;
  /** Human-readable instruction for this phase. */
  readonly instruction: string;
  /** Whether this is the final cycle of the final set. */
  readonly isLastCycleOfLastSet: boolean;
}

export const BREATH_INHALE = 'inhale' as const;
export const BREATH_EXHALE = 'exhale' as const;
export const SET_REST = 'set-rest' as const;
export const SESSION_COMPLETE = 'session-complete' as const;

/**
 * A single breath cycle is: inhale + exhale (hold is 0 in coherence breathing).
 * So cycle duration = inhale + exhale seconds.
 */
function cycleDuration(cfg: BreathingConfig): number {
  return cfg.inhaleSeconds + cfg.exhaleSeconds;
}

/**
 * Total session duration including inter-set rests.
 * Formula: sets * (cycles * cycleDur) + (sets-1) * setRest
 */
function sessionTotalSeconds(cfg: BreathingConfig): number {
  return (
    cfg.setsPerSession * cfg.cyclesPerSet * cycleDuration(cfg) +
    (cfg.setsPerSession - 1) * cfg.setRestSeconds
  );
}

/**
 * Compute the breath phase for a given elapsed session time.
 *
 * Session layout (per config):
 *   [set 0: cycle0, cycle1, ..., cycleN-1] [rest] ... [set M-1]
 *
 * Boundaries are handled with half-open intervals so adjacent phases tile
 * without gaps or overlaps:
 *   - A set occupies [setStart, setStart + setWork)
 *   - The rest after a set occupies [setStart + setWork, setStart + setWork + rest)
 *
 * @param elapsedSec seconds elapsed since session start (can exceed total).
 * @returns a BreathCycle describing the current phase.
 */
export function computeBreathPhase(
  elapsedSec: number,
  cfg: BreathingConfig,
): BreathCycle {
  const total = sessionTotalSeconds(cfg);

  if (elapsedSec >= total) {
    return completeState(cfg);
  }

  const setWork = cfg.cyclesPerSet * cycleDuration(cfg);
  const setStride = setWork + cfg.setRestSeconds; // one full set + following rest (except last set has no rest)

  // Determine which set+rest block we're in.
  let setIndex = 0;
  let cursor = elapsedSec;
  while (setIndex < cfg.setsPerSession - 1 && cursor >= setStride) {
    cursor -= setStride;
    setIndex++;
  }

  // Are we inside the inter-set rest for the current set?
  // Rest only exists after non-final sets.
  const setEnd = setWork;
  if (setIndex < cfg.setsPerSession - 1 && cursor >= setEnd) {
    // In the rest window.
    const restElapsed = cursor - setEnd;
    const remaining = cfg.setRestSeconds - restElapsed;
    return {
      cycleIndex: cfg.cyclesPerSet - 1,
      phase: SET_REST,
      timeRemaining: Math.max(0, remaining),
      phaseProgress: restElapsed / cfg.setRestSeconds,
      setIndex,
      totalSets: cfg.setsPerSession,
      cycleNumber: cfg.cyclesPerSet,
      instruction: 'Rest between sets. Breathe naturally.',
      isLastCycleOfLastSet: false,
    };
  }

  // Inside a set: locate the cycle.
  const cyc = cycleDuration(cfg);
  const cycleIndex = Math.floor(cursor / cyc);
  if (cycleIndex >= cfg.cyclesPerSet) {
    // Shouldn't happen given the >= total guard, but clamp defensively.
    return completeState(cfg);
  }
  const timeInCycle = cursor - cycleIndex * cyc;
  const isLastCycle = cycleIndex === cfg.cyclesPerSet - 1;
  const isLastCycleOfLastSet = isLastCycle && setIndex === cfg.setsPerSession - 1;

  if (timeInCycle < cfg.inhaleSeconds) {
    return {
      cycleIndex,
      phase: INHALE,
      timeRemaining: cfg.inhaleSeconds - timeInCycle,
      phaseProgress: timeInCycle / cfg.inhaleSeconds,
      setIndex,
      totalSets: cfg.setsPerSession,
      cycleNumber: cycleIndex + 1,
      instruction: 'Inhale slowly...',
      isLastCycleOfLastSet,
    };
  }

  const exhaleTime = timeInCycle - cfg.inhaleSeconds;
  return {
    cycleIndex,
    phase: EXHALE,
    timeRemaining: cfg.exhaleSeconds - exhaleTime,
    phaseProgress: exhaleTime / cfg.exhaleSeconds,
    setIndex,
    totalSets: cfg.setsPerSession,
    cycleNumber: cycleIndex + 1,
    instruction: 'Exhale fully...',
    isLastCycleOfLastSet,
  };
}

/** Terminal state returned at/after the end of the session. */
function completeState(cfg: BreathingConfig): BreathCycle {
  return {
    cycleIndex: cfg.cyclesPerSet - 1,
    phase: SESSION_COMPLETE,
    timeRemaining: 0,
    phaseProgress: 1,
    setIndex: cfg.setsPerSession - 1,
    totalSets: cfg.setsPerSession,
    cycleNumber: cfg.cyclesPerSet,
    instruction: 'Well done — session complete.',
    isLastCycleOfLastSet: true,
  };
}

export const INHALE = BREATH_INHALE;
export const EXHALE = BREATH_EXHALE;

/**
 * Derive the current "breath progress" (0..1) for the visual circle animation.
 * Inhale expands (0 -> 1), exhale collapses (1 -> 0). Set-rest is neutral (0).
 */
export function breathAnimationScale(cycle: BreathCycle): number {
  switch (cycle.phase) {
    case INHALE:
      return cycle.phaseProgress;
    case EXHALE:
      return 1 - cycle.phaseProgress;
    case SET_REST:
    case SESSION_COMPLETE:
      return 0;
  }
}

/** Convenience: total session seconds for a config. */
export function breathSessionDuration(cfg: BreathingConfig): number {
  return sessionTotalSeconds(cfg);
}

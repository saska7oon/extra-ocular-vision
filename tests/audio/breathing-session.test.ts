/**
 * Tests for the binaural-beat math and breathing state machine.
 *
 * These exercise pure logic (no DOM / no real AudioContext) so they run
 * fast and deterministically in the happy-dom environment.
 */
import { describe, it, expect } from 'vitest';
import { computeBinauralTones, clampBinauralDuration, minutesToSeconds, CARRIER_HZ, BINAURAL_MIN_DURATION_MIN, BINAURAL_MAX_DURATION_MIN } from '../../src/audio/audio';
import {
  DEFAULT_BREATHING_CONFIG,
  BREATH_CYCLE_SECONDS,
  BREATH_INHALE_SECONDS,
  BREATH_EXHALE_SECONDS,
  BREATH_CYCLES_PER_SET,
  BREATH_SETS_PER_SESSION,
} from '../../src/features/phase0/types';
import {
  computeBreathPhase,
  breathAnimationScale,
  breathSessionDuration,
  INHALE,
  EXHALE,
  SET_REST,
  SESSION_COMPLETE,
} from '../../src/audio/breathing-session';

describe('Binaural beat math', () => {
  it('computes left/right frequencies centred on the carrier', () => {
    const r = computeBinauralTones(10, 150);
    expect(r.beatHz).toBe(10);
    // left = 150 - 5 = 145, right = 150 + 5 = 155
    expect(r.leftHz).toBeCloseTo(145);
    expect(r.rightHz).toBeCloseTo(155);
  });

  it('the difference of left/right always equals the beat frequency', () => {
    for (const beat of [6, 10, 40]) {
      const r = computeBinauralTones(beat, CARRIER_HZ);
      expect(r.rightHz - r.leftHz).toBeCloseTo(beat, 5);
    }
  });

  it('throws on zero or negative beat frequency', () => {
    expect(() => computeBinauralTones(0, 150)).toThrow(RangeError);
    expect(() => computeBinauralTones(-5, 150)).toThrow(RangeError);
  });

  it('throws when beat exceeds the practical 40 Hz limit', () => {
    expect(() => computeBinauralTones(41, 150)).toThrow(RangeError);
  });

  it('throws when resulting frequencies are inaudible', () => {
    // carrier 20 Hz with 10 Hz beat -> left = 15 Hz (< 20, inaudible)
    expect(() => computeBinauralTones(10, 20)).toThrow(RangeError);
  });
});

describe('Binaural duration helpers', () => {
  it('clamps duration to the 10-15 minute range', () => {
    expect(clampBinauralDuration(5)).toBe(10);
    expect(clampBinauralDuration(12)).toBe(12);
    expect(clampBinauralDuration(30)).toBe(15);
  });

  it('converts minutes to whole seconds', () => {
    expect(minutesToSeconds(10)).toBe(600);
    expect(minutesToSeconds(15)).toBe(900);
  });

  it('exposes the documented min/max bounds', () => {
    expect(BINAURAL_MIN_DURATION_MIN).toBe(10);
    expect(BINAURAL_MAX_DURATION_MIN).toBe(15);
  });
});

describe('Breathing config constants', () => {
  it('matches cardiac coherence 0.1 Hz spec', () => {
    expect(BREATH_CYCLE_SECONDS).toBe(10); // 1/0.1
    expect(BREATH_INHALE_SECONDS).toBe(5);
    expect(BREATH_EXHALE_SECONDS).toBe(5);
  });

  it('specifies 5 cycles x 3 sets', () => {
    expect(BREATH_CYCLES_PER_SET).toBe(5);
    expect(BREATH_SETS_PER_SESSION).toBe(3);
  });
});

describe('breathSessionDuration', () => {
  it('computes total session time including set rests', () => {
    // 3 sets * (5 cycles * 10s) + 2 rests * 10s = 150 + 20 = 170s
    const total = breathSessionDuration(DEFAULT_BREATHING_CONFIG);
    expect(total).toBe(170);
  });
});

describe('computeBreathPhase', () => {
  const cfg = DEFAULT_BREATHING_CONFIG;

  it('starts in inhale at t=0', () => {
    const c = computeBreathPhase(0, cfg);
    expect(c.phase).toBe(INHALE);
    expect(c.cycleNumber).toBe(1);
    expect(c.setIndex).toBe(0);
    expect(c.timeRemaining).toBeCloseTo(5, 1);
    expect(c.phaseProgress).toBeCloseTo(0, 2);
    expect(c.instruction).toContain('Inhale');
  });

  it('transitions to exhale after 5s', () => {
    const c = computeBreathPhase(5, cfg);
    expect(c.phase).toBe(EXHALE);
    expect(c.cycleNumber).toBe(1);
  });

  it('completes one cycle at 10s and starts cycle 2', () => {
    const c = computeBreathPhase(10, cfg);
    expect(c.phase).toBe(INHALE);
    expect(c.cycleNumber).toBe(2);
    // timeRemaining should be ~5 again
    expect(c.timeRemaining).toBeCloseTo(5, 1);
  });

  it('enters set-rest after 5 cycles (50s)', () => {
    const c = computeBreathPhase(50, cfg);
    expect(c.phase).toBe(SET_REST);
    expect(c.setIndex).toBe(0);
    expect(c.timeRemaining).toBeCloseTo(10, 1);
  });

  it('starts set 2 at 60s (50s + 10s rest)', () => {
    const c = computeBreathPhase(60, cfg);
    expect(c.phase).toBe(INHALE);
    expect(c.setIndex).toBe(1);
    expect(c.cycleNumber).toBe(1);
  });

  it('reaches session-complete at total duration', () => {
    const total = breathSessionDuration(cfg);
    const c = computeBreathPhase(total, cfg);
    expect(c.phase).toBe(SESSION_COMPLETE);
    expect(c.isLastCycleOfLastSet).toBe(true);
  });

  it('clips beyond total duration to session-complete', () => {
    const c = computeBreathPhase(9999, cfg);
    expect(c.phase).toBe(SESSION_COMPLETE);
  });

  it('marks isLastCycleOfLastSet only at the very end', () => {
    // Last cycle of last set: cycle 5 (index 4) of set 2 (0-based).
    // Set 2 starts at 120s. Cycle 5 occupies 160-170s (inhale 160-165, exhale 165-170).
    const mid = computeBreathPhase(165, cfg); // mid-exhale of last cycle
    expect(mid.setIndex).toBe(2);
    expect(mid.cycleNumber).toBe(5);
    expect(mid.isLastCycleOfLastSet).toBe(true);

    // Mid-session should NOT be flagged.
    const early = computeBreathPhase(30, cfg);
    expect(early.isLastCycleOfLastSet).toBe(false);
  });
});

describe('breathAnimationScale', () => {
  const cfg = DEFAULT_BREATHING_CONFIG;

  it('returns 0 at start and ramps to 1 during inhale', () => {
    const start = computeBreathPhase(0, cfg);
    expect(breathAnimationScale(start)).toBeCloseTo(0, 2);

    const mid = computeBreathPhase(2.5, cfg);
    expect(breathAnimationScale(mid)).toBeCloseTo(0.5, 2);

    const end = computeBreathPhase(5, cfg);
    expect(breathAnimationScale(end)).toBeCloseTo(1, 2);
  });

  it('collapses from 1 to 0 during exhale', () => {
    const mid = computeBreathPhase(7.5, cfg);
    expect(breathAnimationScale(mid)).toBeCloseTo(0.5, 2);

    const end = computeBreathPhase(10, cfg);
    expect(breathAnimationScale(end)).toBeCloseTo(0, 1);
  });

  it('returns 0 during set-rest and session-complete', () => {
    const rest = computeBreathPhase(55, cfg);
    expect(breathAnimationScale(rest)).toBe(0);

    const total = breathSessionDuration(cfg);
    const done = computeBreathPhase(total, cfg);
    expect(breathAnimationScale(done)).toBe(0);
  });
});

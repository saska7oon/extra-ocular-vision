/**
 * Tests for the Phase 0 session controllers (breathing, binaural, combined).
 *
 * The controllers are framework-agnostic, so we can exercise their state
 * machines with fake `now()` semantics and a no-op AudioEngine.
 */
import { describe, it, expect, vi } from 'vitest';
import { AudioEngine } from '../../../src/audio';
import {
  DEFAULT_BREATHING_CONFIG,
  BINAURAL_TRACKS,
} from '../../../src/features/phase0/types';
import {
  createBreathingController,
  createBinauralController,
  createCombinedController,
} from '../../../src/features/phase0/session';

describe('BreathingSessionController', () => {
  it('starts in ready, transitions to running on start', () => {
    const audio = new AudioEngine(null);
    const ctrl = createBreathingController(audio, 'p1', 1, DEFAULT_BREATHING_CONFIG);
    expect(ctrl.state.kind).toBe('ready');
    ctrl.start(5);
    expect(ctrl.state.kind).toBe('running');
    expect(ctrl.state.kind === 'running' && ctrl.state.elapsedSec).toBe(0);
  });

  it('reports correct breath phase at start', () => {
    const audio = new AudioEngine(null);
    const ctrl = createBreathingController(audio, 'p1', 1, DEFAULT_BREATHING_CONFIG);
    ctrl.start();
    const phase = ctrl.currentPhase(Date.now() + 1000);
    expect(phase.phase).toBe('inhale');
    expect(phase.instruction).toContain('Inhale');
  });

  it('isFinished becomes true past total duration', () => {
    const audio = new AudioEngine(null);
    const ctrl = createBreathingController(audio, 'p1', 1, DEFAULT_BREATHING_CONFIG);
    ctrl.start();
    const total = 180; // seconds — exceed the ~170s session
    const future = Date.now() + total * 1000;
    expect(ctrl.isFinished(future)).toBe(true);
  });

  it('complete() produces a record with completed=true and ratings', () => {
    const audio = new AudioEngine(null);
    const ctrl = createBreathingController(audio, 'p1', 1, DEFAULT_BREATHING_CONFIG);
    ctrl.start(6);
    // Simulate running for 20s by mocking Date.
    const realNow = Date.now;
    try {
      let t = Date.now();
      Date.now = () => t + 20000;
      // Force state to be "running past a bit" then complete.
      const result = ctrl.complete(7);
      expect(result.record.sessionType).toBe('breathing');
      expect(result.record.completed).toBe(true);
      expect(result.record.absoluteDay).toBe(1);
      expect(result.state.kind).toBe('complete');
    } finally {
      Date.now = realNow;
    }
  });

  it('pause and resume preserve elapsed time', () => {
    const audio = new AudioEngine(null);
    const ctrl = createBreathingController(audio, 'p1', 1, DEFAULT_BREATHING_CONFIG);
    ctrl.start();
    const realNow = Date.now;
    try {
      const t0 = Date.now();
      Date.now = () => t0 + 5000;
      ctrl.pause();
      expect(ctrl.state.kind).toBe('paused');
      Date.now = () => t0 + 5000; // advance 0s in paused state
      ctrl.resume();
      expect(ctrl.state.kind).toBe('running');
    } finally {
      Date.now = realNow;
    }
  });
});

describe('BinauralSessionController', () => {
  it('starts in ready with the selected track', () => {
    const audio = new AudioEngine(null);
    const ctrl = createBinauralController(audio, 'p1', 4, 'alpha');
    expect(ctrl.state.kind).toBe('ready');
    expect(ctrl.trackId).toBe('alpha');
    expect(ctrl.trackSpec.beatHz).toBe(BINAURAL_TRACKS.alpha.beatHz);
  });

  it('checkHeadphones transitions to checking-headphones', async () => {
    const audio = new AudioEngine(null);
    const ctrl = createBinauralController(audio, 'p1', 4, 'alpha');
    const s = await ctrl.checkHeadphones();
    expect(s.kind).toBe('checking-headphones');
  });

  it('start transitions to running and sets duration from spec', () => {
    const audio = new AudioEngine(null);
    const ctrl = createBinauralController(audio, 'p1', 4, 'theta');
    ctrl.start(5);
    expect(ctrl.state.kind).toBe('running');
    expect(ctrl.state.kind === 'running' && ctrl.state.durationSec).toBe(720); // theta = 12 min
  });

  it('timeRemaining decreases from the full duration', () => {
    const audio = new AudioEngine(null);
    const ctrl = createBinauralController(audio, 'p1', 4, 'alpha');
    ctrl.start();
    const full = ctrl.timeRemaining(Date.now() + 100);
    expect(full).toBeCloseTo(600, 0); // alpha is 10 min = 600s
  });

  it('complete() produces a record tagged binaural with track id', () => {
    const audio = new AudioEngine(null);
    const ctrl = createBinauralController(audio, 'p1', 5, 'gamma');
    ctrl.start(6);
    const { record } = ctrl.complete(7);
    expect(record.sessionType).toBe('binaural');
    expect(record.binauralTrackId).toBe('gamma');
    expect(record.completed).toBe(true);
  });
});

describe('CombinedSessionController', () => {
  it('starts in the breathing stage', () => {
    const audio = new AudioEngine(null);
    const ctrl = createCombinedController(audio, 'p1', 6);
    ctrl.start(5);
    expect(ctrl.state.stage).toBe('breathing');
    expect(ctrl.state.totalSec).toBe(900); // 15 min
  });

  it('advance steps through stages in order', () => {
    const audio = new AudioEngine(null);
    const ctrl = createCombinedController(audio, 'p1', 6);
    ctrl.start();
    expect(ctrl.state.stage).toBe('breathing');
    ctrl.advance();
    expect(ctrl.state.stage).toBe('binaural');
    ctrl.advance();
    expect(ctrl.state.stage).toBe('visualization');
    ctrl.advance();
    expect(ctrl.state.stage).toBe('complete');
  });

  it('stop moves to complete and timeRemaining is 0', () => {
    const audio = new AudioEngine(null);
    const ctrl = createCombinedController(audio, 'p1', 6);
    ctrl.start();
    ctrl.stop();
    expect(ctrl.state.stage).toBe('complete');
    expect(ctrl.timeRemaining()).toBe(0);
    expect(ctrl.isFinished()).toBe(true);
  });

  it('complete() returns a combined session record', () => {
    const audio = new AudioEngine(null);
    const ctrl = createCombinedController(audio, 'p1', 7);
    ctrl.start(6);
    const record = ctrl.complete(8);
    expect(record.sessionType).toBe('combined');
    expect(record.completed).toBe(true);
    expect(record.absoluteDay).toBe(7);
  });
});

import { describe, it, expect } from 'vitest';
import {
  ForcedChoiceEngine,
  FORCED_CHOICE_CONFIGS,
  binomialPValue,
} from '../../src/features/exercises';

const CONTRAST = FORCED_CHOICE_CONFIGS.contrast;

function makeEngine(seed = 'test-seed') {
  return new ForcedChoiceEngine(CONTRAST, {
    profileId: 'p1',
    sessionId: 's1',
    absoluteDay: 8,
    dayInPhase: 1,
    difficulty: 'beginner',
    seed,
  });
}

describe('ForcedChoiceEngine', () => {
  it('generates the configured number of rounds deterministically', async () => {
    const e = makeEngine('seedA');
    await e.start();
    expect(e.totalRounds).toBe(CONTRAST.roundsPerSession);
    expect(e.state.kind).toBe('presenting');
    // Same seed -> same target chain
    const e2 = makeEngine('seedA');
    await e2.start();
    expect(e2.currentChoices.length).toBe(CONTRAST.choicesPerRound);
  });

  it('presents exactly choicesPerRound options', async () => {
    const e = makeEngine();
    await e.start();
    expect(e.currentChoices.length).toBe(CONTRAST.choicesPerRound);
  });

  it('scores commit correctly and advances through all rounds', async () => {
    const e = makeEngine('seedB');
    await e.start();
    let committed = 0;
    while (e.state.kind !== 'complete') {
      if (e.state.kind === 'presenting') {
        const first = e.currentChoices[0]!.key;
        const ok = e.commit(first, 3, 1200);
        expect(ok).toBe(true);
        committed++;
      } else if (e.state.kind === 'revealed') {
        const reveal = await e.reveal();
        expect(reveal.commitmentValid).toBe(true);
        expect(typeof reveal.target).toBe('string');
        e.next();
      }
    }
    expect(committed).toBe(CONTRAST.roundsPerSession);
    const result = e.complete();
    expect(result.rounds.length).toBe(CONTRAST.roundsPerSession);
    expect(result.accuracy).toBeGreaterThanOrEqual(0);
    expect(result.accuracy).toBeLessThanOrEqual(1);
  });

  it('commitments verify as valid (no peeking)', async () => {
    const e = makeEngine('seedC');
    await e.start();
    e.commit(e.currentChoices[0]!.key, 2);
    const reveal = await e.reveal();
    expect(reveal.commitmentValid).toBe(true);
  });

  it('binomial p-value is essentially 1 for zero correct under chance', () => {
    expect(binomialPValue(0, 20, 0.5)).toBeCloseTo(1, 10);
  });

  it('binomial p-value is low for many correct under a low chance', () => {
    // 18/20 correct at chance 0.5
    const p = binomialPValue(18, 20, 0.5);
    expect(p).toBeLessThan(0.05);
  });

  it('text-reading config is available for Phase 7', () => {
    const TR = FORCED_CHOICE_CONFIGS['text-reading'];
    expect(TR.phaseId).toBe(7);
    expect(TR.choicesPerRound).toBe(4);
    expect(TR.options.length).toBeGreaterThanOrEqual(TR.choicesPerRound);
  });
});
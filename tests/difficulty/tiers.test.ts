import { describe, it, expect } from 'vitest';
import {
  choicesAtTier,
  chanceAtTier,
  nextTier,
  TIER_ORDER,
} from '../../src/features/difficulty/tiers';

describe('difficulty tiers', () => {
  it('orders tiers beginner -> expert', () => {
    expect(TIER_ORDER).toEqual([
      'beginner',
      'elementary',
      'intermediate',
      'advanced',
      'expert',
    ]);
  });

  it('scales choice count with tier', () => {
    // min 2, pool 10: expert = 2 + 4 = 6
    expect(choicesAtTier('beginner', 2, 10)).toBe(2);
    expect(choicesAtTier('expert', 2, 10)).toBe(6);
    // Never exceeds pool size
    expect(choicesAtTier('expert', 4, 4)).toBe(4);
  });

  it('chance baseline drops as tier rises', () => {
    expect(chanceAtTier('beginner', 2, 10)).toBeCloseTo(0.5, 5);
    expect(chanceAtTier('expert', 2, 10)).toBeCloseTo(1 / 6, 5);
  });

  it('advances only after 3 consecutive high-accuracy sessions', () => {
    expect(nextTier('beginner', [0.9, 0.85, 0.95])).toBe('elementary');
    // Not enough sessions yet
    expect(nextTier('beginner', [0.9, 0.9])).toBe('beginner');
    // Mixed results -> no change
    expect(nextTier('beginner', [0.9, 0.5, 0.9])).toBe('beginner');
  });

  it('reverts after 3 consecutive low-accuracy sessions', () => {
    expect(nextTier('expert', [0.5, 0.4, 0.55])).toBe('advanced');
  });

  it('stays at the max tier after advancing', () => {
    expect(nextTier('expert', [0.9, 0.95, 0.85])).toBe('expert');
  });
});
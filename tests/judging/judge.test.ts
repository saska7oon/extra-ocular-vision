import { describe, it, expect } from 'vitest';
import {
  judgeFreeResponse,
  scoreTemplate,
  tokenize,
  computeIdfWeights,
} from '../../src/features/judging';
import type { TemplateEntry } from '../../src/types';

function tpl(id: string, label: string, keywords: string[], aliases: string[] = []): TemplateEntry {
  return {
    id,
    profileId: 'builtin',
    category: 'objects',
    label,
    keywords,
    weight: 1,
    aliases,
    isCustom: false,
    createdAt: 0,
  };
}

const RED = tpl('red', 'Red Apple', ['apple', 'red']);
const BANANA = tpl('banana', 'Banana', ['banana', 'yellow']);
const MOON = tpl('moon', 'Crescent Moon', ['moon', 'crescent']);

const TEMPLATES = [RED, BANANA, MOON];

describe('tokenize', () => {
  it('lowercases and strips punctuation', () => {
    expect(tokenize('A Red, APPLE!')).toEqual(['a', 'red', 'apple']);
  });
});

describe('judgeFreeResponse', () => {
  it('scores a correct description high with transparent breakdown', () => {
    const result = judgeFreeResponse('I sense a red apple', RED, TEMPLATES, 'tfidf');
    expect(result.rawScore).toBeCloseTo(1, 5);
    expect(result.matchedKeywords.sort()).toEqual(['apple', 'red']);
    expect(result.missingKeywords).toEqual([]);
    expect(result.chanceAdjustedScore).toBeGreaterThan(0.5);
  });

  it('scores a wrong description low', () => {
    const result = judgeFreeResponse('I see a yellow banana', RED, TEMPLATES, 'tfidf');
    expect(result.rawScore).toBe(0);
    expect(result.chanceAdjustedScore).toBe(0);
  });

  it('uses aliases as matches', () => {
    const withAlias = { ...RED, aliases: ['fruit'] };
    const result = judgeFreeResponse('I sense a fruit', withAlias, [withAlias, BANANA, MOON], 'string-match');
    expect(result.matchedKeywords).toContain('apple');
    expect(result.breakdown).toContain('fruit');
  });

  it('discounts vague catch-all answers that match many targets', () => {
    // "soft and round" is generic enough to be penalized against multiple targets.
    const result = judgeFreeResponse('soft and round object', RED, TEMPLATES, 'tfidf');
    expect(result.chanceAdjustedScore).toBeLessThanOrEqual(result.rawScore);
  });

  it('computes idf so shared keywords down-weight', () => {
    const shared = tpl('x', 'X', ['red', 'common']);
    const solo = tpl('y', 'Y', ['scarlet']);
    const weights = computeIdfWeights([RED, BANANA, shared, solo]);
    const redW = weights.get('red')!;
    const scarW = weights.get('scarlet')!;
    expect(scarW).toBeGreaterThan(redW); // solo keyword more discriminative
  });
});
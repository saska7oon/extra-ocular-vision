import { describe, it, expect } from 'vitest';
import { clsx } from '../../src/utils/clsx';

describe('clsx utility', () => {
  it('concatenates string classes', () => {
    expect(clsx('btn', 'btn-primary')).toBe('btn btn-primary');
  });

  it('filters falsy values', () => {
    expect(clsx('btn', false, 'btn-primary', undefined, null, 0)).toBe(
      'btn btn-primary',
    );
  });

  it('supports object syntax', () => {
    expect(clsx('btn', { 'is-active': true, 'is-loading': false })).toBe(
      'btn is-active',
    );
  });

  it('returns empty string for all falsy input', () => {
    expect(clsx(false, undefined, null, 0)).toBe('');
  });

  it('handles mixed string and object input', () => {
    expect(clsx('a', 'b', { c: true, d: false })).toBe('a b c');
  });
});

/**
 * Tests for the crypto utilities — SHA-256 commit-before-reveal and the
 * seeded PRNG used for reproducible target selection.
 */
import { describe, it, expect } from 'vitest';
import {
  fnv1a,
  createPRNG,
  randomSeed,
  sha256Hex,
  commitTarget,
  verifyCommitment,
  generateLockedTargets,
  pickTarget,
} from '../../src/utils/crypto';

describe('seeded PRNG', () => {
  it('is deterministic for the same seed', () => {
    const a = createPRNG('seed-1');
    const b = createPRNG('seed-1');
    const seqA = [a(), a(), a()];
    const seqB = [b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });

  it('produces values in [0, 1)', () => {
    const rand = createPRNG('seed-2');
    for (let i = 0; i < 100; i++) {
      const v = rand();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('differs for different seeds', () => {
    const a = createPRNG('seed-x');
    const b = createPRNG('seed-y');
    expect([a(), a()]).not.toEqual([b(), b()]);
  });

  it('fnv1a is deterministic and unsigned', () => {
    const h = fnv1a('hello world');
    expect(h).toBe(fnv1a('hello world'));
    expect(h).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(h)).toBe(true);
  });
});

describe('randomSeed', () => {
  it('returns a non-empty hex string', () => {
    const s = randomSeed();
    expect(s.length).toBeGreaterThan(0);
    expect(s).toMatch(/^[0-9a-f]+$/);
  });

  it('produces different values across calls', () => {
    const a = randomSeed();
    const b = randomSeed();
    expect(a).not.toBe(b);
  });
});

describe('SHA-256 commitment', () => {
  it('sha256Hex is deterministic and 64 hex chars', async () => {
    const a = await sha256Hex('black');
    const b = await sha256Hex('black');
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it('commitTarget produces salt:hash and verifies', async () => {
    const c = await commitTarget('black', 'fixed-salt');
    expect(c.startsWith('fixed-salt:')).toBe(true);
    expect(c.length).toBeGreaterThan('fixed-salt:'.length);
    const ok = await verifyCommitment(c, 'black');
    expect(ok).toBe(true);
  });

  it('verifyCommitment fails for a wrong target', async () => {
    const c = await commitTarget('black', 'fixed-salt');
    const ok = await verifyCommitment(c, 'white');
    expect(ok).toBe(false);
  });

  it('commitments differ when salt differs', async () => {
    const a = await commitTarget('black', 'salt-1');
    const b = await commitTarget('black', 'salt-2');
    expect(a).not.toBe(b);
  });
});

describe('generateLockedTargets', () => {
  it('generates the requested number of locked targets', async () => {
    const chain = await generateLockedTargets('seed-1', ['black', 'white'], 12, () => 's');
    expect(chain).toHaveLength(12);
    for (const t of chain) {
      expect(t.target).toMatch(/^(black|white)$/);
      expect(t.commitment.startsWith('s:')).toBe(true);
    }
  });

  it('is reproducible from the same seed', async () => {
    const a = await generateLockedTargets('seed-A', ['black', 'white'], 12, () => 'x');
    const b = await generateLockedTargets('seed-A', ['black', 'white'], 12, () => 'x');
    expect(a.map((t) => t.target)).toEqual(b.map((t) => t.target));
  });

  it('yields different target sequences for different seeds', async () => {
    const a = await generateLockedTargets('seed-A', ['black', 'white'], 12, () => 'x');
    const b = await generateLockedTargets('seed-B', ['black', 'white'], 12, () => 'x');
    expect(a.map((t) => t.target)).not.toEqual(b.map((t) => t.target));
  });

  it('returns empty for empty options', async () => {
    expect(await generateLockedTargets('s', [], 12)).toEqual([]);
  });
});

describe('pickTarget', () => {
  it('picks deterministically within bounds', () => {
    const rand = createPRNG('p');
    const options = ['black', 'white'];
    for (let i = 0; i < 50; i++) {
      const v = pickTarget(rand, options);
      expect(options).toContain(v);
    }
  });
});

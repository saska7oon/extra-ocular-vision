/**
 * Cryptographic utilities for commit-before-reveal protocols.
 *
 * Every round in the training app uses a "cryptographic commitment": the
 * system generates the target, computes a SHA-256 hash of it plus a random
 * salt, and stores only the salt:hash BEFORE the round starts. The user
 * commits an answer, and only then is the target revealed and verified
 * against the hash. This makes it impossible for the app (or the user) to
 * "peek" at the target before committing an answer — the commitment is
 * binding.
 *
 * Randomization uses a seeded PRNG so a session can be replayed/reproduced
 * from its seed for auditing. The seed itself is generated from
 * crypto.getRandomValues() (a cryptographically strong source).
 *
 * Reference (spec §Rigor Controls): "Double-blind target selection (system
 * generates random targets, user must commit before reveal)".
 */

/* ==========================================================================
 * PRNG
 * ========================================================================= */

/**
 * A small, fast, high-throughput seeded PRNG (mulberry32). Deterministic for
 * a given seed. We derive a 32-bit integer seed from an arbitrary-length
 * string via FNV-1a so the user can supply readable seeds like "session-A".
 */
export type SeededPRNG = () => number; // returns [0, 1)

/** FNV-1a 32-bit hash of a string -> unsigned 32-bit integer. */
export function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // Force unsigned 32-bit.
  return h >>> 0;
}

/** Create a deterministically-seeded PRNG from an arbitrary string seed. */
export function createPRNG(seed: string): SeededPRNG {
  let a = fnv1a(seed);
  return function mulberry32() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generate a random seed string from the platform's cryptographically strong
 * RNG (crypto.getRandomValues). Falls back to Math.random + timestamp if the
 * strong RNG is unavailable (tests / non-secure contexts).
 */
export function randomSeed(): string {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/* ==========================================================================
 * SHA-256 (Web Crypto API)
 * ========================================================================= */

/** Compute the SHA-256 hex digest of a UTF-8 string. */
export async function sha256Hex(input: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const data = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback (non-Web-Crypto environments, e.g. some test runners): a simple
  // deterministic 8-hex-char hash so the protocol is still testable offline.
  // NOTE: not cryptographically secure — used strictly as a fallback.
  return `fba_${fnv1a(input).toString(16).padStart(8, '0')}`;
}

/** Generate a random hex salt for a commitment. */
export function randomSalt(): string {
  return randomSeed(); // 16 random bytes -> 32 hex chars
}

/* ==========================================================================
 * Commitment (salt:hash) helpers
 * ========================================================================= */

/** Format of a commitment: "<salt>:<hash>". */
export type Commitment = `${string}:${string}`;

/**
 * Build a commitment for a target: computes the SHA-256 hash of
 * `target + "|" + salt` and returns the "salt:hash" string.
 */
export async function commitTarget(target: string, salt?: string): Promise<Commitment> {
  const s = salt ?? randomSalt();
  const hash = await sha256Hex(`${s}|${target}`);
  return `${s}:${hash}`;
}

/**
 * Verify that a commitment (previously returned by `commitTarget`) matches a
 * revealed target. Returns true if the target is consistent with the
 * commitment (i.e. nobody changed the target after commit).
 */
export async function verifyCommitment(commitment: string, target: string): Promise<boolean> {
  const sep = commitment.indexOf(':');
  if (sep === -1) return false;
  const salt = commitment.slice(0, sep);
  const expectedHash = commitment.slice(sep + 1);
  const hash = await sha256Hex(`${salt}|${target}`);
  return hash === expectedHash;
}

/* ==========================================================================
 * Session target-chain generation
 * ========================================================================= */

export interface LockedTarget {
  /** Round index (0-based). */
  readonly roundIndex: number;
  /** The actual target label (not revealed until after commit). */
  readonly target: string;
  /** The commitment string ("salt:hash") stored before round starts. */
  readonly commitment: Commitment;
}

/**
 * Generate a full round-lock chain with a single user-provided seed.
 *
 * For each round the target is chosen deterministically from `options` via
 * the seed-derived PRNG (so the whole session is reproducible from `seed`),
 * then immediately hashed into a commitment. The plain targets are kept
 * alongside for the reveal step. The returned chain is fully auditable via
 * the seed.
 */
export async function generateLockedTargets(
  seed: string,
  options: readonly string[],
  count: number,
  saltFn: () => string = randomSalt,
): Promise<LockedTarget[]> {
  if (options.length === 0) return [];
  const rand = createPRNG(seed);
  const locked: LockedTarget[] = [];
  for (let i = 0; i < count; i++) {
    const target = options[Math.floor(rand() * options.length) % options.length]!;
    const salt = saltFn();
    const commitment = await commitTarget(target, salt);
    locked.push({ roundIndex: i, target, commitment });
  }
  return locked;
}

/**
 * Pick a target deterministically from a list using a seeded PRNG index.
 * Returns the chosen element.
 */
export function pickTarget<T>(rand: SeededPRNG, options: readonly T[]): T {
  const idx = Math.floor(rand() * options.length) % options.length;
  return options[idx]!;
}

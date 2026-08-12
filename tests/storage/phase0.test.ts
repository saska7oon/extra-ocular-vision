/**
 * Tests for Phase0Repository storage operations.
 *
 * Phase0Repository depends on the EOVDatabase's `phase0Sessions` and
 * `phase0Progress` Dexie tables. Since happy-dom does not reliably provide
 * IndexedDB in every environment (causing the real-IndexedDB tests to skip),
 * these tests use a lightweight in-memory mock that implements only the
 * Table methods the repository calls. This lets us exercise the progress-
 * summary computation, day-completion upsert, and session CRUD logic
 * deterministically and without IDB.
 *
 * The real-IndexedDB path is additionally covered in database.test.ts
 * (skipped when IndexedDB is unavailable).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { Phase0Repository } from '../../src/storage/repositories';
import type { EOVDatabase } from '../../src/storage/database';
import type {
  Phase0SessionRecord,
  Phase0Progress,
} from '../../src/features/phase0/types';

const PROFILE_ID = 'profile-test-1';

/* --- Minimal in-memory Dexie Table mock -------------------------------- */

/**
 * A minimal mock of a Dexie Table that supports the subset of operations
 * Phase0Repository uses: add, get, put, update, where().equals().toArray(),
 * where().equals().first(), and simple query chains (reverse, limit).
 *
 * Handles both Dexie's single-key form `.where('field')` and compound-key
 * form `.where(['field1', 'field2'])`.
 */
class MockTable<T extends { id: string }> {
  rows: Record<string, T> = {};

  async add(record: T): Promise<string> {
    this.rows[record.id] = record;
    return record.id;
  }

  async get(id: string): Promise<T | undefined> {
    return this.rows[id];
  }

  async put(record: T): Promise<string> {
    this.rows[record.id] = record;
    return record.id;
  }

  async update(id: string, patch: Partial<T>): Promise<number> {
    const existing = this.rows[id];
    if (!existing) return 0;
    this.rows[id] = { ...existing, ...patch };
    return 1;
  }

  /** Dexie-style chainable query: .where(keys).equals(vals) */
  where(...keys: (string | string[])[]): QueryChain<T> {
    // Dexie allows .where('field') and .where(['f1','f2']); normalize both.
    const flatKeys = keys.flatMap((k) => (Array.isArray(k) ? k : [k]));
    return new QueryChain<T>(this.rows, flatKeys);
  }

  async toArray(): Promise<T[]> {
    return Object.values(this.rows);
  }
}

/** Chainable query result supporting .equals(), .reverse(), .limit(), .toArray(), .first(). */
class QueryChain<T extends { id: string }> {
  private results: T[];
  private isReversed = false;

  constructor(
    store: Record<string, T>,
    private keys: string[],
  ) {
    this.results = Object.values(store);
  }

  equals(vals: unknown): this {
    const arr = Array.isArray(vals) ? vals : [vals];
    this.results = this.results.filter((r) =>
      this.keys.every((k, i) => {
        const actual = (r as unknown as Record<string, unknown>)[k];
        return actual === arr[i];
      }),
    );
    this.isReversed = false;
    return this;
  }

  reverse(): this {
    this.results = [...this.results].reverse();
    this.isReversed = true;
    return this;
  }

  limit(n: number): this {
    this.results = this.isReversed
      ? this.results.slice(0, n)
      : [...this.results].reverse().slice(0, n).reverse();
    return this;
  }

  toArray(): Promise<T[]> {
    return Promise.resolve(this.results);
  }

  first(): Promise<T | undefined> {
    return Promise.resolve(this.results[0]);
  }
}

/** Minimal mock database implementing just the tables Phase0Repository needs. */
function makeMockDb() {
  return {
    phase0Sessions: new MockTable<Phase0SessionRecord>(),
    phase0Progress: new MockTable<Phase0Progress>(),
  } as unknown as EOVDatabase;
}

/* --- Tests --------------------------------------------------------------- */

describe('Phase0Repository (in-memory mock)', () => {
  let db: ReturnType<typeof makeMockDb>;
  let repo: Phase0Repository;

  beforeEach(() => {
    db = makeMockDb();
    repo = new Phase0Repository(db);
  });

  describe('createSession / getSession', () => {
    it('creates a session with an auto-generated UUID id', async () => {
      const record = await repo.createSession({
        profileId: PROFILE_ID,
        sessionType: 'breathing',
        absoluteDay: 1,
        startedAt: Date.now(),
        completed: false,
      });
      expect(record.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      expect(record.sessionType).toBe('breathing');
      expect(record.completed).toBe(false);
    });

    it('can retrieve a session by id after creation', async () => {
      const created = await repo.createSession({
        profileId: PROFILE_ID,
        sessionType: 'binaural',
        absoluteDay: 4,
        startedAt: Date.now(),
        completed: false,
        binauralTrackId: 'alpha',
      });
      const fetched = await repo.getSession(created.id);
      expect(fetched).toEqual(created);
      expect(fetched?.binauralTrackId).toBe('alpha');
    });

    it('returns undefined for a non-existent session id', async () => {
      const fetched = await repo.getSession('nonexistent-id');
      expect(fetched).toBeUndefined();
    });
  });

  describe('listSessions / getSessions', () => {
    it('lists sessions for a profile, most-recent-first', async () => {
      const t0 = Date.now();
      const r1 = await repo.createSession({
        profileId: PROFILE_ID,
        sessionType: 'breathing',
        absoluteDay: 1,
        startedAt: t0,
        completed: false,
      });
      const r2 = await repo.createSession({
        profileId: PROFILE_ID,
        sessionType: 'breathing',
        absoluteDay: 2,
        startedAt: t0 + 1000,
        completed: false,
      });
      await repo.createSession({
        profileId: 'other-profile',
        sessionType: 'breathing',
        absoluteDay: 1,
        startedAt: t0 + 2000,
        completed: false,
      });

      const list = await repo.getSessions(PROFILE_ID, 10);
      expect(list).toHaveLength(2);
      // Most recent first → r2 (t0+1000) before r1 (t0)
      expect(list[0]?.id).toBe(r2.id);
      expect(list[1]?.id).toBe(r1.id);
    });

    it('limits results to the requested count', async () => {
      const t0 = Date.now();
      for (let i = 0; i < 5; i++) {
        await repo.createSession({
          profileId: PROFILE_ID,
          sessionType: 'breathing',
          absoluteDay: i + 1,
          startedAt: t0 + i * 1000,
          completed: false,
        });
      }
      const list = await repo.getSessions(PROFILE_ID, 3);
      expect(list).toHaveLength(3);
    });
  });

  describe('getSessionsByDay', () => {
    it('returns only sessions matching profileId and absoluteDay', async () => {
      const t0 = Date.now();
      await repo.createSession({
        profileId: PROFILE_ID,
        sessionType: 'breathing',
        absoluteDay: 1,
        startedAt: t0,
        completed: false,
      });
      await repo.createSession({
        profileId: PROFILE_ID,
        sessionType: 'breathing',
        absoluteDay: 1,
        startedAt: t0 + 1000,
        completed: false,
      });
      await repo.createSession({
        profileId: PROFILE_ID,
        sessionType: 'breathing',
        absoluteDay: 2,
        startedAt: t0 + 2000,
        completed: false,
      });

      const day1 = await repo.getSessionsByDay(PROFILE_ID, 1);
      expect(day1).toHaveLength(2);
      const day2 = await repo.getSessionsByDay(PROFILE_ID, 2);
      expect(day2).toHaveLength(1);
    });

    it('does not return sessions from other profiles', async () => {
      await repo.createSession({
        profileId: PROFILE_ID,
        sessionType: 'breathing',
        absoluteDay: 1,
        startedAt: Date.now(),
        completed: false,
      });
      await repo.createSession({
        profileId: 'other-profile',
        sessionType: 'breathing',
        absoluteDay: 1,
        startedAt: Date.now() + 1000,
        completed: false,
      });
      const results = await repo.getSessionsByDay(PROFILE_ID, 1);
      expect(results).toHaveLength(1);
      expect(results[0]?.profileId).toBe(PROFILE_ID);
    });
  });

  describe('updateSession / markCompleted', () => {
    it('updateSession patches fields on an existing session', async () => {
      const created = await repo.createSession({
        profileId: PROFILE_ID,
        sessionType: 'breathing',
        absoluteDay: 1,
        startedAt: Date.now(),
        completed: false,
      });
      const updated = await repo.updateSession(created.id, {
        completed: true,
        reflection: 'felt warm',
      });
      expect(updated).toBe(1);
      const fetched = await repo.getSession(created.id);
      expect(fetched?.completed).toBe(true);
      expect(fetched?.reflection).toBe('felt warm');
    });

    it('updateSession returns 0 for a non-existent id', async () => {
      const updated = await repo.updateSession('nope', { completed: true });
      expect(updated).toBe(0);
    });

    it('markCompleted sets completed and endedAt', async () => {
      const created = await repo.createSession({
        profileId: PROFILE_ID,
        sessionType: 'breathing',
        absoluteDay: 1,
        startedAt: Date.now() - 10000,
        completed: false,
      });
      const before = Date.now();
      const count = await repo.markCompleted(created.id);
      expect(count).toBe(1);
      const fetched = await repo.getSession(created.id);
      expect(fetched?.completed).toBe(true);
      expect(fetched?.endedAt).toBeGreaterThanOrEqual(before);
    });
  });

  describe('setDayCompletion / listProgress', () => {
    it('creates a new progress record for a day', async () => {
      const before = Date.now();
      const record = await repo.setDayCompletion(PROFILE_ID, 1);
      expect(record.profileId).toBe(PROFILE_ID);
      expect(record.day).toBe(1);
      expect(record.completed).toBe(true);
      expect(record.completedAt).toBeGreaterThanOrEqual(before);
    });

    it('upserts (updates timestamp) when the same day is completed again', async () => {
      const first = await repo.setDayCompletion(PROFILE_ID, 3);
      const firstAt = first.completedAt;
      // wait a tick
      await new Promise((r) => setTimeout(r, 5));
      const second = await repo.setDayCompletion(PROFILE_ID, 3);
      expect(second.id).toBe(first.id);
      expect(second.completed).toBe(true);
      expect(second.completedAt).toBeGreaterThan(firstAt!);
    });

    it('persists progress so listProgress can read it back', async () => {
      await repo.setDayCompletion(PROFILE_ID, 1);
      await repo.setDayCompletion(PROFILE_ID, 2);
      const list = await repo.listProgress(PROFILE_ID);
      expect(list).toHaveLength(2);
      expect(list.map((p) => p.day).sort()).toEqual([1, 2]);
    });

    it('does not return another profile progress in listProgress', async () => {
      await repo.setDayCompletion(PROFILE_ID, 1);
      await repo.setDayCompletion('other-profile', 1);
      const list = await repo.listProgress(PROFILE_ID);
      expect(list).toHaveLength(1);
      expect(list[0]?.profileId).toBe(PROFILE_ID);
    });
  });

  describe('getProgressSummary', () => {
    it('returns all-locked for a new profile (day 1 available)', async () => {
      const summary = await repo.getProgressSummary(PROFILE_ID);
      expect(summary.totalDays).toBe(7);
      expect(summary.completedDays).toBe(0);
      expect(summary.phase1Unlocked).toBe(false);
      expect(summary.days[0]).toBe('available');
      expect(summary.days[1]).toBe('locked');
      expect(summary.days[6]).toBe('locked');
    });

    it('unlocks days sequentially and locks incomplete later days', async () => {
      await repo.setDayCompletion(PROFILE_ID, 1);
      await repo.setDayCompletion(PROFILE_ID, 2);

      const summary = await repo.getProgressSummary(PROFILE_ID);
      expect(summary.days[0]).toBe('completed');
      expect(summary.days[1]).toBe('completed');
      expect(summary.days[2]).toBe('available');
      expect(summary.days[6]).toBe('locked');
      expect(summary.completedDays).toBe(2);
    });

    it('keeps completed days completed even if prior days are not done', async () => {
      // The implementation gates *available* (non-completed) days by the prior
      // day's completion, but preserves 'completed' status for days already done.
      // Completing day 2 (without day 1) marks day 2 as completed, and day 3
      // becomes available because its immediate predecessor (day 2) is done.
      await repo.setDayCompletion(PROFILE_ID, 2);
      const summary = await repo.getProgressSummary(PROFILE_ID);
      expect(summary.days[0]).toBe('available');
      expect(summary.days[1]).toBe('completed');
      expect(summary.days[2]).toBe('available');
      expect(summary.days[3]).toBe('locked');
    });

    it('unlocks Phase 1 when all 7 days are complete', async () => {
      for (let d = 1; d <= 7; d++) {
        await repo.setDayCompletion(PROFILE_ID, d);
      }
      const summary = await repo.getProgressSummary(PROFILE_ID);
      expect(summary.completedDays).toBe(7);
      expect(summary.phase1Unlocked).toBe(true);
      expect(summary.days.every((d) => d === 'completed')).toBe(true);
    });

    it('includes state rating history from completed sessions', async () => {
      const ts = Date.now();
      await repo.createSession({
        profileId: PROFILE_ID,
        sessionType: 'breathing',
        absoluteDay: 1,
        startedAt: ts,
        completed: true,
        preStateRating: 4,
        postStateRating: 7,
      });
      await repo.createSession({
        profileId: PROFILE_ID,
        sessionType: 'breathing',
        absoluteDay: 2,
        startedAt: ts + 1000,
        completed: true,
        preStateRating: 3,
        // no post-state rating → postStateRating omitted
      });

      const summary = await repo.getProgressSummary(PROFILE_ID);
      expect(summary.stateHistory).toHaveLength(2);
      // Most recent first: the session at ts+1000 comes before the one at ts.
      expect(summary.stateHistory[0]?.preStateRating).toBe(3);
      expect(summary.stateHistory[0]?.postStateRating).toBeUndefined();
      expect(summary.stateHistory[1]?.preStateRating).toBe(4);
      expect(summary.stateHistory[1]?.postStateRating).toBe(7);
    });

    it('excludes sessions with no state ratings from history', async () => {
      await repo.createSession({
        profileId: PROFILE_ID,
        sessionType: 'breathing',
        absoluteDay: 1,
        startedAt: Date.now(),
        completed: true,
        // no ratings
      });
      const summary = await repo.getProgressSummary(PROFILE_ID);
      expect(summary.stateHistory).toHaveLength(0);
    });
  });
});

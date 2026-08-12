/**
 * Tests for the EOV database schema and repositories.
 *
 * Dexie uses IndexedDB under the hood. In the test environment (happy-dom),
 * IndexedDB is provided by the happy-dom polyfill (which includes a
 * minimal IDB implementation). If unavailable, these tests are skipped
 * with a clear message.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { deleteDatabase, getDatabase } from '../../src/storage/database';
import { createRepositories } from '../../src/storage/repositories';

const hasIndexedDB = typeof indexedDB !== 'undefined';

const makePrefs = (theme: 'dark' | 'light' = 'dark') => ({
  theme,
  accessibilityMode: 'standard' as const,
  audioEnabled: true,
  showSkepticismWarnings: true,
  strictRigor: true,
  voiceSpeed: 1.0,
  entrainmentEnabled: false,
});

const testProfile = {
  name: 'Test User 1',
  preferences: makePrefs(),
  isActive: true,
};

describe.skipIf(!hasIndexedDB)('Database layer', () => {
  beforeAll(async () => {
    await deleteDatabase();
  });

  afterAll(async () => {
    await deleteDatabase();
  });

  describe('ProfileRepository', () => {
    it('creates a profile with auto-generated id and timestamps', async () => {
      const db = getDatabase();
      const repos = createRepositories(db);
      const profile = await repos.profiles.create(testProfile);

      expect(profile.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      expect(profile.createdAt).toBeTypeOf('number');
      expect(profile.lastActiveAt).toBeTypeOf('number');
      expect(profile.isActive).toBe(true);
      expect(profile.name).toBe('Test User 1');
    });

    it('persists and retrieves the profile', async () => {
      const db = getDatabase();
      const repos = createRepositories(db);
      const [created] = await repos.profiles.list();
      expect(created).toBeDefined();
      expect(created?.name).toBe('Test User 1');

      const fetched = await repos.profiles.get(created!.id);
      expect(fetched).toEqual(created);
    });

    it('setActive activates one profile and deactivates others', async () => {
      const db = getDatabase();
      const repos = createRepositories(db);
      const second = await repos.profiles.create({
        name: 'Second User',
        preferences: makePrefs('light'),
        isActive: false,
      });

      await repos.profiles.setActive(second.id);
      const active = await repos.profiles.getActive();
      expect(active?.id).toBe(second.id);
    });
  });

  describe('SessionRepository', () => {
    it('can create and retrieve a session with rounds', async () => {
      const db = getDatabase();
      const repos = createRepositories(db);
      const active = await repos.profiles.getActive();
      expect(active).toBeDefined();

      const session = await repos.sessions.create({
        profileId: active!.id,
        phaseId: 1,
        dayInPhase: 1,
        absoluteDay: 8,
        difficulty: 'beginner',
        rounds: [],
        startedAt: Date.now(),
        maxStreak: 0,
        integrityScore: 1.0,
        integrityFlags: [],
        outcome: 'pending',
      });

      await repos.sessions.addRounds(session.id, [
        {
          id: 'round-1',
          sessionId: session.id,
          roundNumber: 1,
          exerciseType: 'contrast',
          difficulty: 'beginner',
          targetHash: 'salt:abc123',
          target: 'black',
          targetMeta: { label: 'black' },
          startedAt: Date.now(),
          committedAt: Date.now() + 5000,
          responseTimeMs: 5000,
          committedAnswer: 'black',
          correct: true,
          confidenceRating: 4,
        },
      ]);

      const fetched = await repos.sessions.get(session.id);
      expect(fetched?.rounds).toHaveLength(1);
      expect(fetched?.rounds[0]?.correct).toBe(true);
    });
  });

  describe('SettingsRepository', () => {
    it('provides default settings on first get', async () => {
      const db = getDatabase();
      const repos = createRepositories(db);
      const settings = await repos.settings.get();
      expect(settings).toBeDefined();
    });

    it('persists settings updates', async () => {
      const db = getDatabase();
      const repos = createRepositories(db);
      const updated = await repos.settings.update({ firstLaunchComplete: true });
      expect(updated.firstLaunchComplete).toBe(true);
      const fetched = await repos.settings.get();
      expect(fetched.firstLaunchComplete).toBe(true);
    });
  });

  describe('JournalRepository', () => {
    it('creates and lists journal entries', async () => {
      const db = getDatabase();
      const repos = createRepositories(db);
      const active = await repos.profiles.getActive();
      expect(active).toBeDefined();

      const entry = await repos.journal.create({
        profileId: active!.id,
        content: 'Today I felt a subtle warmth on the left side.',
        tags: ['phase-0', 'insight'],
      });

      expect(entry.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      expect(entry.content).toContain('warmth');

      const list = await repos.journal.list(active!.id);
      expect(list.some((e) => e.id === entry.id)).toBe(true);
    });
  });
});

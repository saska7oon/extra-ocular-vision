import { describe, it, expect, beforeAll } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCreateProfile } from '../../src/hooks';
import { getDatabase, deleteDatabase } from '../../src/storage/database';
import { createRepositories } from '../../src/storage/repositories';

// fake-indexeddb is installed globally by tests/setup.ts (runs before module
// evaluation), so Dexie finds a real IndexedDB in happy-dom.

beforeAll(async () => {
  await deleteDatabase();
  const db = getDatabase();
  await db.open();
});

describe('useCreateProfile hook', () => {
  it('creates a profile, sets it active, marks firstLaunchComplete', async () => {
    const db = getDatabase();
    const repos = createRepositories(db);
    const { result } = renderHook(() => useCreateProfile());

    let record: any = null;
    await act(async () => {
      record = await result.current.create('Smoke Tester');
    });

    expect(record).toBeTruthy();
    expect(record.id).toBeTruthy();
    expect(result.current.error).toBeNull();

    const active = await repos.profiles.getActive();
    expect(active?.id).toBe(record.id);
    const settings = await repos.settings.get();
    expect(settings.activeProfileId).toBe(record.id);
    expect(settings.firstLaunchComplete).toBe(true);
  }, 10000);

  it('create() throws a real Error when the repo rejects', async () => {
    const failingRepos = {
      profiles: {
        getActive: async () => undefined,
        create: async () => {
          throw new Error('simulated IndexedDB failure');
        },
      },
      settings: { setActiveProfileId: async () => {}, update: async () => ({}) },
    } as unknown as any;

    const { createProfileWithSettings } = await import('../../src/hooks');
    let thrown: unknown = null;
    try {
      await createProfileWithSettings(failingRepos, 'X', {
        theme: 'dark',
        accessibilityMode: 'standard',
        audioEnabled: true,
        showSkepticismWarnings: true,
        strictRigor: true,
        voiceSpeed: 1,
        entrainmentEnabled: false,
      });
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).toMatch(/simulated IndexedDB failure/);
  });
});

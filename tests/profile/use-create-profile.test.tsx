import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCreateProfile } from '../../src/hooks';
import type { EOVDatabases } from '../../src/storage';
import { getDatabase } from '../../src/storage/database';
import { createRepositories } from '../../src/storage/repositories';

// fake-indexeddb is installed globally in tests/setup.ts (runs before modules
// load), so Dexie finds a real IndexedDB implementation.

describe('useCreateProfile hook', () => {
  it('creates a profile, sets it active, and marks firstLaunchComplete', async () => {
    const db = getDatabase();
    await db.open();

    const { result } = renderHook(() => useCreateProfile());

    let record: any = null;
    await act(async () => {
      record = await result.current.create('Smoke Tester');
    });

    expect(record).toBeTruthy();
    expect(record.id).toBeTruthy();
    expect(result.current.error).toBeNull();

    const repos: EOVDatabases = createRepositories(db);
    const active = await repos.profiles.getActive();
    expect(active?.id).toBe(record.id);
    const settings = await repos.settings.get();
    expect(settings.activeProfileId).toBe(record.id);
    expect(settings.firstLaunchComplete).toBe(true);

    // A second profile must NOT override the active profile / firstLaunch flag.
    await act(async () => {
      const r2 = await result.current.create('Second User');
      expect(r2).toBeTruthy();
    });
    const active2 = await repos.profiles.getActive();
    expect(active2?.id).toBe(record.id);
  }, 15000);
});

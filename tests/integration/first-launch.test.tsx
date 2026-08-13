import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import App from '../../src/App';
import { getDatabase, deleteDatabase } from '../../src/storage/database';
import { createRepositories } from '../../src/storage/repositories';

// fake-indexeddb is installed globally by tests/setup.ts (runs before module
// evaluation), so Dexie finds a real IndexedDB in happy-dom.

beforeAll(async () => {
  await deleteDatabase();
  const db = getDatabase();
  await db.open();
});

describe('App first-launch profile creation (integration)', () => {
  it('clicking Create Profile creates the profile and transitions out of onboarding', async () => {
    render(<App />);

    // The first-launch form must appear.
    await screen.findByText(/Create a profile to begin/i);

    const input = screen.getByLabelText(/Profile name/i) as HTMLInputElement;
    const button = screen.getByRole('button', { name: /Create Profile & Start Training/i });

    await act(async () => {
      fireEvent.change(input, { target: { value: 'Integration Tester' } });
      fireEvent.click(button);
    });

    // After creation, the onboarding prompt must disappear (App re-renders to
    // AppReady driven by useAppSettings picking up firstLaunchComplete=true).
    await waitFor(
      () => {
        expect(screen.queryByText(/Please create a profile to begin/i)).toBeNull();
      },
      { timeout: 3000 },
    );

    // And the DB must reflect the written profile + settings.
    const db = getDatabase();
    const repos = createRepositories(db);
    const settings = await repos.settings.get();
    const active = await repos.profiles.getActive();
    expect(settings.firstLaunchComplete).toBe(true);
    expect(active?.name).toBe('Integration Tester');
  }, 10000);
});

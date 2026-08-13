/**
 * React hooks for interacting with the EOV storage layer.
 *
 * These hooks wrap the repository API and integrate with React's lifecycle:
 *  - Lazy database initialization on first use
 *  - React state that updates on writes (via Dexie live queries where possible)
 *  - Error boundaries for storage failures
 *  - Graceful degradation when IndexedDB is unavailable
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import type {
  UserProfile,
  UserPreferences,
  Session,
  CurriculumProgress,
  TierProgression,
  JournalEntry,
  TemplateEntry,
  AppSettings,
  Theme,
} from '../types';
import { getDatabase, createRepositories, type EOVDatabases } from '../storage';

/** Result of a mutation hook: tracks loading and error states. */
export interface MutationResult<T = unknown> {
  data: T | null;
  error: Error | null;
  isPending: boolean;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'dark',
  accessibilityMode: 'standard',
  audioEnabled: true,
  showSkepticismWarnings: true,
  strictRigor: true,
  voiceSpeed: 1.0,
  entrainmentEnabled: false,
};

/* ==========================================================================
 * DB initialization hook
 * ========================================================================== */

let _repos: EOVDatabases | null = null;

/** Lazily initialize the database and repositories (singleton). */
function getRepositories(): EOVDatabases {
  if (!_repos) {
    const db = getDatabase();
    _repos = createRepositories(db);
  }
  return _repos;
}

/**
 * Hook that ensures the database is initialized before any storage hook runs.
 * Returns the repositories or null if IndexedDB failed.
 */
export function useDatabase(): EOVDatabases | null {
  // Lazy-init from the module singleton so we pick up `_repos` even when it
  // was populated by a different component's earlier render/effect (the
  // previous version read `_repos` only once at first render and then never
  // recovered if the singleton was filled later). `useState` preserves the
  // first non-null value across re-renders.
  const [repos, setRepos] = useState<EOVDatabases | null>(() => _repos);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // If the singleton was populated between renders, adopt it.
    if (repos) return;
    if (_repos) {
      setRepos(_repos);
      return;
    }
    try {
      const r = getRepositories();
      setRepos(r);
    } catch (err) {
      console.error('Failed to initialize database:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [repos]);

  // Expose error via the return for callers that need it.
  if (error) {
    // We still return null repos; callers handle offline mode.
    console.warn('Database unavailable, running in offline-fallback mode');
  }

  return repos;
}

/* ==========================================================================
 * Profile hooks
 * ========================================================================== */

/** Load all user profiles, sorted by last active. */
export function useProfiles(): {
  profiles: UserProfile[];
  activeProfile: UserProfile | undefined;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
} {
  const repos = useDatabase();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [activeProfile, setActiveProfile] = useState<UserProfile | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!repos) {
      setError(new Error('Database not available'));
      setIsLoading(false);
      return;
    }
    try {
      const list = await repos.profiles.list();
      const active = await repos.profiles.getActive();
      setProfiles(list);
      setActiveProfile(active);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [repos]);

  useEffect(() => {
    load();
  }, [load]);

  return { profiles, activeProfile, isLoading, error, refresh: load };
}

/** Create a new user profile. */
export function useCreateProfile(): MutationResult<UserProfile> & {
  create: (name: string) => Promise<UserProfile | null>;
} {
  const repos = useDatabase();
  const [data, setData] = useState<UserProfile | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isPending, setIsPending] = useState(false);

  const create = useCallback(
    async (name: string): Promise<UserProfile | null> => {
      if (!repos) {
        const e = new Error('Database not available');
        setError(e);
        throw e;
      }
      setIsPending(true);
      setError(null);
      try {
        const record = await createProfileWithSettings(repos, name, DEFAULT_PREFERENCES);
        setData(record);
        return record;
      } catch (err) {
        // Log the real cause so it's visible in the browser console (F12).
        console.error('Profile creation failed:', err);
        // Dexie throws DexieError subclasses (MissingAPIError, etc.); wrap
        // non-Error rejections so callers always get a real Error with a name.
        if (err instanceof Error) {
          setError(err);
          throw err;
        }
        const wrapped = new Error(JSON.stringify(err));
        setError(wrapped);
        throw wrapped;
      } finally {
        setIsPending(false);
      }
    },
    [repos],
  );

  return { data, error, isPending, create };
}

/** Switch the active profile. */

/**
 * Create a profile and wire up first-launch settings atomically.
 *
 * On first launch (no active profile exists), the new profile becomes active
 * and `firstLaunchComplete` is flipped so the app advances past onboarding.
 * Subsequent profiles are created non-active (user switches manually).
 */
export async function createProfileWithSettings(
  repos: EOVDatabases,
  name: string,
  preferences: UserPreferences,
): Promise<UserProfile> {
  const existing = await repos.profiles.getActive();
  const isFirst = existing === undefined;
  const record = await repos.profiles.create({
    name,
    preferences,
    isActive: isFirst,
  });
  if (isFirst) {
    await repos.settings.setActiveProfileId(record.id);
    await repos.settings.update({ firstLaunchComplete: true });
  }
  return record;
}

/** Switch the active profile. */
export function useSetActiveProfile(): MutationResult<boolean> & {
  activate: (profileId: string) => Promise<boolean>;
} {
  const repos = useDatabase();
  const [data, setData] = useState<boolean | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isPending, setIsPending] = useState(false);

  const activate = useCallback(
    async (profileId: string): Promise<boolean> => {
      if (!repos) {
        setError(new Error('Database not available'));
        return false;
      }
      setIsPending(true);
      setError(null);
      try {
        await repos.profiles.setActive(profileId);
        await repos.settings.setActiveProfileId(profileId);
        await repos.profiles.touch(profileId);
        setData(true);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        return false;
      } finally {
        setIsPending(false);
      }
    },
    [repos],
  );

  return { data, error, isPending, activate };
}

/** Update preferences for the active profile. */
export function useUpdatePreferences(): MutationResult<boolean> & {
  update: (prefs: Partial<UserPreferences>) => Promise<boolean>;
} {
  const repos = useDatabase();
  const [data, setData] = useState<boolean | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isPending, setIsPending] = useState(false);

  const update = useCallback(
    async (prefs: Partial<UserPreferences>): Promise<boolean> => {
      if (!repos) {
        setError(new Error('Database not available'));
        return false;
      }
      const active = await repos.profiles.getActive();
      if (!active) {
        setError(new Error('No active profile'));
        return false;
      }
      setIsPending(true);
      setError(null);
      try {
        await repos.profiles.updatePreferences(active.id, prefs);
        setData(true);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        return false;
      } finally {
        setIsPending(false);
      }
    },
    [repos],
  );

  return { data, error, isPending, update };
}

/* ==========================================================================
 * Curriculum hooks
 * ========================================================================== */

/** Load curriculum progress for the active profile. */
export function useCurriculumProgress(): {
  progress: CurriculumProgress | undefined;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
} {
  const repos = useDatabase();
  const [progress, setProgress] = useState<CurriculumProgress | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!repos) {
      setError(new Error('Database not available'));
      setIsLoading(false);
      return;
    }
    try {
      const active = await repos.profiles.getActive();
      if (!active) {
        setProgress(undefined);
        return;
      }
      const p = await repos.curriculum.getProgress(active.id);
      setProgress(p);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [repos]);

  useEffect(() => {
    load();
  }, [load]);

  return { progress, isLoading, error, refresh: load };
}

/** Load tier progression for the active profile. */
export function useTierProgression(): {
  progression: TierProgression | undefined;
  isLoading: boolean;
  error: Error | null;
} {
  const repos = useDatabase();
  const [progression, setProgression] = useState<TierProgression | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!repos) {
      setError(new Error('Database not available'));
      setIsLoading(false);
      return;
    }
    repos.profiles.getActive().then((active) => {
      if (!active) {
        setProgression(undefined);
        setIsLoading(false);
        return;
      }
      repos.curriculum.getTierProgression(active.id).then((p) => {
        setProgression(p);
        setIsLoading(false);
      }).catch((err) => {
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsLoading(false);
      });
    });
  }, [repos]);

  return { progression, isLoading, error };
}

/* ==========================================================================
 * Session hooks
 * ========================================================================== */

/** Load recent sessions for the active profile. */
export function useRecentSessions(limit = 50): {
  sessions: Session[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
} {
  const repos = useDatabase();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!repos) {
      setError(new Error('Database not available'));
      setIsLoading(false);
      return;
    }
    try {
      const active = await repos.profiles.getActive();
      if (!active) {
        setSessions([]);
        return;
      }
      const list = await repos.sessions.getByProfile(active.id, limit);
      setSessions(list);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [repos, limit]);

  useEffect(() => {
    load();
  }, [load]);

  return { sessions, isLoading, error, refresh: load };
}

/* ==========================================================================
 * Journal hooks
 * ========================================================================== */

/** Load journal entries for the active profile. */
export function useJournalEntries(limit = 200): {
  entries: JournalEntry[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
} {
  const repos = useDatabase();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!repos) {
      setError(new Error('Database not available'));
      setIsLoading(false);
      return;
    }
    try {
      const active = await repos.profiles.getActive();
      if (!active) {
        setEntries([]);
        return;
      }
      const list = await repos.journal.list(active.id, limit);
      setEntries(list);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [repos, limit]);

  useEffect(() => {
    load();
  }, [load]);

  return { entries, isLoading, error, refresh: load };
}

/* ==========================================================================
 * Template hooks
 * ========================================================================== */

/** Load all template entries for the active profile (plus built-ins). */
export function useTemplates(): {
  templates: TemplateEntry[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
} {
  const repos = useDatabase();
  const [templates, setTemplates] = useState<TemplateEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!repos) {
      setError(new Error('Database not available'));
      setIsLoading(false);
      return;
    }
    try {
      const active = await repos.profiles.getActive();
      if (!active) {
        // Still load built-ins.
        const builtins = await repos.templates.getAllBuiltIn();
        setTemplates(builtins);
        return;
      }
      const custom = await repos.templates.listAll(active.id);
      const builtins = await repos.templates.getAllBuiltIn();
      setTemplates([...builtins, ...custom]);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [repos]);

  useEffect(() => {
    load();
  }, [load]);

  return { templates, isLoading, error, refresh: load };
}

/* ==========================================================================
 * Settings hooks
 * ========================================================================== */

/** Load app-level settings. */
export function useAppSettings(): {
  settings: AppSettings | undefined;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
} {
  const repos = useDatabase();
  const [settings, setSettings] = useState<AppSettings | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Keep a ref to the latest `repos` so `refresh` (used by the profile-creation
  // form) always reads the current repositories, even when invoked from a
  // stale closure. The auto-load effect below also depends on `repos` so it
  // re-fires when the DB finishes initializing.
  const reposRef = useRef(repos);
  reposRef.current = repos;

  const load = useCallback(async () => {
    const r = reposRef.current;
    if (!r) {
      setError(new Error('Database not available'));
      setIsLoading(false);
      return;
    }
    try {
      const s = await r.settings.get();
      // Spread into a new object so React always sees a fresh reference and
      // re-renders consumers even if Dexie returns a cached/structural-clone
      // of the same record.
      setSettings({ ...s });
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Re-fetch whenever `repos` becomes available/stale.
  useEffect(() => {
    load();
  }, [load, repos]);

  return { settings, isLoading, error, refresh: load };
}

/* ==========================================================================
 * Theme hook
 * ========================================================================== */

/**
 * Manages dark/light/system theme.
 * Reads from the active profile's preferences, falls back to system preference,
 * and applies the `data-theme` attribute + CSS class to <html>.
 */
export function useTheme(): {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => Promise<void>;
} {
  const repos = useDatabase();
  const [theme, setThemeState] = useState<Theme>('dark');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    async function loadTheme() {
      const active = await repos?.profiles.getActive();
      const t = active?.preferences.theme ?? 'dark';
      setThemeState(t);

      let resolved: 'light' | 'dark';
      if (t === 'system') {
        resolved = window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
      } else {
        resolved = t;
      }
      setResolvedTheme(resolved);
      document.documentElement.setAttribute('data-theme', resolved);
      document.documentElement.className = `theme-${resolved}`;
    }
    loadTheme();
  }, [repos]);

  // Listen for system preference changes when in 'system' mode.
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      const resolved = e.matches ? 'dark' : 'light';
      setResolvedTheme(resolved);
      document.documentElement.setAttribute('data-theme', resolved);
      document.documentElement.className = `theme-${resolved}`;
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const setTheme = useCallback(
    async (newTheme: Theme): Promise<void> => {
      setThemeState(newTheme);
      let resolved: 'light' | 'dark';
      if (newTheme === 'system') {
        resolved = window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
      } else {
        resolved = newTheme;
      }
      setResolvedTheme(resolved);
      document.documentElement.setAttribute('data-theme', resolved);
      document.documentElement.className = `theme-${resolved}`;
      if (repos) {
        const active = await repos.profiles.getActive();
        if (active) {
          await repos.profiles.updatePreferences(active.id, { theme: newTheme });
        }
      }
    },
    [repos],
  );

  return { theme, resolvedTheme, setTheme };
}

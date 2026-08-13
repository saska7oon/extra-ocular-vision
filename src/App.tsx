/**
 * Root application component for Extra-Ocular Vision.
 *
 * Responsibilities:
 *  - Theme initialization (dark/light/system)
 *  - Accessibility setup (skip link, aria attributes)
 *  - PWA install prompt handling
 *  - Skeleton / loading state while DB initializes
 *
 * Note: The curriculum phases, session flow, statistics dashboard, and
 * judging engine are separate feature components assembled here.
 */

import { useEffect, useState, type FormEvent, type ReactElement } from 'react';
import { useAppSettings, useTheme, useCreateProfile, useProfiles } from './hooks';
import { MainApp } from './MainApp';

function App() {
  const { settings, isLoading, refresh: refreshSettings } = useAppSettings();
  const { resolvedTheme } = useTheme();
  const [, setPwaInstalled] = useState(false);

  // Handle PWA install prompt (deferred).
  useEffect(() => {
    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      // The installation state is tracked so we can adjust UI if needed.
      void e;
    };
    window.addEventListener('beforeinstallprompt', handler as EventListener);

    const installedHandler = () => setPwaInstalled(true);
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler as EventListener);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  // Hide loading overlay once settings are loaded.
  useEffect(() => {
    if (!isLoading) {
      const root = document.getElementById('root');
      root?.removeAttribute('data-loading');
    }
  }, [isLoading]);

  return (
    <>
      {/* Skip-to-content link for keyboard/screen-reader users */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Main layout */}
      <div className="app" data-theme={resolvedTheme}>
        <header className="app-header" role="banner">
          <h1 id="app-title">Extra-Ocular Vision Training</h1>
          <p className="app-subtitle">
            Local-first • Offline • No cloud sync
          </p>
        </header>

        <main
          id="main-content"
          className="main"
          tabIndex={-1}
          aria-label="Main content"
        >
          {settings?.firstLaunchComplete ? (
            <AppReady />
          ) : (
            <FirstLaunchFlow onProfileCreated={refreshSettings} />
          )}
        </main>

        <footer className="app-footer" role="contentinfo">
          <p className="disclaimer">
            <strong>Scientific skepticism notice:</strong> Extra-ocular vision
            is not scientifically proven. This app trains the claimed ability
            with full rigor controls and statistical tracking.
          </p>
        </footer>
      </div>
    </>
  );
}

/** First-launch onboarding: create a profile, set preferences. */
function FirstLaunchFlow({
  onProfileCreated,
}: {
  onProfileCreated: () => Promise<void>;
}) {
  return (
    <section aria-labelledby="first-launch-title">
      <h2 id="first-launch-title">Welcome to Extra-Ocular Vision Training</h2>
      <p>
        This app guides you through a progressive, day-by-day curriculum to
        develop perception without physical sight. All data is stored locally
        on your device — no cloud, no accounts, no telemetry.
      </p>
      <p>
        Please create a profile to begin. You can add multiple profiles for
        family members or personal comparison.
      </p>
      <ProfileCreationForm onProfileCreated={onProfileCreated} />
    </section>
  );
}

/** Simple profile creation form shown on first launch. */
function ProfileCreationForm({
  onProfileCreated,
}: {
  onProfileCreated: () => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { create } = useCreateProfile();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    try {
      const record = await create(name || 'Default');
      if (!record) {
        // create() rejected but didn't throw (defensive); show generic fallback.
        setError('Profile could not be created — see console (F12).');
        return;
      }
      await onProfileCreated();
    } catch (err) {
      // create() now throws the real cause, so we can surface it directly.
      const e = err as Error | undefined;
      const nm = e?.name ? `${e.name}: ` : '';
      const msg = (e && e.message) || String(err);
      setError(`Creation failed: ${nm}${msg || 'see console'} ...`);
      console.error('[EOV] create-profile rejected:', err);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      aria-describedby={error ? 'profile-error' : undefined}
    >
      <label htmlFor="profile-name">
        Profile name
        <input
          id="profile-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. My Practice Profile"
          aria-required
        />
      </label>
      {error && (
        <p
          id="profile-error"
          role="alert"
          style={{ color: 'rgb(var(--color-error))' }}
        >
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary">
        Create Profile &amp; Start Training
      </button>
    </form>
  );
}

/** Main app once a profile exists — resolves the active profile and renders the wired experience. */
function AppReady(): ReactElement {
  const { activeProfile, isLoading } = useProfiles();

  if (isLoading) {
    return (
      <section aria-labelledby="ready-title">
        <h2 id="ready-title">Loading your profile…</h2>
      </section>
    );
  }

  if (!activeProfile) {
    return (
      <section aria-labelledby="ready-title">
        <h2 id="ready-title">No active profile</h2>
        <p>Please create a profile to begin training.</p>
      </section>
    );
  }

  return <MainApp profileId={activeProfile.id} />;
}

export default App;

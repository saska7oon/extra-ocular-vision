/**
 * FreePlay — unlocked access to all modalities with educational context.
 * Allows users to practice any exercise type without progression locks.
 */

import { useState } from 'react';
import type { ReactElement } from 'react';
import { clsx } from '../utils/clsx';
import { Button, Card } from '../ui';
import {
  ALL_MODALITIES,
  type Modality,
  PHASE0_MODALITIES,
  PROGRESSION_MODALITIES,
} from '../features/modalities';
import { BreathingGuide } from './BreathingGuide';
import { BinauralPlayer } from './BinauralPlayer';
import { CombinedSession } from './CombinedSession';
import { ForcedChoiceSession } from './ForcedChoiceSession';
import { FreeResponseSession } from './FreeResponseSession';
import type { ForcedChoiceConfig } from '../features/exercises';
import { configForPhase } from '../features/exercises';

interface FreePlayProps {
  profileId: string;
  absoluteDay: number;
  onSessionComplete?: (record: unknown) => void;
}

type View = 'grid' | 'detail' | 'session';

function ModalityCard({
  modality,
  onSelect,
  isPhase0,
}: {
  modality: Modality;
  onSelect: () => void;
  isPhase0: boolean;
}): ReactElement {
  return (
    <Card
      asArticle
      className={clsx('modality-card', isPhase0 && 'modality-card--phase0')}
      interactive
      onClick={onSelect}
    >
      <div className="modality-card__header">
        <span className="modality-card__icon" aria-hidden="true">{modality.icon}</span>
        <span className="modality-card__phase-badge">
          {modality.phase === 0 ? 'Foundation' : `Phase ${modality.phase}`}
        </span>
      </div>
      <h3 className="modality-card__name">{modality.name}</h3>
      <p className="modality-card__short-desc">{modality.description}</p>
      <div className="modality-card__meta">
        <span className="modality-card__duration">🕐 {modality.durationMin} min</span>
        {modality.dayRange && <span className="modality-card__day-range">📅 {modality.dayRange}</span>}
      </div>
      <Button variant="outline" className="modality-card__btn" onClick={(e) => { e.stopPropagation(); onSelect(); }}>
        Explore
      </Button>
    </Card>
  );
}

function ModalityDetail({
  modality,
  onStart,
  onBack,
}: {
  modality: Modality;
  onStart: () => void;
  onBack: () => void;
}): ReactElement {
  const colorVar = `--color-${modality.color}`;

  return (
    <div className="modality-detail" style={{ '--modality-color': `rgb(var(${colorVar}))` } as React.CSSProperties}>
      <Button variant="ghost" className="modality-detail__back" onClick={onBack}>
        ← Back
      </Button>

      <div className="modality-detail__header">
        <span className="modality-detail__icon" aria-hidden="true" style={{ color: `rgb(var(${colorVar}))` }}>
          {modality.icon}
        </span>
        <div>
          <span className="modality-detail__phase-badge" style={{ background: `rgb(var(${colorVar}) / 0.15)`, color: `rgb(var(${colorVar}))` }}>
            {modality.phase === 0 ? 'Foundation Phase' : `Phase ${modality.phase}`}
          </span>
          <h2 className="modality-detail__name">{modality.name}</h2>
        </div>
      </div>

      <div className="modality-detail__section">
        <h3>Purpose</h3>
        <p>{modality.purpose}</p>
      </div>

      <div className="modality-detail__section">
        <h3>Goal</h3>
        <p>{modality.goal}</p>
      </div>

      <div className="modality-detail__section">
        <h3>Research Basis</h3>
        <p>{modality.researchBasis}</p>
      </div>

      <div className="modality-detail__section">
        <h3>Protocol</h3>
        <ol className="modality-detail__protocol">
          {modality.protocol.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </div>

      <div className="modality-detail__meta">
        <span>🕐 {modality.durationMin} minutes</span>
        {modality.dayRange && <span>📅 {modality.dayRange}</span>}
      </div>

      <Button
        variant="primary"
        className="modality-detail__start-btn"
        onClick={onStart}
        style={{ background: `rgb(var(${colorVar}))`, borderColor: `rgb(var(${colorVar}))` }}
      >
        Start Session
      </Button>
    </div>
  );
}

function SessionRunner({
  modality,
  profileId,
  absoluteDay,
  onSessionComplete,
  onBack,
}: {
  modality: Modality;
  profileId: string;
  absoluteDay: number;
  onSessionComplete?: (record: unknown) => void;
  onBack: () => void;
}): ReactElement {
  const handleSessionComplete = (record: unknown) => {
    onSessionComplete?.(record);
  };
  // Phase 0 sessions
  if (modality.id === 'breathing') {
    return (
      <div className="session-runner">
        <Button variant="ghost" className="session-runner__back" onClick={onBack}>← Back</Button>
        <BreathingGuide
          profileId={profileId}
          absoluteDay={absoluteDay}
          onSessionComplete={handleSessionComplete}
        />
      </div>
    );
  }

  if (modality.id === 'binaural') {
    return (
      <div className="session-runner">
        <Button variant="ghost" className="session-runner__back" onClick={onBack}>← Back</Button>
        <BinauralPlayer
          profileId={profileId}
          absoluteDay={absoluteDay}
          onSessionComplete={handleSessionComplete}
        />
      </div>
    );
  }

  if (modality.id === 'combined') {
    return (
      <div className="session-runner">
        <Button variant="ghost" className="session-runner__back" onClick={onBack}>← Back</Button>
        <CombinedSession
          profileId={profileId}
          absoluteDay={absoluteDay}
          onSessionComplete={handleSessionComplete}
        />
      </div>
    );
  }

  // Forced-choice sessions (Phases 1-4, 7)
  const forcedChoiceConfigs: Record<string, ForcedChoiceConfig | undefined> = {
    contrast: configForPhase(1),
    color: configForPhase(2),
    shape: configForPhase(3),
    symbol: configForPhase(4),
    'text-reading': configForPhase(7),
  };

  if (forcedChoiceConfigs[modality.id]) {
    const config = forcedChoiceConfigs[modality.id]!;
    return (
      <div className="session-runner">
        <Button variant="ghost" className="session-runner__back" onClick={onBack}>← Back</Button>
        <ForcedChoiceSession
          config={config}
          profileId={profileId}
          absoluteDay={absoluteDay}
          dayInPhase={1}
          difficulty="beginner"
          onSessionComplete={handleSessionComplete as (session: import('../types').Session) => void}
        />
      </div>
    );
  }

  // Free-response sessions (Phase 5-6)
  if (modality.id === 'complex-targets' || modality.id === 'environmental-mapping') {
    return (
      <div className="session-runner">
        <Button variant="ghost" className="session-runner__back" onClick={onBack}>← Back</Button>
        <FreeResponseSession
          category={modality.id === 'environmental-mapping' ? 'environmental-mapping' : 'playing-cards'}
          onComplete={onBack}
        />
      </div>
    );
  }

  // Fallback
  return (
    <div className="session-runner">
      <Button variant="ghost" className="session-runner__back" onClick={onBack}>← Back</Button>
      <Card asArticle>
        <h2>Session not yet implemented for {modality.name}</h2>
        <Button variant="primary" onClick={onBack}>Back to Free Play</Button>
      </Card>
    </div>
  );
}

export function FreePlay({ profileId, absoluteDay, onSessionComplete }: FreePlayProps): ReactElement {
  const [view, setView] = useState<View>('grid');
  const [selectedModality, setSelectedModality] = useState<Modality | null>(null);
  const [filter, setFilter] = useState<'all' | 'phase0' | 'progression'>('all');

  const modalities = filter === 'phase0'
    ? PHASE0_MODALITIES
    : filter === 'progression'
    ? PROGRESSION_MODALITIES
    : ALL_MODALITIES;

  const handleModalitySelect = (modality: Modality) => {
    setSelectedModality(modality);
    setView('detail');
  };

  const handleStartSession = () => {
    if (selectedModality) {
      setView('session');
    }
  };

  const handleBack = () => {
    if (view === 'session') {
      setView('detail');
    } else if (view === 'detail') {
      setSelectedModality(null);
      setView('grid');
    }
  };

  if (view === 'session' && selectedModality) {
    return (
      <SessionRunner
        modality={selectedModality}
        profileId={profileId}
        absoluteDay={absoluteDay}
        onSessionComplete={(record) => onSessionComplete?.(record)}
        onBack={handleBack}
      />
    );
  }

  if (view === 'detail' && selectedModality) {
    return (
      <ModalityDetail
        modality={selectedModality}
        onStart={handleStartSession}
        onBack={handleBack}
      />
    );
  }

  return (
    <section className="free-play" aria-labelledby="free-play-title">
      <header className="free-play__header">
        <h2 id="free-play-title">Free Play</h2>
        <p className="free-play__subtitle">
          Practice any modality without progression locks. Each includes purpose, goals, research basis, and protocol.
        </p>
      </header>

      <div className="free-play__filter" role="group" aria-label="Filter modalities">
        <Button
          variant={filter === 'all' ? 'primary' : 'outline'}
          onClick={() => setFilter('all')}
        >
          All ({ALL_MODALITIES.length})
        </Button>
        <Button
          variant={filter === 'phase0' ? 'primary' : 'outline'}
          onClick={() => setFilter('phase0')}
        >
          Foundation (Phase 0)
        </Button>
        <Button
          variant={filter === 'progression' ? 'primary' : 'outline'}
          onClick={() => setFilter('progression')}
        >
          Perception Phases
        </Button>
      </div>

      <div className="free-play__grid" role="list">
        {modalities.map((modality) => (
          <ModalityCard
            key={modality.id}
            modality={modality}
            onSelect={() => handleModalitySelect(modality)}
            isPhase0={modality.phase === 0}
          />
        ))}
      </div>

      {modalities.length === 0 && (
        <div className="free-play__empty">
          <p>No modalities match the current filter.</p>
        </div>
      )}
    </section>
  );
}

export default FreePlay;
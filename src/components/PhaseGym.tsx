/**
 * PhaseGym — a drill selector + session runner for the forced-choice phases
 * (1: contrast, 2: color, 3: shape, 4: symbol).
 *
 * The user picks a drill, then the selected ForcedChoiceConfig drives the
 * shared ForcedChoiceSession component. Completed sessions are persisted to
 * the SessionRepository (so the statistics dashboard reflects real data).
 */
import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { Button, Card } from '../ui';
import { useDatabase } from '../hooks';
import { ForcedChoiceSession } from './ForcedChoiceSession';
import type { ForcedChoiceConfig } from '../features/exercises';
import { choiceCountFor, configForPhase } from '../features/exercises';
import type { Session, DifficultyTier } from '../types';
import { TIER_ORDER, TIER_LABELS, choicesAtTier, chanceAtTier } from '../features/difficulty/tiers';

interface PhaseGymProps {
  profileId: string;
  phaseId: 1 | 2 | 3 | 4 | 7;
  dayInPhase: number;
  absoluteDay: number;
  /** Subset of drills offered in this phase (default: the phase's own config). */
  drills?: ForcedChoiceConfig[];
}

/** Human titles for the forced-choice phases. */
export const PHASE_TITLES: Record<number, string> = {
  1: 'Phase 1: Contrast Discrimination',
  2: 'Phase 2: Color Recognition',
  3: 'Phase 3: Shape Identification',
  4: 'Phase 4: Letters & Numbers',
  7: 'Phase 7: Text Reading',
};

/** Build tier info for a specific config. */
function getTierInfo(config: ForcedChoiceConfig) {
  return TIER_ORDER.map((tier) => {
    const choices = choicesAtTier(tier, config.choicesPerRound, config.options.length);
    const chance = chanceAtTier(tier, config.choicesPerRound, config.options.length);
    return {
      tier,
      label: TIER_LABELS[tier],
      choices,
      chancePct: Math.round(chance * 100),
      description: tier === 'beginner'
        ? `Easiest — only ${choices} options shown. Chance = ${Math.round(chance * 100)}%.`
        : tier === 'expert'
        ? `Hardest — all ${choices} options shown. Chance = ${Math.round(chance * 100)}%.`
        : `${choices} options shown. Chance = ${Math.round(chance * 100)}%.`,
    };
  });
}

export function PhaseGym({
  profileId,
  phaseId,
  dayInPhase,
  absoluteDay,
  drills,
}: PhaseGymProps): ReactElement {
  const repos = useDatabase();
  const available =
    drills ?? [configForPhase(phaseId as 1 | 2 | 3 | 4)];
  const [activeCfg, setActiveCfg] = useState<ForcedChoiceConfig | null>(null);
  const [tier, setTier] = useState<DifficultyTier>('beginner');
  const [showTierInfo, setShowTierInfo] = useState(false);

  const configs = useMemo(
    () => available.filter((c) => c.phaseId === phaseId),
    [available, phaseId],
  );

  /** Persist a completed forced-choice session + its rounds. */
  const persistSession = async (session: Session) => {
    if (!repos) return;
    try {
      await repos.sessions.create(session);
      await repos.sessions.addRounds(session.id, session.rounds);
    } catch (err) {
      console.error('Failed to persist training session:', err);
    }
  };

  // Use the first config to show tier info (they all have same pool size for a given phase)
  const currentConfig = configs[0] ?? configForPhase(phaseId as 1 | 2 | 3 | 4);
  const tierInfos = getTierInfo(currentConfig);

  return (
    <section className="phase-gym" aria-label={PHASE_TITLES[phaseId] ?? `Phase ${phaseId}`}>
      <header className="phase-gym-header">
        <h2>{PHASE_TITLES[phaseId] ?? `Phase ${phaseId}`}</h2>
        <p>
          Pick a drill. Commit your answer before the target is revealed — the
          commitment guarantee is what makes the training meaningful.
        </p>
      </header>

      {/* Difficulty tier selector */}
      <div className="tier-selector" role="group" aria-label="Difficulty tier">
        <span className="tier-label">Difficulty:</span>
        <Button
          variant="ghost"
          size="sm"
          className="tier-info-toggle"
          onClick={() => setShowTierInfo(!showTierInfo)}
        >
          {showTierInfo ? 'Hide tier details' : 'Show what each tier means'}
        </Button>
        {TIER_ORDER.map((t) => (
          <button
            key={t}
            type="button"
            className={`tier-btn${tier === t ? ' is-active' : ''}`}
            onClick={() => setTier(t)}
            disabled={activeCfg !== null}
            title={tierInfos.find(ti => ti.tier === t)?.description}
          >
            {TIER_LABELS[t]}
          </button>
        ))}
      </div>

      {showTierInfo && (
        <div className="tier-info-panel" role="region" aria-label="Difficulty tier details">
          <h4>What each difficulty tier means for this exercise:</h4>
          <div className="tier-info-grid">
            {tierInfos.map((info) => (
              <div
                key={info.tier}
                className={`tier-info-card${info.tier === tier ? ' is-selected' : ''}`}
              >
                <div className="tier-info-header">
                  <span className="tier-info-name">{info.label}</span>
                  <span className="tier-info-choices">{info.choices} options</span>
                </div>
                <p className="tier-info-chance">Chance baseline: {info.chancePct}%</p>
                <p className="tier-info-desc">{info.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeCfg ? (
        <ForcedChoiceSession
          config={activeCfg}
          profileId={profileId}
          absoluteDay={absoluteDay}
          dayInPhase={dayInPhase}
          difficulty={tier}
          onSessionComplete={(s) => {
            void persistSession(s);
            setActiveCfg(null);
          }}
        />
      ) : (
        <div className="drill-grid" role="list">
          {configs.map((cfg) => (
            <Card asArticle key={cfg.exerciseType} className="drill-card" interactive>
              <h3>{cfg.exerciseType}</h3>
              <p>
                {cfg.roundsPerSession} rounds • {choiceCountFor(cfg.exerciseType)} choices • chance {Math.round(cfg.chanceBaseline * 100)}%
              </p>
              <Button variant="primary" onClick={() => setActiveCfg(cfg)}>
                Train
              </Button>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

export default PhaseGym;
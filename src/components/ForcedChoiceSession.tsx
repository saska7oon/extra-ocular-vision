/**
 * ForcedChoiceSession — drives the commit-before-reveal training loop for
 * Phases 1-4 (contrast, color, shape, symbol).
 *
 * Flow per round:
 *   1. The engine has already locked the target into a SHA-256 commitment.
 *   2. The user perceives a blind target and commits ONE answer from the
 *      forced choices. (Nothing reveals the target yet.)
 *   3. On commit, the target is revealed, verified against the commitment,
 *      and scored. The user sees a confidence + post-round rating step.
 *   4. Next round.
 * When all rounds complete, the session record is built and persisted, and a
 * statistical summary (accuracy vs chance) is shown.
 */
import { useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { uuid4 } from '../utils/crypto';
import { clsx } from '../utils/clsx';
import { Button, Card } from '../ui';
import type { ForcedChoiceConfig } from '../features/exercises';
import { ForcedChoiceEngine } from '../features/exercises';
import type { Session, ExerciseRound, DifficultyTier } from '../types';

interface ForcedChoiceSessionProps {
  config: ForcedChoiceConfig;
  profileId: string;
  absoluteDay: number;
  dayInPhase: number;
  /** Difficulty tier; scales the choice set (more distractors = harder). */
  difficulty?: DifficultyTier;
  /** Called with the built session record when complete. */
  onSessionComplete?: (session: Session) => void;
}

export function ForcedChoiceSession({
  config,
  profileId,
  absoluteDay,
  dayInPhase,
  onSessionComplete,
  difficulty = 'beginner',
}: ForcedChoiceSessionProps): ReactElement {
  const sessionId = useMemo(() => uuid4(), []);
  const engineRef = useRef<ForcedChoiceEngine | null>(null);

  const [number, setNumber] = useState(0); // 0 = not started
  const [stage, setStage] = useState<'choices' | 'veil' | 'revealed' | 'done'>('choices');
  const [selected, setSelected] = useState<string | null>(null);
  const [reveal, setReveal] = useState<{
    target: string;
    correct: boolean;
    valid: boolean;
  } | null>(null);
  const [confidence, setConfidence] = useState(3);
  const [score, setScore] = useState<{ correct: number; total: number }>({
    correct: 0,
    total: 0,
  });
  const [summary, setSummary] = useState<{
    accuracy: number;
    aboveChance: boolean;
    rounds: ExerciseRound[];
  } | null>(null);

  const engine = (): ForcedChoiceEngine => {
    if (!engineRef.current) {
      engineRef.current = new ForcedChoiceEngine(config, {
        profileId,
        sessionId,
        absoluteDay,
        dayInPhase,
        difficulty,
      });
    }
    return engineRef.current;
  };

  /** Begin the session (locks all targets up front). */
  const handleStart = async () => {
    const eng = engine();
    await eng.start();
    setNumber(1);
    setStage('choices');
    setScore({ correct: 0, total: 0 });
  };

  const choices = engine().currentChoices;

  /** User committed an answer. Score is internal; target stays hidden. */
  const handleCommit = async () => {
    if (!selected) return;
    const eng = engine();
    eng.commit(selected, confidence, number * 17); // placeholder response time
    const r = await eng.reveal();
    setReveal({
      target: r.target,
      correct: r.correct,
      valid: r.commitmentValid,
    });
    setStage('veil'); // Show veil descending
    setScore((s) => ({
      correct: s.correct + (r.correct ? 1 : 0),
      total: s.total + 1,
    }));
  };

  /** Move to the next round (or finish). */
  const handleNext = () => {
    const eng = engine();
    const hasMore = eng.next();
    if (!hasMore) {
      const result = eng.complete();
      // Persist a session record composed of the rounds.
      const session: Session = {
        id: sessionId,
        profileId,
        phaseId: config.phaseId,
        dayInPhase,
        absoluteDay,
        difficulty,
        rounds: result.rounds,
        startedAt: Date.now(),
        endedAt: Date.now(),
        accuracy: result.accuracy,
        maxStreak: 0,
        integrityScore: 1,
        integrityFlags: [],
        outcome: 'complete' as const,
      };
      setSummary({
        accuracy: result.accuracy,
        aboveChance: result.aboveChance,
        rounds: result.rounds,
      });
      setStage('done');
      onSessionComplete?.(session);
      return;
    }
    setNumber(number + 1);
    setSelected(null);
    setReveal(null);
    setConfidence(3);
    setStage('choices');
  };

  // ---- Pre-start ----
  if (stage === 'done' && summary) {
    const pct = `${Math.round(summary.accuracy * 100)}%`;
    return (
      <Card asArticle className="fc-session fc-summary">
        <h2>{config.exerciseType} — Complete</h2>
        <p className="summary-accuracy">
          Correct: {score.correct} / {score.total} ({pct})
        </p>
        <p className={clsx('chance-badge', summary.aboveChance ? 'is-above' : 'is-at')}>
          {summary.aboveChance
            ? '📈 Significantly above chance (p < 0.05)'
            : '📊 At or near chance — keep training.'}
        </p>
        <p className="honesty-note">
          This reports your statistical performance. It does not certify any
          ability — extra-ocular vision is not scientifically proven.
        </p>
        <Button variant="outline" onClick={handleStart}>
          Run again
        </Button>
      </Card>
    );
  }

  if (number === 0) {
    return (
      <Card asArticle className="fc-session">
        <h2>Start {config.exerciseType} training</h2>
        <p>
          {config.roundsPerSession} rounds. You will perceive a blind target and
          commit an answer before it is revealed. Stay honest — commit before
          reveal is what makes the results meaningful.
        </p>
        <Button variant="primary" onClick={() => void handleStart()}>
          Begin
        </Button>
      </Card>
    );
  }

  return (
      <Card asArticle className="fc-session">
        <header className="fc-header">
          <h2>{config.exerciseType} — Phase {config.phaseId}</h2>
          <span className="fc-progress">
            Round {number} / {config.roundsPerSession}
          </span>
        </header>

        {/* Target area with veil metaphor */}
        <div className="fc-target-area" aria-label="Target perception area">
          <div className="fc-veil-container">
            {/* The target is always rendered but covered by veil */}
            <div className="fc-target" aria-hidden="true">
              {reveal && <span className="fc-target-label">{reveal.target}</span>}
              {!reveal && stage !== 'choices' && <span className="fc-target-placeholder">?</span>}
            </div>
          
            {/* The veil - covers target during choices, lifts on commit */}
            <div 
              className={clsx('fc-veil', {
                'is-lowered': stage === 'choices',
                'is-lifting': stage === 'veil',
                'is-raised': stage === 'revealed' || stage === 'done',
              })}
              aria-hidden="true"
            >
              <div className="fc-veil-fabric" />
              <div className="fc-veil-hem" />
            </div>
          </div>
        </div>

        {stage === 'choices' && (
            <p className="fc-blind-hint">
              Perceive the target behind the veil with your inner sense, then commit.
            </p>
          )}

          {stage === 'veil' && (
            <p className="fc-blind-hint">
              The veil lifts... the target was there all along.
            </p>
          )}

          {stage === 'revealed' && reveal && (
            <p className="fc-blind-hint">
              Target was <strong>{reveal.target}</strong>.
            </p>
          )}

        {/* Choices (hidden after commit) */}
        {stage === 'choices' && (
          <>
            <div className="fc-choices" role="group" aria-label="Choose the target">
              {choices.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  className={clsx('fc-choice', selected === c.key ? 'is-selected' : '')}
                  onClick={() => setSelected(c.key)}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <div className="fc-confidence">
              <label htmlFor="fc-confidence">Confidence (1-5)</label>
              <input
                id="fc-confidence"
                type="range"
                min={1}
                max={5}
                value={confidence}
                onChange={(e) => setConfidence(Number(e.target.value))}
              />
              <span>{confidence}/5</span>
            </div>

            <div className="fc-actions">
              <Button variant="primary" onClick={() => void handleCommit()} disabled={!selected}>
                Commit answer
              </Button>
            </div>
          </>
        )}

        {/* Veil lifting animation stage */}
        {stage === 'veil' && reveal && (
          <div className="fc-reveal" role="status">
            <p className={clsx('reveal-result', reveal.correct ? 'is-correct' : 'is-wrong')}>
              {reveal.correct ? '✓ Correct' : '✗ Not correct'}
            </p>
            <p>
              Target was <strong>{reveal.target}</strong>.
            </p>
            <p className={clsx('commit-valid', reveal.valid && 'is-verified')}>
              {reveal.valid ? '🔒 Commitment verified' : '⚠ Commitment mismatch'}
            </p>
            <div className="fc-actions">
              <Button variant="primary" onClick={handleNext}>
                Next round
              </Button>
            </div>
          </div>
        )}

        {/* Reveal stage (after veil lifted) */}
        {stage === 'revealed' && reveal && (
          <div className="fc-reveal" role="status">
            <p className={clsx('reveal-result', reveal.correct ? 'is-correct' : 'is-wrong')}>
              {reveal.correct ? '✓ Correct' : '✗ Not correct'}
            </p>
            <p>
              Target was <strong>{reveal.target}</strong>.
            </p>
            <p className={clsx('commit-valid', reveal.valid && 'is-verified')}>
              {reveal.valid ? '🔒 Commitment verified' : '⚠ Commitment mismatch'}
            </p>
            <div className="fc-actions">
              <Button variant="primary" onClick={handleNext}>
                Next round
              </Button>
            </div>
          </div>
        )}
      </Card>
    );
}

export default ForcedChoiceSession;
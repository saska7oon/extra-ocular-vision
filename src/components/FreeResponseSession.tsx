/**
 * FreeResponseSession — Phase 5 complex-target exercise with the
 * programmatic judge.
 *
 * Per round:
 *   1. The category is shown (e.g. "playing-cards"). The specific target is
 *      locked into a SHA-256 commitment (unreadable until after commit).
 *   2. The user types a free-form description of what they perceive. This is
 *      committed BEFORE the target is revealed.
 *   3. The judge scores the description against the target's template
 *      (matched/missing keywords, plus chance-baseline comparison) and shows a
 *      transparent 0-10 breakdown.
 *   4. The target is revealed and verified against the commitment.
 *
 * Honesty: the judge is fully local and deterministic; the score reports
 * similarity, not certified ability.
 */
import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { clsx } from '../utils/clsx';
import { Button, Card } from '../ui';
import { commitTarget, verifyCommitment, uuid4 } from '../utils/crypto';
import { judgeFreeResponse, toScale10 } from '../features/judging';
import { templatesForCategory } from '../features/judging/templates';
import type { TemplateEntry, JudgingResult } from '../types';

interface FreeResponseSessionProps {
  category: string;
  onComplete?: (result: JudgingResult) => void;
}

interface RoundLock {
  target: TemplateEntry;
  commitment: string;
}

export function FreeResponseSession({
  category,
  onComplete,
}: FreeResponseSessionProps): ReactElement {
  const templates = useMemo(() => templatesForCategory(category), [category]);
  const sessionId = useMemo(() => uuid4(), []);

  const [roundIndex, setRoundIndex] = useState(0);
  const [description, setDescription] = useState('');
  const [lock, setLock] = useState<RoundLock | null>(null);
  const [result, setResult] = useState<JudgingResult | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [commitValid, setCommitValid] = useState<boolean | null>(null);
  const [done, setDone] = useState(false);
  const [history, setHistory] = useState<number[]>([]);

  /** Lock a new random target from the category (before the user answers). */
  const newRound = async () => {
    if (templates.length === 0) return;
    const target = templates[Math.floor(Math.random() * templates.length)]!;
    const commitment = await commitTarget(target.label);
    setLock({ target, commitment });
    setDescription('');
    setResult(null);
    setRevealed(false);
    setCommitValid(null);
  };

  /** User committed a description -> judge it (target still hidden). */
  const handleCommit = () => {
    if (!lock || !description.trim()) return;
    const r = judgeFreeResponse(
      description,
      lock.target,
      templates,
      'tfidf',
    );
    setResult({ ...r, sessionId, roundId: `round-${roundIndex}` });
  };

  /** Reveal + verify the committed target. */
  const handleReveal = async () => {
    if (!lock || !result) return;
    const valid = await verifyCommitment(
      lock.commitment as `${string}:${string}`,
      lock.target.label,
    );
    setCommitValid(valid);
    setRevealed(true);
    setHistory((h) => [...h, toScale10(result.chanceAdjustedScore)]);
    onComplete?.(result);
  };

  /** Next round or finish. */
  const handleNext = () => {
    if (roundIndex + 1 >= (templates.length >= 8 ? 8 : templates.length)) {
      setDone(true);
      return;
    }
    setRoundIndex(roundIndex + 1);
    void newRound();
  };

  const isEnv = category === 'environmental-mapping';
  const phaseName = isEnv
    ? 'Phase 6: Environmental Mapping'
    : 'Phase 5: Complex Targets';
  const blindLabel = isEnv
    ? 'Perceive the spatial layout (objects and their positions), then describe it.'
    : 'Perceive the hidden object, then describe it in your own words.';
  const placeholder = isEnv
    ? 'e.g. a chair on the left, close…'
    : 'e.g. a red round fruit with a leaf…';

  // --- Done summary ---
  if (done) {
    return (
      <Card asArticle className="fr-session fr-done">
        <h2>Complete — {category}</h2>
        <p>
          You completed 8 rounds. Average score:{' '}
          {history.length ? Math.round((history.reduce((a, b) => a + b, 0) / history.length) * 10) / 10 : 0}
          /10.
        </p>
        <p className="honesty-note">
          Scores reflect keyword similarity to the hidden target, not certified
          ability. Keep practicing honestly.
        </p>
        <Button variant="outline" onClick={() => { setDone(false); setRoundIndex(0); void newRound(); }}>
          Run again
        </Button>
      </Card>
    );
  }

  // --- Start ---
  if (!lock) {
    return (
      <Card asArticle className="fr-session">
        <h2>{phaseName} — {category}</h2>
        <p>
          {isEnv
            ? 'You will perceive a presented spatial layout — objects and their positions (left/right, near/far). Before it is revealed, describe what you sense. This is a seated perception exercise only; no movement or navigation is involved.'
            : 'You will perceive a hidden target (e.g. a playing card or object). Before it is revealed, type a description of what you sense. The judge scores how well your words match, before showing the answer.'}
        </p>
        <Button variant="primary" onClick={() => void newRound()}>
          Begin
        </Button>
      </Card>
    );
  }

  const showCommit = !result && !revealed;
  const showResult = result && !revealed;
  const showReveal = result && revealed;

  return (
    <Card asArticle className="fr-session">
      <header className="fc-header">
        <h2>{isEnv ? 'Spatial layout' : 'Complex Target'} — {category}</h2>
        <span className="fc-progress">Round {roundIndex + 1} / 8</span>
      </header>

      {/* Blind target area */}
      <div className="fc-blind" aria-label="Perceive the hidden target">
        <div className="blind-disc" aria-hidden="true" />
        <p className="fc-blind-hint">
          {showCommit && blindLabel}
          {showResult && 'Description committed — review your score, then reveal.'}
          {showReveal && `The hidden target was: ${lock.target.label}`}
        </p>
      </div>

      {/* Input + judge while target hidden */}
      {showCommit && (
        <>
          <label htmlFor="fr-desc">Your perception (before reveal)</label>
          <textarea
            id="fr-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder={placeholder}
          />
          <div className="fc-actions">
            <Button
              variant="primary"
              onClick={handleCommit}
              disabled={!description.trim()}
            >
              Commit & judge
            </Button>
          </div>
        </>
      )}

      {/* Judge result (still before reveal) */}
      {showResult && result && (
        <div className="fr-judge">
          <h3>Your score: {toScale10(result.chanceAdjustedScore)} / 10</h3>
          <p className="judge-reason">{result.breakdown}</p>
          {result.chanceMatches.length > 0 && (
            <p className="judge-warn">
              ⚠ Your description also matched other targets
              ({result.chanceMatches.slice(0, 4).join(', ')}). A catch-all
              answer is discounted.
            </p>
          )}
          <div className="fc-actions">
            <Button variant="primary" onClick={() => void handleReveal()}>
              Reveal target
            </Button>
          </div>
        </div>
      )}

      {/* Reveal + verification */}
      {showReveal && (
        <div className="fr-reveal" role="status">
          <p>
            Target: <strong>{lock.target.label}</strong>
          </p>
          <p
            className={clsx(
              'commit-valid',
              commitValid === true ? '' : 'is-warn',
            )}
          >
            {commitValid === null
              ? 'Verifying…'
              : commitValid
                ? '🔒 Commitment verified'
                : '⚠ Commitment mismatch'}
          </p>
          <div className="fc-actions">
            <Button variant="primary" onClick={handleNext}>
              {roundIndex + 1 >= 8 ? 'Finish' : 'Next round'}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

export default FreeResponseSession;
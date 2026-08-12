/**
 * MasteryMode — Phase 8: Sustained Practice (days 181+).
 *
 * A dashboard for ongoing practice that honestly aggregates the user's
 * completed training sessions by exercise type and shows, for each:
 *   - rounds attempted / correct
 *   - accuracy vs. that exercise's chance baseline
 *   - a "mastery" assessment grounded in a binomial p-value (above chance?)
 *
 * Crucially, it does NOT certify ability. It reports statistical deviation
 * from chance as the honest signal, exactly per the app's honesty framing.
 * It also recommends which exercises to keep practicing (the growth areas).
 */
import { useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { Card } from '../ui';
import { useDatabase } from '../hooks';
import { chanceRateForExercise, binomialPValue, formatAccuracy } from '../features/statistics/analytics';
import { choiceCountFor } from '../features/exercises';
import { FreeResponseSession } from './FreeResponseSession';
import type { Session } from '../types';

interface MasteryRow {
  exerciseType: string;
  rounds: number;
  correct: number;
  accuracy: number;
  chance: number;
  pValue: number;
  verdict: 'mastered' | 'practicing' | 'early';
  recommended: boolean;
}

interface MasteryModeProps {
  profileId: string;
}

/** Map a free-response category to the session's stored exercise type. */
const CATEGORY_TO_EXERCISE: Record<string, string> = {
  'playing-cards': 'free-response',
  'common-objects': 'free-response',
  animals: 'free-response',
  'environmental-mapping': 'environmental-mapping',
};

export function MasteryMode({ profileId }: MasteryModeProps): ReactElement {
  const repos = useDatabase();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [practiceCategory, setPracticeCategory] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!repos) {
        setIsLoading(false);
        return;
      }
      try {
        const list = await repos.sessions.getByProfile(profileId, 500);
        setSessions(list);
      } catch (err) {
        console.error('Failed to load mastery data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [repos, profileId]);

  const rows = useMemo<MasteryRow[]>(() => {
    // Group committed rounds by exercise type.
    const byType = new Map<string, { correct: number; total: number }>();
    for (const s of sessions) {
      const mainType = s.rounds[0]?.exerciseType;
      if (!mainType) continue;
      // Free-response rounds are keyed as free-response; map category->type is
      // done via the session's stored type already (rounds carry it).
      let correct = 0;
      let total = 0;
      for (const r of s.rounds) {
        if (r.committedAnswer === undefined) continue;
        total++;
        if (r.correct === true) correct++;
      }
      const cur = byType.get(mainType) ?? { correct: 0, total: 0 };
      cur.correct += correct;
      cur.total += total;
      byType.set(mainType, cur);
    }

    const out: MasteryRow[] = [];
    for (const [type, { correct, total }] of byType) {
      if (total === 0) continue;
      const chance = chanceRateForExercise(type) || choiceCountFor(type as never) > 0 ? 1 / choiceCountFor(type as never) : 0.5;
      const accuracy = correct / total;
      const p = binomialPValue(correct, total, chance);
      let verdict: MasteryRow['verdict'] = 'early';
      if (total >= 8 && p < 0.05) verdict = 'mastered';
      else if (total >= 8) verdict = 'practicing';
      out.push({
        exerciseType: type,
        rounds: total,
        correct,
        accuracy,
        chance,
        pValue: p,
        verdict,
        recommended: total < 8 || p >= 0.05,
      });
    }
    return out.sort((a, b) => a.pValue - b.pValue);
  }, [sessions]);

  // Continue a practice session for a growth category.
  const continueCategory = (type: string) => {
    const c = Object.keys(CATEGORY_TO_EXERCISE).find(
      (k) => CATEGORY_TO_EXERCISE[k] === type,
    );
    if (c) {
      setPracticeCategory(c);
    }
  };

  if (practiceCategory) {
    return (
      <section className="mastery-practice">
        <FreeResponseSession
          category={practiceCategory}
          onComplete={() => setPracticeCategory(null)}
        />
      </section>
    );
  }

  return (
    <Card asArticle className="mastery-mode">
      <h2>Phase 8: Sustained Practice & Mastery</h2>
      <p>
        Your ongoing practice, honestly measured against chance. Reaching
        "mastered" means your recent accuracy is statistically above chance,
        not that any ability is certified.
      </p>

      {isLoading && <p>Loading your practice history…</p>}

      {!isLoading && rows.length === 0 && (
        <p>
          No training sessions recorded yet. Complete exercises in the Drills
          view and they will appear here.
        </p>
      )}

      {rows.length > 0 && (
        <table className="mastery-table" aria-label="Mastery summary by exercise">
          <thead>
            <tr>
              <th>Exercise</th>
              <th>Rounds</th>
              <th>Accuracy</th>
              <th>vs chance</th>
              <th>Verdict</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.exerciseType}>
                <td>{r.exerciseType}</td>
                <td>{r.rounds}</td>
                <td>{formatAccuracy(r.accuracy)}</td>
                <td>{formatAccuracy(r.chance)}</td>
                <td>{r.verdict}</td>
                <td>
                  {r.recommended && (
                    <button onClick={() => continueCategory(r.exerciseType)}>
                      Practice more
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className="honesty-note">
        "Practice more" opens a fresh perceptual session. All data stays local.
      </p>
    </Card>
  );
}

export default MasteryMode;
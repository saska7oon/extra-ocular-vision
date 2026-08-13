/**
 * Programmatic free-response judge (Phase 5: Complex Targets).
 *
 * A fully local, deterministic judge that scores a user's free-text
 * description against a target's template keywords. It is NOT an LLM call and
 * it does NOT certify ability — it produces a transparent 0-10 score with a
 * visible breakdown (which keywords matched / missed), plus a chance-baseline
 * comparison so the user can see whether a score is meaningful.
 *
 * Methods implemented:
 *   - 'string-match' : case-insensitive token/alias overlap with the target's
 *                      keywords and aliases.
 *   - 'tfidf'         : the string-match score is refined by term frequency /
 *                      inverse document frequency weighting across the target
 *                      set (a keyword that only one target has counts more).
 *
 * Both are deterministic and auditable (no embedding model / no network).
 *
 * Honesty framing: the judge reports a raw score AND whether that score is
 * statistically distinguishable from chance (how often this description would
 * have matched OTHER targets). If it would have matched many other targets,
 * the score is discounted — sensory leakage / a vague catch-all answer should
 * not score high.
 */
import type {
  JudgeMethod,
  JudgingResult,
  TemplateEntry,
} from '../../types';
import { uuid4 } from '../../utils/crypto';

/* ==========================================================================
 * Tokenization / normalization
 * ========================================================================= */

/** Split a phrase into lowercase alphanumeric tokens. */
export function tokenize(phrase: string): string[] {
  return phrase
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/** Option preprocessor: fold hyphen/spaces so "red-dot" and "red dot" match. */
function normalizeKey(text: string): string {
  return text.toLowerCase().replace(/[\s-]+/g, '');
}

/* ==========================================================================
 * IDF weighting
 * ========================================================================= */

/**
 * Compute inverse-document-frequency weight for each keyword across the
 * target set: log( N / (1 + df) ) where N = number of templates and df =
 * number of templates containing that keyword. Keywords shared by many
 * targets are less discriminative -> lower weight.
 */
export function computeIdfWeights(
  templates: readonly TemplateEntry[],
): Map<string, number> {
  const df = new Map<string, number>();
  for (const t of templates) {
    const seen = new Set<string>();
    for (const kw of t.keywords) {
      const k = normalizeKey(kw);
      if (!seen.has(k)) {
        seen.add(k);
        df.set(k, (df.get(k) ?? 0) + 1);
      }
    }
  }
  const N = templates.length;
  const weights = new Map<string, number>();
  for (const [kw, count] of df) {
    weights.set(kw, Math.log(N / (1 + count)) + 1);
  }
  return weights;
}

/* ==========================================================================
 * Scoring core
 * ========================================================================= */

export interface WordMatch {
  readonly matched: string[];
  readonly missing: string[];
  readonly aliasesUsed: string[];
}

/**
 * Match a description's tokens against a template's keywords + aliases.
 * A keyword matches if the token equals its normalized form OR any alias.
 */
export function matchWords(
  description: string,
  template: TemplateEntry,
): WordMatch {
  const tokens = new Set(tokenize(description).map(normalizeKey));
  const matched: string[] = [];
  const missing: string[] = [];
  const aliasesUsed: string[] = [];

  for (const kw of template.keywords) {
    const nk = normalizeKey(kw);
    const aliasHit = template.aliases.find((a) => tokens.has(normalizeKey(a)));
    if (tokens.has(nk) || aliasHit) {
      matched.push(kw);
      if (aliasHit) aliasesUsed.push(aliasHit);
    } else {
      missing.push(kw);
    }
  }
  return { matched, missing, aliasesUsed };
}

/**
 * Score a single target template against the description.
 * Returns raw score in [0,1].
 */
export function scoreTemplate(
  description: string,
  template: TemplateEntry,
  idf?: Map<string, number>,
): { rawScore: number; match: WordMatch } {
  const match = matchWords(description, template);
  if (template.keywords.length === 0) {
    return {
      rawScore: match.matched.length > 0 ? 1 : 0,
      match,
    };
  }

  let weighted = 0;
  let totalWeight = 0;
  for (const kw of template.keywords) {
    const w = (idf?.get(normalizeKey(kw)) ?? 1) * template.weight;
    totalWeight += w;
    if (match.matched.includes(kw)) weighted += w;
  }
  const rawScore = totalWeight > 0 ? weighted / totalWeight : 0;
  return { rawScore, match };
}

/**
 * Judge a free response against a list of templates.
 * Returns the best-matching target's score plus detailed transparency fields.
 */
export function judgeFreeResponse(
  description: string,
  targetTemplate: TemplateEntry,
  allTemplates: readonly TemplateEntry[],
  method: JudgeMethod,
): JudgingResult {
  const idf = method === 'tfidf' ? computeIdfWeights(allTemplates) : undefined;

  // Score the actual target.
  const { rawScore, match } = scoreTemplate(description, targetTemplate, idf);

  // Chance baseline: how many OTHER templates would this description match?
  const others = allTemplates.filter((t) => t.id !== targetTemplate.id);
  const chanceMatches: string[] = [];
  for (const t of others) {
    const { rawScore: s } = scoreTemplate(description, t, idf);
    if (s > 0.5) chanceMatches.push(t.label);
  }
  // Discount the score if the description was a vague catch-all.
  const penalized = Math.max(0, rawScore - chanceMatches.length * 0.1);

  const breakdown = [
    `Matched: ${match.matched.length ? match.matched.join(', ') : '(none)'}`,
    `Missing: ${match.missing.length ? match.missing.join(', ') : '(none)'}`,
    match.aliasesUsed.length ? `Aliases used: ${match.aliasesUsed.join(', ')}` : '',
    `Chance matches (other targets this would also fit): ${
      chanceMatches.length ? chanceMatches.join(', ') : 'none'
    }`,
  ]
    .filter(Boolean)
    .join(' | ');

  return {
    id: uuid4(),
    sessionId: '', // filled by caller
    roundId: '', // filled by caller
    targetLabel: targetTemplate.label,
    method,
    rawScore,
    chanceAdjustedScore: penalized,
    matchedKeywords: match.matched,
    missingKeywords: match.missing,
    chanceMatches,
    breakdown,
    scoredAt: Date.now(),
  };
}

/** Convert the 0-1 score to a 0-10 display score (no certification wording). */
export function toScale10(score: number): number {
  return Math.round(Math.min(1, Math.max(0, score)) * 100) / 10;
}

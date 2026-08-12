/// <reference lib="webworker" />
/**
 * Web Worker for heavy analytics computation.
 *
 * Offloads the pure analytics engine (binomial p-values, linear regression,
 * correlation with t-distribution CDF, profile analytics) to a background
 * thread. The main thread communicates via postMessage.
 *
 * Falls back gracefully: if the worker can't be created, hooks compute
 * inline (see hooks.ts).
 */

import {
  computeProfileAnalytics,
  computeSessionAccuracy,
  computeChanceComparison,
  computeReactionTimeDistribution,
  computeConfusionMatrix,
  computeFatigueCurve,
} from './analytics';
import type { Session } from '../../types';
import type { SessionAnalytics } from './types';

type WorkerRequest =
  | { type: 'profile'; sessions: Session[]; id: string }
  | { type: 'session'; session: Session; id: string };

type WorkerResponse =
  | { type: 'profile'; result: ReturnType<typeof computeProfileAnalytics>; id: string }
  | { type: 'session'; result: SessionAnalytics; id: string }
  | { type: 'error'; error: string; id: string };

self.onmessage = (event: MessageEvent) => {
  const request = event.data as WorkerRequest;
  try {
    let response: WorkerResponse;
    if (request.type === 'profile') {
      response = {
        type: 'profile',
        result: computeProfileAnalytics(request.sessions),
        id: request.id,
      };
    } else {
      const sess = request.session;
      const accuracy = computeSessionAccuracy(sess);
      const chanceComparison = computeChanceComparison(
        accuracy.correct,
        accuracy.attempted,
        accuracy.choicesPerRound > 0 ? 1 / accuracy.choicesPerRound : 0.5,
      );
      const rtd = computeReactionTimeDistribution(sess.rounds);
      const confusion = computeConfusionMatrix(sess.rounds);
      const fatigue = computeFatigueCurve(sess.rounds);
      response = {
        type: 'session',
        result: {
          session: sess,
          accuracy,
          chanceComparison,
          regressionToMean: { flagged: false, reason: '' },
          reactionTimeDistribution: rtd,
          confusion,
          fatigue,
        },
        id: request.id,
      };
    }
    (self as any).postMessage(response);
  } catch (err) {
    (self as any).postMessage({
      type: 'error',
      error: err instanceof Error ? err.message : String(err),
      id: request.id,
    } as WorkerResponse);
  }
};

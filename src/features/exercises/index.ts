/**
 * Exercise engine feature barrel.
 *
 * Exposes the reusable forced-choice engine that powers Phases 1-4
 * (contrast, color, shape, symbol) plus the phase configuration.
 */
export {
  ForcedChoiceEngine,
  binomialPValue,
  FORCED_CHOICE_CONFIGS,
  choiceCountFor,
  configForPhase,
} from './engine';
export type {
  ForcedChoiceConfig,
  ForcedChoiceOption,
  LockedRound,
  EngineState,
  EngineResult,
} from './engine';

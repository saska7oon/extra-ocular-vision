/**
 * Storage layer barrel export.
 *
 * Provides the typed repository API over Dexie IndexedDB.
 */
export { EOVDatabase, getDatabase, closeDatabase, deleteDatabase, DB_VERSION, DB_NAME } from './database';
export {
  createRepositories,
  type EOVDatabases,
  ProfileRepository,
  SettingsRepository,
  SessionRepository,
  CurriculumRepository,
  IntegrityRepository,
  TemplateRepository,
  JudgingResultRepository,
  JournalRepository,
  StatisticsRepository,
  Phase0Repository,
} from './repositories';
export type {
  Phase0ProgressSummary,
  Phase0DayView,
  StateHistoryEntry,
  DayCompletion,
} from '../features/phase0/types';

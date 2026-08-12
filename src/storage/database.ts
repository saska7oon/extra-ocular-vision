/**
 * IndexedDB schema and database definition via Dexie.js.
 *
 * Schema versions:
 *   v1 — Core curriculum (profiles, sessions, progress, tiers, journal, etc.)
 *   v2 — Phase 0 Foundations (binaural sessions, progress, state history)
 *
 * All data is local-only — never synced to any server.
 */

import Dexie, { type Table } from 'dexie';
import type {
  UserProfile,
  Session,
  ExerciseRound,
  CurriculumProgress,
  TierProgression,
  IntegrityAudit,
  StatisticsAggregate,
  JournalEntry,
  TemplateEntry,
  JudgingResult,
  TargetChain,
  AppSettings,
} from '../types';
import type {
  Phase0SessionRecord,
  Phase0Progress,
} from '../features/phase0/types';

/** Current database version. Bump when schema changes. */
export const DB_VERSION = 2;
export const DB_NAME = 'ExtraOcularVisionDB';

/**
 * Dexie v4 stores schema: a plain object mapping table names to schema strings.
 *
 * Schema string syntax: 'primaryKey, index1, index2, ...'
 * Compound indexes are space-separated: 'prop1 prop2'
 *   - `&` prefix = unique index (rarely needed for local-only data)
 */
const V1_STORES: Record<string, string | null> = {
  profiles: 'id, name, isActive, createdAt, lastActiveAt',
  settings: 'key, version',
  sessions: 'id, profileId, phaseId, startedAt, absoluteDay, outcome',
  exerciseRounds: 'id, sessionId, exerciseType, difficulty, correct',
  curriculumProgress: 'profileId, phaseId, absoluteDay',
  tierProgression: 'profileId, tier, enteredAt',
  targetChains: 'sessionId, generatedAt',
  integrityAudits: 'id, sessionId, passed, timestamp',
  templates: 'id, profileId, category, label, isCustom',
  judgingResults: 'id, sessionId, roundId, targetLabel, scoredAt',
  journal: 'id, profileId, sessionId, createdAt, mood',
  statistics: 'profileId, computedAt',
};

/** v2 additions — Phase 0 Foundations tables. */
const V2_STORES: Record<string, string | null> = {
  phase0Sessions: 'id, profileId, sessionType, absoluteDay, startedAt, completed',
  phase0Progress: 'id, profileId, day, completed, completedAt',
};

export class EOVDatabase extends Dexie {
  profiles!: Table<UserProfile, string>;
  settings!: Table<AppSettings, string>;
  sessions!: Table<Session, string>;
  exerciseRounds!: Table<ExerciseRound, string>;
  curriculumProgress!: Table<CurriculumProgress, string>;
  tierProgression!: Table<TierProgression, string>;
  targetChains!: Table<TargetChain, string>;
  integrityAudits!: Table<IntegrityAudit, string>;
  templates!: Table<TemplateEntry, string>;
  judgingResults!: Table<JudgingResult, string>;
  journal!: Table<JournalEntry, string>;
  statistics!: Table<StatisticsAggregate, string>;
  // Phase 0 (v2)
  phase0Sessions!: Table<Phase0SessionRecord, string>;
  phase0Progress!: Table<Phase0Progress, string>;

  constructor() {
    super(DB_NAME);
    // v1: original curriculum tables.
    this.version(1).stores(V1_STORES);
    // v2: Phase 0 tables added (breathing & binaural sessions + progress).
    this.version(2).stores(V2_STORES);

    // Populate default settings on first open.
    this.on('populate', () => this.seedDefaults());
  }

  /** Seed initial app settings if none exist. */
  private async seedDefaults(): Promise<void> {
    // Ensure the app settings row exists.
    const existing = await this.settings.count();
    if (existing === 0) {
      await this.settings.put({
        key: 'app',
        version: '0.1.0',
        activeProfileId: null,
        firstLaunchComplete: false,
        dbVersion: DB_VERSION,
        isPwa: false,
      });
    }
  }
}

/**
 * Singleton database instance.
 *
 * IndexedDB only allows one connection per database name per page; using a
 * module-level singleton prevents "database is deprecated" warnings and
 * race conditions.
 */
let _db: EOVDatabase | null = null;

/** Get the singleton database instance (creates if not yet open). */
export function getDatabase(): EOVDatabase {
  if (!_db) {
    _db = new EOVDatabase();
  }
  return _db;
}

/** Close and reset the singleton. Useful in tests. */
export async function closeDatabase(): Promise<void> {
  if (_db) {
    await _db.close();
    _db = null;
  }
}

/** Delete the entire database (used in testing / factory reset). */
export async function deleteDatabase(): Promise<void> {
  if (_db) {
    await _db.close();
    _db = null;
  }
  await indexedDB.deleteDatabase(DB_NAME);
}

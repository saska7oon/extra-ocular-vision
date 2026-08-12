/**
 * Typed repository layer over the EOV IndexedDB database.
 *
 * Each repository exposes a clean, type-safe API for one domain. This keeps
 * storage concerns isolated from business logic and UI. All operations
 * return promises (IndexedDB is async).
 */

import type { EOVDatabase } from './database';
import { DB_VERSION } from './database';
import type {
  UserProfile,
  UserPreferences,
  Session,
  ExerciseRound,
  CurriculumProgress,
  TierProgression,
  TierHistoryEntry,
  IntegrityAudit,
  StatisticsAggregate,
  JournalEntry,
  TemplateEntry,
  JudgingResult,
  TargetChain,
  AppSettings,
  PhaseId,
} from '../types';
import type {
  Phase0SessionRecord,
  Phase0Progress,
  Phase0ProgressSummary,
  StateHistoryEntry,
  DayCompletion,
} from '../features/phase0/types';

/* ==========================================================================
 * Profile Repository
 * ========================================================================== */

export class ProfileRepository {
  constructor(private readonly db: EOVDatabase) {}

  async create(profile: Omit<UserProfile, 'id' | 'createdAt' | 'lastActiveAt'>): Promise<UserProfile> {
    const now = Date.now();
    const record: UserProfile = {
      ...profile,
      id: crypto.randomUUID(),
      createdAt: now,
      lastActiveAt: now,
    };
    await this.db.profiles.add(record);
    return record;
  }

  async get(id: string): Promise<UserProfile | undefined> {
    return this.db.profiles.get(id);
  }

  async list(): Promise<UserProfile[]> {
    return this.db.profiles.orderBy('lastActiveAt').reverse().toArray();
  }

  async getActive(): Promise<UserProfile | undefined> {
    // Dexie's types reject boolean for .equals() on indexed boolean fields,
    // so we fetch all and filter in-JS (small dataset — profiles are few).
    const all = await this.db.profiles.toArray();
    return all.find((p) => p.isActive);
  }

  async setActive(id: string): Promise<void> {
    await this.db.transaction('rw', this.db.profiles, async () => {
      // Deactivate all other active profiles, then activate the target.
      const all = await this.db.profiles.toArray();
      const toDeactivate = all.filter((p) => p.isActive && p.id !== id);
      for (const p of toDeactivate) {
        await this.db.profiles.update(p.id, { isActive: false });
      }
      await this.db.profiles.update(id, { isActive: true });
    });
  }

  async update(id: string, patch: Partial<UserProfile>): Promise<number> {
    const updated: Partial<UserProfile> = { ...patch, lastActiveAt: Date.now() };
    return this.db.profiles.update(id, updated);
  }

  async updatePreferences(id: string, prefs: Partial<UserPreferences>): Promise<UserProfile | undefined> {
    const profile = await this.db.profiles.get(id);
    if (!profile) return undefined;
    const updatedPrefs = { ...profile.preferences, ...prefs };
    await this.db.profiles.update(id, {
      preferences: updatedPrefs,
      lastActiveAt: Date.now(),
    });
    return this.db.profiles.get(id);
  }

  async remove(id: string): Promise<void> {
    await this.db.profiles.where('id').equals(id).delete();
  }

  async touch(id: string): Promise<number> {
    return this.db.profiles.update(id, { lastActiveAt: Date.now() });
  }
}

/* ==========================================================================
 * Settings Repository
 * ========================================================================== */

export class SettingsRepository {
  constructor(private readonly db: EOVDatabase) {}

  async get(): Promise<AppSettings> {
    // The settings table uses a fixed primary key 'app'.
    const settings = await this.db.settings.get('app');
    if (settings) return settings;
    const defaults: AppSettings = {
      key: 'app',
      version: '0.1.0',
      activeProfileId: null,
      firstLaunchComplete: false,
      dbVersion: DB_VERSION,
      isPwa: false,
    };
    await this.db.settings.put(defaults);
    return defaults;
  }

  async update(patch: Partial<AppSettings>): Promise<AppSettings> {
    const current = await this.get();
    const merged: AppSettings = { ...current, ...patch };
    await this.db.settings.put(merged);
    return merged;
  }

  async setActiveProfileId(id: string): Promise<void> {
    await this.update({ activeProfileId: id });
  }
}

/* ==========================================================================
 * Session Repository
 * ========================================================================== */

export class SessionRepository {
  constructor(private readonly db: EOVDatabase) {}

  async create(session: Omit<Session, 'id'>): Promise<Session> {
    const record: Session = { ...session, id: crypto.randomUUID() };
    await this.db.sessions.add(record);
    return record;
  }

  async get(id: string): Promise<Session | undefined> {
    return this.db.sessions.get(id);
  }

  async getByProfile(profileId: string, limit = 100): Promise<Session[]> {
    return this.db.sessions
      .where('profileId')
      .equals(profileId)
      .reverse()
      .limit(limit)
      .toArray();
  }

  async getByPhase(profileId: string, phaseId: PhaseId): Promise<Session[]> {
    return this.db.sessions
      .where(['profileId', 'phaseId'])
      .equals([profileId, phaseId])
      .reverse()
      .toArray();
  }

  async update(id: string, patch: Partial<Session>): Promise<number> {
    return this.db.sessions.update(id, patch);
  }

  async remove(id: string): Promise<void> {
    await this.db.sessions.where('id').equals(id).delete();
  }

  async addRounds(sessionId: string, rounds: ExerciseRound[]): Promise<void> {
    await this.db.transaction('rw', this.db.sessions, this.db.exerciseRounds, async () => {
      await this.db.exerciseRounds.bulkAdd(rounds);
      const allRounds = await this.db.exerciseRounds
        .where('sessionId')
        .equals(sessionId)
        .toArray();
      await this.db.sessions.update(sessionId, { rounds: allRounds });
    });
  }

  async getRounds(sessionId: string): Promise<ExerciseRound[]> {
    return this.db.exerciseRounds.where('sessionId').equals(sessionId).toArray();
  }

  async updateRound(roundId: string, patch: Partial<ExerciseRound>): Promise<number> {
    return this.db.exerciseRounds.update(roundId, patch);
  }
}

/* ==========================================================================
 * Curriculum Repository
 * ========================================================================== */

export class CurriculumRepository {
  constructor(private readonly db: EOVDatabase) {}

  async getProgress(profileId: string): Promise<CurriculumProgress | undefined> {
    return this.db.curriculumProgress.get(profileId);
  }

  async createOrUpdate(progress: CurriculumProgress): Promise<void> {
    await this.db.curriculumProgress.put(progress);
  }

  async getTierProgression(profileId: string): Promise<TierProgression | undefined> {
    return this.db.tierProgression.get(profileId);
  }

  async createOrUpdateTier(tier: TierProgression): Promise<void> {
    await this.db.tierProgression.put(tier);
  }

  async addTierHistory(profileId: string, entry: TierHistoryEntry): Promise<void> {
    const existing = await this.db.tierProgression.get(profileId);
    if (!existing) return;
    const history = [...existing.tierHistory, entry];
    await this.db.tierProgression.update(profileId, { tierHistory: history });
  }

  async getTargetChain(sessionId: string): Promise<TargetChain | undefined> {
    return this.db.targetChains.get(sessionId);
  }

  async putTargetChain(chain: TargetChain): Promise<void> {
    await this.db.targetChains.put(chain);
  }
}

/* ==========================================================================
 * Integrity / Audit Repository
 * ========================================================================== */

export class IntegrityRepository {
  constructor(private readonly db: EOVDatabase) {}

  async add(audit: Omit<IntegrityAudit, 'id'>): Promise<void> {
    await this.db.integrityAudits.add({ ...audit, id: crypto.randomUUID() });
  }

  async getBySession(sessionId: string): Promise<IntegrityAudit[]> {
    return this.db.integrityAudits.where('sessionId').equals(sessionId).toArray();
  }
}

/* ==========================================================================
 * Judging / Template Repository
 * ========================================================================== */

export class TemplateRepository {
  constructor(private readonly db: EOVDatabase) {}

  async create(entry: Omit<TemplateEntry, 'id'>): Promise<TemplateEntry> {
    const record: TemplateEntry = { ...entry, id: crypto.randomUUID() };
    await this.db.templates.add(record);
    return record;
  }

  async getById(id: string): Promise<TemplateEntry | undefined> {
    return this.db.templates.get(id);
  }

  async getByCategory(profileId: string, category: string): Promise<TemplateEntry[]> {
    return this.db.templates
      .where(['profileId', 'category'])
      .equals([profileId, category])
      .toArray();
  }

  async listAll(profileId: string): Promise<TemplateEntry[]> {
    return this.db.templates.where('profileId').equals(profileId).toArray();
  }

  async getAllBuiltIn(): Promise<TemplateEntry[]> {
    return this.db.templates.where('profileId').equals('builtin').toArray();
  }

  async update(id: string, patch: Partial<TemplateEntry>): Promise<number> {
    return this.db.templates.update(id, patch);
  }

  async remove(id: string): Promise<void> {
    await this.db.templates.where('id').equals(id).delete();
  }
}

export class JudgingResultRepository {
  constructor(private readonly db: EOVDatabase) {}

  async create(result: Omit<JudgingResult, 'id'>): Promise<JudgingResult> {
    const record: JudgingResult = { ...result, id: crypto.randomUUID() };
    await this.db.judgingResults.add(record);
    return record;
  }

  async getBySession(sessionId: string): Promise<JudgingResult[]> {
    return this.db.judgingResults.where('sessionId').equals(sessionId).toArray();
  }

  async getByRound(roundId: string): Promise<JudgingResult | undefined> {
    return this.db.judgingResults.where('roundId').equals(roundId).first();
  }
}

/* ==========================================================================
 * Journal Repository
 * ========================================================================== */

export class JournalRepository {
  constructor(private readonly db: EOVDatabase) {}

  async create(entry: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<JournalEntry> {
    const now = Date.now();
    const record: JournalEntry = {
      ...entry,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    await this.db.journal.add(record);
    return record;
  }

  async get(id: string): Promise<JournalEntry | undefined> {
    return this.db.journal.get(id);
  }

  async list(profileId: string, limit = 200): Promise<JournalEntry[]> {
    return this.db.journal
      .where('profileId')
      .equals(profileId)
      .reverse()
      .limit(limit)
      .toArray();
  }

  async update(
    id: string,
    patch: Partial<Omit<JournalEntry, 'id' | 'createdAt'>>,
  ): Promise<number> {
    return this.db.journal.update(id, { ...patch, updatedAt: Date.now() });
  }

  async remove(id: string): Promise<void> {
    await this.db.journal.where('id').equals(id).delete();
  }
}

/* ==========================================================================
 * Statistics Repository
 * ========================================================================== */

export class StatisticsRepository {
  constructor(private readonly db: EOVDatabase) {}

  async get(profileId: string): Promise<StatisticsAggregate | undefined> {
    return this.db.statistics.get(profileId);
  }

  async put(stats: StatisticsAggregate): Promise<void> {
    await this.db.statistics.put(stats);
  }

  async remove(profileId: string): Promise<void> {
    await this.db.statistics.where('profileId').equals(profileId).delete();
  }
}

/* ==========================================================================
 * Phase 0 Repository (v2 — Foundations: breathing & binaural sessions)
 * ========================================================================== */

export class Phase0Repository {
  constructor(private readonly db: EOVDatabase) {}

  async createSession(session: Omit<Phase0SessionRecord, 'id'>): Promise<Phase0SessionRecord> {
    const record: Phase0SessionRecord = { ...session, id: crypto.randomUUID() };
    await this.db.phase0Sessions.add(record);
    return record;
  }

  async getSession(id: string): Promise<Phase0SessionRecord | undefined> {
    return this.db.phase0Sessions.get(id);
  }

  async listSessions(
    profileId: string,
    limit = 100,
  ): Promise<Phase0SessionRecord[]> {
    return this.db.phase0Sessions
      .where('profileId')
      .equals(profileId)
      .reverse()
      .limit(limit)
      .toArray();
  }

  async getSessionsByDay(
    profileId: string,
    day: number,
  ): Promise<Phase0SessionRecord[]> {
    return this.db.phase0Sessions
      .where(['profileId', 'absoluteDay'])
      .equals([profileId, day])
      .toArray();
  }

  async updateSession(
    id: string,
    patch: Partial<Phase0SessionRecord>,
  ): Promise<number> {
    return this.db.phase0Sessions.update(id, patch);
  }

  async markCompleted(id: string): Promise<number> {
    return this.db.phase0Sessions.update(id, { completed: true, endedAt: Date.now() });
  }

  /** Record or upsert a day-completion entry. */
  async setDayCompletion(
    profileId: string,
    day: number,
  ): Promise<Phase0Progress> {
    const existing = await this.db.phase0Progress
      .where(['profileId', 'day'])
      .equals([profileId, day])
      .first();
    const record: Phase0Progress = existing
      ? { ...existing, completed: true, completedAt: Date.now() }
      : { id: crypto.randomUUID(), profileId, day, completed: true, completedAt: Date.now() };
    await this.db.phase0Progress.put(record);
    return record;
  }

  /** All Phase 0 day completions for a profile (1-7). */
  async listProgress(profileId: string): Promise<Phase0Progress[]> {
    return this.db.phase0Progress.where('profileId').equals(profileId).toArray();
  }

  /**
   * Compute a progress summary: per-day completion status (1-7),
   * completed day count, and Phase 1 unlock flag.
   */
  async getProgressSummary(profileId: string): Promise<Phase0ProgressSummary> {
    const progress = await this.listProgress(profileId);
    const completedSet = new Set(progress.filter((p) => p.completed).map((p) => p.day));
    const days: DayCompletion[] = [];
    for (let day = 1; day <= 7; day++) {
      days.push(completedSet.has(day) ? 'completed' : day === 1 ? 'available' : 'locked');
    }
    // Days unlock sequentially: a day is available if the prior is completed.
    const daysFinal: DayCompletion[] = days.map((status, idx) => {
      if (status === 'completed') return 'completed';
      const dayNum = idx + 1;
      const prevCompleted = dayNum === 1 || days[idx - 1] === 'completed';
      return prevCompleted ? 'available' : 'locked';
    });
    const completedCount = daysFinal.filter((d) => d === 'completed').length;
    const stateHistory = await this._stateHistory(profileId);
    return {
      completedDays: completedCount,
      totalDays: 7,
      phase1Unlocked: completedCount >= 7,
      days: daysFinal,
      stateHistory,
    };
  }

  /** State rating history across all Phase 0 sessions for a profile. */
  async _stateHistory(profileId: string): Promise<StateHistoryEntry[]> {
    const sessions = await this.db.phase0Sessions
      .where('profileId')
      .equals(profileId)
      .reverse()
      .toArray();
    return sessions
      .filter((s) => s.preStateRating !== undefined || s.postStateRating !== undefined)
      .map((s) => ({
        sessionId: s.id,
        sessionType: s.sessionType,
        startedAt: s.startedAt,
        ...(s.preStateRating !== undefined ? { preStateRating: s.preStateRating } : {}),
        ...(s.postStateRating !== undefined ? { postStateRating: s.postStateRating } : {}),
      }));
  }

  /** Alias for listSessions — fetches recent sessions for a profile. */
  async getSessions(profileId: string, limit = 100): Promise<Phase0SessionRecord[]> {
    return this.listSessions(profileId, limit);
  }
}

/* ==========================================================================
 * Repository Factory
 * ========================================================================== */

export interface EOVDatabases {
  profiles: ProfileRepository;
  settings: SettingsRepository;
  sessions: SessionRepository;
  curriculum: CurriculumRepository;
  integrity: IntegrityRepository;
  templates: TemplateRepository;
  judging: JudgingResultRepository;
  journal: JournalRepository;
  statistics: StatisticsRepository;
  phase0: Phase0Repository;
}

export function createRepositories(db: EOVDatabase): EOVDatabases {
  return {
    profiles: new ProfileRepository(db),
    settings: new SettingsRepository(db),
    sessions: new SessionRepository(db),
    curriculum: new CurriculumRepository(db),
    integrity: new IntegrityRepository(db),
    templates: new TemplateRepository(db),
    judging: new JudgingResultRepository(db),
    journal: new JournalRepository(db),
    statistics: new StatisticsRepository(db),
    phase0: new Phase0Repository(db),
  };
}

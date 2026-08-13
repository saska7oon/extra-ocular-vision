# Project State — Extra-Ocular Vision Training App
> Durable record of where this project stands. Update this file as work progresses.
> Last updated: 2026-08-11

## What this is
A local-first PWA that teaches "extra-ocular vision" (mindsight / seeing without
eyes) via a structured day-by-day curriculum. No cloud, local accounts, no
telemetry. However you find this repo, this file will tell you exactly how far
the build got and what's left.

## Status: IMPLEMENTED — ALL 8 PHASES WIRED (direct-repo mode, 2026-08-11)

The board-based multi-agent build was ABANDONED (kanban tasks archived). The
remaining work was done directly in this repo, one controlled step at a time,
committed and pushed per step. Do NOT re-open kanban swarm builds.

## What is DONE and VERIFIED
- Project scaffold: Vite + React 18 + TypeScript strict, Vitest, ESLint/Prettier
- PWA: builds green, service worker generated (6 precached entries), manual SW
  registration, offline-first via Workbox injectManifest
- Storage layer (Dexie/IndexedDB): profiles, sessions, exercise rounds,
  curriculum progress, tier progression, target chains, integrity audits,
  templates, judging results, journal, statistics, phase0 sessions+progress
- Local profile system: create profile, preferences, active-profile switching
- Feature: **Phase 0** (foundations) — cardiac coherence breathing + binaural
  beats. Components: BreathingGuide, BinauralPlayer, Phase0Dashboard,
  Phase0SessionCard, CombinedSession. Wired end-to-end (persist + day progress).
- **Unified forced-choice engine** (features/exercises) powering Phases 1-4 + 7:
  reproducible commit-before-reveal scoring (SHA-256 target locking) + binomial
  chance test. Reusable ForcedChoiceSession component.
- **Phase 1**: Contrast. **Phase 2**: Color. **Phase 3**: Shape.
  **Phase 4**: Letters/Numbers. **Phase 7**: Text reading.
- **Phase 5**: Complex targets + programmatic free-response judge (features/
  judging, tfidf/string-match, transparent breakdown, chance discounting).
  FreeResponseSession component + built-in template library.
- **Phase 6**: Environmental mapping (seated perception ONLY — no navigation,
  path tracking, or GPS, per safety constraint). Reuses judge + templates.
- **Phase 8**: Sustained practice / Mastery Mode — honest per-exercise mastery
  (binomial p-value vs chance), growth-area recommendations.
- Statistics dashboard (accuracy/chance/etc.) + SensoryProfile + journal.
- Tests: **163 passing** (up from 121), 7 skipped
- Build: green (tsc strict + vite build + PWA manifest inject)

## Phase-5/6 judge notes
Built-in template library (playing-cards, common-objects, animals,
environmental-mapping) in src/features/judging/. Judge is fully local and
deterministic (no embedding model, no network).

## Known gaps
- Browser click-through not verified in this environment (no Chrome; root-less
  box). Build/type/test verified. Run `npm run dev` locally to click through.
- Phase 5/6 judge uses keyword overlap (tfidf), not semantic embeddings.
- Some storage tests (7) are skipped (need a real IndexedDB environment).

## Resolved (added later)
- Difficulty tier progression: 5 tiers now wired into the engine + PhaseGym
  selector (advance >=80% x3, revert <60% x3).
- Mastery 'Practice more' now opens the matching forced-choice drill too,
  not only free-response categories.

## Method / conventions
- Binaural beats: generated in-app via Web Audio API (single shared engine,
  src/audio/BinauralPlayer), never duplicated per-phase.
- All data local (IndexedDB). Offline-first. No cloud.
- Accessibility: screen-reader compatible, keyboard nav, voice-only mode.
- Honesty: skepticism notices shown; string-match/tfidf judge is transparent;
  stats report "above/below chance" honestly, never certify ability.
- Commit-before-reveal SHA-256 target locking throughout the perceptual phases.

## Method / conventions
- Binaural beats: generated in-app via Web Audio API (single shared engine,
  `src/audio/BinauralPlayer`), NEVER duplicated per-phase. Phase 0 consumes it.
- All data local (IndexedDB). Offline-first. No cloud.
- Accessibility: screen-reader compatible, keyboard nav, voice-only mode.
- Honesty: skepticism notices shown; stats report "above/below chance" honestly.

## Acceptance bar per phase
Advance when accuracy >= 80% across 3 consecutive sessions; revert tier when
< 60% for 3 sessions. See docs/extra-ocular-vision-app-spec.md for full spec.

## Key files
- Spec: `docs/extra-ocular-vision-app-spec.md`
- App entry/integration: `src/App.tsx`
- Storage: `src/storage/`, types: `src/types/`
- Phase 0 logic: `src/features/phase0/`, Statistics: `src/features/statistics/`
- Audio: `src/audio/BinauralPlayer.tsx`, `src/audio/`
- UI: `src/ui/`, components: `src/components/`
- Tests: `tests/`

## Git
- Repo: https://github.com/saska7oon/extra-ocular-vision (public)
- Last verified commit: the integration-phase work (see `git log`)
- Always `git add -A && git commit && git push` per logical step

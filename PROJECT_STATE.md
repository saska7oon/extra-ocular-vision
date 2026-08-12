# Project State — Extra-Ocular Vision Training App
> Durable record of where this project stands. Update this file as work progresses.
> Last updated: 2026-08-11

## What this is
A local-first PWA that teaches "extra-ocular vision" (mindsight / seeing without
eyes) via a structured day-by-day curriculum. No cloud, local accounts, no
telemetry. However you find this repo, this file will tell you exactly how far
the build got and what's left.

## Status: IN-PROGRESS (integration phase, direct-repo mode)

The board-based multi-agent build was ABANDONED (kanban tasks archived). The
remaining work is being done directly in this repo, one controlled step at a
time, committed and pushed per step. Do NOT re-open kanban swarm builds.

## What is DONE and VERIFIED
- Project scaffold: Vite + React 18 + TypeScript strict, Vitest, ESLint/Prettier
- PWA: builds green, service worker generated (6 precached entries), manual SW
  registration, offline-first via Workbox injectManifest
- Storage layer (Dexie/IndexedDB): profiles, sessions, exercise rounds,
  curriculum progress, tier progression, target chains, integrity audits,
  templates, judging results, journal, statistics, phase0 sessions+progress
- Local profile system: create profile, preferences, active-profile switching
- Feature: **Phase 0** (foundations) — cardiac coherence breathing session +
  binaural beats. Components: BreathingGuide, BinauralPlayer, Phase0Dashboard,
  Phase0SessionCard, CombinedSession
- Feature: **Statistics** — matches/below-chance analysis + analytics worker,
  export (CSV/JSON/HTML), SensoryProfile, AccuracyDashboard, StatisticalAnalysis
- Rigor-controls and difficulty-system infrastructure present but NOT fully
  wired into a user-visible flow
- Tests: **121 passing, 7 skipped** (skip = storage integration needing real DB)
- Build: green (tsc strict + vite build + PWA manifest inject)
- Fixed during QA: first-launch dead-end (firstLaunchComplete now set on profile
  create + settings refresh), PWA manifest injection, CSS import paths,
  stats/export TS strict errors

## What is NOT done yet (the remaining curriculum)
The app currently reaches a "Ready to train" scaffold screen after first launch.
The actual progressive curriculum phases are NOT yet user-visible:

- **Phase 1: Contrast Discrimination** (days 8-14) — binary light/dark targets
- **Phase 2: Color Recognition** (days 15-28)
- **Phase 3: Shape Identification** (days 29-42)
- **Phase 4: Letters and Numbers** (days 43-70)
- **Phase 5: Complex Targets / free-response + programmatic judging** (days 71-98)
- **Phase 6: Environmental Mapping** (days 99-140)
- **Phase 7: Text Reading** (days 141-180)
- **Phase 8: Sustained Practice / mastery** (days 181+)

## Method / conventions
- Analyst chains: use ChatModel or subclass AsyncLLM, not the mixin on Analyst.
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

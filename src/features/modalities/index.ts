/**
 * Modality definitions with research-based explanations, goals, and objectives.
 * Used by both Free Play and the main progression for educational context.
 */

/* ==========================================================================
 * Phase 0: Foundations (State Management)
 * ========================================================================= */

export interface Modality {
  readonly id: string;
  readonly name: string;
  readonly shortName: string;
  readonly description: string;
  /** What this modality accomplishes (the "why") */
  readonly purpose: string;
  /** The specific goal/outcome */
  readonly goal: string;
  /** Research basis / scientific rationale */
  readonly researchBasis: string;
  /** Step-by-step what the user does */
  readonly protocol: readonly string[];
  /** Session duration in minutes */
  readonly durationMin: number;
  /** Visual icon/emoji for the card */
  readonly icon: string;
  /** Color theme for the card */
  readonly color: 'accent' | 'success' | 'warning' | 'error' | 'info';
  /** Whether this requires prior completion (for progression) */
  readonly requiresPhase0Complete: boolean;
  /** Phase number in the main curriculum */
  readonly phase?: number;
  /** Sub-phase/day in the curriculum */
  readonly dayRange?: string;
}

/** Breathing (Days 1-3) */
export const MODALITY_BREATHING: Modality = {
  id: 'breathing',
  name: 'Cardiac Coherence Breathing',
  shortName: 'Breathing',
  description: '0.1 Hz paced breathing (5s inhale / 5s exhale) to induce heart-brain coherence.',
  purpose: 'Establish the physiological baseline required for non-visual perception. Cardiac coherence synchronizes heart rate variability with breathing, shifting the autonomic nervous system from sympathetic (fight/flight) to parasympathetic (rest/digest) dominance. All major programs (HeartMath, Mindsight, Vibravision) identify this as the prerequisite state.',
  goal: 'Reliably induce a calm, coherent state within 5 minutes. Reduce mental chatter and analytical interference that blocks subtle perception.',
  researchBasis: 'HeartMath Institute (McCraty et al., 1998-2023): 0.1 Hz breathing maximizes HRV coherence, correlates with improved intuitive discrimination tasks. Institute of Noetic Sciences 2023 proposal: coherence training is the only consistently replicated preparation across 9 surveyed programs.',
  protocol: [
    'Sit comfortably, spine straight, eyes closed or blindfolded.',
    'Follow the expanding/collapsing circle: inhale 5s as it expands, exhale 5s as it contracts.',
    'Complete 5 cycles per set, 3 sets per session (15 min total).',
    'Optional: Enable heartbeat audio to synchronize with your own rhythm.',
    'Rate your state 1-10 before and after to track subjective shift.',
  ],
  durationMin: 15,
  icon: '🫁',
  color: 'accent',
  requiresPhase0Complete: false,
  phase: 0,
  dayRange: 'Days 1-3',
};

/** Binaural Beats (Days 4-5) */
export const MODALITY_BINAURAL: Modality = {
  id: 'binaural',
  name: 'Binaural Beats Entrainment',
  shortName: 'Binaural',
  description: 'Stereo audio with slightly different frequencies per ear, creating a perceived "beat" that entrains brainwaves.',
  purpose: 'Guide the brain into specific frequency states associated with non-visual perception: Alpha (10 Hz) for relaxed awareness/hypnagogic bridge, Theta (6 Hz) for deep meditation/unconscious access, Gamma (40 Hz) for heightened perception/neural binding.',
  goal: 'Learn to recognize and voluntarily enter alpha/theta states. Distinguish the subjective "feel" of each frequency band.',
  researchBasis: 'Hemi-Sync (Monroe Institute, 1970s-present): Binaural beats at 4-10 Hz facilitate hemispheric synchronization. Vibravision/Olympic training: Gamma (40 Hz) linked to "binding" of distributed neural activity into unified percepts. Oster (1973) Scientific American: Binaural beats require stereo headphones; carrier tone typically 150-250 Hz.',
  protocol: [
    'Use stereo headphones (required — binaural beats do not work on speakers).',
    'Select target frequency: Alpha (10 Hz) for bridge state, Theta (6 Hz) for deep meditation, Gamma (40 Hz) for heightened perception.',
    'Set volume to comfortable level (fade-in over 5 seconds).',
    'Listen for 10-15 minutes while maintaining relaxed awareness.',
    'Rate state 1-10 before/after. Note subjective quality differences between frequencies.',
  ],
  durationMin: 15,
  icon: '🎧',
  color: 'info',
  requiresPhase0Complete: false,
  phase: 0,
  dayRange: 'Days 4-5',
};

/** Combined (Days 6-7) */
export const MODALITY_COMBINED: Modality = {
  id: 'combined',
  name: 'Combined Preparation Flow',
  shortName: 'Combined',
  description: 'Sequential flow: Cardiac coherence breathing → Binaural beats (Alpha) → Heart-center visualization.',
  purpose: 'Chain the three foundational techniques into a single 15-minute preparation ritual. This is the exact sequence used before every perception session in the main curriculum.',
  goal: 'Master the complete preparation sequence so it becomes automatic. Achieve consistent pre-perception state in under 15 minutes.',
  researchBasis: 'All 9 surveyed programs (Mindsight Journey, Vision Without Eyes, MindSee, Vibravision, Blindfold Lab, Awakened Abilities, Radiant Sight, Evelyn Ohly, Four Pillars) converge on a 3-part preparation: breath → entrainment → visualization/intent. The combination creates a "stacked" state deeper than any single technique.',
  protocol: [
    'Stage 1 (5 min): Cardiac coherence breathing with heartbeat audio.',
    'Stage 2 (5 min): Alpha binaural beats (10 Hz) — maintain the coherent state.',
    'Stage 3 (5 min): Heart-center visualization — soften gaze, rest attention at heart center, feel warmth/expansion.',
    'This sequence runs automatically; advance stages manually when ready.',
    'Rate state before Stage 1 and after Stage 3.',
  ],
  durationMin: 15,
  icon: '✨',
  color: 'success',
  requiresPhase0Complete: false,
  phase: 0,
  dayRange: 'Days 6-7',
};

/* ==========================================================================
 * Phase 1-4: Forced-Choice Perception (Phases 1-4)
 * ========================================================================= */

export const MODALITY_CONTRAST: Modality = {
  id: 'contrast',
  name: 'Contrast Discrimination (Light/Dark)',
  shortName: 'Contrast',
  description: 'Binary forced-choice: perceive whether a hidden target is light or dark.',
  purpose: 'Establish the most fundamental perceptual signal — the difference between presence and absence of light energy. This is the "hello world" of extra-ocular vision. If you cannot discriminate light/dark above chance, higher modalities will not work.',
  goal: 'Achieve statistically significant accuracy (>60%, p<0.05) on 2-choice light/dark discrimination with total blackout blindfold.',
  researchBasis: 'Phase 1 of all 9 programs. Vibravision starts with "black/white paddle" at 6 inches. Mindsight Journey Module 1: binary contrast. Sensory leakage control is critical here — Goalfix Eclipse blindfold + cotton padding eliminates 99.9% of ambient light (Paralympic standard).',
  protocol: [
    'Apply total blackout blindfold (Goalfix Eclipse recommended) with cotton padding around eyes.',
    'System randomly selects LIGHT or DARK target (SHA-256 locked before session).',
    'Perceive the target with eyes covered — notice any brightness, glow, pressure, or "knowing".',
    'Commit your answer (Light or Dark) BEFORE reveal. This commitment is cryptographically verified.',
    'Target revealed. Accuracy scored. 12 rounds per session minimum.',
    'Advance when ≥80% accuracy for 3 consecutive sessions.',
  ],
  durationMin: 10,
  icon: '◐',
  color: 'accent',
  requiresPhase0Complete: true,
  phase: 1,
  dayRange: 'Days 8-14',
};

export const MODALITY_COLOR: Modality = {
  id: 'color',
  name: 'Color Recognition',
  shortName: 'Color',
  description: 'Forced-choice color discrimination: red, blue, green, yellow — feel the "temperature" and quality of each color.',
  purpose: 'Extend perception from binary contrast to chromatic qualities. Each color has a distinct subjective "feel" (synesthetic mapping): Red=warm/pressure, Blue=cool/expansive, Green=balanced/neutral, Yellow=bright/sharp. This builds the sensory vocabulary for higher phases.',
  goal: 'Reliably discriminate 4 colors at ≥70% accuracy (chance=25%). Build color-specific confusion matrix to identify perceptual strengths.',
  researchBasis: 'All programs: Red/Blue/Green/Yellow are the universal starting set. Mindsight Journey: "Color feeling" precedes color naming. Synesthetic approach — colors felt as temperature/texture/pressure, not visual memory. Progression: 2-choice → 3-choice → 4-choice as accuracy improves.',
  protocol: [
    'Blindfold + cotton padding + cotton gloves (eliminate tactile cues from colored cards).',
    'System selects random color from current set (2/3/4 choices based on tier). Target SHA-256 locked.',
    'Perceive the color — attend to warmth/coolness, pressure, expansion, vibration, "knowing".',
    'Commit answer before reveal. Track per-color accuracy and confusion patterns.',
    '12 rounds minimum. Confusion matrix reveals which colors you conflate (e.g., red↔yellow warmth).',
  ],
  durationMin: 10,
  icon: '🎨',
  color: 'warning',
  requiresPhase0Complete: true,
  phase: 2,
  dayRange: 'Days 15-28',
};

export const MODALITY_SHAPE: Modality = {
  id: 'shape',
  name: 'Shape Identification',
  shortName: 'Shape',
  description: 'Forced-choice geometric form perception: circle, square, triangle, plus/rectangle — feel edges, corners, centers.',
  purpose: 'Shift from chromatic to spatial/form perception. Shapes are perceived through "edge sensing" (boundaries as tactile warmth), "center pulling" (geometric center as pressure point), and "angular awareness" (corners sharp/cool, curves soft/warm).',
  goal: 'Discriminate 4 shapes at ≥70% accuracy (chance=25%). Progress to combined color×shape (16 choices) at ≥75%.',
  researchBasis: 'Phase 3 across programs. Vibravision: "Shape feels like pressure on the skin." Blindfold Lab: "Edges have temperature." Combined color-shape (16 combos) is the bridge to symbolic perception — same cognitive load as alphanumeric.',
  protocol: [
    'Blindfold + padding + gloves. Targets: circle, square, triangle, plus/rectangle.',
    'Perceive form: trace edges mentally, feel center pull, notice corner sharpness vs curve softness.',
    'Commit shape choice before reveal. Track per-shape accuracy.',
    'Tier progression: 2-shape → 3-shape → 4-shape → color×shape (16 combos).',
    'Confidence rating (1-5) correlates with accuracy — learn to trust high-confidence perceptions.',
  ],
  durationMin: 10,
  icon: '🔷',
  color: 'success',
  requiresPhase0Complete: true,
  phase: 3,
  dayRange: 'Days 29-42',
};

export const MODALITY_SYMBOL: Modality = {
  id: 'symbol',
  name: 'Letters & Numbers (Symbolic Perception)',
  shortName: 'Symbols',
  description: 'Forced-choice alphanumeric perception: digits 0-9, capital letters A-Z, combined alphanumeric.',
  purpose: 'Transition from concrete sensory qualities (color/shape) to abstract symbolic representation. This is the gateway to functional literacy (Phase 7). Symbols require "pattern completion" from partial percepts and "multi-symbol scanning" for sequences.',
  goal: 'Achieve ≥75% on 10-choice digits, ≥80% on 26-choice letters, ≥80% on 36-choice alphanumeric (chance=2.8%).',
  researchBasis: 'Phase 4 convergence. Mindsight Journey: Numbers before letters (simpler forms). Evelyn Ohly: "Letters are shapes with meaning." Pattern completion — perceive partial symbol, brain fills rest. Multi-symbol scanning enables reading words (Phase 7).',
  protocol: [
    'Blindfold + padding + gloves. Target pool: digits → letter subset → full A-Z → alphanumeric.',
    'Perceive symbol: notice stroke direction, enclosed spaces, symmetry, "feel" of each character.',
    'Commit before reveal. Track per-symbol accuracy and confusion matrix (e.g., O↔Q, 6↔9).',
    'Advanced: multi-symbol sequences (perceive 2-3 symbols in order).',
  ],
  durationMin: 12,
  icon: '🔤',
  color: 'info',
  requiresPhase0Complete: true,
  phase: 4,
  dayRange: 'Days 43-70',
};

export const MODALITY_TEXT_READING: Modality = {
  id: 'text-reading',
  name: 'Text Reading',
  shortName: 'Text',
  description: 'Read words, sentences, and paragraphs without physical sight using forced-choice + free-response.',
  purpose: 'Functional literacy without eyes. The ultimate practical test of extra-ocular vision. Starts with large-font single words, progresses to sentences and paragraphs.',
  goal: 'Read 12-point words at ≥80% word accuracy, progress to 8-point sentences at ≥75%, then short paragraphs.',
  researchBasis: 'Phase 7. Seminar demonstrations (Vibravision, Radiant Sight) show fluent reading. Protocol: SHA-256 locked text targets, user commits written description before reveal. Accuracy = word/character match rate. Speed = time to first correct perception.',
  protocol: [
    'Blindfold + padding. Text targets: large words → small words → sentences → paragraphs.',
    'Perceive text: scan left-to-right, notice word shapes, letter patterns, spacing.',
    'Commit written transcription before reveal. System scores word/character accuracy.',
    'Free-response scoring uses same programmatic judge as Phase 5 (TF-IDF + semantic match).',
  ],
  durationMin: 15,
  icon: '📖',
  color: 'accent',
  requiresPhase0Complete: true,
  phase: 7,
  dayRange: 'Days 141-180',
};

/* ==========================================================================
 * Phase 5-6: Free-Response / Complex Targets
 * ========================================================================= */

export const MODALITY_COMPLEX_TARGETS: Modality = {
  id: 'complex-targets',
  name: 'Complex Targets (Free-Response)',
  shortName: 'Complex',
  description: 'Open-ended perception: playing cards, common objects, complex scenes. Describe before reveal; programmatic judge scores your description.',
  purpose: 'Move beyond forced-choice to naturalistic perception. You perceive a hidden target, describe it in your own words, and a transparent algorithm (TF-IDF keyword matching + semantic similarity) scores your description against the actual target and a chance baseline.',
  goal: 'Achieve programmatic match scores significantly above chance. Build descriptive richness (specificity, unique terms). Learn which target categories you perceive best.',
  researchBasis: 'Phase 5 (Days 71-98). Playing cards (52 choices), 20 common objects, complex scene fragments. Judge: client-side TF-IDF + optional quantized embeddings. Transparency: user sees which words matched, which matched wrong templates, and chance-adjusted score.',
  protocol: [
    'Blindfold + padding. Select category: playing-cards, common-objects, animals, etc.',
    'System locks random target (SHA-256). You perceive and TYPE your description.',
    'Submit description → Target revealed → Programmatic judge scores match (0-10).',
    'Judge shows: matched keywords, missing keywords, false matches to other templates, chance baseline.',
    'No forced choices — your natural perception vocabulary is the signal.',
  ],
  durationMin: 15,
  icon: '🃏',
  color: 'warning',
  requiresPhase0Complete: true,
  phase: 5,
  dayRange: 'Days 71-98',
};

export const MODALITY_ENVIRONMENTAL_MAPPING: Modality = {
  id: 'environmental-mapping',
  name: 'Environmental Mapping (Spatial Awareness)',
  shortName: 'Spatial',
  description: 'Perceive room boundaries, object locations, and movement in real space while blindfolded.',
  purpose: 'Panoramic 360° spatial perception — the "seeing the room" capability. Start with stationary mapping (walls, furniture), progress to dynamic tracking (person walking), then guided navigation. Safety-first: spotter required, controlled environment.',
  goal: 'Map a room within 2m accuracy. Track moving person. Navigate predefined path without collision.',
  researchBasis: 'Phase 6 (Days 99-140). Vision Without Eyes / Blindfold Lab safety protocols: controlled obstacle-free room, mandatory spotter, taped boundaries, emergency blindfold removal. No GPS/motion tracking — user reports spatial impressions verbally or via spotter.',
  protocol: [
    'SAFETY FIRST: Clear room, spotter present, boundaries taped, emergency protocol reviewed.',
    'Select exercise: Room boundaries → Object locations → Movement tracking → Navigation.',
    'Perceive space: scan 360°, notice pressure/density/temperature changes at boundaries.',
    'Report locations verbally; spotter measures actual vs claimed distance.',
    'Navigation: walk path, spotter prevents collision. Log collisions/deviations.',
  ],
  durationMin: 20,
  icon: '🗺️',
  color: 'error',
  requiresPhase0Complete: true,
  phase: 6,
  dayRange: 'Days 99-140',
};

/* ==========================================================================
 * All modalities registry
 * ========================================================================= */

export const ALL_MODALITIES: readonly Modality[] = [
  MODALITY_BREATHING,
  MODALITY_BINAURAL,
  MODALITY_COMBINED,
  MODALITY_CONTRAST,
  MODALITY_COLOR,
  MODALITY_SHAPE,
  MODALITY_SYMBOL,
  MODALITY_TEXT_READING,
  MODALITY_COMPLEX_TARGETS,
  MODALITY_ENVIRONMENTAL_MAPPING,
] as const;

export const FREE_PLAY_MODALITIES = ALL_MODALITIES;

export const PROGRESSION_MODALITIES = ALL_MODALITIES.filter(m => m.requiresPhase0Complete);

export const PHASE0_MODALITIES = ALL_MODALITIES.filter(m => m.phase === 0);

export function getModalityById(id: string): Modality | undefined {
  return ALL_MODALITIES.find(m => m.id === id);
}

export function getModalitiesByPhase(phase: number): Modality[] {
  return ALL_MODALITIES.filter(m => m.phase === phase);
}

export function getNextModality(currentId: string): Modality | undefined {
  const idx = ALL_MODALITIES.findIndex(m => m.id === currentId);
  if (idx >= 0 && idx < ALL_MODALITIES.length - 1) {
    return ALL_MODALITIES[idx + 1];
  }
  return undefined;
}
/**
 * Tutorial content for each modality and section.
 * Each tutorial includes detailed background, scientific basis, protocol, and tips.
 */

export interface TutorialSlide {
  id: string;
  title: string;
  content: string;
  /** Optional visual aid type */
  visual?: 'animation' | 'diagram' | 'video' | 'interactive';
  /** Optional interactive element */
  interactive?: {
    type: 'breathing' | 'binaural' | 'veil-demo' | 'confidence-calibration';
    config?: Record<string, unknown>;
  };
}

export interface TutorialSection {
  id: string;
  modalityId: string;
  title: string;
  description: string;
  /** Estimated time to complete */
  durationMinutes: number;
  slides: TutorialSlide[];
}

export interface TutorialCategory {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  sections: TutorialSection[];
}

/* ==========================================================================
 * TUTORIAL CONTENT
 * ========================================================================= */

export const TUTORIAL_CATEGORIES: readonly TutorialCategory[] = [
  {
    id: 'foundation',
    title: 'Foundation Phase (Phase 0)',
    description: 'Build the physiological and mental foundation for all perception training',
    icon: '🧘',
    color: 'accent',
    sections: [
      {
        id: 'breathing-tutorial',
        modalityId: 'breathing',
        title: 'Cardiac Coherence Breathing',
        description: 'Master 0.1 Hz breathing to establish heart-brain coherence',
        durationMinutes: 8,
        slides: [
          {
            id: 'breathing-1',
            title: 'The Science of Cardiac Coherence',
            content: `Cardiac coherence is a measurable state where heart rate variability (HRV) becomes rhythmic and synchronized with breathing at 0.1 Hz (6 breaths per minute, 5 seconds in / 5 seconds out).

**Research Basis:**
- HeartMath Institute (McCraty et al., 1998-2023): 0.1 Hz breathing maximizes HRV coherence
- Institute of Noetic Sciences 2023 proposal: coherence training is the only consistently replicated preparation across 9 surveyed extra-ocular vision programs
- Coherence correlates with improved intuitive discrimination tasks and cognitive performance

**Why it matters for perception:**
- Shifts autonomic nervous system from sympathetic (fight/flight) to parasympathetic (rest/digest)
- Reduces mental chatter and analytical interference that blocks subtle perception
- Creates the "quiet mind" prerequisite identified by all major programs`,
            visual: 'animation',
            interactive: { type: 'breathing' },
          },
          {
            id: 'breathing-2',
            title: 'The Protocol - Step by Step',
            content: `**Session Structure (15 minutes):**
- 3 sets of 5 cycles each (5 seconds inhale / 5 seconds exhale)
- 10-second rest between sets
- Optional heartbeat audio for synchronization

**Step-by-step:**
1. Sit comfortably, spine straight, eyes closed or blindfolded
2. Follow the expanding/collapsing circle: inhale 5s as it expands, exhale 5s as it contracts
3. Complete 5 cycles (50 seconds), rest 10 seconds
4. Repeat for 3 sets total (15 minutes)
5. Rate your state 1-10 before and after to track subjective shift

**Key Points:**
- Consistency > intensity: 15 minutes daily beats 60 minutes weekly
- The 0.1 Hz rhythm is critical — slower or faster doesn't produce coherence
- Use the visual guide; don't count in your head`,
            visual: 'diagram',
          },
          {
            id: 'breathing-3',
            title: 'Common Mistakes & Troubleshooting',
            content: `**Common Mistakes:**
- **Breathing too shallow:** Use diaphragmatic breathing — belly expands, chest stays relatively still
- **Counting in your head:** Let the visual guide pace you; mental counting engages analytical mind
- **Forcing the breath:** The rhythm should feel natural, not forced
- **Skipping rest periods:** The 10-second rests between sets are part of the protocol

**If you feel dizzy/lightheaded:**
- Slow down slightly, ensure full exhales
- This usually passes as your CO2 tolerance improves

**Tracking Progress:**
- Rate state 1-10 before/after each session
- Look for: faster time to coherence, deeper subjective calm, better sleep quality
- The app tracks your state history automatically`,
            visual: 'diagram',
          },
        ],
      },
      {
        id: 'binaural-tutorial',
        modalityId: 'binaural',
        title: 'Binaural Beats Entrainment',
        description: 'Learn to recognize and voluntarily enter alpha/theta/gamma brainwave states',
        durationMinutes: 10,
        slides: [
          {
            id: 'binaural-1',
            title: 'The Science of Binaural Beats',
            content: `**How Binaural Beats Work:**
When two slightly different frequencies are played — one in each ear — the brain perceives a third "beat" frequency equal to the difference. This entrains brainwaves toward that frequency.

**Example:** Left ear 155 Hz, Right ear 145 Hz → Brain perceives 10 Hz (Alpha)

**Carrier Tone:** 150 Hz (optimal for binaural perception)

**Frequency States:**
| Frequency | State | Purpose for Perception |
|-----------|-------|------------------------|
| **Alpha (10 Hz)** | Relaxed awareness | "Hypnagogic bridge" — threshold between waking and sleep |
| **Theta (6 Hz)** | Deep meditation | Unconscious access, creative insight |
| **Gamma (40 Hz)** | Heightened perception | Neural "binding" — unified percepts |

**Research Basis:**
- Oster (1973) Scientific American: Binaural beats require stereo headphones
- Hemi-Sync/Monroe Institute: Hemispheric synchronization at 4-10 Hz
- Vibravision/Olympic training: Gamma (40 Hz) linked to "binding" of distributed neural activity
- Institute of Noetic Sciences 2023: All 9 surveyed programs use some form of entrainment`,
            visual: 'animation',
          },
          {
            id: 'binaural-2',
            title: 'Choosing Your Frequency',
            content: `**Start with Alpha (10 Hz):**
- "Bridge state" between waking and sleep
- Most accessible for beginners
- Best for general perception preparation

**Progress to Theta (6 Hz):**
- Deeper meditative state
- Use after 1-2 weeks of consistent Alpha practice
- May produce vivid imagery or spontaneous insights

**Advanced: Gamma (40 Hz):**
- "Binding" state — neural synchronization
- Use for advanced perception sessions
- Can feel intense; limit to 10-15 minutes

**Session Protocol:**
1. Use **stereo headphones** (required — binaural beats don't work on speakers)
2. Select target frequency
3. Set comfortable volume (fade-in over 5 seconds)
4. Listen 10-15 minutes while maintaining relaxed awareness
5. Rate state 1-10 before/after; note subjective quality differences`,
            visual: 'diagram',
            interactive: { type: 'binaural' },
          },
          {
            id: 'binaural-3',
            title: 'Headphone Requirements & Troubleshooting',
            content: `**Headphone Requirements:**
- **Must be stereo** (left/right channels isolated)
- **Over-ear preferred** for isolation
- **No noise-cancelling processing** that might alter phase
- **Wired preferred** (Bluetooth can introduce latency/jitter)

**The App Detects Headphones Automatically:**
- Uses latency heuristic on audio context
- Shows warning if headphones not detected
- You can override if detection fails

**Common Issues:**
| Issue | Solution |
|-------|----------|
| "Headphones not detected" | Check connection, try different headphones, ensure stereo |
| Volume too loud/quiet | Use system volume + app volume slider; start low |
| Uncomfortable sensation | Lower volume, shorter sessions, try different frequency |
| Falling asleep | Sit up straighter, use Alpha not Theta, shorter sessions |

**Safety Note:** If you have epilepsy or seizure disorder, consult a physician before using binaural beats.`,
            visual: 'diagram',
          },
        ],
      },
      {
        id: 'combined-tutorial',
        modalityId: 'combined',
        title: 'Combined Preparation Flow',
        description: 'Chain breathing → binaural → visualization into a 15-minute preparation ritual',
        durationMinutes: 8,
        slides: [
          {
            id: 'combined-1',
            title: 'Why Combine All Three?',
            content: `**The Stacked State Principle:**
All 9 surveyed programs converge on a 3-part preparation:
1. **Breath** → physiological coherence (heart-brain sync)
2. **Entrainment** → neural synchronization (brainwave state)
3. **Visualization** → intentional focus (directed attention)

**The Combined Session (15 minutes):**
| Stage | Duration | Activity |
|-------|----------|----------|
| 1 | 5 min | Cardiac coherence breathing + heartbeat |
| 2 | 5 min | Alpha binaural beats (10 Hz) |
| 3 | 5 min | Heart-center visualization |

**Why Sequential, Not Simultaneous?**
- Each stage builds on the previous
- Breath establishes physiological baseline
- Binaural deepens the state breath created
- Visualization directs the state toward perception intent

**Research Basis:** All 9 surveyed programs (Mindsight Journey, Vision Without Eyes, MindSee, Vibravision, Blindfold Lab, Awakened Abilities, Radiant Sight, Evelyn Ohly, Four Pillars) use this 3-part stack.`,
            visual: 'diagram',
          },
          {
            id: 'combined-2',
            title: 'Heart-Center Visualization Technique',
            content: `**The Practice (5 minutes):**
1. After binaural stage, keep eyes closed/blindfolded
2. Bring attention to center of chest (heart area)
3. Imagine a point of warm, golden light there
4. With each breath, feel it expand slightly
5. No strain — gentle attention, like watching a candle flame
6. If mind wanders, gently return to heart center

**What You Might Experience:**
- Warmth, pressure, or tingling in chest
- Sense of expansion or "opening"
- Spontaneous imagery or colors
- Deep sense of calm or wellbeing

**Key Principle:** This isn't visualization in the imaginative sense — it's *directed attention* to the heart center. The physiological coherence from breathing + neural synchronization from binaural makes this attention unusually stable and penetrating.

**Common Challenges:**
- "I can't visualize" → You don't need to "see" it. Feel the attention at heart center.
- Mind wanders constantly → Normal. Each return strengthens attention muscle.
- "Nothing happens" → The effect is cumulative. Track state ratings over weeks.`,
            visual: 'animation',
            interactive: { type: 'veil-demo' },
          },
        ],
      },
    ],
  },
  {
    id: 'perception',
    title: 'Perception Phases (1-7)',
    description: 'Progressive discrimination training from binary contrast to text reading',
    icon: '🎯',
    color: 'success',
    sections: [
      {
        id: 'contrast-tutorial',
        modalityId: 'contrast',
        title: 'Phase 1: Contrast Discrimination (Light/Dark)',
        description: 'The fundamental perceptual signal — presence vs. absence of light energy',
        durationMinutes: 6,
        slides: [
          {
            id: 'contrast-1',
            title: 'Why Contrast First?',
            content: `**The Fundamental Signal:**
Contrast (light vs. dark) is the most basic visual signal. If you cannot discriminate light/dark above chance, higher modalities (color, shape, text) will not work.

**The Protocol (Phase 1, Days 8-14):**
- Binary forced-choice: LIGHT vs. DARK (2 choices, chance = 50%)
- 20 rounds per session
- Total blackout blindfold + cotton padding
- SHA-256 commitment before reveal

**Progression:**
- Days 8-9: High contrast (black/white panels)
- Days 10-11: Moving vs. still target discrimination
- Days 12-14: Graded contrast (black → dark grey → light grey → white)

**Rigor Controls (Critical):**
- **Goalfix Eclipse blindfold** (Paralympic standard) + cotton padding
- **Nose-bridge seal** with tape (video tutorial in app)
- **Cotton gloves** for handling targets
- **Opaque containers** for target cards (no tactile cues)
- **Commit-before-reveal** with SHA-256 cryptographic locking`,
            visual: 'diagram',
          },
          {
            id: 'contrast-2',
            title: 'What "Perceiving" Light/Dark Actually Feels Like',
            content: `**It's Not Visual Imagery:**
Don't expect to "see" light with your eyes closed. The perception arrives as:

**Common Sensations:**
- **Pressure/Temperature:** Light = warmth/expansion, Dark = coolness/contraction
- **"Knowing":** Sudden certainty without sensory qualities
- **Pressure on forehead/eyes:** Subtle pressure changes
- **Mental "flash":** Brief, non-visual impression

**What NOT to Do:**
- ❌ Don't try to "visualize" light
- ❌ Don't strain or concentrate hard
- ❌ Don't guess — if uncertain, acknowledge uncertainty

**What TO Do:**
- ✅ Relax into the breath-established state
- ✅ Hold gentle intention: "What is the target?"
- ✅ Notice whatever arises without judgment
- ✅ Commit your answer before reveal (the commitment IS the training)

**Advancement Criteria:** ≥80% accuracy for 3 consecutive sessions → advance to next contrast level`,
            visual: 'animation',
            interactive: { type: 'veil-demo' },
          },
        ],
      },
      {
        id: 'color-tutorial',
        modalityId: 'color',
        title: 'Phase 2: Color Recognition',
        description: 'Perceive the distinct "feel" of each color — red/blue/green/yellow',
        durationMinutes: 8,
        slides: [
          {
            id: 'color-1',
            title: 'The Synesthetic Approach to Color',
            content: `**Colors Have Distinct "Feels":**
Extra-ocular color perception is typically **synesthetic** — colors are felt as temperature, texture, pressure, or spatial qualities, not visual hue.

**Color Signatures (Typical):**
| Color | Typical Sensation | Keywords |
|-------|-------------------|----------|
| **Red** | Warm, pressure, forward, dense | Heat, weight, closeness, intensity |
| **Blue** | Cool, expansive, receding, light | Cold, space, distance, calm |
| **Green** | Neutral, balanced, pulsing | Equilibrium, rhythm, life, center |
| **Yellow** | Bright, sharp, electric, forward | Brightness, alertness, spike, near |

**Progression (Days 15-28):**
| Days | Exercise | Choices | Chance |
|------|----------|---------|--------|
| 15-18 | Single color association | 1 (feel the color) | — |
| 19-21 | Color discrimination | 2 (Red vs Blue) | 50% |
| 22-25 | 3-color identification | 3 | 33% |
| 26-28 | 4-color identification | 4 (R/B/G/Y) | 25% |

**Advancement:** ≥80% accuracy for 3 consecutive sessions → advance to next level`,
            visual: 'diagram',
          },
          {
            id: 'color-2',
            title: 'Building Your Color Vocabulary',
            content: `**Developing Personal Signatures:**
Everyone's color "feels" are slightly different. The goal is to discover YOUR consistent signatures.

**Practice Method:**
1. **Single Color Sessions (Days 15-18):** Target is always RED. Feel it. Note sensations. Next session: always BLUE. Etc.
2. **Discrimination Sessions:** Target randomly selected from current set. You discriminate.
3. **Track Confusion Matrix:** The app shows which colors you confuse (e.g., Red↔Yellow warmth confusion).

**Key Insights from Research:**
- **Red vs. Blue** is usually easiest (opposite temperatures)
- **Green vs. Yellow** often confused initially (both "forward/bright")
- **Red vs. Yellow** can confuse (both "warm/forward") — differentiate by *quality*: Red = pressure/weight, Yellow = brightness/sharpness

**Glove Protocol:** Cotton gloves required — eliminates tactile cues from colored cards.

**Tracking:** App shows per-color accuracy and confusion matrix automatically.`,
            visual: 'diagram',
          },
        ],
      },
      {
        id: 'shape-tutorial',
        modalityId: 'shape',
        title: 'Phase 3: Shape Identification',
        description: 'Perceive spatial form through edge sensing, center pulling, and angular awareness',
        durationMinutes: 8,
        slides: [
          {
            id: 'shape-1',
            title: 'From Color to Form',
            content: `**The Perceptual Shift:**
Color = chromatic quality (temperature, weight). Shape = spatial form (edges, centers, angles).

**Shape Signatures (Typical):**
| Shape | Edge Quality | Center Feel | Keywords |
|-------|--------------|-------------|----------|
| **Circle** | Smooth, continuous pull | Strong center pull | Smooth, infinite, soft, whole |
| **Square** | 4 distinct edges, corners | 4 corner anchors | Stable, structured, corners |
| **Triangle** | 3 sharp edges, apex | Single apex pull | Sharp, directed, pointed |
| **Star** | Multiple sharp points | Multiple pulls | Radiant, complex, spikes |
| **Cross** | Intersecting lines | Dual centers | Intersection, balance, duality |
| **Diamond** | 4 angled edges | Center + corners | Geometric, faceted, precise |

**Progression (Days 29-42):**
| Days | Exercise | Choices |
|------|----------|---------|
| 29-32 | Circle vs Square | 2 |
| 33-36 | Circle, Square, Triangle | 3 |
| 37-40 | + Cross/Rectangle | 4 |
| 41-42 | Color × Shape (16 combos) | 16 |

**Perceptual Techniques Taught:**
- **Edge Sensing:** Feeling boundaries as tactile warmth
- **Center Pulling:** Sensing geometric center as pressure point
- **Angular Awareness:** Corners = sharp/cool, Curves = soft/warm

**Combined Color×Shape (Days 41-42):** Bridge to symbolic perception — same cognitive load as alphanumeric.`,
            visual: 'diagram',
          },
          {
            id: 'shape-2',
            title: 'Edge Sensing & Center Pulling Practice',
            content: `**Edge Sensing Exercise:**
1. Perceive the target
2. Mentally "trace" the boundary
3. Notice: smooth/continuous (circle) vs. distinct segments with corners (square, triangle)
3. Feel the "temperature" of edges: curves = warm/soft, angles = cool/sharp

**Center Pulling Exercise:**
1. Perceive the target
2. Let attention settle at geometric center
3. Notice: single strong pull (circle, triangle apex) vs. multiple pulls (star, cross) vs. distributed (square)

**Advancement Criteria:**
- ≥70% accuracy on 4-shape for 3 consecutive sessions
- Then advance to Color×Shape (16 choices, chance = 6.25%)
- ≥75% accuracy for 3 sessions → Phase 4 (Symbols)

**Common Confusions & Differentiation:**
- **Circle vs. Diamond:** Diamond has sharp corners, Circle has none
- **Square vs. Cross:** Cross has intersecting lines, Square has perimeter
- **Triangle vs. Star:** Triangle = 3 points, Star = 5+ points

**Tracking:** App provides per-shape accuracy and confusion matrix.`,
            visual: 'animation',
          },
        ],
      },
      {
        id: 'symbol-tutorial',
        modalityId: 'symbol',
        title: 'Phase 4: Letters & Numbers (Symbolic Perception)',
        description: 'Transition from concrete forms to abstract symbols — gateway to functional literacy',
        durationMinutes: 8,
        slides: [
          {
            id: 'symbol-1',
            title: 'The Abstraction Leap',
            content: `**Why Symbols Are Harder:**
Color/Shape = concrete sensory qualities. Symbols = arbitrary abstract representations requiring **pattern completion** from partial percepts.

**Progression (Days 43-70):**
| Days | Exercise | Pool | Choices | Chance |
|------|----------|------|---------|--------|
| 43-49 | Single digits | 0-9 | 10 | 10% |
| 50-56 | Capital letters (subset) | 10 letters | 10 | 10% |
| 57-63 | Full capital letters | A-Z | 26 | 3.8% |
| 64-70 | Alphanumeric | A-Z, 0-9 | 36 | 2.8% |

**Techniques Introduced:**
- **Pattern Completion:** Perceive partial symbol, brain fills rest
- **Multi-Symbol Scanning:** Perceiving multiple symbols simultaneously
- **Symbol Sequencing:** Perceiving order/position

**Key Insight (Evelyn Ohly):** "Letters are shapes with meaning." The perceptual machinery for shape recognition is repurposed for symbols.`,
            visual: 'diagram',
          },
          {
            id: 'symbol-2',
            title: 'Symbol-Specific Techniques',
            content: `**Pattern Completion:**
1. Perceive partial symbol (e.g., top curve of "B")
2. Brain completes the pattern automatically
3. Don't force — let completion arise

**Multi-Symbol Scanning:**
1. Perceive 2-3 symbols in sequence
2. Notice spatial order (left-to-right)
3. This enables word reading (Phase 7)

**Common Confusion Matrix (Track in App):**
- **O ↔ Q** (closed vs. tail)
- **6 ↔ 9** (rotation)
- **M ↔ W** (rotation)
- **b ↔ d ↔ p ↔ q** (rotation/reflection)
- **I ↔ l ↔ 1** (vertical line)
- **O ↔ 0** (shape)

**Advancement:**
- ≥75% on 10-choice digits for 3 sessions → Letters
- ≥80% on 26-choice letters for 3 sessions → Alphanumeric
- ≥80% on 36-choice alphanumeric for 3 sessions → Phase 5 (Complex Targets)

**Tracking:** Per-symbol accuracy + confusion matrix in app.`,
            visual: 'animation',
          },
        ],
      },
      {
        id: 'text-tutorial',
        modalityId: 'text-reading',
        title: 'Phase 7: Text Reading',
        description: 'Functional literacy without eyes — words, sentences, paragraphs',
        durationMinutes: 10,
        slides: [
          {
            id: 'text-1',
            title: 'The Ultimate Test',
            content: `**Functional Literacy Without Eyes:**
Phase 7 is the practical culmination — reading text without physical sight.

**Progression (Days 141-180):**
| Days | Exercise | Font | Target |
|------|----------|------|--------|
| 141-150 | Single words | 12pt Arial | 12 words |
| 151-160 | Small words | 10pt → 8pt | 12 words |
| 161-170 | Sentences | 10-15 words | 12 sentences |
| 171-180 | Paragraphs | 3-5 sentences | 12 paragraphs |

**Protocol:**
- SHA-256 locked text targets (same as Phase 5)
- User commits written transcription before reveal
- Accuracy = word/character match rate (programmatic)
- Speed = time to first correct perception (self-timed)

**Scoring:** Same programmatic judge as Phase 5 (TF-IDF + semantic similarity)
**Speed Metric:** Time to first correct perception (self-reported)
**Fatigue Curve:** Accuracy degradation over session duration tracked

**The Practical Test:** If you can read a paragraph blindfolded, the skill has functional utility.`,
            visual: 'diagram',
          },
          {
            id: 'text-2',
            title: 'Reading Technique & Challenges',
            content: `**Scanning Technique:**
1. **Left-to-right scan:** Perceive word shapes sequentially
2. **Letter patterns:** Notice ascenders (b,d,f,h,k,l,t), descenders (g,j,p,q,y), x-height
3. **Spacing:** Word boundaries feel like "gaps" or pauses
4. **Context:** Brain predicts upcoming words from partial perception

**Common Challenges:**
- **Letter-by-letter is slow** → Practice whole-word shape recognition
- **Losing place** → Use "mental finger" to track position
- **Fatigue** → Sessions limited to 12 rounds; track fatigue curve
- **Similar words** (house/horse, fire/fine) → Context + letter patterns

**Advancement Criteria:**
- ≥80% word accuracy on 12pt words for 3 sessions
- ≥75% on 8pt sentences for 3 sessions
- ≥70% on paragraphs for 3 sessions

**Practical Benchmark:** Reading a 3-sentence paragraph at ≥70% word accuracy = functional literacy milestone.`,
            visual: 'animation',
          },
        ],
      },
      {
        id: 'complex-tutorial',
        modalityId: 'complex-targets',
        title: 'Phase 5: Complex Targets (Free-Response)',
        description: 'Open-ended perception: playing cards, objects, scenes — describe before reveal',
        durationMinutes: 10,
        slides: [
          {
            id: 'complex-1',
            title: 'Beyond Forced Choice',
            content: `**The Paradigm Shift:**
Phases 1-4 = forced choice (pick from options). Phase 5 = **free response** — you perceive, describe in your own words, then a transparent algorithm scores your description.

**Categories (Days 71-98):**
| Days | Category | Pool Size | Nature |
|------|----------|-----------|--------|
| 71-77 | Playing Cards | 52 | Suit + Rank |
| 78-84 | Common Objects | 20 | Apple, House, Dog, etc. |
| 85-91 | Complex Scenes | 50 | Photo fragments |
| 92-98 | Free-form Description | Open | Describe anything |

**Programmatic Judge (Transparent):**
- **TF-IDF keyword matching** + optional semantic embeddings
- **Full transparency:** You see which words matched, which matched wrong templates, chance baseline
- **No human judges** — fully local, deterministic, auditable
- **Chance baseline:** System runs your description against shuffled pool

**Scoring Output (0-10 scale):**
- Matched keywords ✓
- Missing keywords ✗
- False matches to other templates ⚠
- Chance-adjusted score (how often random would score similarly)`,
            visual: 'diagram',
          },
          {
            id: 'complex-2',
            title: 'Free-Response Protocol & Scoring',
            content: `**The Round Flow:**
1. System locks random target (SHA-256)
2. You perceive with eyes covered
3. **TYPE your description** (free text, no choices)
4. Submit → Target revealed
5. **Judge scores** (0-10) with full breakdown:
   - ✓ Matched keywords
   - ✗ Missing keywords
   - ⚠ False matches to other templates
   - Chance-adjusted score

**Scoring Algorithm (TF-IDF):**
- Your description tokenized
- Compared against target template + all other templates
- Cosine similarity + keyword overlap
- Chance baseline = average score against shuffled pool

**Template Library (User-Editable):**
- Playing cards: 52 templates (e.g., "Ace of Spades — black spade, single pip, pointed top")
- Common objects: 20 templates with distinctive features
- Animals: 15 templates
- Complex scenes: 50 templates with spatial descriptions

**You Can:**
- Inspect/modify template weights
- Re-score past sessions with updated templates
- Add custom templates for personal targets`,
            visual: 'animation',
            interactive: { type: 'veil-demo' },
          },
        ],
      },
      {
        id: 'environmental-tutorial',
        modalityId: 'environmental-mapping',
        title: 'Phase 6: Environmental Mapping (Spatial Awareness)',
        description: 'Panoramic 360° perception of real-time surroundings while blindfolded',
        durationMinutes: 12,
        slides: [
          {
            id: 'env-1',
            title: 'Spatial Perception Protocol',
            content: `**The Capability:**
Panoramic 360° perception of real-time surroundings while blindfolded — "seeing the room" without eyes.

**Safety First (Non-Negotiable):**
- **Controlled, obstacle-free environment only**
- **Physical spotter REQUIRED** for any navigation
- **Clear boundaries** marked with tape/barriers
- **Emergency protocol:** Remove blindfold anytime
- **No GPS/motion tracking** — privacy & safety
- User reports spatial impressions verbally; spotter measures

**Progression (Days 99-140):**
| Days | Exercise | Description |
|------|----------|-------------|
| 99-105 | Room Boundaries | Walls, doors, windows |
| 106-112 | Object Location | 3-5 objects on table |
| 113-126 | Movement Tracking | Person walking |
| 127-140 | Navigation | Predetermined path |

**Metrics (User/Spotter Reported):**
- Spatial accuracy (distance from claimed to actual)
- Path deviation
- Collision count (must be zero)`,
            visual: 'diagram',
          },
          {
            id: 'env-2',
            title: 'Spatial Perception Techniques',
            content: `**360° Scanning:**
1. Perceive forward, then slowly "turn" attention left/right/behind
2. Notice pressure/density/temperature changes at boundaries
3. Walls = pressure/coolness; Open space = expansive/neutral
4. Objects = localized pressure/warmth at specific locations

**Object Location:**
1. Scan table surface systematically
2. Each object = localized "pressure point" at its coordinates
3. Report: "Object at 10 o'clock, 30cm distance"
4. Spotter measures actual vs. claimed

**Movement Tracking:**
1. Person walks predetermined path
2. You track their "pressure signature" moving through space
3. Report direction, speed, pauses
4. Spotter logs actual path

**Navigation (Only with Spotter):**
1. Pre-marked path with tape
2. Walk slowly, scanning continuously
3. Spotter prevents collision (safety line)
4. Log deviations, hesitations, collisions

**Safety Reminder:** This is NOT navigation by echolocation or touch. It's claimed non-local spatial perception. Safety protocols are absolute.`,
            visual: 'animation',
          },
        ],
      },
    ],
  },
  {
    id: 'mastery',
    title: 'Mastery & Advanced Practice (Phase 8)',
    description: 'Sustained practice, statistical honesty, and personal optimization',
    icon: '🏆',
    color: 'warning',
    sections: [
      {
        id: 'mastery-tutorial',
        modalityId: 'mastery',
        title: 'Phase 8: Sustained Practice & Mastery Mode',
        description: 'Long-term maintenance, honest self-assessment, and personal optimization',
        durationMinutes: 10,
        slides: [
          {
            id: 'mastery-1',
            title: 'What "Mastery" Means Here',
            content: `**Honest Definition:**
"Mastered" = your recent accuracy is statistically above chance (p < 0.05, binomial test) for that exercise type.

**It Does NOT Mean:**
- ❌ You have proven psychic ability
- ❌ You can reliably read minds/see through walls
- ❌ The scientific community accepts EOV

**It DOES Mean:**
- ✅ Your performance on this task exceeds chance consistently
- ✅ You've developed a reliable protocol for this specific task
- ✅ You have a personal benchmark for continued practice

**Mastery Criteria (Per Exercise):**
- Minimum 8 rounds at current tier
- Binomial p-value < 0.05 (above chance)
- Confidence rating ≥ 4/5 on ≥75% of trials

**Regression Prevention:**
- Weekly checkpoint tests (unannounced, prior tier)
- 2 consecutive failed checkpoints → downgrade one tier
- Alert with explanation, not discouragement`,
            visual: 'diagram',
          },
          {
            id: 'mastery-2',
            title: 'Mastery Dashboard & Growth Areas',
            content: `**What the Dashboard Shows:**
- **Per-exercise mastery table:** Rounds, accuracy, vs chance, p-value, verdict (Mastered/Practicing/Early)
- **Growth recommendations:** Exercises where you're below threshold → "Practice more" button
- **Statistical sandbox:** Run your data against different probability models
- **Template editor:** Add/edit description templates for free-response judging
- **Export/backup:** Full local database export

**Personal Optimization:**
1. **Identify your strong modalities** (Sensory Profile: which colors/shapes you perceive best)
2. **Target weak areas** (Growth recommendations in Mastery)
3. **Optimize timing** (Time of day, pre-session state, session length)
4. **Track correlations** (State rating vs. accuracy, time of day vs. accuracy)

**Statistical Sandbox:**
- Run your historical data against different probability models
- Test: "Is my accuracy better on Tuesdays?" "After 20 min meditation?"
- Full audit trail: every target, response, score computation visible

**The Honest Frame:** Every calculation, randomization, and control is visible. The app never certifies ability — it reports statistical deviation from chance as the honest signal.`,
            visual: 'diagram',
          },
        ],
      },
    ],
  },
];

/* ==========================================================================
 * HELPER FUNCTIONS
 * ========================================================================= */

export function getTutorialCategory(categoryId: string): TutorialCategory | undefined {
  return TUTORIAL_CATEGORIES.find(c => c.id === categoryId);
}

export function getTutorialSection(categoryId: string, sectionId: string): TutorialSection | undefined {
  const cat = getTutorialCategory(categoryId);
  return cat?.sections.find(s => s.id === sectionId);
}

export function getAllTutorialSections(): TutorialSection[] {
  return TUTORIAL_CATEGORIES.flatMap(c => c.sections);
}

export function getTutorialByModality(modalityId: string): TutorialSection | undefined {
  return getAllTutorialSections().find(s => s.modalityId === modalityId);
}
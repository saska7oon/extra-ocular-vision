## Idea
Create an application that teaches "extra-ocular vision" (mindsight / "seeing without eyes") — the claimed ability to perceive colors, shapes, text, and surroundings while blindfolded — through a structured, progressive, day-by-day curriculum distilled from real-world programs (Mindsight Journey, Vision Without Eyes, MindSee, Vibravision, Blindfold Lab, Awakened Abilities, Radiant Sight, Evelyn Ohly's intensives, and the "Four Pillars" framework). The application guides solo home practice, enforces rigor controls to minimize sensory leakage, tracks accuracy statistically, and adapts difficulty as the user progresses from binary contrast detection to reading sentences while blindfolded. Personal-development focus: local-first, local accounts, no cloud sync, no community features.

## User Story
As a user interested in developing non-visual perception, I want a structured daily training program that guides me through progressive exercises (from simple light/dark discrimination to reading text without physical sight) while ensuring scientific rigor and tracking my accuracy, so that I can develop and measure my extra-ocular vision ability at home. The app manages a local user profile with all data stored client-side; no internet accounts or server-side syncing required.

## Curriculum Architecture

### Phase 0: Foundations (Days 1-7) — Preparation & State Management
Purpose: Establish the altered-state-of-consciousness baseline that all programs identify as prerequisite for perception beyond ordinary sight.

Daily routine (15-20 minutes each):
- **Day 1-3:** Cardiac coherence breathing (0.1 Hz / 6 breaths per minute, 5-minute sets, 4 cycles) — based on HeartMath Institute research
- **Day 4-5:** Hemi-Sync style binaural beats introduction (alpha 10 Hz hemisphere sync) — 10 minutes of guided meditation
- **Day 6-7:** Combined cardiac coherence + binaural beats + heart-center visualization — 15 minutes

Learning objectives:
- User can reliably induce a relaxed, non-analytical state within 5 minutes
- User understands the role of breath in consciousness-shifting
- User can distinguish the subjective experience of alpha vs baseline states

Delivery mechanisms:
- Audio-guided breathing timer with heartbeat sound
- Binaural beat tracks (3 frequencies: alpha 10 Hz, theta 6 Hz, gamma 40 Hz)
- Progress logging (subjective state scale 1-10 after each session)

### Phase 1: Contrast Discrimination (Days 8-14) — Binary Perception
Purpose: Establish the most fundamental perception signal — the difference between light and dark.

Exercises:
- **Day 8-9:** Binary light/dark target identification (high-contrast black/white panels)
- **Day 10-11:** Moving vs still target discrimination
- **Day 12-14:** Graded contrast levels (full black → dark gray → light gray → white)

Controls (applied progressively):
- Total blackout blindfold (Goalfix Eclipse or equivalent recommended)
- Cotton padding around eyes to eliminate light seepage
- Double-blind target selection (system generates random targets, user must commit before reveal)

Metrics:
- Accuracy percentage per session (12 rounds per session)
- Streak length (consecutive correct identifications)
- Threshold test: minimum detectable contrast difference

### Phase 2: Color Recognition (Days 15-28) — Basic Sensory Expansion
Purpose: Perceive the "feel" of individual colors. Based on all programs starting with red/blue/green/yellow.

Exercises:
- **Day 15-18:** Single color association (red=warm, blue=cool, green=balanced, yellow=bright) — blindfolded color feeling
- **Day 19-21:** Color discrimination (2-choice: is it red or blue?)
- **Day 22-25:** 3-choice color identification
- **Day 26-28:** 4-choice color identification (red, blue, green, yellow)

Progression rule (from Mindsight Journey app model):
- Score >= 80% accuracy advances to next item count
- Each advancement adds one more color option
- If score < 60% for 3 consecutive sessions, revert to prior level

Metrics:
- Per-color accuracy rates
- Confusion matrix (which colors get confused)
- Subjective "feeling" journal for each color

### Phase 3: Shape Identification (Days 29-42) — Form Perception
Purpose: Extend from color to spatial form. Based on circle, square, triangle progression.

Exercises:
- **Day 29-32:** 2-shape binary (circle vs square)
- **Day 33-36:** 3-shape (circle, square, triangle)
- **Day 37-40:** 4-shape (+ plus/rectangle)
- **Day 41-42:** Combined color-shape targets (4 colors x 4 shapes = 16 choices)

Perceptual techniques taught (synesthetic approaches):
- "Edge sensing": feeling the boundary of forms as tactile warmth
- "Center pulling": sensing the geometric center as a point of pressure
- "Angular awareness": corners feel sharp/cool, curves feel soft/warm

Metrics:
- Accuracy per shape
- Reaction time (from target reveal to commitment)
- Confidence rating (1-5) correlated with accuracy

### Phase 4: Letters and Numbers (Days 43-70) — Symbolic Perception
Purpose: Transition to abstract symbol recognition. Based on the numbers→letters→letters+numbers progression.

Exercises:
- **Day 43-49:** Single digits (0-9) — 5-choice forced selection
- **Day 50-56:** Capital letters (A-Z subset: 10 most common first)
- **Day 57-63:** Full capital letters (A-Z)
- **Day 64-70:** Combined alphanumeric (A-Z, 0-9)

Techniques introduced:
- Pattern completion after initial "flash" perception
- Multi-symbol scanning (perceiving multiple symbols simultaneously)
- Symbol sequencing (perceiving order/position)

Metrics:
- Per-symbol accuracy
- Sequence accuracy (order matters)
- Session consistency (variance across 12 rounds)

### Phase 5: Complex Targets (Days 71-98) — Free-Response Perception
Purpose: Move from forced-choice to open-ended description. Based on playing cards, complex images, text reading.

Exercises:
- **Day 71-77:** Playing card identification (suit + rank = 52 choices)
- **Day 78-84:** Image cards (simple objects: apple, house, dog, etc. — 20 common objects)
- **Day 85-91:** Complex scene fragments (portions of photographs)
- **Day 92-98:** Free-form object description (user describes what comes, then compares to actual)

Protocol for free-response (programmatic judging — no human/community judges needed):
- User provides description before reveal (committed response)
- Programmatic pattern-matching judge scores the description against pre-approved target templates
- Scoring algorithm: TF-IDF keyword matching + semantic similarity (embedding distance)
- Match score: 0-10 scale, with full transparency (user sees which words matched, which were missing, and which matched other target templates instead)
- Chance baseline: system runs user's description against a shuffled pool of all target templates and reports how often they would "match" by chance
- User can inspect/modify the template library

Metrics:
- Programmatic match score (0-10 scale)
- Chance-adjusted accuracy (how often random templates would score similarly)
- Description richness (word count, specificity, unique terms)
- False-positive rate (matches to wrong targets)

Technical note on judging:
- For local-first operation, use client-side embedding model or keyword templates
- TF-IDF: simpler, fully offline, transparent scoring weights visible to user
- Embeddings: higher semantic accuracy, can use quantized model bundled with app (~50MB)
- Either approach works locally without internet

### Phase 6: Environmental Mapping (Days 99-140) — Spatial Awareness
Purpose: Panoramic 360-degree perception of real-time surroundings while blindfolded.

Exercises:
- **Day 99-105:** Room boundary detection (walls, door, window location)
- **Day 106-112:** Object location (identify placement of 3-5 objects on a table)
- **Day 113-126:** Movement tracking (track a person walking through a room)
- **Day 127-140:** Navigation tasks (walk a predetermined path without collision)

Safety controls (from VWE and Blindfold Lab):
- All exercises MUST be conducted in controlled, obstacle-free environments
- A physical spotter is required for any navigation tasks
- Clear boundaries must be marked with tape or physical barriers
- Emergency protocol: user can remove blindfold at any time
- App must display safety warnings before each navigation exercise
- App should NOT track navigation path via GPS or motion sensors (privacy/safety concerns)

Metrics:
- Spatial accuracy (distance from claimed to actual object position, user-measured)
- Path deviation (user-reported, or spotter-reported)
- Collision count (user-reported)

### Phase 7: Text Reading (Days 141-180) — Functional Literacy
Purpose: Read sentences without physical sight, modeled after seminar demonstrations.

Exercises:
- **Day 141-150:** Large-font single words (12-point Arial, black on white)
- **Day 151-160:** Small-font words (10-point, then 8-point)
- **Day 161-170:** Single sentences (10-15 words)
- **Day 171-180:** Short paragraphs (3-5 sentences)

Protocol:
- Targets selected via SHA-256 hash lock (cryptographically locked pre-session; same as Phase 5 but with text targets)
- User commits written description before reveal
- Accuracy: percentage of correctly identified words/letters (programmatic matching)
- Speed: time to achieve first correct perception (self-timed)
- Free-form description scoring uses same pattern-matching judge as Phase 5

Metrics:
- Word accuracy rate
- Character accuracy rate
- Reading speed (words per minute, self-timed)
- Session fatigue curve (accuracy degradation over session duration)

### Phase 8: Sustained Practice & Personal Journal (Days 181+) — Mastery Mode
Purpose: Long-term maintenance and personal reflection on the practice.

Features:
- **Daily challenge mode**: randomized target each day at user's current tier
- **Personal journal**: open-text logging of subjective experiences, insights, and perceptual phenomena
- **Trend analysis dashboard**: long-term accuracy trends, streaks, seasonal patterns
- **Template editor**: user can add/edit description templates for program judging
- **Statistical sandbox**: user can run their historical data against different probability models
- **Export/backup**: full local database export for personal archiving

---

## Progressive Difficulty System

### Difficulty Tiers:
- **Tier 1 (Beginner):** Binary choices (2 options), large high-contrast targets
- **Tier 2 (Elementary):** 3-4 choices, standard color/shape sets
- **Tier 3 (Intermediate):** 8-16 choices, alphanumeric symbols
- **Tier 4 (Advanced):** Free-response, complex images, no forced choices
- **Tier 5 (Expert):** Environmental navigation, real-time spatial mapping

### Advancement Criteria:
- Score >= 80% accuracy across 3 consecutive sessions
- Confidence rating >= 4/5 on at least 75% of trials (self-reported)
- Minimum 12 trials per session at each tier
- If accuracy drops > 20% in a session, user must repeat prior tier session

### Regression Prevention:
- Weekly checkpoint tests (unannounced, at prior tier difficulty)
- If 2 consecutive checkpoints fail, downgrade one tier
- Alert user with explanation, not discouragement

---

## Foundational Preparation Techniques

### 1. Cardiac Coherence Breathing
- Frequency: 0.1 Hz (6 breaths per minute) — inhale 5s, exhale 5s
- Based on HeartMath Institute research linking coherence to intuitive perception
- App feature: Visual breathing guide (expanding/collapsing circle), optional heartbeat audio
- Session length: 5 cycles (5 min), 3 sets per preparation session
- Optional biofeedback: if heart rate sensor available, show HRV coherence (local device only)

### 2. Hemi-Sync Binaural Beats
- Alpha (10 Hz): relaxed awareness, "hypnagogic bridge" state
- Theta (6 Hz): deep meditation, unconscious access
- Gamma (40 Hz): heightened perception, "binding" state
- App feature: Headphone-required audio tracks with carrier tone (150 Hz) difference
- Session length: 10-15 minutes, paired with breathing
- User selects current target frequency; system tracks tolerance/adaptation

### 3. Meditation / Mental Quieting
- "Observer" meditation: watching thoughts without engaging
- "Heart center activation": visualization + feeling of warmth in heart area
- "Left-brain inhibition": mental instruction to quiet analytical chatter
- App feature: Guided voice instruction with progress timer
- Technique progression: 2 min (Days 1-3) → 5 min (Days 4-7) → 10 min (Days 8+)

### 4. State Calibration
- Pre-session: Subjective state rating (1-10) for calm/alertness
- Mid-session: "Gate check" — user confirms readiness before perception attempt
- Post-session: Compare subjective experience to objective accuracy

---

## Perception Exercise Catalog

### Forced-Choice Exercises (Tiers 1-3):
| Exercise | Target Pool | Format | Min. Accuracy |
|---|---|---|---|
| Light/Dark | 2 tones | Binary | 60% (above chance) |
| Color pair | 4 colors | 2-choice | 65% |
| 3-color | 4 colors | 3-choice | 65% |
| 4-color | 4 colors | 4-choice | 70% |
| Simple shape | 4 shapes | 4-choice | 70% |
| Color+Shape | 16 combos | 16-choice | 75% |
| Digits 0-9 | 10 symbols | 10-choice | 75% |
| Letters A-Z (subset) | 10 letters | 10-choice | 80% |
| Alphanumeric | 36 symbols | 36-choice | 80% |

### Free-Response Exercises (Tier 4-5):
| Exercise | Target Pool | Scoring Method |
|---|---|---|
| Playing cards | 52 cards | Rank + suit identification (programmatic match) |
| Simple objects | 20 objects | Template-based scoring (TF-IDF + keyword match) |
| Complex scenes | 50 images | Semantic similarity scoring (embedding distance) |
| Room mapping | Variable | User-measured distance from claimed to actual |
| Text reading | Variable | Word/character accuracy (string matching) |

### Gamification Elements (Self-Directed):
- Streak counters (consecutive daily sessions)
- Achievement badges (perceptual milestones)
- Statistics dashboard (accuracy trends, reaction times)
- Difficulty adaptation (auto-adjusts based on performance)

---

## Rigor Controls (Skepticism-Proof Design)

### 1. Physical Controls (eliminate sensory leakage)
- **Blindfold protocol**: Recommend Goalfix Eclipse total blackout (Paralympic standard)
- **Double-padded**: System instructs user to add cotton padding around eyes
- **Nose-bridge seal**: Video tutorial showing proper taping technique
- **Opaque containers**: For target cards (glass/plastic box, no tactile differentiation)
- **Glove protocol**: Cotton gloves required for color/shape exercises
- **Environmental controls**: Room must be quiet, no reflective surfaces

### 2. Informational Controls (eliminate cheating/experimenter bias)
- **SHA-256 target locking**: Before each session, targets are cryptographically hashed and locked
- **Random target selection**: PRNG with user seed; targets can be revealed post-session
- **Commit-before-reveal**: User must commit answer (touch interface with eyes blindfolded) before target is shown
- **Self-administered**: No live experimenter present; user is both subject and operator

### 3. Statistical Controls
- **Minimum trials**: 12 rounds per session minimum
- **Statistical significance**: System calculates whether session accuracy exceeds chance (binomial test)
- **Baseline comparison**: User's historical performance is their personal control
- **Regression to mean tracking**: System flags sessions that look like statistical flukes

### 4. Integrity Safeguards
- **Honor system logging**: User reports adherence to protocols
- **Session integrity score**: System penalizes sessions where time gaps suggest peeking
- **Anomaly detection**: Flags impossible accuracy jumps or patterns suggesting cheating
- **Transparent methodology**: Every calculation, randomization, and control is visible
- **Audit trail**: Full log of all target selections, user responses, and scoring computations

---

## Progress Tracking & Statistics

### 1. Accuracy Dashboard
- Overall accuracy rate (session-level and lifetime)
- Per-exercise accuracy breakdown (color, shape, letter, etc.)
- Streak tracking (current and record)
- Chance-level comparison (color-coded: below/above/consistent)

### 2. Statistical Analysis
- Binomial probability of observed accuracy (p < 0.05 = "above chance")
- Trend analysis (moving average, regression slope)
- Confidence intervals for accuracy rates
- Session-to-session variance

### 3. Sensory Profile
- Per-color/per-shape confusion matrix
- Reaction time analysis
- Subjective state vs. accuracy correlation
- Fatigue curve (accuracy over session duration)

### 4. Export Features
- CSV export of all session data
- Full local database backup/export
- Research mode: full protocol compliance report
- Target generation log (cryptographic chain of targets used)

---

## User Journey / Logical Flow

### Session Structure (daily practice):
1. **Welcome back** — display streak, yesterday's performance summary
2. **Preparation phase** (10-15 min): breathing + binaural beats + meditation
3. **State check** — user rates current state (calm, alert, distracted)
4. **Warm-up** — 2-3 practice rounds at slightly easier difficulty
5. **Main exercise block** — 12 rounds at current tier
6. **Commit phase** — user must lock in their answer before target reveal
7. **Reveal + feedback** — target shown, accuracy scored, immediate feedback
8. **Calibration reflection** — "What did you sense?" open-text prompt
9. **Session summary** — accuracy, p-value, streak update
10. **Next steps recommendation** — advance, maintain, or review tier

### Weekly Structure:
- **Days 1-6**: Regular skill-building sessions
- **Day 7**: Checkpoint test (at current tier; if passed, unlock next tier)
- **Day 8**: Tier transition (first session at new difficulty)
- **Every 14 days**: "Regularity check" — review trends, suggest practice adjustments

### Local Account Flow:
1. **First launch**: User prompted to create a local profile (name, optional photo, preferences)
2. **Profile storage**: All data stored in local app storage (no cloud sync, no internet required)
3. **Multiple profiles**: Optional support for family members or research subjects
4. **Data ownership**: User owns all their data; full export/delete anytime
5. **No internet required**: All features work offline after initial download

---

## Constraints
- Must not require paid hardware (recommend blindfolds/gloves but make them optional)
- Must store ALL data locally (privacy-first, no telemetry, no cloud sync)
- Must run on web browsers (cross-platform) and mobile
- Must include clear disclaimers that this is training for a claimed ability, not proven science
- Must respect accessibility (full screen-reader support, no visual-only instructions)
- Must work completely offline (all assets bundled, all computation local)

## Edge Cases
- What happens when user reports perceiving but accuracy is at chance? → Show statistical reality, suggest review of controls
- What if user cannot detect any difference in Phase 1? → Extended practice mode, alternative sensory approaches (touch-based warm-up)
- What if user has actual visual impairment? → Special accessibility mode with voice-only interface (inspired by Mindsight Journey Blind Mode)
- What about seizure risk with binaural beats/entrainment? → Mandatory epilogue warning, opt-in for entrainment features
- What if user tries to peek? → Session integrity scoring, honor-system but with anomaly detection
- What about the free-response judging being too lenient or strict? → User can inspect and modify template weights, re-score past sessions

## Out of Scope (v1)
- Live experimenter sessions (only self-administered for v1)
- VR integration (Mindsight Journey's Oculus VR modules — future expansion)
- Hardware biofeedback integration (heart rate, EEG — future expansion)
- Certification/partner instructor program (Vision Without Eyes / MindSee facilitator network)
- In-person intensives booking system
- Internet-based community features (leaderboards, shared challenges, social sharing)

## Research Notes
- Institute of Noetic Sciences 2023 proposal identifies "triple-blind" protocol as gold standard
- Skeptical critique (Time Magazine 2002, CSI) emphasizes sensory leakage as primary failure mode — this spec mandates Goalfix Eclipse + cotton padding to address
- All 9 surveyed programs converge on the progression: contrast → color → shape → symbols → complex → environment → text reading
- Mindsight Journey's 18-module structure, while gamified, follows the same core arc
- The "40 billion bits vs 2000 conscious" framing from Vibravision informs the state-management phase design
- Programmatic judging: TF-IDF keyword matching and quantized embedding models can run fully offline on client device for free-response scoring
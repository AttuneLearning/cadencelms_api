# ADR-UI-004: Adaptive Playlist Engine for Course Player

**Status:** Accepted
**Date:** 2026-02-08
**Domain:** UI + API

## Context

The course player presents learning units (LUs) as a flat, static sequence: topic → topic → practice → topic → graded. Every learner sees the same content in the same order regardless of prior knowledge, performance, or learning pace. The system tracks completion but cannot distinguish "completed" from "learned."

Meanwhile, a substantial adaptive learning infrastructure already exists but is disconnected from the player:

| Component | Location | Status |
|-----------|----------|--------|
| Knowledge Nodes (concept graph) | `src/entities/knowledge-node/` | Built, API + UI |
| Cognitive Depth Levels (Bloom's progression) | `src/entities/cognitive-depth/` | Built, 3-tier overrides |
| Adaptive Testing Engine | `src/entities/adaptive-testing/` + `src/features/adaptive-testing/` | Built, question selection + response recording |
| Question Banks | `src/entities/question-bank/` + `src/entities/question/` | Built, tagged by node + difficulty |
| Exercise System | `src/entities/exercise/` + `src/features/exercises/` | Built, 8 question types |
| Exercise Taking Page | `src/pages/learner/exercises/ExerciseTakingPage.tsx` | Built, full exam flow |
| Learner Progress Tracking | `src/entities/learner-progress/` | Built, per-node mastery |
| AdaptiveSettingsPanel | `src/features/adaptive-testing/ui/` | Built, instructor config UI |

The challenge is **orchestration** — stitching these components into a coherent learning flow that adapts to the learner while still providing genuine validation of learning.

### Options Evaluated

| Option | Description | Verdict |
|--------|-------------|---------|
| **A: Mastery Gates** | Keep linear sequence, add gate checkpoints | Too limited — only adapts testing, not teaching |
| **B: Teach-Practice-Prove Zones** | Group LUs into 3-phase zones | Cleanest model but requires new authoring paradigm |
| **C: Flow Graph** | Replace linear sequence with directed graph | Maximum power but complex to author and render |
| **D: Adaptive Playlist** | Keep linear sequence, runtime engine injects/skips | Best power-to-complexity ratio — **selected** |

## Decision

Implement an **Adaptive Playlist Engine** (Option D) that:

1. **Preserves the linear LU sequence** authors already build
2. **Adds a runtime PlaylistEngine** that can skip, inject, and retry LUs based on learner performance
3. **Uses a Strategy pattern** so adaptive behavior is pluggable and optional
4. **Supports three modes**: off (static), guided (gates only), full (skip + inject + remediate)
5. **Exposes a decision API** that an AI agent can later control

### Core Concepts

**Knowledge Node Tagging:** Each LU declares what it teaches and/or assesses:
```
LU "What is EMDR?"      → teachesNodes: [emdr-basics]
LU "Quick Check"         → assessesNodes: [emdr-basics, aip-model], isGate: true
LU "Module Assessment"   → assessesNodes: [all], isGate: true (formal)
```

**Runtime Playlist:** At module start, the engine resolves the static LU sequence into a playlist. As the learner progresses, the engine can modify the playlist:
- **Skip** topic LUs if pre-assessment shows mastery
- **Inject** adaptive practice after a failed gate (questions selected by adaptive engine)
- **Retry** gate LUs with fresh questions from the same banks
- **Prescribe** specific topic LUs for review based on weak knowledge nodes

**Three Modes:**

| Mode | Gates | Skip | Inject | Remediate | Use Case |
|------|-------|------|--------|-----------|----------|
| `off` | No | No | No | No | Traditional linear course |
| `guided` | Yes | No | No | No | Gates block until mastery, but sequence is fixed |
| `full` | Yes | Yes | Yes | Yes | Full adaptive experience |

**Strategy Pattern:**

```
PlaylistStrategy interface
├── StaticStrategy       → mode: off, always advance
├── RuleBasedStrategy    → mode: guided/full, evaluates gate configs + mastery
└── AIStrategy (future)  → calls external API for decisions
```

The strategy receives a `PlaylistContext` (static sequence, current position, node progress, gate results, session history) and returns a `PlaylistDecision` (advance, skip, inject, retry, hold, complete).

### Instructor Control

Instructors configure adaptive settings per course:

```ts
interface CourseAdaptiveSettings {
  mode: 'off' | 'guided' | 'full';
  allowLearnerChoice?: boolean;      // learner can opt-in/out
  preAssessmentEnabled?: boolean;    // diagnostic before module starts
}
```

When `mode = 'off'`, the PlaylistEngine is a passthrough — the learner sees exactly what the author built. When `mode = 'full'`, the engine activates all adaptive behaviors. This is a spectrum, not a binary switch.

### AI Extension Point

The PlaylistEngine's strategy interface is designed for future AI control:

```
POST /api/v2/adaptive/decide
  Request: { enrollmentId, moduleId, currentLuId, event, gateResult, learnerProfile }
  Response: { decision, entries[], reasoning }

POST /api/v2/enrollments/:id/playlist/inject
  Request: { entries[], insertAt, source }
  (Allows async injection — AI pre-stages interventions for next session)
```

The AI speaks the same `PlaylistEntry` language as the rule-based engine. The PlaylistEngine doesn't care who generated the decision — instructor rules, threshold logic, or AI. This enables:
- A/B testing of strategies
- Gradual AI adoption (start conservative, increase autonomy)
- Full decision audit trail
- Automatic fallback to rules if AI endpoint is unavailable

### Gate Validation Model

Gates provide genuine learning validation, not just completion tracking:

```
Topic LU:    "completed" = viewed/read (low bar)
Practice LU: "completed" = adaptive engine satisfied with mastery progress (medium bar)
Graded LU:   "completed" = formal assessment passed at threshold (high bar, scored, recorded)
```

Practice is low-stakes — the adaptive engine adjusts difficulty, repeats weak areas, and builds mastery incrementally. Graded gates are high-stakes — timed, scored, limited attempts. A learner who clicks through topic LUs still hits a gate they can't bypass without demonstrating knowledge.

## Data Model

### New Fields on LearningUnit

```ts
interface LearningUnitAdaptive {
  teachesNodes?: string[];        // knowledge node IDs this LU teaches
  assessesNodes?: string[];       // knowledge node IDs this LU assesses
  isGate?: boolean;               // blocks forward progress until passed
  isSkippable?: boolean;          // adaptive engine can skip if already mastered
  gateConfig?: {
    masteryThreshold: number;     // per-node minimum (0.0-1.0)
    minQuestions: number;         // minimum questions before pass/fail decision
    maxRetries: number;           // retries before escalation
    failStrategy: 'inject-practice' | 'prescribe-review' | 'allow-continue';
  };
}
```

### New: Runtime Session State

```ts
interface LearnerModuleSession {
  enrollmentId: string;
  moduleId: string;
  playlist: PlaylistEntry[];
  currentIndex: number;
  nodeProgress: Map<string, number>;   // nodeId → mastery score
  gateAttempts: Map<string, number>;   // luId → attempt count
  injectedCount: number;
  startedAt: string;
  lastActivityAt: string;
}

type PlaylistEntry =
  | { type: 'static'; luId: string }
  | { type: 'injected-practice'; targetNodes: string[]; strategy: string; questionCount: number }
  | { type: 'injected-review'; luId: string; reason: string }
  | { type: 'retry'; luId: string; attemptNumber: number };
```

### New: PlaylistStrategy Interface

```ts
interface PlaylistStrategy {
  resolveNext(context: PlaylistContext): PlaylistDecision;
}

interface PlaylistContext {
  staticSequence: LearningUnit[];
  currentIndex: number;
  nodeProgress: Map<string, number>;
  gateResults: Map<string, GateResult>;
  sessionHistory: PlaylistEntry[];
  adaptiveConfig: CourseAdaptiveSettings;
  learnerProfile?: LearnerProfile;
}

type PlaylistDecision =
  | { action: 'advance' }
  | { action: 'skip'; reason: string }
  | { action: 'inject'; entries: PlaylistEntry[] }
  | { action: 'retry'; luId: string }
  | { action: 'hold'; message: string }
  | { action: 'complete' };
```

## Implementation

### Phase 1: Data Model + Types
- Add adaptive fields to LearningUnit types
- Create PlaylistEngine types (strategy, context, decision, entry)
- Create LearnerModuleSession types

### Phase 2: PlaylistEngine Core
- `PlaylistEngine` class with strategy pattern
- `StaticStrategy` (passthrough)
- `RuleBasedStrategy` (gate evaluation, skip/inject logic)
- `usePlaylistEngine` hook for React integration
- Session state management (persist to enrollment progress)

### Phase 3: Course Player Integration
- Replace flat lesson navigation with playlist-driven navigation
- Render injected practice entries using existing ExerciseTakingPage components
- Render injected review entries by re-presenting topic LUs
- Update sidebar to show playlist state (static vs injected items)

### Phase 4: Gate UI
- Gate evaluation screen (shows per-node results)
- Pass/fail state with next-step messaging
- Retry flow with fresh questions
- Remediation prescription display

### Phase 5: Instructor Settings
- Wire AdaptiveSettingsPanel into course settings
- Add knowledge node tagging to LU editor
- Gate configuration UI for practice/graded LUs

### Phase 6: API Endpoints
- `POST /adaptive/decide` — strategy endpoint for AI
- `POST /enrollments/:id/playlist/inject` — async injection
- `GET /enrollments/:id/session` — session state retrieval
- Session state persistence in enrollment progress

## Consequences

### Positive
- Courses work identically in non-adaptive mode — zero disruption to existing content
- Genuine learning validation through mastery-gated progression
- Leverages ALL existing adaptive infrastructure (knowledge nodes, question banks, cognitive depth, etc.)
- Clean AI extension point — future AI agent drops in without architecture changes
- Instructor controls the level of adaptivity per course
- Learner experience improves progressively as more courses enable adaptive mode

### Negative
- PlaylistEngine adds complexity to course player (currently ~660 lines, will grow)
- Sidebar must handle dynamic playlist entries (visual design challenge)
- Gate evaluation requires question bank content to exist for the relevant nodes
- Courses without knowledge node tagging get no adaptive benefit (tagging is manual work)

### Neutral
- No changes to course authoring UI required for Phase 1-3 (tagging can be done via API)
- API team needs to support session state persistence (new endpoint)
- AI strategy is deferred — the interface is defined now, implementation is future work

## Alternatives Considered

| Alternative | Why Rejected |
|-------------|-------------|
| **Mastery Gates only (Option A)** | Too limited — only adapts testing, can't skip or remediate |
| **Teach-Practice-Prove Zones (Option B)** | Clean model but requires new authoring paradigm and data layer |
| **Flow Graph (Option C)** | Maximum flexibility but complex to author, render, and debug |
| **No adaptive — just completion tracking** | Doesn't validate learning, can't leverage existing infrastructure |

## Links

- Knowledge Node entity: `src/entities/knowledge-node/`
- Adaptive Testing entity: `src/entities/adaptive-testing/`
- Cognitive Depth entity: `src/entities/cognitive-depth/`
- Exercise system: `src/entities/exercise/` + `src/features/exercises/`
- Exercise Taking Page: `src/pages/learner/exercises/ExerciseTakingPage.tsx`
- Adaptive Settings Panel: `src/features/adaptive-testing/ui/AdaptiveSettingsPanel.tsx`
- Learner Progress: `src/entities/learner-progress/`
- Course Player: `src/pages/learner/player/CoursePlayerPage.tsx`
- Session: 2026-02-08e (UI-ISS-138 + adaptive playlist design)

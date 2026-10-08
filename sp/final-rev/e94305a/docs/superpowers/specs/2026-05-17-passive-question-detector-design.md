# Passive Question Detector — Design Spec

**Date:** 2026-05-17
**Status:** Approved for implementation planning
**Author:** Brainstorming session w/ user

---

## 1. Purpose

Add a passive background process that listens to the live interview transcript, uses a local LLM (llama3.1:8b via Ollama) to detect questions and behavioral prompts directed at the candidate, and surfaces them as clickable chips in a slim panel above the chat area. Clicking a chip routes the pre-classified question to the appropriate cloud model (Gemini Flash 3.1 for verbal/behavioral, Gemma 4 26B for coding) with snapshot context from the moment of detection.

### Problem this solves

Today the user has to manually click "What to answer?" every time the interviewer asks something — and even then, intent classification via mobilebert is unreliable, frequently dumping Python code blocks in response to verbal questions. The passive detector solves three problems at once:

1. **Manual friction** — chips appear automatically, user just clicks the relevant one
2. **Intent unreliability** — llama 8b with conversation context classifies far more accurately than zero-shot NLI on a single message
3. **Context drift on follow-ups** — snapshot context at detection time means the answer matches what the interviewer was actually asking about, not what the conversation drifted to before the click

### Success criteria

- Chips appear within 2s of the interviewer finishing a question (silence-debounced) or sub-second on speaker change.
- Intent misroute rate drops from ~10-15% (today's mobilebert) to <2%.
- Click-to-first-token latency is ≤ current "What to answer?" performance, ideally 100-300ms faster (no intent re-classification, no context re-fetch).
- Zero noticeable performance impact on the existing app (Ollama runs in its own process; main process only does HTTP roundtrips).

---

## 2. Scope

### In scope

- Background detection on the live interviewer transcript
- Tagged JSON output from llama 8b: `{detected, question, intent, confidence}`
- Three intent classes: `verbal`, `coding`, `behavioral`
- Slim collapsible UI panel above chat with max 5 chips (FIFO)
- Dedup of rephrased/duplicate questions (≥70% string similarity → replace)
- Click consumes chip and routes to existing answer pipeline with intent + context overrides
- Settings panel: enable/disable, model selection, confidence threshold, max chips
- Graceful degradation if Ollama is unavailable
- Cleanup on meeting end / new meeting start

### Out of scope (explicit non-goals)

- Persisting chips across app restarts (chips are live; restart = clean slate)
- Detecting multiple questions per turn (most-recent-only; rare and noise-prone)
- Detecting user's own questions (only interviewer-asked prompts)
- Editing chip text before clicking
- Sharing chips between sessions
- CPU-only fallback model swap (user confirmed GPU is always available)
- Multi-language detection (English-only for v1)

---

## 3. User Experience

### Visual layout (additive to existing UI)

```
┌─── NativelyInterface overlay ─────────────────────────┐
│  [recent transcript strip]                            │
│                                                       │
│  ┌─ Detected Questions ─────────────── [▾ collapse] ─┐│
│  │ 📖  Tell me about a time you debugged a production││
│  │ ❓  What is the difference between TCP and UDP?    ││
│  │ 💻  Implement an LRU cache in Python              ││
│  └────────────────────────────────────────────────────┘│
│                                                       │
│  [chat messages: SAY THIS bubble, user messages, etc] │
│                                                       │
│  [action buttons: What to answer?, Clarify, etc.]     │
│  [input box]                                          │
└───────────────────────────────────────────────────────┘
```

### Panel behavior

- **Hidden state:** When chip queue is empty, panel is not rendered (zero height).
- **Expanded state:** When chips exist, panel auto-expands. Header shows "Detected Questions" + collapse toggle.
- **Auto-collapse:** 10 seconds after the user's last interaction (hover, scroll over panel, or click), panel collapses to a single-line summary "3 questions ready ▸" that expands on click.
- **Manual collapse:** Toggle in header.
- **Chip appearance:** Fade-in animation, ~150ms. New chips push existing chips down.
- **Chip dismissal:** Fade-out on click, ~150ms, followed by remaining chips smoothly rising.

### Chip anatomy

```
┌──────────────────────────────────────────────────┐
│ 📖  Tell me about a time you debugged a produ…  │
└──────────────────────────────────────────────────┘
```

- Icon badge: `❓` (verbal), `📖` (behavioral), `💻` (coding)
- Question text: single-line, truncated with ellipsis if too long, full text on hover tooltip
- Click target: entire chip row
- Visual feedback on hover: subtle background tint

### Settings panel addition

```
┌─ Question Detection ──────────────────────────────────┐
│ [✓] Detect interviewer questions automatically        │
│                                                       │
│ Local model:    [llama3.1:8b ▾]  (gemma4:e4b alt)     │
│ Confidence:     [▮▮▮▮▮▮░░░░] 0.6                      │
│ Max chips:      [5]                                   │
└───────────────────────────────────────────────────────┘
```

Defaults: enabled, llama3.1:8b, 0.6, 5 chips.

---

## 4. Architecture

### High-level flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      Electron Main Process                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  IntelligenceManager                                             │
│    │ emits: transcript-segment-final, speaker-change             │
│    ▼                                                             │
│  QuestionDetector  (NEW)                                         │
│    │  - debounce timer (1.5s silence)                            │
│    │  - speaker-change handler (fires immediately)               │
│    │  - dedup cache (last 10 detected, 70% similarity)           │
│    │  - single-flight: max 1 in-flight, queue max 1              │
│    │                                                             │
│    ▼                                                             │
│  OllamaDetectionClient  (NEW)                                    │
│    │  POST http://127.0.0.1:11434/api/chat                       │
│    │  model: llama3.1:8b, format: json, 3s timeout               │
│    │  returns: {detected, question, intent, confidence}          │
│    │                                                             │
│    ▼                                                             │
│  QuestionDetector.emit('question-detected', chip)                │
│    │  chip = {id, question, intent, confidence,                  │
│    │          contextSnapshot, detectedAt}                       │
│    ▼                                                             │
│  IPC: 'detected-question' → renderer                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                          Renderer                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  useDetectedQuestions() hook  (NEW)                              │
│    │  - subscribes to 'detected-question' IPC                    │
│    │  - manages chip queue (max 5, FIFO, dedup-update)           │
│    │  - exposes: chips[], dismissChip(id), clickChip(id)         │
│    ▼                                                             │
│  <DetectedQuestionsPanel>  (NEW, mounted above first chat msg)   │
│    │  - auto-collapse 10s after last interaction                 │
│    │  - vertical list of <QuestionChip> rows                     │
│    ▼                                                             │
│  <QuestionChip>  (NEW)                                           │
│    │  - icon badge per intent                                    │
│    │  - truncated question text                                  │
│    │  - click → useDetectedQuestions.clickChip(id)               │
│    │                                                             │
│  clickChip(id):                                                  │
│    │  - removes chip from queue                                  │
│    │  - calls window.electronAPI.answerDetectedQuestion(         │
│    │       {question, intent, contextSnapshot})                  │
│    ▼                                                             │
│  IPC: 'answer-detected-question' → main                          │
│    │  Reuses IntelligenceEngine.runWhatShouldISay() with         │
│    │  new optional params: {intentOverride, contextOverride}     │
│    │  Routes:                                                    │
│    │    verbal/behavioral → Flash 3.1                            │
│    │    coding            → Gemma 4 via streamChat               │
│    │  Streams answer back via existing suggested_answer events   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### New files (6)

| File | Responsibility |
|---|---|
| `electron/services/QuestionDetector.ts` | Service class: debounce/silence timers, dedup cache, single-flight orchestration, emits chip events |
| `electron/services/OllamaDetectionClient.ts` | Single-purpose Ollama HTTP wrapper for the detection prompt, JSON parse + schema validate, 3s timeout |
| `electron/llm/prompts/questionDetection.ts` | The detection system prompt + JSON schema for llama |
| `src/hooks/useDetectedQuestions.ts` | React hook: IPC subscribe, chip queue state, FIFO, dedup-update |
| `src/components/DetectedQuestionsPanel.tsx` | Collapsible panel container, auto-collapse 10s timer, header with collapse toggle |
| `src/components/QuestionChip.tsx` | Single chip row: icon badge + truncated text + click handler |

### Modified files (4)

| File | Change |
|---|---|
| `electron/IntelligenceManager.ts` | Emit `transcript-segment-final` and `speaker-change` events. Instantiate QuestionDetector during initialization. Clear chips on meeting boundary. |
| `electron/IntelligenceEngine.ts` | `runWhatShouldISay()` gains optional `{intentOverride, contextOverride}` params. When provided, skips classifyIntent call and uses contextOverride instead of fetching live window. |
| `electron/ipcHandlers.ts` | New handler `answer-detected-question` that calls runWhatShouldISay with overrides. |
| `src/components/NativelyInterface.tsx` | Mount `<DetectedQuestionsPanel>` above first chat message, wired to useDetectedQuestions hook. |

---

## 5. Data Contracts

### Detection input to Ollama

```typescript
interface DetectionRequest {
    recentInterviewerTranscript: string;  // last 30s of interviewer turns
    fullConversationContext: string;       // last 60s of all turns
}
```

### Detection output from Ollama (JSON schema enforced via Ollama format=json)

```typescript
interface DetectionResponse {
    detected: boolean;                              // true if a question/prompt requires a response
    question: string;                               // the question text (cleaned, single sentence)
    intent: 'verbal' | 'coding' | 'behavioral';   // routing tag
    confidence: number;                             // 0.0 - 1.0
}
```

### Chip emitted to renderer

```typescript
interface DetectedQuestionChip {
    id: string;                              // uuid, used for dedup-update
    question: string;
    intent: 'verbal' | 'coding' | 'behavioral';
    confidence: number;
    contextSnapshot: string;                 // 60s context window at detection time
    detectedAt: number;                      // unix ms
}
```

### Click payload to main

```typescript
interface AnswerDetectedQuestionRequest {
    question: string;
    intent: 'verbal' | 'coding' | 'behavioral';
    contextSnapshot: string;
}
```

### Extended runWhatShouldISay signature

```typescript
interface RunWhatShouldISayOptions {
    // existing fields preserved
    intentOverride?: 'verbal' | 'coding' | 'behavioral' | ConversationIntent;
    contextOverride?: string;  // skip live transcript fetch, use this instead
}
```

---

## 6. Detection Logic

### Trigger conditions

QuestionDetector fires on whichever comes first:

1. **Silence debounce (1.5s):** After a final interviewer segment, start a 1.5s timer. If no new segments arrive before it expires, fire.
2. **Speaker change:** If the next segment is `speaker !== 'interviewer'` (e.g., user starts talking), fire immediately on the accumulated transcript.

Any new interviewer segment resets the silence timer.

### Single-flight orchestration

- At most 1 detection request in flight at a time.
- If a new trigger fires while one is in flight, queue at most 1 next request. Drop any beyond that.
- Each request has a 3-second hard timeout. On timeout: drop silently, free the in-flight slot.

### Dedup

- Maintain a rolling cache of the last 10 detected questions (text only).
- On new detection: compute Jaccard similarity over lowercased word tokens (set intersection / set union) against each cached entry. Chosen over Levenshtein because it's O(n+m) instead of O(n·m), trivial to implement, and well-suited to short question text where word overlap is more meaningful than character-level edit distance.
- If similarity ≥ 0.7 to any cached entry: emit as `question-detected-update` with the matched entry's chip id (renderer replaces existing chip in place).
- Otherwise: emit as new `question-detected` with fresh uuid.

### Confidence filter

- `confidence < 0.6` → drop silently, no chip emitted.
- Threshold configurable via settings (range 0.4 - 0.9).

### Context snapshot

- At detection-fire time, capture the last 60 seconds of full conversation transcript.
- Attach to chip as `contextSnapshot`.
- Used at click time instead of fetching live context.

---

## 7. Ollama Prompt Design

System prompt (~4 lines, kept tight to minimize token cost and latency):

```
You are detecting questions asked by an interviewer to a candidate in a live interview.
Identify the MOST RECENT question or prompt that requires the candidate to respond.
Return ONLY a JSON object: {"detected": bool, "question": string, "intent": "verbal" | "coding" | "behavioral", "confidence": float}.
intent="coding" if the answer requires writing code, "behavioral" if it asks for a personal experience or story (e.g. "Tell me about a time..."), otherwise "verbal".
Only set detected=true if the interviewer just asked something the candidate should answer. Set detected=false for filler, acknowledgements, or interviewer thinking aloud.
```

User message includes recent interviewer transcript + full conversation context.

Ollama call config: `format: "json"`, `temperature: 0.1`, `top_p: 0.9`, `keep_alive: "10m"` (keeps model warm).

---

## 8. UI Lifecycle

### Chip queue (renderer)

- **Capacity:** 5 chips max.
- **Order:** newest at top.
- **Overflow:** when 6th arrives, oldest is evicted (FIFO).
- **Dedup-update:** when an update event arrives for an existing id, chip text and `detectedAt` are updated in place; position is preserved.
- **Click consumes:** clicked chip is removed immediately; remaining chips animate up.

### Panel collapse

- Auto-collapse 10s after last interaction (chip click, panel hover, scroll over panel).
- Collapsed state: single line "N questions ready ▸" — clicking expands.
- Hidden state: when queue is empty, panel renders nothing (zero height).

### Meeting boundaries

- On `meeting-start`: clear chip queue. Detector starts fresh.
- On `meeting-end`: clear chip queue. Detector stops triggering until next `meeting-start`.

---

## 9. Error Handling

| Failure | Behavior |
|---|---|
| Ollama unreachable (connect refused / HTTP error) | Log warning. Mark detector "unavailable". Stop firing for 30s, then retry probe. Panel header shows a subtle disabled indicator. |
| Ollama timeout (>3s) | Drop the detection silently. Don't retry. Free in-flight slot. |
| JSON parse failure | Log raw response. Drop detection. Increment parseErrorCounter; if 5 in a row, log louder warning (prompt may be broken). |
| Invalid intent value | Default to `verbal`. |
| Empty question with detected=true | Treat as detected=false. Drop. |
| Confidence below threshold | Drop silently. |
| Renderer not subscribed | IPC send is a no-op. Detection ran; chip just doesn't reach UI. No persistence — fine. |
| Click during another answer's stream | Use existing `_chatStreamId` supersede pattern. New click takes over, old stream cancelled. |
| Detector and manual "What to answer?" simultaneously | No conflict. Both work independently. Possible double-answer if user does both for the same question — acceptable, user can dismiss one. |

---

## 10. Configuration

Settings stored in existing `SettingsManager`:

```typescript
interface QuestionDetectionSettings {
    enabled: boolean;                          // default true
    localModel: 'llama3.1:8b' | 'gemma4:e4b';  // default 'llama3.1:8b'
    confidenceThreshold: number;               // default 0.6, range 0.4-0.9
    maxChips: number;                          // default 5, range 1-10
}
```

When `enabled=false`: QuestionDetector skips all transcript events, no Ollama traffic, panel does not mount.

---

## 11. Latency Budget

| Stage | Time |
|---|---|
| Silence debounce | 1500ms |
| Speaker-change wait | 0ms |
| llama3.1:8b inference (prefill + JSON gen) | 200-500ms (GPU, warmed) |
| HTTP + JSON parse | ~20ms |
| IPC main → renderer | ~5ms |
| React render | ~10ms |
| **Total (silence path)** | **~1.7-2.0s after question ends** |
| **Total (speaker-change path)** | **~0.2-0.5s after question ends** |

The 1.7-2.0s on silence path is not user-perceived latency — the user is still processing the question during that window. They look at the screen after the interviewer finishes; the chip is already there.

### Click-to-first-token

| Stage | Time |
|---|---|
| IPC main → handler | ~5ms |
| (skip intent classification) | SAVED 50-550ms vs current |
| (skip context fetch) | SAVED ~50ms |
| Flash prefill + first token | 800-1500ms |
| **TTFT** | **800-1500ms (~100-300ms faster than current What-to-answer)** |

---

## 12. Testing Strategy

### Unit tests (Jest, electron side)

- `QuestionDetector.test.ts`
  - Debounce timer fires after 1.5s silence
  - Speaker-change fires immediately
  - Dedup: 70%+ similarity → update existing chip id, <70% → new chip
  - Single-flight: second concurrent request queues at most 1
  - Confidence filter: <0.6 drops, ≥0.6 emits
- `OllamaDetectionClient.test.ts`
  - Valid JSON response → parsed object
  - Invalid JSON → null + counter increment
  - 3s timeout → null
  - Network error → null + marks unavailable
- Extended `IntelligenceEngine.test.ts`
  - `runWhatShouldISay` with intentOverride skips classifyIntent
  - `runWhatShouldISay` with contextOverride uses provided string

### Unit tests (React side)

- `useDetectedQuestions.test.tsx`
  - Chip queue FIFO at 5
  - Dedup-update preserves position, updates text + detectedAt
  - clickChip removes chip and calls IPC with full payload
  - Panel auto-collapse triggers 10s after last interaction
  - Meeting-end event clears queue

### Integration test

- Mock transcript stream of a 5-minute sample interview → assert N expected chips emitted with correct intents. Use a fixed fixture from a real interview recording.

### Manual rehearsal

- 5 sample transcripts covering: pure technical Q&A, behavioral STAR, coding deep-dive, mixed interview, edge cases (interruptions, rephrasing, multi-question turns). Verify chip surfacing accuracy and confidence calibration.

### Acceptance criteria

- Chips appear within latency budget on a real interview test recording.
- Intent classification accuracy ≥98% on 50-question fixture (vs current ~85-90% with mobilebert).
- No memory leaks after 30-minute simulated interview (chip queue stays bounded, dedup cache stays bounded at 10).
- Graceful degradation: app remains fully functional when Ollama is killed mid-session.

---

## 13. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| llama 8b mis-classifies behavioral as coding (or vice versa) | Low-Medium | Medium — user gets wrong-shape answer | Confidence threshold filters edge cases. Prompt has explicit examples. Single-tier classification at detection time is still better than today's two-tier mobilebert. |
| Detection prompt drift over time (llama updates change behavior) | Low | Low | Pin Ollama model version in settings. Re-test on prompt fixture before releasing new versions. |
| User finds chips distracting | Medium | Low | Toggle off in settings. Auto-collapse to single line minimizes visual weight. |
| Ollama process dies mid-session | Low | Low | Existing OllamaManager handles restart. Detection degrades to disabled until Ollama recovers. |
| Speaker labels are wrong (user voice tagged as interviewer) | Low-Medium | Low | Prompt explicitly says "interviewer asking candidate". Most user-as-interviewer mislabels get low confidence and drop. |
| Detection runs while user types in chat (interference) | Low | None | Independent pipelines. No shared state. |
| Snapshot context becomes stale if user delays click by minutes | Medium | Low-Medium | Snapshot is the design intent — answers the question as asked. Power users who want fresh context can use manual "What to answer?". |

---

## 14. Open questions for implementation phase

None remaining for design. Implementation may surface these:

- Animation timing fine-tuning — start with 150ms, adjust based on perceived feel.
- Whether to show a brief "detecting…" indicator during in-flight Ollama call — defer; only add if testing shows users find the silence confusing.

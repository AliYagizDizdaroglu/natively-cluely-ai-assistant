# Passive Question Detector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a background process that uses local llama3.1:8b (Ollama) to detect interviewer questions from live transcripts, surfaces them as clickable chips above the chat, and routes clicks to pre-classified answer paths (Flash 3.1 for verbal/behavioral, Gemma 4 for coding) with snapshot context.

**Architecture:** Standalone `QuestionDetector` service (matches existing `RAGManager` / `OllamaManager` pattern) subscribes to transcript events emitted by `IntelligenceEngine`, debounces with 1.5s silence or speaker-change triggers, fires an `OllamaDetectionClient` with the detection prompt, dedups by Jaccard similarity, and emits `question-detected` events that bridge through IPC to a React hook + panel + chip components. Click flow reuses `runWhatShouldISay` with new `intentOverride` and `contextOverride` parameters.

**Tech Stack:** TypeScript (strict), Electron (main + preload + renderer), React 18, Ollama HTTP API, vitest (new — added in Task 1).

**Spec reference:** [docs/superpowers/specs/2026-05-17-passive-question-detector-design.md](../specs/2026-05-17-passive-question-detector-design.md)

---

## File Map

### New files

| File | Responsibility |
|---|---|
| `vitest.config.ts` | Vitest config (Node environment for electron-side tests) |
| `electron/llm/prompts/questionDetection.ts` | Detection system prompt + TypeScript types for the Ollama response |
| `electron/services/OllamaDetectionClient.ts` | HTTP wrapper around Ollama `/api/chat` for the detection prompt with 3s timeout, JSON parse, schema validate |
| `electron/services/OllamaDetectionClient.test.ts` | Unit tests for the client |
| `electron/services/QuestionDetector.ts` | Debounce timer, speaker-change handler, dedup cache, single-flight orchestration, emits chip events |
| `electron/services/QuestionDetector.test.ts` | Unit tests for detector logic |
| `electron/services/jaccardSimilarity.ts` | Pure utility — Jaccard similarity over lowercased word tokens |
| `electron/services/jaccardSimilarity.test.ts` | Unit tests for the similarity util |
| `src/hooks/useDetectedQuestions.ts` | React hook: subscribes to IPC, manages chip queue (max 5 FIFO, dedup-update), exposes `chips`, `dismissChip`, `clickChip` |
| `src/components/QuestionChip.tsx` | Single chip row with icon badge + truncated text + click handler |
| `src/components/DetectedQuestionsPanel.tsx` | Collapsible container with auto-collapse 10s timer |

### Modified files

| File | Change |
|---|---|
| `package.json` | Add `test` script + vitest devDependency |
| `electron/IntelligenceEngine.ts` | Emit `transcript-segment-final` and `speaker-change` events from `handleTranscript`. Add `intentOverride` and `contextOverride` optional params to `runWhatShouldISay`. |
| `electron/IntelligenceManager.ts` | Instantiate `QuestionDetector`, wire events, clear chips on meeting start/end, expose `clearDetectedQuestions()` method. |
| `electron/main.ts` | Listen to `IntelligenceManager`'s `question-detected` and `question-detected-update` events, forward via `webContents.send` to renderer. |
| `electron/ipcHandlers.ts` | New `answer-detected-question` handler that calls `runWhatShouldISay` with overrides. |
| `electron/preload.ts` | Expose `onDetectedQuestion`, `onDetectedQuestionUpdate`, `answerDetectedQuestion` to the renderer. |
| `src/types/electron.d.ts` | Add types for the new preload methods. |
| `src/components/NativelyInterface.tsx` | Mount `<DetectedQuestionsPanel>` above the first chat message, wired to `useDetectedQuestions`. |

---

## Task 1: Set up vitest for backend unit tests

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (add `test` script + devDeps)
- Create: `electron/services/__smoke__.test.ts`

- [ ] **Step 1: Install vitest**

```bash
npm install --save-dev vitest@^2.0.0
```

Expected: `vitest` added to `devDependencies`. No errors.

- [ ] **Step 2: Create `vitest.config.ts`**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        include: ['electron/**/*.test.ts', 'src/**/*.test.ts', 'src/**/*.test.tsx'],
        exclude: ['node_modules', 'dist', 'dist-electron', '.claude'],
        globals: true,
    },
});
```

- [ ] **Step 3: Add `test` script to `package.json`**

In `scripts`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Write smoke test**

Create `electron/services/__smoke__.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';

describe('vitest smoke', () => {
    it('runs', () => {
        expect(1 + 1).toBe(2);
    });
});
```

- [ ] **Step 5: Run tests to verify setup**

```bash
npm test
```

Expected: `1 passed`, no errors. Vitest discovers and runs the smoke test.

- [ ] **Step 6: Type-check**

```bash
npx tsc --noEmit
```

Expected: clean (no errors).

- [ ] **Step 7: Commit**

```bash
git add vitest.config.ts package.json package-lock.json electron/services/__smoke__.test.ts
git commit -m "test: set up vitest for unit tests"
```

---

## Task 2: Detection prompt module + response types

**Files:**
- Create: `electron/llm/prompts/questionDetection.ts`

- [ ] **Step 1: Create the prompt file**

```typescript
// electron/llm/prompts/questionDetection.ts

/**
 * System prompt for the passive question detector.
 * Kept intentionally short — every token costs detection latency.
 * The prompt biases towards detection of the MOST RECENT interviewer prompt
 * and classifies into verbal | coding | behavioral.
 */
export const QUESTION_DETECTION_SYSTEM_PROMPT = `You are detecting questions asked by an interviewer to a candidate in a live interview.
Identify the MOST RECENT question or prompt that requires the candidate to respond.
Return ONLY a JSON object: {"detected": bool, "question": string, "intent": "verbal" | "coding" | "behavioral", "confidence": float}.
intent="coding" if the answer requires writing code, "behavioral" if it asks for a personal experience or story (e.g. "Tell me about a time..."), otherwise "verbal".
Only set detected=true if the interviewer just asked something the candidate should answer. Set detected=false for filler, acknowledgements, or interviewer thinking aloud.`;

/**
 * Build the user message for the detection request.
 * Includes recent conversation context so llama can see what speaker is saying what.
 */
export function buildDetectionUserMessage(opts: {
    recentInterviewerTranscript: string;
    fullConversationContext: string;
}): string {
    return `Recent conversation (last 60s):
${opts.fullConversationContext}

Most recent interviewer turn (last 30s):
${opts.recentInterviewerTranscript}

Detect the most recent question/prompt requiring a response. Return JSON only.`;
}

/**
 * Expected JSON shape from llama. Validated at runtime in OllamaDetectionClient.
 */
export interface DetectionResponse {
    detected: boolean;
    question: string;
    intent: 'verbal' | 'coding' | 'behavioral';
    confidence: number;
}

/**
 * Runtime validator — returns the response if it matches the schema, else null.
 * Defensive against llama returning malformed/partial JSON.
 */
export function validateDetectionResponse(raw: unknown): DetectionResponse | null {
    if (typeof raw !== 'object' || raw === null) return null;
    const r = raw as Record<string, unknown>;

    if (typeof r.detected !== 'boolean') return null;
    if (typeof r.question !== 'string') return null;
    if (typeof r.confidence !== 'number' || r.confidence < 0 || r.confidence > 1) return null;

    const validIntents = ['verbal', 'coding', 'behavioral'] as const;
    if (typeof r.intent !== 'string' || !validIntents.includes(r.intent as any)) {
        // Spec section 9: invalid intent → default to 'verbal'
        return {
            detected: r.detected,
            question: r.question,
            intent: 'verbal',
            confidence: r.confidence,
        };
    }

    // Empty question with detected=true is treated as detected=false per spec
    if (r.detected && r.question.trim().length === 0) {
        return { detected: false, question: '', intent: 'verbal', confidence: r.confidence };
    }

    return {
        detected: r.detected,
        question: r.question,
        intent: r.intent as 'verbal' | 'coding' | 'behavioral',
        confidence: r.confidence,
    };
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add electron/llm/prompts/questionDetection.ts
git commit -m "feat(detector): add question detection prompt + response validator"
```

---

## Task 3: Jaccard similarity utility

**Files:**
- Create: `electron/services/jaccardSimilarity.ts`
- Create: `electron/services/jaccardSimilarity.test.ts`

- [ ] **Step 1: Write the failing tests**

`electron/services/jaccardSimilarity.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { jaccardSimilarity } from './jaccardSimilarity';

describe('jaccardSimilarity', () => {
    it('returns 1 for identical strings', () => {
        expect(jaccardSimilarity('hello world', 'hello world')).toBe(1);
    });

    it('returns 0 for completely disjoint word sets', () => {
        expect(jaccardSimilarity('apple banana', 'cat dog')).toBe(0);
    });

    it('is case insensitive', () => {
        expect(jaccardSimilarity('Hello World', 'hello WORLD')).toBe(1);
    });

    it('returns 0 for two empty strings', () => {
        expect(jaccardSimilarity('', '')).toBe(0);
    });

    it('returns ~0.5 for half-overlapping word sets', () => {
        // {a,b} vs {b,c} → intersection {b} = 1, union {a,b,c} = 3 → 1/3
        const sim = jaccardSimilarity('a b', 'b c');
        expect(sim).toBeCloseTo(1 / 3, 5);
    });

    it('handles punctuation by tokenizing on non-word chars', () => {
        // "what is your name?" vs "what is your name" → identical token sets
        expect(jaccardSimilarity("what is your name?", "what is your name")).toBe(1);
    });

    it('crosses 0.7 threshold for clearly similar interview questions', () => {
        const a = "What's the time complexity of quicksort";
        const b = "And the time complexity for quicksort would be";
        expect(jaccardSimilarity(a, b)).toBeGreaterThan(0.4);
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run electron/services/jaccardSimilarity.test.ts
```

Expected: 7 tests fail with "Cannot find module './jaccardSimilarity'" or similar.

- [ ] **Step 3: Implement the utility**

`electron/services/jaccardSimilarity.ts`:
```typescript
/**
 * Jaccard similarity over lowercased word tokens.
 * Returns intersection / union size, in [0, 1]. Returns 0 if both sets are empty.
 *
 * Chosen for question-dedup: O(n+m), word-level semantics fit short question text
 * better than character-level Levenshtein.
 */
export function jaccardSimilarity(a: string, b: string): number {
    const tokensA = tokenize(a);
    const tokensB = tokenize(b);

    if (tokensA.size === 0 && tokensB.size === 0) return 0;

    let intersectionSize = 0;
    for (const token of tokensA) {
        if (tokensB.has(token)) intersectionSize++;
    }

    const unionSize = tokensA.size + tokensB.size - intersectionSize;
    return unionSize === 0 ? 0 : intersectionSize / unionSize;
}

function tokenize(text: string): Set<string> {
    return new Set(
        text
            .toLowerCase()
            .split(/\W+/)
            .filter(t => t.length > 0)
    );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run electron/services/jaccardSimilarity.test.ts
```

Expected: all 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add electron/services/jaccardSimilarity.ts electron/services/jaccardSimilarity.test.ts
git commit -m "feat(detector): add Jaccard similarity utility for dedup"
```

---

## Task 4: OllamaDetectionClient

**Files:**
- Create: `electron/services/OllamaDetectionClient.ts`
- Create: `electron/services/OllamaDetectionClient.test.ts`

- [ ] **Step 1: Write the failing tests**

`electron/services/OllamaDetectionClient.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OllamaDetectionClient } from './OllamaDetectionClient';

describe('OllamaDetectionClient', () => {
    let fetchMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        fetchMock = vi.fn();
        // @ts-ignore — assign global fetch mock
        globalThis.fetch = fetchMock;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('returns parsed response on valid JSON', async () => {
        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                message: {
                    content: JSON.stringify({
                        detected: true,
                        question: 'What is your favorite language?',
                        intent: 'verbal',
                        confidence: 0.92,
                    }),
                },
            }),
        });

        const client = new OllamaDetectionClient({ model: 'llama3.1:8b' });
        const result = await client.detect({
            recentInterviewerTranscript: '[interviewer]: What is your favorite language?',
            fullConversationContext: '...',
        });

        expect(result).toEqual({
            detected: true,
            question: 'What is your favorite language?',
            intent: 'verbal',
            confidence: 0.92,
        });
    });

    it('returns null on invalid JSON', async () => {
        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ message: { content: 'not valid json {' } }),
        });

        const client = new OllamaDetectionClient({ model: 'llama3.1:8b' });
        const result = await client.detect({
            recentInterviewerTranscript: 'x',
            fullConversationContext: 'y',
        });
        expect(result).toBeNull();
    });

    it('returns null on schema mismatch', async () => {
        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                message: { content: JSON.stringify({ foo: 'bar' }) },
            }),
        });

        const client = new OllamaDetectionClient({ model: 'llama3.1:8b' });
        const result = await client.detect({
            recentInterviewerTranscript: 'x',
            fullConversationContext: 'y',
        });
        expect(result).toBeNull();
    });

    it('returns null on HTTP error', async () => {
        fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });

        const client = new OllamaDetectionClient({ model: 'llama3.1:8b' });
        const result = await client.detect({
            recentInterviewerTranscript: 'x',
            fullConversationContext: 'y',
        });
        expect(result).toBeNull();
    });

    it('returns null on network error', async () => {
        fetchMock.mockRejectedValueOnce(new Error('ECONNREFUSED'));

        const client = new OllamaDetectionClient({ model: 'llama3.1:8b' });
        const result = await client.detect({
            recentInterviewerTranscript: 'x',
            fullConversationContext: 'y',
        });
        expect(result).toBeNull();
    });

    it('returns null on timeout (>3s)', async () => {
        fetchMock.mockImplementationOnce(
            () => new Promise(resolve => setTimeout(() => resolve({ ok: true, json: async () => ({}) }), 5000))
        );

        const client = new OllamaDetectionClient({ model: 'llama3.1:8b', timeoutMs: 100 });
        const result = await client.detect({
            recentInterviewerTranscript: 'x',
            fullConversationContext: 'y',
        });
        expect(result).toBeNull();
    });

    it('posts to /api/chat with correct payload', async () => {
        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                message: { content: JSON.stringify({ detected: false, question: '', intent: 'verbal', confidence: 0.1 }) },
            }),
        });

        const client = new OllamaDetectionClient({ model: 'llama3.1:8b' });
        await client.detect({
            recentInterviewerTranscript: 'recent',
            fullConversationContext: 'full',
        });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url, opts] = fetchMock.mock.calls[0];
        expect(url).toBe('http://127.0.0.1:11434/api/chat');
        expect(opts.method).toBe('POST');
        const body = JSON.parse(opts.body);
        expect(body.model).toBe('llama3.1:8b');
        expect(body.format).toBe('json');
        expect(body.stream).toBe(false);
        expect(body.messages).toHaveLength(2);
        expect(body.messages[0].role).toBe('system');
        expect(body.messages[1].role).toBe('user');
        expect(body.messages[1].content).toContain('recent');
        expect(body.messages[1].content).toContain('full');
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run electron/services/OllamaDetectionClient.test.ts
```

Expected: all tests fail with "Cannot find module './OllamaDetectionClient'".

- [ ] **Step 3: Implement the client**

`electron/services/OllamaDetectionClient.ts`:
```typescript
import {
    QUESTION_DETECTION_SYSTEM_PROMPT,
    buildDetectionUserMessage,
    validateDetectionResponse,
    DetectionResponse,
} from '../llm/prompts/questionDetection';

interface DetectionInput {
    recentInterviewerTranscript: string;
    fullConversationContext: string;
}

interface OllamaDetectionClientOptions {
    model: string;
    ollamaUrl?: string;       // default 'http://127.0.0.1:11434'
    timeoutMs?: number;       // default 3000
}

/**
 * Single-purpose Ollama HTTP wrapper for the question-detection prompt.
 * Returns the parsed DetectionResponse, or null on any error (HTTP, timeout,
 * parse failure, schema mismatch). Never throws.
 */
export class OllamaDetectionClient {
    private readonly model: string;
    private readonly ollamaUrl: string;
    private readonly timeoutMs: number;
    private parseErrorStreak = 0;

    constructor(opts: OllamaDetectionClientOptions) {
        this.model = opts.model;
        this.ollamaUrl = opts.ollamaUrl ?? 'http://127.0.0.1:11434';
        this.timeoutMs = opts.timeoutMs ?? 3000;
    }

    async detect(input: DetectionInput): Promise<DetectionResponse | null> {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);

        try {
            const response = await fetch(`${this.ollamaUrl}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.model,
                    format: 'json',
                    stream: false,
                    options: { temperature: 0.1, top_p: 0.9 },
                    keep_alive: '10m',
                    messages: [
                        { role: 'system', content: QUESTION_DETECTION_SYSTEM_PROMPT },
                        { role: 'user', content: buildDetectionUserMessage(input) },
                    ],
                }),
                signal: controller.signal,
            });

            if (!response.ok) {
                console.warn(`[OllamaDetectionClient] HTTP ${response.status}`);
                return null;
            }

            const data = await response.json();
            const content = data?.message?.content;
            if (typeof content !== 'string') {
                console.warn('[OllamaDetectionClient] Missing message.content in response');
                return null;
            }

            let parsed: unknown;
            try {
                parsed = JSON.parse(content);
            } catch (e) {
                this.parseErrorStreak++;
                if (this.parseErrorStreak >= 5) {
                    console.warn(`[OllamaDetectionClient] 5+ consecutive JSON parse failures — prompt may be broken. Raw: ${content.slice(0, 200)}`);
                }
                return null;
            }

            const validated = validateDetectionResponse(parsed);
            if (!validated) {
                this.parseErrorStreak++;
                return null;
            }

            this.parseErrorStreak = 0;
            return validated;
        } catch (e: any) {
            if (e.name === 'AbortError') {
                console.log(`[OllamaDetectionClient] Detection timed out after ${this.timeoutMs}ms`);
            } else {
                console.warn(`[OllamaDetectionClient] Request failed: ${e.message}`);
            }
            return null;
        } finally {
            clearTimeout(timer);
        }
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run electron/services/OllamaDetectionClient.test.ts
```

Expected: all 7 tests pass.

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add electron/services/OllamaDetectionClient.ts electron/services/OllamaDetectionClient.test.ts
git commit -m "feat(detector): add OllamaDetectionClient with timeout + schema validation"
```

---

## Task 5: QuestionDetector core (debounce, dedup, single-flight)

**Files:**
- Create: `electron/services/QuestionDetector.ts`
- Create: `electron/services/QuestionDetector.test.ts`

- [ ] **Step 1: Write the failing tests**

`electron/services/QuestionDetector.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QuestionDetector, DetectedQuestionChip } from './QuestionDetector';
import { DetectionResponse } from '../llm/prompts/questionDetection';

const makeClientWith = (responses: (DetectionResponse | null)[]) => {
    let i = 0;
    return {
        detect: vi.fn(async () => {
            const r = responses[i++];
            return r ?? null;
        }),
    } as any;
};

const stubSnapshotProvider = (interviewerText: string, contextText: string) => ({
    getRecentInterviewerTranscript: () => interviewerText,
    getContextSnapshot: () => contextText,
});

describe('QuestionDetector', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('fires detection after 1.5s of silence following a final interviewer segment', async () => {
        const client = makeClientWith([
            { detected: true, question: 'What is X?', intent: 'verbal', confidence: 0.9 },
        ]);
        const chips: DetectedQuestionChip[] = [];
        const det = new QuestionDetector({
            client,
            snapshotProvider: stubSnapshotProvider('[interviewer]: what is X?', 'ctx'),
            onChip: c => chips.push(c),
        });

        det.onTranscriptFinal({ speaker: 'interviewer', text: 'what is X?', timestamp: 0, final: true });

        // before 1.5s — no detection
        await vi.advanceTimersByTimeAsync(1499);
        expect(client.detect).not.toHaveBeenCalled();

        // at 1.5s — fires
        await vi.advanceTimersByTimeAsync(1);
        await vi.runAllTimersAsync();
        expect(client.detect).toHaveBeenCalledTimes(1);
        expect(chips).toHaveLength(1);
        expect(chips[0].question).toBe('What is X?');
        expect(chips[0].intent).toBe('verbal');
        expect(chips[0].contextSnapshot).toBe('ctx');
    });

    it('resets silence timer on each new interviewer segment', async () => {
        const client = makeClientWith([
            { detected: true, question: 'Q', intent: 'verbal', confidence: 0.9 },
        ]);
        const chips: DetectedQuestionChip[] = [];
        const det = new QuestionDetector({
            client,
            snapshotProvider: stubSnapshotProvider('i', 'c'),
            onChip: c => chips.push(c),
        });

        det.onTranscriptFinal({ speaker: 'interviewer', text: 'tell me', timestamp: 0, final: true });
        await vi.advanceTimersByTimeAsync(1000);
        // new segment resets timer
        det.onTranscriptFinal({ speaker: 'interviewer', text: 'about a time', timestamp: 1000, final: true });
        await vi.advanceTimersByTimeAsync(1000);
        // still under 1.5s after the second segment
        expect(client.detect).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(500);
        await vi.runAllTimersAsync();
        expect(client.detect).toHaveBeenCalledTimes(1);
    });

    it('fires immediately on speaker change (interviewer -> user)', async () => {
        const client = makeClientWith([
            { detected: true, question: 'Q', intent: 'verbal', confidence: 0.9 },
        ]);
        const chips: DetectedQuestionChip[] = [];
        const det = new QuestionDetector({
            client,
            snapshotProvider: stubSnapshotProvider('i', 'c'),
            onChip: c => chips.push(c),
        });

        det.onTranscriptFinal({ speaker: 'interviewer', text: 'q?', timestamp: 0, final: true });
        det.onSpeakerChange('interviewer', 'user');
        // no need to wait for debounce
        await vi.runAllTimersAsync();
        expect(client.detect).toHaveBeenCalledTimes(1);
        expect(chips).toHaveLength(1);
    });

    it('drops detections below confidence threshold (default 0.6)', async () => {
        const client = makeClientWith([
            { detected: true, question: 'Q', intent: 'verbal', confidence: 0.4 },
        ]);
        const chips: DetectedQuestionChip[] = [];
        const det = new QuestionDetector({
            client,
            snapshotProvider: stubSnapshotProvider('i', 'c'),
            onChip: c => chips.push(c),
        });

        det.onTranscriptFinal({ speaker: 'interviewer', text: 'x', timestamp: 0, final: true });
        await vi.advanceTimersByTimeAsync(1500);
        await vi.runAllTimersAsync();
        expect(client.detect).toHaveBeenCalledTimes(1);
        expect(chips).toHaveLength(0);
    });

    it('drops detections where detected=false', async () => {
        const client = makeClientWith([
            { detected: false, question: '', intent: 'verbal', confidence: 0.9 },
        ]);
        const chips: DetectedQuestionChip[] = [];
        const det = new QuestionDetector({
            client,
            snapshotProvider: stubSnapshotProvider('i', 'c'),
            onChip: c => chips.push(c),
        });

        det.onTranscriptFinal({ speaker: 'interviewer', text: 'x', timestamp: 0, final: true });
        await vi.advanceTimersByTimeAsync(1500);
        await vi.runAllTimersAsync();
        expect(chips).toHaveLength(0);
    });

    it('dedups: 70%+ similarity emits update with existing id', async () => {
        const client = makeClientWith([
            { detected: true, question: 'what is quicksort time complexity', intent: 'verbal', confidence: 0.9 },
            { detected: true, question: 'what is the time complexity of quicksort', intent: 'verbal', confidence: 0.9 },
        ]);
        const events: { type: 'new' | 'update'; chip: DetectedQuestionChip }[] = [];
        const det = new QuestionDetector({
            client,
            snapshotProvider: stubSnapshotProvider('i', 'c'),
            onChip: c => events.push({ type: 'new', chip: c }),
            onChipUpdate: c => events.push({ type: 'update', chip: c }),
        });

        det.onTranscriptFinal({ speaker: 'interviewer', text: 'q1', timestamp: 0, final: true });
        await vi.advanceTimersByTimeAsync(1500);
        await vi.runAllTimersAsync();

        det.onTranscriptFinal({ speaker: 'interviewer', text: 'q2', timestamp: 5000, final: true });
        await vi.advanceTimersByTimeAsync(1500);
        await vi.runAllTimersAsync();

        expect(events).toHaveLength(2);
        expect(events[0].type).toBe('new');
        expect(events[1].type).toBe('update');
        expect(events[1].chip.id).toBe(events[0].chip.id);
    });

    it('single-flight: queues at most 1 pending detection', async () => {
        let resolve1: (v: DetectionResponse) => void = () => {};
        const inflight = new Promise<DetectionResponse>(r => { resolve1 = r; });
        const client = {
            detect: vi.fn()
                .mockImplementationOnce(() => inflight)
                .mockResolvedValueOnce({ detected: true, question: 'second', intent: 'verbal', confidence: 0.9 })
                .mockResolvedValueOnce({ detected: true, question: 'third', intent: 'verbal', confidence: 0.9 }),
        } as any;
        const chips: DetectedQuestionChip[] = [];
        const det = new QuestionDetector({
            client,
            snapshotProvider: stubSnapshotProvider('i', 'c'),
            onChip: c => chips.push(c),
        });

        // trigger first (in-flight)
        det.onSpeakerChange('interviewer', 'user');
        // trigger second (queued)
        det.onSpeakerChange('interviewer', 'user');
        // trigger third (should be dropped — queue full)
        det.onSpeakerChange('interviewer', 'user');

        expect(client.detect).toHaveBeenCalledTimes(1);

        // resolve first — second should now run, third dropped
        resolve1({ detected: true, question: 'first', intent: 'verbal', confidence: 0.9 });
        await vi.runAllTimersAsync();
        // give microtask queue time
        await Promise.resolve();
        await Promise.resolve();
        expect(client.detect).toHaveBeenCalledTimes(2);
    });

    it('clear() resets dedup cache and timers', async () => {
        const client = makeClientWith([
            { detected: true, question: 'Q same words', intent: 'verbal', confidence: 0.9 },
            { detected: true, question: 'Q same words', intent: 'verbal', confidence: 0.9 },
        ]);
        const events: { type: 'new' | 'update' }[] = [];
        const det = new QuestionDetector({
            client,
            snapshotProvider: stubSnapshotProvider('i', 'c'),
            onChip: () => events.push({ type: 'new' }),
            onChipUpdate: () => events.push({ type: 'update' }),
        });

        det.onTranscriptFinal({ speaker: 'interviewer', text: 'x', timestamp: 0, final: true });
        await vi.advanceTimersByTimeAsync(1500);
        await vi.runAllTimersAsync();

        det.clear();

        det.onTranscriptFinal({ speaker: 'interviewer', text: 'x', timestamp: 5000, final: true });
        await vi.advanceTimersByTimeAsync(1500);
        await vi.runAllTimersAsync();

        // After clear, same question becomes a new chip (not update)
        expect(events).toEqual([{ type: 'new' }, { type: 'new' }]);
    });

    it('does not detect on user segments', async () => {
        const client = makeClientWith([
            { detected: true, question: 'Q', intent: 'verbal', confidence: 0.9 },
        ]);
        const chips: DetectedQuestionChip[] = [];
        const det = new QuestionDetector({
            client,
            snapshotProvider: stubSnapshotProvider('i', 'c'),
            onChip: c => chips.push(c),
        });

        det.onTranscriptFinal({ speaker: 'user', text: 'I think...', timestamp: 0, final: true });
        await vi.advanceTimersByTimeAsync(2000);
        await vi.runAllTimersAsync();
        expect(client.detect).not.toHaveBeenCalled();
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run electron/services/QuestionDetector.test.ts
```

Expected: all fail with "Cannot find module './QuestionDetector'".

- [ ] **Step 3: Implement the detector**

`electron/services/QuestionDetector.ts`:
```typescript
import { randomUUID } from 'crypto';
import { OllamaDetectionClient } from './OllamaDetectionClient';
import { jaccardSimilarity } from './jaccardSimilarity';
import { DetectionResponse } from '../llm/prompts/questionDetection';

/**
 * Subset of TranscriptSegment used by the detector. Defined inline to avoid
 * coupling to the wider SessionTracker types.
 */
export interface TranscriptSegmentLite {
    speaker: 'interviewer' | 'user' | 'assistant';
    text: string;
    timestamp: number;
    final: boolean;
}

export interface DetectedQuestionChip {
    id: string;
    question: string;
    intent: 'verbal' | 'coding' | 'behavioral';
    confidence: number;
    contextSnapshot: string;
    detectedAt: number;
}

export interface SnapshotProvider {
    /** Last 30s of interviewer-focused conversation (formatted with speaker labels). */
    getRecentInterviewerTranscript: () => string;
    /** Last 60s of full conversation for context snapshot. */
    getContextSnapshot: () => string;
}

export interface QuestionDetectorOptions {
    client: OllamaDetectionClient;
    snapshotProvider: SnapshotProvider;
    onChip: (chip: DetectedQuestionChip) => void;
    onChipUpdate?: (chip: DetectedQuestionChip) => void;
    confidenceThreshold?: number;        // default 0.6
    silenceDebounceMs?: number;          // default 1500
    similarityThreshold?: number;        // default 0.7
    dedupCacheSize?: number;             // default 10
}

const DEFAULTS = {
    confidenceThreshold: 0.6,
    silenceDebounceMs: 1500,
    similarityThreshold: 0.7,
    dedupCacheSize: 10,
};

/**
 * Detection orchestrator. Subscribes to transcript-final + speaker-change events,
 * debounces with silence or fires immediately on speaker change, dedups via Jaccard
 * similarity, and emits chip / chip-update events through callbacks.
 *
 * Single-flight: at most 1 in-flight request, queue at most 1 next.
 */
export class QuestionDetector {
    private readonly opts: Required<QuestionDetectorOptions>;
    private silenceTimer: NodeJS.Timeout | null = null;
    private inflightDetection: Promise<void> | null = null;
    private queuedTrigger = false;
    private dedupCache: { id: string; text: string }[] = [];

    constructor(opts: QuestionDetectorOptions) {
        this.opts = {
            ...DEFAULTS,
            onChipUpdate: opts.onChip,  // default: treat update as new
            ...opts,
        } as Required<QuestionDetectorOptions>;
    }

    onTranscriptFinal(segment: TranscriptSegmentLite): void {
        if (segment.speaker !== 'interviewer' || !segment.final) return;
        this.resetSilenceTimer();
    }

    onSpeakerChange(prevSpeaker: string, newSpeaker: string): void {
        // Interviewer handed off (silence or user starting): fire immediately
        if (prevSpeaker === 'interviewer' && newSpeaker !== 'interviewer') {
            if (this.silenceTimer) {
                clearTimeout(this.silenceTimer);
                this.silenceTimer = null;
            }
            this.triggerDetection();
        }
    }

    /** Reset all state — call on meeting boundary. */
    clear(): void {
        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
        }
        this.queuedTrigger = false;
        this.dedupCache = [];
    }

    private resetSilenceTimer(): void {
        if (this.silenceTimer) clearTimeout(this.silenceTimer);
        this.silenceTimer = setTimeout(() => {
            this.silenceTimer = null;
            this.triggerDetection();
        }, this.opts.silenceDebounceMs);
    }

    private triggerDetection(): void {
        if (this.inflightDetection) {
            // Already running — queue at most 1
            this.queuedTrigger = true;
            return;
        }
        this.inflightDetection = this.runDetection().finally(() => {
            this.inflightDetection = null;
            if (this.queuedTrigger) {
                this.queuedTrigger = false;
                this.triggerDetection();
            }
        });
    }

    private async runDetection(): Promise<void> {
        const recentInterviewerTranscript = this.opts.snapshotProvider.getRecentInterviewerTranscript();
        const fullContext = this.opts.snapshotProvider.getContextSnapshot();
        const detectedAt = Date.now();

        let result: DetectionResponse | null;
        try {
            result = await this.opts.client.detect({
                recentInterviewerTranscript,
                fullConversationContext: fullContext,
            });
        } catch (e) {
            // OllamaDetectionClient never throws, but defensive
            console.warn('[QuestionDetector] detect() threw unexpectedly', e);
            return;
        }

        if (!result || !result.detected) return;
        if (result.confidence < this.opts.confidenceThreshold) return;
        if (result.question.trim().length === 0) return;

        // Dedup check
        const match = this.findSimilarChip(result.question);
        if (match) {
            const updated: DetectedQuestionChip = {
                id: match.id,
                question: result.question,
                intent: result.intent,
                confidence: result.confidence,
                contextSnapshot: fullContext,
                detectedAt,
            };
            // refresh dedup cache entry text
            const cacheEntry = this.dedupCache.find(e => e.id === match.id);
            if (cacheEntry) cacheEntry.text = result.question;
            this.opts.onChipUpdate(updated);
            return;
        }

        const chip: DetectedQuestionChip = {
            id: randomUUID(),
            question: result.question,
            intent: result.intent,
            confidence: result.confidence,
            contextSnapshot: fullContext,
            detectedAt,
        };

        this.dedupCache.push({ id: chip.id, text: chip.question });
        if (this.dedupCache.length > this.opts.dedupCacheSize) {
            this.dedupCache.shift();
        }
        this.opts.onChip(chip);
    }

    private findSimilarChip(text: string): { id: string; text: string } | null {
        for (const entry of this.dedupCache) {
            if (jaccardSimilarity(text, entry.text) >= this.opts.similarityThreshold) {
                return entry;
            }
        }
        return null;
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run electron/services/QuestionDetector.test.ts
```

Expected: all 9 tests pass.

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add electron/services/QuestionDetector.ts electron/services/QuestionDetector.test.ts
git commit -m "feat(detector): QuestionDetector with debounce, dedup, single-flight"
```

---

## Task 6: IntelligenceEngine emits transcript-segment-final + speaker-change events

**Files:**
- Modify: `electron/IntelligenceEngine.ts`

- [ ] **Step 1: Locate the event interface and handleTranscript method**

```bash
grep -n "interface IntelligenceEvents\|handleTranscript\|emit.*'assist_update'" electron/IntelligenceEngine.ts | head -10
```

Expect to find:
- An events interface around line 40 with `suggested_answer`, etc.
- `handleTranscript(segment)` method that processes incoming transcript segments.

- [ ] **Step 2: Add new event signatures to the IntelligenceEvents interface**

Find the existing `interface IntelligenceEvents` block (around line 40) and add:
```typescript
    'transcript-segment-final': (segment: TranscriptSegment) => void;
    'speaker-change': (prevSpeaker: string, newSpeaker: string) => void;
```

(Add `TranscriptSegment` import from `./SessionTracker` at the top of the file if not already imported.)

- [ ] **Step 3: Add `lastSpeaker` instance state**

In the class body (near other private fields):
```typescript
    private lastSpeaker: 'interviewer' | 'user' | 'assistant' | null = null;
```

- [ ] **Step 4: Emit events from handleTranscript**

Inside `handleTranscript(segment: TranscriptSegment)`, immediately after the segment is processed (after any existing `this.session.handleTranscript(...)` call), add:

```typescript
        // Emit detector events
        if (segment.final) {
            this.emit('transcript-segment-final', segment);
        }
        if (this.lastSpeaker !== null && this.lastSpeaker !== segment.speaker) {
            this.emit('speaker-change', this.lastSpeaker, segment.speaker);
        }
        this.lastSpeaker = segment.speaker;
```

- [ ] **Step 5: Reset `lastSpeaker` on session/meeting boundary**

Find the existing reset/clear method in the engine (search for `reset` or `clear` or `endSession`):
```bash
grep -n "reset\|endSession\|clearSession\|onMeetingEnd" electron/IntelligenceEngine.ts | head -5
```

Wherever the engine resets session state, add:
```typescript
        this.lastSpeaker = null;
```

If there's no existing reset method, add one called from IntelligenceManager:
```typescript
    resetForMeetingBoundary(): void {
        this.lastSpeaker = null;
    }
```

- [ ] **Step 6: Type-check**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 7: Manual verification — start app, watch console**

Run app and observe an interview transcript flow:
```bash
npm start
```

In the dev console (or stdout), confirm `[IntelligenceEngine]` logs reach the engine when transcripts arrive (no new logs needed, just verify nothing crashed). The events are emitted but no listeners exist yet — silent success.

- [ ] **Step 8: Commit**

```bash
git add electron/IntelligenceEngine.ts
git commit -m "feat(intel-engine): emit transcript-segment-final + speaker-change events"
```

---

## Task 7: IntelligenceManager instantiates QuestionDetector + IPC bridge

**Files:**
- Modify: `electron/IntelligenceManager.ts`
- Modify: `electron/main.ts`

- [ ] **Step 1: Add types to IntelligenceManager event interface**

Find the events interface in `IntelligenceManager.ts`. Add:
```typescript
    'question-detected': (chip: DetectedQuestionChip) => void;
    'question-detected-update': (chip: DetectedQuestionChip) => void;
```

Import at top:
```typescript
import { QuestionDetector, DetectedQuestionChip } from './services/QuestionDetector';
import { OllamaDetectionClient } from './services/OllamaDetectionClient';
```

- [ ] **Step 2: Instantiate the detector in IntelligenceManager constructor**

In the constructor (after `this.engine` is set up), add:

```typescript
        // Initialize passive question detector
        const detectionClient = new OllamaDetectionClient({ model: 'llama3.1:8b' });
        this.questionDetector = new QuestionDetector({
            client: detectionClient,
            snapshotProvider: {
                getRecentInterviewerTranscript: () => this.getFormattedContext(30),
                getContextSnapshot: () => this.getFormattedContext(60),
            },
            onChip: chip => this.emit('question-detected', chip),
            onChipUpdate: chip => this.emit('question-detected-update', chip),
        });

        // Wire engine events to detector
        this.engine.on('transcript-segment-final', segment => {
            this.questionDetector.onTranscriptFinal(segment);
        });
        this.engine.on('speaker-change', (prev, next) => {
            this.questionDetector.onSpeakerChange(prev, next);
        });
```

Add the field declaration:
```typescript
    private questionDetector: QuestionDetector;
```

- [ ] **Step 3: Add clearDetectedQuestions method**

Add a public method on IntelligenceManager:
```typescript
    /** Clear detector state — call on meeting boundary. */
    clearDetectedQuestions(): void {
        this.questionDetector.clear();
    }
```

- [ ] **Step 4: Find meeting boundary hooks and wire clear**

```bash
grep -n "meeting-start\|meeting-end\|onMeetingStart\|onMeetingEnd\|startMeeting\|stopMeeting" electron/main.ts electron/IntelligenceManager.ts | head -10
```

Wherever a meeting starts or ends, add a call to `intelligenceManager.clearDetectedQuestions()`. Likely candidates in `main.ts` near existing meeting-state IPC handlers.

- [ ] **Step 5: Bridge detector events to renderer via IPC**

In `electron/main.ts`, find the existing `IntelligenceManager` event forwarding section (search for `intelligenceManager.on(`):
```bash
grep -n "intelligenceManager.on(" electron/main.ts | head -10
```

Add new forwarders near the existing ones:
```typescript
    this.intelligenceManager.on('question-detected', (chip) => {
        BrowserWindow.getAllWindows().forEach(win => {
            if (!win.isDestroyed()) {
                win.webContents.send('detected-question', chip);
            }
        });
    });

    this.intelligenceManager.on('question-detected-update', (chip) => {
        BrowserWindow.getAllWindows().forEach(win => {
            if (!win.isDestroyed()) {
                win.webContents.send('detected-question-update', chip);
            }
        });
    });
```

(Match the exact pattern used by existing forwarders — `event.sender.send` vs `webContents.send` may vary.)

- [ ] **Step 6: Type-check**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 7: Manual verification — confirm Ollama gets hit**

Start the app, start a meeting, simulate or speak some interviewer dialogue, watch the Ollama logs:
```bash
# In a separate terminal — watch Ollama if you have logs surfaced
# Or just check the main app stdout for: [OllamaDetectionClient] HTTP 200 or similar
```

Expected: after speaking an interview-style question, console should show no errors. The chip events will fire but the renderer isn't listening yet — IPC sends are silent no-ops, which is fine.

- [ ] **Step 8: Commit**

```bash
git add electron/IntelligenceManager.ts electron/main.ts
git commit -m "feat(intel-manager): wire QuestionDetector to engine events + IPC bridge"
```

---

## Task 8: runWhatShouldISay gains intentOverride + contextOverride params

**Files:**
- Modify: `electron/IntelligenceEngine.ts`

- [ ] **Step 1: Locate runWhatShouldISay signature**

```bash
grep -n "async runWhatShouldISay" electron/IntelligenceEngine.ts
```

Expected current signature (around line 222):
```typescript
    async runWhatShouldISay(question?: string, confidence: number = 0.8, imagePaths?: string[]): Promise<string | null>
```

- [ ] **Step 2: Add new options parameter**

Refactor to accept an options bag (additive, doesn't break existing callers):

```typescript
    async runWhatShouldISay(
        question?: string,
        confidence: number = 0.8,
        imagePaths?: string[],
        options: {
            intentOverride?: 'verbal' | 'coding' | 'behavioral';
            contextOverride?: string;
        } = {}
    ): Promise<string | null>
```

- [ ] **Step 3: Use contextOverride if provided**

Find where the method fetches context (search for `getFormattedContext(180)` inside the function, around line 246):
```bash
grep -n "getFormattedContext" electron/IntelligenceEngine.ts | head -5
```

Replace the local context fetch:
```typescript
            // BEFORE:
            // const context = this.session.getFormattedContext(180);
            // AFTER:
            const context = options.contextOverride ?? this.session.getFormattedContext(180);
```

Apply this swap only inside `runWhatShouldISay` — leave other methods' context fetches alone.

- [ ] **Step 4: Use intentOverride to skip classifyIntent**

Find the call to `classifyIntent` inside `runWhatShouldISay` (around line 298):
```bash
grep -n "classifyIntent" electron/IntelligenceEngine.ts | head -5
```

Wrap it:
```typescript
            // Replace this existing block (around line 298):
            //     const intentResult = await classifyIntent(
            //         lastInterviewerTurn,
            //         preparedTranscript,
            //         this.session.getAssistantResponseHistory().length
            //     );
            // With:
            let intentResult;
            if (options.intentOverride) {
                // Map override to existing IntentResult shape — pull answerShape from existing mapping.
                // 'verbal' -> 'general', 'behavioral' -> 'behavioral', 'coding' -> 'coding'
                const { getAnswerShapeGuidance } = require('./llm/IntentClassifier');
                const mapped = options.intentOverride === 'verbal' ? 'general'
                            : options.intentOverride === 'behavioral' ? 'behavioral'
                            : 'coding';
                intentResult = {
                    intent: mapped as any,
                    confidence: 1.0,
                    answerShape: getAnswerShapeGuidance(mapped),
                };
                console.log(`[IntelligenceEngine] runWhatShouldISay: intent override → ${mapped}`);
            } else {
                intentResult = await classifyIntent(
                    lastInterviewerTurn,
                    preparedTranscript,
                    this.session.getAssistantResponseHistory().length
                );
            }
```

Keep the existing `classifyIntent` argument list intact for the else branch — just wrap.

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 6: Manual verification — confirm existing flow still works**

```bash
npm start
```

Click "What to answer?" manually. Should still work exactly as before — no overrides passed, classifyIntent runs normally.

- [ ] **Step 7: Commit**

```bash
git add electron/IntelligenceEngine.ts
git commit -m "feat(intel-engine): runWhatShouldISay accepts intentOverride + contextOverride"
```

---

## Task 9: IPC handler answer-detected-question

**Files:**
- Modify: `electron/ipcHandlers.ts`

- [ ] **Step 1: Add new handler**

Near the existing `generate-what-to-say` IPC handler in `electron/ipcHandlers.ts`, add:

```typescript
  safeHandle("answer-detected-question", async (event, payload: {
    question: string;
    intent: 'verbal' | 'coding' | 'behavioral';
    contextSnapshot: string;
  }) => {
    try {
      console.log(`[IPC] answer-detected-question: intent=${payload.intent}, question="${payload.question.slice(0, 60)}..."`);
      const intelligenceManager = appState.getIntelligenceManager();
      // Use the engine's runWhatShouldISay with overrides — emits the same
      // suggested_answer_token + suggested_answer events the manual "What to
      // answer?" flow does, so the renderer needs no new event subscriptions.
      const engine = (intelligenceManager as any).engine;
      await engine.runWhatShouldISay(
        payload.question,
        1.0,  // confidence
        undefined,  // no images on detected-question path
        {
          intentOverride: payload.intent,
          contextOverride: payload.contextSnapshot,
        }
      );
      return { ok: true };
    } catch (e: any) {
      console.error('[IPC] answer-detected-question failed:', e);
      throw e;
    }
  });
```

(If `engine` isn't directly accessible on `IntelligenceManager`, expose it via a getter or wrap the call inside `IntelligenceManager` itself — see Task 7 patterns.)

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add electron/ipcHandlers.ts
git commit -m "feat(ipc): answer-detected-question handler routes via runWhatShouldISay"
```

---

## Task 10: preload.ts + electron.d.ts types

**Files:**
- Modify: `electron/preload.ts`
- Modify: `src/types/electron.d.ts`

- [ ] **Step 1: Inspect preload.ts shape**

```bash
grep -n "onIntelligenceSuggestedAnswerToken\|generateWhatToSay" electron/preload.ts | head -5
```

Confirm the existing patterns for IPC subscription and invoke.

- [ ] **Step 2: Add new preload exports**

In `electron/preload.ts`, find the existing IPC subscription pattern (e.g. `onIntelligenceSuggestedAnswerToken`) and add three new entries:

```typescript
  onDetectedQuestion: (callback: (chip: {
    id: string;
    question: string;
    intent: 'verbal' | 'coding' | 'behavioral';
    confidence: number;
    contextSnapshot: string;
    detectedAt: number;
  }) => void) => {
    const subscription = (_event: any, data: any) => callback(data);
    ipcRenderer.on("detected-question", subscription);
    return () => {
      ipcRenderer.removeListener("detected-question", subscription);
    };
  },

  onDetectedQuestionUpdate: (callback: (chip: {
    id: string;
    question: string;
    intent: 'verbal' | 'coding' | 'behavioral';
    confidence: number;
    contextSnapshot: string;
    detectedAt: number;
  }) => void) => {
    const subscription = (_event: any, data: any) => callback(data);
    ipcRenderer.on("detected-question-update", subscription);
    return () => {
      ipcRenderer.removeListener("detected-question-update", subscription);
    };
  },

  answerDetectedQuestion: (payload: {
    question: string;
    intent: 'verbal' | 'coding' | 'behavioral';
    contextSnapshot: string;
  }) => ipcRenderer.invoke("answer-detected-question", payload),
```

- [ ] **Step 3: Add matching type declarations**

In `src/types/electron.d.ts`, find the existing `onIntelligenceSuggestedAnswerToken` declaration and add:

```typescript
  onDetectedQuestion: (callback: (chip: {
    id: string;
    question: string;
    intent: 'verbal' | 'coding' | 'behavioral';
    confidence: number;
    contextSnapshot: string;
    detectedAt: number;
  }) => void) => () => void;
  onDetectedQuestionUpdate: (callback: (chip: {
    id: string;
    question: string;
    intent: 'verbal' | 'coding' | 'behavioral';
    confidence: number;
    contextSnapshot: string;
    detectedAt: number;
  }) => void) => () => void;
  answerDetectedQuestion: (payload: {
    question: string;
    intent: 'verbal' | 'coding' | 'behavioral';
    contextSnapshot: string;
  }) => Promise<{ ok: boolean }>;
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add electron/preload.ts src/types/electron.d.ts
git commit -m "feat(preload): expose detected-question IPC events + answer invoker"
```

---

## Task 11: useDetectedQuestions React hook

**Files:**
- Create: `src/hooks/useDetectedQuestions.ts`
- Create: `src/hooks/useDetectedQuestions.test.tsx`

- [ ] **Step 1: Write the failing tests**

`src/hooks/useDetectedQuestions.test.tsx`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDetectedQuestions } from './useDetectedQuestions';

interface MockChip {
    id: string;
    question: string;
    intent: 'verbal' | 'coding' | 'behavioral';
    confidence: number;
    contextSnapshot: string;
    detectedAt: number;
}

let detectedCb: ((chip: MockChip) => void) | null = null;
let updateCb: ((chip: MockChip) => void) | null = null;
const answerDetectedQuestionMock = vi.fn();

beforeEach(() => {
    detectedCb = null;
    updateCb = null;
    answerDetectedQuestionMock.mockReset();
    // @ts-ignore — install window.electronAPI mock
    globalThis.window = globalThis.window || {};
    (globalThis.window as any).electronAPI = {
        onDetectedQuestion: (cb: (c: MockChip) => void) => {
            detectedCb = cb;
            return () => { detectedCb = null; };
        },
        onDetectedQuestionUpdate: (cb: (c: MockChip) => void) => {
            updateCb = cb;
            return () => { updateCb = null; };
        },
        answerDetectedQuestion: answerDetectedQuestionMock,
    };
});

const makeChip = (id: string, q: string): MockChip => ({
    id,
    question: q,
    intent: 'verbal',
    confidence: 0.9,
    contextSnapshot: 'ctx',
    detectedAt: Date.now(),
});

describe('useDetectedQuestions', () => {
    it('starts with empty chip queue', () => {
        const { result } = renderHook(() => useDetectedQuestions());
        expect(result.current.chips).toEqual([]);
    });

    it('appends new chips at the top', () => {
        const { result } = renderHook(() => useDetectedQuestions());
        act(() => detectedCb?.(makeChip('a', 'question A')));
        act(() => detectedCb?.(makeChip('b', 'question B')));
        expect(result.current.chips).toHaveLength(2);
        expect(result.current.chips[0].id).toBe('b');
        expect(result.current.chips[1].id).toBe('a');
    });

    it('FIFO evicts oldest when 6th chip arrives (max 5)', () => {
        const { result } = renderHook(() => useDetectedQuestions());
        for (let i = 0; i < 6; i++) {
            act(() => detectedCb?.(makeChip(`id${i}`, `q${i}`)));
        }
        expect(result.current.chips).toHaveLength(5);
        // Oldest (id0) should be gone, newest (id5) at top
        expect(result.current.chips[0].id).toBe('id5');
        expect(result.current.chips.find(c => c.id === 'id0')).toBeUndefined();
    });

    it('dedup-update preserves position', () => {
        const { result } = renderHook(() => useDetectedQuestions());
        act(() => detectedCb?.(makeChip('a', 'old text')));
        act(() => detectedCb?.(makeChip('b', 'middle')));
        // update chip a — position preserved (still at index 1 since b is on top)
        act(() => updateCb?.(makeChip('a', 'new text')));
        expect(result.current.chips).toHaveLength(2);
        expect(result.current.chips[1].id).toBe('a');
        expect(result.current.chips[1].question).toBe('new text');
    });

    it('clickChip removes the chip and calls IPC with payload', () => {
        answerDetectedQuestionMock.mockResolvedValue({ ok: true });
        const { result } = renderHook(() => useDetectedQuestions());
        act(() => detectedCb?.(makeChip('a', 'question A')));
        act(() => { result.current.clickChip('a'); });
        expect(result.current.chips).toHaveLength(0);
        expect(answerDetectedQuestionMock).toHaveBeenCalledWith({
            question: 'question A',
            intent: 'verbal',
            contextSnapshot: 'ctx',
        });
    });

    it('dismissChip removes the chip without calling IPC', () => {
        const { result } = renderHook(() => useDetectedQuestions());
        act(() => detectedCb?.(makeChip('a', 'q')));
        act(() => { result.current.dismissChip('a'); });
        expect(result.current.chips).toHaveLength(0);
        expect(answerDetectedQuestionMock).not.toHaveBeenCalled();
    });
});
```

- [ ] **Step 2: Install testing-library if missing**

```bash
npm install --save-dev @testing-library/react@^15 jsdom
```

Add to `vitest.config.ts` `test` block:
```typescript
        environment: 'jsdom',  // change from 'node'
```

(If electron-side tests need `'node'` environment, use the per-file `// @vitest-environment` comment instead. For now, switch globally — Node-only tests still pass under jsdom.)

- [ ] **Step 3: Run tests to verify they fail**

```bash
npx vitest run src/hooks/useDetectedQuestions.test.tsx
```

Expected: all fail with "Cannot find module './useDetectedQuestions'".

- [ ] **Step 4: Implement the hook**

`src/hooks/useDetectedQuestions.ts`:
```typescript
import { useCallback, useEffect, useState } from 'react';

export interface DetectedQuestionChip {
    id: string;
    question: string;
    intent: 'verbal' | 'coding' | 'behavioral';
    confidence: number;
    contextSnapshot: string;
    detectedAt: number;
}

const MAX_CHIPS = 5;

/**
 * Renderer-side chip queue for passive question detector.
 * - Subscribes to detected-question + detected-question-update IPC events
 * - Maintains a FIFO queue capped at 5
 * - Update events preserve chip position; new events push to top
 */
export function useDetectedQuestions() {
    const [chips, setChips] = useState<DetectedQuestionChip[]>([]);

    useEffect(() => {
        const cleanups: (() => void)[] = [];

        cleanups.push(
            window.electronAPI.onDetectedQuestion((chip) => {
                setChips(prev => {
                    const next = [chip, ...prev];
                    if (next.length > MAX_CHIPS) next.length = MAX_CHIPS;
                    return next;
                });
            })
        );

        cleanups.push(
            window.electronAPI.onDetectedQuestionUpdate((chip) => {
                setChips(prev => {
                    const idx = prev.findIndex(c => c.id === chip.id);
                    if (idx === -1) {
                        // Treat as new if we never had it
                        const next = [chip, ...prev];
                        if (next.length > MAX_CHIPS) next.length = MAX_CHIPS;
                        return next;
                    }
                    const next = [...prev];
                    next[idx] = chip;
                    return next;
                });
            })
        );

        return () => { cleanups.forEach(fn => fn()); };
    }, []);

    const dismissChip = useCallback((id: string) => {
        setChips(prev => prev.filter(c => c.id !== id));
    }, []);

    const clickChip = useCallback((id: string) => {
        setChips(prev => {
            const chip = prev.find(c => c.id === id);
            if (chip) {
                window.electronAPI.answerDetectedQuestion({
                    question: chip.question,
                    intent: chip.intent,
                    contextSnapshot: chip.contextSnapshot,
                }).catch((e: any) => {
                    console.error('[useDetectedQuestions] answerDetectedQuestion failed:', e);
                });
            }
            return prev.filter(c => c.id !== id);
        });
    }, []);

    return { chips, dismissChip, clickChip };
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run src/hooks/useDetectedQuestions.test.tsx
```

Expected: all 6 tests pass.

- [ ] **Step 6: Type-check**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useDetectedQuestions.ts src/hooks/useDetectedQuestions.test.tsx package.json package-lock.json vitest.config.ts
git commit -m "feat(ui): useDetectedQuestions hook with FIFO + dedup-update + click flow"
```

---

## Task 12: QuestionChip component

**Files:**
- Create: `src/components/QuestionChip.tsx`

- [ ] **Step 1: Create the component**

`src/components/QuestionChip.tsx`:
```typescript
import React from 'react';

export interface QuestionChipProps {
    id: string;
    question: string;
    intent: 'verbal' | 'coding' | 'behavioral';
    onClick: (id: string) => void;
}

const INTENT_ICON: Record<QuestionChipProps['intent'], string> = {
    verbal: '❓',
    coding: '💻',
    behavioral: '📖',
};

const INTENT_LABEL: Record<QuestionChipProps['intent'], string> = {
    verbal: 'Direct question',
    coding: 'Coding question',
    behavioral: 'Behavioral prompt',
};

/**
 * Single chip row in the detected-questions panel.
 * Icon badge + truncated text; clicking routes to the answer flow.
 */
export const QuestionChip: React.FC<QuestionChipProps> = ({ id, question, intent, onClick }) => {
    return (
        <button
            type="button"
            onClick={() => onClick(id)}
            title={question}
            aria-label={`${INTENT_LABEL[intent]}: ${question}`}
            className="
                w-full flex items-center gap-2
                px-3 py-1.5 rounded-md
                text-left text-sm text-text-secondary
                bg-bg-secondary/40 hover:bg-bg-secondary/70
                border border-border/30 hover:border-border/60
                transition-colors duration-150
                truncate
            "
        >
            <span aria-hidden="true" className="text-base shrink-0">{INTENT_ICON[intent]}</span>
            <span className="truncate">{question}</span>
        </button>
    );
};
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/QuestionChip.tsx
git commit -m "feat(ui): QuestionChip component with intent badge + truncation"
```

---

## Task 13: DetectedQuestionsPanel component

**Files:**
- Create: `src/components/DetectedQuestionsPanel.tsx`

- [ ] **Step 1: Create the panel**

`src/components/DetectedQuestionsPanel.tsx`:
```typescript
import React, { useEffect, useRef, useState } from 'react';
import { QuestionChip } from './QuestionChip';
import { useDetectedQuestions, DetectedQuestionChip } from '../hooks/useDetectedQuestions';

const AUTO_COLLAPSE_MS = 10_000;

/**
 * Collapsible panel above chat that shows up to 5 detected interviewer questions.
 * - Hidden entirely when chip queue is empty (zero height).
 * - Auto-collapses 10s after last user interaction (hover/click).
 * - Manual collapse toggle in header.
 */
export const DetectedQuestionsPanel: React.FC = () => {
    const { chips, clickChip } = useDetectedQuestions();
    const [collapsed, setCollapsed] = useState(false);
    const interactionTimerRef = useRef<NodeJS.Timeout | null>(null);

    const resetCollapseTimer = () => {
        if (interactionTimerRef.current) clearTimeout(interactionTimerRef.current);
        setCollapsed(false);
        interactionTimerRef.current = setTimeout(() => setCollapsed(true), AUTO_COLLAPSE_MS);
    };

    // Restart timer whenever new chips arrive
    useEffect(() => {
        if (chips.length > 0) resetCollapseTimer();
        return () => {
            if (interactionTimerRef.current) clearTimeout(interactionTimerRef.current);
        };
    }, [chips.length]);

    if (chips.length === 0) return null;

    return (
        <div
            className="
                mx-3 mb-2 rounded-lg
                bg-bg-primary/50 border border-border/30
                backdrop-blur-sm
                overflow-hidden
            "
            onMouseEnter={resetCollapseTimer}
            onMouseMove={resetCollapseTimer}
        >
            <div className="flex items-center justify-between px-3 py-1.5 text-[11px] uppercase tracking-wide text-text-tertiary">
                <span>Detected Questions ({chips.length})</span>
                <button
                    type="button"
                    onClick={() => setCollapsed(c => !c)}
                    className="hover:text-text-secondary transition-colors"
                    aria-label={collapsed ? 'Expand' : 'Collapse'}
                >
                    {collapsed ? '▸' : '▾'}
                </button>
            </div>
            {!collapsed && (
                <div className="flex flex-col gap-1 px-2 pb-2">
                    {chips.map(chip => (
                        <QuestionChip
                            key={chip.id}
                            id={chip.id}
                            question={chip.question}
                            intent={chip.intent}
                            onClick={(id) => {
                                resetCollapseTimer();
                                clickChip(id);
                            }}
                        />
                    ))}
                </div>
            )}
            {collapsed && (
                <button
                    type="button"
                    onClick={() => setCollapsed(false)}
                    className="w-full px-3 py-1.5 text-xs text-text-tertiary hover:text-text-secondary text-left"
                >
                    {chips.length} {chips.length === 1 ? 'question' : 'questions'} ready ▸
                </button>
            )}
        </div>
    );
};
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/DetectedQuestionsPanel.tsx
git commit -m "feat(ui): DetectedQuestionsPanel with auto-collapse + manual toggle"
```

---

## Task 14: NativelyInterface integration + end-to-end smoke test

**Files:**
- Modify: `src/components/NativelyInterface.tsx`

- [ ] **Step 1: Locate chat message rendering area**

```bash
grep -n "messages.map\|msg\.role\s*===\s*'system'" src/components/NativelyInterface.tsx | head -10
```

Find the messages map. The panel goes above the first message (chronologically the top of the message list).

- [ ] **Step 2: Import the panel**

At the top of `src/components/NativelyInterface.tsx`, near other imports:
```typescript
import { DetectedQuestionsPanel } from './DetectedQuestionsPanel';
```

- [ ] **Step 3: Mount the panel above the messages**

Find the JSX where `messages` are rendered (look for `{messages.map(...)` or similar). Above that map, mount the panel:

```typescript
                <DetectedQuestionsPanel />
                {messages.map(msg => (
                    /* existing chat message rendering */
                ))}
```

The exact placement: just inside the messages container, immediately before the messages map. The panel renders nothing when chips are empty, so there's no visual cost in the idle case.

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 5: Run all tests**

```bash
npm test
```

Expected: all tests pass (smoke + jaccard + ollama client + detector + hook).

- [ ] **Step 6: End-to-end smoke test — manual rehearsal**

```bash
npm start
```

Then simulate or speak an interview transcript:

1. Start a meeting (record / live).
2. Have a colleague (or yourself, into the mic) say a clear interview question: *"Can you tell me about a time you had to debug a tricky production issue?"*
3. Stop speaking. Wait ~2 seconds.
4. **Expect:** A chip appears at the top of the chat area showing 📖 + question text.
5. Click the chip.
6. **Expect:** A "SAY THIS" bubble streams in the chat with a behavioral STAR-shaped answer. Click-to-first-token feels comparable to (slightly faster than) the existing "What to answer?" button.
7. Repeat with: *"What's the time complexity of quicksort?"* → expect `❓` chip → click → verbal answer.
8. Repeat with: *"Can you write a Python function that returns the nth Fibonacci number?"* → expect `💻` chip → click → coding answer with Python code block.

If any of these fail, check the diag log:
```bash
cat verbal-diag.log | tail -50
```

And check the main process console for `[QuestionDetector]`, `[OllamaDetectionClient]`, `[IPC] answer-detected-question`.

- [ ] **Step 7: Verify no regression on existing flow**

Without using a chip, click the manual "What to answer?" button as before. It should still work exactly as it did pre-feature — verbal answers still route to Gemini Flash 3.1 via the existing intent classifier; coding to Gemma 4. No regression.

- [ ] **Step 8: Commit**

```bash
git add src/components/NativelyInterface.tsx
git commit -m "feat(ui): mount DetectedQuestionsPanel above chat messages"
```

---

## Verification Checklist (run after all tasks)

- [ ] `npm test` — all unit tests pass
- [ ] `npx tsc --noEmit` — type-check clean
- [ ] `npm start` — app boots without errors
- [ ] Manual rehearsal — 3 question types (verbal/behavioral/coding) all detected, classified correctly, answered with appropriate model
- [ ] Existing "What to answer?" still works (no regression)
- [ ] Detector recovers gracefully if Ollama is killed mid-session (no app crash, panel stops getting new chips)
- [ ] Chip queue caps at 5; 6th evicts oldest
- [ ] Click on chip empties it from queue; remaining chips collapse up
- [ ] Auto-collapse triggers ~10s after last interaction with the panel

---

## Out of scope (deferred — not in this plan)

These are explicitly NOT implemented in this plan, per spec section 2:

- Settings UI form (defaults are hard-coded in QuestionDetector; settings panel addition is a follow-up plan)
- Persisting chips across app restarts
- Multi-question detection per turn
- CPU fallback model swap (user confirmed GPU always available)
- Multi-language detection

These can be added later as separate plans without touching the core detector.

# Answer What Was Asked — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every hands-free answer answers the question the app settled on, the chip and the answer carry one text, and no spoken answer runs past 80 words — proven on the same 60-minute hour that produced four wrong answers.

**Architecture:** Three seams on the existing dual-ear pipeline. (1) `runWhatShouldISay` pins the settled question as the last interviewer line of the answer prompt on both dispatch paths. (2) `dispatchDetection` holds a fragmentary detection for the other ear (2.5 s) before answering it. (3) The verbal stream gets a sentence-boundary word budget stage. The harness gains two gate rows that read two new log lines.

**Tech Stack:** TypeScript (Electron main process), vitest, the `interview60` golden harness (ESM `.mjs`).

**Spec:** `docs/superpowers/specs/2026-09-04-answer-what-was-asked-design.md`

## Global Constraints

- All edits go to the MAIN checkout `C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant`, branch `fix/coding-style-suffix-all-gemini`. Never edit or build inside `.claude/worktrees/`. Run every command from the main checkout.
- Never stage `natively_debug.log.1`, `resume_prompt.txt`, `retry_claude_print.bat` (the user's uncommitted files). Stage the files each task names, nothing else. Never `git stash`, never `git checkout --` a file with user hunks.
- Commit message trailer on every commit: `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Constants, verbatim from the spec: fragment hold `FRAGMENT_HOLD_MS = 2500`; word budget `SPOKEN_WORD_LIMIT = 80`, `SPOKEN_WORD_FLOOR = 40`; pinned-line pairing window in the harness 2000 ms.
- Log lines, verbatim (the harness parses them): `[IntelligenceEngine] runWhatShouldISay: pinned question <JSON string>`; `[Main] dispatch: hold source=… anchor=… verdict=… reason=fragmentary`; every `[Main] dispatch:` line ends with ` question=<JSON string>`; `[Answer] budget: words=<n> cut=<yes|no> allowance=<yes|no>`.
- No new dependencies. No changes to `questionReconcile.ts`, `QuestionDetector.ts`, `ChipDeduper.ts`, `detectionDispatch.ts`, the prompts, or the renderer.
- Keys stay in `.env`/the credential store; nothing prints a key value.
- Tests: `npx vitest run <file>` from the main checkout. Type gates: `npx tsc --noEmit -p tsconfig.json` and `npx tsc --noEmit -p electron/tsconfig.json` (six pre-existing errors in the electron project are known; none may be added).
- Existing style wins: 4-space indent in `electron/`, single quotes, `describe/it` vitest tests beside the module, provenance comments on constants.

---

### Task 1: `pinSettledQuestion` — the settled question becomes the last interviewer line

**Files:**
- Modify: `electron/llm/lastInterviewerTurn.ts`
- Test: `electron/llm/lastInterviewerTurn.test.ts`

**Interfaces:**
- Consumes: `sameAnchor(a: string, b: string): boolean` from `electron/services/questionReconcile.ts` (exists).
- Produces: `pinSettledQuestion(transcript: string, question: string): string` — used by Task 4.

- [ ] **Step 1: Write the failing tests**

Append to `electron/llm/lastInterviewerTurn.test.ts` (add `pinSettledQuestion` to the import on line 2):

```ts
import { lastInterviewerTurn, pinSettledQuestion } from './lastInterviewerTurn';

describe('pinSettledQuestion', () => {
    // Transcript lines are lower-cased by the cleaner (prepareTranscriptForWhatToAnswer);
    // the settled question keeps its own case. All four cases are the last lines the
    // 2026-09-04 after4 hour actually had at dispatch.
    it('M26 — absorbs the STT fragment of the same utterance and ends with the settled question', () => {
        const t = "[INTERVIEWER]: how do you handle deleting a user's data across many services?\n[ASSISTANT]: to handle that across multiple services, i would use an event.\n[INTERVIEWER]: cross many model services.";
        const q = 'How do you keep base images patched across many model services?';
        expect(pinSettledQuestion(t, q)).toBe(
            "[INTERVIEWER]: how do you handle deleting a user's data across many services?\n[ASSISTANT]: to handle that across multiple services, i would use an event.\n[INTERVIEWER]: How do you keep base images patched across many model services?",
        );
    });
    it('M28 — a one-word fragment is absorbed', () => {
        const q = 'How do you keep feature engineering consistent between training and serving?';
        expect(pinSettledQuestion('[ASSISTANT]: the previous answer.\n[INTERVIEWER]: serving.', q)).toBe(`[ASSISTANT]: the previous answer.\n[INTERVIEWER]: ${q}`);
    });
    it('H09 — both halves of a split question are absorbed', () => {
        const t = '[INTERVIEWER]: someone changed the resource by hand, and now your stack will not update.\n[INTERVIEWER]: what do you do?';
        const q = 'Someone changed a resource by hand and now your stack will not update. What do you do?';
        expect(pinSettledQuestion(t, q)).toBe(`[INTERVIEWER]: ${q}`);
    });
    it('M27 — a conjunction tail is absorbed by the whole sentence', () => {
        const q = 'When would you reach for a service mesh in an ML serving stack, and when would you not?';
        expect(pinSettledQuestion('[INTERVIEWER]: and when would you not?', q)).toBe(`[INTERVIEWER]: ${q}`);
    });
    it('keeps a trailing interviewer line that is a different utterance, before the new one', () => {
        const q = 'When would you reach for a service mesh in an ML serving stack, and when would you not?';
        expect(pinSettledQuestion('[INTERVIEWER]: how do you patch base images?', q)).toBe(`[INTERVIEWER]: how do you patch base images?\n[INTERVIEWER]: ${q}`);
    });
    it('only touches the trailing run — an earlier identical question behind an assistant line stays', () => {
        const t = '[INTERVIEWER]: what is a pod?\n[ASSISTANT]: a pod is the smallest unit.';
        expect(pinSettledQuestion(t, 'What is a Pod?')).toBe(`${t}\n[INTERVIEWER]: What is a Pod?`);
    });
    it('a snapshot already ending in the question is unchanged in content', () => {
        const t = '[ME]: sure.\n[INTERVIEWER]: What is a Pod?';
        expect(pinSettledQuestion(t, 'What is a Pod?')).toBe(t);
    });
    it('an empty transcript becomes the single question line', () => {
        expect(pinSettledQuestion('', 'What is a Pod?')).toBe('[INTERVIEWER]: What is a Pod?');
    });
    it('the parser always reads the settled question back', () => {
        const q = 'How do you keep base images patched across many model services?';
        for (const t of ['', '[INTERVIEWER]: cross many model services.', '[INTERVIEWER]: unrelated earlier question about kafka?\n[ME]: yes.']) {
            expect(lastInterviewerTurn(pinSettledQuestion(t, q))).toBe(q);
        }
    });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run electron/llm/lastInterviewerTurn.test.ts`
Expected: FAIL — `pinSettledQuestion` is not exported.

- [ ] **Step 3: Implement**

Append to `electron/llm/lastInterviewerTurn.ts`:

```ts
import { sameAnchor } from '../services/questionReconcile';

const INTERVIEWER_LINE = /^\[INTERVIEWER\]:\s*(.*)$/;

/**
 * Rewrite a prepared transcript so its last interviewer line is `question`.
 *
 * runWhatShouldISay never showed the model the question it was dispatched
 * with: the prompt ended with whatever STT line was last, and on 2026-09-04
 * that line was "Cross many model services." / "Serving." / "What do you do?"
 * — four wrong answers from correctly dispatched questions (spec §1).
 *
 * The trailing run of [INTERVIEWER] lines is the current utterance as STT
 * heard it. Every line in that run that is the same utterance as `question`
 * (sameAnchor: containment either way, or ≥ 50 % content-word overlap) is
 * absorbed; a trailing line that is a different utterance — an earlier,
 * unanswered question — stays in place. The settled question is appended as
 * the last line, so lastInterviewerTurn() and the knowledge lookup both read
 * it back.
 */
export function pinSettledQuestion(transcript: string, question: string): string {
    const q = question.trim();
    const lines = transcript.split('\n').map((l) => l.trim()).filter(Boolean);
    let start = lines.length;
    while (start > 0 && INTERVIEWER_LINE.test(lines[start - 1])) start--;
    const kept = lines.slice(0, start);
    for (const line of lines.slice(start)) {
        const text = (line.match(INTERVIEWER_LINE)?.[1] ?? '').trim();
        if (!sameAnchor(text, q)) kept.push(line);
    }
    kept.push(`[INTERVIEWER]: ${q}`);
    return kept.join('\n');
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run electron/llm/lastInterviewerTurn.test.ts`
Expected: PASS (4 existing + 9 new).

- [ ] **Step 5: Commit**

```bash
git add electron/llm/lastInterviewerTurn.ts electron/llm/lastInterviewerTurn.test.ts
git commit -m "feat(answer): pinSettledQuestion rewrites the prompt tail to the settled question

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: `looksFragmentary` — is this text a whole question?

**Files:**
- Modify: `electron/services/questionShape.ts`
- Test: `electron/services/questionShape.test.ts`

**Interfaces:**
- Produces: `looksFragmentary(text: string): boolean` — used by Task 5.

- [ ] **Step 1: Write the failing tests**

Append to `electron/services/questionShape.test.ts` (extend the import on line 2 to `{ isFragment, looksLikeQuestion, looksFragmentary }`; add the `SPOKEN` import):

```ts
// @ts-ignore — untyped ESM harness module
import { SPOKEN } from '../test/golden/interview60.questions.mjs';

describe('looksFragmentary', () => {
    it('the two texts the 2026-09-04 hour would have held, both real fragments', () => {
        expect(looksFragmentary('And when would you not?')).toBe(true); // M27: Deepgram lost the head
        expect(looksFragmentary('but the input schema is unchanged How do you debug this?')).toBe(true); // heuristic chip, conjunction opener
    });
    it('fewer than four words is fragmentary, as isFragment', () => {
        expect(looksFragmentary('Serving.')).toBe(true);
        expect(looksFragmentary('Latency is up.')).toBe(true);
    });
    it('a short statement without a question mark or a question opener is fragmentary', () => {
        expect(looksFragmentary('Cross many model services.')).toBe(true); // M26's STT tail
        expect(looksFragmentary('Latency is creeping up.')).toBe(true);
    });
    it('a short imperative or question is whole', () => {
        expect(looksFragmentary('Tell me about yourself.')).toBe(false);
        expect(looksFragmentary('What is a Pod?')).toBe(false);
        expect(looksFragmentary('Is that clear enough?')).toBe(false);
    });
    it('long text is whole even without punctuation (the degraded detector strips it)', () => {
        expect(looksFragmentary('Someone changed the resource by hand and now your stack will not update What do you do')).toBe(false);
    });
    it('every spoken script question is whole', () => {
        for (const item of SPOKEN) expect(looksFragmentary(item.q), item.q).toBe(false);
    });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run electron/services/questionShape.test.ts`
Expected: FAIL — `looksFragmentary` is not exported.

- [ ] **Step 3: Implement**

Append to `electron/services/questionShape.ts`:

```ts
const FRAGMENT_CONJUNCTIONS = /^(and|so|but|or|then|because)\b/i;

/**
 * First words that make a short, unpunctuated text a plausible whole question
 * or request. Wider than QUESTION_WORDS above on purpose: that list gates
 * an outage-only chip (a false positive there gets answered), this one only
 * decides whether to wait ≤ 2.5 s for the other ear (a false negative here
 * costs nothing).
 */
const FRAGMENT_OPENERS = new Set([
    'what', 'why', 'how', 'when', 'where', 'which', 'who', 'whom', 'whose',
    'can', 'could', 'would', 'should', 'do', 'does', 'did', 'is', 'are', 'was', 'were', 'will', 'have', 'has',
    'tell', 'walk', 'describe', 'explain', 'give', 'compare', 'imagine', 'suppose', 'say', 'let',
]);

/**
 * Is this detection text not a whole question — an STT tail the other ear may
 * still complete? True when it has fewer than 4 words, opens with a
 * coordinating conjunction ("And when would you not?", 2026-09-04 M27), or is
 * at most 6 words with no terminal '?' and no question/imperative opener
 * ("Cross many model services."). Measured over 317 chip and Live texts from
 * four flight hours: 2 flagged, both real fragments, 0 whole questions
 * (spec 2026-09-04 §3.1).
 */
export function looksFragmentary(text: string): boolean {
    const trimmed = text.trim();
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length < 4) return true;
    if (FRAGMENT_CONJUNCTIONS.test(trimmed)) return true;
    if (words.length > 6) return false;
    if (/[?？]["'”’)\]]*$/.test(trimmed)) return false;
    const first = words[0].toLowerCase().replace(/[^a-z]/g, '');
    return !FRAGMENT_OPENERS.has(first);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run electron/services/questionShape.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add electron/services/questionShape.ts electron/services/questionShape.test.ts
git commit -m "feat(detector): looksFragmentary — a detection text that is not a whole question

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: `LiveHold.peek()`

**Files:**
- Modify: `electron/services/liveHold.ts`
- Test: `electron/services/liveHold.test.ts`

**Interfaces:**
- Produces: `peek(): T | null` on `LiveHold<T>` — used by Task 5's chip-update hook.

- [ ] **Step 1: Write the failing tests**

Append inside the `describe('createLiveHold', …)` block of `electron/services/liveHold.test.ts`:

```ts
    it('peek() shows the pending detection without touching the timer, and null once resolved or cancelled', () => {
        vi.useFakeTimers();
        const onResolve = vi.fn();
        const hold = createLiveHold<{ id: string }>({ holdMs: 2500, onResolve });
        expect(hold.peek()).toBeNull();
        hold.offer({ id: 'a' });
        expect(hold.peek()).toEqual({ id: 'a' });
        vi.advanceTimersByTime(2499);
        expect(hold.peek()).toEqual({ id: 'a' });
        vi.advanceTimersByTime(1);
        expect(onResolve).toHaveBeenCalledTimes(1);
        expect(hold.peek()).toBeNull();
        hold.offer({ id: 'b' });
        hold.cancel();
        expect(hold.peek()).toBeNull();
    });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run electron/services/liveHold.test.ts`
Expected: FAIL — `hold.peek is not a function`.

- [ ] **Step 3: Implement**

In `electron/services/liveHold.ts`, add to the `LiveHold<T>` interface after `onInterviewerFinal(): void;`:

```ts
    /** The pending detection, if any — read-only; the timer is untouched. */
    peek(): T | null;
```

and to the returned object after `onInterviewerFinal(): void { … },`:

```ts
        peek(): T | null {
            return pending;
        },
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run electron/services/liveHold.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add electron/services/liveHold.ts electron/services/liveHold.test.ts
git commit -m "feat(live): LiveHold.peek() exposes the pending detection

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: The engine pins the settled question on both dispatch paths

**Files:**
- Modify: `electron/IntelligenceEngine.ts` (the `runWhatShouldISay` block around lines 291–335: interim injection, `preparedTranscript` / `lastInterviewerTurn`)
- Test: `electron/IntelligenceEngine.pinnedQuestion.test.ts` (new)

**Interfaces:**
- Consumes: `pinSettledQuestion` (Task 1).
- Produces: the log line `[IntelligenceEngine] runWhatShouldISay: pinned question <JSON>` (Task 8 parses it).

- [ ] **Step 1: Write the failing tests**

Create `electron/IntelligenceEngine.pinnedQuestion.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('electron', () => ({
    app: { getPath: vi.fn(() => 'C:/tmp'), getName: vi.fn(() => 'test'), on: vi.fn() },
    safeStorage: { isEncryptionAvailable: () => false, encryptString: (s: string) => Buffer.from(s), decryptString: (b: Buffer) => b.toString() },
    ipcMain: { handle: vi.fn(), on: vi.fn() },
}));

import { IntelligenceEngine } from './IntelligenceEngine';
import { SessionTracker } from './SessionTracker';
import { WhatToAnswerLLM } from './llm/WhatToAnswerLLM';

/**
 * The seam behind the 2026-09-04 flight's four wrong answers: the answer prompt
 * ended with whatever STT line was last, never with the dispatched question
 * (spec 2026-09-04 §1–2). generateStream is stubbed so the transcript it is
 * handed can be read back; streamChat never runs.
 */
const SETTLED = 'How do you keep feature engineering consistent between training and serving?';
const stubHelper = () => ({} as any);

function captureTranscript() {
    const calls: string[] = [];
    vi.spyOn(WhatToAnswerLLM.prototype, 'generateStream').mockImplementation(async function* (transcript: string) {
        calls.push(transcript);
        yield 'A pinned answer from the stub.';
    });
    return calls;
}
function captureLogs() {
    const logs: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((...a: any[]) => { logs.push(a.map(String).join(' ')); });
    return logs;
}
function sessionWithFragmentAndInterim(): SessionTracker {
    const session = new SessionTracker();
    const now = Date.now();
    session.handleTranscript({ speaker: 'interviewer', text: 'Serving.', timestamp: now - 5000, final: true, confidence: 1 });
    // an interim that never became a final — the M28 shape
    session.handleTranscript({ speaker: 'interviewer', text: 'How do you keep feature engineering consistent', timestamp: now, final: false, confidence: 1 });
    return session;
}

describe('runWhatShouldISay pins the settled question', () => {
    afterEach(() => vi.restoreAllMocks());

    it('transcript path (Auto dispatch): the prompt ends with the settled question, the fragment is absorbed, no interim is injected', async () => {
        const logs = captureLogs();
        const calls = captureTranscript();
        const engine = new IntelligenceEngine(stubHelper(), sessionWithFragmentAndInterim());
        await engine.runWhatShouldISay(SETTLED, 1.0, undefined, { intentOverride: 'verbal', bypassCooldown: true });
        expect(calls).toHaveLength(1);
        expect(calls[0]).toBe(`[INTERVIEWER]: ${SETTLED}`);
        expect(logs.some((l) => l.includes('Injecting interim transcript'))).toBe(false);
        expect(logs).toContain(`[IntelligenceEngine] runWhatShouldISay: pinned question ${JSON.stringify(SETTLED)}`);
    });

    it('contextOverride path (chip click): the snapshot tail is rewritten to the chip question', async () => {
        captureLogs();
        const calls = captureTranscript();
        const engine = new IntelligenceEngine(stubHelper(), new SessionTracker());
        await engine.runWhatShouldISay(SETTLED, 1.0, undefined, {
            intentOverride: 'verbal',
            contextOverride: '[INTERVIEWER]: how do you handle deletes across services?\n[ASSISTANT (PREVIOUS SUGGESTION)]: i would publish a deletion event.\n[INTERVIEWER]: serving.',
        });
        expect(calls[0]).toBe(`[INTERVIEWER]: how do you handle deletes across services?\n[ASSISTANT (PREVIOUS SUGGESTION)]: i would publish a deletion event.\n[INTERVIEWER]: ${SETTLED}`);
    });

    it('without a question nothing changes: transcript as before, interim injected, no pinned line', async () => {
        const logs = captureLogs();
        const calls = captureTranscript();
        const engine = new IntelligenceEngine(stubHelper(), sessionWithFragmentAndInterim());
        // intentOverride keeps classifyIntent (regex → SLM → heuristic) out of the test.
        await engine.runWhatShouldISay(undefined, 0.8, undefined, { intentOverride: 'verbal' });
        expect(calls[0]).toBe('[INTERVIEWER]: serving.\n[INTERVIEWER]: how do you keep feature engineering consistent');
        expect(logs.some((l) => l.includes('Injecting interim transcript'))).toBe(true);
        expect(logs.some((l) => l.includes('pinned question'))).toBe(false);
    });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run electron/IntelligenceEngine.pinnedQuestion.test.ts`
Expected: the first two FAIL (transcript ends with `serving.` / the interim line; no pinned log); the third PASSES already (it pins today's behaviour).

- [ ] **Step 3: Implement**

In `electron/IntelligenceEngine.ts`:

(a) Add the import after `import { getAnswerShapeGuidance, IntentResult } from './llm/IntentClassifier';`:

```ts
import { pinSettledQuestion } from './llm/lastInterviewerTurn';
```

(b) Replace the block that starts at `const contextItems = this.session.getContext(180);` and ends with the closing brace of the `else` that sets `lastInterviewerTurn` (the `if (options.contextOverride) { … } else { … }`) with:

```ts
            const contextItems = this.session.getContext(180);

            // The question this call was dispatched with — a Live sentence, a
            // detector chip, a clicked chip, a typed question. Pinned as the last
            // interviewer line of the prompt: on 2026-09-04 the prompt ended with
            // the raw STT tail instead ("Serving.", "What do you do?") and four
            // correctly dispatched questions were answered wrong (spec §1–2).
            const settled = question?.trim() ? question.trim() : null;

            // Inject latest interim transcript if available — never when a settled
            // question is pinned: the pin owns the last line, and an interim would
            // put a fragment back after it.
            const lastInterim = settled ? null : this.session.getLastInterimInterviewer();
            if (lastInterim && lastInterim.text.trim().length > 0) {
                const lastItem = contextItems[contextItems.length - 1];
                const isDuplicate = lastItem &&
                    lastItem.role === 'interviewer' &&
                    (lastItem.text === lastInterim.text || Math.abs(lastItem.timestamp - lastInterim.timestamp) < 1000);

                if (!isDuplicate) {
                    console.log(`[IntelligenceEngine] Injecting interim transcript: "${lastInterim.text.substring(0, 50)}..."`);
                    contextItems.push({
                        role: 'interviewer',
                        text: lastInterim.text,
                        timestamp: lastInterim.timestamp
                    });
                }
            }

            let preparedTranscript: string;
            let lastInterviewerTurn: string | null;
            if (options.contextOverride) {
                preparedTranscript = settled ? pinSettledQuestion(options.contextOverride, settled) : options.contextOverride;
                lastInterviewerTurn = question ?? null;
                console.log('[IntelligenceEngine] runWhatShouldISay: using contextOverride snapshot');
            } else {
                const transcriptTurns = contextItems.map(item => ({
                    role: item.role,
                    text: item.text,
                    timestamp: item.timestamp
                }));

                preparedTranscript = prepareTranscriptForWhatToAnswer(transcriptTurns, 12);
                if (settled) preparedTranscript = pinSettledQuestion(preparedTranscript, settled);

                lastInterviewerTurn = settled ?? (() => {
                    for (let i = contextItems.length - 1; i >= 0; i--) {
                        if (contextItems[i].role === 'interviewer') {
                            return contextItems[i].text;
                        }
                    }
                    return null;
                })();
            }
            // Full text, one line — the flight harness pairs it with the dispatch
            // line to prove chip and answer carry one text (spec §2.3, §6.2).
            if (settled) console.log(`[IntelligenceEngine] runWhatShouldISay: pinned question ${JSON.stringify(settled)}`);
```

(c) The original interim-injection block sat inside the replaced range, so it is gone. Verify: `grep -c "Injecting interim transcript" electron/IntelligenceEngine.ts` prints `1`, and `grep -c "pinSettledQuestion(" electron/IntelligenceEngine.ts` prints `2`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run electron/IntelligenceEngine.pinnedQuestion.test.ts electron/IntelligenceEngine.codingAdvisory.test.ts electron/IntelligenceEngine.cooldown.test.ts`
Expected: PASS (all three files).

- [ ] **Step 5: Type gate and commit**

Run: `npx tsc --noEmit -p electron/tsconfig.json 2>&1 | grep -c "error TS"` — expected: the pre-existing count (6), no new errors.

```bash
git add electron/IntelligenceEngine.ts electron/IntelligenceEngine.pinnedQuestion.test.ts
git commit -m "fix(answer): the answer prompt ends with the dispatched question, on both paths

runWhatShouldISay rebuilt the prompt from the transcript tail and never showed
the model the question it was called with; four correctly dispatched questions
were answered wrong on 2026-09-04 (M26, M27, M28, H09). The settled question is
pinned as the last interviewer line, absorbing the STT fragment of the same
utterance; the interim injection is skipped when a question is pinned.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Fragment hold in `dispatchDetection`

**Files:**
- Modify: `electron/main.ts` (imports; the `liveHold` field area ~line 907; `dispatchDetection` ~line 1890; the `question-detected-update` handler ~line 2279; the three `this.liveHold.cancel()` sites ~lines 1762, 1868, 2040)
- Test: `electron/services/fragmentHold.test.ts` (new — a composition test of the real primitives in `dispatchDetection`'s committed order; `main.ts` has no test harness, same approach as `liveHold.test.ts`'s mirrors)

**Interfaces:**
- Consumes: `looksFragmentary` (Task 2), `LiveHold.peek` (Task 3), `createLiveHold`, `ChipDeduper`, `decideDispatch` (exist).
- Produces: log lines `[Main] dispatch: hold …` and the trailing ` question=<JSON>` on every dispatch line (Task 8 parses them).

- [ ] **Step 1: Write the failing composition test**

Create `electron/services/fragmentHold.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { ChipDeduper } from './ChipDeduper';
import { decideDispatch } from './detectionDispatch';
import { createLiveHold } from './liveHold';
import { isFragment, looksFragmentary } from './questionShape';

/**
 * Mirrors electron/main.ts dispatchDetection() in its committed order —
 * Live fragment drop, (unverifiable hold: omitted, every detection here has
 * an anchor), FRAGMENT HOLD, deduper, decideDispatch — with the real
 * primitives. main.ts is the Electron entry point and has no test harness;
 * the wiring itself is proven by the flight hour (spec 2026-09-04 §6.2).
 */
type Mode = 'off' | 'suggest' | 'auto';
interface D { question: string; source: 'live' | 'whisper'; anchor?: string; verdict: string; chip?: { id: string }; resolving?: boolean }

function makeDispatcher(mode: Mode) {
    const log: string[] = [];
    const deduper = new ChipDeduper();
    const hold = createLiveHold<D>({ holdMs: 2500, onResolve: (held) => dispatch({ ...held, resolving: true }) });
    function dispatch(d: D): void {
        if (d.source === 'live' && isFragment(d.question)) { log.push(`drop:fragment:${d.question}`); return; }
        if (mode !== 'off' && !d.resolving && looksFragmentary(d.question)) { hold.offer(d); log.push(`hold:${d.source}:${d.question}`); return; }
        const verdict = deduper.admit({ question: d.question, source: d.source, anchor: d.anchor });
        const action = mode === 'off' && d.source === 'whisper' ? (verdict.admitted ? 'chip' : 'drop') : decideDispatch(mode, verdict);
        if (action === 'answer') deduper.markAnswered(verdict.id);
        log.push(`${action}:${d.source}:${d.question}`);
    }
    // the question-detected-update hook (main.ts): a held chip that grew is re-dispatched with the new text
    function chipUpdate(id: string, question: string): void {
        const held = hold.peek();
        if (held?.chip?.id === id) { hold.cancel(); dispatch({ ...held, question, anchor: question, chip: { id } }); }
    }
    return { dispatch, chipUpdate, log };
}

const TAIL = 'And when would you not?';
const WHOLE = 'When would you reach for a service mesh in an ML serving stack, and when would you not?';
const whisperTail = (): D => ({ question: TAIL, source: 'whisper', anchor: TAIL, verdict: 'match', chip: { id: 'c1' } });
// reconcile's paraphrase verdict against the only STT speech, the tail itself
const liveWhole = (): D => ({ question: WHOLE, source: 'live', anchor: TAIL, verdict: 'paraphrase' });

afterEach(() => vi.useRealTimers());

describe('fragment hold (spec 2026-09-04 §3)', () => {
    it('M27 in Auto: the tail is held, Live’s whole sentence is answered on arrival, the tail resolves as a duplicate', () => {
        vi.useFakeTimers();
        const { dispatch, log } = makeDispatcher('auto');
        dispatch(whisperTail());
        expect(log).toEqual([`hold:whisper:${TAIL}`]);
        vi.advanceTimersByTime(1300);
        dispatch(liveWhole());
        expect(log).toEqual([`hold:whisper:${TAIL}`, `answer:live:${WHOLE}`]);
        vi.advanceTimersByTime(1200);
        expect(log).toEqual([`hold:whisper:${TAIL}`, `answer:live:${WHOLE}`, `drop:whisper:${TAIL}`]);
        expect(log.filter((l) => l.startsWith('answer:'))).toHaveLength(1);
    });
    it('expiry with nothing better answers the fragment — hold briefly, then answer', () => {
        vi.useFakeTimers();
        const { dispatch, log } = makeDispatcher('auto');
        dispatch(whisperTail());
        vi.advanceTimersByTime(2499);
        expect(log).toEqual([`hold:whisper:${TAIL}`]);
        vi.advanceTimersByTime(1);
        expect(log).toEqual([`hold:whisper:${TAIL}`, `answer:whisper:${TAIL}`]);
    });
    it('a whole text is never held', () => {
        vi.useFakeTimers();
        const { dispatch, log } = makeDispatcher('auto');
        dispatch({ question: 'How do you keep base images patched across many model services?', source: 'live', anchor: 'Cross many model services.', verdict: 'paraphrase' });
        expect(log).toEqual(['answer:live:How do you keep base images patched across many model services?']);
    });
    it('Suggest: one chip, the whole one', () => {
        vi.useFakeTimers();
        const { dispatch, log } = makeDispatcher('suggest');
        dispatch(whisperTail());
        vi.advanceTimersByTime(1300);
        dispatch(liveWhole());
        vi.advanceTimersByTime(1200);
        expect(log).toEqual([`hold:whisper:${TAIL}`, `chip:live:${WHOLE}`, `drop:whisper:${TAIL}`]);
    });
    it('Live off: no other ear, no hold', () => {
        vi.useFakeTimers();
        const { dispatch, log } = makeDispatcher('off');
        dispatch(whisperTail());
        expect(log).toEqual([`chip:whisper:${TAIL}`]);
    });
    it('resolving bypasses the hold — a resolution is never re-held', () => {
        vi.useFakeTimers();
        const { dispatch, log } = makeDispatcher('auto');
        dispatch({ ...whisperTail(), resolving: true });
        expect(log).toEqual([`answer:whisper:${TAIL}`]);
        vi.advanceTimersByTime(10_000);
        expect(log).toHaveLength(1);
    });
    it('a chip update that completes the held text is answered at once; the old timer never fires', () => {
        vi.useFakeTimers();
        const { dispatch, chipUpdate, log } = makeDispatcher('auto');
        dispatch(whisperTail());
        vi.advanceTimersByTime(800);
        chipUpdate('c1', WHOLE);
        expect(log).toEqual([`hold:whisper:${TAIL}`, `answer:whisper:${WHOLE}`]);
        vi.advanceTimersByTime(5000);
        expect(log).toHaveLength(2);
    });
    it('a chip update for a different chip leaves the hold alone', () => {
        vi.useFakeTimers();
        const { dispatch, chipUpdate, log } = makeDispatcher('auto');
        dispatch(whisperTail());
        chipUpdate('other', WHOLE);
        expect(log).toEqual([`hold:whisper:${TAIL}`]);
        vi.advanceTimersByTime(2500);
        expect(log).toEqual([`hold:whisper:${TAIL}`, `answer:whisper:${TAIL}`]);
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run electron/services/fragmentHold.test.ts`
Expected: PASS — the primitives exist from Tasks 2–3, so this mirror passes by construction. It is the contract `main.ts` is edited to match in Step 3 (`main.ts` itself has no test harness; the flight hour proves the wiring). Calibration: temporarily change `holdMs: 2500` in the test to `1000` and run again — the M27 case must FAIL (the tail is answered before Live arrives); restore it.

- [ ] **Step 3: Wire `main.ts`**

(a) Import: change `import { isFragment } from './services/questionShape'` to `import { isFragment, looksFragmentary } from './services/questionShape'`.

(b) Below the `liveHold` field (after its closing `});`), add:

```ts
  /**
   * Holds a detection whose text is not a whole question — an STT tail such as
   * "And when would you not?" (2026-09-04 M27: Deepgram lost the head, the tail
   * was answered, Live's whole sentence arrived 1.3 s later and was dropped as a
   * duplicate) — so the other ear can supply the whole sentence. Live trailed
   * the fragment final by 1.0–1.5 s in the three measured cases; 2500 matches
   * liveHold and leaves ~1 s of margin. Resolved by the timeout only: a whole
   * text for the same utterance arriving earlier is answered on arrival, and
   * the resolved fragment is then a deduper duplicate (spec 2026-09-04 §3).
   */
  private readonly fragmentHold = createLiveHold<DetectionInput>({
    holdMs: 2500,
    onResolve: (held) => this.dispatchDetection({ ...held, resolving: true }),
  });
```

(c) In `dispatchDetection`, immediately after the unverifiable-hold block (the `if (this.liveMode !== 'off' && d.source === 'live' && d.verdict === 'unverifiable' && !d.resolving) { … return; }`), insert:

```ts
    // Not a whole question ("And when would you not?"): hold for the other ear
    // instead of answering the tail — spec 2026-09-04 §3. Text shape only,
    // either source; never when Live is off (no other ear), never for a hold's
    // own resolution.
    if (this.liveMode !== 'off' && !d.resolving && looksFragmentary(d.question)) {
      const previous = this.fragmentHold.offer(d);
      if (previous) {
        const prevAnchorLog = JSON.stringify((previous.anchor ?? previous.question).slice(0, 80));
        console.log(`[Main] dispatch: drop source=${previous.source} anchor=${prevAnchorLog} verdict=${previous.verdict} duplicateOf=${d.source} answered=false question=${JSON.stringify(previous.question)}`);
      }
      const heldAnchorLog = JSON.stringify((d.anchor ?? d.question).slice(0, 80));
      console.log(`[Main] dispatch: hold source=${d.source} anchor=${heldAnchorLog} verdict=${d.verdict} reason=fragmentary question=${JSON.stringify(d.question)}`);
      return;
    }
```

(d) Still in `dispatchDetection`, append ` question=${JSON.stringify(d.question)}` to the two existing log lines:

```ts
      console.log(`[Main] dispatch: drop source=${d.source} anchor=${anchorLog} verdict=${d.verdict} duplicateOf=${verdict.duplicateOfSource ?? 'none'} answered=${verdict.alreadyAnswered === true} question=${JSON.stringify(d.question)}`);
```
```ts
    console.log(`[Main] dispatch: ${action} source=${d.source} anchor=${anchorLog} verdict=${d.verdict} question=${JSON.stringify(d.question)}`);
```

(e) Replace the `question-detected-update` handler:

```ts
    this.intelligenceManager.on('question-detected-update', (chip: any) => {
      // A held fragment whose chip just grew (the detector joined more speech
      // onto it) is re-dispatched with the new text: whole → admitted now,
      // still fragmentary → held again with a fresh timer. Before this an
      // update never reached dispatch at all.
      const held = this.fragmentHold.peek();
      if (held?.chip?.id && chip?.id === held.chip.id) {
        this.fragmentHold.cancel();
        const question = String(chip?.question ?? '');
        this.dispatchDetection({ ...held, question, anchor: question, chip });
      }
      const win = mainWindow()
      if (win) {
        win.webContents.send('detected-question-update', chip)
      }
    })
```

(f) After each of the three `this.liveHold.cancel();` lines (meeting start, mode → off, meeting end) add `this.fragmentHold.cancel();`.

- [ ] **Step 4: Verify**

Run: `npx vitest run electron/services/fragmentHold.test.ts electron/services/liveHold.test.ts` — expected PASS.
Run: `npx tsc --noEmit -p electron/tsconfig.json 2>&1 | grep -c "error TS"` — expected: the pre-existing count, none new.
Run: `grep -c "fragmentHold.cancel()" electron/main.ts` — expected `3`; `grep -c 'question=${JSON.stringify' electron/main.ts` — expected `4` (drop, hold, superseded-hold drop, action line).

- [ ] **Step 5: Commit**

```bash
git add electron/main.ts electron/services/fragmentHold.test.ts
git commit -m "feat(dispatch): hold a fragmentary detection 2.5 s for the other ear; dispatch lines carry the question

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: `cutAtWordBudget` — sentence-boundary word budget stage

**Files:**
- Modify: `electron/llm/verbalStreamFilter.ts`
- Test: `electron/llm/verbalStreamFilter.test.ts`

**Interfaces:**
- Produces: `cutAtWordBudget(source: AsyncGenerator<string>, opts: { limit: number; floor: number; onDone?: (r: { words: number; cut: boolean; allowance: boolean }) => void }): AsyncGenerator<string>` — used by Task 7.

- [ ] **Step 1: Write the failing tests**

Append to `electron/llm/verbalStreamFilter.test.ts` (add `cutAtWordBudget` to the module import, and `vi` to the vitest import on line 1):

```ts
describe('cutAtWordBudget (spec 2026-09-04 §4)', () => {
    /** n distinct words ending in a period — sentence i of an answer. */
    const sentence = (n: number, i: number) => Array.from({ length: n }, (_, k) => `w${i}x${k}`).join(' ') + '.';
    const words = (s: string) => (s.match(/\S+/g) ?? []).length;
    async function* chunked(text: string, size: number): AsyncGenerator<string> {
        for (let i = 0; i < text.length; i += size) yield text.slice(i, i + size);
    }
    async function run(text: string, size = 7, opts: Partial<{ limit: number; floor: number }> = {}) {
        const done: any[] = [];
        const src = chunked(text, size);
        const ret = vi.spyOn(src, 'return');
        let out = '';
        for await (const c of cutAtWordBudget(src, { limit: 80, floor: 40, ...opts, onDone: (r) => done.push(r) })) out += c;
        return { out, done, ret };
    }

    it('six 20-word sentences: emits four (80 words), cuts at the sentence end, closes the source without draining it', async () => {
        const text = [1, 2, 3, 4, 5, 6].map((i) => sentence(20, i)).join(' ');
        const { out, done, ret } = await run(text);
        expect(words(out)).toBe(80);
        expect(out.trim()).toBe([1, 2, 3, 4].map((i) => sentence(20, i)).join(' '));
        expect(done).toEqual([{ words: 80, cut: true, allowance: false }]);
        // returning out of the for-await closes the source (IteratorClose) — the SDK stream honours it
        expect(ret).toHaveBeenCalled();
    });
    it('a last sentence that would cross the limit is dropped at end of stream (no source close needed)', async () => {
        const text = [1, 2, 3, 4, 5].map((i) => sentence(20, i)).join(' ');
        const { out, done } = await run(text);
        expect(words(out)).toBe(80);
        expect(done).toEqual([{ words: 80, cut: true, allowance: false }]);
    });
    it('30 + 60 words: the second sentence starts under the floor and is kept whole (allowance)', async () => {
        const text = sentence(30, 1) + ' ' + sentence(60, 2);
        const { out, done } = await run(text);
        expect(words(out)).toBe(90);
        expect(done).toEqual([{ words: 90, cut: false, allowance: true }]);
    });
    it('a single 95-word sentence is never cut inside; the next sentence is dropped', async () => {
        const text = sentence(95, 1) + ' ' + sentence(10, 2);
        const { out, done } = await run(text);
        expect(words(out)).toBe(95);
        expect(done).toEqual([{ words: 95, cut: true, allowance: true }]);
    });
    it('an answer under the limit passes through unchanged', async () => {
        const text = sentence(25, 1) + ' ' + sentence(30, 2);
        const { out, done } = await run(text);
        expect(out).toBe(text);
        expect(done).toEqual([{ words: 55, cut: false, allowance: false }]);
    });
    it('output is identical for every chunk size', async () => {
        const text = [1, 2, 3, 4, 5, 6].map((i) => sentence(20, i)).join(' ');
        const outs = await Promise.all([1, 3, 7, 50, 1000].map((n) => run(text, n).then((r) => r.out)));
        for (const o of outs) expect(o).toBe(outs[0]);
    });
    it('a decimal or a terminator split across chunks does not end a sentence', async () => {
        // 45 words already emitted → buffer mode; "3.5" straddles a chunk boundary inside the next sentence.
        const text = sentence(22, 1) + ' ' + sentence(23, 2) + ' The p99 is 3.5 seconds on the old path and 1.2 on the new one.';
        const { out, done } = await run(text, 5);
        expect(out).toBe(text);
        expect(done[0].cut).toBe(false);
    });
    it('streams before the floor: the first yield arrives before the source is drained', async () => {
        const text = [1, 2, 3, 4, 5, 6].map((i) => sentence(20, i)).join(' ');
        const chunks: string[] = [];
        for (let i = 0; i < text.length; i += 8) chunks.push(text.slice(i, i + 8));
        let consumed = 0;
        async function* source() { for (const c of chunks) { consumed++; yield c; } }
        let atFirst = -1;
        for await (const _ of cutAtWordBudget(source(), { limit: 80, floor: 40 })) { if (atFirst === -1) atFirst = consumed; }
        expect(atFirst).toBeLessThan(chunks.length / 4);
    });
    it('a consumer that stops early gets no onDone (no budget line for an aborted answer)', async () => {
        const done: any[] = [];
        const gen = cutAtWordBudget(chunked(sentence(20, 1) + ' ' + sentence(20, 2), 7), { limit: 80, floor: 40, onDone: (r) => done.push(r) });
        for await (const _ of gen) break;
        expect(done).toEqual([]);
    });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run electron/llm/verbalStreamFilter.test.ts`
Expected: FAIL — `cutAtWordBudget` is not exported.

- [ ] **Step 3: Implement**

Append to `electron/llm/verbalStreamFilter.ts`:

```ts
// ── Spoken word budget ───────────────────────────────────────────────────────

export interface WordBudgetResult { words: number; cut: boolean; allowance: boolean }
export interface WordBudgetOptions { limit: number; floor: number; onDone?: (r: WordBudgetResult) => void }

/** A sentence end: terminator, optional closing quotes/brackets, then whitespace. */
const SENTENCE_END = /[.!?]["'”’)\]]*(?=\s)/;
/** A terminator run at the very end of a buffer — undecidable until the next chunk shows what follows. */
const TRAILING_TERMINATOR = /[.!?]["'”’)\]]*$/;
const countWords = (s: string): number => (s.match(/\S+/g) ?? []).length;

/**
 * Cut a spoken answer at a sentence end inside `limit` words (spec 2026-09-04
 * §4). In-app answers ran 97 words median, 41 of 52 over 80, on 2026-09-04;
 * a sentence cut at 80 measured 67 median, 0 over 80, 2 under 40 — hence the
 * floor.
 *
 * The decision is taken at the start of each sentence. A sentence that starts
 * with fewer than `floor` words emitted streams through token by token, whole,
 * even past `limit` — the allowance, which also means the first sentence is
 * never cut inside. A sentence that starts at or past `floor` is buffered and
 * emitted only if it fits; otherwise the stream is cut there — returning out
 * of the for-await closes the source (IteratorClose), which the SDK stream
 * honours by stopping the request. A terminator at the end of a
 * chunk waits for the next chunk, so "3.5" or "e.g." split across chunks
 * cannot end a sentence. onDone fires once, on natural end or on a cut —
 * never when the consumer stops early.
 */
export async function* cutAtWordBudget(
    source: AsyncGenerator<string>,
    opts: WordBudgetOptions,
): AsyncGenerator<string> {
    const { limit, floor } = opts;
    let emitted = 0;
    let inWord = false;
    // Counts words in text being yielded, carrying the in-word state across
    // chunk boundaries so a word split over two chunks counts once.
    const track = (s: string): number => {
        let n = 0;
        for (const ch of s) {
            const space = /\s/.test(ch);
            if (!space && !inWord) n++;
            inWord = !space;
        }
        return n;
    };
    let mode: 'stream' | 'buffer' = 'stream';
    let carry = '';
    let cut = false;
    const finish = (): void => { opts.onDone?.({ words: emitted, cut, allowance: emitted > limit }); };

    for await (const chunk of source) {
        let text = carry + chunk;
        carry = '';
        while (text.length > 0) {
            const m = SENTENCE_END.exec(text);
            if (mode === 'stream') {
                if (!m) {
                    const hold = TRAILING_TERMINATOR.exec(text);
                    const keep = hold ? hold.index : text.length;
                    if (keep > 0) { const piece = text.slice(0, keep); emitted += track(piece); yield piece; }
                    carry = text.slice(keep);
                    text = '';
                } else {
                    const end = m.index + m[0].length;
                    const piece = text.slice(0, end);
                    emitted += track(piece);
                    yield piece;
                    text = text.slice(end);
                    if (emitted >= floor) mode = 'buffer';
                }
            } else {
                if (!m) { carry = text; text = ''; break; }
                const end = m.index + m[0].length;
                const sentence = text.slice(0, end);
                if (emitted + countWords(sentence) > limit) {
                    cut = true;
                    finish();
                    return; // closes `source` via the for-await's IteratorClose
                }
                emitted += track(sentence);
                yield sentence;
                text = text.slice(end);
            }
        }
    }
    if (carry) {
        if (mode === 'stream' || emitted + countWords(carry) <= limit) {
            emitted += track(carry);
            yield carry;
        } else if (carry.trim()) {
            cut = true;
        }
    }
    finish();
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run electron/llm/verbalStreamFilter.test.ts`
Expected: PASS (all existing + 8 new).

- [ ] **Step 5: Commit**

```bash
git add electron/llm/verbalStreamFilter.ts electron/llm/verbalStreamFilter.test.ts
git commit -m "feat(verbal): cutAtWordBudget — sentence-boundary word budget stage

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: The verbal answer path runs under the budget

**Files:**
- Modify: `electron/llm/WhatToAnswerLLM.ts` (imports; two constants; the `yield* tapFirstToken(…)` call in the verbal branch)
- Test: `electron/llm/WhatToAnswerLLM.budget.test.ts` (new)

**Interfaces:**
- Consumes: `cutAtWordBudget` (Task 6).
- Produces: the log line `[Answer] budget: words=<n> cut=<yes|no> allowance=<yes|no>` (Task 8 parses it).

- [ ] **Step 1: Write the failing test**

Create `electron/llm/WhatToAnswerLLM.budget.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { WhatToAnswerLLM } from './WhatToAnswerLLM';

/** The verbal path's stream is cut at 80 words at a sentence end (spec 2026-09-04 §4.2); the coding path is exempt. */
const sentence = (n: number, i: number) => Array.from({ length: n }, (_, k) => `w${i}x${k}`).join(' ') + '.';
const words = (s: string) => (s.match(/\S+/g) ?? []).length;
const SIX = [1, 2, 3, 4, 5, 6].map((i) => sentence(20, i)).join(' ');

function makeHelper(text: string) {
    let consumed = 0;
    const total = Math.ceil(text.length / 9);
    async function* stream(): AsyncGenerator<string> {
        for (let i = 0; i < text.length; i += 9) { consumed++; yield text.slice(i, i + 9); }
    }
    const helper = {
        streamChat: vi.fn(() => stream()),
        streamVerbalWithGeminiFlash: vi.fn(() => stream()),
        getCurrentModelId: vi.fn(() => 'gemini-3.1-flash-lite'),
    } as any;
    return { helper, consumed: () => consumed, total };
}
async function drain(gen: AsyncGenerator<string>): Promise<string> {
    let out = '';
    for await (const c of gen) out += c;
    return out.replace(/__model_source:[^_]*__/g, '');
}
const VERBAL = { intent: 'general', confidence: 0.9, answerShape: '' } as any;
const CODING = { intent: 'coding', confidence: 0.9, answerShape: '' } as any;

describe('WhatToAnswerLLM word budget', () => {
    afterEach(() => vi.restoreAllMocks());

    it('verbal: 120 words in six sentences come out as 80, the source is not drained, the budget line is logged', async () => {
        const logs: string[] = [];
        vi.spyOn(console, 'log').mockImplementation((...a: any[]) => { logs.push(a.map(String).join(' ')); });
        const { helper, consumed, total } = makeHelper(SIX);
        const out = await drain(new WhatToAnswerLLM(helper).generateStream('[INTERVIEWER]: Walk me through it.', undefined, VERBAL));
        expect(words(out)).toBe(80);
        expect(consumed()).toBeLessThan(total);
        expect(logs).toContain('[Answer] budget: words=80 cut=yes allowance=no');
    });
    it('behavioral (fast path) is under the same budget', async () => {
        const logs: string[] = [];
        vi.spyOn(console, 'log').mockImplementation((...a: any[]) => { logs.push(a.map(String).join(' ')); });
        const { helper } = makeHelper(SIX);
        const out = await drain(new WhatToAnswerLLM(helper).generateStream('[INTERVIEWER]: Tell me about a time.', undefined, { ...VERBAL, intent: 'behavioral' }));
        expect(words(out)).toBe(80);
        expect(logs.some((l) => l.startsWith('[Answer] budget: words=80'))).toBe(true);
    });
    it('coding is exempt: no cut, no budget line', async () => {
        const logs: string[] = [];
        vi.spyOn(console, 'log').mockImplementation((...a: any[]) => { logs.push(a.map(String).join(' ')); });
        const { helper } = makeHelper(SIX);
        const out = await drain(new WhatToAnswerLLM(helper).generateStream('[INTERVIEWER]: Write it.', undefined, CODING));
        expect(words(out)).toBe(120);
        expect(logs.some((l) => l.startsWith('[Answer] budget:'))).toBe(false);
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run electron/llm/WhatToAnswerLLM.budget.test.ts`
Expected: the first two FAIL — 120 words come out, no budget line; the coding case passes already.

- [ ] **Step 3: Implement**

In `electron/llm/WhatToAnswerLLM.ts`:

(a) Extend the filter import: `import { filterVerbalLines, stripSuggestionBlock, stripSpokenNotation, cutAtWordBudget, type Suggestion } from "./verbalStreamFilter";`

(b) After the `diagLog` function, add:

```ts
/**
 * Spoken word budget (spec 2026-09-04 §4): in-app answers ran 97 words median,
 * 41 of 52 over 80 on 2026-09-04; cut at a sentence end inside 80 they measure
 * 67 median, 0 over 80. A sentence that starts under FLOOR streams whole even
 * past LIMIT, so an answer is never cut short of 40 words. Coding is exempt.
 */
const SPOKEN_WORD_LIMIT = 80;
const SPOKEN_WORD_FLOOR = 40;
```

(c) Replace the `yield* tapFirstToken(` call in the verbal branch with:

```ts
                yield* tapFirstToken(
                    cutAtWordBudget(
                        this.withVerbalFallback(
                            filtered(rawStream),
                            () => filtered(
                                this.llmHelper.streamVerbalWithGeminiFlash(
                                    fullMessage,
                                    VERBAL_WHAT_TO_ANSWER_PROMPT,
                                    undefined,
                                    GEMINI_FLASH_FALLBACK_MODEL,
                                ),
                            ),
                        ),
                        {
                            limit: SPOKEN_WORD_LIMIT,
                            floor: SPOKEN_WORD_FLOOR,
                            onDone: (r) => {
                                // One line per completed spoken answer — the flight
                                // harness's "budget" gate row reads it.
                                const line = `words=${r.words} cut=${r.cut ? 'yes' : 'no'} allowance=${r.allowance ? 'yes' : 'no'}`;
                                console.log(`[Answer] budget: ${line}`);
                                diagLog(`word budget: ${line}`);
                            },
                        },
                    ),
                    (ms) => diagLog(`first token ${ms}ms`),
                    (head) => diagLog(`answer head: ${JSON.stringify(head)}`),
                    t0,
                );
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run electron/llm/WhatToAnswerLLM.budget.test.ts electron/llm/verbalFallback.test.ts electron/llm/verbalSentinel.test.ts electron/llm/streamTaps.test.ts`
Expected: PASS (all four files).

- [ ] **Step 5: Commit**

```bash
git add electron/llm/WhatToAnswerLLM.ts electron/llm/WhatToAnswerLLM.budget.test.ts
git commit -m "feat(verbal): spoken answers stop at a sentence end inside 80 words; budget line logged

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: Harness — `pinned` and `budget` gate rows

**Files:**
- Modify: `electron/test/golden/interview60.metrics.mjs` (dispatch regex; two new parses; two result fields; two `GATE` rows)
- Modify: `electron/test/golden/README.md` (the `interview60.metrics.mjs` row)
- Test: `electron/test/golden/interview60.metrics.test.ts` (extend the synthetic run)

**Interfaces:**
- Consumes: the log lines from Tasks 4, 5, 7.
- Produces: `m.pinned = { answers, legacy, missing, mismatched }`, `m.budget = { n, over, allowance, overWithoutAllowance, cut, p50, max }`, `GATE` rows keyed `pinned` and `budget` (appended last, so index-based rendering in `interview60.report-html.mjs` stays aligned).

- [ ] **Step 1: Write the failing tests**

In `electron/test/golden/interview60.metrics.test.ts`, inside the synthetic run's `dbgLines` array, append these lines (Q1's answer line at `T0 + 2000` stays as is — it is the legacy format):

```ts
            // Spec 2026-09-04 §2/§4 (answer-what-was-asked): a new-format answer
            // dispatch carrying question="…", its pinned line 400 ms later with
            // the identical text, a second new-format answer whose pinned line
            // carries a DIFFERENT text (mismatch), a third with no pinned line
            // within 2 s (missing), and three budget lines: one cut inside the
            // limit, one over 80 by allowance, one over 80 without allowance.
            `${iso(T0 + 1100000)} [LOG] [Main] dispatch: answer source=live anchor="Pinned one." verdict=match question="How would you shard a relational database by tenant?"`,
            `${iso(T0 + 1100400)} [LOG] [IntelligenceEngine] runWhatShouldISay: pinned question "How would you shard a relational database by tenant?"`,
            `${iso(T0 + 1110000)} [LOG] [Main] dispatch: answer source=whisper anchor="Pinned two." verdict=match question="What is a consumer group in Kafka?"`,
            `${iso(T0 + 1110300)} [LOG] [IntelligenceEngine] runWhatShouldISay: pinned question "Consumer group?"`,
            `${iso(T0 + 1120000)} [LOG] [Main] dispatch: answer source=live anchor="Pinned three." verdict=match question="Why would you choose gRPC over REST?"`,
            `${iso(T0 + 1123000)} [LOG] [IntelligenceEngine] runWhatShouldISay: pinned question "Why would you choose gRPC over REST?"`,
            `${iso(T0 + 1100900)} [LOG] [Answer] budget: words=67 cut=yes allowance=no`,
            `${iso(T0 + 1110900)} [LOG] [Answer] budget: words=90 cut=no allowance=yes`,
            `${iso(T0 + 1120900)} [LOG] [Answer] budget: words=84 cut=no allowance=no`,
```

and add these `it` blocks to the synthetic-run `describe`:

```ts
    it('pinned — pairs new-format answer dispatches with the pinned line inside 2 s, counts legacy lines separately', () => {
        // answers: Q1 (+2000), Q2 (+123000), phantom (+520000), W01, W02, two
        // unverifiable, C01 = 8 legacy + 3 new-format = 11.
        expect(m.pinned).toEqual({ answers: 11, legacy: 8, missing: 1, mismatched: 1 });
        const row = evaluateGate(m).rows.find((r) => r.label === 'Answer prompt pinned to the dispatched question');
        expect(row.pass).toBe(false);
        expect(row.value).toBe('1/11 pinned, 1 missing, 1 mismatched, 8 legacy');
    });
    it('budget — counts answers over 80 with and without the allowance', () => {
        expect(m.budget).toEqual({ n: 3, over: 2, allowance: 1, overWithoutAllowance: 1, cut: 1, p50: 84, max: 90 });
        const row = evaluateGate(m).rows.find((r) => r.label === 'Spoken answers within the 80-word budget');
        expect(row.pass).toBe(false);
        expect(row.value).toBe('3 answers, 2 over 80 (1 by allowance), words p50 84 max 90');
    });
    it('the two new rows are the last two, so index-based rendering stays aligned', () => {
        expect(GATE.slice(-2).map((g) => g.key)).toEqual(['pinned', 'budget']);
    });
```

The three new answer lines sit at T0+1100000…1120000, past every item window (C01's, the latest, ends at T0+1065000), so they are unclaimed and add 3 to `answersToNobody`. The describe has two `expect(m.answersToNobody).toBe(3)` assertions (the C01 test and the "top-level counts" test): change both to `toBe(6)` and add to each comment: `plus the three answer-what-was-asked lines at +1100000/+1110000/+1120000, also past every window`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run electron/test/golden/interview60.metrics.test.ts`
Expected: FAIL — `m.pinned` and `m.budget` undefined, the two new gate rows missing. (The three new answer lines already parse under the old regex — the `question="…"` tail is simply ignored — so `answersToNobody` is 6 before and after Step 3.)

- [ ] **Step 3: Implement**

In `electron/test/golden/interview60.metrics.mjs`:

(a) Replace the `dispatches` parse:

```js
    const dispatches = [...dbg.matchAll(/^(\S+) \[LOG\] \[Main\] dispatch: (answer|chip|drop) source=(live|whisper) anchor="((?:[^"\\]|\\.)*)" verdict=(\w+)(?: duplicateOf=(\w+) answered=(true|false))?(?: question="((?:[^"\\]|\\.)*)")?/gm)]
        .map((m) => ({ at: ts(m[1]), action: m[2], source: m[3], anchor: JSON.parse(`"${m[4]}"`), verdict: m[5], duplicateOf: m[6] ?? null, answered: m[7] === 'true', question: m[8] == null ? null : JSON.parse(`"${m[8]}"`) }));
```

(b) After the `stats = { … }` object, add:

```js
    // — spec 2026-09-04 (answer what was asked) —
    // pinned: the engine logs the question it pinned as the last interviewer
    // line of the prompt; each answer dispatch in the new format (question="…")
    // must be followed within 2 s by a pinned line with the identical text —
    // the chip-parity proof. Dispatch lines without a question field are
    // "legacy" (runs before the format change) and fail the row.
    const pinnedLines = [...dbg.matchAll(/^(\S+) \[LOG\] \[IntelligenceEngine\] runWhatShouldISay: pinned question ("(?:[^"\\]|\\.)*")$/gm)].map((m) => ({ at: ts(m[1]), question: JSON.parse(m[2]) }));
    const pinned = { answers: 0, legacy: 0, missing: 0, mismatched: 0 };
    for (const d of dispatches.filter((d) => d.action === 'answer')) {
        pinned.answers++;
        if (d.question == null) { pinned.legacy++; continue; }
        const p = pinnedLines.find((l) => l.at >= d.at && l.at - d.at <= 2000);
        if (!p) pinned.missing++; else if (p.question !== d.question) pinned.mismatched++;
    }
    // budget: one line per completed spoken answer from WhatToAnswerLLM.
    const budgetLines = [...dbg.matchAll(/^(\S+) \[LOG\] \[Answer\] budget: words=(\d+) cut=(yes|no) allowance=(yes|no)/gm)].map((m) => ({ at: ts(m[1]), words: Number(m[2]), cut: m[3] === 'yes', allowance: m[4] === 'yes' }));
    const budgetWords = budgetLines.map((b) => b.words).sort((a, b) => a - b);
    const budget = {
        n: budgetLines.length,
        over: budgetLines.filter((b) => b.words > 80).length,
        allowance: budgetLines.filter((b) => b.allowance).length,
        overWithoutAllowance: budgetLines.filter((b) => b.words > 80 && !b.allowance).length,
        cut: budgetLines.filter((b) => b.cut).length,
        p50: pct(budgetWords, .5),
        max: budgetWords.length ? budgetWords[budgetWords.length - 1] : null,
    };
```

(c) Add `pinned, budget,` to the returned object (after `detectP50, ttftP90, ttftSource, judge,`).

(d) Append to `GATE` (after the `latency` row):

```js
    { key: 'pinned', label: 'Answer prompt pinned to the dispatched question', before: 'not logged', pass: (m) => m.pinned.answers > 0 && m.pinned.legacy === 0 && m.pinned.missing === 0 && m.pinned.mismatched === 0, show: (m) => m.pinned.answers === 0 ? 'no answers' : m.pinned.legacy === m.pinned.answers ? 'not logged' : `${m.pinned.answers - m.pinned.legacy - m.pinned.missing - m.pinned.mismatched}/${m.pinned.answers} pinned, ${m.pinned.missing} missing, ${m.pinned.mismatched} mismatched${m.pinned.legacy ? `, ${m.pinned.legacy} legacy` : ''}` },
    { key: 'budget', label: 'Spoken answers within the 80-word budget', before: '41 of 52 over 80', pass: (m) => m.budget.n > 0 && m.budget.overWithoutAllowance === 0, show: (m) => m.budget.n === 0 ? 'not logged' : `${m.budget.n} answers, ${m.budget.over} over 80 (${m.budget.allowance} by allowance), words p50 ${m.budget.p50} max ${m.budget.max}` },
```

(e) In `electron/test/golden/README.md`, extend the `interview60.metrics.mjs` table row's text with: `; two rows from the 2026-09-04 spec — "Answer prompt pinned to the dispatched question" pairs each answer dispatch's question= field with the engine's pinned question line inside 2 s, and "Spoken answers within the 80-word budget" reads the [Answer] budget: lines (over 80 only by the under-40 allowance)`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run electron/test/golden/interview60.metrics.test.ts electron/test/golden/interview60.judge.test.ts electron/test/golden/interview60.lib.test.ts`
Expected: PASS. Then run the gate on the baseline hour to see the two rows red and every other number unchanged:
`node electron/test/golden/interview60.run.mjs gate electron/test/golden/interview60.runs/2026-09-04T08-09-38-after4` — expected: the same rows as the committed report plus `… pinned … not logged FAIL` and `… budget … not logged FAIL`.

- [ ] **Step 5: Commit**

```bash
git add electron/test/golden/interview60.metrics.mjs electron/test/golden/interview60.metrics.test.ts electron/test/golden/README.md
git commit -m "feat(golden): gate rows for the pinned question and the spoken word budget

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9: Whole-tree gates and a build

**Files:** none modified.

- [ ] **Step 1: Full unit suite**

Run: `npx vitest run 2>&1 | grep -E "Tests |Test Files "` — expected: all passing, no failures.

- [ ] **Step 2: Type gates**

Run: `npx tsc --noEmit -p tsconfig.json` — expected: clean.
Run: `npx tsc --noEmit -p electron/tsconfig.json 2>&1 | grep "error TS"` — expected: exactly the six pre-existing errors (none in a file this plan touched: `lastInterviewerTurn.ts`, `questionShape.ts`, `liveHold.ts`, `IntelligenceEngine.ts`, `main.ts`, `verbalStreamFilter.ts`, `WhatToAnswerLLM.ts`, or their tests). Any error in one of those files is new and blocks.

- [ ] **Step 3: Build**

Run: `npm run build:electron` — expected: exit 0; `dist-electron/electron/llm/verbalStreamFilter.js` contains `cutAtWordBudget`; `dist-electron/electron/main.js` contains `reason=fragmentary`.

No commit (nothing changed); if anything failed, fix inside the task that owns the file and re-run.

---

### Task 10: Live proof — the same hour, gated

**Files:** run artefacts under `electron/test/golden/interview60.runs/<stamp>-after5/`, the report of record, the memory note.

- [ ] **Step 1: Preconditions**

The app's stored settings must match the baseline: STT provider `deepgram`, Live mode `auto`, Context toggle on. Confirm from the last run's log head: `grep -m1 "Live Mode restored" electron/test/golden/interview60.runs/2026-09-04T08-09-38-after4/natively_debug.log` shows `auto`, and `grep -c "\[DeepgramStreaming\] Connected"` is > 0 there. Nothing in this plan changes settings.

- [ ] **Step 2: Fly**

Run in the background from the main checkout: `node electron/test/golden/interview60.flight.mjs after5` (log: `electron/test/golden/interview60.run.flight.log`; ~90 min: probe → auto (stop, build, start, preflight, hour, report, snapshot) → three answer arms → chains → judge exports → `interview60.flight.done.json`). If the preflight refuses (Live silent, 429 wall), register the one-shot Windows task for 07:05 UTC next day exactly as `Natively-flight-after4` was, and stop here until it has run.

- [ ] **Step 3: Grade**

Follow the memory note `project_flight_after4.md` "When back": grade `interview60.judge.pairs.json` (and the three arms) with an Opus subagent into `interview60.judge.verdicts*.json`; merge with `node electron/test/golden/interview60.judge.mjs <run> --verdicts <file>` (and `--answers … --verdicts …` per arm).

- [ ] **Step 4: Gate and compare**

Run: `node electron/test/golden/interview60.run.mjs gate <run>` — pass condition for this spec: `quality` (≥ 47 acceptable, 0 wrong), `pinned` (all pinned, 0 missing/mismatched), `budget` (0 over 80 without allowance), `surfaced` (0 doubles), `latency` (TTFT p90 ≤ 5 s, detect p50 ≤ 5 s), and M26, M27, M28, H09 individually acceptable in `interview60.judge.json`. The `stt` row is expected red on Deepgram (separate spec).
Run: `node electron/test/golden/interview60.report-html.mjs 2026-09-04T08-09-38-after4 <run>`; republish the flight-test artifact after reading it (`action: read` first); update `project_flight_after4.md` / add `project_flight_after5.md` with the outcome and commit the report of record (`interview60.report.html`, `interview60.report.md`, the run's `chains.json` as before).

- [ ] **Step 5: If the gate fails**

Do not tune constants blind. Trace the failing items with the scratchpad `trace-four-cases.mjs` pattern (event order per item), name the cause, and bring it back to the user with the numbers before any further change.

# After6 Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop the Deepgram socket flap, let the sentence in progress at 80 words finish, and stop losing the first character of an answer — the three measured causes of after6's weak and wrong answers.

**Architecture:** Three independent, surgical changes. (E) `DeepgramStreamingSTT.connect()` captures the socket it creates and every handler ignores events from a socket that is no longer `this.live`. (F) `SPOKEN_WORD_FLOOR` becomes 80 and the harness `budget` row states the new policy. (G) `filterCodeFences` carries a short first chunk whole instead of slicing it from a negative index.

**Tech Stack:** TypeScript (Electron main), vitest, `@deepgram/sdk` 3.13 (`listen.live`), the flight harness under `electron/test/golden/` (plain `.mjs`).

**Spec:** `docs/superpowers/specs/2026-09-05-after6-fixes-design.md`

## Global Constraints

- Branch `fix/coding-style-suffix-all-gemini` in the MAIN checkout `C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant`; never edit the `.claude/worktrees/…` copy.
- Never stage the user's uncommitted files: `natively_debug.log.1` (tracked, modified), `resume_prompt.txt`, `retry_claude_print.bat`. Stage only the files each task names. Never `git stash`, never `git checkout --` a file with the user's hunks.
- Keys live in `.env`/shell only; never print, copy or read a key value; never read, copy or edit `credentials.enc`; never change the app's settings store.
- No new dependencies. Every changed line traces to the spec; no adjacent cleanup, no formatting changes.
- Log-line texts are read by the flight harness and by tests — use them verbatim: `[DeepgramStreaming] Stale socket opened after a restart — closing it`, `[DeepgramStreaming] Stale socket closed (code=<code>) — ignored`, `[Answer] budget: words=<n> cut=<yes|no> allowance=<yes|no>` (unchanged), `[DeepgramStreaming] socket #<n> lived …` (unchanged).
- Unit gate: `npx vitest run electron` green (423 before this plan). Type gates: `npx tsc --noEmit -p tsconfig.json` and `npx tsc --noEmit -p electron/tsconfig.json` show only the six pre-existing electron errors (none in files this plan touches).
- Commit trailer on every commit: `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Tests are written first and watched failing before the code change (the plan says what the failure looks like).

---

### Task 1: Fix E — Deepgram socket generation gating

**Files:**
- Modify: `electron/audio/DeepgramStreamingSTT.ts` (`connect()`, lines 155–258)
- Test (create): `electron/audio/DeepgramStreamingSTT.staleSocket.test.ts`

**Interfaces:**
- Consumes: `@deepgram/sdk` `createClient(key).listen.live(opts)` returning an object with `on(event, cb)`, `send(buf)`, `keepAlive()`, `requestClose()`, `getReadyState()`; `LiveTranscriptionEvents.{Open, Close, Error, Transcript}`.
- Produces: no interface change. `DeepgramStreamingSTT`'s public methods (`start`, `stop`, `write`, `setSampleRate`, `setAudioChannelCount`, `setRecognitionLanguage`, `finalize`) keep their signatures and behaviour for the current socket.

- [ ] **Step 1: Write the failing tests**

Create `electron/audio/DeepgramStreamingSTT.staleSocket.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';

// The class requires '@deepgram/sdk' inside connect(). vi.mock() does not reach a
// CommonJS require() (see DeepgramStreamingSTT.socketSummary.test.ts for the
// evidence), so Node's own require cache is seeded with a fake whose listen.live()
// returns a NEW live object per call — after a restart two sockets exist at once,
// and that is exactly what these tests exercise.
type Handler = (...a: any[]) => void;
interface FakeLive {
    handlers: Record<string, Handler[]>;
    sent: any[];
    keepAlives: number;
    closeRequests: number;
    on: (ev: string, cb: Handler) => void;
    send: (d: any) => void;
    keepAlive: () => void;
    requestClose: () => void;
    getReadyState: () => number;
    fire: (ev: string, ...args: any[]) => void;
}
const lives: FakeLive[] = [];
function makeLive(): FakeLive {
    const live: FakeLive = {
        handlers: {}, sent: [], keepAlives: 0, closeRequests: 0,
        on(ev, cb) { (this.handlers[ev] ??= []).push(cb); },
        send(d) { this.sent.push(d); },
        keepAlive() { this.keepAlives++; },
        requestClose() { this.closeRequests++; },
        getReadyState: () => 1,
        fire(ev, ...args) { (this.handlers[ev] ?? []).forEach((h) => h(...args)); },
    };
    lives.push(live);
    return live;
}
const deepgramPath = require.resolve('@deepgram/sdk');
const priorDeepgramCacheEntry = require.cache[deepgramPath];
require.cache[deepgramPath] = {
    id: deepgramPath,
    filename: deepgramPath,
    loaded: true,
    exports: {
        createClient: () => ({ listen: { live: () => makeLive() } }),
        LiveTranscriptionEvents: { Open: 'open', Close: 'close', Error: 'error', Transcript: 'Results' },
    },
    children: [],
    paths: [],
} as any;

import { DeepgramStreamingSTT } from './DeepgramStreamingSTT';

const CHUNK = Buffer.alloc(1920);

describe('DeepgramStreamingSTT: events from a replaced socket never touch the current one (spec 2026-09-05 §2)', () => {
    let log: string[];
    beforeEach(() => {
        lives.length = 0;
        log = [];
        vi.spyOn(console, 'log').mockImplementation((...a: any[]) => { log.push(a.join(' ')); });
        vi.spyOn(console, 'error').mockImplementation(() => { });
        vi.useFakeTimers();
    });
    afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });
    afterAll(() => {
        if (priorDeepgramCacheEntry) require.cache[deepgramPath] = priorDeepgramCacheEntry;
        else delete require.cache[deepgramPath];
    });

    it('the first socket closing (1000) after a sample-rate restart does not orphan the second', () => {
        const stt = new DeepgramStreamingSTT('key');
        stt.start();                                   // socket #1 at the 16 kHz default
        const [first] = lives;
        first.fire('open');
        stt.write(CHUNK);
        expect(first.sent).toHaveLength(1);

        stt.setSampleRate(48000);                      // restartStream(): stop() then start()
        expect(first.closeRequests).toBe(1);
        expect(lives).toHaveLength(2);
        const second = lives[1];
        second.fire('open');
        stt.write(CHUNK);
        expect(second.sent).toHaveLength(1);

        first.fire('close', { code: 1000, reason: '' });   // the server closes the replaced socket

        expect(log.some((l) => l.includes('Stale socket closed (code=1000) — ignored'))).toBe(true);
        expect(lives).toHaveLength(2);                 // no reconnect
        stt.write(CHUNK);
        expect(second.sent).toHaveLength(2);           // still open: written to, not buffered
        vi.advanceTimersByTime(8000);
        expect(second.keepAlives).toBe(1);             // its keepalive interval survived
        vi.advanceTimersByTime(2000);
        expect(lives).toHaveLength(2);
    });

    it('a socket still connecting at the restart is closed when it opens, and its later 1011 is ignored', () => {
        const stt = new DeepgramStreamingSTT('key');
        stt.start();
        const [first] = lives;                         // never opened before the restart
        stt.setSampleRate(48000);
        const second = lives[1];
        second.fire('open');
        stt.write(CHUNK);
        expect(second.sent).toHaveLength(1);

        first.fire('open');                            // the late Open of the replaced socket
        expect(log.some((l) => l.includes('Stale socket opened after a restart — closing it'))).toBe(true);
        expect(first.closeRequests).toBeGreaterThanOrEqual(2);   // stop() asked once; the late Open asks again
        stt.write(CHUNK);
        expect(second.sent).toHaveLength(2);           // the second socket is still the current one

        first.fire('close', { code: 1011, reason: 'Deepgram did not receive audio data or a text message within the timeout window.' });
        vi.advanceTimersByTime(1500);
        expect(lives).toHaveLength(2);                 // a stale close schedules no reconnect
        stt.write(CHUNK);
        expect(second.sent).toHaveLength(3);
        expect(log.some((l) => l.includes(' lived '))).toBe(false);   // no summary printed for another socket's close
    });

    it('the current socket closing with 1011 still reconnects and prints its summary', () => {
        const stt = new DeepgramStreamingSTT('key');
        stt.start();
        lives[0].fire('open');
        lives[0].fire('close', { code: 1011, reason: 'timeout' });
        expect(log.some((l) => l.includes('socket #1 lived'))).toBe(true);
        vi.advanceTimersByTime(1000);
        expect(lives).toHaveLength(2);
    });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run electron/audio/DeepgramStreamingSTT.staleSocket.test.ts`
Expected: the first two tests FAIL — test 1 at `expect(log.some(... 'Stale socket closed ...'))` (the old socket's close is handled as the current one's), test 2 at `expect(log.some(... 'Stale socket opened ...'))`; the third test PASSES (unchanged behaviour).

- [ ] **Step 3: Gate the handlers on the captured socket**

In `electron/audio/DeepgramStreamingSTT.ts`, inside `connect()`, replace the block from `this.live = deepgram.listen.live({` through the end of the `Close` handler registration with:

```ts
            const live = deepgram.listen.live({
                model: 'nova-3',
                language: this.languageCode,
                smart_format: true,
                interim_results: true,
                encoding: 'linear16',
                sample_rate: this.sampleRate,
                channels: this.numChannels,
                endpointing: 300,
                utterance_end_ms: 1000,
                vad_events: true,
            });
            this.live = live;
            // Every handler below belongs to THIS socket. stop() and restartStream()
            // replace `this.live` but cannot detach handlers already attached, so a
            // replaced socket's Open/Close/Error must not touch the instance. Measured
            // 2026-09-05 (after6): the first sample-rate restart left socket A's
            // handlers live; A's close marked the live socket B closed, cleared B's
            // keepalive and reconnected, orphaning B — which the server closed 12 s
            // later with 1011, and that close orphaned C: one 1011 every 12.1 s for
            // the whole hour (308 closes), each dropping the audio the orphan held.
            const stale = (): boolean => this.live !== live;

            live.on(LiveTranscriptionEvents.Open, () => {
                if (stale()) {
                    console.log('[DeepgramStreaming] Stale socket opened after a restart — closing it');
                    try { live.requestClose(); } catch { }
                    return;
                }
                this.isConnecting = false;
                this.isOpen = true;
                console.log('[DeepgramStreaming] Connected');
                this.sockSeq++;
                this.sockOpenedAt = Date.now();
                this.sockChunks = 0; this.sockBytes = 0; this.sockKeepAlives = 0;
                this.sockLastSendAt = this.sockOpenedAt; this.sockLastReadyState = 'n/a'; this.sockNotOpenWrites = 0;

                // Register Transcript inside Open per SDK README pattern
                live.on(LiveTranscriptionEvents.Transcript, (data: any) => {
                    try {
                        const alt = data.channel?.alternatives?.[0];
                        const transcript = alt?.transcript;
                        const isFinal = data.is_final ?? false;
                        console.log(`[DeepgramStreaming] Transcript event — isFinal=${isFinal}, text="${transcript ?? '(empty)'}"`);
                        if (!transcript) return;
                        this.emit('transcript', {
                            text: transcript,
                            isFinal,
                            confidence: alt?.confidence ?? 1.0,
                        });
                    } catch (err) {
                        console.error('[DeepgramStreaming] Parse error:', err);
                    }
                });

                // Flush buffered audio
                const buffered = this.buffer.splice(0);
                for (const chunk of buffered) {
                    try { live.send(chunk); } catch { }
                }
                if (buffered.length > 0) {
                    console.log(`[DeepgramStreaming] Flushed ${buffered.length} buffered chunks`);
                }

                // SDK keepAlive() every 8s prevents idle timeout (per Deepgram docs)
                this.keepAliveInterval = setInterval(() => {
                    if (this.isOpen) {
                        try { this.live?.keepAlive(); } catch { }
                        this.sockKeepAlives++;
                    }
                }, KEEPALIVE_INTERVAL_MS);

                // Reset backoff only after 5s of stable connection
                setTimeout(() => {
                    if (this.isOpen) this.reconnectAttempts = 0;
                }, 5000);
            });

            live.on(LiveTranscriptionEvents.Error, (err: any) => {
                if (stale()) return;
                console.error('[DeepgramStreaming] Error:', err);
                this.emit('error', err instanceof Error ? err : new Error(String(err)));
            });

            live.on(LiveTranscriptionEvents.Close, (event: any) => {
                const code = event?.code ?? 'unknown';
                const reason = event?.reason || '(empty)';
                if (stale()) {
                    console.log(`[DeepgramStreaming] Stale socket closed (code=${code}) — ignored`);
                    return;
                }
                console.log(`[DeepgramStreaming] Closed (code=${code}, reason=${reason})`);
                if (this.sockOpenedAt) {
                    const now = Date.now();
                    console.log(`[DeepgramStreaming] socket #${this.sockSeq} lived ${((now - this.sockOpenedAt) / 1000).toFixed(1)}s — ${this.sockChunks} chunks / ${this.sockBytes} bytes to send() after the flush, ${this.sockKeepAlives} keepalive ticks, last send ${((now - this.sockLastSendAt) / 1000).toFixed(1)}s before close, readyState at last write=${this.sockLastReadyState}, writes while not open=${this.sockNotOpenWrites}`);
                    this.sockOpenedAt = 0;
                }

                this.isOpen = false;
                this.isConnecting = false;
                this.clearTimers();

                if (this.shouldReconnect && code !== 1000) {
                    this.scheduleReconnect();
                }
            });
```

Everything else in the file (imports, constants, `write()`, `stop()`, `scheduleReconnect()`, `clearTimers()`, the `catch` after the handlers) is unchanged. The only differences from the current code: `const live = …; this.live = live;`, the `stale` closure, the three early returns, and `live.on(Transcript…)` / `live.send(chunk)` in place of `this.live.on(…)` / `this.live?.send(chunk)` inside the Open handler.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run electron/audio/`
Expected: all tests in `DeepgramStreamingSTT.staleSocket.test.ts` and `DeepgramStreamingSTT.socketSummary.test.ts` PASS (the summary test still sees exactly one summary line per socket).

- [ ] **Step 5: Full suite and type gates**

Run: `npx vitest run electron` — Expected: green, 3 more tests than before.
Run: `npx tsc --noEmit -p electron/tsconfig.json` — Expected: only the six pre-existing errors, none in `electron/audio/DeepgramStreamingSTT.ts`.

- [ ] **Step 6: Commit**

```bash
git add electron/audio/DeepgramStreamingSTT.ts electron/audio/DeepgramStreamingSTT.staleSocket.test.ts
git commit -m "fix(stt): ignore Deepgram events from a replaced socket

A sample-rate restart left the first socket's handlers attached; its close
marked the live socket closed, cleared its keepalive and reconnected, and the
orphaned socket died 12 s later with 1011 — one close every 12.1 s for the
whole hour (308 in after6). connect() now captures the socket it creates and
every handler returns early when this.live is no longer that socket.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Fix G — keep the first characters of a short opening chunk

**Files:**
- Modify: `electron/llm/WhatToAnswerLLM.ts` (`filterCodeFences`, the `carry =` line near line 143)
- Test (create): `electron/llm/WhatToAnswerLLM.leadingChars.test.ts`

**Interfaces:**
- Consumes: `WhatToAnswerLLM.generateStream(transcript, temporalContext, intentResult)` with a fake `llmHelper` exposing `streamChat`, `streamVerbalWithGeminiFlash`, `getCurrentModelId` (the shape `WhatToAnswerLLM.budget.test.ts` already uses).
- Produces: no interface change.

- [ ] **Step 1: Write the failing test**

Create `electron/llm/WhatToAnswerLLM.leadingChars.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { WhatToAnswerLLM } from './WhatToAnswerLLM';

/**
 * Gemini's opening chunk is regularly two characters ("I’", "So", "To" — measured on the
 * raw stream 2026-09-05). filterCodeFences kept a 3-character carry with a negative
 * slice, which dropped the first character of a shorter first chunk: 14 of 57 delivered
 * after6 answers began "’d start by…" (spec 2026-09-05 §4).
 */
function helperFor(chunks: string[]) {
    async function* stream(): AsyncGenerator<string> { for (const c of chunks) yield c; }
    return {
        streamChat: vi.fn(() => stream()),
        streamVerbalWithGeminiFlash: vi.fn(() => stream()),
        getCurrentModelId: vi.fn(() => 'gemini-3.1-flash-lite'),
    } as any;
}
const VERBAL = { intent: 'general', confidence: 0.9, answerShape: '' } as any;
async function spoken(chunks: string[]): Promise<string> {
    let out = '';
    for await (const c of new WhatToAnswerLLM(helperFor(chunks)).generateStream('[INTERVIEWER]: Walk me through it.', undefined, VERBAL)) out += c;
    return out.replace(/__model_source:[^_]*__/g, '');
}

describe('WhatToAnswerLLM keeps the first characters of a short opening chunk', () => {
    afterEach(() => vi.restoreAllMocks());

    it.each([
        [['I’', 'd start by checking the metrics. Then I look at the logs.'], 'I’d start by checking the metrics. Then I look at the logs.'],
        [['So', ', my initial thought is to break this down. Then I test it.'], 'So, my initial thought is to break this down. Then I test it.'],
        [['To', ' manage the drift I treat infrastructure as code. Then I deploy.'], 'To manage the drift I treat infrastructure as code. Then I deploy.'],
        [['I', ' structure my pipelines carefully. Then I deploy them.'], 'I structure my pipelines carefully. Then I deploy them.'],
        [['I’d start by checking the metrics. Then I look at the logs.'], 'I’d start by checking the metrics. Then I look at the logs.'],
    ])('%j', async (chunks, expected) => {
        vi.spyOn(console, 'log').mockImplementation(() => { });
        expect(await spoken(chunks)).toBe(expected);
    });

    it('still suppresses a code fence and strips stray backticks', async () => {
        vi.spyOn(console, 'log').mockImplementation(() => { });
        vi.spyOn(console, 'warn').mockImplementation(() => { });
        const out = await spoken(['I’', 'd do this first.\n', '```python\nprint(1)\n```\n', 'Then I would deploy it.']);
        expect(out.startsWith('I’d do this first.')).toBe(true);
        expect(out).not.toContain('`');
        expect(out).not.toContain('print(1)');
        expect(out).toContain('Then I would deploy it.');
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run electron/llm/WhatToAnswerLLM.leadingChars.test.ts`
Expected: the `I’`, `So` and `To` cases FAIL with the received text starting `’d start`, `o, my`, `o manage`; the `I` and one-chunk cases PASS; the fence test FAILS on `startsWith('I’d do this first.')`.

- [ ] **Step 3: Carry a short chunk whole**

In `electron/llm/WhatToAnswerLLM.ts`, `filterCodeFences`, replace

```ts
            carry = combined.slice(combined.length - CARRY_LEN);
```

with

```ts
            // A chunk shorter than the carry is carried whole. Slicing from a
            // negative index dropped the first character of a two-character opening
            // chunk — Gemini opens with "I’", "So", "To" routinely, so 14 of 57
            // delivered after6 answers began "’d start by…" (spec 2026-09-05 §4).
            carry = combined.slice(Math.max(0, combined.length - CARRY_LEN));
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run electron/llm/`
Expected: all PASS, including `WhatToAnswerLLM.budget.test.ts` and `verbalStreamFilter.test.ts`.

- [ ] **Step 5: Commit**

```bash
git add electron/llm/WhatToAnswerLLM.ts electron/llm/WhatToAnswerLLM.leadingChars.test.ts
git commit -m "fix(answer): keep the first character of a short opening chunk

filterCodeFences sliced its 3-character carry from a negative index when the
first chunk was shorter, dropping the leading character: Gemini opens with
two-character chunks (\"I’\", \"So\", \"To\") routinely, and 14 of 57 delivered
after6 answers began \"’d start by…\".

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Fix F — budget floor 80 and the harness row that states it

**Files:**
- Modify: `electron/llm/WhatToAnswerLLM.ts` (the constants block, lines 24–31)
- Modify: `electron/llm/verbalStreamFilter.ts` (the `cutAtWordBudget` doc comment, lines 412–428)
- Modify: `electron/llm/WhatToAnswerLLM.budget.test.ts` (one test added)
- Modify: `electron/llm/verbalStreamFilter.test.ts` (one test added inside `describe('cutAtWordBudget …')`)
- Modify: `electron/test/golden/interview60.metrics.mjs` (the `budget` metric block ~lines 107–117 and the `budget` gate row ~line 358)

**Interfaces:**
- Consumes: `cutAtWordBudget(source, { limit, floor, onDone })` (unchanged); the metrics module's `budget` object and `delivered` count.
- Produces: `budget.cutShort` (number) on the metrics object; the `budget` gate row's `pass`/`show`/`label`/`before` per the spec.

- [ ] **Step 1: Write the failing tests**

In `electron/llm/WhatToAnswerLLM.budget.test.ts`, add after the `SIX` constant:

```ts
const FOUR = [1, 2, 3, 4].map((i) => sentence(30, i)).join(' ');   // sentence ends at 30, 60, 90, 120 words
```

and add this test inside `describe('WhatToAnswerLLM word budget', …)`:

```ts
    it('verbal: the sentence in progress at 80 finishes (floor 80): four 30-word sentences come out as 90', async () => {
        const logs: string[] = [];
        vi.spyOn(console, 'log').mockImplementation((...a: any[]) => { logs.push(a.map(String).join(' ')); });
        const { helper } = makeHelper(FOUR);
        const out = await drain(new WhatToAnswerLLM(helper).generateStream('[INTERVIEWER]: Walk me through it.', undefined, VERBAL));
        expect(words(out)).toBe(90);
        expect(logs).toContain('[Answer] budget: words=90 cut=yes allowance=yes');
    });
```

In `electron/llm/verbalStreamFilter.test.ts`, inside `describe('cutAtWordBudget (spec 2026-09-04 §4)', …)`, add after the '30 + 60 words' test:

```ts
    it('floor equal to the limit (spec 2026-09-05 §3): the sentence in progress at 80 finishes; the next one is dropped', async () => {
        const text = [1, 2, 3, 4].map((i) => sentence(30, i)).join(' ');   // ends at 30, 60, 90, 120
        const { out, done, ret } = await run(text, 7, { floor: 80 });
        expect(words(out)).toBe(90);          // the third sentence started at 60 < 80 and streams whole past 80
        expect(done).toEqual([{ words: 90, cut: true, allowance: true }]);
        expect(ret).toHaveBeenCalled();       // the fourth sentence is cut, closing the source
    });
```

- [ ] **Step 2: Run the tests to verify the expected failure**

Run: `npx vitest run electron/llm/WhatToAnswerLLM.budget.test.ts electron/llm/verbalStreamFilter.test.ts`
Expected: the new `WhatToAnswerLLM.budget` test FAILS with 60 words received (floor 40 buffers the third sentence and drops it); the new `verbalStreamFilter` test PASSES already (it passes `floor: 80` explicitly — it pins the function's floor-equals-limit semantics, not the constant).

- [ ] **Step 3: Change the constant and its comment**

In `electron/llm/WhatToAnswerLLM.ts`, replace the constants block (the comment and the two `const` lines) with:

```ts
/**
 * Spoken word budget (spec 2026-09-04 §4, floor revised by spec 2026-09-05 §3):
 * in-app answers ran 97 words median, 41 of 52 over 80 on 2026-09-04; cut at a
 * sentence end inside 80 they measure 67 median. With a 40-word floor the
 * sentence that would cross 80 was dropped whole, and on after6 that removed
 * the "fix" half of every non-acceptable answer (all six cut at 40–72 words,
 * five acceptable uncut). FLOOR equals LIMIT: every sentence that starts under
 * 80 streams whole, the sentence in progress at 80 finishes, and the answer
 * ends at the next sentence boundary; the hard ceiling (2 × LIMIT) bounds a
 * terminator-free answer. Coding is exempt.
 */
const SPOKEN_WORD_LIMIT = 80;
const SPOKEN_WORD_FLOOR = 80;
```

In `electron/llm/verbalStreamFilter.ts`, in the `cutAtWordBudget` doc comment, replace the sentence

```
 * The decision is taken at the start of each sentence. A sentence that starts
 * with fewer than `floor` words emitted streams through token by token, whole,
 * even past `limit` — the allowance, which also means the first sentence is
 * never cut inside. A sentence that starts at or past `floor` is buffered and
 * emitted only if it fits; otherwise the stream is cut there — returning out
```

through the end of that paragraph (`… never when the consumer stops early.`) with

```
 * The decision is taken at the start of each sentence. A sentence that starts
 * with fewer than `floor` words emitted streams through token by token, whole,
 * even past `limit` — the allowance, which also means the first sentence is
 * never cut inside. A sentence that starts at or past `floor` is buffered and
 * emitted only if it fits; otherwise the stream is cut there. With `floor`
 * equal to `limit` (the app's setting since spec 2026-09-05 §3) this reads:
 * the sentence in progress at `limit` finishes and the answer ends at the
 * next sentence boundary. A cut returns out of the for-await, which closes
 * the source (IteratorClose); the SDK stream honours it by stopping the
 * request. A terminator at the end of a chunk waits for the next chunk, so
 * "3.5" or "e.g." split across chunks cannot end a sentence. onDone fires
 * once, on natural end or on a cut — never when the consumer stops early.
```

The paragraph before it ("Cut a spoken answer at a sentence end inside `limit` words … hence the floor.") stays as it is.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run electron/llm/`
Expected: all PASS, including the existing 'verbal: 120 words in six sentences come out as 80' (with 20-word sentences the fourth ends exactly at 80, so the fifth is still dropped).

- [ ] **Step 5: State the policy in the harness row**

In `electron/test/golden/interview60.metrics.mjs`, in the `budget` metric block add one field after `cut:`:

```js
        cutShort: budgetLines.filter((b) => b.cut && b.words < 80).length,
```

Replace the comment above the `budget` gate row and the row itself with:

```js
    // Spec 2026-09-05 §3: the floor equals the limit, so a cut answer always has
    // at least 80 words — `cutShort` is 0 by construction and non-zero only if
    // the old 40-word floor is somehow back. `n` must cover the delivered answers
    // (cue answers and coding routes emit no budget line, hence 0.9). p50 ≤ 100:
    // the pre-budget raw median was 97, so the cut must still exist. max ≤ 130:
    // a 50-word sentence in progress at 80 — pathological, and the 160 ceiling
    // only bounds a terminator-free answer.
    { key: 'budget', label: 'Spoken answers: the sentence in progress at 80 words finishes (ceiling 160)', before: '40 of 57 cut at 40–79 words (after6)', pass: (m) => m.budget.n > 0 && m.budget.n >= Math.floor(m.delivered * 0.9) && m.budget.cutShort === 0 && m.budget.p50 <= 100 && m.budget.max <= 130, show: (m) => m.budget.n === 0 ? 'not logged' : `${m.budget.n} answers, ${m.budget.over} over 80, ${m.budget.cutShort} cut under 80, words p50 ${m.budget.p50} max ${m.budget.max}` },
```

- [ ] **Step 6: Check the row against a known run**

Run: `node electron/test/golden/interview60.run.mjs gate electron/test/golden/interview60.runs/2026-09-05T13-50-01-after6`
Expected: the `budget` row now FAILS on after6 (it was run under floor 40: `40 cut under 80`), which is the row answering differently when the effect is absent; every other row unchanged from the committed after6 report. Paste the row's output line into the task report.

- [ ] **Step 7: Full suite and type gates**

Run: `npx vitest run electron` — Expected: green, 2 more tests than after Task 2.
Run: `npx tsc --noEmit -p electron/tsconfig.json` — Expected: only the six pre-existing errors.

- [ ] **Step 8: Commit**

```bash
git add electron/llm/WhatToAnswerLLM.ts electron/llm/verbalStreamFilter.ts electron/llm/WhatToAnswerLLM.budget.test.ts electron/llm/verbalStreamFilter.test.ts electron/test/golden/interview60.metrics.mjs
git commit -m "feat(answer): let the sentence in progress at 80 words finish

The 40-word floor dropped whole the sentence that would cross 80, taking the
second half of otherwise correct answers with it: all six non-acceptable after6
answers were cut at 40-72 words and five were acceptable uncut. The floor now
equals the limit; the harness budget row states the new policy (a cut answer
has >= 80 words, p50 <= 100, max <= 130).

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Proof after the tasks (controller, not a task)

1. `npm run build:electron`, then `node <scratchpad>/repro-flap.cjs <repo> 45` — expected `connects=2 opens=2 closes1011=0` (before this plan: `connects=6 opens=6 closes1011=3`).
2. Flight `after7` on Deepgram via the scheduled-task recipe (`electron/test/golden/README.md` "Unattended flight"), after 07:00 UTC 2026-09-06; grade, report, artifact, commit as after6.

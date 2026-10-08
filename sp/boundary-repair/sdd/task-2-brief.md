### Task 2: Wire the repair into `DeepgramStreamingSTT` — one state per socket, repaired text emitted, raw text still logged

**Files:**
- Modify: `electron/audio/DeepgramStreamingSTT.ts` (import at lines 11–13; a per-socket const after line 198 `const stale = (): boolean => this.live !== live;`; the Transcript handler at lines 214–230)
- Test: `electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts`

**Interfaces:**
- Consumes (from Task 1): `import { createBoundaryRepair } from './deepgramBoundaryRepair';` — `createBoundaryRepair().onTranscript(text: string, isFinal: boolean, atMs: number): { text: string; restored: string[] | null }`; and the fixture file `./deepgramBoundaryRepair.fixtures.json` (its `seam` entry).
- Produces: the `'transcript'` event's `text` is the repaired text; a log line `[DeepgramStreaming] boundary repair: restored "<words>" before "<first 40 chars of the final as received>"` per restore. Event shape `{ text, isFinal, confidence }` and every other log line are unchanged; the repair state lives and dies with its socket.

- [ ] **Step 1: Write the failing adapter test**

Create `MAIN\electron\audio\DeepgramStreamingSTT.boundaryRepair.test.ts` (the multi-socket fake of `DeepgramStreamingSTT.staleSocket.test.ts`, with its `afterAll` restore):

```ts
import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import fixtures from './deepgramBoundaryRepair.fixtures.json';

// The class requires '@deepgram/sdk' inside connect(). vi.mock() does not reach a CommonJS
// require() (see DeepgramStreamingSTT.socketSummary.test.ts for the evidence), so Node's own
// require cache is seeded with a fake whose listen.live() returns a NEW live object per call —
// a restart makes a second socket, and the repair state must not follow it there.
type Handler = (...a: any[]) => void;
interface FakeLive {
    handlers: Record<string, Handler[]>;
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
        handlers: {},
        on(ev, cb) { (this.handlers[ev] ??= []).push(cb); },
        send() { },
        keepAlive() { },
        requestClose() { },
        getReadyState: () => 1,
        fire(ev, ...args) { (this.handlers[ev] ?? []).forEach((h: Handler) => h(...args)); },
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
        LiveTranscriptionEvents: { Open: 'open', Close: 'close', Error: 'error', Transcript: 'Results', SpeechStarted: 'SpeechStarted', UtteranceEnd: 'UtteranceEnd' },
    },
    children: [],
    paths: [],
} as any;

import { DeepgramStreamingSTT } from './DeepgramStreamingSTT';

const results = (transcript: string, isFinal: boolean) => ({ is_final: isFinal, channel: { alternatives: [{ transcript, confidence: 0.9 }] } });

describe('DeepgramStreamingSTT boundary repair (the seam fixture: S2Q07 play 3, the tolerant "RAC" -> "Rag" cut)', () => {
    let log: string[];
    beforeEach(() => {
        lives.length = 0;
        log = [];
        vi.spyOn(console, 'log').mockImplementation((...a: any[]) => { log.push(a.join(' ')); });
        vi.useFakeTimers();
    });
    afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });
    afterAll(() => {
        if (priorDeepgramCacheEntry) require.cache[deepgramPath] = priorDeepgramCacheEntry;
        else delete require.cache[deepgramPath];
    });

    it('emits the repaired final, logs the raw text plus one repair line, and a restarted socket starts with no remembered cut', () => {
        const [I, F1, F2] = fixtures.seam.events;                // atMs 0 / 990 / 4180
        const stt = new DeepgramStreamingSTT('key');
        const seen: { text: string; isFinal: boolean; confidence: number }[] = [];
        stt.on('transcript', (t: any) => seen.push(t));
        stt.start();
        lives[0].fire('open');

        // socket #1 remembers a cut; a sample-rate restart replaces it before the resumption arrives
        lives[0].fire('Results', results(I.text, false));
        vi.advanceTimersByTime(F1.atMs);
        lives[0].fire('Results', results(F1.text, true));
        stt.setSampleRate(48000);                                // restartStream(): stop() + start() -> socket #2
        lives[1].fire('open');
        vi.advanceTimersByTime(F2.atMs - F1.atMs);               // 3190 ms: inside the window, but a fresh socket
        lives[1].fire('Results', results(F2.text, true));

        // the whole sequence on socket #2
        lives[1].fire('Results', results(I.text, false));
        vi.advanceTimersByTime(F1.atMs);
        lives[1].fire('Results', results(F1.text, true));
        vi.advanceTimersByTime(F2.atMs - F1.atMs);
        lives[1].fire('Results', results(F2.text, true));
        lives[1].fire('Results', results('', false));            // empty: still not emitted
        stt.stop();

        expect(seen.map((t) => [t.text, t.isFinal])).toEqual([
            [I.text, false],
            [F1.text, true],
            [F2.text, true],                                     // socket #2's first final: nothing remembered
            [I.text, false],
            [F1.text, true],
            [fixtures.seam.expectedF2, true],                    // 'service over 10,000,000 documents, it has to support document updates'
        ]);
        expect(seen.every((t) => t.confidence === 0.9)).toBe(true);
        expect(log.filter((l) => l.includes('boundary repair:'))).toEqual([
            '[DeepgramStreaming] boundary repair: restored "service" before "over 10,000,000 documents, it has to sup"',
        ]);
        // The event line the harness and the offline scans parse still carries Deepgram's RAW text.
        expect(log.filter((l) => l === `[DeepgramStreaming] Transcript event — isFinal=true, text="${F2.text}"`)).toHaveLength(2);
        expect(log.some((l) => l.includes(`text="${fixtures.seam.expectedF2}"`))).toBe(false);
    });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `TEST electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts`
Expected: FAIL at the first `expect`: the sixth emitted entry is `'over 10,000,000 documents, it has to support document updates'` (no `service `). (The `boundary repair:` filter would also be `[]` — the run stops at the first failed assertion.)

- [ ] **Step 3: Wire the module in — three edits to `DeepgramStreamingSTT.ts`**

(a) Import. After line 13 `import { keytermsFor } from './deepgramKeyterms';` add:

```ts
import { createBoundaryRepair } from './deepgramBoundaryRepair';
```

(b) Per-socket state. After line 198 `            const stale = (): boolean => this.live !== live;` add:

```ts
            // The boundary repair belongs to THIS socket, like the handlers: a restart's new socket
            // starts with no remembered cut, so nothing is ever repaired across a reconnect.
            const boundaryRepair = createBoundaryRepair();
```

(c) The Transcript handler. Replace lines 215–230 — this block:

```ts
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
```

with:

```ts
                live.on(LiveTranscriptionEvents.Transcript, (data: any) => {
                    try {
                        const alt = data.channel?.alternatives?.[0];
                        const transcript = alt?.transcript;
                        const isFinal = data.is_final ?? false;
                        console.log(`[DeepgramStreaming] Transcript event — isFinal=${isFinal}, text="${transcript ?? '(empty)'}"`);
                        if (!transcript) return;
                        // Deepgram sometimes finalizes short of its own interim and resumes one word
                        // later; the word is in no final. Measured 2026-09-29 (25 losses in the
                        // non-holdout logs, 6 of 20 seam plays); the rule lives in deepgramBoundaryRepair.
                        const repaired = boundaryRepair.onTranscript(transcript, isFinal, Date.now());
                        if (repaired.restored) {
                            console.log(`[DeepgramStreaming] boundary repair: restored "${repaired.restored.join(' ')}" before "${transcript.slice(0, 40)}"`);
                        }
                        this.emit('transcript', {
                            text: repaired.text,
                            isFinal,
                            confidence: alt?.confidence ?? 1.0,
                        });
                    } catch (err) {
                        console.error('[DeepgramStreaming] Parse error:', err);
                    }
                });
```

Nothing else in the file changes: the `Transcript event` line is byte-identical and logs the raw text, `stale()` handling, VAD events, flush, keepalive and the Close summary are untouched. Both Deepgram instances (interviewer and candidate mic) get a repair per socket through `connect()`.

- [ ] **Step 4: Run the adapter test to verify it passes**

Run: `TEST electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts`
Expected: `Tests  1 passed (1)`.

- [ ] **Step 5: Prove the per-socket assertion can fail (rule 8), then revert**

Temporarily hoist the state: delete the `const boundaryRepair = createBoundaryRepair();` line from `connect()` and add `private boundaryRepair = createBoundaryRepair();` to the class fields (after line 48 `private sockNotOpenWrites = 0;`), changing the handler's call to `this.boundaryRepair.onTranscript(...)`. Run: `TEST electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts`
Expected: FAIL — the third emitted entry becomes `'service over 10,000,000 documents, it has to support document updates'` (socket #2 repaired with socket #1's cut) and the repair-line filter has 2 entries. Revert both edits exactly (Step 3(b) and the `boundaryRepair.onTranscript` call), run again → `1 passed`.

- [ ] **Step 6: Run the neighbours — nothing else moved**

Run: `TEST electron/audio/` (the whole folder: the four `DeepgramStreamingSTT.*.test.ts`, the module test, `deepgramKeyterms`, `GeminiLiveRouter`, `RestSTT`, `SttChannel`, `energyVad`).
Expected: every file passes; in particular `DeepgramStreamingSTT.socketSummary` 2, `DeepgramStreamingSTT.staleSocket` 6 (its "late final transcript from the replaced socket" test still sees `{ text: 'tail of the last utterance', isFinal: true, confidence: 0.9 }` — that socket's own, empty repair state changes nothing), `DeepgramStreamingSTT.vadEvents` 1, `deepgramBoundaryRepair` 52, `DeepgramStreamingSTT.boundaryRepair` 1. A failure in a file this change does not touch is reported, not fixed.

- [ ] **Step 7: Type-check both projects**

Run the two tsc commands from Global Constraints.
Expected: root — no output, exit 0. Electron — exactly the 6 baseline errors; none in `DeepgramStreamingSTT.ts`, the module, or either test.

- [ ] **Step 8: Report — no commit**

Do not run git. Report the changed paths for the controller to commit:
- `electron/audio/DeepgramStreamingSTT.ts` (modified: 1 import, 1 per-socket const in `connect()`, the Transcript handler)
- `electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts` (new)

and quote the Step 2 failure, the Step 5 failure-and-revert, the Step 4/6 counts and the tsc results. State what the tests did NOT exercise: a real socket, the built `dist-electron` output (the harness contract `createBoundaryRepair` / `onTranscript` / `.text` is only exercised by the controller's replay), and the mic instance (same code path, never fired in a test).

---


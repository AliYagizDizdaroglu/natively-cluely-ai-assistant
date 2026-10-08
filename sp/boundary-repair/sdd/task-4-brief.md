# Brief (extracted from PLAN-v4.md; the spec is DESIGN-v4.md in the same folder)

**Paths.** `MAIN = C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant`, branch `fix/coding-style-suffix-all-gemini`, HEAD `e78f7c7` (confirm by reading the plain file `MAIN\.git\HEAD`: `ref: refs/heads/fix/coding-style-suffix-all-gemini`). `SP = C:\Users\sotka\AppData\Local\Temp\claude\C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant--claude-worktrees-nifty-lederberg-49681a\9c5886c7-cdbd-48af-b8bc-e9275012ec64\scratchpad`; `BR = SP\boundary-repair`. Starting sizes (bytes) the implementer must see before editing: `deepgramBoundaryRepair.ts` 5,940 (sha256 prefix 4653b898), `deepgramBoundaryRepair.test.ts` 7,691 (c57ef099), `DeepgramStreamingSTT.ts` 14,831 (9584012e), `DeepgramStreamingSTT.boundaryRepair.test.ts` 5,096 (4a2b34ec), `deepgramKeyterms.ts` 5,404, `deepgramKeyterms.test.ts` 2,846, `interview60.turns-fixture.mjs` 5,485. A different size means another session touched the file: stop and report.

## Global Constraints

- Test-first: each new test is watched failing (against the CURRENT tree: the v3 module in Task 3, the v3 wiring in Task 4, a missing module then the old parse in Task 5) before the code that makes it pass. Quote each RED and GREEN count.
- The one test command, `TEST <file>` (PowerShell form; the Bash compound form was refused by the session guard):

  ```powershell
  Set-Location $env:TEMP; cmd /c "npx --prefix ""C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant"" vitest run --root ""C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant"" <file>"
  ```
  `<file>` is a repo-relative path (vitest matches it as a substring: `electron/audio/DeepgramStreamingSTT` runs every `DeepgramStreamingSTT.*.test.ts`). Never run the full suite.
- Writes into MAIN: the Write/Edit tools refuse MAIN paths. Every MODIFIED file is edited on a staged copy under `BR\stage\<MAIN-relative path>` that is seeded from MAIN's CURRENT content first: run `node BR\seed-stage.mjs` once before Task 3 (it byte-copies the 7 files this plan modifies — `electron/audio/deepgramBoundaryRepair.ts`, `deepgramBoundaryRepair.test.ts`, `DeepgramStreamingSTT.ts`, `DeepgramStreamingSTT.boundaryRepair.test.ts`, `deepgramKeyterms.ts`, `deepgramKeyterms.test.ts`, `electron/test/golden/interview60.turns-fixture.mjs` — and prints size + sha256 of source and copy, all IDENTICAL; it was run at plan time with the sizes listed under Paths). It copies MAIN INTO the stage, so it is NEVER re-run after a step's "temporarily change … then revert": a revert re-applies the step's own edit to the staged copy (Task 4 Step 6: edit 4(b)'s text again) and copies that in; re-seeding after the temporary file had been copied into MAIN would bring the mutant back. NEW files (`interview60.turns-finals.mjs`, `interview60.turns-finals.test.ts`) are created in the stage. Every staged file goes into MAIN with `node SP\copy-into-main.mjs <staged file> <MAIN-relative path> [--overwrite]` (prints sizes and sha256 of source and copy; refuses CR bytes; `--overwrite` only for the 7 modified files). LF only, UTF-8. No git command of any kind; never read `.env` or any key.
- Type-check both projects after each task, exactly as PLAN.md's Global Constraints state (root: no output; electron: exactly the 6 baseline errors listed there, none in a file this plan touches).
- v4 numbers for comments and constants (they supersede v3's): window 5,000 ms from the observed max repaired gap 3,715 ms (logs; 3,115 holdout; 3,207 seam), NORMAL cuts reach 7,835 ms (12 of 527 past 5,000); k <= 2 from 1 loss of 2 words and 25 of 1; m = min(2, available); "25 repaired losses, all 25 true to the script (the measured precision; 25 is a floor on the number of losses)", never "25 losses"; holdout 4 / 4 TRUE "not an independent validation", and no holdout count as evidence for any choice; tolerant-cut evidence is NON-HOLDOUT only: 42 cuts, 34 kept, 7 refused as longer, 1 digit, 0 first letter; seam 6 repairs of 15 boundary losses (4 of 6, then 2 of 9 of which 4 had no interim evidence).
- The module must reproduce `rule-v4.mjs` event for event: the tolerant cut requires `isRespelling(F1's last token, I's token at that index)` = same first letter, no digit, `final.length <= interim.length`; no cut when the interim holds a non-ASCII letter (`NON_ASCII_LETTER = /(?![\x00-\x7F])[\p{L}\p{M}]/u`, review M2) — this subsumes the reference's `rawTok(I).length === tok(I).length` line, which the SHIPPED module OMITS (re-review M-a: with ASCII letters only, both tokenisers split the text identically, so the line is unreachable; `rule-v4.mjs` keeps it, behaviour identical); no cut when `speechFinal` is true on F1; `clear()` nulls both the cut and the latest interim; everything else exactly as v3 (window `<=` 5000 from F1's arrival, k = 1..2 with k < |T|, m = min(2, |T| - k), first k wins, `Traw.slice(0, k)`, `cut = null` before the new-cut check, `lastInterim = null` after every final). Export shape unchanged plus `clear()`; `onTranscript(text, isFinal, atMs, speechFinal?)`.
- The existing 58 module tests and the existing adapter test stay green with no expectation changed. If a v4 change would make one fail, STOP and report it: the design says it must not (check-v4 reproduces all 45 fixtures and every existing edge is either strict or a same-length re-spelling).
- The `Transcript event — isFinal=…, text="…"` log line stays byte-identical (RAW text); the `boundary repair:` line format stays byte-identical and is written on the very next line by the same synchronous handler (Task 5 relies on it).
- Holdout runs (folder names containing `h40`) are never fixtures; the only holdout sequence in the tests is `fixtures.symptom` (R22), the reproduction of the reported defect.
- Each task ends by listing the exact changed paths and the RED/GREEN counts; no commit (the controller commits).

---

### Task 4: The adapter — English gate, pauses, `speech_final`, corrected comment

**Files:**
- Modify: `electron/audio/deepgramKeyterms.ts` (lines 80-89: `isEnglishLanguage` exported, `keytermsFor` uses it)
- Modify: `electron/audio/deepgramKeyterms.test.ts` (one `describe` appended)
- Modify: `electron/audio/DeepgramStreamingSTT.ts` (import line 13; per-socket const lines 200-202; the Transcript handler lines 219-241; the UtteranceEnd line 247)
- Modify: `electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts` (the `results` helper line 48; a nested `describe` appended inside the existing one)

**Interfaces:**
- Consumes: Task 3's `createBoundaryRepair()` (`onTranscript(text, isFinal, atMs, speechFinal)`, `clear()`).
- Produces: `export function isEnglishLanguage(languageCode: string): boolean` in `deepgramKeyterms.ts` (`/^en(-|$)/i`). Event shape and every existing log line unchanged; on a non-English connection the `'transcript'` event carries the text as received and no `boundary repair:` line is ever logged (the adapter test uses Indonesian, ASCII text the module alone WOULD repair — accented or Cyrillic text is already refused inside the module by Task 3's guard and cannot show the gate).

- [ ] **Step 1: Write the failing tests**

(a) Append to `electron/audio/deepgramKeyterms.test.ts` — change the import on line 2 to `import { DEEPGRAM_KEYTERMS, keytermsFor, isEnglishLanguage } from './deepgramKeyterms';` and append at the end:

```ts
/**
 * The boundary repair (deepgramBoundaryRepair.ts) is English-only too — its tokens are ASCII — and
 * gates on the same predicate, so the two can never disagree about what "English" is.
 */
describe('isEnglishLanguage', () => {
    it('is true for en and regional English, false for every other language and for multi', () => {
        for (const code of ['en', 'en-US', 'en-GB']) expect(isEnglishLanguage(code)).toBe(true);
        for (const code of ['multi', 'es', 'tr', 'es-419', 'ru', 'ja']) expect(isEnglishLanguage(code)).toBe(false);
    });
});
```

(b) In `electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts`, replace line 48

```ts
const results = (transcript: string, isFinal: boolean) => ({ is_final: isFinal, channel: { alternatives: [{ transcript, confidence: 0.9 }] } });
```
with
```ts
const results = (transcript: string, isFinal: boolean, speechFinal = false) => ({ is_final: isFinal, speech_final: speechFinal, channel: { alternatives: [{ transcript, confidence: 0.9 }] } });
```
and insert this nested block immediately before the outer describe's closing `});` (after the existing `it(...)`, which stays byte-identical):

```ts
    describe('v4: pauses forget the cut, speech_final reaches the module, non-English connections pass through (spec review 2026-09-29)', () => {
        const [I, F1, F2] = fixtures.seam.events;                // atMs 0 / 990 / 4180
        const unchanged = [[I.text, false], [F1.text, true], [F2.text, true]];
        const repairs = () => log.filter((l) => l.includes('boundary repair:'));
        /** A started instance on socket #1, recording every emitted transcript as [text, isFinal]. */
        const start = (language?: string) => {
            const stt = new DeepgramStreamingSTT('key');
            if (language) stt.setRecognitionLanguage(language);   // before start(): no restart, just the code
            const seen: [string, boolean][] = [];
            stt.on('transcript', (t: any) => seen.push([t.text, t.isFinal]));
            stt.start();
            lives[0].fire('open');
            return { stt, seen };
        };
        /** Streams the seam fixture with its own timing on socket #1, running `between` right after F1. */
        const playSeam = (between: () => void = () => { }, f1SpeechFinal = false) => {
            lives[0].fire('Results', results(I.text, false));
            vi.advanceTimersByTime(F1.atMs);
            lives[0].fire('Results', results(F1.text, true, f1SpeechFinal));
            between();
            vi.advanceTimersByTime(F2.atMs - F1.atMs);
            lives[0].fire('Results', results(F2.text, true));
        };

        it('an empty FINAL between F1 and F2 is a pause: F2 is emitted as received, no repair line', () => {
            const { stt, seen } = start();
            playSeam(() => lives[0].fire('Results', results('', true)));
            stt.stop();
            expect(seen).toEqual(unchanged);
            expect(repairs()).toEqual([]);
        });

        it('an UtteranceEnd between F1 and F2 is a pause too, and is still re-emitted', () => {
            const { stt, seen } = start();
            const ends: number[] = [];
            stt.on('utterance-end', (e: { at: number }) => ends.push(e.at));
            playSeam(() => lives[0].fire('UtteranceEnd', { type: 'UtteranceEnd', last_word_end: 1.2 }));
            stt.stop();
            expect(seen).toEqual(unchanged);
            expect(ends).toHaveLength(1);
            expect(repairs()).toEqual([]);
        });

        it('speech_final on F1 reaches the module: Deepgram heard the utterance end there, so nothing is restored', () => {
            const { stt, seen } = start();
            playSeam(() => { }, true);
            stt.stop();
            expect(seen).toEqual(unchanged);
            expect(repairs()).toEqual([]);
        });

        it('an empty INTERIM is not a pause: the repair still happens (the control for the three above)', () => {
            const { stt, seen } = start();
            playSeam(() => lives[0].fire('Results', results('', false)));
            stt.stop();
            expect(seen).toEqual([[I.text, false], [F1.text, true], [fixtures.seam.expectedF2, true]]);
            expect(repairs()).toHaveLength(1);
        });

        // Indonesian is written in plain ASCII, so the module's own non-ASCII guard does not refuse it: the rule ALONE
        // would restore "menangani" here (a rule never validated for that language). Only the gate keeps it out.
        // (The reviews' Spanish/Russian probes are refused by the module's guard already, so they cannot test the gate.)
        it('a non-English connection passes every transcript through untouched, with no repair line', () => {
            const { stt, seen } = start('indonesian');            // RECOGNITION_LANGUAGES.indonesian.iso639 = 'id'
            const id = ['bagaimana cara anda menangani data yang hilang di pipeline', 'Bagaimana cara Anda', 'data yang hilang di pipeline?'];
            lives[0].fire('Results', results(id[0], false));
            vi.advanceTimersByTime(100);
            lives[0].fire('Results', results(id[1], true));
            vi.advanceTimersByTime(2000);
            lives[0].fire('Results', results(id[2], true));
            stt.stop();
            expect(log.some((l) => l.includes('lang=id)'))).toBe(true);   // the connection really was Indonesian
            expect(seen).toEqual([[id[0], false], [id[1], true], [id[2], true]]);
            expect(repairs()).toEqual([]);
        });
    });
```

- [ ] **Step 2: Run against the current wiring — the keyterms file cannot collect, 4 of the 6 adapter tests fail**

Run: `TEST electron/audio/deepgramKeyterms.test.ts` — Expected: `Tests  1 failed | 6 passed (7)`, the new one with `TypeError: isEnglishLanguage is not a function` (vite-node resolves a missing named export to undefined); if the runner instead refuses to load the file, that is the same RED. The 6 old tests are untouched.
Run: `TEST electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts` — Expected: `Tests  4 failed | 2 passed (6)`. Failing: "empty FINAL" (third entry received `service over 10,000,000 …`: the empty return never told the module), "UtteranceEnd" (same), "speech_final on F1" (same: the flag is not passed), "non-English" (third entry received `menangani data yang hilang di pipeline?`: no gate yet). Passing: the existing restart test and the "empty INTERIM" control (it passes before and after — it is the calibration of the three pause tests: if the wiring cleared on ANY empty transcript it would fail).

- [ ] **Step 3: The keyterms predicate**

In `electron/audio/deepgramKeyterms.ts` replace lines 80-89

```ts
/**
 * keyterm prompting is a nova-3, English-only parameter. The app switches Deepgram to another
 * language — and to 'multi' — at runtime from the language picker, and sending keyterm on
 * those connections is at best ignored and at worst a 400 that costs the socket. So the list
 * rides only on English sockets, and every other language gets undefined (the caller spreads
 * it, so undefined means the parameter is simply absent).
 */
export function keytermsFor(languageCode: string): readonly string[] | undefined {
    return /^en(-|$)/i.test(languageCode) ? DEEPGRAM_KEYTERMS : undefined;
}
```
with
```ts
/**
 * English (`en`, `en-US`, …) as Deepgram names it; 'multi' and every other code fail it. The one
 * test shared by keyterm prompting (below) and the boundary repair (deepgramBoundaryRepair.ts,
 * DeepgramStreamingSTT.connect): both are built for English transcripts only.
 */
export function isEnglishLanguage(languageCode: string): boolean {
    return /^en(-|$)/i.test(languageCode);
}

/**
 * keyterm prompting is a nova-3, English-only parameter. The app switches Deepgram to another
 * language — and to 'multi' — at runtime from the language picker, and sending keyterm on
 * those connections is at best ignored and at worst a 400 that costs the socket. So the list
 * rides only on English sockets, and every other language gets undefined (the caller spreads
 * it, so undefined means the parameter is simply absent).
 */
export function keytermsFor(languageCode: string): readonly string[] | undefined {
    return isEnglishLanguage(languageCode) ? DEEPGRAM_KEYTERMS : undefined;
}
```

Run: `TEST electron/audio/deepgramKeyterms.test.ts` — Expected: `Tests  7 passed (7)` (the 6 old ones unchanged).

- [ ] **Step 4: Wire the adapter — four edits to `DeepgramStreamingSTT.ts`**

(a) Line 13: replace `import { keytermsFor } from './deepgramKeyterms';` with `import { keytermsFor, isEnglishLanguage } from './deepgramKeyterms';`.

(b) Lines 200-202: replace

```ts
            // The boundary repair belongs to THIS socket, like the handlers: a restart's new socket
            // starts with no remembered cut, so nothing is ever repaired across a reconnect.
            const boundaryRepair = createBoundaryRepair();
```
with
```ts
            // The boundary repair belongs to THIS socket, like the handlers: a restart's new socket
            // starts with no remembered cut, so nothing is ever repaired across a reconnect. English
            // sockets only (the test keytermsFor uses): the rule compares ASCII tokens and mangled
            // Spanish and Turkish text in the 2026-09-29 spec review; any other language, and
            // 'multi', passes through untouched.
            const boundaryRepair = isEnglishLanguage(this.languageCode) ? createBoundaryRepair() : null;
```

(c) Lines 219-241, the Transcript handler: replace

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
with
```ts
                live.on(LiveTranscriptionEvents.Transcript, (data: any) => {
                    try {
                        const alt = data.channel?.alternatives?.[0];
                        const transcript = alt?.transcript;
                        const isFinal = data.is_final ?? false;
                        console.log(`[DeepgramStreaming] Transcript event — isFinal=${isFinal}, text="${transcript ?? '(empty)'}"`);
                        if (!transcript) {
                            // An empty FINAL is a pause (median 187 per flight hour): a cut remembered
                            // before it must not be glued onto the next utterance. Empty interims are
                            // not (they precede the words of every segment).
                            if (isFinal) boundaryRepair?.clear();
                            return;
                        }
                        // Deepgram sometimes finalizes short of its own interim and resumes one word
                        // later; the word is in no final. Measured 2026-09-29: 25 repaired losses in
                        // the non-holdout logs, all 25 true to the script (the measured precision; 25
                        // is a floor on the losses), 6 of 20 seam plays; the rule lives in
                        // deepgramBoundaryRepair. speech_final = Deepgram heard the utterance end at
                        // this final, so it leaves no cut (never logged: its in-app effect is unmeasured).
                        const repaired = boundaryRepair?.onTranscript(transcript, isFinal, Date.now(), data.speech_final === true);
                        if (repaired?.restored) {
                            console.log(`[DeepgramStreaming] boundary repair: restored "${repaired.restored.join(' ')}" before "${transcript.slice(0, 40)}"`);
                        }
                        this.emit('transcript', {
                            text: repaired?.text ?? transcript,
                            isFinal,
                            confidence: alt?.confidence ?? 1.0,
                        });
                    } catch (err) {
                        console.error('[DeepgramStreaming] Parse error:', err);
                    }
                });
```

(d) Line 247: replace

```ts
                live.on(LiveTranscriptionEvents.UtteranceEnd, () => { if (!stale()) this.emit('utterance-end', { at: Date.now() }); });
```
with
```ts
                // An UtteranceEnd is a pause for the boundary repair too (its state is this socket's own).
                live.on(LiveTranscriptionEvents.UtteranceEnd, () => { boundaryRepair?.clear(); if (!stale()) this.emit('utterance-end', { at: Date.now() }); });
```

Nothing else changes: the `Transcript event` line, `stale()`, SpeechStarted, flush, keepalive and the Close summary are untouched.

- [ ] **Step 5: Run — green**

Run: `TEST electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts` — Expected: `Tests  6 passed (6)`.

- [ ] **Step 6: Prove the gate can fail (rule 8), then revert**

Temporarily change edit (b)'s last line on the STAGED copy to `const boundaryRepair = createBoundaryRepair();`, copy it in, and run the adapter test. Expected: `Tests  1 failed | 5 passed (6)` — only "a non-English connection …" fails (third entry `menangani data yang hilang di pipeline?`, and one repair line). Revert by re-applying edit 4(b)'s text on the staged copy (do NOT run `seed-stage.mjs`: it copies MAIN into the stage and would bring the gate-removed file back) and copying it in; run again: `6 passed`.

- [ ] **Step 7: Run the neighbours**

Run: `TEST electron/audio/` — Expected: every file passes: `deepgramBoundaryRepair` 68 (controller: the tree puts the "v2" digit pin INSIDE the "twenty five" test per the Task 3 review, so the file has 68 tests, not the plan's 69), `DeepgramStreamingSTT.boundaryRepair` 6, `deepgramKeyterms` 7, `DeepgramStreamingSTT.staleSocket` 6, `DeepgramStreamingSTT.socketSummary` 2, `DeepgramStreamingSTT.vadEvents` 1 (its `fire('UtteranceEnd', …)` now also calls `clear()` on an empty state — no observable change), plus `GeminiLiveRouter`, `RestSTT`, `SttChannel`, `energyVad` as before. A failure in a file this task does not touch is reported, not fixed.

- [ ] **Step 8: Type-check both projects.** Expected: root no output; electron exactly the 6 baseline errors.

- [ ] **Step 9: Report — no commit.** Changed paths: `electron/audio/deepgramKeyterms.ts`, `electron/audio/deepgramKeyterms.test.ts`, `electron/audio/DeepgramStreamingSTT.ts`, `electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts`. Quote Step 2's RED, Step 6's failure-and-revert, Step 5/7 counts, tsc. State what the tests did NOT exercise: a real socket, a real `speech_final` payload from Deepgram (the fake sets the field the SDK's Results message carries), the built `dist-electron` output, a language switch on a LIVE socket (`setRecognitionLanguage` restarts the stream; the new socket's `connect()` re-evaluates the gate — the same path as the restart test, not fired here).

---


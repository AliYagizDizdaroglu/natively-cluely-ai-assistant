### Task 1: The pure module `deepgramBoundaryRepair.ts`, test-first against the design's fixtures

**Files:**
- Create: `electron/audio/deepgramBoundaryRepair.ts`
- Create (copy, not authored): `electron/audio/deepgramBoundaryRepair.fixtures.json` ← `SP\boundary-repair\fixtures-v3.json` (22,788 bytes, LF)
- Test: `electron/audio/deepgramBoundaryRepair.test.ts`

**Interfaces:**
- Consumes: nothing from the repo.
- Produces (Task 2 and the controller's `rule-sim.mjs --impl` rely on these exact names):
  ```ts
  export interface BoundaryRepairResult { text: string; restored: string[] | null; }
  export interface BoundaryRepair { onTranscript(text: string, isFinal: boolean, atMs: number): BoundaryRepairResult; }
  export function createBoundaryRepair(): BoundaryRepair;
  ```
  One call per NON-EMPTY Transcript event, in arrival order; `atMs` is the arrival time in ms (only finals read it). `text` in the result is what to emit: the input unchanged, or `restored.join(' ') + ' ' + input`. `restored` is the restored word(s) in the interim's own spelling, or null (the reference omits the key on interims; the port returns null — the texts are identical, and the harness reads only `.text`).

- [ ] **Step 1: Copy the fixture file, byte for byte**

PowerShell (the memory-approved way for the non-ASCII path):
```powershell
Copy-Item -LiteralPath "C:\Users\sotka\AppData\Local\Temp\claude\C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant--claude-worktrees-nifty-lederberg-49681a\9c5886c7-cdbd-48af-b8bc-e9275012ec64\scratchpad\boundary-repair\fixtures-v3.json" -Destination "C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant\electron\audio\deepgramBoundaryRepair.fixtures.json"
(Get-Item -LiteralPath "C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant\electron\audio\deepgramBoundaryRepair.fixtures.json").Length
```
Expected: `22788`. (Git Bash alternative: `cp` with the two POSIX paths, then `file <dest>` must say `JSON text data` with no `CRLF`.) Do not open it in an editor that would reformat it.

- [ ] **Step 2: Write the failing tests**

Create `MAIN\electron\audio\deepgramBoundaryRepair.test.ts` with exactly this content:

```ts
import { describe, it, expect } from 'vitest';
import { createBoundaryRepair } from './deepgramBoundaryRepair';
import fixtures from './deepgramBoundaryRepair.fixtures.json';

/**
 * The fixture file is a byte-for-byte copy of the design's fixtures-v3.json (2026-09-29): every
 * sequence was extracted VERBATIM from a non-holdout run log (the `run` field) as [interim I,
 * final F1, final F2] with atMs relative to I, and expectedF2 is what the reference rule-v3.mjs
 * emits for F2 — checked by the extractor to equal what it emitted inside the full stream. Only
 * `symptom` (flight h40c R22, the reported defect) comes from a holdout run, as the reproduction;
 * `seam` is a live seam-probe recording (S2Q07 play 3, the tolerant "RAC" -> "Rag" cut).
 * The synthetic edges at the end reuse the symptom's strings and one real interim from the logs.
 */
type Fixture = { run: string; cls: string; events: { text: string; isFinal: boolean; atMs: number }[]; expectedF2: string };

function lastFinal(f: Fixture): string {
    const r = createBoundaryRepair();
    let out = '';
    for (const e of f.events) {
        const res = r.onTranscript(e.text, e.isFinal, e.atMs);
        if (e.isFinal) out = res.text;
    }
    return out;
}
const lastRaw = (f: Fixture): string => f.events[f.events.length - 1].text;

describe('deepgramBoundaryRepair reproduces the reference (rule-v3.mjs) on the extracted fixtures', () => {
    it('the fixture file is the design\'s: 1 symptom, 1 seam, 15 positives that change F2, 28 negatives that do not', () => {
        expect(fixtures.positives).toHaveLength(15);
        expect(fixtures.negatives).toHaveLength(28);
        for (const f of [fixtures.symptom, fixtures.seam, ...fixtures.positives]) expect(f.expectedF2).not.toBe(lastRaw(f));
        for (const f of fixtures.negatives) expect(f.expectedF2).toBe(lastRaw(f));
    });

    it(`symptom — ${fixtures.symptom.run}: restores "hallucinations"`, () => {
        expect(lastFinal(fixtures.symptom)).toBe(fixtures.symptom.expectedF2);
    });

    it(`seam — ${fixtures.seam.run}: the tolerant cut ("RAC" re-spelled "Rag" at the cut) restores "service"`, () => {
        expect(lastFinal(fixtures.seam)).toBe(fixtures.seam.expectedF2);
    });

    describe('positives: every distinct v3 repair in the non-holdout logs', () => {
        fixtures.positives.forEach((f, i) => {
            it(`#${i + 1} ${f.run}: -> "${f.expectedF2.slice(0, 50)}"`, () => {
                expect(lastFinal(f)).toBe(f.expectedF2);
            });
        });
    });

    describe('negatives: cuts the rule leaves alone (NORMAL, the |T| == 1 tail whether re-heard or really lost, number-formatted evidence, tolerant re-cover, turn boundaries)', () => {
        fixtures.negatives.forEach((f, i) => {
            it(`#${i + 1} ${f.cls} ${f.run}: "${lastRaw(f).slice(0, 40)}" unchanged`, () => {
                expect(lastFinal(f)).toBe(lastRaw(f));
            });
        });
    });

    it('pins the documented residuals as NOT repaired: real losses in the |T| == 1 tail ("between", "scaling") and number-formatted evidence ("eighty" / "84%")', () => {
        const byF2 = (start: string): Fixture => {
            const f = fixtures.negatives.find((n) => lastRaw(n).startsWith(start));
            if (!f) throw new Error(`fixture missing: F2 starting "${start}"`);
            return f;
        };
        for (const f of [byF2('training and serving?'), byF2('for a model inference service on Kubernetes?'), byF2('by 84%,')]) {
            expect(lastFinal(f)).toBe(lastRaw(f));
        }
    });
});

describe('deepgramBoundaryRepair synthetic edges (the symptom\'s strings)', () => {
    const [I, F1, F2] = fixtures.symptom.events;                 // atMs 0 / 17 / 1564
    const play = (events: Fixture['events']): string => lastFinal({ run: 'synthetic', cls: 'EDGE', events, expectedF2: '' });

    it('the window is 5000 ms from F1\'s arrival, inclusive: 5000 restores, 5001 does not', () => {
        expect(play([I, F1, { ...F2, atMs: F1.atMs + 5000 }])).toBe(fixtures.symptom.expectedF2);
        expect(play([I, F1, { ...F2, atMs: F1.atMs + 5001 }])).toBe(F2.text);
    });

    it('a final that is not a prefix of its interim is no cut — only F1\'s LAST token may differ (the tolerant cut)', () => {
        expect(play([I, { ...F1, text: 'How do we cut' }, F2])).toBe(F2.text);
        expect(play([I, { ...F1, text: 'How do you cat' }, F2])).toBe(fixtures.symptom.expectedF2);
    });

    it('an interim-only stream passes through unchanged and leaves nothing to repair', () => {
        const r = createBoundaryRepair();
        expect(r.onTranscript('How do', false, 0)).toEqual({ text: 'How do', restored: null });
        expect(r.onTranscript(I.text, false, 500)).toEqual({ text: I.text, restored: null });
        expect(r.onTranscript(I.text, true, 1000)).toEqual({ text: I.text, restored: null });    // equal to its interim: no cut
        expect(r.onTranscript(F2.text, true, 2000)).toEqual({ text: F2.text, restored: null });
    });

    it('any final clears the remembered cut: only the NEXT final can be repaired', () => {
        expect(play([I, F1, { text: 'Okay.', isFinal: true, atMs: 500 }, F2])).toBe(F2.text);
    });

    it('an interim between F1 and F2 does not disturb the repair (after7 M13: the log has "as code without" at 07:38:26.576Z between the two finals)', () => {
        const m13 = fixtures.positives[2];                       // 2026-09-06T08-14-21-after7, "infrastructure"
        const [i, f1, f2] = m13.events;
        expect(m13.run).toBe('2026-09-06T08-14-21-after7');
        expect(play([i, f1, { text: 'as code without', isFinal: false, atMs: f1.atMs + 2 }, f2])).toBe(m13.expectedF2);
    });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `TEST electron/audio/deepgramBoundaryRepair.test.ts`
Expected: FAIL — the file cannot be collected: `Failed to load url ./deepgramBoundaryRepair` (the module does not exist yet); 0 tests run. If instead the JSON import fails to resolve, Step 1 was not done or landed under another name.

- [ ] **Step 4: Write the pass-through skeleton (today's behaviour) — the failing run that means something**

Create `MAIN\electron\audio\deepgramBoundaryRepair.ts` with the full header, constants, tokenisers and API, but a body that changes nothing:

```ts
/**
 * Puts back the word(s) Deepgram drops at a segment boundary.
 *
 * nova-3 (interim_results, endpointing 300, smart_format) sometimes finalizes a segment SHORT of
 * its own latest interim and starts the next segment after a word that then appears in no final;
 * the app joins finals verbatim, so the word is gone before any app logic sees it. Reproduced at
 * the seam on 2026-09-29 (scratchpad seam-probe.mjs, 4 clips x 5 plays straight to Deepgram, the
 * app's exact options): 6 of 20 plays lost a word. Flight h40c R22 is the symptom:
 *
 *   interim  "How do you cut hallucinations in a rag answer without just making"
 *   final    "How do you cut"
 *   final    "in a rag answer without just making it refuse?"
 *
 * The app answered "How do you cut in a rag answer without just making it refuse?" and all six
 * replays of that prompt answered about refusals.
 *
 * This is rule v3 of the design brief (scratchpad boundary-repair/DESIGN.md), a line-for-line port
 * of its reference rule-v3.mjs; the two must agree event for event (rule-sim.mjs --impl proves it).
 *
 *   CUT    a final F1 whose tokens equal the preceding interim I's first |F1| tokens (strict), or
 *          all but F1's last token (tolerant: Deepgram re-spells the word at the cut, "RAC" ->
 *          "Rag", in 5 of 5 seam plays of S2Q07), with I longer than F1. T = I's tokens after F1;
 *          Traw = the same words in I's own spelling.
 *   REPAIR on the NEXT final F2 only, within REPAIR_WINDOW_MS of F1, when F2 does not simply start
 *          with T[0] (the normal case, 527 in the logs: the word moved to the next segment): for
 *          k = 1 then 2 (k < |T|), if F2's first min(2, |T| - k) tokens EXACTLY equal T[k..], emit
 *          Traw[0..k) + ' ' + F2. Anything else, and every interim, passes through unchanged.
 *
 * Measured over every run log (rule-sim.mjs, 2026-09-29): non-holdout 25 repairs, 25 TRUE against
 * the scripted question, 0 FALSE; holdout 4 / 4 TRUE; on the seam recording 4 of the 6 lost words,
 * nothing else. v2's two wider branches were dropped after 4 FALSE repairs on holdout ("two" before
 * "to answer", "fee" before "feature", "four point" before "4.1%"), so two shapes stay unrepaired
 * on purpose: the |T| == 1 tail (F2 does not start with the interim's one remaining word — text
 * alone cannot tell a lost word from Deepgram re-hearing the same audio, "schedule" ->
 * "scheduled"), and resumption evidence that differs only by number formatting ("eighty" / "84%").
 *
 * Pure: no clock, no logging. DeepgramStreamingSTT creates one per live socket, feeds every
 * NON-EMPTY Transcript event with its arrival time, and logs each restore.
 */

/** The longest F1 -> F2 gap among the repaired losses was 4441 ms; the margin keeps a tail from being glued onto the next, unrelated utterance. */
const REPAIR_WINDOW_MS = 5000;
/** The largest skip observed: 1 loss of 2 words, 25 of 1 (non-holdout logs). */
const MAX_SKIPPED_WORDS = 2;
/** Resumption tokens that must match exactly: 2 — the evidence every observed loss provides — or 1 when the interim holds no more. */
const RESUME_MATCH_WORDS = 2;

/** Comparison tokens: thousands commas between digits removed ("10,000" -> "10000"), lowercase, [a-z0-9']+ runs — the evidence scans' normalisation. */
const stripThousands = (s: string): string => s.replace(/(\d),(\d)/g, '$1$2');
const tok = (s: string): string[] => stripThousands(s).toLowerCase().match(/[a-z0-9']+/g) ?? [];
/** The same tokens in the text's own spelling (not lowercased): index-aligned with tok() on the same text. */
const rawTok = (s: string): string[] => stripThousands(s).match(/[A-Za-z0-9']+/g) ?? [];

export interface BoundaryRepairResult {
    /** What to emit: `text` as received, or the restored word(s) + ' ' + `text`. */
    text: string;
    /** The restored word(s) in the interim's own spelling, in order; null when nothing was restored. */
    restored: string[] | null;
}

export interface BoundaryRepair {
    /** One call per NON-EMPTY Transcript event, in arrival order; `atMs` is the arrival time (only finals read it). */
    onTranscript(text: string, isFinal: boolean, atMs: number): BoundaryRepairResult;
}

export function createBoundaryRepair(): BoundaryRepair {
    return {
        onTranscript(text, isFinal, atMs) {
            return { text, restored: null };
        },
    };
}
```

- [ ] **Step 5: Run the tests — the positives must fail, the negatives must pass**

Run: `TEST electron/audio/deepgramBoundaryRepair.test.ts`
Expected: `Tests  20 failed | 32 passed (52)`. Failing: `symptom`, `seam`, the 15 positives, and three edges ("the window is 5000 ms …" — its first `expect` sees F2 unchanged; "a final that is not a prefix …" — its tolerant half; "an interim between F1 and F2 …"). Passing: the fixture-file check, all 28 negatives, the residuals, "interim-only stream", "any final clears". This is the calibration (rule 8): every check that decides something answers differently when the effect is absent. If a negative fails here, the fixture copy is wrong (Step 1) — do not touch the skeleton.

- [ ] **Step 6: Implement the rule — the port of `rule-v3.mjs`**

Replace `createBoundaryRepair` (only it changes; header, constants, tokenisers and interfaces stay as written):

```ts
export function createBoundaryRepair(): BoundaryRepair {
    let lastInterim: string | null = null;
    let cut: { T: string[]; Traw: string[]; atMs: number } | null = null;
    return {
        onTranscript(text, isFinal, atMs) {
            if (!isFinal) {
                lastInterim = text;
                return { text, restored: null };
            }
            let out = text;
            let restored: string[] | null = null;
            const remembered = cut;
            if (remembered && atMs - remembered.atMs <= REPAIR_WINDOW_MS) {
                const T = remembered.T, f = tok(text);
                if (f.length && f[0] !== T[0]) {
                    for (let k = 1; k <= MAX_SKIPPED_WORDS && k < T.length && !restored; k++) {
                        const m = Math.min(RESUME_MATCH_WORDS, T.length - k);
                        if (f.length >= m && T.slice(k, k + m).every((w, j) => w === f[j])) restored = remembered.Traw.slice(0, k);
                    }
                }
                if (restored) out = `${restored.join(' ')} ${text}`;
            }
            cut = null;
            if (lastInterim) {
                const iw = tok(lastInterim), fw = tok(text);
                if (fw.length > 0 && fw.length < iw.length) {
                    const strict = fw.every((w, i) => w === iw[i]);
                    const tolerant = !strict && fw.length >= 2 && fw.slice(0, -1).every((w, i) => w === iw[i]);
                    if (strict || tolerant) cut = { T: iw.slice(fw.length), Traw: rawTok(lastInterim).slice(fw.length), atMs };
                }
            }
            lastInterim = null;
            return { text: out, restored };
        },
    };
}
```

Fidelity check against `rule-v3.mjs` before running: same `norm`/`tok`/`rawTok` regexes; `f[0] !== T[0]` guard; `k` from 1 to 2 with `k < T.length`, first match wins; `m = Math.min(2, T.length - k)` with `f.length >= m`; `Traw.slice(0, k)`; `cut = null` before the new-cut check; strict/tolerant exactly as the reference; `lastInterim = null` after every final. The only differences are names and `restored: null` on interims.

- [ ] **Step 7: Run the tests to verify they pass**

Run: `TEST electron/audio/deepgramBoundaryRepair.test.ts`
Expected: `Tests  52 passed (52)`.

- [ ] **Step 8: Type-check both projects**

Run the two tsc commands from Global Constraints.
Expected: root — no output, exit 0. Electron — exactly the 6 baseline errors; none in `electron/audio/deepgramBoundaryRepair.ts`, its test, or the JSON import. (If tsc rejects the JSON default import, `esModuleInterop`/`resolveJsonModule` are both on in `electron/tsconfig.json` — check that the file name in the import matches Step 1 exactly.)

- [ ] **Step 9: Report — no commit**

Do not run git. Report the changed paths for the controller to commit:
- `electron/audio/deepgramBoundaryRepair.ts` (new)
- `electron/audio/deepgramBoundaryRepair.fixtures.json` (new, byte-for-byte copy of `SP\boundary-repair\fixtures-v3.json`, 22,788 bytes)
- `electron/audio/deepgramBoundaryRepair.test.ts` (new)

and quote the two test-run counts (Step 5: 20 failed / 32 passed; Step 7: 52 passed) and the tsc results.

---


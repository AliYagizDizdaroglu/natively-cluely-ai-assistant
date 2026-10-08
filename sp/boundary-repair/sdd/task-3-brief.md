# Brief (extracted from PLAN-v4.md; the spec is DESIGN-v4.md in the same folder)

**Paths.** `MAIN = C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant`, branch `fix/coding-style-suffix-all-gemini`, HEAD `e78f7c7` (confirm by reading the plain file `MAIN\.git\HEAD`: `ref: refs/heads/fix/coding-style-suffix-all-gemini`). `SP = C:\Users\sotka\AppData\Local\Temp\claude\C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant--claude-worktrees-nifty-lederberg-49681a\9c5886c7-cdbd-48af-b8bc-e9275012ec64\scratchpad`; `BR = SP\boundary-repair`. Starting sizes (bytes) the implementer must see before editing: `deepgramBoundaryRepair.ts` 5,940 (sha256 prefix 4653b898), `deepgramBoundaryRepair.test.ts` 7,691 (c57ef099), `DeepgramStreamingSTT.ts` 14,831 (9584012e), `DeepgramStreamingSTT.boundaryRepair.test.ts` 5,096 (4a2b34ec), `deepgramKeyterms.ts` 5,404, `deepgramKeyterms.test.ts` 2,846, `interview60.turns-fixture.mjs` 5,485. A different size means another session touched the file: stop and report.

## Global Constraints

- Test-first: each new test is watched failing (against the CURRENT tree: the v3 module in Task 3, the v3 wiring in Task 4, a missing module then the old parse in Task 5) before the code that makes it pass. Quote each RED and GREEN count.
- The one test command, `TEST <file>` (PowerShell form; the Bash compound form was refused by the session guard):

  ```powershell
  Set-Location $env:TEMP; cmd /c "npx --prefix ""C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant"" vitest run --root ""C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant"" <file>"
  ```
  `<file>` is a repo-relative path (vitest matches it as a substring: `electron/audio/DeepgramStreamingSTT` runs every `DeepgramStreamingSTT.*.test.ts`). Never run the full suite.
- Writes into MAIN: the Write/Edit tools refuse MAIN paths. Every MODIFIED file is edited on a staged copy under `BR\stage\<MAIN-relative path>` that is seeded from MAIN's CURRENT content first: run `node BR\seed-stage.mjs` once before Task 3 (it byte-copies the 7 files this plan modifies — `electron/audio/deepgramBoundaryRepair.ts`, `deepgramBoundaryRepair.test.ts`, `DeepgramStreamingSTT.ts`, `DeepgramStreamingSTT.boundaryRepair.test.ts`, `deepgramKeyterms.ts`, `deepgramKeyterms.test.ts`, `electron/test/golden/interview60.turns-fixture.mjs` — and prints size + sha256 of source and copy, all IDENTICAL; it was run at plan time with the sizes listed under Paths). Re-run it for a single file (`node BR\seed-stage.mjs <MAIN-relative path>`) whenever a step says "temporarily change … then revert". NEW files (`interview60.turns-finals.mjs`, `interview60.turns-finals.test.ts`) are created in the stage. Every staged file goes into MAIN with `node SP\copy-into-main.mjs <staged file> <MAIN-relative path> [--overwrite]` (prints sizes and sha256 of source and copy; refuses CR bytes; `--overwrite` only for the 7 modified files). LF only, UTF-8. No git command of any kind; never read `.env` or any key.
- Type-check both projects after each task, exactly as PLAN.md's Global Constraints state (root: no output; electron: exactly the 6 baseline errors listed there, none in a file this plan touches).
- v4 numbers for comments and constants (they supersede v3's): window 5,000 ms from the observed max repaired gap 3,715 ms (logs; 3,115 holdout; 3,207 seam), NORMAL cuts reach 7,835 ms (12 of 527 past 5,000); k <= 2 from 1 loss of 2 words and 25 of 1; m = min(2, available); "25 repaired losses, all 25 true to the script (the measured precision; 25 is a floor on the number of losses)", never "25 losses"; holdout 4 / 4 TRUE "not an independent validation", and no holdout count as evidence for any choice; tolerant-cut evidence is NON-HOLDOUT only: 42 cuts, 34 kept, 7 refused as longer, 1 digit, 0 first letter; seam 6 repairs of 15 boundary losses (4 of 6, then 2 of 9 of which 4 had no interim evidence).
- The module must reproduce `rule-v4.mjs` event for event: the tolerant cut requires `isRespelling(F1's last token, I's token at that index)` = same first letter, no digit, `final.length <= interim.length`; no cut when `rawTok(I).length !== tok(I).length`; no cut when the interim holds a non-ASCII letter (`NON_ASCII_LETTER = /(?![\x00-\x7F])[\p{L}\p{M}]/u`, review M2); no cut when `speechFinal` is true on F1; `clear()` nulls both the cut and the latest interim; everything else exactly as v3 (window `<=` 5000 from F1's arrival, k = 1..2 with k < |T|, m = min(2, |T| - k), first k wins, `Traw.slice(0, k)`, `cut = null` before the new-cut check, `lastInterim = null` after every final). Export shape unchanged plus `clear()`; `onTranscript(text, isFinal, atMs, speechFinal?)`.
- The existing 58 module tests and the existing adapter test stay green with no expectation changed. If a v4 change would make one fail, STOP and report it: the design says it must not (check-v4 reproduces all 45 fixtures and every existing edge is either strict or a same-length re-spelling).
- The `Transcript event — isFinal=…, text="…"` log line stays byte-identical (RAW text); the `boundary repair:` line format stays byte-identical and is written on the very next line by the same synchronous handler (Task 5 relies on it).
- Holdout runs (folder names containing `h40`) are never fixtures; the only holdout sequence in the tests is `fixtures.symptom` (R22), the reproduction of the reported defect.
- Each task ends by listing the exact changed paths and the RED/GREEN counts; no commit (the controller commits).

---

### Task 3: The module — rule v4 (`clear()`, `speechFinal`, the re-spelling test, the alignment guard, corrected comments)

**Files:**
- Modify: `electron/audio/deepgramBoundaryRepair.ts` (whole file replaced by the content in Step 3)
- Modify: `electron/audio/deepgramBoundaryRepair.test.ts` (one `describe` block appended; nothing above it changes)
- Untouched: `electron/audio/deepgramBoundaryRepair.fixtures.json`

**Interfaces (Task 4 relies on these exact names):**
```ts
export interface BoundaryRepairResult { text: string; restored: string[] | null; }
export interface BoundaryRepair {
    onTranscript(text: string, isFinal: boolean, atMs: number, speechFinal?: boolean): BoundaryRepairResult;
    clear(): void;
}
export function createBoundaryRepair(): BoundaryRepair;
```

- [ ] **Step 1: Append the failing tests**

Append this block at the END of `electron/audio/deepgramBoundaryRepair.test.ts` (after the closing `});` of the "synthetic edges" describe), exactly:

```ts
describe('deepgramBoundaryRepair v4 (spec review 2026-09-29): a re-spelling only at the tolerant cut, aligned interims only, pauses', () => {
    const [I, F1, F2] = fixtures.symptom.events;                 // atMs 0 / 17 / 1564
    const play = (events: Fixture['events']): string => lastFinal({ run: 'synthetic', cls: 'EDGE', events, expectedF2: '' });
    const at = (text: string, isFinal: boolean, atMs: number) => ({ text, isFinal, atMs });

    // Negative #28 as logged has the interim stopping at "percent" and a 5852 ms gap. With the interim running on and
    // F2 inside the window, v3 restored "two percent" — a FALSE insertion (probe-inputs.out.txt): smart_format wrote
    // "ninety two percent" as the one token "92%", so T was shifted by two words.
    it('negative #28 with the interim running on: a digit token at the cut ("ninety two percent" -> "92%.") is no cut', () => {
        expect(play([at('accuracy reaching ninety two percent for each', false, 0), at('accuracy reaching 92%.', true, 688), at('For each of those metrics, define the unit of evaluation,', true, 2688)]))
            .toBe('For each of those metrics, define the unit of evaluation,');
    });

    it('"twenty five" -> "25": the same shape (v3 restored "five")', () => {
        expect(play([at('we cut latency by twenty five last quarter', false, 0), at('We cut latency by 25', true, 100), at('last quarter. What changed?', true, 2100)]))
            .toBe('last quarter. What changed?');
    });

    it('"all right" -> "Alright": a final token longer than the interim\'s is a merge, not a re-spelling (v3 restored "right")', () => {
        expect(play([at('thanks all right so tell me about', false, 0), at('Thanks. Alright.', true, 100), at('So tell me about your last project.', true, 2100)]))
            .toBe('So tell me about your last project.');
    });

    // A documented RECALL COST, not a fix (DESIGN-v4 §4, §8): an inflection is longer too, and it does not shift T — the 7
    // "break" -> "breaks" cuts in the logs are aligned and lost nothing. Here "even" IS lost after the inflected cut; v3
    // restored it, v4 does not, because the same length test is what refuses the merges above. Pinned so the cost is known.
    it('"break" -> "breaks": a longer final token is refused even when it is only an inflection, so a word lost right after it stays lost (v3 restored "even")', () => {
        expect(play([at('the deploy would break even before the rollout', false, 0), at('The deploy would breaks', true, 100), at('before the rollout finishes.', true, 2100)]))
            .toBe('before the rollout finishes.');
    });

    it('a re-spelling keeps its first letter: "put" for "cut" is no cut ("cat" for "cut" still is — the edge above)', () => {
        expect(play([I, { ...F1, text: 'How do you put' }, F2])).toBe(F2.text);
    });

    // The spec review's Turkish probe (probe-lang.out.txt): "İ" lowercases to "i" + a combining dot, so tok() holds one
    // token more than rawTok() and v3 restored "zmir projesinde" — a shifted Traw. The adapter never sends non-English
    // audio here; this is the module's own floor (v2's guard).
    it('an interim whose comparison tokens do not line up with its spelled tokens is no cut', () => {
        expect(play([at('Peki İzmir projesinde hangi veritabanını seçtiniz', false, 0), at('Peki', true, 100), at('projesinde hangi veritabanını seçtiniz?', true, 2100)]))
            .toBe('projesinde hangi veritabanını seçtiniz?');
    });

    // Accented English stays aligned ("résumé" -> "r" + "sum" in both tokenisers) but is fragments: v3 restored "r sum"
    // (the v4 review's M2 probe). 0 interims with a non-ASCII letter in the 28 English logs and the seam recordings.
    it('an interim with a non-ASCII letter is no cut: a lost "résumé" is not restored as "r sum"', () => {
        expect(play([at('tell me about your résumé and your last role', false, 0), at('Tell me about your', true, 100), at('and your last role.', true, 2100)]))
            .toBe('and your last role.');
    });

    it('clear() between F1 and F2 (the adapter\'s empty final / UtteranceEnd) forgets the cut', () => {
        const r = createBoundaryRepair();
        r.onTranscript(I.text, false, I.atMs);
        r.onTranscript(F1.text, true, F1.atMs);
        r.clear();
        expect(r.onTranscript(F2.text, true, F2.atMs)).toEqual({ text: F2.text, restored: null });
    });

    it('clear() also forgets the latest interim: a final after a pause is not a cut of it', () => {
        const r = createBoundaryRepair();
        r.onTranscript(I.text, false, I.atMs);
        r.clear();
        r.onTranscript(F1.text, true, F1.atMs);
        expect(r.onTranscript(F2.text, true, F2.atMs)).toEqual({ text: F2.text, restored: null });
    });

    it('speechFinal on F1 (Deepgram heard the utterance end there) leaves no cut; on F2 it does not stop the repair', () => {
        const r = createBoundaryRepair();
        r.onTranscript(I.text, false, I.atMs);
        r.onTranscript(F1.text, true, F1.atMs, true);
        expect(r.onTranscript(F2.text, true, F2.atMs)).toEqual({ text: F2.text, restored: null });
        const r2 = createBoundaryRepair();
        r2.onTranscript(I.text, false, I.atMs);
        r2.onTranscript(F1.text, true, F1.atMs, false);
        expect(r2.onTranscript(F2.text, true, F2.atMs, true).text).toBe(fixtures.symptom.expectedF2);
    });
});
```

- [ ] **Step 2: Run against the v3 module — the 10 new tests must fail, the 58 old ones pass**

Run: `TEST electron/audio/deepgramBoundaryRepair.test.ts`
Expected: `Tests  10 failed | 58 passed (68)` (pre-verified twice: against the reference rules, `BR\evidence\plan-v4-tests-sim.out.txt` — the 13 existing edges pass on both v3 and v4, the 10 new tests fail 10/10 on v3 and pass 10/10 on v4 — and with vitest from `%TEMP%` on a mirror of MAIN, `BR\evidence\verify-plan-v4.out.txt`). The failures, by cause: #28 running on (received `two percent For each …`), "twenty five" (`five last quarter …`), "Alright" (`right So tell me …`), "breaks" (`even before the rollout …`), "put" (`hallucinations in a rag …`), "İzmir" (`zmir projesinde projesinde …`), "résumé" (`r sum and your last role.`), the two `clear()` tests (`TypeError: r.clear is not a function`), speechFinal (first `expect`: `hallucinations in a rag …`). Any old test failing = the append went wrong; fix the append, not the module.

- [ ] **Step 3: Replace the module with the v4 port**

Stage `electron/audio/deepgramBoundaryRepair.ts` with exactly this content and copy it in with `--overwrite`:

```ts
/**
 * Puts back the word(s) Deepgram drops at a segment boundary.
 *
 * nova-3 (interim_results, endpointing 300, smart_format) sometimes finalizes a segment SHORT of
 * its own latest interim and starts the next segment after a word that then appears in no final;
 * the turn text is built from finals, so the word is gone before the question is asked. Reproduced
 * at the seam on 2026-09-29 (scratchpad seam-probe.mjs, clips streamed straight to Deepgram with
 * the app's option object): 6 of 20 plays lost a word, then 9 of 48. Flight h40c R22 is the symptom:
 *
 *   interim  "How do you cut hallucinations in a rag answer without just making"
 *   final    "How do you cut"
 *   final    "in a rag answer without just making it refuse?"
 *
 * and the app dispatched "How do you cut in a rag answer without just making it refuse?".
 *
 * This is rule v4 of the design brief (scratchpad boundary-repair/DESIGN-v4.md), a line-for-line
 * port of its reference rule-v4.mjs; the two must agree event for event (check-v4.mjs proves the
 * reference on every recorded stream; the controller replays the built module the same way).
 *
 *   CUT    a final F1 whose tokens equal the preceding interim I's first |F1| tokens (strict), or
 *          all but F1's last token, which must be a RE-SPELLING of I's token at that position
 *          (tolerant: Deepgram re-spells the word at the cut, "RAC" -> "Rag", 5 of 5 seam plays of
 *          S2Q07) — see isRespelling(). I must be longer than F1, ASCII-LETTERED (the tokens are
 *          ASCII: accented English such as "résumé" stays aligned but tokenises as fragments, and a
 *          lost "résumé" came back as "r sum" in the 2026-09-29 review's probe; 0 such interims in
 *          the 28 English logs and the seam recordings) and ALIGNED (its spelled tokens count the
 *          same as its comparison tokens). T = I's tokens after F1; Traw = the same words in I's
 *          own spelling.
 *   PAUSE  clear() forgets the cut and the latest interim (the adapter calls it on an empty FINAL and
 *          on UtteranceEnd); a final with speechFinal (Deepgram heard the utterance end there) leaves
 *          no cut. None of the three occurred inside a repaired loss on the recorded data: 0 of 29 log
 *          repairs had an empty final between F1 and F2, 0 of 6 seam repairs an UtteranceEnd, and all
 *          63 seam cuts had speech_final=false.
 *   REPAIR on the NEXT final F2 only, within REPAIR_WINDOW_MS of F1, when F2 does not simply start
 *          with T[0] (the normal case, 527 in the logs: the word moved to the next segment): for
 *          k = 1 then 2 (k < |T|), if F2's first min(2, |T| - k) tokens EXACTLY equal T[k..], emit
 *          Traw[0..k) + ' ' + F2. Anything else, and every interim, passes through unchanged.
 *
 * Measured over every run log and both seam recordings (check-v4.mjs, 2026-09-29): non-holdout logs
 * 25 repairs, all 25 TRUE against the scripted question (the measured precision; 25 is a floor on
 * the number of losses, since the logs cannot show a loss that left no interim evidence); holdout
 * 4 / 4 TRUE — reported only, NOT an independent validation and not evidence for any choice here
 * (v2's holdout failures chose what v3 removed; R22 and these 4 are excluded from any future
 * holdout measurement of this rule); seam recordings 6 repairs, all true, of 15 boundary losses
 * (4 of 6 on the first; 2 of 9 on the second, where 4 losses left NO interim evidence — F1 longer
 * than its last interim — which no interim rule reaches). v2's two wider branches were dropped
 * after 4 FALSE repairs on holdout ("two" before "to answer", "fee" before "feature", "four point"
 * before "4.1%"), so two shapes stay unrepaired on purpose: the |T| == 1 tail (F2 does not start
 * with the interim's one remaining word — text alone cannot tell a lost word from Deepgram
 * re-hearing the same audio, "schedule" -> "scheduled"), and resumption evidence that differs only
 * by number formatting ("eighty" / "84%"). The weakest path is k = 2 with m = 1: one observed loss
 * ("for a" before "production").
 *
 * English only: the tokens are ASCII, and the spec review showed the rule mangling Spanish and
 * Turkish text. DeepgramStreamingSTT creates the repair only on an English connection (the same
 * test as keytermsFor) and passes every other language, and 'multi', through untouched.
 *
 * Pure: no clock, no logging. DeepgramStreamingSTT creates one per live socket, feeds every
 * NON-EMPTY Transcript event with its arrival time and speech_final flag, and logs each restore.
 */

/**
 * The longest F1 -> F2 gap among the repaired losses was 3715 ms (logs; 3115 holdout, 3207 seam); the
 * margin keeps a tail from being glued onto the next, unrelated utterance. NORMAL cuts (nothing lost)
 * reach 7835 ms, 12 of 527 past 5000, so the window will occasionally miss a real loss.
 */
const REPAIR_WINDOW_MS = 5000;
/** The largest skip observed: 1 loss of 2 words, 25 of 1 (non-holdout logs). */
const MAX_SKIPPED_WORDS = 2;
/** Resumption tokens that must match exactly: 2 — the evidence every observed loss provides — or 1 when the interim holds no more. */
const RESUME_MATCH_WORDS = 2;

/** Comparison tokens: thousands commas between digits removed ("10,000" -> "10000"), lowercase, [a-z0-9']+ runs — the evidence scans' normalisation. */
const stripThousands = (s: string): string => s.replace(/(\d),(\d)/g, '$1$2');
const tok = (s: string): string[] => stripThousands(s).toLowerCase().match(/[a-z0-9']+/g) ?? [];
/** The same tokens in the text's own spelling (not lowercased): index-aligned with tok() on the same text WHEN both have the same length (see createBoundaryRepair). */
const rawTok = (s: string): string[] => stripThousands(s).match(/[A-Za-z0-9']+/g) ?? [];
/** A letter or combining mark outside ASCII: the tokenisers split such a word into fragments, so an interim holding one is never a cut (2026-09-29 review M2). */
const NON_ASCII_LETTER = /(?![\x00-\x7F])[\p{L}\p{M}]/u;

/**
 * F1's last token may only be a RE-SPELLING of the interim's token at that position: same first
 * letter, no digit, no longer. smart_format writes "ninety two percent" as "92%" — one final token
 * over three interim words — and a compound merges "all right" into "Alright": a final token that
 * absorbed more audio than the interim's word shifts T, and v3 restored "two percent" / "right"
 * (the spec review's probes). Measured on the 42 tolerant cuts in the NON-HOLDOUT logs and seam
 * recordings (check-v4.out.txt): all 34 kept are no longer than the interim's token ("xgboost" ->
 * "xg", "dashboard" -> "dash", "RAC" -> "Rag"); 7 refused as longer (all "break" -> "breaks") and
 * 1 for a digit ("ninety" -> "92"), none of them followed by a repair; 0 refused for the first
 * letter — that rule rests only on the synthetic "put" for "cut" case. KNOWN RECALL COST: an
 * inflection is longer too, and it does not shift T (the 7 "breaks" cuts are aligned: F2 resumed at
 * the interim's next word, nothing lost); a word lost right after an inflected cut ("scale" ->
 * "scales", then "horizontally") was restored by v3 and is not by v4. No such loss in the data.
 */
const isRespelling = (finalTok: string, interimTok: string): boolean =>
    finalTok[0] === interimTok[0] && !/\d/.test(finalTok) && finalTok.length <= interimTok.length;

export interface BoundaryRepairResult {
    /** What to emit: `text` as received, or the restored word(s) + ' ' + `text`. */
    text: string;
    /** The restored word(s) in the interim's own spelling, in order; null when nothing was restored. */
    restored: string[] | null;
}

export interface BoundaryRepair {
    /**
     * One call per NON-EMPTY Transcript event, in arrival order; `atMs` is the arrival time (only
     * finals read it); `speechFinal` is Deepgram's speech_final flag (a final carrying it leaves no cut).
     */
    onTranscript(text: string, isFinal: boolean, atMs: number, speechFinal?: boolean): BoundaryRepairResult;
    /** A pause (an empty final, an UtteranceEnd): forget the remembered cut and the latest interim. */
    clear(): void;
}

export function createBoundaryRepair(): BoundaryRepair {
    let lastInterim: string | null = null;
    let cut: { T: string[]; Traw: string[]; atMs: number } | null = null;
    return {
        clear() {
            cut = null;
            lastInterim = null;
        },
        onTranscript(text, isFinal, atMs, speechFinal = false) {
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
            if (lastInterim && !speechFinal && !NON_ASCII_LETTER.test(lastInterim)) {
                const iw = tok(lastInterim), fw = tok(text), raw = rawTok(lastInterim);
                if (fw.length > 0 && fw.length < iw.length && raw.length === iw.length) {
                    const strict = fw.every((w, i) => w === iw[i]);
                    const tolerant = !strict && fw.length >= 2 && fw.slice(0, -1).every((w, i) => w === iw[i]) && isRespelling(fw[fw.length - 1], iw[fw.length - 1]);
                    if (strict || tolerant) cut = { T: iw.slice(fw.length), Traw: raw.slice(fw.length), atMs };
                }
            }
            lastInterim = null;
            return { text: out, restored };
        },
    };
}
```

Fidelity check against `rule-v4.mjs` before running: same `respelling`/`isRespelling` body; same `NON_ASCII_LETTER` regex tested on the interim in the same condition as `!speechFinal`; `raw.length === iw.length` inside the same condition; `!speechFinal` on the new-cut branch only (the repair of F2 ignores it); `clear()` nulls both; everything else byte-equivalent to the v3 body. (The controller's `check-v4-built.mjs` proves the built module equal to the reference on 13,892 events, 45 fixtures and 18 probes; the plan's module as written above was proven that way at plan time, transpiled with MAIN's esbuild — `BR\evidence\verify-plan-v4.out.txt`.)

- [ ] **Step 4: Run — all green, no old expectation touched**

Run: `TEST electron/audio/deepgramBoundaryRepair.test.ts`
Expected: `Tests  68 passed (68)`.

- [ ] **Step 5: Type-check both projects** (Global Constraints). Expected: root no output; electron exactly the 6 baseline errors.

- [ ] **Step 6: Report — no commit.** Changed paths: `electron/audio/deepgramBoundaryRepair.ts`, `electron/audio/deepgramBoundaryRepair.test.ts`. Quote the Step 2 (10 failed / 58 passed) and Step 4 (68 passed) counts and the tsc results.

---


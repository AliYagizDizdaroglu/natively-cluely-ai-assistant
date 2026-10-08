# Deepgram Boundary Repair (rule v4) Delta Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> Delta plan (2026-09-29 ~19:15, revised ~21:15 after the Opus review of v4 — `sdd/spec-review-v4.md`): Tasks 1-2 of PLAN.md are DONE in MAIN's working tree (uncommitted). Tasks 3-5 below start from that tree and turn rule v3 into rule v4 per `DESIGN-v4.md`. Written from a worktree session; the controller may copy it to `MAIN\docs\superpowers\plans\`. Every RED/GREEN count below was re-run from `%TEMP%` on a mirror of the current MAIN files with the plan's exact code blocks (`BR\verify-plan-v4.mjs` -> `BR\evidence\verify-plan-v4.out.txt`).

**Goal:** The boundary repair stops inserting words when Deepgram's smart_format or a compound merge misaligns the tolerant cut, never repairs non-English audio, forgets a cut across a pause, and the turns-fixture extractor keeps replaying what the turn actually saw.

**Architecture:** Same shape as v3: the pure module `electron/audio/deepgramBoundaryRepair.ts` (port of `rule-v4.mjs`) gains a re-spelling test on the tolerant cut, the alignment guard, a `speechFinal` argument and `clear()`; `DeepgramStreamingSTT.connect()` creates it only on English connections (`isEnglishLanguage`, exported from `deepgramKeyterms.ts` and shared with `keytermsFor`), calls `clear()` on an empty FINAL and on UtteranceEnd, and passes `speech_final`. A new `electron/test/golden/interview60.turns-finals.mjs` holds the finals parser the extractor uses, rebuilding `${restored} ${raw}` from the log's repair line.

**Tech Stack:** unchanged (TypeScript under `electron/`, vitest 2.1.9, esbuild build; the golden `.mjs` harness modules are imported from `.test.ts` with `// @ts-ignore — untyped ESM harness module`, as `hedge-live.policy.test.ts` does). No new dependency.

**Spec:** `C:\Users\sotka\AppData\Local\Temp\claude\C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant--claude-worktrees-nifty-lederberg-49681a\9c5886c7-cdbd-48af-b8bc-e9275012ec64\scratchpad\boundary-repair\DESIGN-v4.md` (read it first). Same folder: `rule-v4.mjs` (the REFERENCE), `check-v4.mjs` + `evidence/check-v4.out.txt` (the proof: 25 / 4 / 6 repairs, all 45 fixtures reproduced, every probe), `check-v4-built.mjs` (the controller's post-build equivalence check, calibrated in `evidence/check-v4-built.calibrate.out.txt`), `seed-stage.mjs` (seeds the stage with MAIN's current files), `fixtures-v3.json` (unchanged: v4 reproduces all 45 expected outputs, so NO fixture and NO existing test expectation changes), `sdd/v4-findings.md` and `sdd/spec-review-v4.md` (the review findings and rulings).

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

    // Every digit cut in the data ("ninety" -> "92") also fails the first-letter rule, so only a synthetic case pins the
    // digit rule on its own: "v2" shares "version"'s first letter and is shorter; v3 restored "two" here.
    it('a digit in F1\'s last token is refused on its own: "version two" -> "v2" (same first letter, shorter)', () => {
        expect(play([at('the version two release shipped last week', false, 0), at('The v2', true, 100), at('release shipped last week.', true, 2100)]))
            .toBe('release shipped last week.');
    });

    // The spec review's Turkish probe (probe-lang.out.txt): "İ" lowercases to "i" + a combining dot, so tok() would hold
    // one token more than rawTok() and v3 restored "zmir projesinde" — a shifted Traw. The non-ASCII guard refuses the
    // interim before any token comparison (it subsumes v2's token-count guard, which the module therefore omits).
    it('an interim with a non-ASCII letter that would even shift the spelled tokens ("İzmir") is no cut', () => {
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

- [ ] **Step 2: Run against the v3 module — the 11 new tests must fail, the 58 old ones pass**

Run: `TEST electron/audio/deepgramBoundaryRepair.test.ts`
Expected: `Tests  11 failed | 58 passed (69)` (pre-verified twice: against the reference rules, `BR\evidence\plan-v4-tests-sim.out.txt` — the 13 existing edges pass on both v3 and v4, the 11 new tests fail 11/11 on v3 and pass 11/11 on v4 — and with vitest from `%TEMP%` on a mirror of MAIN, `BR\evidence\verify-plan-v4.out.txt`). The failures, by cause: #28 running on (received `two percent For each …`), "twenty five" (`five last quarter …`), "Alright" (`right So tell me …`), "breaks" (`even before the rollout …`), "put" (`hallucinations in a rag …`), "v2" (`two release shipped …`), "İzmir" (`zmir projesinde projesinde …`), "résumé" (`r sum and your last role.`), the two `clear()` tests (`TypeError: r.clear is not a function`), speechFinal (first `expect`: `hallucinations in a rag …`). Any old test failing = the append went wrong; fix the append, not the module.

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
 *          S2Q07) — see isRespelling(). I must be longer than F1 and ASCII-LETTERED (the tokens are
 *          ASCII: accented English such as "résumé" tokenises as fragments, and a lost "résumé" came
 *          back as "r sum" in the 2026-09-29 review's probe; 0 such interims in the 28 English logs
 *          and the seam recordings). With ASCII letters only, tok() and rawTok() split the text
 *          identically, so T and Traw line up index for index (v2's token-count guard is subsumed and
 *          omitted here; the reference keeps it as an unreachable line). T = I's tokens after F1;
 *          Traw = the same words in I's own spelling.
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
/** The same tokens in the text's own spelling (not lowercased): index-aligned with tok() on the same text, which NON_ASCII_LETTER guarantees (only a non-ASCII letter can make the two regexes split differently). */
const rawTok = (s: string): string[] => stripThousands(s).match(/[A-Za-z0-9']+/g) ?? [];
/** A letter or combining mark outside ASCII: the tokenisers split such a word into fragments (and "İ" even into an extra token), so an interim holding one is never a cut (2026-09-29 review M2). */
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
                const iw = tok(lastInterim), fw = tok(text);
                if (fw.length > 0 && fw.length < iw.length) {
                    const strict = fw.every((w, i) => w === iw[i]);
                    const tolerant = !strict && fw.length >= 2 && fw.slice(0, -1).every((w, i) => w === iw[i]) && isRespelling(fw[fw.length - 1], iw[fw.length - 1]);
                    if (strict || tolerant) cut = { T: iw.slice(fw.length), Traw: rawTok(lastInterim).slice(fw.length), atMs };
                }
            }
            lastInterim = null;
            return { text: out, restored };
        },
    };
}
```

Fidelity check against `rule-v4.mjs` before running: same `respelling`/`isRespelling` body; same `NON_ASCII_LETTER` regex tested on the interim in the same condition as `!speechFinal`; the reference's `raw.length === iw.length` clause is deliberately ABSENT here (unreachable once the interim is ASCII-lettered — re-review M-a; the behaviour is identical, which `check-v4-built.mjs` proves on every event and probe); `!speechFinal` on the new-cut branch only (the repair of F2 ignores it); `clear()` nulls both; everything else byte-equivalent to the v3 body. (The controller's `check-v4-built.mjs` proves the built module equal to the reference on 13,892 events, 45 fixtures and 18 probes; the plan's module as written above was proven that way at plan time, transpiled with MAIN's esbuild — `BR\evidence\verify-plan-v4.out.txt`.)

- [ ] **Step 4: Run — all green, no old expectation touched**

Run: `TEST electron/audio/deepgramBoundaryRepair.test.ts`
Expected: `Tests  69 passed (69)`.

- [ ] **Step 5: Type-check both projects** (Global Constraints). Expected: root no output; electron exactly the 6 baseline errors.

- [ ] **Step 6: Report — no commit.** Changed paths: `electron/audio/deepgramBoundaryRepair.ts`, `electron/audio/deepgramBoundaryRepair.test.ts`. Quote the Step 2 (11 failed / 58 passed) and Step 4 (69 passed) counts and the tsc results.

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

Run: `TEST electron/audio/` — Expected: every file passes: `deepgramBoundaryRepair` 69, `DeepgramStreamingSTT.boundaryRepair` 6, `deepgramKeyterms` 7, `DeepgramStreamingSTT.staleSocket` 6, `DeepgramStreamingSTT.socketSummary` 2, `DeepgramStreamingSTT.vadEvents` 1 (its `fire('UtteranceEnd', …)` now also calls `clear()` on an empty state — no observable change), plus `GeminiLiveRouter`, `RestSTT`, `SttChannel`, `energyVad` as before. A failure in a file this task does not touch is reported, not fixed.

- [ ] **Step 8: Type-check both projects.** Expected: root no output; electron exactly the 6 baseline errors.

- [ ] **Step 9: Report — no commit.** Changed paths: `electron/audio/deepgramKeyterms.ts`, `electron/audio/deepgramKeyterms.test.ts`, `electron/audio/DeepgramStreamingSTT.ts`, `electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts`. Quote Step 2's RED, Step 6's failure-and-revert, Step 5/7 counts, tsc. State what the tests did NOT exercise: a real socket, a real `speech_final` payload from Deepgram (the fake sets the field the SDK's Results message carries), the built `dist-electron` output, a language switch on a LIVE socket (`setRecognitionLanguage` restarts the stream; the new socket's `connect()` re-evaluates the gate — the same path as the restart test, not fired here).

---

### Task 5: The turns-fixture extractor — a repaired final replays as `<restored> <raw>`

**Files:**
- Create: `electron/test/golden/interview60.turns-finals.mjs`
- Create: `electron/test/golden/interview60.turns-finals.test.ts`
- Modify: `electron/test/golden/interview60.turns-fixture.mjs` (an import; lines 53-54 replaced by one call)

**Interfaces:**
- Produces: `export function finalsFrom(dbg: string, sinceMs: number): { at: number; text: string }[]` — the non-empty interviewer finals of a `natively_debug.log` text at or after `sinceMs`, in log order, each as the turn tracker saw it: `${restored} ${raw}` when a `[DeepgramStreaming] boundary repair: restored "<words>" before "…"` line is the VERY NEXT line after the final's `Transcript event` line (the adapter writes both in one synchronous handler; Task 4 keeps that), else the raw text; trimmed.
- Consumed by: the extractor's `finals` (fed to `turn.final()` by `interviewerTurn.replay.test.ts:34`). The committed fixtures (`fixtures/2026-09-09T15-00-55-s50a-turns.json`, `2026-09-08T08-44-56-after9-turns.json`) are NOT regenerated: their logs predate the repair, and the new parser reproduces their `finals` arrays exactly (132 and 181 entries; checked 2026-09-29 with `BR\extractor-finals-check.mjs`).

- [ ] **Step 1: Write the failing test**

Create `electron/test/golden/interview60.turns-finals.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
// @ts-ignore — untyped ESM harness module
import { finalsFrom } from './interview60.turns-finals.mjs';

// R22 (flight h40c) as the app logs it since the boundary repair: the Transcript event line keeps
// Deepgram's RAW final and the restore follows on the very next line, from the same handler.
const LOG = [
    '2026-09-29T11:19:27.809Z [LOG] [DeepgramStreaming] Transcript event — isFinal=false, text="How do you cut hallucinations in a rag answer without just making"',
    '2026-09-29T11:19:27.826Z [LOG] [DeepgramStreaming] Transcript event — isFinal=true, text="How do you cut"',
    '2026-09-29T11:19:28.500Z [LOG] [DeepgramStreaming] Transcript event — isFinal=true, text=""',
    '2026-09-29T11:19:29.373Z [LOG] [DeepgramStreaming] Transcript event — isFinal=true, text="in a rag answer without just making it refuse?"',
    '2026-09-29T11:19:29.373Z [LOG] [DeepgramStreaming] boundary repair: restored "hallucinations" before "in a rag answer without just making it r"',
    '2026-09-29T11:19:30.000Z [LOG] [Main] turn: classify finals=2 question="How do you cut hallucinations in a rag answer without just making it refuse?"',
    '2026-09-29T11:19:31.000Z [LOG] [DeepgramStreaming] Transcript event — isFinal=true, text="Okay."',
    '2026-09-29T11:19:31.001Z [LOG] [Main] turn: deepgram utterance-end vad=false',
    '2026-09-29T11:19:31.002Z [LOG] [DeepgramStreaming] boundary repair: restored "not" before "this one"',
].join('\n');
const at = (iso: string) => Date.parse(iso);

describe('finalsFrom: the interviewer finals as the turn tracker saw them', () => {
    it('a final directly followed by a boundary-repair line replays as the restored words + the raw text', () => {
        expect(finalsFrom(LOG, 0)).toEqual([
            { at: at('2026-09-29T11:19:27.826Z'), text: 'How do you cut' },
            { at: at('2026-09-29T11:19:29.373Z'), text: 'hallucinations in a rag answer without just making it refuse?' },
            { at: at('2026-09-29T11:19:31.000Z'), text: 'Okay.' },
        ]);
    });

    it('keeps interims and empty finals out, and drops finals before `since`', () => {
        expect(finalsFrom(LOG, at('2026-09-29T11:19:29.000Z')).map((f) => f.text))
            .toEqual(['hallucinations in a rag answer without just making it refuse?', 'Okay.']);
    });

    it('a repair line that is not the very next line after a final is not applied (one synchronous handler writes both lines)', () => {
        expect(finalsFrom(LOG, 0).some((f) => f.text.startsWith('not '))).toBe(false);
    });

    // Pre-repair logs hold no repair line, so the parser must equal the old inline parse there: the two
    // committed fixtures are the calibration (extracted with `since = startedMs - 2000`, as the extractor does).
    // Paths hang off __dirname (this folder): vitest workers keep the caller's cwd, which is %TEMP% under the
    // repo's test command, not --root.
    for (const name of ['2026-09-09T15-00-55-s50a', '2026-09-08T08-44-56-after9']) {
        it(`reproduces the committed ${name} fixture's finals from its run log`, () => {
            const golden = __dirname;
            const run = path.join(golden, 'interview60.runs', name);
            const tl = JSON.parse(fs.readFileSync(path.join(run, 'interview60.timeline.json'), 'utf8'));
            const dbg = fs.readFileSync(path.join(run, 'natively_debug.log'), 'utf8');
            const fixture = JSON.parse(fs.readFileSync(path.join(golden, 'fixtures', `${name}-turns.json`), 'utf8'));
            expect(dbg.includes('boundary repair: restored')).toBe(false);
            expect(finalsFrom(dbg, tl.startedMs - 2000)).toEqual(fixture.finals);
        });
    }
});
```

- [ ] **Step 2: Run — the module is missing**

Run: `TEST electron/test/golden/interview60.turns-finals.test.ts` — Expected: the file fails to collect with `Error: Failed to resolve import "./interview60.turns-finals.mjs" from "<the test file, printed as a path relative to the caller's cwd>". Does the file exist?` — `Test Files  1 failed (1)`, `Tests  no tests`.

- [ ] **Step 3: Create the module with the OLD parse (the calibration step), run, then the v4 parse**

Create `electron/test/golden/interview60.turns-finals.mjs` with the old inline parse moved in verbatim:

```js
// interview60.turns-finals.mjs — the interviewer finals of a run log, as the turn tracker saw them
// (interview60.turns-fixture.mjs builds its `finals` from this; interviewerTurn.replay.test.ts feeds
// them to turn.final()).
const unq = (s) => JSON.parse(`"${s}"`);
/** @returns {{ at: number, text: string }[]} non-empty finals at or after sinceMs, in log order */
export function finalsFrom(dbg, sinceMs) {
    return [...dbg.matchAll(/^(\S+) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=true, text="((?:[^"\\]|\\.)*)"/gm)]
        .map((m) => ({ at: Date.parse(m[1]), text: unq(m[2]).trim() })).filter((f) => f.text && f.at >= sinceMs);
}
```
Run: `TEST electron/test/golden/interview60.turns-finals.test.ts` — Expected: `Tests  2 failed | 3 passed (5)`: the first two `it`s fail (the second final is `in a rag answer …` without `hallucinations `); the "not the very next line" test and both fixture-parity tests pass (this is the calibration: the parity tests hold for the old parse and must still hold for the new one).

Now replace the file's content with the v4 parse:

```js
// interview60.turns-finals.mjs — the interviewer finals of a run log, as the turn tracker saw them
// (interview60.turns-fixture.mjs builds its `finals` from this; interviewerTurn.replay.test.ts feeds
// them to turn.final()).
//
// The `Transcript event` line keeps Deepgram's RAW text (the offline scans parse it), but since the
// boundary repair (deepgramBoundaryRepair.ts, 2026-09-29) the app emits the REPAIRED final; the
// restore is logged on the very next line by the same synchronous handler:
//   [DeepgramStreaming] boundary repair: restored "<words>" before "<first 40 chars of the raw final>"
// so a final directly followed by that line replays as `<words> <raw>`. Logs from before the repair
// hold no such line and parse exactly as they always did.
const FINAL = /^(\S+) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=true, text="((?:[^"\\]|\\.)*)"/;
const REPAIR = /^\S+ \[LOG\] \[DeepgramStreaming\] boundary repair: restored "((?:[^"\\]|\\.)*)" before "/;
const unq = (s) => JSON.parse(`"${s}"`);
/** @returns {{ at: number, text: string }[]} non-empty finals at or after sinceMs, in log order */
export function finalsFrom(dbg, sinceMs) {
    const lines = dbg.split('\n');
    const out = [];
    for (let i = 0; i < lines.length; i++) {
        const m = lines[i].match(FINAL);
        if (!m) continue;
        const rep = lines[i + 1]?.match(REPAIR);
        const text = (rep ? `${unq(rep[1])} ${unq(m[2])}` : unq(m[2])).trim();
        const at = Date.parse(m[1]);
        if (text && at >= sinceMs) out.push({ at, text });
    }
    return out;
}
```
Run: `TEST electron/test/golden/interview60.turns-finals.test.ts` — Expected: `Tests  5 passed (5)`.

- [ ] **Step 4: Point the extractor at it**

In `electron/test/golden/interview60.turns-fixture.mjs`: after line 14 `import { fileURLToPath } from 'node:url';` add `import { finalsFrom } from './interview60.turns-finals.mjs';`, and replace lines 53-54

```js
const finals = [...dbg.matchAll(/^(\S+) \[LOG\] \[DeepgramStreaming\] Transcript event — isFinal=true, text="((?:[^"\\]|\\.)*)"/gm)]
    .map((m) => ({ at: ts(m[1]), text: unq(m[2]).trim() })).filter((f) => f.text && f.at >= since);
```
with
```js
// As the turn tracker saw them: a boundary-repaired final carries its restored word(s) (interview60.turns-finals.mjs).
const finals = finalsFrom(dbg, since);
```
(`unq` and `ts` stay: the dispatch parse below still uses both.) Then run the extractor end to end on a committed run, writing OUTSIDE the repo, and compare its `finals` with the committed fixture's:

```powershell
cmd /c "node ""C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant\electron\test\golden\interview60.turns-fixture.mjs"" ""C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant\electron\test\golden\interview60.runs\2026-09-09T15-00-55-s50a"" ""C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant\electron\test\golden\scenario50-tts-local"" --offset-ms 1150 --out ""$env:TEMP\s50a-turns.check.json"""
```
Expected: it prints `… 40 items, 132 finals, … offset 1150 ms …` (all 40 WAVs are in `scenario50-tts-local`; the v4 reviewer's r5 ran exactly this). This end-to-end run IS the import-path check for the modified extractor (`interviewerTurn.replay.test.ts` never imports it, and reads its fixtures through `process.cwd()`, so it is not run here). Compare with a throwaway script in `BR\` (not `node -e`): the `finals`, `items` and `actual` arrays of `$env:TEMP\s50a-turns.check.json` and `electron/test/golden/fixtures/2026-09-09T15-00-55-s50a-turns.json` must be deep-equal (`extractedAt` differs by design). Delete the temp output afterwards.

- [ ] **Step 5: Type-check both projects.** Expected: root no output; electron exactly the 6 baseline errors (`allowJs` is on, so the `.mjs` files are in the electron program; the `@ts-ignore` covers the import).

- [ ] **Step 6: Report — no commit.** Changed paths: `electron/test/golden/interview60.turns-finals.mjs` (new), `electron/test/golden/interview60.turns-finals.test.ts` (new), `electron/test/golden/interview60.turns-fixture.mjs` (modified). Quote Step 2 (the resolve failure), Step 3 (2 failed / 3 passed, then 5 passed), Step 4's extractor line and the deep-equal result, tsc.

---

## Controller verification (not a task)

1. **Offline replay of the BUILT module**: build MAIN (`cmd /c "npm run build:electron -- --force"`; check ListAgents + mtimes before and after so no concurrent `.ts` edit is captured; `dist-electron/electron/audio/deepgramBoundaryRepair.js` fresh, exports `createBoundaryRepair` with `clear`). Then `node BR\check-v4-built.mjs` (it runs `check-v4.mjs --module <that .js>`: the v4 feed — empties -> `clear()`, utterance-ends -> `clear()`, `speech_final` passed — over every run log and both seam recordings, compared with rule-v3 AND with rule-v4 event for event, plus the 45 fixtures and the 18 probes) must print `EQUIVALENT` and exit 0; its full output lands in `BR\evidence\check-v4-built.dist.out.txt` (25 / 4 / 6, 0 of 13,892 events differ). Calibrated at plan time (`node BR\check-v4-built.mjs --calibrate`, `evidence/check-v4-built.calibrate.out.txt`): rule-v4.mjs EQUIVALENT, `shim-v3.mjs` (v3 behaviour behind the built shape) NOT EQUIVALENT on 11 checks. Any `NOT EQUIVALENT` = the port is not the reference; stop. (`rule-sim.mjs --impl` is v3's harness: it neither clears on empties nor passes `speech_final`; still expected to print 25 + 4, since neither signal changes a log repair.)
2. **Live at the seam** (DESIGN-v4 §10.5): a fresh seam probe on other non-holdout clips, the built module applied; count cut-shaped and no-evidence losses separately; the key is read in-process, never printed.
3. **Live through the app** (§10.6): a scenario50 S1+S2 hour via a Windows scheduled task; every `boundary repair:` line against the scripted question and the dispatched `question=`; also count empty finals and UtteranceEnds that arrived between a cut and its next final.
4. **Commit** Tasks 1-5's paths with the controller's helper; pass record per the user's rule if a live pass is measured. Also update the fixture-file comment claims if the header of `deepgramBoundaryRepair.test.ts` is ever revised (it still names rule-v3.mjs, which is literally what produced the fixtures' expected outputs — v4 reproduces them 45/45).
5. **Residual risks the tests do not reach** (DESIGN-v4 §8): the |T| == 1 tail, number-formatted evidence, the no-evidence class (recall 2 of 9 on seam2), the window tail past 5,000 ms, filler/stutter restores (unmeasured, benign), holdout not independent.

## Spec coverage (self-review)

| DESIGN-v4 requirement | Where |
|---|---|
| Tolerant cut = re-spelling: same first letter, no digit, no longer; the inflection recall cost documented | Task 3 `isRespelling` + comment; tests #28-running-on, "25", "Alright", "breaks" (pinned as the recall cost), "put"; existing "cat" edge unchanged |
| Non-ASCII-letter guard on the interim (review M2); it subsumes v2's token-count guard, omitted from the shipped module (re-review M-a; the reference keeps an unreachable line) | Task 3 `NON_ASCII_LETTER`; "résumé" and "İzmir" tests; check-v4 "ASCII guard scope" (0 of 13,017 log texts, 0 of 875 seam texts) |
| The digit rule pinned on its own ("version two" -> "v2"; every digit cut in the data also fails the first-letter rule) | Task 3 "v2" test; check-v4 probe |
| `clear()` forgets cut and latest interim; `speechFinal` on F1 leaves no cut; F2's flag ignored | Task 3 (`clear`, `!speechFinal`); the three pause tests |
| Empty FINAL -> `clear()` before the empty return; empty INTERIM not a pause | Task 4 Step 4(c); adapter tests "empty FINAL" + "empty INTERIM" control |
| UtteranceEnd -> `clear()`, event still emitted | Task 4 Step 4(d); adapter test "UtteranceEnd" |
| `speech_final` passed through | Task 4 Step 4(c) `data.speech_final === true`; adapter test "speech_final on F1"; `results()` helper |
| English only via `isEnglishLanguage` (= keytermsFor's test; 'multi' excluded); pass-through, no repair line | Task 4 Steps 3-4(b); keyterms test; adapter test "non-English" (Indonesian: ASCII text the module alone would repair); Step 6 calibration |
| Comments: 3,715 ms + 7,835 tail; "25 repaired losses, all 25 true (measured precision; a floor on losses)"; holdout reported, not evidence; non-holdout tolerant tally 42/34/7/1/0; k=2/m=1 weakest; no mic claim; seam2 + no-evidence class; speech_final unmeasured in-app | Task 3 header, `isRespelling` and constant comments; Task 4 Step 4(c) comment |
| Existing 58 module tests + adapter test unchanged and green | Task 3 Step 4 (69 = 58 + 11); Task 4 Step 5 (6 = 1 + 5) |
| Fixtures untouched (v4 reproduces 45/45) | Global Constraints; `evidence/check-v4.out.txt` |
| Extractor rebuilds `<restored> <raw>` when the repair line directly follows a final; parity with committed fixtures, located with `__dirname`; end-to-end run as the import-path check | Task 5 |
| Built module == reference (controller) | `check-v4-built.mjs`, calibrated; controller item 1 |
| Stage seeded from MAIN's current files before any edit | Global Constraints (`seed-stage.mjs`) |
| Log lines byte-identical (RAW event line; repair line on the very next line) | Task 4 Step 4(c) unchanged strings; Task 5 relies on it |
| Per-socket state, restart starts fresh | unchanged from Task 2; existing adapter test |

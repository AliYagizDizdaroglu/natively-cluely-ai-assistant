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


# Task 4 report: the adapter — English gate, pauses, `speech_final`, corrected comment

Status: DONE_WITH_CONCERNS (one coverage gap and two notes in section 9; none blocks). Every brief step done, every predicted count observed. RED keyterms 1 failed | 6 passed (7), RED adapter 4 failed | 2 passed (6), GREEN 7 passed (7) and 6 passed (6), gate calibration 1 failed | 5 passed (6) then 6 passed (6), `electron/audio/` 138 passed (138), tsc root 0 / electron the 6 baseline errors.
No git command was run. `.env` and keys were never read. No subagent was dispatched. No `node -e`, no `bash <script>` (the Bash tool was used once for a read-only `diff -u`).
Four MAIN files were written, all through `copy-into-main.mjs --overwrite`. Task 3's two files and the user's `interview60.chains.json` / `interview60.report.md` were not touched (section 7).

**Fix round 1 (section 12), fix round 2 (section 13) and the Final fix round (the last section) follow.** Together they supersede the hashes and sizes of section 7 for `DeepgramStreamingSTT.ts` (now 16,232 B) and `DeepgramStreamingSTT.boundaryRepair.test.ts` (now 14,252 B), the adapter count of section 3 (6 -> 11) and the neighbours count of section 6 (138 -> 143), and resolve items 1 and 2 of section 9. The tables of 12.7 and 13.7 are superseded by the Final fix round's "Final state of MAIN" for the same two files. Sections 1-11 are otherwise left as written in round 0.

`BR` = `...\scratchpad\boundary-repair`, `SP` = the scratchpad, `MAIN` = `C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant`. Every script and every saved output named below is under `BR\sdd\`.

## 1. Start check

- Branch: `MAIN\.git\HEAD` (read as a plain file) = `ref: refs/heads/fix/coding-style-suffix-all-gemini`. No git command, so the commit id (the dispatch says f745d7e) was not checked.
- `t4-check-stage.mjs`: for all four files the staged copy was byte-identical to MAIN's current file and MAIN's size matched the brief's starting size, so no re-seed was needed (`seed-stage.mjs` was never run):

| file | bytes | sha256 (MAIN = stage) |
|---|---|---|
| `DeepgramStreamingSTT.ts` | 14,831 | 9584012e74a483b9e14718cb51e1e27c23d756cf1ef1c6b79555a86d21c2c177 |
| `DeepgramStreamingSTT.boundaryRepair.test.ts` | 5,096 | 4a2b34ecd4a0c86eff98e80f4ffa292f5d4bb6e295c3f5d20f5d01676170e298 |
| `deepgramKeyterms.ts` | 5,404 | 3650cdb24715eb9148d9518d4e3b2c3000f477f5031134214a2c7a03808fbd4d |
| `deepgramKeyterms.test.ts` | 2,846 | f8255145686021bcfe707e37a6e35b40db44b3d1425ea09d2673ce2a669456ec |

- The originals were snapshotted before any byte reached MAIN (`t4-snapshot-orig.mjs` -> `t4-orig\`), and Task 3's two files were hashed at the same moment (section 7).
- Baseline before any edit: `TEST electron/audio/DeepgramStreamingSTT` -> `Test Files  4 passed (4)`, `Tests  10 passed (10)` (`t4-baseline-adapter.out.txt`).

## 2. Exactness proof (`t4-apply-brief.mjs`)

It rebuilds each of the four files from `t4-orig\` by applying the brief's 12 fenced blocks plus the two inline import edits, then compares the result with the staged file and with MAIN. After Step 1 the two test files were IDENTICAL to the brief-derived text and the two source files were still the originals; after Step 4 all four were IDENTICAL, and MAIN == stage after each copy.
Calibration: for every single edit (`kwTest.import`, `kwTest.append`, `adapterTest.results`, `adapterTest.nested`, `kw.predicate`, `adapter.a.import`, `adapter.b.gate`, `adapter.c.handler`, `adapter.d.utteranceEnd`) "staged vs the brief minus that edit" says DIFFERENT, so the comparison can fail.
Two formatting decisions the brief leaves open: one blank line before the appended `describe('isEnglishLanguage', …)` block and one before the nested v4 `describe` (the files separate blocks that way). Everything else is verbatim.
`diff -u` of the two production files against the originals shows exactly the brief's hunks and nothing else (keyterms: +10 -1 in two hunks; adapter: import, gate, empty-final branch, comment, `speechFinal`/`?.` call, `repaired?.text ?? transcript`, UtteranceEnd line).

## 3. TDD evidence (TEST form: `Set-Location $env:TEMP; cmd /c "npx --prefix … vitest run --root … <file>"`)

### RED, Step 2 (new tests in MAIN, production files still the originals)
`TEST electron/audio/deepgramKeyterms.test.ts` (22:17:24, `t4-red-keyterms.out.txt`):
```
 Test Files  1 failed (1)
      Tests  1 failed | 6 passed (7)
```
Failing: `isEnglishLanguage > is true for en and regional English, false for every other language and for multi` with `TypeError: isEnglishLanguage is not a function`.

`TEST electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts` (22:17:34, `t4-red-adapter.out.txt`):
```
 Test Files  1 failed (1)
      Tests  4 failed | 2 passed (6)
```
Failing (all under `v4: pauses forget the cut, speech_final reaches the module, non-English connections pass through (spec review 2026-09-29)`), each with the received value the brief predicted:
1. `an empty FINAL between F1 and F2 is a pause: F2 is emitted as received, no repair line`: third entry received `service over 10,000,000 documents, it has to support document updates`.
2. `an UtteranceEnd between F1 and F2 is a pause too, and is still re-emitted`: same received text.
3. `speech_final on F1 reaches the module: Deepgram heard the utterance end there, so nothing is restored`: same received text.
4. `a non-English connection passes every transcript through untouched, with no repair line`: third entry received `menangani data yang hilang di pipeline?`.
Passing: the existing restart test and the `an empty INTERIM is not a pause` control.

### GREEN
- Step 3 (predicate in MAIN, 5,801 B), 22:17:59: `Test Files  1 passed (1)`, `Tests  7 passed (7)` (`t4-green-keyterms.out.txt`).
- Step 5 (adapter wired, 16,036 B), 22:18:36: `Test Files  1 passed (1)`, `Tests  6 passed (6)` (`t4-green-adapter.out.txt`).

## 4. Step 6: the gate can fail, then the corrected revert

- Staged edit 4(b)'s last line changed to `const boundaryRepair = createBoundaryRepair();`, copied into MAIN (15,990 B, sha256 c30c2330b8be672c), 22:18:54 (`t4-gate-removed-adapter.out.txt`):
```
 Test Files  1 failed (1)
      Tests  1 failed | 5 passed (6)
```
Only `a non-English connection passes every transcript through untouched, with no repair line` failed; third entry received `menangani data yang hilang di pipeline?` (expected `data yang hilang di pipeline?`).
- Revert: edit 4(b)'s text re-applied on the staged copy (no `seed-stage.mjs`), `t4-apply-brief.mjs` said IDENTICAL to the brief-derived file, copied in: `DeepgramStreamingSTT.ts: 16036 bytes, sha256 2af5409f94f0f3e5 -> 2af5409f94f0f3e5 IDENTICAL` (the same hash as before the mutant). 22:19:15 (`t4-green-after-revert-adapter.out.txt`): `Test Files  1 passed (1)`, `Tests  6 passed (6)`.
- The brief also predicts "and one repair line" for the gate-removed run. Vitest stops at the first failing `expect` (`seen`, test line 179) so the `repairs()` assertion (line 180) never ran and the failure output cannot show it. I observed it separately (`t4-indo-repairline.mjs`, mirror tree): with the gate removed the Indonesian sequence logs exactly `[DeepgramStreaming] boundary repair: restored "menangani" before "data yang hilang di pipeline?"`; with the gate, no line. A 2 x 2 matrix (final / gate-removed adapter x expecting none / expecting the line) read pass / FAIL / FAIL / pass.

## 5. Beyond the brief: per-edit mutants on a mirror tree (MAIN only read; nothing here touches MAIN)

Rule 8 asks that a check that decides something can fail. The RED run only shows the three pause tests fail when ALL v4 wiring is absent, so `t4-mutants.mjs` builds a mirror tree (junction to MAIN's `node_modules`, removed again; same jsdom/globals settings as MAIN's `vitest.config.ts`; vite cache redirected) and runs the six tests plus a throwaway two-test file against the final adapter and single-edit mutants. All 12 variants gave the expected failing set (`t4-mutants.out.txt`):

| variant | failing tests |
|---|---|
| control: the final adapter | none (8 passed) |
| gate removed | the non-English test only |
| empty-final clear dropped | `an empty FINAL…` only |
| clear on ANY empty transcript | `an empty INTERIM is not a pause` only (so the control is calibrated) |
| condition inverted (`if (!isFinal)`) | `an empty FINAL…` and `an empty INTERIM…` |
| UtteranceEnd clear dropped | `an UtteranceEnd…` only |
| `speech_final` not passed | `speech_final on F1…` only |
| `speech_final` always true | the restart test and `an empty INTERIM…` |
| non-English text fallback -> `''` | the non-English test (+ the throwaway tests) |
| `?.` dropped on the UtteranceEnd clear | NONE of the six brief tests (throwaway tests only) |
| `?.` dropped on the empty-final clear | NONE of the six brief tests (throwaway tests only) |
| `?.` dropped on `onTranscript` | the non-English test (+ the throwaway tests) |

The last three rows are the coverage gap of section 9, item 1.

## 6. Neighbours (Step 7) and type-check (Step 8)

`TEST electron/audio/` after the revert (22:19:48, `t4-neighbours.out.txt`) and again at the very end (`t4-neighbours-final.out.txt`), identical both times:
```
 Test Files  10 passed (10)
      Tests  138 passed (138)
```
Per file: `deepgramBoundaryRepair` 68, `DeepgramStreamingSTT.boundaryRepair` 6, `deepgramKeyterms` 7, `DeepgramStreamingSTT.staleSocket` 6, `DeepgramStreamingSTT.socketSummary` 2, `DeepgramStreamingSTT.vadEvents` 1, `GeminiLiveRouter` 30, `SttChannel` 9, `energyVad` 7, `RestSTT` 2 (68+6+7+6+2+1 = 90, the plan's 90, plus 48 in the four other files). No failure anywhere.

tsc from the temp cwd, the plan's exact commands through `cmd /c` (`t4-tsc-root.out.txt`, `t4-tsc-electron.out.txt`):
- root: exit 0, no output.
- electron: exit 2, exactly the 6 baseline errors, none in a file this task touches:
  `GeminiLiveRouter.ts(125,44) TS2339`, `ipcHandlers.ts(3433,18) TS2339`, `ipcHandlers.ts(3433,38) TS2339`, `ipcHandlers.ts(3436,31) TS2339`, `KnowledgeOrchestrator.ts(349,35) TS2322`, `KnowledgeOrchestrator.ts(351,25) TS2322` (same lines and messages as `t3-tsc-electron.out.txt`).
- Gate calibration: `tsc --listFilesOnly -p electron/tsconfig.json` lists all four edited files, the module, its fixtures and `config/languages.ts` (1,492 files plus one `TS5055` config line that only appears without `--noEmit`; `t4-tsc-electron-listfiles.out.txt`), so an error in them would have shown. The root project lists no `electron/audio` file, as PLAN.md says.

## 7. Final state of MAIN (`t4-final-verify.mjs`, run at the end: "all checks pass")

| changed MAIN file | bytes | sha256 |
|---|---|---|
| `electron/audio/deepgramKeyterms.ts` | 5,801 | b4431b9138d9688fa9bbed56ec0762b82a4125dcf487b1e4c363444bd9a95207 |
| `electron/audio/deepgramKeyterms.test.ts` | 3,429 | bfdd8a5d91f48da7734a2fe591cfb0bebd0d87116dd65ac93dfefb3e714a5c92 |
| `electron/audio/DeepgramStreamingSTT.ts` | 16,036 | 2af5409f94f0f3e51a248d3e1b72889de91907da0059bb6aae3b787cf40e7415 |
| `electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts` | 9,520 | a2f0015faa7a30bf16cbaf6821b9aa4f274a91154ea8f7eba30e7c8118dddb77 |

All four: CR = 0, no BOM, valid UTF-8, stage == MAIN.
Task 3's files are exactly as before Task 4: `deepgramBoundaryRepair.ts` 10,743 B sha256 d5ba4da0650e75319b3e4be09dffd529edf48a80f36f8613a2797606e3accc27, `deepgramBoundaryRepair.test.ts` 13,947 B sha256 6956aea35dfef746f1a6132153774c833cdb4b6ffb335154a19890c18c9faec4 (hashed before the first copy and at the end).
No mirror tree, junction or vite cache is left behind; MAIN's `vitest` is still present.

## 8. What the plan's tests did NOT exercise, and what I exercised in a mirror tree

- A real socket and a real `speech_final` payload from Deepgram: the fake sets the field. The installed SDK's `LiveTranscriptionEvent.d.ts` declares `is_final?: boolean; speech_final?: boolean;`, so `data.speech_final` is the SDK's own field name. Not exercised, cannot be from here.
- The built `dist-electron` output (the controller's post-build check).
- A payload with NO `speech_final` field: the modified `results` helper always sets it (default false), so no test sends the field absent any more (the old restart test did). `data.speech_final === true` reads that as false, which leaves the repair as it was before v4.
- A language switch on a LIVE socket (the brief lists it as unfired): exercised in a mirror tree (`t4-switch-proof.mjs`, `t4-switch-proof.out.txt`): one instance, `english-us` -> `indonesian` -> `english-us` -> `auto`, through the real `setRecognitionLanguage` -> `restartStream` -> `connect()` path; connect logs read `lang=en, id, en, multi`; the seam repairs on sockets 1 and 3 and passes through untouched on 2 and 4 (12 events). Calibrated: gate removed fails at the Indonesian step (`expected 2 to be 1`), gate inverted fails at the first step (`expected +0 to be 1`). Not added to MAIN.
- Non-English socket receiving an empty FINAL or an UtteranceEnd (the `?.` null guards): not exercised by the six tests; see section 9, item 1.

## 9. Concerns

1. **Two `?.` guards are pinned by no test, and tsc cannot pin them.** On a non-English (or `multi`) socket `boundaryRepair` is `null`. `boundaryRepair?.clear()` on the empty-FINAL branch and in the UtteranceEnd handler is exercised only by an English socket; the Indonesian test sends no empty transcript and no UtteranceEnd. `electron/tsconfig.json` has no `strict` / `strictNullChecks`, so `boundaryRepair.clear()` compiles. Mutants that drop either `?.` pass all six brief tests (section 5). Real consequence of a future edit dropping one: a TypeError thrown from the UtteranceEnd listener (it has no try/catch) on every UtteranceEnd of an Indonesian or `multi` connection, and a caught TypeError logged as `Parse error` on every empty FINAL. The current code is correct; this is about a regression nobody would see.
   A calibrated fix is ready but NOT applied (it is not in the brief and would make the adapter test 8 tests): the snippet at `t4-proposal-snippet.txt`, inserted at the end of the nested v4 `describe` (its helpers `start`, `results`, `lives`, `repairs` are in scope). In the mirror (`t4-proposal-proof.mjs`, `t4-proposal-proof.out.txt`) it passes on the final adapter (8 passed) and fails on each of: `?.` dropped on the UtteranceEnd clear, on the empty-final clear (the two only it can catch), on `onTranscript` and on `repaired?.restored` (the brief's non-English test fails there too). The gate-removed mutant is caught by the brief's non-English test alone and leaves the proposal green, as it should. It has not been type-checked; run both tsc commands if it is adopted.
```ts
        // A non-English socket holds no repair object, so every pause signal must still be harmless there. The `?.` guards on the
        // empty-FINAL and UtteranceEnd clears are checked by nothing else (electron/tsconfig.json has no strictNullChecks).
        it.each(['indonesian', 'auto'])('%s: an empty FINAL, an empty INTERIM, an UtteranceEnd and a speech_final are harmless', (language) => {
            const { stt, seen } = start(language);
            const errors = vi.spyOn(console, 'error').mockImplementation(() => { });
            const ends: number[] = [];
            stt.on('utterance-end', (e: { at: number }) => ends.push(e.at));
            lives[0].fire('Results', results('hello there', true));
            lives[0].fire('Results', results('', true));
            lives[0].fire('Results', results('', false));
            lives[0].fire('UtteranceEnd', { type: 'UtteranceEnd', last_word_end: 1.2 });
            lives[0].fire('Results', results('and more', true, true));
            stt.stop();
            expect(seen).toEqual([['hello there', true], ['and more', true]]);
            expect(ends).toHaveLength(1);
            expect(repairs()).toEqual([]);
            expect(errors).not.toHaveBeenCalled();        // a swallowed TypeError in the Transcript handler shows up here
        });
```
2. Wording of the brief's edit 4(b) comment, written verbatim as required: "the rule compares ASCII tokens and mangled Spanish and Turkish text in the 2026-09-29 spec review" reads as if the rule compares "mangled text"; a comma before "and mangled" (the rule compares ASCII tokens, and mangled Spanish and Turkish text in the … review) would say what it means. Comment only.
3. The brief's Step 6 prediction "and one repair line" is not visible in the vitest failure output (section 4); I observed it separately. No action needed.

## 10. Deviations from the brief

None in code or counts. Additions that do not touch MAIN: the mirror-tree work of sections 4, 5 and 8, and the proposal in section 9. The dispatch's HEAD note (f745d7e, not e78f7c7) was taken as given: only the branch file was read.

## 11. Files

Changed in MAIN (uncommitted, for the controller): `electron/audio/deepgramKeyterms.ts`, `electron/audio/deepgramKeyterms.test.ts`, `electron/audio/DeepgramStreamingSTT.ts`, `electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts`.
Staged copies (equal to MAIN): `BR\stage\electron\audio\` (the same four names).
Scripts in `BR\sdd\`: `t4-check-stage.mjs`, `t4-snapshot-orig.mjs`, `t4-apply-brief.mjs`, `t4-final-verify.mjs`, `t4-mutants.mjs`, `t4-proposal-proof.mjs`, `t4-switch-proof.mjs`, `t4-indo-repairline.mjs`. Originals: `t4-orig\`. Outputs: `t4-*.out.txt` (named above). Proposal: `t4-proposal-snippet.txt`.

## 12. Fix round 1 (the coordinator's pre-review request: pin the two `?.` guards, add the comma)

Status: DONE. Same method: drift check, stage, `copy-into-main.mjs --overwrite`, LF, no git, no `.env`, no subagent, no `node -e`, no `bash <script>`. Every mutant of this round ran on a mirror tree; MAIN never held one. Scripts and outputs are `t4-fix1-*` under `BR\sdd\`.

### 12.1 Drift check
- At the start `t4-final-verify.mjs` (the round-0 hashes) said "all checks pass": the four Task 4 files in MAIN were the round-0 files, stage == MAIN, Task 3's two files unchanged, branch file unchanged.
- Right before each copy the target was re-hashed: MAIN's test file was still a2f0015f… and MAIN's adapter still 2af5409f…, so no re-seed was needed (`seed-stage.mjs` was not run). Round-0 copies of both files are in `t4-r0\` (`t4-fix1-snapshot.mjs`).

### 12.2 Concern 1: what was added to `DeepgramStreamingSTT.boundaryRepair.test.ts`
A pure insertion at the end of the nested v4 `describe` (34 lines, 2,246 chars; prefix and tail byte-identical to round 0, and the check says NO when a character in the prefix is changed: `t4-fix1-snapshot.mjs`). The brief's tests, helpers and comments are untouched. Two tests, one per guard, so each mutant has exactly one test to fail:
1. `an empty FINAL on a non-English or multi connection is harmless: F2 is emitted as received, no error is logged`
2. `an UtteranceEnd on a non-English or multi connection is harmless and still re-emitted`

Each runs the brief's seam play (`playSeam`, `unchanged`, `repairs`, `start`) with the pause signal between F1 and F2, on BOTH kinds of connection that leave `boundaryRepair` null: `['indonesian', 'id']` and `['auto', 'multi']` (a two-row table, `noRepair`; the file's `lives.length = 0` idiom makes each connection socket #1 of a fresh instance, so `start` is reused unchanged). Test 1 asserts the emitted transcripts equal the unchanged play, no `console.error` call (a spy) and no repair line; test 2 asserts the same transcripts, exactly one re-emitted `utterance-end`, and no repair line. Both assert `lang=<code>)` was in the connect log, so a language key that silently failed to apply (an English socket, guards never reached) cannot pass. A comment above them says why they exist: `electron/tsconfig.json` has no `strictNullChecks`.
Difference from the round-0 snippet: the snippet was one `it.each` per language covering every signal (and a `speech_final` and an empty INTERIM); this is one test per signal covering both languages. The `speech_final` and empty-INTERIM lines touch no `?.` guard (the `?.` on `onTranscript` is pinned by the brief's non-English test, see the table). `t4-proposal-snippet.txt` is superseded.

### 12.3 The new tests fail against their mutants (mirror tree, `t4-fix1-proof.mjs`)
The whole file (8 tests) against the adapter as it stood in MAIN and single-edit mutants, before the test was copied into MAIN (`t4-fix1-mutants-stage.out.txt`) and again at the end against MAIN's final files (`t4-fix1-mutants-main.out.txt`), identical both times. All 10 variants gave the expected failing set:

| variant | failing tests |
|---|---|
| control: the adapter as in MAIN | none: `Tests  8 passed (8)` |
| MUTANT A: bare `boundaryRepair.clear()` at the empty-FINAL branch | the new empty-FINAL test only: `Tests  1 failed \| 7 passed (8)` |
| MUTANT B: bare `boundaryRepair.clear()` at the UtteranceEnd handler | the new UtteranceEnd test only: `Tests  1 failed \| 7 passed (8)` |
| gate removed | the brief's non-English test only |
| empty-final clear dropped | the brief's `an empty FINAL between F1 and F2` only |
| UtteranceEnd clear dropped | the brief's `an UtteranceEnd between F1 and F2` only |
| `speech_final` not passed | the brief's `speech_final on F1` only |
| clear on ANY empty transcript | the brief's `an empty INTERIM` control only |
| `?.` dropped on `onTranscript` | the brief's non-English test and both new tests |
| non-English text fallback -> `''` | the brief's non-English test and both new tests |

The two failures below are excerpts of vitest's own output with the `Array [ … ]` layout condensed to one line; the unedited output (ANSI colours stripped) is `t4-fix1-mutant-A.raw.txt` and `t4-fix1-mutant-B.raw.txt`.
MUTANT A, the failure quoted (`if (isFinal) boundaryRepair.clear();`; the handler's try/catch turns the TypeError into a logged `Parse error`, so the spy catches it; 2 calls = one per connection kind):
```
 FAIL  ... > an empty FINAL on a non-English or multi connection is harmless: F2 is emitted as received, no error is logged
AssertionError: expected "error" to not be called at all, but actually been called 2 times
Received:
  1st error call:  [ "[DeepgramStreaming] Parse error:", [TypeError: Cannot read properties of null (reading 'clear')] ]
  2nd error call:  [ "[DeepgramStreaming] Parse error:", [TypeError: Cannot read properties of null (reading 'clear')] ]
Number of calls: 2
 ❯ electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts:198:32
```
MUTANT B, the failure quoted (`boundaryRepair.clear(); if (!stale()) this.emit('utterance-end', …)`; nothing catches it, so the throw comes out of `fire()`):
```
 FAIL  ... > an UtteranceEnd on a non-English or multi connection is harmless and still re-emitted
TypeError: Cannot read properties of null (reading 'clear')
 ❯ electron/audio/DeepgramStreamingSTT.ts:260:86        (the UtteranceEnd listener)
 ❯ Object.fire electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts:27:55
 ❯ playSeam electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts:126:13
 ❯ electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts:208:17
```
Then the final GREEN in MAIN (real `TEST` command, 22:36:02, `t4-fix1-green-adapter-tests.out.txt`): `Test Files  1 passed (1)`, `Tests  8 passed (8)`.

### 12.4 The tsc claim in the new comment, and the gate on the new lines (`t4-fix1-tsc-proof.mjs`)
The comment says tsc accepts a bare call. I checked it rather than assumed it: a mirror tree with MAIN's `electron/tsconfig.json` byte for byte (`noImplicitAny` true, no `strict`, no `strictNullChecks`) over the six files the adapter test needs. Control: tsc exit 0, no output. The adapter with mutant A, and with mutant B: tsc exit 0, no output, so nothing but the new tests can catch a dropped `?.`.
Calibration of the gate on the new lines: a deliberate error inside each new test is reported at that line and nowhere else (`errors.noSuchMethod()` TS2339 at 198; `toHaveLength('1')` TS2345 at 212; `const n: number = code` TS2322 at 206).

### 12.5 Concern 2: the comma, comment only (`t4-fix1-comment-proof.mjs`, run on the stage and again on MAIN's copy)
`DeepgramStreamingSTT.ts` line 202, the only line that differs (16,036 -> 16,037 B):
```
-            // sockets only (the test keytermsFor uses): the rule compares ASCII tokens and mangled
+            // sockets only (the test keytermsFor uses): the rule compares ASCII tokens, and mangled
```
Text level: exactly one character longer, it is a comma, on a `//` line, and removing it gives back the round-0 file. Transpile level: MAIN's esbuild (loader ts, format cjs) gives byte-identical output for the round-0 and the new file (11,511 chars, sha256 17ee35c2cb6ff681 both). Calibration: the same transpile check says DIFFERENT for a code change (`=== true` -> `== true`) and for a comma added inside a string literal.

### 12.6 Re-runs on the final files (TEST form from the temp cwd)
- Adapter test, 22:36:48 (`t4-fix1-final-adapter-test.out.txt`): `Test Files  1 passed (1)`, `Tests  8 passed (8)`.
- Keyterms, 22:36:53 (`t4-fix1-final-keyterms-test.out.txt`): `Test Files  1 passed (1)`, `Tests  7 passed (7)`.
- `TEST electron/audio/` (`t4-fix1-final-neighbours.out.txt`): `Test Files  10 passed (10)`, `Tests  140 passed (140)` (138 + the two new tests). Per file: `deepgramBoundaryRepair` 68, `DeepgramStreamingSTT.boundaryRepair` 8, `deepgramKeyterms` 7, `DeepgramStreamingSTT.staleSocket` 6, `DeepgramStreamingSTT.socketSummary` 2, `DeepgramStreamingSTT.vadEvents` 1, `GeminiLiveRouter` 30, `SttChannel` 9, `energyVad` 7, `RestSTT` 2.
- tsc, the plan's two commands: root exit 0, no output (`t4-fix1-tsc-root.out.txt`); electron exit 2, exactly the 6 baseline errors (`GeminiLiveRouter.ts(125,44)`, `ipcHandlers.ts(3433,18)`, `(3433,38)`, `(3436,31)`, `KnowledgeOrchestrator.ts(349,35)`, `(351,25)`), none in a file this task touches (`t4-fix1-tsc-electron.out.txt`). The test file is in the electron project (round-0 `--listFilesOnly`), and 12.4 shows the same tsconfig flags errors on the new lines.

### 12.7 Final state of MAIN (`t4-fix1-final-verify.mjs`: "all checks pass")

| file | bytes | sha256 |
|---|---|---|
| `electron/audio/DeepgramStreamingSTT.ts` (changed: comma) | 16,037 | 70683d814ac6a27f2d765938c86339ffdb6c1d9033a18c071f8fb18e42cdf1a0 |
| `electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts` (changed: +2 tests) | 11,766 | e80e5373b7d7b291154817382e5e10e2344d2893a411011ea63d6c1a1de318e1 |
| `electron/audio/deepgramKeyterms.ts` (unchanged this round) | 5,801 | b4431b9138d9688fa9bbed56ec0762b82a4125dcf487b1e4c363444bd9a95207 |
| `electron/audio/deepgramKeyterms.test.ts` (unchanged this round) | 3,429 | bfdd8a5d91f48da7734a2fe591cfb0bebd0d87116dd65ac93dfefb3e714a5c92 |

All four: CR = 0, no BOM, valid UTF-8, stage == MAIN. Task 3's two files are unchanged (10,743 B d5ba4da0…, 13,947 B 6956aea3…). No mirror tree, junction or vite cache is left behind. The diff against round 0 (`t4-fix1.diff`) is exactly the one comment line and the 34 inserted test lines.

### 12.8 Still not exercised (unchanged from section 8)
A real socket and a real Deepgram `speech_final` payload, and the built `dist-electron` output. The two new tests are characterisation tests of code that was already correct, so their RED is the mutants of 12.3 (the request's method), not a failing run against MAIN.

## 13. Fix round 2 (the Opus task review: 1 Important, Minor items; the controller's rulings applied as given)

Status: DONE. Same method: drift check, stage, `copy-into-main.mjs --overwrite`, LF, no git, no `.env`, no subagent, no `node -e`, no `bash <script>` (the Bash tool was used for read-only `diff -u` and `ls`). Every mutant ran on a mirror tree; MAIN never held one. Scripts and outputs are `t4-fix2-*` under `BR\sdd\`; the round-1 files are kept in `t4-r1\`.

### 13.1 Drift check
- At the start `t4-fix1-final-verify.mjs` (the round-1 hashes) said "all checks pass". Right before the two copies MAIN's adapter was still 70683d81… and MAIN's test still e80e5373…; no re-seed (`seed-stage.mjs` was not run). The round-1 copies were snapshotted first (`t4-fix2-snapshot.mjs` -> `t4-r1\`).
- Task 5's extractor `interview60.turns-finals.mjs` (1,592 B, in MAIN) was only read, to confirm the dependency the new comment names: `finalsFrom` matches a `Transcript event — isFinal=true` line and reads `lines[i + 1]` against the `boundary repair: restored` pattern. It was not touched.

### 13.2 The rulings and what was done
| ruling | done |
|---|---|
| 1. Important: pin the repair line as the VERY NEXT line after its final | The reviewer's `SNIPPET` test added at the end of the nested v4 `describe`, title and body verbatim, with a 3-line comment above it that names the extractor. One comment line added above the repair `console.log` in `DeepgramStreamingSTT.ts`, the coordinator's wording verbatim: `// interview60.turns-finals.mjs pairs this line with the final logged just above it: keep the two adjacent`. |
| 2. Minor, accepted: R-RECONNECT | Added as a test after the adjacency test, adapted to the nested `describe`'s helpers (`start`, `unchanged`, `repairs`; `expect(lives).toHaveLength(2)` kept from the probe). Title: `a socket the server closed (1011) and replaced does not share its cut: F2 on the reconnected socket is emitted as received`. |
| 3. Minor, SKIPPED: R-STALE-UE (V9) | Nothing added. In the mirror V9 (the UtteranceEnd clear moved under `stale()`) passes all 10 tests, as ruled. |
| 4. Minor, comment-only | `:231` "(they precede the words of every segment)" -> "(they are frequent and can precede a segment's words)"; `:238` "6 of 20 seam plays" -> "Deepgram lost a word in 6 of 20 seam1 plays". The measurement comment's last three lines were re-wrapped into four so no line grows past the block's width (words unchanged: checked in 13.4). |

The test insertion is pure: prefix and tail byte-identical to round 1, 31 lines / 2,070 chars, and the check says NO when a character in the prefix is changed (`t4-fix2-snapshot.mjs`).

### 13.3 V10, V11 and V12 fail the new tests (mirror tree, `t4-fix2-proof.mjs`)
The whole file (10 tests) against the adapter and single-edit mutants V0-V12 (numbering as in the review's `review-mutants.mjs`), first with the test staged and the adapter as it stood in MAIN (`t4-fix2-mutants-stage.out.txt`), again at the end against MAIN's final files (`t4-fix2-mutants-main.out.txt`); identical both times, 0 of 13 variants differed from the expectation. The unedited vitest output of V10-V12 (ANSI colours stripped) is `t4-fix2-mutant-V10.raw.txt`, `-V11`, `-V12`.

| variant | failing tests |
|---|---|
| V0 control | none: `Tests  10 passed (10)` |
| V10: a log line inserted between the event line and the repair line (`console.log('…review-probe'); const repaired = …`) | the adjacency test only: `Tests  1 failed \| 9 passed (10)` |
| V11: the repair log block moved after the emit | the adjacency test only: `Tests  1 failed \| 9 passed (10)` |
| V12: one repair per `start()`, shared by reconnect sockets | the reconnect test only: `Tests  1 failed \| 9 passed (10)` |
| V1 gate removed | the brief's non-English test only |
| V2 gate inverted | the restart test, `an empty INTERIM…`, the non-English test, the adjacency test |
| V3 clear dropped on the empty FINAL | `an empty FINAL between F1 and F2` only |
| V4 clear dropped on UtteranceEnd | `an UtteranceEnd between F1 and F2` only |
| V5 `speech_final` not passed | `speech_final on F1` only |
| V6 an empty INTERIM clears too | `an empty INTERIM…` only |
| V7 bare `clear()` on the empty FINAL (null repair) | the round-1 empty-FINAL test only |
| V8 bare `clear()` on UtteranceEnd (null repair) | the round-1 UtteranceEnd test only |
| V9 UtteranceEnd clear moved under `stale()` | none (accepted, ruling 3) |

The three failures, excerpts of vitest's own output (`Received` lines exact):
```
V10  the repair line is the very next log line after its final's Transcript event line, before any listener runs
AssertionError: expected '[DeepgramStreaming] review-probe' to be '[DeepgramStreaming] Transcript event …' // Object.is equality
Expected: "[DeepgramStreaming] Transcript event — isFinal=true, text="over 10,000,000 documents, it has to support document updates""
Received: "[DeepgramStreaming] review-probe"
 ❯ electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts:227:32

V11  (same test)
AssertionError: expected '[listener] service over 10,000,000 do…' to be '[DeepgramStreaming] Transcript event …' // Object.is equality
Expected: "[DeepgramStreaming] Transcript event — isFinal=true, text="over 10,000,000 documents, it has to support document updates""
Received: "[listener] service over 10,000,000 documents, it has to support document updates"
 ❯ electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts:227:32

V12  a socket the server closed (1011) and replaced does not share its cut: F2 on the reconnected socket is emitted as received
AssertionError: expected [ [ …(2) ], [ …(2) ], [ …(2) ] ] to deeply equal [ [ …(2) ], [ …(2) ], [ …(2) ] ]
- Expected
+ Received
  … (the third entry of the array)
-     "over 10,000,000 documents, it has to support document updates",
+     "service over 10,000,000 documents, it has to support document updates",
 ❯ electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts:244:26
```
V11 shows why the test attaches a logging listener: without one, a repair line moved after the emit would still directly follow the event line.
The V11 mutant is built by a block move that treats the repair `if` block, the new comment inside it included, as one unit (`t4-fix2-proof.mjs` throws if the block structure is not as expected).

### 13.4 `DeepgramStreamingSTT.ts` changed by comments only (`t4-fix2-comment-proof.mjs`, run on the stage and again on MAIN's copy)
Line diff against round 1 (LCS): 4 lines removed, 6 added, every one a `//` comment line:
```
-  231: // not (they precede the words of every segment).
+  231: // not (they are frequent and can precede a segment's words).
-  238: // is a floor on the losses), 6 of 20 seam plays; the rule lives in
-  239: // deepgramBoundaryRepair. speech_final = Deepgram heard the utterance end at
-  240: // this final, so it leaves no cut (never logged: its in-app effect is unmeasured).
+  238: // is a floor on the losses), Deepgram lost a word in 6 of 20 seam1 plays;
+  239: // the rule lives in deepgramBoundaryRepair. speech_final = Deepgram heard the
+  240: // utterance end at this final, so it leaves no cut (never logged: its in-app
+  241: // effect is unmeasured).
+  244: // interview60.turns-finals.mjs pairs this line with the final logged just above it: keep the two adjacent
```
The old phrases are gone, the new ones present, the dependency comment is the line directly above the repair `console.log` inside its `if` block, and the reflowed block equals the original word for word except the one replaced phrase. Transpile equality (MAIN's esbuild, loader ts, format cjs): round 1 and round 2 give byte-identical output, 11,511 chars, sha256 17ee35c2cb6ff681 both. Calibrated: the transpile check says DIFFERENT for a code change (`=== true` -> `== true`) and for a comma inside a string literal, and a code line added next to the new comment makes the transpile DIFFERENT and the line check say NOT comment-only.

### 13.5 Re-runs on the final files (TEST form from the temp cwd)
- Adapter test, 23:09:09 (`t4-fix2-final-adapter-test.out.txt`): `Test Files  1 passed (1)`, `Tests  10 passed (10)`.
- Keyterms, 23:09:15 (`t4-fix2-final-keyterms-test.out.txt`): `Test Files  1 passed (1)`, `Tests  7 passed (7)`.
- `TEST electron/audio/` (`t4-fix2-final-neighbours.out.txt`): `Test Files  10 passed (10)`, `Tests  142 passed (142)` (140 + the two new tests). Per file: `deepgramBoundaryRepair` 68, `DeepgramStreamingSTT.boundaryRepair` 10, `deepgramKeyterms` 7, `DeepgramStreamingSTT.staleSocket` 6, `DeepgramStreamingSTT.socketSummary` 2, `DeepgramStreamingSTT.vadEvents` 1, `GeminiLiveRouter` 30, `SttChannel` 9, `energyVad` 7, `RestSTT` 2.
- tsc, the plan's two commands: root exit 0, no output (`t4-fix2-tsc-root.out.txt`); electron exit 2, exactly the 6 baseline errors (`GeminiLiveRouter.ts(125,44)`, `ipcHandlers.ts(3433,18)`, `(3433,38)`, `(3436,31)`, `KnowledgeOrchestrator.ts(349,35)`, `(351,25)`), none in a file this task touches (`t4-fix2-tsc-electron.out.txt`). Both changed files are in the electron project (round-0 `--listFilesOnly`), and 12.4 showed that project's tsconfig flags errors on new test lines.

### 13.6 Notes for the reviewer
- The dependency comment is 134 chars wide (28 of indentation), the coordinator's example wording verbatim and one line as ruled; the widest comment line before was 107, the file's code lines run past 300. It is the one outlier; wrapping it would make it two lines.
- The reconnect test hard-codes the first reconnect delay (1000 ms, `RECONNECT_BASE_DELAY_MS`), and `expect(lives).toHaveLength(2)` makes the assumption fail loudly if that constant changes; the rest of the wait is computed from the fixture (`F2.atMs - F1.atMs - 1000`), so F2 still arrives inside the 5 s window.
- The adjacency test pins WHERE the repair line sits; the line's exact text is already pinned by the outer restart test's `toEqual` on the full repair line.
- Still not exercised (unchanged): a real socket and a real Deepgram `speech_final` payload, and the built `dist-electron` output. The two new tests are again characterisation tests, so their RED is the mutants of 13.3.

### 13.7 Final state of MAIN (`t4-fix2-final-verify.mjs`: "all checks pass")

| file | bytes | sha256 |
|---|---|---|
| `electron/audio/DeepgramStreamingSTT.ts` (changed: comments only) | 16,236 | 57292516fc495df179829bd309e1a949e665ef800764443d0ee988d8366f9d1a |
| `electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts` (changed: +2 tests) | 13,838 | 2f3eb860c6142415ca5e9c4517f930f477ff25ad6ecf968508f28be3fab0eab8 |
| `electron/audio/deepgramKeyterms.ts` (unchanged) | 5,801 | b4431b9138d9688fa9bbed56ec0762b82a4125dcf487b1e4c363444bd9a95207 |
| `electron/audio/deepgramKeyterms.test.ts` (unchanged) | 3,429 | bfdd8a5d91f48da7734a2fe591cfb0bebd0d87116dd65ac93dfefb3e714a5c92 |

All four: CR = 0, no BOM, valid UTF-8, stage == MAIN. Task 3's two files are unchanged (10,743 B d5ba4da0…, 13,947 B 6956aea3…). No mirror tree, junction or vite cache is left behind. The diff against round 1 (`t4-fix2.diff`) is exactly the four comment hunks of 13.4 and the 31 inserted test lines.

## Final fix round

Status: DONE. The ONE fix dispatch after the whole-change Opus review ("Ready with fixes"), `sdd\final-fix1.md`: tests and comments only, NO code behaviour, across four MAIN files (two of them not Task 4's own: Task 3's module comments and Task 5's extractor test). Same rules as before: stage, `copy-into-main.mjs --overwrite`, LF only, no git, never `.env`, no subagents, no `node -e`, no `bash <script>` (the Bash tool ran only plain read-only `diff -u` commands, redirected to `t4-final-*.diff`). Mutants live only in mirror trees; MAIN never held one. Tests use the TEST form from a temp cwd, never the full suite. Scripts and outputs are `t4-final-*` under `BR\sdd\` (`t4-final-verify.mjs` is round 0's; this round's verifier is `t4-final-fix-verify.mjs`); the files as the round began are in `t4-r2\`.

### Drift check
`t4-final-snapshot.mjs`: all four MAIN files were exactly the dispatch table's (13,838 B 2f3eb860…, 16,236 B 57292516…, 10,743 B d5ba4da0…, 4,115 B d40c6c23…). All four staged copies were already byte-identical to MAIN's (the extractor test had been staged by Task 5's implementer), so nothing was re-seeded (`seed-stage.mjs` was not run). The four were re-hashed once more right before the copies: unchanged.

### The edits
| edit | file | done |
|---|---|---|
| E1 | `DeepgramStreamingSTT.boundaryRepair.test.ts` | New test `the 5 s window runs on the arrival clock: F2 5001 ms after F1 is emitted as received, no repair line`, body verbatim from the dispatch, inserted right before the `// Indonesian is written in plain ASCII…` comment, i.e. after the empty-INTERIM control (so its "the three above" stays true). |
| E2 | same file | `this covers the other way a socket is replaced:` -> `this covers another way a socket is replaced:`. |
| E3 | `electron/test/golden/interview60.turns-finals.test.ts` | T3's orphan case: `const [iv, f1, f2, rep] = LOG.split('\n');` and `finalsFrom([f2, iv, rep].join('\n'), 0)` (the repair line now sits under an interim, not under another repair line). T2's name: `keeps interims and empty finals out, drops finals before \`since\` and keeps a final exactly at it`. |
| E4 | `electron/audio/deepgramBoundaryRepair.ts` (comments) | At the end of the CUT bullet, after `Traw = the same words in I's own spelling`: `, as [A-Za-z0-9']+ runs: punctuation inside a word is lost ("4.1" -> "4 1", "C++" -> "C"); none of the 25 non-holdout restores held such a word, so the effect is unmeasured` + the sentence's period (1 line became 3). PAUSE bullet: `0 of 29 log repairs had an empty final` -> `0 of the 25 non-holdout log repairs had an empty final` (3 lines re-wrapped into 3). Only the touched lines were re-wrapped, to the header's existing widest line (103 columns) and the ` *          ` indentation; the header grew from 63 to 65 lines. |
| E5 | `DeepgramStreamingSTT.ts` (comment) | `(median 187 per flight hour)` -> `(median 187 per run log)`. |

The E1 blank line: the dispatch says "Two blank lines follow the test, as shown". The two empty lines in the fence are the reviewer's `'', ''` array entries in `fr-t4-cal.mjs`, which `join('\n')` turns into ONE blank line in the file, and one blank line is how this file separates tests. I matched the reviewer's proposal byte for byte (proved below). If two blank lines are wanted, it is one empty line after the new test's `});` (14,253 B).

### Mutant calibrations (mirror trees; `t4-final-proof.mjs`, output `t4-final-proof-stage.out.txt` before the copies and `t4-final-proof-main.out.txt` against MAIN's final files, identical)
First, both edited test files are byte-identical to the files the reviewer's scripts build: the adapter test (14,246 chars, sha 5f43849a3ce22ae0) equals `fr-t4-cal.mjs`'s proposed file, the extractor test (4,132 chars, sha 0796ae6832b70d9f) equals `fr-t5-cal.mjs`'s.

E1, the adapter's clock (a mutant that passes a constant `0` as atMs, so the 5 s window never closes; reproduces `fr-t4-cal.out.txt`):

| test file | real adapter | clock stuck at 0 |
|---|---|---|
| CURRENT (10 tests) | 10/10 passed | 10/10 passed (the gap) |
| NEW (11 tests) | 11/11 passed | 10/11 passed: only `the 5 s window runs on the arrival clock…` fails |

The mutant's failure, vitest's own text (`t4-final-mutant-clock0.raw.txt`; `Tests  1 failed | 10 passed (11)`): the third entry is `service over 10,000,000 documents, it has to support document updates` where `over 10,000,000 documents, it has to support document updates` was expected, at test line 170 (`expect(seen).toEqual(unchanged)`): with the clock stuck at 0 the repair fires for an F2 that arrives 5001 ms after F1.

E3, the extractor test (P passed, F failed, S skipped: T1 T2 T3 + the two parity tests, which skip in the mirror because `interview60.runs/` is gitignored and absent there; reproduces `fr-t5-cal.out.txt`):

| module | CURRENT test file | NEW test file |
|---|---|---|
| M0 real | PPPSS | PPPSS |
| M1 `!FINAL.test(lines[i - 1] ?? '')` -> `REPAIR.test(lines[i - 1] ?? '')` | PPPSS (the gap) | PPFSS: the new T3 fails |
| M2 the orphan `throw` removed | PPFSS | PPFSS: T3 fails |
| M3 the wrong-final `throw` removed | PPFSS | PPFSS: T3 fails |
| M4 `at >= sinceMs` -> `at > sinceMs` | PFPSS: T2 fails | PFPSS: T2 fails |

So M1 passes the CURRENT file and fails the NEW one, the real module passes, and removing either `throw` fails the new T3 (as it already failed the current one).

### Comment-only proofs (`t4-final-comment-proof.mjs`, run on the stage and again on MAIN's copies)
- `DeepgramStreamingSTT.ts`: one line removed, one added, both `//` comments; esbuild transpile (MAIN's esbuild, loader ts, format cjs) byte-identical before and after, 11,511 chars, sha256 17ee35c2cb6ff681 both.
- `deepgramBoundaryRepair.ts`: 4 lines removed, 6 added, all header-comment lines; the whole header, read as words, equals the original with exactly the two intended replacements; every added line is at most 103 columns and keeps the ` *          ` indentation; transpile byte-identical, 2,994 chars, sha256 13e7e177658aa3a9 both.
- Calibration, once per file with a one-character code change: `data.speech_final === true` -> `== true` in the adapter and `REPAIR_WINDOW_MS = 5000` -> `5001` in the module each make the transpile DIFFERENT; a code line added among the comments makes the line check say NOT comment-only.

### Re-runs on the final files (TEST form from the temp cwd)
- Adapter test file, 07:34:21 (`t4-final-adapter-test.out.txt`): `Test Files  1 passed (1)`, `Tests  11 passed (11)`.
- `electron/test/golden/interview60.turns-finals.test.ts`, 07:34:26 (`t4-final-turns-finals-test.out.txt`): `Test Files  1 passed (1)`, `Tests  5 passed (5)` (in MAIN the run folders exist, so the two parity tests run instead of skipping).
- `TEST electron/audio/` (`t4-final-neighbours.out.txt`): `Test Files  10 passed (10)`, `Tests  143 passed (143)` (142 + E1). Per file: `deepgramBoundaryRepair` 68, `DeepgramStreamingSTT.boundaryRepair` 11, `deepgramKeyterms` 7, `DeepgramStreamingSTT.staleSocket` 6, `DeepgramStreamingSTT.socketSummary` 2, `DeepgramStreamingSTT.vadEvents` 1, `GeminiLiveRouter` 30, `SttChannel` 9, `energyVad` 7, `RestSTT` 2.
- tsc, the plan's two commands: root exit 0, no output (`t4-final-tsc-root.out.txt`); electron exit 2, exactly the 6 baseline errors (`GeminiLiveRouter.ts(125,44)`, `ipcHandlers.ts(3433,18)`, `(3433,38)`, `(3436,31)`, `KnowledgeOrchestrator.ts(349,35)`, `(351,25)`), none in a file this task touches (`t4-final-tsc-electron.out.txt`). `tsc --listFilesOnly -p electron/tsconfig.json` lists all four changed files, so an error in them would have shown (`t4-final-tsc-electron-listfiles.out.txt`).

### Final state of MAIN (`t4-final-fix-verify.mjs`: "all checks pass")

| file | bytes | sha256 |
|---|---|---|
| `electron/audio/DeepgramStreamingSTT.boundaryRepair.test.ts` | 14,252 | 5f43849a3ce22ae0acad24da9aacea0315cba10636f79ff40f21e13e1dac1cae |
| `electron/audio/DeepgramStreamingSTT.ts` | 16,232 | 74fff12e86d916aea915350b1c215f46f3265ade9a521111dd1250070b0078f9 |
| `electron/audio/deepgramBoundaryRepair.ts` | 10,955 | 97f1ba9fee3268c4b2f2041564f476e376b1fb20c2be63fc1fd1c34a38d6c82c |
| `electron/test/golden/interview60.turns-finals.test.ts` | 4,144 | 0796ae6832b70d9f3b34d1ca8c7c8714e52a54e527e1df08b30a5769606607ed |

All four: CR = 0, no BOM, valid UTF-8, stage == MAIN. `deepgramKeyterms.ts` (5,801 B b4431b91…), `deepgramKeyterms.test.ts` (3,429 B bfdd8a5d…) and Task 3's `deepgramBoundaryRepair.test.ts` (13,947 B 6956aea3…) are unchanged; Task 5's extractor `interview60.turns-finals.mjs` was not touched. No mirror tree, junction or vite cache is left behind. The diffs against the round-start files are `t4-final-1-adapter-test.diff`, `t4-final-2-adapter.diff`, `t4-final-3-module.diff`, `t4-final-4-extractor-test.diff`: exactly the hunks of the edits table.

### Notes and concerns
- The E1 blank line (above): one, matching the reviewer's proposal; the dispatch's "two" is a one-line change if it was meant literally.
- The evidence numbers in the E4 and E5 comments (25 non-holdout repairs, none holding a word with punctuation inside; 28 logs of which 6 runs have no Deepgram finals; the median 187) were applied verbatim from the dispatch and were not recomputed here.
- The module changed only in its header comment, so the built `dist-electron` output is unaffected (the transpile is byte-identical); it was not rebuilt.
- Still not exercised (unchanged): a real socket and a real Deepgram `speech_final` payload.

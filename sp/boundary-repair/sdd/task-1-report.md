# Task 1 report: `deepgramBoundaryRepair.ts`, test-first

Status: DONE_WITH_CONCERNS (concerns are coverage notes about the brief's verbatim tests, not defects in the port).
**Fix round 1 is the last section of this file.** It supersedes the module and test rows of section 4 (new hashes there) and the survivor table of 5b (now 2 survivors, see F7); the module's compiled code is unchanged since round 0.
No git command was run. `.env` was never read. `DeepgramStreamingSTT.ts` was not touched (13,865 bytes, 2026-09-20 01:58, verified after the last step).
MAIN branch check before starting: `MAIN\.git\HEAD` = `ref: refs/heads/fix/coding-style-suffix-all-gemini`.

## 1. What was implemented

Three new files in MAIN `electron/audio/`, each authored under the staging folder (`boundary-repair\stage\electron\audio\`) and copied with `copy-into-main.mjs`:

| file | how |
|---|---|
| `deepgramBoundaryRepair.fixtures.json` | copied from `fixtures-v3.json`, never opened in an editor |
| `deepgramBoundaryRepair.test.ts` | the brief's Step 2 block, verbatim |
| `deepgramBoundaryRepair.ts` | Step 4 skeleton first, then only `createBoundaryRepair` replaced by the Step 6 block |

Exports: `BoundaryRepairResult`, `BoundaryRepair`, `createBoundaryRepair` (the exact names Task 2 and `rule-sim.mjs --impl` need).

Transcription guard: `boundary-repair\t1\t1-verify.mjs` extracts the brief's fenced blocks and compares each staged file byte for byte.
Results: test file IDENTICAL to the Step 2 block; skeleton IDENTICAL to the Step 4 block; final module IDENTICAL to (Step 4 block with its function replaced by the Step 6 block). The verifier was calibrated both ways: `impl` mode against the skeleton and `skeleton` mode against the implementation each reported DIFFERENT, at the right character offset (4259).

Fidelity to `rule-v3.mjs`, read line by line: same `norm`/`tok`/`rawTok` regexes; `f[0] !== T[0]` guard; k = 1..2 with `k < T.length`, first match wins; `m = min(2, |T| - k)` with `f.length >= m`; `Traw.slice(0, k)`; `cut = null` before the new-cut check; strict/tolerant as the reference; `lastInterim = null` after every final; 5000 ms inclusive from F1's arrival. Only differences: names, `const remembered = cut` (narrowing), and `restored: null` on interims (the reference omits the key; the texts are identical).

## 2. TDD evidence

Test command (every run), from a temp cwd with MAIN as root:
`cd /c/Users/sotka/AppData/Local/Temp && npx --prefix "<MAIN>" vitest run --root "<MAIN>" electron/audio/deepgramBoundaryRepair.test.ts`

Copy-helper outputs (verbatim):
```
Step 1  electron/audio/deepgramBoundaryRepair.fixtures.json: 22788 bytes, sha256 e65c6e746f821642 -> e65c6e746f821642 IDENTICAL
Step 2  electron/audio/deepgramBoundaryRepair.test.ts: 5749 bytes, sha256 8845563b2b7ef406 -> 8845563b2b7ef406 IDENTICAL
Step 4  electron/audio/deepgramBoundaryRepair.ts: 4385 bytes, sha256 71a253800041f946 -> 71a253800041f946 IDENTICAL   (skeleton)
Step 6  electron/audio/deepgramBoundaryRepair.ts: 5901 bytes, sha256 7b684f162188c932 -> 7b684f162188c932 IDENTICAL   (--overwrite, implementation)
```

### RED 1 (Step 3): module absent
```
 ❯ electron/audio/deepgramBoundaryRepair.test.ts (0 test)
 FAIL  electron/audio/deepgramBoundaryRepair.test.ts
Error: Failed to resolve import "./deepgramBoundaryRepair" from ".../electron/audio/deepgramBoundaryRepair.test.ts". Does the file exist?
  Plugin: vite:import-analysis
  File: C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/audio/deepgramBoundaryRepair.test.ts:2:37
 Test Files  1 failed (1)
      Tests  no tests
```
The failing import is line 2 (the module), not line 3 (the JSON), so Step 1 was in place. Vitest 2.1.9 words it "Failed to resolve import ... Does the file exist?", not the brief's "Failed to load url"; same failure (suite cannot be collected, 0 tests).

### RED 2 (Step 5): pass-through skeleton
`Tests  20 failed | 32 passed (52)` (raw JSON of the run kept in `t1\step5-red.json`).
Failed (20): `symptom`; `seam`; positives #1 to #15; the edges "the window is 5000 ms ... 5000 restores, 5001 does not", "a final that is not a prefix ... (the tolerant cut)", "an interim between F1 and F2 does not disturb the repair (after7 M13 ...)".
Passed (32): the fixture-file check; all 28 negatives; the residuals test; "an interim-only stream ..."; "any final clears the remembered cut ...".
Exactly the brief's calibration. The symptom fails as expected, e.g. the window edge: `Received: "in a rag answer without just making it refuse?"` vs `Expected: "hallucinations in a rag answer without just making it refuse?"`.

### GREEN (Step 7)
```
 ✓ electron/audio/deepgramBoundaryRepair.test.ts (52 tests) 17ms
 Test Files  1 passed (1)
      Tests  52 passed (52)
```

### The original symptom, before and after (h40c R22, from the built module, `t1\t1-symptom.mjs`)
```
interim @0    "How do you cut hallucinations in a rag answer without just making"
final   @17   "How do you cut"                                    -> emitted unchanged
final   @1564 "in a rag answer without just making it refuse?"
  before (pass-through / what the app joined): "in a rag answer without just making it refuse?"
  after  (module):  "hallucinations in a rag answer without just making it refuse?"   restored=["hallucinations"]
seam (S2Q07 play 3): "over 10,000,000 documents, it has to support document updates" -> "service over 10,000,000 documents, ..."   restored=["service"]
```

## 3. Type checks (Step 8)

- Root (`tsc --noEmit -p MAIN/tsconfig.json`): no output, exit 0.
- Electron (`tsc --noEmit -p MAIN/electron/tsconfig.json`): exit 2, exactly the 6 baseline errors, matched by file + code + message:
  `GeminiLiveRouter.ts(125,44) TS2339 'length' on 'never'`; `ipcHandlers.ts(3433,18) TS2339 'canceled' on 'string[]'`; `ipcHandlers.ts(3433,38) TS2339 'filePaths' on 'string[]'`; `ipcHandlers.ts(3436,31) TS2339 'filePaths' on 'string[]'`; `KnowledgeOrchestrator.ts(349,35) TS2322`; `KnowledgeOrchestrator.ts(351,25) TS2322`. None in the new module, the test, or the JSON import.
- Calibration of that gate: `tsc --listFiles` for the electron project lists all three new files (`t1\electron-listfiles.txt` lines 1094 to 1096), so the check could have caught an error in them. Neither tsconfig sets incremental/composite/tsBuildInfo, so `--noEmit` wrote no file.

## 4. Changed MAIN paths (for the controller's commit)

| path | bytes | sha256 prefix (as printed by the helper) | full sha256 |
|---|---|---|---|
| `electron/audio/deepgramBoundaryRepair.ts` (new) | 5901 | 7b684f162188c932 | 7b684f162188c9328008a8db950cc91a5262635df49d3dfc419c562492d7dbbf |
| `electron/audio/deepgramBoundaryRepair.fixtures.json` (new, copy of `fixtures-v3.json`) | 22788 | e65c6e746f821642 | e65c6e746f821642224b523ba2d823d564025179019cf72387062dc696cdaba4 |
| `electron/audio/deepgramBoundaryRepair.test.ts` (new) | 5749 | 8845563b2b7ef406 | 8845563b2b7ef4066c71ae254eea360e29ee1c936b1833b89eb693c8da5d1dc4 |

The full hashes were read from disk after every other step, so they are the final state. All three are LF-only, UTF-8. Listing of `electron/audio/` shows exactly these three additions and no other change.

## 5. Extra checks beyond the brief (all throwaway, in `boundary-repair\t1\`, nothing written to MAIN)

### 5a. Event-for-event equivalence, whole corpus
Built a private CJS copy with esbuild (`t1\built\deepgramBoundaryRepair.cjs`, not MAIN's dist) and ran the controller's own `compare-impl.mjs` on it, unmodified:
`30 streams, 13892 events; repairs: reference 35, built 35; differing events 0` then `EQUIVALENT`.
(35 = 25 non-holdout + 4 holdout + 6 seam. That script replays holdout logs by its own design, "checks code equivalence, chooses nothing"; nothing from them entered any repo file.)

### 5b. Mutation calibration of the brief's tests (rule 8), `t1\t1-mutate.mjs`
The script restates the test's 50 decision checks (symptom, seam, 15 positives, 28 negatives, 5 edges; vitest's 52 adds the fixture-file check and the residuals test, which reuses 3 negatives) and runs them on the MAIN module (0 failing: harness calibrated), on one-line mutants built in memory, and on `rule-v2.mjs`.

Killed:
- window `<=` to `<`, 4999, 6000: each fails the window edge (1).
- no tolerant cut: seam + tolerant edge (2). Tolerant-only cut: 18.
- final does not clear `cut`: the any-final-clears edge (1).
- max skip 1: positive #1 (the one 2-word loss). Match 1 token: negative #22 (NUMBER). Match 3 tokens: positive #6.
- restored word after the text, or one word too many: 20 each. Drop `k < |T|`: 16 negatives. Pass-through: 20 (equals the vitest RED count).
- The design's v2 rule fails 8 negatives (TAIL1 shapes and NUMBER): the negatives and the residuals pin do have teeth.

SURVIVORS (no check fails):

| mutant | what the suite does not pin | fixture evidence |
|---|---|---|
| drop `f[0] !== T[0]` guard | a stutter in the interim tail ("very very") with F2 starting with it would get a duplicated word (derived from the code, not exercised) | the only adjacent repeat in any event is the "000 000" inside "10,000,000" (an artefact of scanning without the module's comma strip), so no real stutter |
| drop `fw.length >= 2` in the tolerant cut | a 1-token final differing from the interim's first word makes a cut | 6 one-token finals exist (negatives #4, #19, #23 to #26) but none discriminates |
| drop `fw.length > 0` | a token-less final ("...") makes a whole-interim cut | 0 token-less events in the fixtures |
| keep `lastInterim` after a final | a stale interim feeds the next final | in the [I, F1, F2] triples F2 is the last event, so state after it is never observed; the one longer sequence (the "Okay." edge) has no later final that is a prefix of the stale interim |
| `MAX_SKIPPED_WORDS` 3 | the upper bound k <= 2 | no fixture needs or forbids a 3-word skip |
| `Traw` lowercased | "the interim's own spelling" | all 17 restored word groups are lowercase |
| no thousands-comma strip | the "10,000" normalisation | "10,000,000" occurs in 4 events (seam, positive #14, negative #17), yet removing the strip changes no outcome |
| `<=` instead of `<` in `fw.length < iw.length` | (equivalent mutant: T = [] never reaches the loop) | n/a |

The port is exact on 13,892 real events, so these are future-regression risks in the brief's tests, not defects in the module. I did not add tests: the brief fixes the test content, and the constraints forbid sequences beyond the design's listed synthetic edges. If the design owner wants them pinned, each needs one synthetic sequence with the reference's output as its expected value.

### 5c. One property of the reference that the port inherits (low severity)
`tok()` lowercases before matching, `rawTok()` does not. Over all BMP code points, exactly one breaks the token-count alignment: U+0130 "İ" (lowercases to "i" + a combining dot). With an interim spelled "İstanbul", the module emitted `"stanbul last last summer and loved it"` for F2 = `"last summer and loved it"` (`t1\t1-align.mjs`). Deepgram English output spells "Istanbul" with ASCII I, so this is academic, and the reference behaves identically. Not changed. A one-line guard (skip the cut when `tok(I).length !== rawTok(I).length`) would close it; that deviates from the reference, so it is the design owner's call.

## 6. What was not exercised (residual risk)

- No live Deepgram socket and no `DeepgramStreamingSTT.ts` wiring (Task 2).
- The module was never built by `build-electron.js`; the CJS build in 5a is a private esbuild build in the scratchpad. `compare-impl.mjs` did confirm the built export `createBoundaryRepair` is a function with the `onTranscript` shape the harness reads.
- Tests ran under vitest 2.1.9 from the temp cwd only; the full suite was not run (per instructions).

## 7. Files in the scratchpad (throwaway)

`boundary-repair\stage\electron\audio\*` (staged sources); `boundary-repair\t1\`: `t1-verify.mjs`, `t1-summarise.mjs`, `t1-mutate.mjs`, `t1-survivors.mjs`, `t1-symptom.mjs`, `t1-align.mjs`, `step5-red.json`, `electron-listfiles.txt`, `built\deepgramBoundaryRepair.cjs`.

---

# Fix round 1 (coordinator's ruling: the plan's test content was a floor)

Scope, as ordered: six pinning tests added to the synthetic-edges block, one header comment corrected, no change to the module's code. No git. `.env` not touched. Staged in the scratchpad, copied with the helper, LF only.

## F1. What changed

1. **Test file.** Six tests inserted at the end of `describe('deepgramBoundaryRepair synthetic edges (the symptom\'s strings)')`, after the M13 test, text exactly as in the coordinator's message. Proof that nothing else moved: `t1\t1-fix1-verify.mjs test` removes the inserted region and the remainder is byte-identical to the brief's Step 2 block (one region of 29 lines, 6 tests).
2. **Module header.** `(rule-sim.mjs --impl proves it)` became `(checked event for event on the recorded Deepgram streams, 2026-09-29)`. `diff -u` against the saved round-0 module shows exactly that one line; `t1-fix1-verify.mjs module` reports IDENTICAL to the brief's composition with only that replacement. The other `rule-sim.mjs` mention (line 29, "Measured over every run log (rule-sim.mjs, 2026-09-29)") is a statement about measurement and was left as ordered.
3. **The code did not change.** esbuild CJS builds of the round-0 and round-1 module are byte-identical (`cmp` exit 0, 2754 bytes each), so the 13,892-event equivalence result of section 5a holds unchanged.

## F2. The six new tests (numbered as in the coordinator's message)

| # | title | pins |
|---|---|---|
| 1 | restores the interim's own spelling, index-aligned past an apostrophe word before the cut | `Traw` spelling and `tok`/`rawTok` index alignment |
| 2 | a punctuation-only final is no cut (it has no tokens) and does not throw | `fw.length > 0` |
| 3 | a one-word final is never a tolerant cut: a late "Wow." does not remember the interim | tolerant `fw.length >= 2` |
| 4 | a final with no interim before it is not compared with an older interim | `lastInterim = null` after a final |
| 5 | a loss of three words is left alone: at most two skipped words are restored | `MAX_SKIPPED_WORDS` |
| 6 | F2 starting with the interim's first tail word is the normal case, even when that word repeats | `f[0] !== T[0]` guard |

## F3. Baseline before any mutant

Original module (sha256 prefix 7b684f16) plus the 58-test file: `Tests  58 passed (58)`, so all six new tests pass on the real module.

## F4. The seven mutant runs (rule 8)

Procedure per mutant, in ONE command so MAIN never holds a mutant between calls: the mutant (one replacement in the saved original, find string unique, generated by `t1\t1-make-mutants.mjs` into `t1\mut\`) is copied into MAIN with `--overwrite`, the test file is run, and the original is copied back with `--overwrite`. Every restore printed `electron/audio/deepgramBoundaryRepair.ts: 5901 bytes, sha256 7b684f162188c932 -> 7b684f162188c932 IDENTICAL`. Raw outputs: `t1\fix1-mut-a.txt` to `t1\fix1-mut-g.txt`.

Every run ended `Tests  1 failed | 57 passed (58)`, and the one failure is the named test:

| mutant | put into MAIN (bytes, sha256 prefix, from the helper) | failing test | received (expected in the last column) |
|---|---|---|---|
| (a) Traw lowercased: `rawTok` returns `tok(s)` | 5860, a806a05e8033481d | #1 "restores the interim's own spelling, index-aligned past an apostrophe word before the cut" | `"rag hallucinations in a rag answer without just making it refuse?"` (expected `"RAG hallucinations ..."`) |
| (b) `rawTok` regex without the apostrophe, `[A-Za-z0-9]+` | 5900, 4877bcc43e066772 | #1, same test | `"cut hallucinations in a rag answer without just making it refuse?"` (expected `"RAG hallucinations ..."`; "How'd" splits in two, the raw index shifts by one and the wrong word is restored) |
| (c) `fw.length > 0 &&` removed from the cut check | 5884, 65106a1d109fc811 | #2 "a punctuation-only final is no cut (it has no tokens) and does not throw" | `"How do you cut hallucinations in a rag answer without just making it refuse?"` (expected `"you cut hallucinations ..."`) |
| (d) tolerant cut's `fw.length >= 2 &&` removed | 5883, 37aba94961e81fd5 | #3 "a one-word final is never a tolerant cut: a late "Wow." does not remember the interim" | `"do you cut hallucinations in a rag answer without just making it refuse?"` (expected `"you cut hallucinations ..."`) |
| (e) `lastInterim = null;` after a final removed | 5869, eb2e554a4fae86c1 | #4 "a final with no interim before it is not compared with an older interim" | `"cut hallucinations in a rag answer without just making it refuse?"` (expected `"in a rag answer without just making it refuse?"`) |
| (f) `MAX_SKIPPED_WORDS = 3` | 5901, af89ef8366067f45 | #5 "a loss of three words is left alone: at most two skipped words are restored" | `"hallucinations in a rag answer without just making it refuse?"` (expected `"rag answer without just making it refuse?"`) |
| (g) `f[0] !== T[0]` guard removed (`if (f.length) {`) | 5884, 893c23cb46c23cd6 | #6 "F2 starting with the interim's first tail word is the normal case, even when that word repeats" | `"in in a rag answer without just making it refuse?"` (expected `"in a rag answer without just making it refuse?"`) |

After the last restore (g), before touching the header: the helper printed `5901 bytes, sha256 7b684f162188c932 -> 7b684f162188c932 IDENTICAL`, and an independent `sha256sum` of MAIN's module gave `7b684f162188c9328008a8db950cc91a5262635df49d3dfc419c562492d7dbbf`. I predicted each received value by hand from the module's logic before running; all seven matched.

## F5. Final counts and type checks (module and test in their final state)

- Test file: `Tests  58 passed (58)` (52 + 6), `Test Files  1 passed (1)`.
- Root `tsc --noEmit -p MAIN/tsconfig.json`: no output, exit 0.
- Electron `tsc --noEmit -p MAIN/electron/tsconfig.json`: exit 2, exactly the same 6 baseline errors as before (`GeminiLiveRouter.ts(125,44)`, `ipcHandlers.ts(3433,18)`, `(3433,38)`, `(3436,31)`, `KnowledgeOrchestrator.ts(349,35)`, `(351,25)`), none in the module, the test file or the JSON import.

## F6. Final files (they supersede the module and test rows of section 4; the fixtures file is unchanged)

| path | bytes | sha256 prefix (helper) | full sha256 |
|---|---|---|---|
| `electron/audio/deepgramBoundaryRepair.ts` | 5940 | 4653b898dadc0885 | 4653b898dadc0885c552065ef3a6fb7324d180cabc8d0586dece8dcb1f1e34f6 |
| `electron/audio/deepgramBoundaryRepair.test.ts` | 7691 | c57ef09964fce75a | c57ef09964fce75ae77eaffdbcdf1960db75fe002641512132beb23c269bdb37 |
| `electron/audio/deepgramBoundaryRepair.fixtures.json` (unchanged) | 22788 | e65c6e746f821642 | e65c6e746f821642224b523ba2d823d564025179019cf72387062dc696cdaba4 |

Full hashes read from disk after the last step; staged copies equal MAIN's; 0 CR bytes in the two changed files. Helper lines: `electron/audio/deepgramBoundaryRepair.test.ts: 7691 bytes, sha256 c57ef09964fce75a -> c57ef09964fce75a IDENTICAL` and `electron/audio/deepgramBoundaryRepair.ts: 5940 bytes, sha256 4653b898dadc0885 -> 4653b898dadc0885 IDENTICAL`. `DeepgramStreamingSTT.ts` untouched (13,865 bytes, 2026-09-20 01:58).

## F7. Mutation matrix after the round (`t1\t1-mutate2.mjs`, 56 checks = the round-0 50 + the 6 new; the unmutated module fails 0)

Survivors, of 23 mutants: two.
- `no thousands-comma strip` (`stripThousands` returns its input): still unpinned; none of the six tests covers it. It appears in fixtures ("10,000,000" in 4 events) but changes no outcome there.
- `fw.length <= iw.length` in the cut check: an equivalent mutant (T is empty and never reaches the loop).

Every round-0 survivor except the comma strip is now killed by exactly the intended new test (tolerant `>= 2` by #3; `lastInterim` reset by #4, which also kills "final does not clear the cut" together with the older edge; `f[0] !== T[0]` by #6; max skip 3 by #5; token-less final by #2; Traw lowercased, `rawTok` without the apostrophe, and `tok` without the apostrophe by #1).

Candidate pin for the comma strip, NOT added (outside the ruling): events `[interim "How do you cut 10,000 hallucinations in a rag answer without just making" @0, final "How do you cut" @17, final "hallucinations in a rag answer without just making it refuse?" @1564]`. The reference `rule-v3.mjs` and the module both give `"10000 hallucinations in a rag answer without just making it refuse?"`; the module without the strip gives `"10 000 hallucinations ..."` (`t1\t1-comma-probe.mjs`).

Property inherited from the reference, visible in that probe (cosmetic): a restored number loses its thousands commas ("10,000" comes back as "10000") because `rawTok` strips before matching, so the module's "the interim's own spelling" is exact for words but not for comma-formatted numbers. The reference does the same; not changed.

New scratchpad files this round (`boundary-repair\t1\`): `t1-fix1-verify.mjs`, `t1-make-mutants.mjs`, `t1-mut-report.mjs`, `t1-mutate2.mjs`, `t1-comma-probe.mjs`, `mut\` (7 mutants), `orig\` (round-0 module and test), `fix1-baseline.txt`, `fix1-mut-a.txt` to `fix1-mut-g.txt`, `built\deepgramBoundaryRepair.fix1.cjs`.

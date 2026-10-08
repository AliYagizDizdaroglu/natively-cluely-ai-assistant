# Merge report: MAIN's line into feat/whole-turn-answers

Written 2026-09-30 by the merge implementer (Sonnet 5.5), finished about 09:45 local (hard stop was 13:20).

## Result

- **Status: DONE_WITH_CONCERNS** (the concerns are observations for the next steps, none is a defect of the merge; see the last section).
- **Merge commit: `279103bf1b09b37a16c7be1a6614e3ae38ce9b44`**, subject `merge: bring MAIN's line (hedge default, first-token aborts, boundary repair) into cue mode`.
  Parents: `fd57512` (feat/whole-turn-answers) and `0ef42a0` (fix/coding-style-suffix-all-gemini).
- MAIN's branch is now an ancestor of HEAD (`git merge-base --is-ancestor` exit 0; 0 commits on MAIN's branch missing from HEAD; HEAD has 25 commits MAIN's branch lacks: the 24 plus this merge). So Thursday's merge of the cue branch into MAIN's branch is a fast-forward as long as MAIN's branch does not move first (the agenda's post-br1 docs commit has to be merged into the cue branch before that).
- After the commit, `git status` shows exactly one entry, ` M electron/test/golden/interview60.report.md` (unstaged). Its size, mtime and SHA-256 (`210D1AB2...FBDB1`) are identical to what I recorded before I began. No untracked files.
- The merge changes 91 files against fd57512 (+20885 / -96): MAIN's 42 commits' worth. Against MAIN's branch it differs in 30 files, every one of them cue-branch work (cue mode, the cue harness, fd57512's `resolveEnvKey`, the cue UI).
- Not done, per the brief: no build (dist-electron still holds the PRE-merge cue build), no app start, no push, no `.env`/key read, no subagent, no `node -e`, nothing in MAIN's checkout.

## The 8 conflicted files, hunk by hunk

Rule I applied: one implementation per twin pair, MAIN's text preferred; the cue branch's text kept only where it carries something MAIN's lacks; every distinct test kept.

| file | hunks | kept | why |
|---|---|---|---|
| `electron/LLMHelper.abortOnClose.test.ts` | 4 | MAIN's whole file | The four hunks are the `NATIVELY_VERBAL_HEDGE='0'` pin: the `savedHedge` const in the Gemini describe, the same const in the Gemma describe, the Gemma `beforeEach` pin and its `afterEach` restore. In each the cue side was empty. `git diff HEAD MAIN` on this file shows only those 11 added lines, so the cue branch's copy is a strict subset (same tests, same bodies). Taking MAIN's whole file also removes the second `afterEach` the auto-merge had left in the first describe (one block from each side; the cue side's only restored `savedTimeout`, which MAIN's block restores too). Result is byte-identical to MAIN's blob. |
| `electron/llm/WhatToAnswerLLM.answeringModel.test.ts` | 5 (add/add) | MAIN's whole file | Both branches created it (twins 5d5ab34 / 783991a). The cue copy is 230 lines, MAIN's 294, and the diff between them has 69 additions and 1 removal: hedge pins, the `hedge winner is named through generateStream` describe (3 tests), and one retitle with an unchanged body. Byte-identical to MAIN's blob. The retitle: `override off: a 503 on 3.1-lite still goes to 3.5-lite - the shipped pairing is unchanged` became `... - the pairing of the opt-out stall race (NATIVELY_VERBAL_HEDGE=0) is unchanged`. That is the only test name of the cue baseline that no longer exists, and MAIN's wording is the accurate one now that the hedge is the default. No assertion was dropped. |
| `electron/llm/WhatToAnswerLLM.ts` | 4 | MAIN's lines in all four | `HEDGE_WINNER` regex + its doc line; the extended doc sentence on `nameStallSwitch`; `announce` in place of `switchedTo` (declaration + `watch()` body); and the `if (announce) { yield announce; announce = null; }` line. Merged file vs the cue branch = only MAIN's hedge lines plus MAIN's `diagLog` gate (`process.type !== "browser"`, ce4e730, auto-merged). Merged file vs MAIN = only the cue additions. See the chain check below. |
| `electron/test/golden/interview60.flight.mjs` | 1 | the CUE side | The hunk is `const capturedJson = ... JSON.parse(...)` + `capturedIds = capturedJson ? capturedOnly(capturedJson) : []` (cue) against MAIN's one-liner `capturedIds = ... capturedOnly(JSON.parse(...))`. The cue lines further down (`wanted = a.when(capturedJson)`, `ruleCount` over `capturedJson[id].system`, `hasCueRule`) need `capturedJson`; MAIN's one-liner has no such variable. The rest of MAIN's file merged clean around it: `ANSWER_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite']` (no Groq arms, e94305a) and its doc rewrite. Merged vs MAIN = only `CUE_RULE_MARK`/`hasCueRule`, the three `captured-no-cues` twins with `when: hasCueRule`, and the `replayable`/`wanted`/`ruleSummary` gating. `PAIRED_ARMS` builds on `ANSWER_MODELS[0]`/`[1]`, which still exist. |
| `electron/test/golden/interview60.flight.test.ts` | 1 | union of the two import lines | MAIN's `FOCUSED_MODELS` (its two no-Groq tests use it) plus the cue side's `CUE_RULE_MARK`, `hasCueRule` and the `CUE_RULE` import (its two cue tests use them). Every test from both sides is kept: MAIN's `ANSWER_MODELS` describe (2 tests), the cue twins test and the `hasCueRule` test. |
| `electron/test/golden/interview60.metrics.test.ts` | 2 (interleaved add/add) | both describes, whole | Both sides appended a distinct `describe` at the same spot and git interleaved them around their shared lines. I rebuilt the region from each side's own blob with a script (boundary-asserted): the cue side's `the cue row's limits track CUE_MAX_LINES and CUE_MAX_WORDS` (49 lines, HEAD lines 790-838) followed by MAIN's `claimOf: a paraphrase-anchored answer is claimed by its dispatched question (h40b R07F)` with its three tests (97 lines, MAIN lines 764-860). Merged vs the cue branch = +98 / -0 (MAIN's additions only); merged vs MAIN = the cue branch's own +84 / -4. |
| `electron/test/golden/interview60.pass-record.mjs` | 2 | MAIN's lines | `verbalHedgeFromLog` (export) and the `Verbal hedge` summary bullet (998b5b7). The cue side was empty in both hunks and adds nothing else to this file: merged file is byte-identical to MAIN's. `graderOf` (twin 76f90f7 / 5c97b11) is one copy: both sides had it byte for byte, so git had merged it silently. |
| `electron/test/golden/interview60.pass-record.test.ts` | 2 | MAIN's lines | The `verbalHedgeFromLog` / `describeVerbalHedgeAtStartup` imports and the `verbalHedgeFromLog` describe (2 tests). Byte-identical to MAIN's. The graderOf tests (both sides) are one copy. |

Every conflict-marker search came back empty: `Grep` over electron/, scripts/, src/ for `^(<<<<<<< |>>>>>>> |=======$)`, and `git diff --cached --check` reports 0 leftover markers. All resolved files were staged by name; no `add -A/-u/.`, no `stash`, no checkout/restore on the report file (I used `git checkout --theirs -- <file>` on the two files where MAIN's version was the resolution).

### The other 17 files both sides touched (no conflict): checked for silent duplicates

A three-way merge can keep two copies of a fix that both sides made slightly differently. For each I diffed the merged file against MAIN's version and against the cue branch's: the first must show only cue work, the second only MAIN's.

- Byte-identical on both sides (trivial merge, 6): `.gitignore`, `holdout40.questions.mjs`, `holdout40.source.md`, `roster.mjs`, `roster.test.ts`, `scripts/build-electron.js`.
- Merged == MAIN's file (the cue side had only twin changes there, 5): `LLMHelper.ts`, `LLMHelper.verbalPrimary.test.ts`, `interview60.judge.mjs`, `interview60.judge.test.ts`, `golden/README.md`.
- Merged == cue's file (MAIN had only twin changes there, 2): `verbalStreamFilter.test.ts` (its single-asterisk twin 10bd670 / b80a677 is one copy) and `interview60.run.mjs` (the cue side's fd57512 `resolveEnvKey`; the twin of 97fc38d / 5952b23 is one copy).
- Two-sided but disjoint (4): `verbalStreamFilter.ts` (cue: `extractCues`/`stripCueBlock`; MAIN: the `diagLog` gate), `IntelligenceEngine.ts` (cue: `onCues`/`pendingCues`, the `cues?` event param; MAIN: `withParentExchange`, `addAssistantMessage(fullAnswer, settled)`), `main.ts` (cue: `cues` on the token IPC; MAIN: the hedge startup line), `interview60.metrics.mjs` (cue: `cueBlocks` + its GATE row; MAIN: the paraphrase `question=` claim).
- A duplicate-name check over the whole merged suite: 987 tests, 987 distinct full names, 0 repeated.

## WhatToAnswerLLM cue chain after the merge (brief item 3)

**Confirmed intact**, from the merged code (`electron/llm/WhatToAnswerLLM.ts`) and by execution.

From the code:
- `stripCueBlock` is imported (line 5) and is the INNERMOST stage after the model-source strip: `filtered = stripSpokenNotation(stripSuggestionBlock(filterVerbalLines(filterCodeFences(stripCueBlock(this.stripModelSentinel(raw), onCuesOnce))), onSuggestionsOnce))` (lines 388-393).
- `onCues` is the EIGHTH `generateStream` parameter (line 200: transcript, temporal, intent, imagePaths, forceFastModel, onSuggestions, liveTexts, onCues) and IntelligenceEngine passes eight arguments (`..., options.liveTexts, onCues`, line 414).
- The once-guard: `cuesSent` / `onCuesOnce` (lines 380-385) is declared once per `generateStream` call, outside `filtered`, so the primary chain, `filteredAndNamed(rawStream)`, and the fallback chain, `filteredAndNamed(streamVerbalWithGeminiFlash(..., model))` (lines 398-415), share it. The coding path still never calls it (its comment kept).
- Merge effect on this file: `git diff HEAD` (merged vs cue) touches only the `diagLog` gate, `HEDGE_WINNER`, the `nameStallSwitch` doc sentence and body. Nothing in `generateStream` moved.
- The hedge hands the chain ONE stream. `LLMHelper.streamGeminiWithHedge` (LLMHelper.ts 3471-3542, reached from `streamGeminiWithStallFallback` at 3396 when `verbalHedgeEnabled()` and the primary is one of the two Lites) starts two `streamWithGeminiModel` legs (front 3.5-lite, back 3.1-lite) INSIDE the helper, waits for the first token, aborts the loser (`loser.stop.abort()`), and `deliver(winner.leg, winner.value)` yields `__model_source:<winner> (hedge)__`, then the winner's first token, then `yield* leg.gen` from the winner only. The loser never writes into the consumer's stream.
- So a hedge-won answer enters the chain as: head chunk `__model_source:X (hedge)__` (one whole chunk) followed by the winner's text. In `nameStallSwitch.watch()` the head chunk matches `HEDGE_WINNER`, sets `announce = chunk` and calls `onSwitch`; `stripModelSentinel` strips it (label has no underscore); `stripCueBlock` then sees the winner's text, closes the block, and calls `onCuesOnce` BEFORE the first prose chunk leaves the chain; `announce` is yielded just ahead of that first prose chunk. In IntelligenceEngine a sentinel-only token hits `if (!stripped) continue` (line 437) before `pendingCues` is consumed, so the cues ride the first prose token as before.

By execution (throwaway, never committed; copy kept at `SP\cue-group\zz-merge-hedge-cues.test.ts`): a real `WhatToAnswerLLM` over the real `LLMHelper`, hedge ON (unset = the shipped default), only the SDK stubbed, a cue block split at awkward chunk boundaries (`__CU|ES__...`). 7 of 7 passed (log `SP\cue-group\hedge-cues-check.log`):
- A. front (3.5-lite) wins: `onCues` called once with the two cues, no `__CUES__`/`1|` in the output, prose intact, last name `gemini-3.5-flash-lite (hedge)`.
- A0. control, same answer with no block: `onCues` once with `[]` (so A's assertion is not vacuous).
- B. front silent past the 5000 ms trigger, back (3.1-lite) wins: once, cues right, prose intact, last name `gemini-3.1-flash-lite (hedge)`, the front's signal aborted.
- C. both legs 503, the redirect re-enters the hedge and answers with a block: once.
- D. the once-guard across the fallback: a stream closes its block (reports), then dies with no prose escaping (a `Time:` line the filter drops), the redirect answers with its own block: `onCues` called once, with the FIRST stream's cues.
- D-mutant (calibration): the same scenario against a copy of the class with the guard removed reports TWICE, so D can tell the difference.
- E. hedge OFF (`NATIVELY_VERBAL_HEDGE=0`, the old stall race): once, same cues.
The two temporary files (`zz-merge-hedge-cues.test.ts`, `WhatToAnswerLLM.mutant.ts`) were deleted from `electron/llm/` before the full-suite run and the commit; `git status` shows no untracked file.

Behaviour worth knowing, not a defect: in D the reader is shown the cues of the stream that died, over the redirect's prose. That is the cue branch's own once-guard semantics (the guard exists for this case), and `verbalFallback.test.ts` already pins that the redirect supplies the cues when the first stream never reported.

## Numbers

Same command before and after, from a temp cwd: `npx --no --prefix <WT> vitest run --root <WT>` (vitest 2.1.9).

| | files | tests | passed | skipped | failed |
|---|---|---|---|---|---|
| **before**, feat/whole-turn-answers @ fd57512 | 89 (88 passed, 1 failed to run) | 810 | 804 | 6 | 0 |
| **after**, the merge (run on the staged tree, then again on the commit) | 99 (98 passed, 1 failed to run) | 987 | 979 | 8 | 0 |
| MAIN's branch @ 0ef42a0, run the same way from an exported copy | 94 (92 passed, 2 failed to run) | 932 | 924 | 8 | 0 |

- The one suite that fails to run in both my runs is `electron/services/interviewerTurn.replay.test.ts`: it reads `electron/test/golden/fixtures/...` relative to the cwd (the known temp-cwd caveat). Run from the worktree root it passes **12/12 before and 12/12 after**; the before/after `git status --ignored` was identical, so nothing was written.
- MAIN's export also fails `interview60.prompts.test.ts` (needs `dist-electron`, which an export lacks); in the worktree it passes.
- Test-name comparison (per-test listings from the JSON reports, `SP\cue-group\compare-test-sets.mjs`):
  - cue baseline vs merged: 810 names, 1 absent from the merged run (the retitle above, body unchanged), 178 new (MAIN's), 0 status changes.
  - MAIN vs merged: 3 MAIN names absent from the merged run: (a) the base's `the three newest rows are the last three` test, which the CUE branch had already rewritten as `the four newest rows are the last four` (`['pinned','budget','length','cueBlocks']`, a superset of MAIN's assertion; MAIN's three-row version would fail against the cue GATE); (b, c) two SKIPPED tests whose names embed the checkout path. 58 names only in the merged run: the cue branch's tests plus the 7 `interview60.prompts.test.ts` tests that the export could not load. 0 status changes.
  - merged before commit vs after commit: identical.
- Type checks, from the worktree root, before and after:
  - `npx tsc --noEmit` (root): exit 0, empty output, both times.
  - `npm run typecheck:electron` (= `tsc -p electron/tsconfig.json --noEmit`): **6 errors before and 6 after, the log files are byte-identical** (`fc` reports no differences): GeminiLiveRouter.ts(125,44), ipcHandlers.ts(3433,18), (3433,38), (3436,31), KnowledgeOrchestrator.ts(349,35), (351,25): the pre-existing six from the type-check-gate note. No new error in any merged file, tests included.
  - The brief's literal `cmd /c "npx tsc -p electron/tsconfig.json --noEmit"` works: I ran it again on the committed tree and it printed the same six lines (exit 2). My first attempt used `npx --no tsc -p ...` and exited 128 with no output (`--no` together with `-p` is misparsed), so the numbers above come from `npm run typecheck:electron`, which runs the same command.
- `node --check` on all 18 `.js/.mjs/.cjs` files the merge touches: 0 syntax errors.

## What I did NOT exercise (residual risk)

- No live call, no Electron app, no real SDK, no built artifact: everything above is unit-level plus the SDK-stubbed hedge x cue composition. The hedge x cue composition through `IntelligenceEngine` and the renderer is read from the code (the sentinel `continue` before `pendingCues` is consumed), and the cue branch's `IntelligenceEngine.cues.test.ts` covers the engine with fake streams; I did not run a combined engine + hedge test.
- `flight.mjs --dry-run` was not run: `main()` aborts at once when there is no `.env` beside package.json (the worktree has none, and I may not read or create one). Its imports and exports are covered by `flight.test.ts`, its syntax by `node --check`.
- `dist-electron` is stale relative to the merged source (it is the pre-merge cue build). It has to be rebuilt before the smoke/bench, or those gates would exercise the old code.
- Twins were checked textually (diffs against both sides) and by the test suites; a twin that behaves differently at runtime while textually identical is not possible, but two twins that were NOT identical would have shown up as conflicts or as extra lines in the diffs above, and none did.

## Concerns (for the controller, none blocking)

1. **The cue flight's no-cue control is on the hedge's back model.** `captured-no-cues`, `-r2`, `-r3` run on `ANSWER_MODELS[0]` (3.1-lite, LOW) as the brief asked me to keep them. With the hedge as the default, the hour's answers come from 3.5-lite HIGH first, so a cue answer won by the front has no same-model no-cue twin (MAIN's own doc comments in `flight.mjs` already say the same of `captured-low`: it pairs only with a 3.1-lite win, read off the won-by line). The offline bench is unaffected: its pre-registration already uses `--model gemini-3.5-flash-lite --thinking HIGH` against `captured-high` r1-r3. Only the validation hour's flight twin has the mismatch.
2. **Retitled test.** One test name changed (MAIN's retitle, body identical) and one shared test is the cue branch's four-row version; both are listed above so a name-based comparison does not read them as losses.
3. **Rebuild before any gate** (see above): the merged tree has not been built.
4. The `git checkout --theirs` route I used for the two whole-file resolutions is safe here only because MAIN's file is a strict superset of the cue branch's (verified by the diffs above), not as a general habit.

## What is left in the scratchpad (all in `SP\cue-group\`)

`baseline-*.log/json/txt`, `merged-*.log/json/txt`, `final-*.log/json/txt`, `main-*.log/json/txt` (the run outputs and per-test listings), `merged-tsc-*.log` / `baseline-tsc-*.log`, `hedge-cues-check.log`, `zz-merge-hedge-cues.test.ts` (the throwaway check, in case you want it kept as a real test: it goes in `electron/llm/`; its D-mutant test and the `WhatToAnswerLLM.mutant` import need the copy `make-mutant.mjs` generates, so drop that one test and the import to keep the other six), `make-mutant.mjs`, `resolve-metrics-test.mjs`, `summarize-vitest-json.mjs`, `compare-test-sets.mjs`, `merge-commit-msg.txt`, and this report. The exported copy of MAIN's branch, its node_modules junction and its cache directory were deleted (the junction with `rmdir`, so MAIN's node_modules was not followed: 966 entries before and after; MAIN's `node_modules/.vite/vitest/results.json` mtime is 07:41, so no write reached MAIN's checkout).

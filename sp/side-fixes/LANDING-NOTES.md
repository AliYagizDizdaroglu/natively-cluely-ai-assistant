# Landing notes: the five side fixes onto cue-merged MAIN

Written 2026-10-01, 00:30 to 01:10 local. Read-only: no tests, tsc, builds, replays or API calls were run.

- **Target:** `merge/cue-mode-prep` = `1852d89` in `.claude\worktrees\merge-cue`.
  - It is MAIN `fed4b07` merged with the cue branch `8a13abb`.
  - `git diff 8a13abb 1852d89` touches only `electron/test/golden/passes/`, so its code is the cue branch's code.
- **Base of the fixes:** `fed4b07`. Fix 1's commit sits on `0ef42a0` instead, and `git diff 0ef42a0 fed4b07` outside `passes/` is empty.
- **NOTES:** `C:\Users\sotka\AppData\Local\Temp\claude\C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant--claude-worktrees-nifty-lederberg-49681a\9c5886c7-cdbd-48af-b8bc-e9275012ec64\scratchpad\side-fixes\`

## Summary

| # | fix | applies to 1852d89 | pinned tests it changes | risk |
|---|---|---|---|---|
| 1 | replay test reads its fixtures from `__dirname` | yes, clean | none | very low |
| 2 | notation filter is chunk-independent | yes, clean (offsets) | none | medium |
| 3 | coaching card passes the word budget whole | yes, clean (offsets) | none | low |
| 4 | typed chat strips the `__MORE__` block | **no**: one context line conflicts. `--3way` resolves it cleanly; a rebased patch is provided | `ipcHandlers.typedPrompt.test.ts` test 2, one line | low to medium |
| 5 | hedge redirect asks the named model first | yes, clean (offset) | `WhatToAnswerLLM.hedgeCues.test.ts` D, D3, D4, one line each | medium |

- **Recommended order:** 1, 3, 4, 2, 5. The reasons are in the "Recommended order" section.
- **All five apply in sequence:** with the rebased fix 4 and both pin patches, the whole set passes `git apply --check` against 1852d89 in that order (`combos\all-five-with-pins.order-1-3-2-4-5.patch`). The agenda's order 1-2-3-4-5 also applies (`combos\order-1-2-3-4r-5.patch`).
- **Only 2 and 3 share files.** They do not overlap: 2 then 3, and 3 then 2, both check clean.
- **Calibration of the sequence check:** fix 2 concatenated with itself fails on its second copy. So a concatenated check does test each patch against the result of the ones before it.

### How the patches were made
- **Written with `--output=`, not `>`.** In PowerShell 5.1, `>` re-encodes native output (BOM, CRLF), which would corrupt a patch. All patches have LF endings and no CR.
- **New test files are appended.** `git diff` leaves untracked files out, so fixes 3, 4 and 5 have their new test file appended as `git diff --no-index /dev/null <file>`.
- **The apply checks** ran with `git -C merge-cue apply --check`. Afterwards the target was clean and still at 1852d89.

### Side effects to know about
- **One loose blob.** `apply --check --3way`, run once for fix 4, writes the patch's post-image as a loose blob. `cdbd6ee…`, fix 4's file as written on fed4b07, is now in the shared object store. It is unreachable and harmless, and gc prunes it. `--check` alone writes nothing.
- **Possible index refresh.** The first `git status` calls on the fix worktrees and on the target may have refreshed their index stat data (no content change). Later calls used `--no-optional-locks`.

### Files in NOTES
| file | what it is |
|---|---|
| `1-gifted-goldstine-133146.patch` | `git show 2585dff` |
| `2-elastic-hertz-4344f1.patch` | uncommitted diff |
| `3-charming-lehmann-ea0bf0.patch` | uncommitted diff plus the new test file |
| `4-affectionate-cannon-45573f.patch` | as written on fed4b07; does NOT apply to 1852d89 |
| `4-affectionate-cannon-45573f.on-1852d89.patch` | rebased onto 1852d89 plus the new test file; applies clean |
| `4b-typedPrompt-pin.on-1852d89.patch` | the typed-prompt pin's one-line change |
| `5-quizzical-lehmann-9c0829.patch` | uncommitted diff plus the new test file |
| `5b-hedgeCues-pins.on-1852d89.patch` | D, D3 and D4, one line each |
| `combos\` | the calibration and sequence checks |
| `merge4\` | the three-way merge of fix 4: base, ours, theirs, merged, and `ours-to-merged.diff` |
| `pins\`, `rebased4\` | a/b copies the two rebased patches were diffed from |
| `parts\` | the pieces, the cue-side diffs used for reading, and `make-pins.mjs` |

---

## Fix 1: the replay test reads its fixtures from `__dirname`

**Worktree:** `gifted-goldstine-133146`, commit `2585dff` on `claude/nifty-davinci-94b4d3`. It is one commit, on `0ef42a0`.

**The diff:** `electron/services/interviewerTurn.replay.test.ts`, line 7 (+2 -1).
- Before: `const FIXTURES = path.resolve(process.cwd(), 'electron/test/golden/fixtures');`
- After: `path.resolve(__dirname, '../test/golden/fixtures')`, plus one comment line.
- It is test-only.

**Does it apply?** Yes, a plain check with no offset.
- The file is identical on the cue branch.
- Land it with `git cherry-pick 2585dff`, which keeps its message, or with the patch.

**Tests whose expectation changes:** none. The effect is on the suite instead:
- **From a temp cwd** (the repo's test command) this file failed to load until now. The cue gate at d83fdfe records it: "1071 passed | 8 skipped (1079). One file cannot load there (the replay test's fixture path)".
- **After the fix** it loads, adding +12 passed, and that known exception is gone.
- **From the repo root** it resolves to the same folder as before: 12 of 12.

**Cue interactions:** none.
- Cue did not touch the file.
- Both fixtures are tracked in git: `electron/test/golden/fixtures/2026-09-09T15-00-55-s50a-turns.json` and `2026-09-08T08-44-56-after9-turns.json`.

**What proves no regression:**
- The file from %TEMP% passes 12/12, and from the root 12/12.
- The full suite from %TEMP% has 0 failed files, with no exception left to explain.
- tsc: electron 6 (pre-existing), root 0.
- No replay and no live check.

**Risk:** very low. No product code changes.

---

## Fix 2: `stripSpokenNotation` is chunk-independent

**Worktree:** `elastic-hertz-4344f1`, uncommitted, detached at `fed4b07`.

**The diff (+45 -1):**
- **`electron/llm/verbalStreamFilter.ts`:** the one `held` regex in `stripSpokenNotation`, plus a comment. Two changes:
  - The money branch opens no hold on a `$` that closes a pair, unless another `$` follows: `\$(?:(?<!<pair rule>\$)|(?=\$))…`.
  - A new `\\frac\{…\}(?:\{…)?` branch holds `\frac` until its second group closes.
- **`verbalStreamFilter.test.ts`:** two `it`s at the end of the describe "stripSpokenNotation — formulas that start with a number are not currency".

**Does it apply?** Yes, clean.
- The code hunk lands at 768 (+264, because cue added code above it); the held line is 771 on the target.
- The test hunk lands at 210 (+1).
- `stripSpokenNotation` and `cleanNotation` are byte-identical on fed4b07 and 1852d89.

**Tests whose expectation changes:** none found.
- **Notation tests unchanged by cue:** the two notation describes in `verbalStreamFilter.test.ts`, `spokenNotation.test.ts` and `spokenNotation.json.test.ts`. The fix session ran the whole suite at fed4b07 with the fix: 0 failed (933, plus the replay's 12 from the root).
- **Cue-added tests whose text reaches this stage:** `WhatToAnswerLLM.cues`, `WhatToAnswerLLM.hedgeCues`, the cue case in `verbalFallback`, and `IntelligenceEngine.cues`. None has `$` or `\frac` in its prose.
- **The one LaTeX string there,** `$O(\log n)$ time complexity` in `IntelligenceEngine.cues.test.ts`, is a cue line. It goes through `trimCues`/`cleanNotation`, which this fix does not change.
- **Only `$` and `\frac` can be affected.** The fix changes the `$` branch and adds a `\frac` branch. The `*`, `**` and `\` branches are unchanged, so text without `$` or `\frac` cannot change.

**Intended behaviour change,** as disclosed by the fix session (memory `spoken-notation-chunking`):
- **Chunked output now equals whole output:**
  - for a typeset pair: `$\frac{3000}{9500}$ of it` said "$3000 over 9500" at 1- and 2-character chunks;
  - for a bare `\frac{a}{b}`, which said "frac{a}{b}".
- **The whole-string output changes in two ending classes only:**
  - an answer ENDING with a closed pair followed only by digits, `, . $`, whitespace, `/ ^ \`: the old output spoke a stray `$`;
  - an answer ending ` *\frac{a}` or `*\frac{a}{b`: it now says `*frac{a}`.
- **Residuals left as they were:** `$$…$$` display math stays chunk-sensitive, and `US$120k` loses its `$`.

**Interaction with `cleanNotation` and `trimCues` (the cue display):** none.
- The cue display runs `cleanNotation` on each whole cue line and never goes through the hold.
- `stripCueBlock` runs innermost, so cue lines never reach `stripSpokenNotation`.
- The fix only changes the hold, so no displayed cue can change.
- Side effect: the prose now agrees with the cue display on typeset pairs and `\frac`. Before, the display said "3000 over 9500" while chunked prose could say "$3000 over 9500".

**Interaction with the cue chain:** the cue chain hands this stage different pieces than fed4b07 did.
- **The early close (64d74a1)** releases the first prose line as a partial piece.
- **The offers-first rule (d83fdfe)** cuts at the answer's first character.
- So chunk-sensitivity now reaches more of each answer. That makes the fix worth more on the cue base.
- It also means the fix session's replay evidence does not carry over. That replay found 625 saved replies unchanged, but on the pre-cue chain. Re-run it on the cue chain.
- **Cost:** the fix session measured it at 0.40 ms per 20,000 letters, after moving the lookbehind behind the consumed `$`.

**What proves no regression:**
- **Tests:**
  - the notation tests: `electron/llm/verbalStreamFilter.test.ts`, `spokenNotation.test.ts`, `spokenNotation.json.test.ts`;
  - the tests that run the whole chain: `WhatToAnswerLLM.cues.test.ts`, `WhatToAnswerLLM.hedgeCues.test.ts`, `WhatToAnswerLLM.budget.test.ts`, `WhatToAnswerLLM.leadingChars.test.ts`, `llm/verbalFallback.test.ts`, `IntelligenceEngine.cues.test.ts`;
  - `WhatToAnswerLLM.negotiationCard.test.ts` if fix 3 landed first. Its card has `$120k` and `$135,000` inside the JSON and crosses this stage, so it guards the payload passthrough;
  - then the full suite from %TEMP% (+2 passed) and tsc 6/0.
- **Saved-reply replay: NEEDED,** on the cue chain (see "Replay for fixes 2 and 3"). Predictions, written down before the run:
  - **P1:** at the whole-reply size, the text is identical for every reply. The only allowed exceptions are replies in the two disclosed ending classes, and each must be listed. Expected: 0.
  - **P2:** NEW's text is identical at sizes 1, 7, 90 and whole for every reply. The only allowed exception is a `$$` run.
  - **P3:** a reply may change at size k only if OLD(k) ≠ OLD(whole), and then NEW(k) = OLD(whole).
  - **P4:** these are identical OLD vs NEW at every size: the cue reports, the offers reports, the report counts, and the offers-first log count. There is no new sentinel leak. The budget result may differ only where the text did.
- **Live:** nothing can provoke typeset notation on demand.
  - The after-batch S1 smoke is the no-regression live check.
  - Add a scan of the run's `[Answer] full:` lines that prints counts only: `frac`, and a `$` right before a digit with a closing `$`. Expect 0.

**Risk:** medium. Every spoken answer passes the changed hold, and the only evidence so far was gathered on the pre-cue chain.

---

## Fix 3: a coaching card passes the word budget whole

**Worktree:** `charming-lehmann-ea0bf0`, uncommitted, detached at `fed4b07`.

**The diff (+35, plus a 93-line new test file):**
- **`electron/llm/verbalStreamFilter.ts`, `cutAtWordBudget`:**
  - The first non-blank, non-sentinel chunk decides, once, whether the stream is a structured payload: `chunk.trimStart().startsWith('{')`.
  - A payload is yielded chunk by chunk and never counted.
  - For a card, `onDone` then reports `{ words: 0, cut: false, allowance: false }`.
- **`verbalStreamFilter.test.ts`:** three `it`s at the end of the SPOKEN_WORD_GUARD describe.
- **New file `electron/llm/WhatToAnswerLLM.negotiationCard.test.ts` (2 `it`s):** the real WhatToAnswerLLM over the real LLMHelper, with the SDK stubbed and a stand-in knowledge orchestrator.

**Does it apply?** Yes, clean.
- The code hunks land at 834 and 890 (+264); the test hunk at 600 (+124).
- `cutAtWordBudget` is byte-identical on both sides.
- The helpers the new tests use (`run`, `sentence`, `words`) exist in the target's SPOKEN_WORD_GUARD describe (lines 526-534).

**Tests whose expectation changes:** none.
- No existing budget test feeds a stream that starts with `{`. Checked: every `cutAtWordBudget` test in `verbalStreamFilter.test.ts`, `WhatToAnswerLLM.budget.test.ts`, and the cue tests' `[Answer] budget: words=… cut=no` lines in `WhatToAnswerLLM.cues.test.ts`.

**Interaction with the cue chain order** (`stripCueBlock` → fences → lines → offers → notation → budget):
- **The decision is taken on the budget's own input, after every filter.**
  - A cue-mode reply starts with `__CUES__`, but the budget only ever sees the prose after the stripped block, or after a leading offers block.
  - Sentinel chunks are skipped before the decision (`SENTINEL_CHUNK`, which is checked first): the hedge winner's `(hedge)` announcement and the redirect's `(fallback)`.
  - Cues travel as a callback and event argument, never as text, so the budget never sees a cue chunk.
- **Traced for the card on the cue code:**
  - `stripCueBlock`'s prefix phase decides "prose" on `{` and yields the chunk whole. It reports `[]`, so the engine logs `[Answer] cues: []` for a card; that happens without this fix too.
  - `filterCodeFences` and `filterVerbalLines` treat it as on fed4b07.
  - The cue `stripSuggestionBlock` finds no sentinel and emits it. Its lead phase only starts on a `__MORE__` with nothing but whitespace before it.
  - `stripSpokenNotation` passes it through by the same `{` rule.
  - So the new card test should pass unchanged on the cue base.
- **The decision spans a redirect.** The budget sits outside `withVerbalFallback`, so one decision covers the primary and its redirect. Cards never fail over, so that changes nothing.

**Behaviour change to know about:**
- **A card's budget line now reads `words=0 cut=no allowance=no`.** It used to count the JSON's words.
- **Readers of that line:**
  - the metrics budget and length rows (a card is now a 0-word answer in the p50 and p90);
  - the cue pre-registration's reading "a block-only answer is confirmed by its `words=0` line between its cues line and the substitute". A card has `words=0` but no substitute, so read the substitute, not `words=0` alone.
- **Cards only appear with the Context toggle on and a salary question.**
- **A model answer that starts with `{` is now unclamped** as well as un-cleaned. The notation filter has already treated it as a payload since 2026-09-02. Expected rate on the saved replies: 0; the replay counts it.

**What proves no regression:**
- **Tests:** `verbalStreamFilter.test.ts`, the new `WhatToAnswerLLM.negotiationCard.test.ts`, `WhatToAnswerLLM.budget.test.ts`, `WhatToAnswerLLM.cues.test.ts`, `spokenNotation.json.test.ts` (same payload rule), then the full suite (+5 passed) and tsc 6/0.
- **Replay: recommended, and cheap** once the variant exists.
  - The existing `chain()` stops at notation, so add the budget stage.
  - **Precondition count:** replies whose filtered prose starts with `{`. Expected 0.
  - **Prediction:** 0 replies change their text or their budget result (words, cut, allowance) at any size.
  - **Known positive:** a synthetic card row over 200 words, cut by OLD and whole under NEW. The saved replies contain no card, because cards bypass the model.
- **Live: optional, and of little value.** Today every card is the ~31-word fallback, never cut, so a live card would change only its budget line.
  - If done: Context on, a hands-free salary question. The card renders and the log shows `[Answer] budget: words=0 cut=no allowance=no`.

**Risk:** low. The branch only acts when a stream's first real character is `{`.

---

## Fix 4: typed chat strips the `__MORE__` offers block

**Worktree:** `affectionate-cannon-45573f`, uncommitted, branch `claude/zealous-murdock-3da321` at `fed4b07`.

**The diff (+22 -1, plus a 185-line new test file):**
- **`electron/ipcHandlers.ts`:**
  - Adds `import { stripSuggestionBlock } from "./llm/verbalStreamFilter"`.
  - In `gemini-chat-stream`'s verbal branch, the call becomes `const verbal = llmHelper.streamVerbalWithGeminiFlash(...)`.
  - `stream = stripSuggestionBlock(<inner generator>)`. Ahead of the guard, the inner generator:
    - stops a replaced stream at its next token;
    - sends any `__model_source:…__` token as a `gemini-stream-source` label, so the guard never holds its closing `__`.
- **New `electron/ipcHandlers.typedVerbal.test.ts` (6 `it`s):** `initializeIpcHandlers` with an ipcMain that keeps its handlers.

**Does it apply?** Not plainly.
- **Hunk 1 (imports) fails** on its context line `import { VERBAL_WHAT_TO_ANSWER_PROMPT } from "./llm/prompts"`.
  - Cue commit `efda6cf` ("a typed answer carries no cue block", spec 2026-09-30 §3.6) renamed that import to `VERBAL_TYPED_PROMPT`: the verbal prompt without `CUE_RULE`.
  - The fix only inserts its own import two lines above. The conflict is context only; the changes do not overlap.
- **Hunk 2 (the call)** applies at +3, below the three comment lines cue added.
- **The resolution keeps both sides:**
  - cue's `VERBAL_TYPED_PROMPT` import and its two `verbalSystemPrompt = …VERBAL_TYPED_PROMPT…` lines;
  - plus the fix's import and the wrapped call.
- **Verified three ways:**
  - `git apply --check --3way`: "Applied patch to 'electron/ipcHandlers.ts' cleanly".
  - `git merge-file` on scratch copies: 0 conflicts. Base `6fedca3` = fed4b07, ours `a353512` = 1852d89, theirs `cdbd6ee` = the fix; each copy's hash matched those blob ids.
  - The merged result is `4-affectionate-cannon-45573f.on-1852d89.patch`, which passes a plain check.

**Tests whose expectation changes: `electron/ipcHandlers.typedPrompt.test.ts` test 2** ("sends that variable…").
- **Its third expected line changes:**
  - Before: `'stream = llmHelper.streamVerbalWithGeminiFlash(userContent, verbalSystemPrompt, undefined, selectedModel);'`
  - After: `'const verbal = llmHelper.streamVerbalWithGeminiFlash(userContent, verbalSystemPrompt, undefined, selectedModel);'`
  - The patch is `4b-typedPrompt-pin.on-1852d89.patch`.
- **Test 1 is unchanged.** None of the fix's added lines, comments included, names `VERBAL_\w+_PROMPT`, `CUE_RULE`, `CUES_SENTINEL` or `__CUES__`.
- **How this was checked:** both tests' line filters were run with grep on the merged file.
  - Test 1 gives the same three lines as today.
  - Test 2 gives three lines, the call now `const verbal = …`.
  - Calibration: on the unmodified target, the same filters return exactly the three lines each test pins today.
- **Optional:** test 2's intent still holds, since the variable reaches exactly one call. The file's header says ipcHandlers "has no unit harness"; this fix adds one. The comment can stay.
- **No other test reads `ipcHandlers.ts`.**

**Interaction with the offers-first rule (d83fdfe):** typed chat now gets the cue branch's `stripSuggestionBlock`.
- **A typed reply whose offers block comes FIRST shows its answer,** after the block.
  - Under fed4b07's guard the same reply would show an EMPTY bubble, because every sentinel ended the answer.
  - So land this fix only on the cue base, never on pre-cue MAIN.
  - That shape is rare without a cue block: 0 of 308 answers from hours without cues.
- **Typed chat can now write the log line.** The line `[verbalStreamFilter] stripSuggestionBlock: offers block before the spoken answer (shown after it)` goes to natively_debug.log.
  - The re-smoke reading counts that line per answer, and the line does not say which path wrote it.
  - Hands-free runs never type, so there is no effect in practice. Do not type during a measured run.
- **An answer-first reply is byte-identical up to the sentinel,** as the cue tests pin. The bubble is only delayed by the guard's short hold, or by a leading block being read.
- **The typed path passes no `onSuggestions`,** so offers are dropped. Typed chat has no chips.
- **The prompt is unchanged:** `VERBAL_TYPED_PROMPT` still ends with `SPOKEN_LENGTH_AND_DEPTH`, so typed replies still carry offers and the fix is still needed.
- **Typed replies are stored stripped.** Later prompts, the hands-free ones included, no longer inherit `__MORE__` lines from typed exchanges.
- **Not covered:** a typed reply that emits `__CUES__` anyway is not stripped here. That belongs to the separate `__CUES__` chip.

**What proves no regression:**
- **Tests:** the new `ipcHandlers.typedVerbal.test.ts`, `ipcHandlers.typedPrompt.test.ts` (test 2 edited), and the offers describes in `verbalStreamFilter.test.ts`.
- **Then** the full suite (+6 passed) and tsc 6/0.
- **Compare tsc errors by file and message, not by line.** This fix moves `ipcHandlers.ts` lines by +21. By the typecheck memory, two of the six pre-existing errors are in that file (the dialog results).
- **Replay:** not needed. The guard is the same function the hands-free path already uses.
- **Live: YES, the user's typed-chat look.** In the dev app, launched from the user's terminal or a scheduled task (never from a Claude session: the shadow `credentials.enc`), check:
  1. A non-coding typed question ends at the answer: no `__MORE__` and no `1| …` lines.
  2. The label under the bubble names the hedge winner, for example `gemini-3.5-flash-lite (hedge)`, and never shows `__model_source` as text.
  3. Optional: a second question typed while the first still waits. The first bubble is not relabelled.
  4. natively_debug.log has no new `[IPC] Streaming error`.

**Risk:** low to medium.
- Typed chat only; the hands-free path is not touched.
- It is the one fix with a textual conflict (resolved) and a pinned-test edit.
- It is only safe on the cue base.

---

## Fix 5: the hedge redirect asks the model it names first

**Worktree:** `quizzical-lehmann-9c0829`, uncommitted, detached at `fed4b07`.

**The diff (+20 -6 in 4 files, plus an 86-line new test file):**
- **`electron/LLMHelper.ts`:**
  - `streamVerbalWithGeminiFlash` and `streamGeminiWithStallFallback` gain `primaryFirst = false`.
  - The hedge call passes `primaryFirst ? primaryModel : GEMINI_FLASH_FALLBACK_MODEL`.
  - `streamGeminiWithHedge` takes a required `frontModel`: `FRONT = frontModel`, and `BACK` = the other Flash Lite.
- **`electron/llm/WhatToAnswerLLM.ts`:** the redirect's `makeFallback` passes `true`.
- **`verbalHedge.ts` and `verbalPrimaryModel.ts`:** comments only.
- **New `electron/llm/WhatToAnswerLLM.hedgeRedirect.test.ts` (2 `it`s).**

**Does it apply?** Yes, clean.
- The `WhatToAnswerLLM.ts` hunk lands at 409 (+20, in the `makeFallback` lambda).
- The `LLMHelper.ts`, `verbalHedge.ts` and `verbalPrimaryModel.ts` hunks need no offset; cue did not touch those files.

**Tests whose expectation changes: `electron/llm/WhatToAnswerLLM.hedgeCues.test.ts` D (line 130), D3 (line 165) and D4 (line 183).**
- Each changes `expect(asked()).toEqual(['gemini-3.5-flash-lite', 'gemini-3.5-flash-lite'])` into `['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite']`. The patch is `5b-hedgeCues-pins.on-1852d89.patch`.
- **Why these three:** in D, D3 and D4 the hedge winner 3.5-lite announces itself and then dies before any words clear the filters.
  - So `answering` = 3.5-lite, `pickFallback` names 3.1-lite, and the redirect round now starts with 3.1-lite.
  - Their other assertions are unchanged, because the SDK stub serves by call order, not by model: cues once from the dead stream, and the redirect's prose.
- **Traced as unchanged:**
  - **hedgeCues A, A0, B, E:** no redirect.
  - **hedgeCues C:** both legs 503, so `answering` stays 3.1-lite and the redirect names 3.5-lite. The front was 3.5 anyway, still `[3.5, 3.1, 3.5]`.
  - **hedgeCues D2:** no redirect.
  - **`WhatToAnswerLLM.answeringModel.test.ts`:** the first describe has the hedge OFF, so `primaryFirst` is ignored. The hedge-on "both legs 503" case redirects to 3.5-lite: unchanged.
  - **`verbalFallback.test.ts`:** its stub records arguments. It checks `verbalCalls[0][3]` and no arity, so the new 5th argument `true` changes nothing.
  - **`LLMHelper.verbalHedge.test.ts`** (its `won by …` log pins), **`LLMHelper.verbalPrimary.test.ts`**, **`LLMHelper.stallFallback.test.ts`**, **`LLMHelper.abortOnClose.test.ts`**, **`LLMHelper.geminiThinking.test.ts`**, **`LLMHelper.customNotes.test.ts`:** all call LLMHelper directly with at most 4 arguments, so `primaryFirst` = false and the front stays 3.5-lite.
  - **No test calls the private `streamGeminiWithHedge`,** and no test asserts `streamVerbalWithGeminiFlash`'s arguments with `toHaveBeenCalledWith`.
- **Optional:** D2's comment "today [3.5, 3.5]: a redirect ran" is historical and can stay.

**Interaction with the cue once-guards** (`cuesSent` and `suggestionsSent` in `WhatToAnswerLLM.generateStream`):
- **Unchanged:** one generateStream, at most one redirect, and at most one cue report and one offers report.
- **What changes is who wrote what in the D3 and D4 window.** A stream that reported its cues (early close) and then died inside the filters' holds or a leading offers block is redirected. The once-guard drops the redirect's own block.
  - Before: the candidate saw the dead 3.5-lite stream's cues over 3.5-lite's retry prose.
  - After: the cues come from 3.5-lite HIGH and the prose from 3.1-lite LOW. That pairing now crosses models.
  - It is rare: up to 3 characters of fence carry, up to 48 of an opener, or a whole leading offers block.
  - It is a UI mismatch risk, not a metric one: the smoke check reads cue shape, not grounding.

**Other observable changes:**
- **On a redirect round,** the debug log now says `verbal hedge: front=gemini-3.1-flash-lite back=gemini-3.5-flash-lite`. A `won by gemini-3.1-flash-lite …; other=not-started` line can now be a FRONT win.
  - Readers that equate a model with a leg need care; `check-smoke-hedge.mjs` parses the front and back fields generically.
- **The bar now names 3.1-lite `(hedge)` after a `redirecting to gemini-3.1-flash-lite` line,** where it used to say 3.5-lite.
- **The "[No answer — both … fallback failed]" text** now names the model that was really asked first.
- **Typed chat keeps its order:** `primaryFirst` = false, so the front stays 3.5-lite. Fix 4's test "still names the model that answered" pins that.

**What proves no regression:**
- **Tests:** the new `WhatToAnswerLLM.hedgeRedirect.test.ts`, `WhatToAnswerLLM.hedgeCues.test.ts` (D, D3, D4 edited), `WhatToAnswerLLM.answeringModel.test.ts`, `LLMHelper.verbalHedge.test.ts`, `LLMHelper.verbalPrimary.test.ts`, `LLMHelper.stallFallback.test.ts`, `LLMHelper.abortOnClose.test.ts`, `llm/verbalFallback.test.ts`, `llm/verbalHedge.test.ts`, `llm/verbalPrimaryModel.test.ts`, and `ipcHandlers.typedVerbal.test.ts` (if fix 4 landed first).
- **Then** the full suite (+2 passed) and tsc 6/0. tsc catches any missed caller of `streamGeminiWithHedge`, whose `frontModel` is now required; there is one caller.
- **Replay:** not needed.
- **Live: nothing triggers a redirect on demand.** The rule for the after-batch S1 smoke log:
  - every first-round `verbal hedge: front=` names `gemini-3.5-flash-lite`;
  - every `redirecting to X` line is followed by `verbal hedge: front=X`;
  - calibrate that reader on a synthetic log first.
  - If no redirect happens in the hour, which is likely, fix 5 is unexercised live. That is a residual risk to report, not a pass.

**Risk:** medium.
- It changes which model answers in the hands-free failure path.
- It edits three pinned tests.
- No live trigger exists.

---

## Replay for fixes 2 and 3

**The existing tool:** `scratchpad\cue-group\old-vs-new-replay.mjs`.
- **Its exports can be reused:** `chain`, `compare`, `loadRows`, and the 624 saved replies.
- **Its `report()` cannot be reused as it is.** It is hard-wired to the offers fix: "9 changed, each from 0 words".
- **It also fails any OLD chain that writes the offers-first line** (`!r.leadLoggedOld.length`). Every OLD on the cue base writes that line.
- **Its `chain()` stops at notation.**

**The variant:**
1. Add `cutAtWordBudget(…, { ...SPOKEN_WORD_GUARD, onDone })` as the last stage. That is the app's order in `WhatToAnswerLLM.ts`; `stripModelSentinel` is a no-op on raw replies.
2. Compare the text and the budget result at sizes 1, 7, 90 and whole.
3. Give each fix its own report, with that fix's predictions (see the fix 2 and fix 3 sections).
4. Print ids, shapes and counts, never prose.
5. **Calibrate before believing it:**
   - OLD vs OLD gives 0 changes;
   - a broken NEW is caught (for example notation replaced by identity, or the limit set to 50);
   - known positives as synthetic rows: fix 2's own cases, such as `About $\frac{3000}{9500}$ of it.` at size 1, and a card over 200 words for fix 3.
6. Run it from the scratchpad as the cwd. The filter's diagLog writes only inside Electron, so plain node writes nothing.

**Building OLD and NEW per landing** (the agenda plans ONE build, after all five):
- Use esbuild `transformSync` on `git show <sha>:electron/llm/verbalStreamFilter.ts`, with loader `ts`, format `cjs`, platform `node`, target `node20`. OLD = MAIN's tip before the landing; NEW = the landing commit.
- These are `scripts/build-electron.js`'s settings (no bundling), so the module equals the dist's.
- This is how the fix-2 session measured.

**Then the built check:** after the one build, run OLD vs NEW once more.
- OLD = a copy of the merged tip's dist `verbalStreamFilter.js`, saved BEFORE the build, with its sha256 recorded.
- NEW = the final dist.
- Predicted: exactly the union of the two per-fix replays' changes.

---

## Recommended order: 1, 3, 4, 2, 5

1. **Fix 1 first.** It changes no product code. It completes the %TEMP% full-suite gate: the replay file's known load failure disappears, so every later landing is held to "0 failed files" with no exceptions.
2. **Fix 3 next.** It is the narrowest product change.
   - Its replay predicts exactly 0 changes, so the new replay variant's first real run is a known-zero case.
   - Its card test (JSON with `$120k` and `$135,000` inside) then guards fix 2's claim that the payload passthrough is untouched.
3. **Fix 4 third.** It is typed chat only; the hands-free path is untouched.
   - Its conflict is pre-resolved (the rebased patch), and its pin edit is one line.
   - Landing it before fix 5 lets its typed-path tests guard fix 5's claim that a selection keeps the hedge's order.
4. **Fix 2 fourth.** It touches every spoken answer and has non-trivial replay predictions. By then the replay variant has run cleanly once, on fix 3.
5. **Fix 5 last.** It is the widest behaviour change: model order in the failure path, three pinned lines, and nothing that triggers it live. If a revert is ever needed, it is the tip commit.

The agenda's order 1-2-3-4-5 also applies cleanly. It only loses the two guards above: fix 3's card test ahead of fix 2, and fix 4's typed tests ahead of fix 5.

**Expected suite deltas from %TEMP%, against the pre-landing baseline:**

| after | passed | files |
|---|---|---|
| fix 1 | +12 | the load failure is gone |
| fix 3 | +5 | +1 file |
| fix 4 | +6 | +1 file |
| fix 2 | +2 | none |
| fix 5 | +2 | +1 file (D, D3, D4 are edited, not added) |

In total: +27 passed, 0 failed files. For reference, the whole-turn worktree at d83fdfe had 1071 passed, 8 skipped and one file not loading, so it would reach 1098 passed, 8 skipped. MAIN's own numbers can differ, because gitignored fixtures change the skip count. Compare deltas against MAIN's own baseline.

---

## Before the first landing: checklist

- [ ] **Preserve the fixes first.**
  - Fixes 2 to 5 exist only as uncommitted changes in their worktrees; three of them are on a detached HEAD.
  - The patches here are in a %TEMP% scratchpad.
  - Commit each on its own branch in its own worktree (parent fed4b07), or copy this folder somewhere durable, before any worktree cleanup or restart.
  - Fix 1 is safe: it is commit 2585dff.
- [ ] **Preconditions:**
  - the cue merge has landed: MAIN's `fix/coding-style-suffix-all-gemini` was fast-forwarded to the reviewed merge commit (today `1852d89`; MAIN is still at `fed4b07`);
  - MAIN's dist was rebuilt from it and proven by markers;
  - Friday's validation hour has been read and recorded.
- [ ] **No run is armed on MAIN's tree for the landing window.** A run's `auto` step rebuilds the dist when any `electron/**/*.ts` is newer.
- [ ] **No peer session is busy in MAIN** (ListAgents). MAIN's index and tree are shared.
- [ ] **MAIN is clean for every path the fixes touch.**
  - Checked 2026-10-01 around 00:55 with `--no-optional-locks`: clean.
  - MAIN's only modified tracked files are `electron/test/golden/interview60.chains.json` and `interview60.report.md`. They are not ours: never stage them.
- [ ] **Re-check against the real tip.** Run `git -C <MAIN> apply --check` for the next patch against MAIN's actual tip, not 1852d89.
  - If the tip is not 1852d89 plus the earlier landings, re-run the cumulative check (`combos\all-five-with-pins.order-1-3-2-4-5.patch`).
  - Re-read any hunk that fails. Resolve against the cue code, keeping both sides; never take one side wholesale.
- [ ] **Save a baseline at the merged tip, to a file:**
  - the full suite from %TEMP%: passed, skipped and failed files (expected: the replay test fails to load, until fix 1);
  - tsc electron: 6, recorded by file and message, because fix 4 moves `ipcHandlers.ts` lines by +21;
  - tsc root: 0.
- [ ] **The replay variant is written and calibrated,** as in "Replay for fixes 2 and 3", before fix 3 lands.
  - The OLD filter is saved: the merged tip's dist `verbalStreamFilter.js`, with its sha256, and its cue markers checked (`CUE_LINE_PREFIX` ×3, the offers-first line ×1).
  - The predictions for fixes 3 and 2 are written down before either run.
- [ ] **A private landing worktree is detached at MAIN's tip,** not a `claude/*` worktree that holds other work. Node, tsc and vitest resolve MAIN's `node_modules` by walking up.
- [ ] **The review focus per fix** is taken from this note's "interactions" paragraphs for the Opus reviews.

**Per landing:**
1. **Apply:**
   - fix 1: `git cherry-pick 2585dff`;
   - fixes 3 and 2: their patch;
   - fix 4: `4-…on-1852d89.patch` plus `4b-…`;
   - fix 5: `5-….patch` plus `5b-…`.
2. **Gates:**
   - the fix's own tests, then the tests listed in its section;
   - the full suite from %TEMP%: 0 failed, and the count = baseline + delta;
   - both tsc projects.
3. **Opus review** of the diff against merged MAIN, not against fed4b07.
4. **Replay** for fixes 3 and 2.
5. **Commit.** The message names each pinned-test change and its reason:
   - fix 4: "typedPrompt test 2's call line is now `const verbal = …`: this commit wraps the stream in stripSuggestionBlock; the prompt variable still reaches one call";
   - fix 5: "hedgeCues D, D3 and D4 now expect [3.5-lite, 3.1-lite]: the redirect asks the Flash Lite its log names first; it used to ask 3.5-lite twice".
6. **Land it:** `git -C <MAIN> merge --ff-only <sha>`. It refuses rather than overwrite local edits.

**After all five:**
1. One Opus review of the five commits together.
2. One guarded build.
3. dist markers:
   - every cue marker still holds (`dist-proof.mjs --expect combined …`);
   - plus four new ones, each 0 before the batch and 1 or more after:
     - `(?<!\$(?:\d[\d,]*` in `llm/verbalStreamFilter.js` (fix 2);
     - `payload = chunk.trimStart().startsWith("{")` in the same file (fix 3);
     - `stripSuggestionBlock` in `ipcHandlers.js` (fix 4);
     - `frontModel` in `LLMHelper.js` (fix 5).
   - The whole-turn dist built at 00:03 from d83fdfe keeps regex literals verbatim, names imports `import_verbalStreamFilter`, and has none of the four.
4. The built-chain replay: OLD = the merged-tip copy, NEW = the final dist. Predicted: the union of the per-fix changes.
5. The hands-free S1 smoke:
   - the cue smoke check (v4) and its pre-registered rule;
   - the fix 5 redirect rule;
   - the count-only notation scan for fix 2.
6. The user's typed-chat look (fix 4).
7. Commit the smoke's pass record with the batch (pass-records rule).
8. If `feat/whole-turn-answers` stays in use after the merge, cherry-pick the landed shas there with `-x`, or retire the branch.

---

## What this note did not verify

- **No test ran.** "No other test changes" rests on reading and tracing:
  - fix 4's pin was checked by running both of its line filters on the merged file, calibrated on the unmodified target;
  - D, D3 and D4 were traced through `pickFallback`, `answering` and `streamGeminiWithHedge`.
- **The fixes' new tests were not run on the cue base.** They were traced against the cue code and should pass unchanged.
- **The landing's full suite is the real check.** Any other failure is a finding: stop and diagnose it; do not edit the test to match.
- **No tsc ran.** No replay ran on the cue chain.
- **The rebased fix 4 is a merge result, not compiled code.** It matches `--3way` and applies plainly.

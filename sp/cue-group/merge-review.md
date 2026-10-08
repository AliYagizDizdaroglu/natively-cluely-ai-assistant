# Merge review: 279103b (MAIN's line into feat/whole-turn-answers)

Reviewer: Opus 5.5 (claude-opus-5-5), 2026-09-30, about 09:50-10:20 local. Read-only: this file is the only write.
Tree reviewed: `279103b` = parents `fd57512` (cue) + `0ef42a0` (MAIN), base `f3c7c8e`; HEAD is still `279103b`, and
`git status` shows only the user's ` M electron/test/golden/interview60.report.md`.

## Verdict

**MERGE OK.** Nothing blocks building on it. Findings: **0 Critical, 1 Important, 1 Minor**. Two more items were
already there before the merge and are listed separately (not counted).

The resolution keeps both sides' behaviour. No MAIN fix appears twice, nothing from either side is lost, and the
hedge x cue chain is composed correctly. Finding 1 is the resolver's concern 1, now confirmed. It has to be fixed
before the validation hour's pre-registration is written. It does not affect the re-smoke or the bench. Before any
gate runs, dist-electron has to be rebuilt (see Preconditions): the current build is from before the merge and has
no hedge.

## Findings

### 1. Important: the `captured-no-cues` twins pair with the hedge's back leg, which writes about 2% of a hedge hour

**Where:** `electron/test/golden/interview60.flight.mjs:186-188`, `electron/test/golden/interview60.flight.test.ts:193,200`,
and the plan `docs/superpowers/plans/2026-09-21-cue-mode.md:1481` (Task 9 Step 3).

**What is wrong:** All three no-cue twins run on `ANSWER_MODELS[0]`, which is `gemini-3.1-flash-lite` (flight.mjs:59),
at `--thinking LOW`. Under MAIN's hedge default, a different model writes almost every answer:
- The front leg is 3.5-lite (`LLMHelper.ts:3476`). It runs at HIGH, because `geminiThinking.ts:86` maps LOW to HIGH
  for 3.5-lite.
- 3.1-lite LOW is only the back leg, started after 5 s of silence from the front.
- In h40c, 3.5-lite won **44 of 45** answers (`passes/2026-09-29-h40c-result.md:229`).

So the plan's "cue band overlapping or exceeding the no-cue band on the same bytes" can only be read on the model
that wrote 1 answer in 45. The live comparison ("live mains inside or above the cue twins' band") has no model named
at all. The flight test's title ("…on the app answer model…") is no longer true.

Quota is a second reason. h40c's own budget put 3.1-lite at about 270 requests plus chains
(`PREREGISTER-h40c.md:217`). The three twins add about 132 more (about 44 captured ids × 3), which brings 3.1-lite to
about 400 plus chains on a 500-a-day model, before any smoke or replay run that day.

This was not caused by the merge. The resolver kept the arms as briefed. The arms were written on 2026-09-21, when
3.1-lite LOW answered every question, and MAIN's hedge default removed that premise.

**Fix:**
- **(a) Code and its test, before the pre-registration is written.**
  - Re-point the three twins to `{ model: ANSWER_MODELS[1], …, args: ['--thinking', 'HIGH', '--no-cues'], when: hasCueRule }`.
    A tag that names the model, e.g. `captured-no-cues-high`, `-r2`, `-r3`, keeps the answers files self-explaining.
    No data exists under the old tags.
  - Update `flight.test.ts:193`: the title becomes "…on the hedge's front leg…".
  - Update `flight.test.ts:200` to expect `ANSWER_MODELS[1]` and `'HIGH'`.
  - List the twins in the PAIRED_ARMS doc block under the 3.5-lite heading (`flight.mjs:139-147`), with
    `captured-high` named as their partner.
  - Re-pointing rather than adding keeps the total flat: 3.5-lite becomes about 243 + 132 ≈ 375 plus redirects, and
    3.1-lite goes back to about 270 plus chains.
- **(b) What the validation hour's pre-registration must do.**
  1. Register the cue-vs-no-cue rule as `captured-high` r1-r3 (the cue band) against the re-pointed no-cue twins
     r1-r3. Both run 3.5-lite HIGH on the hour's own captured bytes. The bytes are the same for both legs: the
     capture records the resolved primary's system and user turns, both legs receive exactly those, and
     `answers.mjs` never reads the captured `.model`.
  2. Replace "live mains inside or above the cue twins' band" with MAIN's h40c method (`PREREGISTER-h40c.md:164-171`):
     - compare each in-app item against the captured twin of the leg that won it (its last `won by` line);
     - show the combined band for context;
     - say in advance which of these reads gates;
     - read 3.1-lite wins against `captured-low` and never pool them into the 3.5 comparison.
  3. Carry the per-model quota budget and the ledger check (h40c's rule, `PREREGISTER-h40c.md:215-224`).
  4. If it reads latency, say that the `first token` diag line now fires on the first *prose* token, after the cue
     block. `tapFirstToken` wraps the chain that contains `stripCueBlock` (`WhatToAnswerLLM.ts:401-434`), so the
     number is not directly comparable with h40c's 4.1 s median / 6.5 s p90.
  5. If a 3.1-lite LOW no-cue read is still wanted, keep it only as a descriptive back-leg read, and only after the
     ledger shows room.

This finding does not touch the re-smoke, which runs `interview60.run.mjs auto`, not flight.mjs. It does not touch the
bench either: its pre-registration runs `--model gemini-3.5-flash-lite --thinking HIGH` against `captured-high` r1-r3
(`SP\PREREGISTER-cuebench.md` §1 and its 09:35 amendment, checked).

### 2. Minor: the hedge x cue seam is pinned only by a throwaway test

**Where:**
- `electron/llm/WhatToAnswerLLM.cues.test.ts:13-16` and `electron/llm/verbalFallback.test.ts:137-148`: fake streams,
  never headed by a `(hedge)` sentinel.
- `electron/IntelligenceEngine.cues.test.ts:22-27`: the stub calls `onCues` and then yields prose only, with no
  sentinel chunk in between.

**What is wrong:** The composition is correct today (see Verification, item 3), but each committed test covers only
one side of it. The only test that runs the real hedge under the cue chain is the resolver's throwaway
(`SP\cue-group\zz-merge-hedge-cues.test.ts`). It passed 7 of 7 and was calibrated by a mutant, but it is not in the
repo.

No test at all runs the engine's side of the seam. There, a sentinel-only `(hedge)` chunk arrives after `onCues` has
fired and before the first prose token. It must hit `if (!stripped) continue` (`IntelligenceEngine.ts:437`) before
`pendingCues` is read (`:440-441`, `:448-449`); otherwise the cues are dropped with the sentinel.

Cue mode v2 (trimCues, plus a new `[Answer] cues trimmed:` line logged before `[Answer] cues:`) edits exactly this
seam.

**Fix, before v2's chain task:**
- Commit the throwaway's cases A, A0, B, C, D and E as `electron/llm/WhatToAnswerLLM.hedgeCues.test.ts`. Drop the
  D-mutant case and the mutant import, and keep D's comment on what the once-guard defends.
- Add one engine case to `IntelligenceEngine.cues.test.ts`: the stub calls `onCues(['a','b'])`, yields
  `__model_source:gemini-3.5-flash-lite (hedge)__`, then the prose tokens. Assert that the cues ride the first
  prose emit and that `suggested_answer_source` received `gemini-3.5-flash-lite (hedge)`.
- Calibrate that engine case: move the `pendingCues` read above the `continue` and watch the test fail.

## Present before the merge, not caused by it (not counted)

**P1. Typed chat shows the cue block raw.**
- `gemini-chat-stream` sends `VERBAL_WHAT_TO_ANSWER_PROMPT` (`ipcHandlers.ts:544`, and `:557` in knowledge mode). That
  prompt ends with `CUE_RULE` (`prompts.ts:2415`).
- The handler relays the model's tokens unfiltered (`:574`, `:598-613`). Nothing in `src/` strips `__CUES__` either.
  The overlay's own text box reaches this path (`NativelyInterface.tsx:1690`).
- `addAssistantMessage(fullResponse)` (`ipcHandlers.ts:622`) also puts the raw block into the session history that
  later hands-free prompts read.

This is already tracked as spec-review finding 7, with a v2 task that gives the typed path a cue-free prompt
(`fable-revision-1.md` item 7). That design also suits the merged program. Here, every Flash-Lite typed answer opens
with a `(hedge)` sentinel chunk (`streamVerbalWithGeminiFlash` → `streamGeminiWithStallFallback` → the hedge). A fix
based on stripping would therefore have to strip that sentinel first. Otherwise `stripCueBlock` reads the sentinel as
prose and lets the block through.

**P2. Two edge paths where the reader loses cues, both unchanged by the merge.**
- **(a) The once-guard's stated limit** (plan `:1490`; the throwaway's case D). A stream that closes its block and
  then dies before any prose shows the redirect's prose under the dead stream's cues, and the redirect's own cues are
  dropped. Under the hedge the redirect runs the hedge again with both lites, so the two answers can differ more. It
  is still rare: h40c had 0 redirects in 45 answers.
- **(b) An answer that is only a block** (cues, no prose). `pendingCues` never rides a token, and the engine
  substitutes "Could you repeat that?" with no cues (`IntelligenceEngine.ts:460-462`). The `[Answer] cues:` line still
  counts as "present" in the cue row.

## Verification: what I checked, and how

1. **Conflict resolutions.**
   - `git show --cc 279103b` shows only two files that differ from both parents:
     - `flight.test.ts`: the union of both import lists;
     - `metrics.test.ts`: both new describes, each whole.
   - The other six conflicted files resolve hunk by hunk to one side. I checked each by diffing against both parents.
   - Nothing from the cue side is missing except MAIN's retitle in `answeringModel.test.ts` (same body).
   - Nothing from MAIN is missing except the merge base's "three newest rows" test, which the cue branch had already
     rewritten as "four newest rows" (a superset).
   - Every cue test is present, both flight tests from MAIN are present, and both `metrics.test.ts` describes are
     present.
2. **Silent duplicates and losses.**
   - I enumerated the files both sides touched myself: 25 (8 conflicted + 17 auto-merged), matching the report.
   - I compared all **13** twin pairs with `git patch-id --stable`: the brief's 9, plus `b80a677`/`10bd670`,
     `33eae76`/`0df3c55`, `f21436e`/`a90410e` and `a4a26af`/`a50fd09`.
     - 11 pairs have identical patch-ids.
     - `5d5ab34`/`783991a` and `896f726`/`47def85` differ only in context lines (`git range-diff`: the cue side's
       `onCues` parameter against MAIN's `liveTexts`).
   - `git diff 0ef42a0 279103b` is 30 files. All were touched by the cue side, and they contain only cue mode, the cue
     harness, the cue UI and `resolveEnvKey`.
   - `git diff fd57512 279103b` is 91 files. All were touched by MAIN, and they contain only MAIN's work: the hedge and
     its default, `withParentExchange`, `addAssistantMessage(…, settled)`, the diagLog gate, the startup validation,
     e311019, e94305a, 998b5b7, the boundary repair, and the pass records.
   - Every cue-side commit on a file that resolved to MAIN's version is a twin. The one exception, `fd57512` in
     run.mjs, survives in the merge.
   - `git grep` finds no conflict markers in the tree, and no throwaway or mutant file is committed.
3. **The hedge x cue chain.**
   - **One sentinel per raw stream.** Every route puts at most one head sentinel on the raw stream:
     - Gemini technical: `streamChat:2732` → stall fallback → hedge (`:3396`);
     - behavioral and fast: `streamVerbalWithGeminiFlash:3365` → the same path;
     - Gemma: a `Gemma 4` sentinel, or the `Gemini Flash` handover (`:3225`), which calls 3.1-lite directly and never
       the hedge.
   - **The stripping chain.**
     - `stripModelSentinel` strips that sentinel (the label has no `_`).
     - `stripCueBlock` runs innermost (`WhatToAnswerLLM.ts:389`). Gemma's leak filter (`LLMHelper.ts:3073`) cannot
       drop `__CUES__` or `N|` lines.
     - `cuesSent` / `onCuesOnce` (`:380-385`) is created once per `generateStream` call, so the primary chain and the
       redirect's chain share it.
   - **Ordering.** The `(hedge)` announce is yielded only when the filter yields, which is after `onCues` and
     immediately before the first prose chunk (`:108-124`).
   - **Sentinel-only chunks.** `cutAtWordBudget` and `tapFirstToken` pass them through without counting them. The
     engine continues past them before reading `pendingCues` (`IntelligenceEngine.ts:433-441`). The renderer's
     source handler only sets the label (`NativelyInterface.tsx:1381-1383`).
   - **The brief's question.** Cues reported twice: no path. Shown raw: typed chat only (P1). Lost: the two edge paths
     in P2.
   - **The throwaway.** I read the resolver's test and its log (7 of 7; A is paired with the A0 control, and D is
     calibrated by the mutant). I did not re-run it, because it has to sit in `electron/llm/`.
4. **Interactions.**
   - **Supersede x hedge.** It works as on MAIN: the losing leg is aborted when a winner appears, and the engine's
     `.return()` at its next token reaches `deliver`'s finally or the per-token finally. What is new is that the old
     stream now lives through its cue block before its first prose token. It is not live-tested; see Preconditions.
   - **First-token abort x the once-guard.** They do not interact. A close can only land at a prose yield, after
     `report()` has run, and it aborts through the same finally blocks.
   - **`withParentExchange` x whole-turn.** With the flag off it returns the turns unchanged. `questionContext` is
     read only there (`followUpParent.ts:48-52`). The hands-free history holds prose only.
   - **MAIN's diagLog gate x the cue harness.** `answers.mjs` runs the rebuilt dist's filter in plain node, where the
     gate suppresses the writes, and no cue code reads diag lines from offline runs.
   - **Hedge x prompt capture.** Covered in finding 1 (b)1.
5. **Concern 1**: confirmed; see finding 1.

**Tests and type checks I ran** (09:56-10:15, with no app process running):
- The 10 seam files: 214 passed, 6 skipped. These were `answeringModel`, `WhatToAnswerLLM.cues`,
  `IntelligenceEngine.cues`, `verbalFallback`, `LLMHelper.verbalHedge`, `abortOnClose`, `verbalStreamFilter`, and the
  `flight`, `metrics` and `pass-record` tests.
- The full suite from a temp cwd: 99 files (98 passed, 1 failed to load), 987 tests (979 passed, 8 skipped, 0 failed).
  This is identical to the report.
  - The file that failed to load is `interviewerTurn.replay.test.ts` (ENOENT on its cwd-relative fixture).
  - Run from the worktree root, it passes 12 of 12.
- `tsc --noEmit` at the root: exit 0.
- `tsc -p electron/tsconfig.json --noEmit`: exactly the six known errors: `GeminiLiveRouter.ts(125,44)`,
  `ipcHandlers.ts(3433,18)`, `(3433,38)`, `(3436,31)`, and `KnowledgeOrchestrator.ts(349,35)`, `(351,25)`.
- `git status --ignored --porcelain` was identical before the full-suite run and after the last run (34 entries, same
  md5).

## Preconditions before anything is measured on this merge

- **Rebuild dist-electron first.** The current build is from 05:00 today, before the merge:
  - `dist-electron/electron/LLMHelper.js` has 0 hits for `verbal hedge: front=`;
  - `dist-electron/electron/llm/WhatToAnswerLLM.js` has 0 hits for `HEDGE_WINNER` and 1 for `stripCueBlock`.

  A re-smoke or bench on this build would measure the cue branch without the hedge. After the rebuild, check those
  markers and the timestamps (the build-cwd trap).
- **Watch supersede x hedge in the first live run.** The re-smoke and the validation hour will be the first live runs
  of that combination: h40c had 0 supersedes (`h40c-result.md:193-194`). A superseded answer keeps its legs running
  (both of them, once past the trigger) until its first *prose* token, which comes after its cue block. It logs
  `[Answer] cues:` but never `[Answer] full:`. `smoke-shape.mjs` pairs cue lines with both answer and supersede
  dispatches, so it will not misread them. It is still worth one look in the smoke log.

## Not covered by this review

- No live call, app start, build, or flight `--dry-run`. The dry run needs a `.env`, which this review may not read or
  create.
- The engine together with the real hedge is checked by reading the code, not by running it. Finding 2 is the test
  that would close that gap.

# Opus review: the merge of MAIN's line into the cue branch (279103b)

You review a MERGE COMMIT before new work is built on it. Read-only; write only your findings file.

## What happened
- Worktree `C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant\.claude\worktrees\whole-turn`, branch
  `feat/whole-turn-answers`. Merge commit `279103b` = parents `fd57512` (cue branch: whole-turn answers + cue mode v1)
  and `0ef42a0` (MAIN's branch `fix/coding-style-suffix-all-gemini`: the hedge as the default answer policy, first-token
  aborts, the Deepgram boundary repair, and more). Merge base `f3c7c8e`.
- Why: cue mode merges into MAIN on Thursday only if a re-smoke and a bench pass; they will now run on THIS merged
  program, so the merge must be right before anything is built or measured on it.
- The resolver's brief: `SP\cue-group\merge-brief.md`. Its report (per-hunk table, the silent-duplicate check of the
  17 files both sides touched without a conflict, the hedge x cue-chain check, test numbers):
  `SP\cue-group\merge-report.md`. Its throwaway hedge x cues test is kept at `SP\cue-group\zz-merge-hedge-cues.test.ts`
  with its log `hedge-cues-check.log`.
- SP = `C:\Users\sotka\AppData\Local\Temp\claude\C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant--claude-worktrees-nifty-lederberg-49681a\9c5886c7-cdbd-48af-b8bc-e9275012ec64\scratchpad`

## Review — verify, do not trust the report
1. **The 8 conflict resolutions**: `git show --cc 279103b` shows exactly the hunks that differ from both parents.
   Check every resolution keeps both sides' behaviour.
2. **Silent duplicates / silent losses** in files that merged without a conflict (the big risk with nine fixes that
   landed on both branches as separate commits: `5d5ab34`/`783991a`, `896f726`/`47def85`, `d267870`/`0cb9235`,
   `1f23a5e`/`3d97b4a`, `f06fdc8`/`0841e9d`, `09d0c0e`/`2d0805e`, `97fc38d`/`5952b23`, `76f90f7`/`5c97b11`,
   `6e8bdb4`/`7824a57`). The test: `git diff 0ef42a0 279103b` must contain ONLY cue-branch work (cue mode, whole-turn,
   the cue harness, `resolveEnvKey`), never a second copy of a MAIN fix; `git diff fd57512 279103b` must contain ONLY
   MAIN's work. Pay most attention to `electron/LLMHelper.ts`, `electron/IntelligenceEngine.ts`, `electron/main.ts`,
   `electron/llm/WhatToAnswerLLM.ts`, `electron/llm/verbalStreamFilter.ts`, `electron/test/golden/interview60.metrics.mjs`,
   `interview60.run.mjs`, `interview60.flight.mjs`.
3. **The hedge x cue chain** (`WhatToAnswerLLM.generateStream` and `LLMHelper.streamGeminiWithHedge`): the report
   says the hedge hands the chain ONE stream (the winner's), `stripCueBlock` stays innermost, the once-guard holds
   across the fallback, and the engine attaches cues to the first prose token after a `(hedge)` sentinel chunk. Verify
   from the code. Is there any path (hedge + stall fallback + redirect, Gemma selection, typed chat) where cues are
   reported twice, lost, or shown raw?
4. **Anything the merged program now does that neither parent did** (an interaction): e.g. the whole-turn supersede
   path x the hedge's abort of the losing leg; the first-token abort x the cue once-guard; `withParentExchange`
   (MAIN, flag off) x whole-turn's transcript assembly.
5. The resolver's concern 1: the flight's `captured-no-cues` twins run on 3.1-lite LOW while the hour answers on
   3.5-lite HIGH first. Confirm, and say what the validation hour's pre-registration must do about it.
You may run tests read-only from a temp cwd (PowerShell): `Set-Location $env:TEMP; cmd /c "npx --prefix ""<WT>"" vitest run --root ""<WT>"" <file>"`.
Do not build, do not start the app.

## Output
Write `SP\cue-group\merge-review.md`: numbered findings with severity (Critical / Important / Minor), file:line, what
is wrong, the concrete fix; then a verdict: MERGE OK or NOT OK (with the blocking findings). Reply with the verdict and
the count per severity only. Rules: read-only except that file; no git writes; never read `.env` or keys; no subagents;
no `node -e`.

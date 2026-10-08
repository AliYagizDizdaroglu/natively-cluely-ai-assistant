# Merge MAIN's line into the cue branch (implementer brief)

**Where this fits:** cue mode (branch `feat/whole-turn-answers`, worktree below) merges into MAIN's branch on
Thursday only if a re-smoke and a bench pass. An Opus review found that both gates would test the pre-merge branch,
while what merges is cue mode + MAIN's 42 newer commits. So you bring MAIN's line INTO the cue branch now; the gates
then test the program that will actually merge, and Thursday's merge becomes a fast-forward.

## Facts
- Worktree (your working directory): `C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant\.claude\worktrees\whole-turn`,
  branch `feat/whole-turn-answers`, HEAD `fd57512`. `git status` shows ONE modified file, `electron/test/golden/interview60.report.md`:
  it is a user-owned run output — never stage it, never restore it, never touch it. MAIN's side does not change it.
- Merge `fix/coding-style-suffix-all-gemini` (HEAD `0ef42a0`, a local branch of the same repo) into it. Merge base `f3c7c8e`;
  MAIN has 42 commits the branch lacks, the branch 24 that MAIN lacks.
- A dry run (`git merge-tree --write-tree`) gives 8 conflicted files, 21 hunks:
  | file | hunks |
  |---|---|
  | electron/LLMHelper.abortOnClose.test.ts | 4 |
  | electron/llm/WhatToAnswerLLM.answeringModel.test.ts (add/add) | 5 |
  | electron/llm/WhatToAnswerLLM.ts | 4 |
  | electron/test/golden/interview60.flight.mjs | 1 |
  | electron/test/golden/interview60.flight.test.ts | 1 |
  | electron/test/golden/interview60.metrics.test.ts | 2 |
  | electron/test/golden/interview60.pass-record.mjs | 2 |
  | electron/test/golden/interview60.pass-record.test.ts | 2 |
  Everything else auto-merges (IntelligenceEngine.ts, LLMHelper.ts, verbalStreamFilter.ts + test, main.ts, metrics.mjs, judge, run.mjs, …).

## Why the conflicts exist
Nine fixes landed on BOTH branches as separate commits (same intent, adapted to each branch):
`5d5ab34`↔`783991a` (name the model that answered), `896f726`↔`47def85` (last-resort message), `d267870`↔`0cb9235`
(a close on the first token aborts), `1f23a5e`↔`3d97b4a` (Gemma close aborts), `f06fdc8`↔`0841e9d` (first-token stall
aborts), `09d0c0e`↔`2d0805e` (Gemma handover reaches the answer bar), `97fc38d`↔`5952b23` (a run stops the app),
`76f90f7`↔`5c97b11` (a merged pass records its grader model), `6e8bdb4`↔`7824a57` (holdout40). Left = cue branch, right = MAIN.
MAIN-only work that must survive whole: the hedge `da28f25` + its default `f745d7e` + `998b5b7` (a pass record says the run
flew with the hedge); `e94305a` (the flight answers on the two Flash Lites only, no Groq arms); `e311019` (credit an answer
dispatched on a Live paraphrase); `ce4e730` (only the Electron main process writes verbal-diag.log); `0ef42a0` (the Deepgram
boundary repair). Cue-only work that must survive whole: `6b7817f` (stripCueBlock innermost, cues once per stream),
`f299fae`/`3fd5ba4` (cue checks, --cues/--no-cues, the cue row, its drift test), `feaf897`/`49183fc` (the flight's
captured-no-cues twins, hasCueRule fails closed), and the whole-turn answer logic.
Inspect intents with `git log -p f3c7c8e..fix/coding-style-suffix-all-gemini -- <file>` and `git log -p f3c7c8e..HEAD -- <file>`.

## How to resolve
1. **Both sides' behaviour survives.** For a twin pair, keep ONE implementation. Prefer MAIN's text: it was reviewed and
   flown in MAIN's hour-long runs. Keep the cue branch's text only where it carries something MAIN's lacks (cue- or
   whole-turn-specific). Say which you kept and why, per hunk.
2. **Tests: keep every distinct test from both sides.** Dedupe tests that are identical or that test the same behaviour
   under the same name. When one test name has two different bodies, keep both behaviours: rename one if you must. Never
   drop an assertion to make a merge compile.
3. **WhatToAnswerLLM.ts:** all 4 hunks are MAIN's hedge-winner announcement (`HEDGE_WINNER`, `announce`) against the cue
   branch's pre-hedge text (`switchedTo`). Take MAIN's lines. Then CHECK, and say in your report, that the cue chain the
   file composes elsewhere (stripCueBlock innermost, the eighth `onCues` parameter, the once-guard across the fallback)
   is intact after the merge. The hedge races two models inside `LLMHelper.streamGeminiWithHedge` and hands ONE stream
   (the winner's) to this chain; confirm that from the code, and confirm that a hedge-won answer's cues still reach
   `onCues` exactly once.
4. **Flight harness (flight.mjs + test):** keep MAIN's Flash-Lites-only arm set AND the cue branch's
   `captured-no-cues` twins / `hasCueRule` gating.
5. **pass-record.mjs + test:** twin `76f90f7`/`5c97b11` plus MAIN's `998b5b7`: one grader-model implementation, plus
   the hedge line.
6. **metrics.test.ts:** keep both sides' cases (the cue row cases and MAIN's).

## Steps
1. `git status` (expect only the report file modified) and `git log -1 --format=%H` (expect fd57512…).
2. Baseline, BEFORE merging, from a temp cwd in PowerShell: `Set-Location $env:TEMP; cmd /c "npx --prefix ""<WT>"" vitest run --root ""<WT>"""`
   (the full suite). Record files/passed/failed/skipped. Then the type checks from the worktree root:
   `cmd /c "npx tsc --noEmit"` (root) and `cmd /c "npx tsc -p electron/tsconfig.json --noEmit"` (the electron project
   has pre-existing errors; record the count and the error lines).
3. `git merge --no-ff --no-commit fix/coding-style-suffix-all-gemini`.
4. Resolve the 8 files. `git add <file>` for each resolved file BY NAME (auto-merged files are already staged).
   Never `git add -A`, `-u` or `.`; never `git stash`; never `git checkout --`/`restore` on the report file.
   Check no conflict marker remains anywhere staged (search for `<<<<<<<`, `=======`, `>>>>>>>` at line starts in the 8 files).
5. The same full suite + both type checks on the merged tree. Every test that passed on the cue branch baseline or on
   MAIN must pass; a new failure is yours to fix before committing, or to report as BLOCKED with the output. The electron
   tsc count must equal the baseline's (same errors), or you explain every difference.
6. Commit the merge: `git commit` with a message file:
   subject `merge: bring MAIN's line (hedge default, first-token aborts, boundary repair) into cue mode`; a body that lists,
   per conflicted file, what was kept from each side; the suite and tsc numbers before and after; and the trailer
   `Co-Authored-By: Claude <your model name> <noreply@anthropic.com>`. Then `git status` again: the report file must still
   be modified and unstaged, nothing else dirty.
7. Do NOT build (`npm run build:electron`), do not start the app, do not touch MAIN's checkout
   (`C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant` itself), do not push, do not read `.env` or keys,
   no subagents, no `node -e`.
8. **Hard stop at 13:20 local:** a live app run starts at 13:30 on this machine and must not compete for CPU. If you are
   not done by 13:20, stop running tests, write your report with where you are, and return.

## Report
Write `SP\cue-group\merge-report.md`: per file and hunk, what you kept and why; the WhatToAnswerLLM cue-chain check
(item 3 above); the suite and tsc numbers before/after; the merge commit SHA; anything you were unsure of.
Return only: status (DONE / DONE_WITH_CONCERNS / BLOCKED), the commit SHA, one line of test numbers, concerns.
SP = `C:\Users\sotka\AppData\Local\Temp\claude\C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant--claude-worktrees-nifty-lederberg-49681a\9c5886c7-cdbd-48af-b8bc-e9275012ec64\scratchpad`

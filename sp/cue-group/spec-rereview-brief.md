# Scoped Opus re-review: small-cues spec + plan, revision 1

You (or a reviewer like you) reviewed revision 0 of this spec delta + plan: findings in `SP\cue-group\spec-review.md`
(READY after fixes: 0 Critical, 7 Important, 11 Minor). The controller ruled on every finding
(`SP\cue-group\fable-revision-1.md`, binding) and the author revised both files. Scope: verify each finding is
resolved as ruled, and review what is NEW. Not a fresh review of the unchanged parts.

## Read
- Spec: `C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant\.claude\worktrees\whole-turn\docs\superpowers\specs\2026-09-30-cue-mode-small-cues.md`
- Plan: `...\whole-turn\docs\superpowers\plans\2026-09-30-cue-mode-small-cues.md`
- `SP\cue-group\spec-review.md` (the findings), `SP\cue-group\fable-revision-1.md` (the rulings).
- The code at the worktree's HEAD. NOTE: MAIN's line was merged into this branch at `279103b` (ruling 1); an Opus review
  of that merge is running now and may add small fix commits, so match the plan's edits by their quoted text.
- The controller's scratchpad tools named as done: `SP\check-smoke-cues.mjs`, `SP\calib-cue-smoke.mjs`,
  `SP\cuebench\cuebench-score.mjs` (+ `cuebench-calibrate.mjs`, `e2e-cuebench.mjs`), `SP\PREREGISTER-cuebench.md`
  (amendment 09:35), `SP\launch-smoke-cues.cmd`, `SP\register-cue-smoke.ps1`, `SP\cue-group\SPIKE6-RULE.md` (addendum).
SP = `C:\Users\sotka\AppData\Local\Temp\claude\C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant--claude-worktrees-nifty-lederberg-49681a\9c5886c7-cdbd-48af-b8bc-e9275012ec64\scratchpad`

## Check
1. Each of findings 1-18: RESOLVED as ruled / PARTLY / NOT (one line each, file:line of the fix).
2. The NEW task for the typed chat path (plan Task 4, spec §3.6): is `VERBAL_TYPED_PROMPT` +
   `VERBAL_WHAT_TO_ANSWER_PROMPT = typed + CUE_RULE` correct against the real `prompts.ts` composition (is everything
   before `CUE_RULE` exactly the typed prompt today, byte for byte — including any `SPOKEN_LENGTH_AND_DEPTH` tail
   assertion in prompts.test.ts)? Are all `gemini-chat-stream` sites covered, and every consumer of the hands-free
   constant decided? Is the proposed source-text pin test (`ipcHandlers.typedPrompt.test.ts`) a test that would FAIL
   if a site kept the hands-free prompt, or is there a sturdier test within the repo's existing patterns? Say which.
3. The `cleaned` field and the "log when dropped, cut OR cleaned" change: do the tests pin it; do the existing readers
   (metrics regex, the smoke check) stay unaffected; does the metrics `trimmed` count now mean something different
   (a cleaned-only line counted as a trim) — and is that stated?
4. The line refresh against `279103b`: spot-check at least the engine `onCues`, the filter insert point, the metrics
   return / GATE row / fixtures, the prompt tail; say if any quoted anchor text no longer exists.
5. Anything the revision introduced that contradicts the user's decisions, the rulings, or itself.

## Output
Write `SP\cue-group\spec-rereview.md`: the per-finding table, new findings with severity and fix, then the verdict:
READY or NOT READY. Reply with the verdict and the count of new findings per severity only. Read-only except that file;
no git writes; never read `.env` or keys; no subagents; no `node -e`. You may run tests read-only from a temp cwd:
`Set-Location $env:TEMP; cmd /c "npx --prefix ""<WT>"" vitest run --root ""<WT>"" <file>"` (PowerShell).

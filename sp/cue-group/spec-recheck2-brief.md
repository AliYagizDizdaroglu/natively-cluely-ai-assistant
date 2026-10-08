# Scoped Opus check: small-cues spec + plan, revision 2 (deltas only)

You (or a reviewer like you) re-reviewed revision 1: `SP\cue-group\spec-rereview.md` (READY, 8 Minor N1-N8 + nits).
The controller ruled (`SP\cue-group\fable-revision-2.md` + an addendum giving the exact v3 smoke-check rule, quoted in
the spec's §3.5.2), Fable wrote revision 2. Scope: verify each ruling landed as ruled, and review what is NEW — the new
**Task 5** (`interview60.chains.mjs` strips the cue block; the operator task is now Task 6), and the revised Tasks 3
and 4. Not a fresh review of unchanged parts (Tasks 1-2 are byte for byte revision 1; Task 1 is already committed).

## Read
- Spec: `C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant\.claude\worktrees\whole-turn\docs\superpowers\specs\2026-09-30-cue-mode-small-cues.md`
- Plan: `...\whole-turn\docs\superpowers\plans\2026-09-30-cue-mode-small-cues.md`
- `SP\cue-group\fable-revision-2.md` (the rulings), `SP\cue-group\spec-rereview.md` (the findings), `SP\cue-group\spike6-result.md`.
- The code at the worktree's HEAD: `4c07ae9` = Task 1 committed on top of `721c6fa` (merge-fix B) and `1901ab6`
  (merge-fix A: `WhatToAnswerLLM.hedgeCues.test.ts`, a third case in `IntelligenceEngine.cues.test.ts`). NOTE: a small
  fix round on those merge-fix tests is running now (comment/title edits in `IntelligenceEngine.cues.test.ts` lines
  ~66-67, `WhatToAnswerLLM.hedgeCues.test.ts` header + case C title, and a derived-pairing assertion in
  `interview60.flight.test.ts`); it may be uncommitted in the working tree while you read. Judge Task 3's anchors by
  the quoted TEXT they use, and say whether any anchor depends on those two comment lines.
- The controller's tools: `SP\check-smoke-cues.mjs` (v3) + `SP\calib-cue-smoke.mjs`, `SP\wait-for-gemini.mjs`,
  `SP\launch-smoke-cues.cmd`, `SP\cue-group\probe-shipped.mjs` + `cal-probe-shipped.mjs` + `PREREGISTER-cueprobe.md`.
SP = `C:\Users\sotka\AppData\Local\Temp\claude\C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant--claude-worktrees-nifty-lederberg-49681a\9c5886c7-cdbd-48af-b8bc-e9275012ec64\scratchpad`

## Check
1. Rulings 1-12 + the addendum: LANDED / PARTLY / NOT, one line each with the spec/plan line.
2. The new Task 5 (chains): is the wrap placed exactly as `interview60.answers.mjs:188` does (innermost, same import
   source)? Is the claim "no test can import chains.mjs (it reads .env and runs its chains at load)" TRUE at HEAD? If
   true, would the proposed source-text pin FAIL if the wrap were missing or placed outside the other filters? Is there
   any other path in chains.mjs that stores or re-feeds answer text without passing the wrap (the stored answer, the
   anchor-hit proxy, the `ASSISTANT (PREVIOUS SUGGESTION)` history, any export)? Does the change alter chains output on
   a PRE-cue hour (it must not: an answer without a block passes through unchanged)?
3. Task 3: the four engine cases (dropped only, cut only, both, cleaned only) — would each fail on the mutant it names
   (drop `t.dropped.length`, drop `t.cut.length`, drop `t.cleaned.length` from the condition; log after the cues line)?
   Are the anchors unique at HEAD?
4. Task 4: the N8 pin `not.toMatch(/CUE_RULE|CUES_SENTINEL|__CUES__/)` — does it hold for the edited ipcHandlers.ts
   (no comment or string there mentions those names)? The negative dist marker: is `VERBAL_WHAT_TO_ANSWER_PROMPT` truly
   absent from the built `ipcHandlers.js` after Task 4 (esbuild per-file output keeps imported names only if used)?
5. Task 6 (operator): the v3 rule, the gate, the typed check timing, the pass records, the fast-forward rule — any step
   that contradicts another, the Global Constraints, or the user's decisions (3x5 ceiling; simple = one line; full
   answer as today; merge only if re-smoke AND bench pass; replay arms opt-in except Friday; h40c's pass-record layout)?
6. Anything the revision introduced that contradicts itself.

## Output
Write `SP\cue-group\spec-recheck2.md`: the ruling table, new findings with severity and fix, then READY / NOT READY.
Reply with the verdict and the count of new findings per severity only. Read-only except that file; no git writes;
never read `.env` or keys; no subagents; no `node -e`. Tests only read-only from a temp cwd
(`Set-Location $env:TEMP; cmd /c "npx --prefix ""<WT>"" vitest run --root ""<WT>"" <file>"`), and none after 13:20.

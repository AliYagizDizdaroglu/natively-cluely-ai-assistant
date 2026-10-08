# Planner brief: post-h40b fixes + the hedge, ready for the next flight (h40c)

You write an implementation PLAN (superpowers:writing-plans format: header, Global Constraints,
bite-sized tasks with exact files, interfaces, failing test first, verify steps). You do NOT
implement. Save it to:
`C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant\docs\superpowers\plans\2026-09-26-h40c-hedge-and-followups.md`
(write it with the Write tool; if Write refuses that path, write it to
`<SP>\sdd\2026-09-26-h40c-plan.md` and say so). Reply with the path and the task list only.

SP = `C:\Users\sotka\AppData\Local\Temp\claude\C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant--claude-worktrees-nifty-lederberg-49681a\9c5886c7-cdbd-48af-b8bc-e9275012ec64\scratchpad`
MAIN = `C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant` (branch
`fix/coding-style-suffix-all-gemini`, HEAD 07a0e5e). Electron interview copilot; TypeScript in
`electron/`, flight harness in `electron/test/golden/*.mjs`, vitest tests.

Read first: `MAIN\electron\test\golden\passes\2026-09-26-h40b-result.md` (what flight h40b found),
`MAIN\docs\superpowers\specs\2026-09-24-verbal-hedge-proposal.md` (the hedge design),
`MAIN\electron\test\golden\passes\2026-09-25-hedge-probe-result.md` (its live probe: PROCEED),
`MAIN\electron\test\golden\hedge-live.policy.mjs` + `.test.ts` (the probed policy, fake timers).

## What the user asked (2026-09-26 ~17:50)

"work on suggestions and then verify enhancements landed properly without regressions, also lets
prepare the hedge for the next flight; then report me back when these are done and verified".
The suggestions (from the h40b report):
1. Keep the R09 fix bb94db4 (no work).
2. Two instrument fixes, no flight needed:
   a. The harness attributes an in-app answer by the overlap of its dispatch ANCHOR with the played
      question (`interview60.judge.mjs` pairing ~lines 95–125; `interview60.metrics.mjs`
      `answersToNobody` ~line 286 via `claimOf`). An answer anchored on a Live PARAPHRASE goes to
      nobody. Reproduction: h40b run folder
      `MAIN\electron\test\golden\interview60.runs\2026-09-26T11-39-51-h40b\`, R07F: log line
      `2026-09-26T10:47:31.603Z ... dispatch: answer source=live anchor="In the scenario where two workers are picking up jobs from a queue, what happens" verdict=paraphrase question="In the scenario where two workers are picking up jobs from a queue, what happens if the worker that claimed a job crashes halfway through processing it?"`,
      played item R07F "And if the worker that claimed it crashes halfway?". The pass record
      counts it "1 to nobody", failing two gate rows. Both attribution sites must agree.
   b. The blind-grading pairs builder (scratchpad `flash-h40b-blind-pairs.mjs`; check whether a
      repo builder exists too) drops a follow-up's parent question, so blind grades on follow-ups
      are lenient (3.5-lite HIGH's rank-one R09F answers: acceptable ×3 blind, wrong ×3 standard).
      The standard pairs carry the parent (it sits just before the follow-up; the fact-check says
      the grader prompt relies on a "[Follow-up to: …]" suffix — see `interview60.grader-prompt.md`
      :30-32 and `questionForGrader` in judge.mjs).
3. Give a follow-up's answer prompt its parent question. On h40b, R09F's and R11F's prompts
   carried only the follow-up sentence as interviewer speech (five follow-ups lack their parent
   on BOTH hours: R02F R04F R09F R11F R13F); the only link was a 203-char preview of the previous
   answer (`electron/llm/WhatToAnswerLLM.ts` ~200–232 builds the message; the transcript window
   comes from `prepareTranscriptForWhatToAnswer`, and `buildTemporalContext`
   (`electron/llm/TemporalContextBuilder.ts`), called in `electron/IntelligenceEngine.ts` ~354–404).
   Find WHY the parent drops out of the window, then design the smallest change.
4. The hedge, behind an env flag: 3.5-lite HIGH first; if no first token by ~5 s start 3.1-lite
   LOW alongside; keep 3.5 running; the first stream to produce a first token wins, the other is
   aborted (first-token abort machinery exists: memory "first-token abort", AbortSignal.any leaks
   under Electron 33 — avoid it). It replaces, when the flag is on, today's
   `LLMHelper.streamGeminiWithStallFallback` (`electron/LLMHelper.ts` ~3385; today = 3.1-lite
   first, 3.5-lite HIGH after a 503 or a 10 s first-token stall). The answer's model label
   (`__model_source`) must name the model that actually answered (a past bug class: memory
   "model swap pitfalls", commits 783991a, 47def85).
5. Prepare the hedge for the next flight h40c on holdout40: a pre-registration
   `MAIN\electron\test\golden\passes\PREREGISTER-h40c.md` written from the hedge proposal + the
   probe result + h40b (rule fixed BEFORE the hour; one change under test = the hedge), a launcher
   + guard in the scratchpad modelled on `SP\launch-h40b.cmd`, `SP\guard-h40b.mjs`,
   `SP\guard-r09.mjs` (the guard proves the build AND the source carry the hedge and that the flag
   reaches the app), and the registration command ready but NOT run: the user names the time.
6. Verify everything landed without regressions, then a report.

## Rulings already made (the controller's; follow them)

- **Flags, default OFF.** The follow-up fix (3) and the hedge (4) each go behind their own env
  flag, default off, so the shipped default is unchanged until a flight validates each. The
  protocol: every app change is validated on its own pre-registered holdout hour. h40c flies the
  hedge flag ON and the follow-up flag OFF. The follow-up fix is validated offline now (replay)
  and flown on a later hour. Name the flags `NATIVELY_VERBAL_HEDGE` and
  `NATIVELY_FOLLOWUP_PARENT` unless the codebase has a naming convention that says otherwise.
- The code lands in MAIN on `fix/coding-style-suffix-all-gemini` (flights build MAIN's working
  tree). Commits are made by the CONTROLLER only, via `SP\commit-main-paths.ps1` (private index +
  compare-and-swap); implementers never run git commit/add/stash.
- holdout40 is NEVER used to tune or validate the follow-up fix. Offline validation of (3) uses
  another roster's captured prompts (e.g. scenario50 / interview60 run folders under
  `MAIN\electron\test\golden\interview60.runs\` that have `interview60.prompts.json` and
  follow-ups; find ones whose follow-up prompts lack the parent), replayed through the REAL prompt
  builder (not a hand-written imitation), answered by gemini-3.1-flash-lite LOW, ≥3 reps per arm
  (with vs without the parent), graded blind by Opus agents WITH the parent question available to
  the grader. Pre-register that small replay's decision rule in the plan before it runs.
- Gemini quota: lite models 500 requests/model/day, already heavily used today (the h40b arms);
  the day resets 10:00 local (07:00 UTC). Budget every live call in the plan; the replay must fit
  in ~120 requests on 3.1-lite; if the budget does not fit, the task says so and schedules it
  after 10:00 tomorrow instead of guessing. Full Flash models (20/day) are not used.

## Global constraints to copy into the plan (verbatim intent)

- Rule-8 calibration for every check that decides something: run it on a known case, and prove it
  can fail (break the code, watch the test fail).
- TDD: failing test first, watched failing, for every code change.
- Tests: run MAIN's vitest from a temp cwd with `--root <MAIN>` (memory: cwd-relative writes);
  timed-out tests can corrupt the next (serial queue exists, a63dc09). No `npx`; from PowerShell
  use `cmd /c "npm run ..."`. Two type-check gates: root `tsc` and `tsc -p electron/tsconfig.json`
  (6 pre-existing errors in the latter — list them and require "no NEW errors"). Build:
  `cmd /c "npm run build:electron"` from MAIN; verify a marker per change in `dist-electron` with a
  timestamp (memory: build cwd trap; builds capture concurrent edits — check ListAgents/mtimes).
- Never start the Electron app from a Claude session (it reads a shadow credentials store); a live
  app exercise goes through a Windows scheduled task (see `SP\register-natively-task.ps1`, the h40b
  task's settings: 5 h limit, AllowStartIfOnBatteries, DontStopIfGoingOnBatteries, WakeToRun) or is
  handed to the user. Stop the app only via `node electron/test/golden/interview60.run.mjs app:stop`.
- Keys live in `.env`/shell only; never print, read or copy key values; never read or edit
  `credentials.enc`.
- Never stage the user's uncommitted files: `natively_debug.log.1`,
  `electron/test/golden/interview60.chains.json`, `electron/test/golden/interview60.report.md`,
  `resume_prompt.txt`, `retry_claude_print.bat`, `electron/test/golden/openrouter-probes/`,
  `openrouter.probe.mjs`, `zai-probes/`, `zai.probe.mjs`. Never `git stash`, `git add -A/-u`, push.
- Committed pass records are never hand-edited or regenerated for old runs; the attribution fix is
  proven on COPIES of the h40a/h40b run folders in the scratchpad.
- Throwaway scripts live in the scratchpad; `.cmd`/`.ps1` files are ASCII-only; paths contain the
  non-ASCII "Masaüstü" (PowerShell: resolve MAIN with the `.git`-filtered `Masa*` wildcard).
- Surgical changes; no refactors; match existing style.

## Verification the plan must end with (the user's "verify … without regressions")

- Full vitest suite green (baseline: 797/797 before bb94db4's tests… state the count you find at
  HEAD 07a0e5e first, then after), both tsc gates with no new errors, the electron build with
  markers.
- Default-off proof: with both flags unset the built app's verbal path is byte-for-byte the
  same policy as today (tests that pin it), and the prompt for a non-follow-up is unchanged.
- Instrument fixes re-run on scratchpad copies of h40b and h40a: h40b's R07F attributed and
  "to nobody" 0; h40a's attribution unchanged item by item (no other item moves).
- The follow-up replay's pre-registered verdict.
- One LIVE exercise of the hedge crossing the real seams (env flag → app process → real Gemini
  SDK → first-token race → abort → model label), without starting the app from a session:
  design the cheapest honest one (e.g. a short scheduled-task smoke, or a node harness that loads
  the BUILT module with the flag) and list what it does not reach.
- A final whole-change Opus review against this brief, then the report.

List residual risks and what each check does NOT cover. Keep tasks small enough for a Sonnet
implementer each; mark which tasks are independent.

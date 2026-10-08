# Side-task health check — plan

Requested by the user on 2026-09-23 at about 04:35: "can you check in after all side tasks are finished with no regression and make sure the upcoming tests are 100% safe to conduct and overall app health is ok?"

## Trigger

Run this once every natively side-task session is idle.
- At 04:38 two were busy:
  - "Abort stalled Gemini requests at the deadline" (worktree friendly-gagarin-667c17);
  - "Stop flight scripts writing to the live verbal-diag.log" (worktree objective-kirch-6a19fa).
- Both were sent the test times and asked for an idle notice (SendMessage notify_when_idle).
- The rest were idle at 04:38: first-token abort, Gemma hand-yield abort, diag log under vitest, Gemma→Flash label, and build cwd.

**Protected spans:** 10:10–11:25, 14:55–16:10 and 20:55–22:10 local (W1/W2/W3, each up to about 70 min). Never run steps 2–4 inside one. If the trigger lands inside a span, start right after it.

## 0. Inventory (read-only)

- **Sessions:** ListAgents and list_sessions. Check that every natively session is idle, and note any NEW natively session.
- **MAIN** (fix/coding-style-suffix-all-gemini):
  - list the commits since 6f91929 (at 04:38: 0cb9235, 3d97b4a, ce4e730);
  - list the uncommitted tracked changes and their owners.
    - At 04:38, WhatToAnswerLLM.ts + WhatToAnswerLLM.answeringModel.test.ts held the Gemma→Flash label fix, left uncommitted by the idle session "Surface the Gemma-to-Flash switch in the answer label".
    - interview60.chains.json, interview60.report.md and natively_debug.log.1 are the USER's; never touch them.
- **feat/whole-turn-answers:** list the commits since 896f726 (at 04:38: d267870, 1f23a5e).
- **Unmerged side branches:**
  - claude/interesting-volhard-5ff3c0 9f8eb33 (build cwd fix);
  - claude/friendly-gagarin-667c17 (stall abort);
  - claude/objective-kirch-6a19fa (flight diag).

## 1. Are the tests safe?

- Natively-latency-W1/W2/W3 are Ready, with the right action, workdir and times.
- The scratchpad latency-task-check.mjs, run from MAIN with --env-file=.env, prints GUARDS_ALL_PASSED.
- The rule files are unchanged since 6f91929 and have no uncommitted edits.
- The probe still imports only node builtins.
- No Natively app process is running.
- No other Natively task has a next run inside a protected span.
- Power: AC wake timers are on and the PC never sleeps (true at 04:40).

## 2. Did anything regress?

Use clean worktrees only, never MAIN's working tree. The full suite can write by absolute path into golden files that carry the user's uncommitted edits (memory vitest-temp-cwd).

- **Set up a clean MAIN checkout:** `git -C <MAIN> worktree add --detach <MAIN>\.claude\worktrees\health-head <MAIN HEAD>`. Putting it inside MAIN's tree lets node resolution find MAIN's node_modules; confirm that it does.
- **Tests**, from a temp cwd: `node <MAIN>\node_modules\vitest\vitest.mjs run --root <wt> --config <wt>\vitest.config.ts`. Record the counts and the failing files.
- **Types:**
  - `tsc -p <wt>\electron\tsconfig.json --noEmit`; the baseline is the 6 errors listed in memory project_typecheck_gate.md, so compare the list itself, not just the count.
  - The renderer's `tsc -p <wt>\tsconfig.json --noEmit`; the baseline is 0.
- **Anything failing or new:** re-run only that file or check in a worktree at the pre-side-task baseline 6f91929. A failure present at both is pre-existing, not a regression.
- **Whole-turn branch:** repeat for feat/whole-turn-answers HEAD. That worktree is clean; run it from a temp cwd with --root <whole-turn>. Its baseline is 896f726.

## 3. Does it build?

- Run `node scripts/build-electron.js` with the cwd set to the health-head worktree. The cwd trap applies: 9f8eb33 is not on MAIN, so the cwd must be the checkout root.
- It must succeed, and its dist must contain a marker of each side-task change.

## 4. Does the live answer path work?

- Run `node --env-file=<MAIN>\.env <scratchpad>\live-answering-model.cjs <health-head>\dist-electron\electron health` with the real SDK.
- It covers a normal answer, a 503 falling back, and a stall switching model. It costs a handful of requests.
- Never run it inside a protected span, and never start the app.

## 5. Cleanup

- `git worktree remove` the health worktrees.
- Also remove my own leftover scratchpad worktree scratchpad\head-check (detached at 5386da9), after confirming it is clean.

## 6. Ping, then report to the user in plain words, then record in memory

The user said at 04:45: "ok, ping me when the health check is done". Send ONE PushNotification (status proactive, under 200 characters, leading with what they'd act on), for example "Health check done: no regressions, tests safe; 1 decision for you (uncommitted Gemma label fix)". The full report goes in the session.

- **Side tasks:** which finished.
- **Regressions:** none, or a list with evidence.
- **Tests' safety:** the checks, plus the risks outside my control.
  - A Google slowdown or outage is handled by the rule: the window is void or re-runs.
  - A PC that is off, logged out or on battery-and-asleep means that window re-runs the next day.
- **App health:** suite counts against the baseline, the type-check baselines, the build, and the live smoke.
- **Open decisions for the user:**
  - Any uncommitted change in MAIN's working tree gets baked into the next flight's build, because `auto` rebuilds from the working tree.
  - The build-cwd fix branch is not merged.

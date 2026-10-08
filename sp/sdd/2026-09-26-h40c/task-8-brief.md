# Plan: h40c — post-h40b fixes and the verbal hedge (2026-09-26)

**Goal.** Land, behind two default-off env flags, (a) the follow-up parent restore and (b) the verbal hedge (3.5-lite HIGH front, 3.1-lite LOW raced in at 5 s, first token wins, loser aborted); fix the two flight instruments (paraphrase attribution; blind pairs without the parent); validate the follow-up fix offline on scenario50 captured prompts under a pre-registered rule; prepare flight h40c (hedge ON, follow-up OFF) with a pre-registration, launcher, guard and a ready-but-unrun registration; verify no regressions; report.

**Architecture.** Electron main process, TypeScript under `electron/`. Verbal answers: `IntelligenceEngine.runWhatShouldISay` → `prepareTranscriptForWhatToAnswer` + `pinSettledQuestion` → `WhatToAnswerLLM.generateStream` (head `__model_source__` sentinel, filter chain, `nameStallSwitch`, `withVerbalFallback`) → `LLMHelper.streamGeminiWithStallFallback` → `streamWithGeminiModel(…, stop)`. Flight harness in `electron/test/golden/*.mjs` (judge, metrics, prompts capture, answers passes). Two new pure modules carry the flags: `electron/llm/followUpParent.ts`, `electron/llm/verbalHedge.ts`.

**Tech stack.** Node 20 / Electron 33, `@google/genai` 1.44, vitest 2.1.9 (fake timers), esbuild transpile build (`scripts/build-electron.js`), PowerShell 5.1 launchers via Windows Task Scheduler, Opus grading agents with the frozen `interview60.grader-prompt.md`.

**Spec.** `docs/superpowers/specs/2026-09-24-verbal-hedge-proposal.md` (policy = `electron/test/golden/hedge-live.policy.mjs` `runHedge`, probed PROCEED in `passes/2026-09-25-hedge-probe-result.md`); the h40b findings in `passes/2026-09-26-h40b-result.md`; the brief `SP\sdd\plan-h40c-brief.md`.

**Paths.** `MAIN = C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant` (branch `fix/coding-style-suffix-all-gemini`, HEAD 07a0e5e). `SP = C:\Users\sotka\AppData\Local\Temp\claude\C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant--claude-worktrees-nifty-lederberg-49681a\9c5886c7-cdbd-48af-b8bc-e9275012ec64\scratchpad`. In PowerShell resolve MAIN as `$repo = (Resolve-Path (Join-Path $env:USERPROFILE 'OneDrive\Masa*\natively-cluely-ai-assistant') | Where-Object { Test-Path (Join-Path $_.Path '.git') } | Select-Object -First 1).Path`.

## Global constraints (every task)

- Rule-8 calibration for every check that decides something: run it on a known case, and prove it can fail (break the code, watch the test fail).
- TDD: failing test first, watched failing, for every code change.
- Tests: run MAIN's vitest from a temp cwd with `--root <MAIN>` (cwd-relative writes must not land in MAIN); timed-out tests can corrupt the next (serial queue exists, a63dc09). No `npx`; from PowerShell use `cmd /c "npm run ..."`. Two type-check gates: root `tsc` and `tsc -p electron/tsconfig.json`. The latter has 6 pre-existing errors (record them in Task 0; require "no NEW errors"): `electron/audio/GeminiLiveRouter.ts(125,44) TS2339 'length' on never`; `electron/ipcHandlers.ts(~3433,18) TS2339 'canceled' on string[]`; `electron/ipcHandlers.ts(~3433,38) TS2339 'filePaths'`; `electron/ipcHandlers.ts(~3436,31) TS2339 'filePaths'`; `electron/knowledge/KnowledgeOrchestrator.ts(349,35) TS2322 CompanyDossier→null`; `electron/knowledge/KnowledgeOrchestrator.ts(351,25) TS2322`. Compare by file+code+message, not line numbers (scratchpad `hc-tsc.mjs` shows the normalisation). Build: `cmd /c "npm run build:electron -- --force"` from MAIN; verify a marker per change in `dist-electron` with a timestamp (builds capture concurrent edits: check ListAgents and `.ts` mtimes before and after the build).
- Never start the Electron app from a Claude session (it reads a shadow credentials store); a live app exercise goes through a Windows scheduled task (`SP\register-natively-task.ps1` shape; the h40b task's settings: 5 h limit, AllowStartIfOnBatteries, DontStopIfGoingOnBatteries, WakeToRun) or is handed to the user. Stop the app only via `node electron/test/golden/interview60.run.mjs app:stop`.
- Keys live in `.env`/shell only; never print, read or copy key values; never read or edit `credentials.enc`.
- Commits are made by the CONTROLLER only, via `SP\commit-main-paths.ps1` (private index + compare-and-swap); implementers never run `git commit/add/stash`. Read-only `git -C <MAIN> status --porcelain` / `git diff` are allowed. Never stage the user's uncommitted files: `natively_debug.log.1`, `electron/test/golden/interview60.chains.json`, `electron/test/golden/interview60.report.md`, `resume_prompt.txt`, `retry_claude_print.bat`, `electron/test/golden/openrouter-probes/`, `openrouter.probe.mjs`, `zai-probes/`, `zai.probe.mjs`. Never `git stash`, `git add -A/-u`, push. New repo files are written with LF line endings (the commit script refuses CR).
- Committed pass records are never hand-edited or regenerated for old runs; the attribution fix is proven on COPIES of the h40a/h40b run folders in the scratchpad.
- holdout40 is NEVER used to tune or validate the follow-up fix.
- Gemini quota: lite models 500 requests/model/day, reset 10:00 local (07:00 UTC). Every live call is budgeted below; the replay must fit ~120 requests on 3.1-lite; if the ledger says it does not fit, the task says so and schedules after 10:00 tomorrow. Full Flash models (20/day) are not used.
- Throwaway scripts live in the scratchpad; `.cmd`/`.ps1` files are ASCII-only; paths contain the non-ASCII "Masaüstü" (PowerShell: resolve MAIN with the `.git`-filtered `Masa*` wildcard; use `-LiteralPath`).
- Surgical changes; no refactors; match existing style (comments explain the measured reason, as the neighbours do).
- Flags default OFF: `NATIVELY_FOLLOWUP_PARENT` and `NATIVELY_VERBAL_HEDGE`. Accepted values: `1` = on; unset/empty/`0` = off; anything else throws at the call (a typo must not fly silently OFF). h40c flies hedge ON, follow-up OFF.

**Standard commands** (PowerShell; `$SP`, `$repo` as above):

```powershell
# one test file (from a temp cwd)
New-Item -ItemType Directory -Force "$SP\vitest-cwd" | Out-Null; Push-Location "$SP\vitest-cwd"
& node "$repo\node_modules\vitest\vitest.mjs" run --root "$repo" --config "$repo\vitest.config.ts" electron/llm/followUpParent.test.ts
Pop-Location
# full suite (same cwd; record the counts line "Tests  N passed | M skipped (T)")
# tsc gates (absolute -p; no cwd dependence)
& node "$repo\node_modules\typescript\bin\tsc" -p "$repo\tsconfig.json" --noEmit --pretty false
& node "$repo\node_modules\typescript\bin\tsc" -p "$repo\electron\tsconfig.json" --noEmit --pretty false
# build
Push-Location $repo; cmd /c "npm run build:electron -- --force"; Pop-Location
```

Task dependency map: T0 → {T1 → T2}, T3, T4 are independent of each other (T1, T3, T4 touch disjoint files; T2 needs T1's export). T5 after T1–T4. T6 needs T3 + T5's build. T7 needs T4 + T5's build. T8 needs T4 (guard markers); its pre-registration text can be drafted any time. T9 last.

---


---

## Task 8 — Prepare flight h40c (pre-registration, launcher, guard; registration ready, NOT run)

**Files:** `MAIN\electron\test\golden\passes\PREREGISTER-h40c.md` (controller commits before the hour), `SP\launch-h40c.cmd`, `SP\guard-h40c.mjs`, `SP\register-h40c.ps1`, `SP\h40c-hedge-stats.mjs`.

- [ ] **PREREGISTER-h40c.md** (draft; the controller fixes wording before committing, never after the hour):

> # Pre-registration: flight h40c (holdout40, third flight) — hedge ON
> Written and committed before the hour. Not edited afterwards; the result goes in `h40c.md`.
> **What the hour tests.** One change against h40b (2026-09-26, `07a0e5e` + this branch's hedge commit): `NATIVELY_VERBAL_HEDGE=1` — the spoken answer's model policy is the hedge (gemini-3.5-flash-lite HIGH first; gemini-3.1-flash-lite LOW started beside it after 5 s without a first token or on a pre-token failure; the first token wins, the other request aborted), replacing today's race (3.1-lite LOW first; 3.5-lite HIGH after a 503 or a 10 s stall). Basis: the proposal of 2026-09-24 and the live probe of 2026-09-25 (PROCEED: pooled median 4.4 vs 6.1 s, p90 11.5 vs 13.3 s, none 0 vs 0, 95 of 117 answers from 3.5-lite). Everything else is h40b's: roster holdout40 (45 items), audio, Deepgram + Live ears, grader rubric (stamp 8564ba96369a), LOW shipped; `NATIVELY_FOLLOWUP_PARENT` unset (that fix is validated offline and flown on another roster). The launcher's guard proves the build and the source carry the hedge, that the flag reaches the app, that the follow-up flag does not, and that no model or thinking override is set.
> **Instrument.** The interview60 flight harness hands-free from `holdout40.wav`, task `Natively-flight-h40c`, the standard arms and the judge (Opus agents, grader model recorded), plus `h40c-hedge-stats.mjs` over the run folder's own logs: per answer the hedge lines (front/back start/winner), the `[Main] answer source:` label, the diag `first token` times.
> **The rule.** The hour PASSES only if all hold:
> 1. **The hedge was in effect:** ≥ 95 % of in-app answer dispatches have a `verbal hedge: won by` line, and ≥ 50 % of in-app answers were written by gemini-3.5-flash-lite (below that the hour did not exercise the hedge as designed — VOID, re-fly another day; a 3.5-lite outage is not a hedge failure).
> 2. **Latency, the probe's own rule against h40b:** in-app first-token median ≤ h40b's 5.0 s + 1.0 s; in-app first-token p90 ≤ h40b's 13.6 s; answer failures (no answer delivered for a dispatched answer) ≤ h40b's 0. The gate's own 10 s p90 row is reported, not gated (it failed on h40b on the stall path alone).
> 3. **Quality no-regression:** in-app acceptable ≥ 35 of 45 (h40b's count, the registered floor); zero wrong among the live in-app answers on the 40 items that are not R02F R04F R09F R11F R13F — those five follow-ups arrive without their parent on every hour of this roster (diagnosed: 120 s eviction), their fix flies OFF here, and their grades are reported beside the rule, not inside it. The twin-band reading (leg 2 of h40b) is reported.
> **What a FAIL means.** (2) fails while (1) holds: the hedge is not faster in the app; it does not ship, and the answer-mix quality is read for the record. (3) fails while (1) and (2) hold: the mix hurt quality; understand item by item before another flight; never tune on holdout40. (1) VOID: re-fly.
> **Not covered.** The Live ear's share (17/44 on h40a, 4/44 on h40b) is a confound, reported; one hour decides nothing finer than its noise (bare arms moved up to 5 of 33 between h40a and h40b); daytime load was never probed for the hedge; whether 3.5-lite's larger share helps or hurts quality is what leg 3 measures and only on this roster; R05-type STT losses are not the hedge's.

- [ ] `launch-h40c.cmd`: `launch-h40b.cmd` with the header comment rewritten for h40c, `set NATIVELY_VERBAL_HEDGE=1`, `set NATIVELY_VERBAL_HEDGE_TRIGGER_MS=`, `set NATIVELY_FOLLOWUP_PARENT=`, the guard `guard-h40c.mjs`, log `flight-h40c.launcher.log`, label `h40c`, error log `%TEMP%\natively-h40c-launcher-error.log`.
- [ ] `guard-h40c.mjs` = `guard-h40b.mjs` checks 1–5 (roster, built default/fallback, no override, levels, R09 fix in dist and source) plus:
  6. `V2 = require(dist/electron/llm/verbalHedge.js)`: `V2.verbalHedgeEnabled() === true` under this env (fail: "NATIVELY_VERBAL_HEDGE did not arrive"), `V2.verbalHedgeTriggerMs() === 5000` (fail if an override is set);
  7. `F = require(dist/electron/llm/followUpParent.js)`: `F.followUpParentEnabled() === false` (fail: "the follow-up flag is set; h40c flies it OFF");
  8. the hedge in build AND source: `dist/electron/LLMHelper.js` contains `verbal hedge: front=` and `electron/LLMHelper.ts` contains `streamGeminiWithHedge`; `dist/electron/llm/WhatToAnswerLLM.js` contains `(hedge)`;
  9. dist `LLMHelper.js` mtime ≥ source `LLMHelper.ts` mtime (a stale dist would fly without the hedge; the flight rebuilds anyway).
  Final line: `GUARD OK: … hedge ON (front gemini-3.5-flash-lite HIGH, back gemini-3.1-flash-lite LOW at 5000ms), follow-up parent OFF, R09 fix in the build`. Calibrate from MAIN's root with the launcher's env set by hand in a cmd session (no app start): run with `NATIVELY_VERBAL_HEDGE` unset → check 6 fails; with `NATIVELY_FOLLOWUP_PARENT=1` → check 7 fails; with `NATIVELY_VERBAL_HEDGE_TRIGGER_MS=1` → check 6 fails; with `NATIVELY_VERBAL_PRIMARY_MODEL=gemini-3.5-flash-lite` → check 3 fails; correct env → GUARD OK. Save `SP\guard-h40c-cal.txt`.
- [ ] `h40c-hedge-stats.mjs <run-dir>`: over `logSince` windows of the run's timeline: answer dispatches, hedge lines per dispatch, back-start rate and reasons, winner split by model, `other=` counts, answer-source labels, first-token median/p90 from the diag `first token` lines, answer failures (`[WhatToAnswerLLM] Stream failed`), and the rule's three numbers against h40b (5.0 s, 13.6 s, 0). Calibrate on the smoke's run folder copy (must show hedge lines) and on the h40b copy (must print "hedge not in effect: 0 of N").
- [ ] `register-h40c.ps1` (ready, NOT run): the register script with `-TaskName 'Natively-flight-h40c' -Launcher "$SP\launch-h40c.cmd" -Hours 5` and the settings `-AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -WakeToRun -StartWhenAvailable`, `-StartAt` left for the user's time. Put the exact one-line invocation in the report. A dry run of the launcher (`interview60.flight.mjs h40c --dry-run` variant, as `launch-h40b-dry.cmd` did) may be registered by the controller to prove the plumbing; the real one waits for the user.
- [ ] Quota note for the flight day (from `interview60.flight.mjs` PAIRED_ARMS): 3.5-lite ≈ 45 in-app fronts + captured-high ×3 (132) + high (33) + bare (33) ≈ 245; 3.1-lite ≈ back legs (probe: ~30 %) + low, captured-minimal, captured-low ×3, bare ≈ 210 + chains. Both under 500 on a fresh quota day; the replay (60) must not share the flight's day on 3.1-lite unless the ledger allows.

---

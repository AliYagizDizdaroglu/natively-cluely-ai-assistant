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

## Task 7 — One live exercise of the hedge across the real seams (after Task 4 + Task 5 build; scheduled task; ~16 lite requests)

**Files (scratchpad, ASCII-only):** `SP\launch-smoke-hedge.cmd`, `SP\check-smoke-hedge.mjs`, `SP\register-smoke-hedge.ps1` (a copy of `register-natively-task.ps1` with the h40b task settings).

- [ ] `launch-smoke-hedge.cmd`, modelled on `launch-smoke-stall.cmd` (same cwd/roster/error-log shape; `findstr /C:"streamGeminiWithHedge" "electron\LLMHelper.ts"` guard, exit 7 if absent):
```
set NATIVELY_STT_PROVIDER=deepgram
set NATIVELY_ROSTER=scenario50
set NATIVELY_SCENARIOS=S1,S2
set NATIVELY_FOLLOWUP_PARENT=
set NATIVELY_VERBAL_HEDGE=1
rem SMOKE 1: forced race - the back leg starts 1 ms after the front on every answer
set NATIVELY_VERBAL_HEDGE_TRIGGER_MS=1
node "%~dp0smoke-turn.mjs" S1Q06 S2Q10 S2Q07 >> electron\test\golden\interview60.runs\smoke-hedge-forced.log 2>&1
set NATIVELY_VERBAL_HEDGE_TRIGGER_MS=
rem SMOKE 2: the flight's trigger (5 s) - the front answers alone unless it stalls
node "%~dp0smoke-turn.mjs" S1Q06 S2Q10 S2Q07 >> electron\test\golden\interview60.runs\smoke-hedge-default.log 2>&1
rem SMOKE 3 (control): flag unset - today's race, no hedge line
set NATIVELY_VERBAL_HEDGE=
node "%~dp0smoke-turn.mjs" S1Q06 >> electron\test\golden\interview60.runs\smoke-hedge-off.log 2>&1
```
  (`smoke-turn.mjs` stops, rebuilds and starts the app itself, plays each clip, reads the debug log back, and the app is stopped by `app:stop` at its end — confirm by reading its tail; if it does not stop the app, append `node electron\test\golden\interview60.run.mjs app:stop`.)
- [ ] `check-smoke-hedge.mjs <since-iso> <mode: forced|default|off>` reads `$repo\natively_debug.log` and `verbal-diag.log` after the instant: per `[Main] dispatch: answer` line, the hedge lines that follow within 60 s, the `[Main] answer source:` line, the `first token <ms>ms` diag line, and `[LLMHelper] <model> usage:` requests. Rules: **forced** — every answer has `back started at ≤ 100ms reason=trigger`, a `won by <model>` line, `other=aborted|failed`, the answer-source label equals `<winner> (hedge)`, and the loser logged NO usage line (an aborted request never reaches its last chunk); **default** — every answer has the `front=` line and a `won by` line; the label is `<winner> (hedge)`; report the back-leg count (0 expected on a healthy evening; a real stall is reported, not failed); **off** — no `verbal hedge` line and a `verbal stall race: trying gemini-3.1-flash-lite` line per answer. Also: no `UnhandledPromiseRejection`/`unhandledRejection` text in the window. Prints PASS/FAIL per rule. Calibrate: run `off` mode against h40b's copied log window (must PASS, it flew without the hedge) and `forced` mode against the same (must FAIL: no hedge lines).
- [ ] Register the task (controller): `powershell -NoProfile -ExecutionPolicy Bypass -File "$SP\register-smoke-hedge.ps1" -TaskName 'Natively-smoke-hedge' -Launcher "$SP\launch-smoke-hedge.cmd" -StartAt <now+3 min> -Hours 1` — the ps1 is `register-natively-task.ps1` with `$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Hours $Hours) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -WakeToRun`. Quota: ~6 + 3 + 1 answers plus ~6 warm-ups, split across the two lites — check the ledger first; the app's own warm-ups count.
- [ ] After it ends (task state, `smoke-hedge-*.log` tails showing `SMOKE EXIT 0`), run the three checks with the launcher's start instant; save outputs to `SP\smoke-hedge-checks.txt`. Any FAIL → do not proceed to h40c; report.
- [ ] What this reaches: env flag → the real app process → the real SDK → two live requests → first-token race → loser abort (no usage line) → the winner's `(hedge)` label at the main-process seam. What it does NOT reach: a stalling 3.5-lite at the 5 s trigger (H2-like load), an hour's quota/load, the renderer's bar text, a supersede mid-race, the Live-ear dispatch path's timing.

---

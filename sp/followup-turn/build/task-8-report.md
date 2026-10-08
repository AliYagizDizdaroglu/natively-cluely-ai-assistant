# Task 8 report — whole-branch gates (WT eq-build, branch build/earlier-question, HEAD 7fb3d04, no new commit)

Status: DONE. No code changed, no commit. Task 7b's review had not reported a change when this ran.

## Gates (MAIN's vitest and tsc, as the plan says)

1. Full suite, cwd = WT, `--root WT`, no EQ env vars (output: `build\full-suite.txt`), exit 0:
   `Test Files  109 passed | 1 skipped (110)` / `Tests  1191 passed | 9 skipped (1200)` / `Duration  39.96s`. 0 failed.
   - The prompts test did not fail: `dist-electron` already existed in WT (built by Task 7b). It was removed in Step 4.
   - The 9 skipped: `earlierQuestion.parity.test.ts` (1, whole file, no env var by design), `interview60.pass-record.test.ts` (4), `interview60.metrics.test.ts` (2), `interview60.turns-finals.test.ts` (2) — all pre-existing skips except the parity file, which skips without its fixtures.
   - The two tracked files the suite may rewrite were restored with `git checkout --` after the run (status was clean before and after).
2. Parity on the final tree, cwd SP\eq-tmp, `NATIVELY_EQ_PARITY_DIR=F\R`, `NATIVELY_EQ_RUNS_DIR=MAIN\...\interview60.runs`, exit 0 (`build\task-8-parity.txt`):
   `✓ electron/llm/earlierQuestion.parity.test.ts (7 tests)` / `Test Files  1 passed (1)` / `Tests  7 passed (7)`. 0 skipped.
   Task 7b fixture half, `NATIVELY_EQ_PARITY_DIR` set, exit 0 (`build\task-8-arm.txt`):
   `✓ electron/test/golden/earlierQuestionArm.test.ts (6 tests)` / `Test Files  1 passed (1)` / `Tests  6 passed (6)`. 0 skipped.
   (Both env vars were cleared afterwards. The `NativeCommandError` text at the top of `task-8-parity.txt` is PowerShell's stderr wrapper around vitest's normal stderr; the run's exit code is 0.)
3. Type checks, MAIN's compiler (`build\task-8-tsc-root.txt`, `task-8-tsc-electron-full.txt`, `task-8-tsc-electron.txt`):
   - root `tsc --noEmit -p WT\tsconfig.json`: exit 0, 0 `error TS` lines.
   - electron `tsc --noEmit -p WT\electron\tsconfig.json`: exit 2 (as at baseline), 6 `error TS` lines; `Compare-Object` against `build\tsc-electron-baseline.txt` printed nothing (identical six: GeminiLiveRouter.ts(125,44), ipcHandlers.ts(3436,18), (3436,38), (3439,31), KnowledgeOrchestrator.ts(349,35), (351,25)). None in a file this plan touches.
4. Clean: `node_modules` attributes `Directory` (not a ReparsePoint). Removed only `node_modules\.vite` and `dist-electron`; `git status --porcelain --ignored` printed nothing. (An empty `node_modules` directory remains; git does not track or list it.) HEAD 7fb3d04.
5. `plan\STATES.md` written (kept in SP, not committed, per the plan). Contains the ruling-n5 statement (the `--no-block` accept path is unexercised in unit tests; covered only by one live `--no-block --limit 1` call on the smoke capture before arming), m3 (`chars` = built, not inserted, under coding/screenshot framing; `main.ts:2191` sets screenshot calls to `coding`), the two `gate=error` shapes, no turn id on manual/chip/answer-now by design, no diag line on the cooldown and keyless-fallback returns, the reader-prefix rule, and every branch of the change with its test or live step.

## Not shown / concerns

- The `main.ts` forwards (3 `turnDispatchInput` call sites, the `runWhatShouldISay` `turnId` spread) and the startup refusal `try/catch` are unit-untested; Task 9 and Task 10 prove them.
- `--no-block` accept path: live only (n5).
- The full suite ran with the parity fixtures absent from env, so its parity file skipped; Step 2 is where the 7/7 comes from.
- The built `dist-electron` in WT is gone; the final Opus review needs no dist. Task 9 builds in MAIN.
- Plan Step 1's tee command was replaced with a redirect to the same file (the pipeline's `Select-Object -Last 15` summary was read from the file tail); same evidence file.

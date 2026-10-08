# Implementer contract (every task of the h40c plan)

- Your brief (task-N-brief.md) is your requirements: follow its steps in order, with its exact values.
  Its "Global constraints" section binds you. Where the brief says "the controller", that is not you.
- TDD: write the failing test, RUN it and record the failure text, then implement, then run green.
  Do the rule-8 calibration step the brief names (break → watch fail → restore) and record it.
- Files: MAIN = `C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant`. Edit MAIN files with
  Edit/Write. If a tool refuses a MAIN path, write the full file under
  `<SP>\stage\<repo-relative path>` and copy it with PowerShell:
  `[IO.File]::WriteAllText($dst, $text.Replace("`r`n","`n"), (New-Object System.Text.UTF8Encoding($false)))`.
  Every repo file you write must end up LF-only, UTF-8 without BOM.
- Git: read-only only (`git -C <MAIN> status --porcelain`, `git -C <MAIN> diff -- <your files>`), run from
  the PowerShell tool. The Bash tool refuses `cd <MAIN> && git …`. NEVER git add/commit/stash/checkout/reset.
- Other implementers are editing OTHER files in MAIN at the same time. Touch only the files your brief
  lists. Run only your own test files (per-file vitest runs, as the brief's "Standard commands"); do NOT run
  the full suite, do NOT build (`build:electron`) — the controller does both later.
- No `npx`. From PowerShell use `& node "<MAIN>\node_modules\vitest\vitest.mjs" run --root "<MAIN>" --config
  "<MAIN>\vitest.config.ts" <file>` from the temp cwd `<SP>\vitest-cwd-<task>` (create it; one per task so
  concurrent runs do not share it).
- Never start the Electron app; never call a model API; never read/print key values or credentials.enc.
- No subagents. Do not dispatch reviewers; review comes from the controller.
- When a Bash command is refused by the harness for being "too complex to verify", put the logic in a
  .mjs file in the scratchpad and run it with a plain `node <absolute path>`.
- Report: write the FULL report to `<SP>\sdd\2026-09-26-h40c\task-N-report.md`: files changed (paths),
  each failing-test run's failure text, each green run's summary line ("Tests N passed"), the calibration
  evidence, deviations from the brief with reasons, open concerns. Then reply with ONLY: status
  (DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED), files changed, a one-line test summary, concerns.

SP = `C:\Users\sotka\AppData\Local\Temp\claude\C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant--claude-worktrees-nifty-lederberg-49681a\9c5886c7-cdbd-48af-b8bc-e9275012ec64\scratchpad`

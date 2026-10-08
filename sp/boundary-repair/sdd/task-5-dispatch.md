You are implementing Task 5 of a small delta plan in the Natively Electron app. The turns-fixture extractor (a golden test-harness module) must keep replaying what the app's turn machine actually saw. Since the Deepgram "boundary repair" landed, the app passes the REPAIRED text into the turn, and logs the raw final plus a `boundary repair: restored "<w>" before "<…>"` line on the very next line. So a final followed by that line must replay as `<restored> <raw>`. Tasks 3-4 (the module and the adapter) are done in MAIN's working tree; nothing is committed yet.

**Read this first: it is your requirements, with the exact values to use verbatim.**
`C:\Users\sotka\AppData\Local\Temp\claude\C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant--claude-worktrees-nifty-lederberg-49681a\9c5886c7-cdbd-48af-b8bc-e9275012ec64\scratchpad\boundary-repair\sdd\task-5-brief.md`
It starts with the plan's Paths and Global Constraints, which bind you, followed by Task 5's steps with the exact code. The spec is `DESIGN-v4.md` in the same `boundary-repair\` folder.

## What the brief cannot know
- **MAIN's HEAD is now f745d7e**, the hedge-default commit, not the brief's e78f7c7. It touches no file in this plan. Confirm only the branch, by reading `MAIN\.git\HEAD`. Run no git command.
- **Other uncommitted work in MAIN:** Tasks 1-4's `electron/audio/*` files, and the user's `electron/test/golden/interview60.chains.json` and `interview60.report.md`. Leave all of them exactly as they are.
- **The stage `BR\stage\`** was seeded from MAIN before Task 3. Before editing `electron/test/golden/interview60.turns-fixture.mjs`, check that its staged copy is byte-identical to MAIN's current file and that MAIN's file is still 5,485 bytes.
  - If the staged copy differs, re-seed that one file with `node BR\seed-stage.mjs electron/test/golden/interview60.turns-fixture.mjs` before any edit.
  - If MAIN's size differs, STOP and report.
- The new test resolves its paths with `__dirname`, which the brief already does. vitest workers keep the caller's cwd, which is a temp folder under the mandated command, so never `process.cwd()`.

## Rules
- The Write/Edit tools refuse MAIN paths. Stage under `BR\stage\`, then copy with `node <SP>\copy-into-main.mjs <staged> <MAIN-relative path> [--overwrite]`.
- LF only.
- No git at all. Never read `.env` or keys. Do not dispatch subagents.
- No `node -e`, no `bash <script>`: the session guard refuses them. Write scripts as files under `BR\` and run `node <file>`.
- Tests use the brief's PowerShell `TEST <file>` form, from a temp cwd. Never the full suite.
- Quote each RED and GREEN count exactly as vitest prints it.
- Type-check both projects as the Global Constraints say.

## Report
Write your full report to `<BR>\sdd\task-5-report.md`. If that write is refused, put the full report in your reply instead. Cover:
- every RED/GREEN with counts and the failing test names;
- the end-to-end extractor run on s50a, deep-equal to the committed fixture;
- tsc results;
- final bytes + sha256 of each changed or new MAIN file;
- any deviation.

Then reply briefly: status (DONE / DONE_WITH_CONCERNS / BLOCKED / NEEDS_CONTEXT), a one-line test summary, and your concerns.

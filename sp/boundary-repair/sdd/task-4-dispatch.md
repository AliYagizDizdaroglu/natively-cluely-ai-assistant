You are implementing Task 4 of a small delta plan in the Natively Electron app. It wires rule v4 of the "Deepgram boundary repair" into the Deepgram streaming adapter. The adapter creates the repair only on English connections, clears it on pauses, and passes Deepgram's speech_final. Task 3, the v4 module, is done and reviewed in MAIN's working tree; Tasks 1-2 (v3) were before it. Nothing is committed yet: the controller commits all tasks together after the final review.

**Read this first: it is your requirements, with the exact values to use verbatim.**
`C:\Users\sotka\AppData\Local\Temp\claude\C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant--claude-worktrees-nifty-lederberg-49681a\9c5886c7-cdbd-48af-b8bc-e9275012ec64\scratchpad\boundary-repair\sdd\task-4-brief.md`
It starts with the plan's Paths and Global Constraints, which bind you, followed by Task 4's steps with the exact code. The spec is `DESIGN-v4.md` in the same `boundary-repair\` folder.

## What earlier tasks give you (the brief cannot know these)
- **The module in MAIN**, `electron/audio/deepgramBoundaryRepair.ts` (10,743 B, sha256 d5ba4da0…), exports:
  `createBoundaryRepair(): BoundaryRepair`, with `onTranscript(text: string, isFinal: boolean, atMs: number, speechFinal?: boolean): { text: string; restored: string[] | null }` and `clear(): void`.
  - Its test file has 68 tests: 58 old + 10 v4. The "v2" digit pin and the decomposed-accent pin sit INSIDE existing tests. Every "deepgramBoundaryRepair 68" in the brief is right.
- **MAIN's HEAD is now f745d7e**, not the brief's e78f7c7. It is the hedge-default commit, which touches no file in this plan.
  - Confirm only the branch, by reading the plain file `MAIN\.git\HEAD`, as the brief says. Run no git command.
- **Other uncommitted work in MAIN:**
  - Task 3's two files are yours to leave exactly as they are.
  - Leave the user's `electron/test/golden/interview60.chains.json` and `interview60.report.md` alone.
- **The stage `BR\stage\`** was seeded from MAIN before Task 3. Before editing each of your files, check that its staged copy is byte-identical to MAIN's current file (size + sha256), and compare with the brief's starting sizes:
  - `DeepgramStreamingSTT.ts` 14,831;
  - `DeepgramStreamingSTT.boundaryRepair.test.ts` 5,096;
  - `deepgramKeyterms.ts` 5,404;
  - `deepgramKeyterms.test.ts` 2,846.
  - If a staged copy differs from MAIN, re-seed that one file with `node BR\seed-stage.mjs <MAIN-relative path>` BEFORE any edit.
  - If MAIN's file differs from the brief's size, STOP and report.
- **Step 6's temporary gate removal:** follow the brief's CORRECTED revert. Re-apply edit 4(b)'s text on the staged copy and copy it in. NEVER re-run seed-stage after a temporary change reached MAIN.

## Rules
- The Write/Edit tools refuse MAIN paths. Stage under `BR\stage\`, then copy with `node <SP>\copy-into-main.mjs <staged> <MAIN-relative path> [--overwrite]`.
- LF only.
- No git at all. Never read `.env` or keys. Do not dispatch subagents.
- No `node -e`, no `bash <script>`: the session guard refuses them. Write scripts as files under `BR\` and run `node <file>`.
- **Tests** use the brief's PowerShell `TEST <file>` form, from a temp cwd. Never the full suite.
- Quote each RED and GREEN count exactly as vitest prints it.
- Type-check both projects as the Global Constraints say.

## Report
Write your full report to `<BR>\sdd\task-4-report.md`. If that write is refused, put the full report in your reply instead. Cover:
- every RED/GREEN with counts and the failing test names;
- the Step 6 gate calibration (1 failed / 5 passed, then 6 passed);
- the `electron/audio/` neighbours run;
- tsc results;
- final bytes + sha256 of each changed MAIN file;
- any deviation.

Then reply briefly: status (DONE / DONE_WITH_CONCERNS / BLOCKED / NEEDS_CONTEXT), a one-line test summary, and your concerns.

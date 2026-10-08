# Common brief for every h40d instrument builder (read this first, then your own brief)

## Paths
- SP   = `C:\Users\sotka\AppData\Local\Temp\claude\C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant--claude-worktrees-nifty-lederberg-49681a\9c5886c7-cdbd-48af-b8bc-e9275012ec64\scratchpad`
- VH   = `SP\validation-hour`; your outputs go in `VH` (instrument files) and `VH\instruments\` (your report, scratch).
- MAIN = `C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant` (branch `fix/coding-style-suffix-all-gemini`; the app checkout that flies Friday)
- WT   = `MAIN\.claude\worktrees\whole-turn` (branch `feat/whole-turn-answers`, the cue-mode code; MAIN becomes equal to it after today's merge)

## What you are building for
Flight h40d, Friday 2026-10-02 13:30 local: cue mode's validation hour on the holdout40 roster, flown on MAIN after
cue mode is merged into MAIN today. **The spec is `VH\PREREGISTER-h40d.r4.md`** (revision 4, the one of record).
Read its §2 (the run), §7 (the blocking checklist: your instrument's bullet is in §7.4 or §7.6, quoted in your
brief) and every rule your instrument computes. Where your brief and r4 differ, r4 wins: say so in your report.
The predecessor flight h40c (2026-09-29) has a working instrument for almost everything here (`SP\guard-h40c.mjs`,
`SP\launch-h40c.cmd`, `SP\h40c-rule3.mjs`, …): start from it, change only what r4 asks, and keep its style.

## Rules (binding)
- **No** vitest, tsc, build or npm. **No** API or model call. **Never start the app** (no `app:start`, `npm start`,
  electron, `interview60.run.mjs` subcommands that start it). **Never register, run, change or delete a scheduled
  task.** A background live measurement may be running: only node scripts that read files, and PowerShell reads.
- **Write only new files** in `VH` (the instrument names your brief gives) and `VH\instruments\`. Do not edit any
  existing file in SP or VH, and nothing in MAIN or WT. No git write of any kind (reads like `git -C <dir> log`,
  `rev-parse`, `status` are fine; run them through PowerShell `git -C`, never `cd` into MAIN from Bash).
- **Never** read, print or copy `.env`, an API key or `credentials.enc`. Names only (`Test-Path`).
- Captured prompts (`interview60.prompts.json`, `verbal-prompts.log`) and answer / verdict / row JSON files carry the
  user's personal profile: never print their text. Print ids, counts, lengths, hashes, model ids and verdict numbers.
- Do NOT dispatch subagents.
- Windows quirks: no `node -e` (write a script file); the path `Masaüstü` is non-ASCII: in node use
  `readdirSync`/`copyFileSync` (never `fs.cpSync`); a `.cmd` file is ASCII with CRLF line ends, written by a node
  generator from a source text and checked byte by byte (never edited with sed); a `.ps1` that holds a non-ASCII
  path is saved with a UTF-8 BOM, or builds the path at run time without a non-ASCII literal.
- **Every instrument is calibrated (rule 8):** run it on the known cases your brief lists, including at least one
  that must FAIL, and save the outputs beside the instrument (`<name>-cal.txt` or as your brief says). A check that
  cannot fail proves nothing. If a known case does not read as expected, find out why before changing anything;
  never adjust a known case's expected answer to match the output.

## Report
Write `VH\instruments\report-<your letter>.md`: the files you created; for each instrument the exact calibration
commands and their key output lines; anything in r4 you could not implement as written, and why; residual risks.
Then reply with ONLY: status (DONE / DONE_WITH_CONCERNS / BLOCKED), the files, one line per calibration
(case → reading), and your concerns.

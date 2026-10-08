# Brief: Opus review of Friday's flight instruments (h40d), built today by four Sonnet implementers

VH = `C:\Users\sotka\AppData\Local\Temp\claude\C--Users-sotka-OneDrive-Masa-st--natively-cluely-ai-assistant--claude-worktrees-nifty-lederberg-49681a\9c5886c7-cdbd-48af-b8bc-e9275012ec64\scratchpad\validation-hour`
SP = its parent folder. MAIN = `C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant`. WT = `MAIN\.claude\worktrees\whole-turn`.

## What you are reviewing
Flight h40d (Fri 2026-10-02 13:30, cue mode's validation hour on holdout40, flown on MAIN after today's cue
merge) is governed by `VH\PREREGISTER-h40d.r4.md` (revision 4, the one of record). Its §7.4 and §7.6 specify the
instruments and their known cases. Four builders each had a brief (`VH\instruments\brief-A-guard.md`, `brief-B-twins.md`,
`brief-C-quality.md`, `brief-D-launch.md`, all under `COMMON.md`) and wrote reports (`report-A.md` … `report-D.md`;
report-C was saved from the builder's reply). You review the INSTRUMENTS AGAINST r4, not against the reports.

## Check, per instrument
1. **Does it compute what r4 says, with r4's exact definitions?** Read the rule text and the instrument's code side by
   side: counting rules (acceptable, wrong, consensus, holes, empty prose kinds incl. the no-text record), percentiles
   (`min(n-1, floor(n·p))`), the gated id set, the margin-of-one default and the strict alternative, the cue checks
   (`blockShape`, 90% net of true holes), 2c's threshold and fallback, rule 1(g) and check 13, the guard's 13 checks,
   the launcher's env block (every variable of r4 §2 cleared; `NATIVELY_VERBAL_HEDGE` unset), the dist-proof calls,
   the merge script's `--model` on every merge, the dispatch text's ten tags.
2. **Can each one FAIL, and was that shown?** Re-run every calibration the reports name (node scripts that read
   files only) and compare with the saved `-cal.txt` outputs. A calibration whose expected answer was adjusted to
   match the output is a finding. A known case that reads "as expected" only because the instrument is lenient is a
   finding.
3. **The deviations the builders declared** (each report's "Where this differs"): is each a sound reading of r4, or
   a change r4 must be amended for (by the controller, before arming, dated)? Say which.
4. **The seams nobody built:** list what r4 §7 requires that no builder delivered (e.g. report C's "per-item winner
   join"), and what cannot be verified until after the merge or the prestart (say exactly which command re-runs it).
5. **Safety of the launchers and the prestart** (`launch-h40d.cmd`, `launch-h40d-dry.cmd`, `launch-h40d-prestart.cmd`,
   `register-h40d.ps1`, `h40d-precheck.ps1`, `h40d-merge.cmd`): read them line by line. A wrong path, a missing
   `exit`, a guard that cannot refuse, an env variable that leaks from the registering shell, a step that could
   start the app during the look or outside its window, a `.cmd` with an LF-only line or a non-ASCII byte, a wait
   that can refuse under a scheduled task (`timeout` with redirected input): each is a finding with the line.
6. **Privacy:** none of the instruments prints an answer, a prompt or the profile by default; run each one once on
   its known case and scan the output for the sensitive strings the builders' leak scans used.

## Output
Write `VH\instruments\REVIEW-instruments.md`: a VERDICT line (READY / READY WITH FIXES / NOT READY, for arming
Friday); findings numbered with severity (Critical / Important / Minor), each with the file and line and the
evidence (a command and its output line); for mechanical fixes, verbatim OLD/NEW blocks; the list of what must be
re-run after the merge and after the prestart; the amendments r4 needs, as verbatim text for the controller to apply.

## Constraints (binding)
- Read-only everywhere except `VH\instruments\REVIEW-instruments.md` and `VH\instruments\review-scratch\`.
- No vitest, tsc, build, npm; no API or model call; never start the app; never register, run or change a scheduled
  task; never execute a launcher's app, probe or flight steps (a dry launcher COPY cut before the guard, run from a
  wrong folder, is fine, as the builders did). Node scripts that read files and PowerShell reads are fine.
- Do NOT dispatch subagents.
- Never read, print or copy `.env`, an API key or `credentials.enc`. Captured prompts, answer and verdict files
  carry the user's personal profile: never print their text; ids, counts, hashes and model ids only.
- holdout40 is never used to tune or choose anything.

When finished, reply with ONLY: the verdict, the number of findings by severity, and the path of the review file.

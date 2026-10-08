# Brief D: the launchers, the registration script, the precheck, the merge script and the grader dispatch text

Read `VH\instruments\COMMON.md` first. Your letter is D.

**Spec:** r4 §2 (the run: the env block, the arms and their order), §7.3 (the pre-hour MAIN start, r4 lines 674–704,
including the wait that revision 4 changed), and the §7.4 bullets for `launch-h40d.cmd`, `launch-h40d-dry.cmd`,
`register-h40d.ps1`, `h40d-precheck.ps1`, `h40d-grader-dispatch.txt` and `h40d-merge.cmd` (r4 lines 708–742 and
802–807). Templates: `SP\launch-h40c.cmd`, `SP\launch-h40c-dry.cmd`, `SP\register-h40c.ps1`, `SP\h40c-precheck.ps1`,
`SP\h40c-merge.cmd`, `SP\h40c-grader-dispatch.txt`; MAIN's most recent flight launcher for the hedge-default env block
is `SP\boundary-repair\launch-br1.cmd`; the source-text generator pattern is `SP\launch-h40a-src.txt` (and
`SP\launch-s50m-src.txt`, `SP\s50l-merge-src.txt`).

Build, in `VH`:
1. **`launch-h40d.cmd`** — as r4 says: label `h40d`; the env block of §2 (every variable cleared,
   `NATIVELY_VERBAL_HEDGE` included); `NATIVELY_FLIGHT_COMMIT=<registered HEAD>` as a placeholder token the controller
   fills at arming (make the placeholder impossible to run by accident: the guard must fail on it); `wav:check`; dist
   proof 1 (`node SP\dist-proof.mjs --root . --expect combined --prefix-count 3 --offers-marker "offers block before
   the spoken answer"`, exit 3 to the error log on failure); `node VH\guard-h40d.mjs` (another builder writes it; call
   it exactly as `launch-h40c.cmd` calls `guard-h40c.mjs`); the flight; dist proof 2 after it.
2. **`launch-h40d-dry.cmd`** — the same up to and including the guard and dist proof 1; no flight.
3. **`launch-h40d-prestart.cmd`** — r4 §7.3: the env block and guard, then `node electron\test\golden\interview60.run.mjs
   app:start` → `… probe` → the wait r4 now specifies (a wait that cannot refuse, with its two timestamps in the log)
   → `… app:stop`, appending to `interview60.runs\flight-h40d-prestart.launcher.log`; then copy MAIN's
   `natively_debug.log` into `VH\2026-10-01-prestart-h40d\natively_debug.log` after `app:stop` if r4 has the launcher
   do it (otherwise the controller does; say which).
   Write all three from source texts in `VH\instruments\` by ONE node generator (`VH\instruments\gen-launchers.mjs`):
   ASCII, CRLF, checked byte by byte after writing (no LF-only line, no non-ASCII byte, every source line present).
   Known cases (do NOT execute the launchers' flight or app steps): run only a COPY of the dry launcher, cut before the
   guard, from a wrong folder (e.g. `VH\instruments\`) → exit 9 and the error log, as h40c's did; read the `.cmd`
   files' bytes back. Never run anything that would start the app.
4. **`register-h40d.ps1`** — `register-h40c.ps1` with the names, `-StartAt` mandatory, a `-Which flight|dry|prestart`
   (or three scripts, h40c's way), reading the task's settings back (StartWhenAvailable must read False). Do NOT run
   it (it would register a task). Check it only with the PowerShell parser
   (`[System.Management.Automation.Language.Parser]::ParseFile`) and print zero parse errors.
5. **`h40d-precheck.ps1`** — `h40c-precheck.ps1` re-pointed (task names, log names), plus the count of `Natively-*`
   tasks Running other than the flight. Known case (r4): run now with `-At` = the current minute against the h40c task
   names → it prints the h40c task's state and the process, port, power and audio lines. It only reads.
6. **`h40d-merge.cmd`** — `h40c-merge.cmd` re-pointed (verdicts from `VH`), with three `:arm` lines added for
   `gemini-3.5-flash-lite_captured-no-cues-high{,-r2,-r3}`; every merge passes `--model <exact id>`. Generated the same
   way (ASCII, CRLF). Known cases: run from the wrong cwd → exit 13; a missing verdicts file → `SKIPPED-MISSING <tag>`,
   never a merge of the wrong file (run these against a scratch copy of the folder layout, never MAIN's run folders).
7. **`h40d-grader-dispatch.txt`** — h40c's text verbatim, with the ten tags and their files: inapp;
   `captured-high{,-r2,-r3}`; `captured-no-cues-high{,-r2,-r3}`; `captured-low{,-r2,-r3}`; verdicts to
   `VH\h40d-verdicts-<tag>.json`; the counting rulings of r4 §4; the GRADER DRIFT order of r4 §6. Diff it against
   h40c's file and report the diff lines.

Output: the files above in `VH`, the generator and source texts in `VH\instruments\`, `VH\launchers-cal.txt` with the
byte checks and known cases, `report-D.md`.

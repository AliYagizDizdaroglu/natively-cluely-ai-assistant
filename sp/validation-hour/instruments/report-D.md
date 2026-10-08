# Report D (builder D: launchers, register, precheck, merge, dispatch)

Saved by the controller from builder D's reply (agent af59841c062693d72), 2026-10-01; the builder said the harness
blocked its own write of this file. HTML entities in the relayed reply were restored to the characters they encode.

**Status: DONE_WITH_CONCERNS**

The three launchers are **unarmed**. Each holds a placeholder token and exits 12 until `gen-launchers.mjs` fills it. Only new files in `VH` and `VH\instruments` were written, with no git writes and no existing file edited. Nothing was registered or started. The real error log `%TEMP%\natively-h40d-launcher-error.log` was never created.

## Files

Fingerprint is sha256/12.

In `VH`:
- `launch-h40d.cmd` (7259 bytes, c05d9d9092a6)
- `launch-h40d-dry.cmd` (5343 bytes, 6ea338a224f9)
- `launch-h40d-prestart.cmd` (9955 bytes, 8a2d1c608ab1)
- `h40d-merge.cmd` (4013 bytes, 129cb2eeab63)
- `register-h40d.ps1` (9339 bytes, d6459e74c51f), `-Which flight|dry|prestart -StartAt`
- `h40d-precheck.ps1` (4998 bytes, 5d79df9d66ac)
- `h40d-grader-dispatch.txt` (9064 bytes, f8d646701e6e)
- `launchers-cal.txt` (26865 bytes), the transcript: 166 PASS, 0 FAIL

In `VH\instruments`:
- `gen-launchers.mjs` — the one generator and byte verifier
- `launch-h40d-src.txt`, `h40d-merge-src.txt` — the source texts
- `launchers-cal.mjs` — the calibration runner
- `ps-cal.ps1` — the PowerShell calibration, run by the runner
- `build-dispatch.mjs`, `h40d-grader-dispatch-src.txt`, `h40d-grader-dispatch.diff.txt`
- `launchers-scratch\` — throwaway helpers `bytes-info.mjs`, `rmtree.mjs`, `env-names.mjs`

## Calibration commands

```
node VH\instruments\launchers-cal.mjs
    (runs everything including ps-cal.ps1, about 115 s; ends "SUMMARY launchers-cal: 166 PASS, 0 FAIL")
node VH\instruments\gen-launchers.mjs [--check [--armed]] [--commit <40 hex>] [--prestart-commit <40 hex>]
node VH\instruments\build-dispatch.mjs
powershell -NoProfile -ExecutionPolicy Bypass -File VH\h40d-precheck.ps1 -At <HH:mm now> -Label h40c -ReadOnly
```

Launcher cases run derived copies in stub trees, and only the lines naming the harness, flight or `dist-proof` scripts differ. The runner asserts this on every case ("path lines only: true"). The real `dist-proof.mjs` was run read-only on copies of the worktree dist.

## One line per calibration (case → reading)

**Generator and bytes**
- Independent byte read of the four `.cmd` files → CRLF 79/67/106/61, bare LF 0, bytes above 126 0, no BOM, ends with CRLF.
- `--check` on the real files → exit 0, and the dry twin equals the flight launcher up to the guard.
- `--check --armed` on the unarmed files (known-bad) → exit 1.
- 11 mutants (bare LF, byte above 126, BOM, deleted line, altered line, no final CRLF, 39-character hash, tab, deleted merge `:arm`, uppercase hash, drifted dry twin) → all 11 exit 1 with the reason.
- Arming → `--commit` fills flight and dry, `--prestart-commit` fills the prestart, and each keeps the others.
- The real order (prestart first, flight later, then a re-arm) → passes. A generator that forgets existing values loses the prestart value, so the check can fail.
- Hash refusals (39, 41, uppercase, 7-character, unknown option, `--armed` alone) → exit 2, nothing written.
- 9 cmd-hazard lint cases → each exit 2, nothing written. A parenthesis in a one-line `if` echo is accepted.

**Launcher flows**
- Wrong folder, using the brief's dry copy cut before the guard, run from `VH\instruments\`, plus flight, dry and prestart → exit 9. The error log names the folder and nothing ran.
- No holdout40.wav / no roster / harness lacking the exit listener → exit 8 / 7 / 6.
- Unarmed flight, dry and prestart → exit 12, nothing ran.
- `wav:check` fails → 5.
- Real dist-proof on an empty tree → 3.
- Guard fails → 4.
- Dry, all pass → 0, with no flight or app step in the trace.
- Flight, all pass, both real dist proofs → 0.
- Flight exits 1 → 1.
- Proof 1 passes and proof 2 fails → 3.
- Proof 1 fails → 3, with no guard and no flight.
- Prestart, all pass, real 60 s wait → 0, with timestamps 60.81 s apart.
- `app:start` fails → 10. No probe, but `app:stop` still ran.
- Probe not ready → 11. The wait and `app:stop` still ran.
- Proof fails after a clean run → 3.
- Start and proof both fail → 3, and the error log names both.
- `app:stop` fails → 13.

**dist-proof call and cmd facts**
- `--root .` (r4 and the brief's literal) → crashes `dist-proof.mjs`, exit 1, no verdict (known-bad).
- `--root "%CD%"` (the launcher's line), from the worktree, whose path has a non-ASCII name → exit 0, "every marker as expected", filter sha `42d9bc42dbd17870`.
- `findstr` with 10 classes accepts, and with 16 and 40 classes silently refuses.
- An undefined variable's substring expands to `~39,1`.
- A rem line holding `& | > ( ) ^ %` executes nothing.
- `timeout` with redirected input → exit 1 in 97 ms.
- `ping -n 3` → 2125 ms.
- MAIN's own preconditions, read-only → flight.mjs, holdout40.wav, the roster file, the `process.on('exit', appStop)` line and the runs folder are all present. No `flight-h40d` log exists yet, and the error log is absent.

**Merge**
- Wrong cwd, or an absolute run dir from the wrong folder → exit 13, nothing copied. h40c's script copies the verdicts file first (known-bad contrast).
- No arguments → 12.
- In-app verdicts missing → 10.
- Only in-app present → one merge and 14 `SKIPPED-MISSING`.
- All present → 15 judge calls, each with `--model` and each arm given its own file, the three no-cue arms included.
- Missing file plus a stale file in the run folder → one `SKIPPED-MISSING`, stale file untouched.
- In-app merge fails → exit 1.
- One arm fails → `MERGE-FAILED <tag>`, the rest run, `ALL MERGES RAN`.
- Arm list against the flight's 12 `PAIRED_ARMS` → complete. h40c's merge script is missing exactly the three no-cue arms.

**Dispatch**
- Text proper vs h40c → byte-equal (1135 bytes); a one-word change is seen.
- Ten rows → they match the flight's pairs-file formula and the merge's verdict names. A wrong-model row fails the comparison.
- Diff vs h40c → one hunk, `@@ -1,29 +1,81 @@`: 24 lines removed, 76 added, 0 inside the dispatch text proper.

**register-h40d.ps1 and h40d-precheck.ps1** (parse and static checks only; the register script was never run)
- Parse → 0 errors on both, ASCII, no BOM. An unclosed `if` appended reads 1 error.
- Register functions cut out by AST → plans and limits per `-Which` are right. `-StartAt` throws on past, now, no-seconds, ambiguous and empty values. Read-back problems are named: StartWhenAvailable True, a Disabled state, next run 3 h off, two at once.
- Placeholder refusal → reads True on all three real launchers. Cue-source refusal reads False on the worktree and True on MAIN today, which is not merged.
- Read-back on real tasks → h40c's flight task reads clean. `Natively-smoke-cues` (StartWhenAvailable True) is named (known-bad).
- Precheck known case (`-At` now, `-Label h40c`, `-ReadOnly`) → exit 0, no stderr, and all state, process, port, power, audio and "dry twin NOT RUN" lines present. A label with no task prints `NOT REGISTERED` without crashing.
- Dry-log filter on real dist-proof output → the combined build keeps 2 lines. MAIN's pre-merge dist keeps 8 BAD lines and no as-expected verdict.
- Static checks → four misspelling mutants (variables and parameters) are each named.

## Not implementable as written in r4 or the brief

1. `--root .` crashes `dist-proof.mjs`, so the launchers pass `--root "%CD%"`. `dist-proof.mjs` is unedited.
2. A literal `<registered HEAD>` aborts cmd with exit 255 and no log line (A's note). I used the plain tokens `@@REGISTERED_HEAD_FULL_HASH@@` and `@@MAIN_HEAD_AT_PRESTART@@`. Three layers refuse them: the launcher (exit 12), `register-h40d.ps1`, and A's guard.
3. The prestart's commit is MAIN's HEAD at prestart time, because the registered HEAD does not exist yet.
4. r4 lists the `natively_debug.log` copy under "Required afterwards", not among the launcher's steps. **The controller copies it** right after `app:stop`. The launcher logs a `dir natively_debug.log` fingerprint to check the copy against.
5. Two r4 known cases cannot run today. One is the dry twin from MAIN → `GUARD OK`, because MAIN is pre-merge and its dist is the known-bad build. The other is registration reading Ready with next run 13:30, because registering is forbidden here.
6. r4 does not name the tag, file or verdicts name for GRADER DRIFT choice (i), "h40c's re-grade". The dispatch text says so.
7. The prestart also runs `wav:check` and dist proof 1 (the dry twin's common section), plus dist proof after `app:stop`.
8. Added beyond r4: precheck `-ReadOnly` and `-Label`, and a judge-script check in the merge script that closes the h40c gap shown above.

## Concerns

Three need a controller decision: item 3 (the env block), the debug-log copy in deviation 4 above, and the GRADER DRIFT re-grade name in deviation 6.

1. **Not exercised:** the real Task Scheduler context, A's real guard inside my launcher (a stub guard stood in), the register script's registration body, the precheck's dry-twin start branch, and the real `app:start`, `probe`, `app:stop` and flight steps. The first real exercise is the dry twin at arming. It must show `GUARD OK` and "every marker as expected" in `flight-h40d-dry.launcher.log`.
2. **HEAD pin:** any commit to MAIN between arming and 13:30 fails A's check 10b. With StartWhenAvailable False, the flight is lost. Arm last. The 13:24 precheck re-runs the dry twin, which would catch a moved HEAD. The same applies to the prestart between arming and firing.
3. **Env block:** I implemented r4's nine names. The worktree source reads 30 `NATIVELY_*` names, and 22 are not cleared, including `NATIVELY_LIVE_MODEL`, which changes a model.
   - None of the 30 exists in this session's process environment, HKCU or HKLM today (names only).
   - `.env` was not read. A's check 10a scans it for six names only.
   - To add one: put a `set NAME=` line in the common section of `launch-h40d-src.txt`, then run the generator and the runner.
4. **Error log:** it must be absent at arming and no launcher deletes it, so after a failed dry run read it and remove it yourself.
5. **Precheck gaps:** it lacks the logged-on, sleep-never, restart-pending and Context-toggle items of r4 section 6. h40c's script lacked them too.
6. **Path length:** `VH` is 207 characters, and cmd and PowerShell 5.1 fail past 259. A new file name in `VH` must stay under about 50 characters (mine are 26 or fewer).
7. **Timing checks:** the `timeout` and `ping` readings and the 60 s waits passed twice, while another builder's calibration ran concurrently. They tolerate a loaded machine but not an overloaded one.
8. **Order:** run `gen-launchers.mjs --prestart-commit <MAIN HEAD now>` first. Then register `-Which prestart`. After the pre-registration commit, run `--commit <registered HEAD>` and `--check --armed`. Register the dry twin first, and require its `GUARD OK`. Register the flight with `-StartAt 2026-10-02T13:30:00`. At 13:24 run the precheck.

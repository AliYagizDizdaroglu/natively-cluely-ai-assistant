VERDICT: ARMING MAY PROCEED. 0 Critical, 0 Important, 9 Minor. Recommended before arming: m1 (cmd negative exit codes) and m2 (audio-state can veto the precheck). Each is a one-line change. The rest can wait.

# Review: the flight-eq arming tools (steps 8, 10, 11–13)

Fresh Opus, 2026-10-05, 21:30–22:05 TST. Requirements read: A2 (A2.6, A2.8, A2.10 P6–P9), A3 (A3.6, A3.7), A4 (A4.6, A4.7),
A5 (A5.2, A5.4, I3), A6 (A6.1 and its step-12 list), A6-RECHECK F1/F2, NOTE-controller-tools-2026-10-05, registration §2 and b7.
Build report: tools-8-10-12-report.md.

What I did not do: edit any tool in E, write into MAIN, start the app, register a real `Natively-flight-eq*` task, call a
model, use a subagent, or read a key or captured prompt.

**Hashes on disk equal the report's** for all 13 tools and 5 drivers (sha256/12). Examples: guard-eq.mjs 3b49e62f9542,
eq-precheck.ps1 9a703bca9b41, register-eq.ps1 3d3c89611ecc. MAIN HEAD = b42ca32.

## Re-runs (on a copy at `SP\flight-eq-revcopy\`, never E)

| driver | result | time | note |
|---|---|---|---|
| guard-eq-cal.mjs | **208/208**, 38/38 mutants | 5 m 22 s | not 2.5 min: a peer was running the same cal in E at the same time (`guard-eq-cal.rerun-2131.txt`, 21:31–21:37). X3 now reads GUARD OK on MAIN's real tree with the real `RESULT-smoke-eq.md` |
| guard-eq-git-cal.mjs | **19/19** | <1 s | |
| launchers-eq-cal.mjs | 1st run 71/72 (G2 BAD); after a 1-line path fix in the copy, **72/72** | 35 s | the BAD came from the driver writing to E instead of the copy (finding m7), not from a tool. Its run left one stray `guardsonly.launcher.log` in real E; **I deleted it** (21:42) |
| eq-precheck-cal.mjs | **30/30** | 11 m 21 s | run against the CURRENT helper da0985f126ba (see m8) |
| register-eq-cal.mjs | **27/27** | 1 m 44 s | |
| eq-precheck-task-cal.mjs | **PRECHECK TASK CALIBRATION OK** | 1 m 40 s | fired by the real Task Scheduler |
| guard-eq-head-check.mjs, live on MAIN | HEAD → GUARD OK; parent → `GUARD FAILED (10b)`; exit 0 | 2 s | with T 2026-10-05 23:00, the real night gates and the real smoke result. `--expect-head 000…` → FAIL, exit 1. T 02:00 → `(g4)` on both readings, exit 1 |

**The real guard chain is fast.** In the guards-only copy run from MAIN, the stretch from the start banner to GUARD OK
took about 3.7 s. That stretch covers sha-lines, wav:check, eq-proofs and the guard. g5's T + 10 limit is therefore no
risk.

**Clean-up checked:** no `Natively-flight-eq*` or `eqcal` task remains (only the old `Natively-smoke-eq`); both
`%TEMP%` error logs are absent; the copy's stub git repo and layout dirs are deleted.

## The hard questions

### (1) Can the real flight start while a registered precondition is false? No.

Every refusal below reaches launch-eq-src.txt l.120–124 (`guard-eq.mjs --require-precheck`; any errorlevel ≥ 1 → exit 4,
before the flight line at l.140). The one hole is a negative exit code (m1).

| precondition false | refused at (file:line) |
|---|---|
| wrong HEAD | guard-eq.mjs:240 (10b). Commit unset or malformed: :231–232. Malformed in the launcher: src l.88–96 → exit 12 |
| dirty tree | guard-eq.mjs:248 (guard-eq-git.mjs allowlist) |
| wrong env: model or thinking override | :142, :146 |
| wrong env: hedge set, trigger, follow-up parent | :161 and :171, :176, :187 |
| wrong env: names in `.env` | :418 |
| wrong env: detector override | :420 |
| earlier-question flag missing or not exactly `1` | :193. Built describer not `on`: :202 |
| focused-off missing | :270 (variable), :271 (no `focusedFor`), :274 (focusedFor not null), :276 (P2 marker) |
| roster wrong | :116 (name), :117 (count 40), :119 (S1,S2) |
| night gates fail | :375, :381, :382 (dry and real). The precheck's dry-twin gate also needs `NIGHT GATES OK` (eq-precheck.ps1:190) |
| precheck missing | :391 |
| precheck failed | :395 (last line not `PRECHECK OK`) |
| precheck stale (stamp < T − 10) | :398 |
| precheck from the future | :399 |
| precheck accepted too late (now > T + 10) | :400 |
| arming record absent, incomplete, two T lines, wrong T, T ≠ NextRunTime, stamp > At − 4 | eq-precheck.ps1:109–135 → FAILED :213 → `Disable-ScheduledTask` :218 → the output file does not end `PRECHECK OK` → guard :395 |
| T out of window | guard :209. Also refused earlier: gen-launchers-eq.mjs:52 and register-eq.ps1:159 |
| launcher T ≠ the task's T | register-eq.ps1:96–98 at registration. At run time, g5's stamp window forces \|now − T_launcher\| ≤ 10 min (:398–400) |

Also refused, beyond the list: a stale or other build (:225, :313–317, :293–298), smoke not run or out of range (:334–347),
knowledge mode OFF (:367–370).

**Backstop when the precheck never ran** (asleep, crashed before its `try`, not fired): no fresh stamp exists, so :391 or
:398 refuses.

### (2) Does the precheck at T − 6 disable the flight task on any FAIL and read back Disabled? Yes; read-back is printed but not asserted.

- **Disables on:** every gate FAIL, and on any crash inside the `try` (`internal`, l.203–205). The disable is at
  l.212–225.
- **Reads back:** the state is printed (l.219) but not asserted (m3).
- **Exits that skip the disable** (usage error l.48–61, a crash before l.88, a failed final write l.227) leave no fresh
  `PRECHECK OK`, so guard g5 refuses.
- **Calibrated:** P3 and A1 read the dummy back as Disabled (re-run: 30/30).

### (3) Launcher output: yes on all four counts.

- **sha lines first:** the line after the start banner is eq-sha-lines (src l.99). It prints `SHA LINES HEAD`, one
  `PASSES <name> sha256=` per text from `git show HEAD:` (eq-sha-lines.mjs:29–33), then `ARMING sha256=` or
  `ARMING absent` (:34). A text missing at HEAD → exit 14 (src l.100–103).
- **ARMING line before wav:check:** asserted by L5 and by launch-eq-check.mjs:112.
- **ASCII + CRLF:**
  - the generator lints and reads every byte back (gen-launchers-eq.mjs:96–115, :132–160);
  - `file` confirms "ASCII text … CRLF" for both placeholder launchers;
  - the independent scan L3 passes.
- **`--require-precheck` only in the real launcher:**
  - the two guard sections differ only by that flag (src l.118–132);
  - the generator fails unless that is the ONLY difference (:231);
  - L4 and K1/K2 cover it.

### (4) StartWhenAvailable, read-back, supersede (A5 I3): all hold.

- **StartWhenAvailable False:** never passed (register-eq.ps1:199); asserted on read-back (:75, :226). R7 flips it.
- **Read-back:** state, trigger count, next run ±60 s, action and working directory are asserted (l.213–239). `armed`
  prints both NEXT RUNS (:243).
- **Supersede (l.113–144):**
  - disables the flight and the precheck tasks;
  - reads each back, and exits 1 if either is not Disabled;
  - renames the record to `.superseded-<HHmm>[-n].md`, never overwriting;
  - prints the old T and whether its T − 6 has passed.
- **Calibration S1–S5:** pass.
- **Why a stale precheck cannot carry over:** the new T is ≥ now + 45, so an old precheck's stamp can never satisfy the
  new T's g5 (:398).

### (5) Could the hour differ from the registration? No path found.

**The environment block (src l.51–86) is h40d's exact list plus three names:**
- `NATIVELY_EARLIER_QUESTION=1`;
- `NATIVELY_FLIGHT_FOCUSED=off`;
- `NATIVELY_EQ_T`.

I compared it with launch-h40d-src.txt name by name.

**Each registered setting, and where it is enforced:**
- **Roster S1,S2:** enforced by check 1.
- **Hedge default (variable unset, built default ON, 5000 ms):** checks 6 and 7.
- **Cues as shipped:**
  - check 12 runs dist-proof `--expect combined`;
  - MAIN has no cue environment flag (I grepped every `NATIVELY_*` name the app reads).
- **Capture prompts:** clearing `NATIVELY_CAPTURE_PROMPTS` in the launcher is harmless. `interview60.run.mjs:280` spawns
  the app with `NATIVELY_AUTOSTART_MEETING=1`, `NATIVELY_LIVE_MODE=auto` and `NATIVELY_CAPTURE_PROMPTS=1` explicitly,
  as on h40d.
- **Focused arms:** the harness reads only `NATIVELY_FLIGHT_FOCUSED` and the roster names. The flight arg `eq` gives
  run folder `*-eq`.
- **`.env` override:** `main.ts:6` calls `dotenv.config()` without override, so a `.env` line cannot override a name
  the launcher sets.
- **dist that flew:** the dist proofs after the run (eq-proofs `--same-as-log`) make a changed `earlierQuestion.js` sha
  fail.

## Per tool

| tool | SPEC | QUALITY | findings |
|---|---|---|---|
| guard-eq.mjs | PASS | APPROVE | — |
| guard-eq-git.mjs | PASS | APPROVE | — |
| guard-eq-head-check.mjs | PASS | APPROVE | — |
| gen-launchers-eq.mjs | PASS | APPROVE | m5 |
| launch-eq-src.txt (+ both .cmd) | PASS | CHANGES | m1 |
| eq-sha-lines.mjs | PASS | APPROVE | — |
| eq-proofs.mjs | PASS | APPROVE | — |
| launch-eq-check.mjs | PASS | APPROVE | m6 |
| eq-precheck.ps1 | **FAIL** (one A3.6 clause, Minor) | CHANGES | m2, m3, m4 |
| register-eq.ps1 | PASS | APPROVE | m9 |
| cal drivers | n/a | APPROVE | m7, m8 |

## Findings (all Minor; none lets a bad flight start under a realistic state or makes the hour differ)

**m1. A negative exit code passes `if errorlevel 1`.**
- Where: launch-eq-src.txt l.46, 100, 106, 113, 121, 129 and 146.
- Measured here: a node child exiting −1073741819 (0xC0000005, a native crash) passes `if errorlevel 1`, and the script
  CONTINUED.
- Consequence: a guard that dies natively would let the flight run unguarded. Probability is negligible; h40d has the
  same pattern.
- Fix: in src, replace each `if errorlevel 1 (` with `if not "%errorlevel%"=="0" (`. The lint allows `%` outside echo
  and rem lines. Then regenerate, `--check`, re-run launchers-eq-cal (35 s) and launch-eq-check. Recommended before
  step 10.

**m2. audio-state can FAIL the precheck, though A1.2 says it is never gated.**
- Where: eq-precheck.ps1:198, `& powershell … audio-state.ps1 2>&1` under `$ErrorActionPreference='Stop'` (l.44).
- Measured here: any stderr line from the child becomes a terminating error. The probe printed `CAUGHT: RemoteException`.
  In the precheck that lands in the catch at l.203 as `internal` → FAILED → the flight is disabled.
- When it bites: only if Core Audio throws, e.g. no default playback endpoint. A good flight is blocked only if audio
  then works at T anyway, so it is unlikely.
- Fix: run that one call under a local `$ErrorActionPreference = 'Continue'` and `2>$null`, wrapped in its own
  `try { … } catch { Emit "PRECHECK audio-state INFO: unreadable" }`. Then re-run eq-precheck-cal (11 min) and
  eq-precheck-task-cal (2 min).

**m3. The disable read-back is printed, not asserted.**
- Where: l.218–219.
- Fix: if the read-back state is not `Disabled`, emit `PRECHECK flight task NOT DISABLED (state …)`. Guard g5 still
  refuses either way.

**m4. SPEC: the precheck does not print the arming record's sha256 (A3.6 I2: "and the precheck prints it too").**
- Also: on FAIL the output file ends with the "disabled, state now" line, not with `PRECHECK FAILED …` (A2.10 P8
  "ending … PRECHECK FAILED").
- Why it matters: without the precheck's sha, nothing proves the record the precheck checked at T − 6 is the record the
  real launcher hashes at T. The A5.4 freeze then rests on discipline.
- Fix:
  - after l.135, `Emit ("PRECHECK arming-record sha256=" + (Get-FileHash -Algorithm SHA256 -LiteralPath $armingFile).Hash.ToLower())`
    when the file exists;
  - move the disable block (l.215–225) before the `PRECHECK FAILED` emit (l.213), so the verdict line is last.
- Re-calibrate as in m2.
- If it is not fixed tonight, compare the ARMING record's sha by hand before T − 6 and after the launcher prints it, and
  name the gap in the result note.

**m5. The default `--passes` list holds only the registration and A1–A6.**
- Where: gen-launchers-eq.mjs:54.
- A5 m8 also puts the tools-review note (and cue rev 7, if out) into step 9's commit. A committed text that is not named
  is never printed.
- Fix (operator): at step 10, pass `--passes` naming every file the step-9 commit adds under `passes/`.

**m6. launch-eq-check deletes the REAL `%TEMP%\natively-eq-launcher-error.log` before its first run.**
- Where: launch-eq-check.mjs:91.
- Consequence: an error log left by an earlier real failure is erased silently, and G4 then reports "ABSENT".
- Fix: at start, if ERRLOG exists, exit 2 naming it (the controller looks, then deletes it by hand).

**m7. launchers-eq-cal.mjs hard-codes E's relative path.**
- Where: launchers-eq-cal.mjs:228, `REL_E = '..\\natively-lab\\sp\\flight-eq'`.
- Consequence: run from any copy it writes into the real E and reports G2 BAD. That happened here: one stray log, which
  I deleted.
- Fix: `path.relative(MAIN, E)`, as launch-eq-check.mjs:48 already does. Cal-only.

**m8. E's eq-precheck-cal.txt records helper sha256/12 3359b1ef50ca.**
- The helper on disk (and in the report) is da0985f126ba; it was edited at 18:27:53, during that run, which started
  18:25.
- My re-run with da0985f126ba: 30/30.
- Fix: re-run `node eq-precheck-cal.mjs` in E before the instruments note, or cite this review's run.

**m9. Two small gaps in register-eq.ps1.**
- `verify` does not re-check that the launcher's `NATIVELY_EQ_T` equals `-T` (l.167 skips it). Arming relies on g5's
  stamp window for that.
- `supersede` renames the record even when a disable failed. It still exits 1, and the renamed record makes the old
  precheck FAIL, so this fails closed.
- Fix (optional): run `Get-LauncherProblems` in verify mode too.

## For the controller tonight (no tool change needed)

- **Step 9 commit:** a commit-tree/update-ref commit that does not also stage the files in MAIN's index and tree leaves
  `passes/` dirty. 10b then refuses. guard-eq-head-check `--expect-head` at step 9 catches this, so run it.
- **Peer activity in E:** a peer re-ran guard-eq-cal in E at 21:31. Calibration drivers share the dummy task names
  `Natively-flight-eqcal*` and the `%TEMP%` error log, so run them one session at a time.
- **Night gates tonight:** they read OK at T 23:00 (live, 21:50). The real dry twin's duration has still not been
  measured (step 11), but the guards-only chain takes about 4 s.

## Not shown

- The real dry launcher and the real precheck at the real T. The tasks are not registered yet; that happens at steps 11
  and 13.
- `-WakeToRun` from sleep.
- m1's crash path inside the actual launcher. I proved the cmd semantics, not a crashing guard.
- m2 on a machine with no default audio endpoint. I proved the PowerShell semantics only.
- Whether `ARMING-flight-eq.md` stays byte-identical between T − 6 and T (m4).

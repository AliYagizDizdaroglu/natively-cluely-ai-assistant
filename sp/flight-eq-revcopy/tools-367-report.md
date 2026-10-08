# Tools 3, 6, 7 (flight-eq): build and calibration report

Built 2026-10-05 about 17:25 local, from AMENDMENT-A3 (final list items 3, 6, 7) over AMENDMENT-A2 (A3 wins).
E = `C:\Users\sotka\OneDrive\Masaüstü\natively-lab\sp\flight-eq` (registration line 19: `E` = `L\flight-eq`). MAIN was only read
(HEAD 355ad0a = the dist build; nothing written, nothing committed). No model call, no app start, no subagent.
Each calibration file quotes real outputs; each driver (`*.cal.mjs`) regenerates its file. No prompt text, key or captured
prompt was printed (the c2 builder's stdout is parsed in-process and never echoed).

| tool | sha256 | calibration | verdict |
|---|---|---|---|
| (3) `eq-b4-cal.mjs` | `ab5c37ecfbac20fdcec98ef21f41edb7fbb8dbc8e848b76e861c772cf9507b5d` | `eq-b4-cal.cal.txt` (sha `f6dc866a606a...`), driver `eq-b4-cal.cal.mjs` | PASS on a-e (+ extras); **(f) NOT RUN: the smoke run dir does not exist yet** |
| (6) `window-eq.mjs` | `e93cb89ab1f99b859213448867b9e1111dd821db3f54c39a756db693e18877aa` | `window-eq.cal.txt` (sha `a44d9807fd3d...`), driver `window-eq.cal.mjs` | PASS: 24 cases x 2 time zones, identical |
| (7) `night-gates.ps1` | `88750f8aadc105367a3323819afd2a7e487d40c676473938d97bf0f0e7df04b4` | `night-gates-cal.txt` = `night-gates.cal.txt` (sha `cdd6436c27d1...`), driver `night-gates.cal.mjs` | PASS: 29 cases, 8 refusals, 7 mutants flipped; real run quoted |

## (3) eq-b4-cal.mjs

Usage `node eq-b4-cal.mjs <run-dir> --g <ids>` (`--g ''` = none; a trailing bare `--g`, which a shell can produce from an
empty argument, also means none). Prints `B4CAL run=... ids=N g=K [ids]`, then a TRANSCRIPT line and a BLOCK line.
Exit: 0 = TRANSCRIPT OK and BLOCK OK/NONE; 1 = DIFF or BLOCK FAIL; 3 = UNCALIBRATED only; 2 = refusal (unknown --g id,
builder output not recognised, mismatch list not parseable). Method per A3.1a: strip/re-insert imported from MAIN's
`earlierQuestionArm.mjs`; LABEL read from the built dist (`earlierQuestion.js`, the module the harness's `--no-block` reads);
copy in `E\b4cal-tmp` (deleted on exit, including on refusal); c2's builder run with `--calibrate`; BLOCK = split non-null,
no LABEL left, re-insert identity, length identity `+ 2`.

Cuesmoke folder `interview60.runs\2026-10-01T02-37-41-cuesmoke`, 19 ids, X = S1Q01F, Y = S1Q02 (first two ids whose window
has a flippable character):

| case | expected | actual |
|---|---|---|
| (a) unmodified, `--g ''` | TRANSCRIPT OK 19/19 | TRANSCRIPT OK 19/19, BLOCK NONE, exit 0 (also read directly from the builder first: `CALIBRATION OK 19/19`) |
| (b) X + synthetic block, `--g X` | TRANSCRIPT OK + BLOCK OK | TRANSCRIPT OK 19/19, BLOCK OK 1/1 |
| (c) as (b) + one char of X's transcript part changed | TRANSCRIPT DIFF X | TRANSCRIPT DIFF S1Q01F, BLOCK OK 1/1, exit 1 |
| (d) as (b), trailing `\n\n` reduced to `\n` | BLOCK FAIL X | BLOCK FAIL S1Q01F (TRANSCRIPT OK 19/19), exit 1 |
| (e) as (b) + one non-G id (Y) changed | TRANSCRIPT UNCALIBRATED 1 | TRANSCRIPT UNCALIBRATED 1, BLOCK OK 1/1, exit 3 |
| (e2) no G, Y changed | UNCALIBRATED 1 | TRANSCRIPT UNCALIBRATED 1, BLOCK NONE, exit 3 |
| (g) extra: `--g X` on an id with no block | BLOCK FAIL | BLOCK FAIL S1Q01F |
| (h) extra: two blocks in X | BLOCK FAIL | BLOCK FAIL S1Q01F |
| (m1) extra: mutant of the tool with the length identity `+ 3` (the re-check's figure), case (b) | BLOCK FAIL | BLOCK FAIL S1Q01F (so the `+ 2` check bites and `+ 3` would fail correct bytes) |
| (r) refusals | exit 2 on unknown id / no `--g` | exit 2 both; bare `--g` = none, exit 0 |
| (f) smoke run dir keys == the five OK ids | PASS | **NOT RUN**: `E\smoke-run-tmp` and `F\smoke\verify-smoke-prompts.mjs` do not exist yet (F\smoke is empty). The driver prints the comparison when the dir exists. |

Case (a) passed, so the "no flight tonight" stop does not trigger on cuesmoke.

Concerns:
- **The blocking gate is still open.** `eq-b4-cal.mjs E\smoke-run-tmp --g S1Q04F,S1Q06F` cannot run until Task 10's smoke and
  its run dir builder exist; (f) and that gate are the first real test on current-shape bytes. Cuesmoke is cue-era and has no
  EARLIER QUESTION blocks, so cases (b)-(d) use a synthetic block.
- **What TRANSCRIPT can and cannot see.** The builder re-renders the transcript from its parsed parts, so it reproduces any
  drift that the render does not normalise. Case (c) works because the cleaner lower-cases window turns (uppercasing one
  letter cannot round-trip). A live byte change the renderer reproduces (and a change inside the part before the marker, A3
  "Named in §9") is not caught by this tool.
- Builder mismatch lines can carry prompt text in `(error: ...)` messages. The tool keeps them in memory and prints only ids
  and counts, but anyone running the builder by hand should not paste its output.
- An id with odd characters (not `[A-Za-z0-9_]`) in a mismatch list would make the tool refuse (exit 2) rather than guess.

## (6) window-eq.mjs

Bounds `2026-10-05T16:30:00.000Z <= startedAt <= 2026-10-05T22:30:00.000Z` (A3.2 m14). Local shown by fixed +03:00 arithmetic
on UTC getters only. Exit 0 in / 3 out / 4 unreadable / 2 usage. Stricter than `Date.parse` on purpose: full ISO date-time
with an explicit Z or +hh:mm, at most 3 fraction digits, impossible dates refused (`new Date('2026-02-30T00:00:00Z')` rolls to
Mar 2 and `...22:30:00.0009Z` truncates into the window, both measured here).

| case | expected | actual (both zones: machine -180 min, TZ=UTC 0 min) |
|---|---|---|
| 22:30:00.000Z | in, exit 0 | `WINDOW-EQ startedAt=2026-10-05T22:30:00.000Z local=2026-10-06 01:30:00+03 IN WINDOW 2026-10-05 19:30 .. 2026-10-06 01:30` |
| 22:30:00.001Z | out, exit 3 | `... local=2026-10-06 01:30:00+03 OUT OF WINDOW (cannot PASS; NO LATENCY VERDICT)` |
| 22:31:00.000Z | out | OUT |
| 22:30:59.999Z (A2 said in; A3 wins) | out | OUT |
| 16:29:59.999Z | out | OUT |
| 16:30:00.000Z | in | IN |
| 20:59Z (23:59), 21:00Z (00:00 on the 6th) | in, in | IN, IN (midnight crossing) |
| 2026-10-04T21:30:00Z (00:30 on the 5th) | out | OUT |
| `+03:00` inputs: 19:30:00.000 in, 19:29:59.999 out, 01:30:00.000 (6th) in, 01:30:00.001 out | as stated | as stated |
| s50m run folder | out | `startedAt=2026-09-22T07:14:07.873Z ... OUT OF WINDOW`, exit 3 |
| copy of s50m timeline without `startedAt` | unreadable, exit 4 | `WINDOW-EQ UNREADABLE (startedAt missing or unparseable) - cannot PASS` |
| no timeline file; corrupt JSON; 2026-02-30; no zone; 4 fraction digits; 24:00; junk | unreadable | all UNREADABLE, exit 4 |
| no args; `--at` with no value | usage, exit 2 | usage, exit 2 |

Identical output under `TZ=UTC`: all 24 cases byte-identical (the cal prints both zones' `getTimezoneOffset`, -180 and 0, to
show the override took effect). Mutants run by hand (appended to the cal file): upper bound exclusive flips case 22:30:00.000Z
to OUT; lower bound exclusive flips 16:30:00.000Z to OUT; A2's `+59.999 s` flips 22:30:00.001Z to IN.

Concern: none blocking. Run-dir mode reads only `startedAt` of `interview60.timeline.json`; s50m (not holdout) was the only
real folder used.

## (7) night-gates.ps1

`powershell -File night-gates.ps1 -At 'yyyy-MM-dd HH:mm' [-FakeJson <file>]`; UTF-8 BOM present, ASCII otherwise (0 non-ASCII
bytes), ParseFile 0 errors, read-only scan clean (no mutating verb; every `powercfg` call is `/q`). `-FakeJson` replaces every
reading and refuses a missing key (exit 2); keys are defined in the script header (A2 named the parameter, not its schema).
All 29 cases pass, 8 refusals pass (bad -At x5, missing fake, missing key, bad JSON), exit 2 with no gate lines. The machine's
power and update settings were only read.

| case (At 2026-10-05 21:00 unless stated) | expected | actual |
|---|---|---|
| all-good fake | NIGHT GATES OK, 0 | OK, 0 |
| standby 0x384 | FAIL standby-ac | `NIGHT standby-ac: FAIL AC sleep timeout 0x00000384 (900 s)`; `NIGHT GATES FAILED (1): standby-ac`, 1 |
| hibernate 7200 s | FAIL hibernate-ac | FAIL hibernate-ac, 1 |
| BatteryStatus 1, line offline | FAIL power | FAIL power |
| no battery | OK | OK |
| BatteryStatus 6 + line online / offline | OK / FAIL | OK / FAIL |
| BatteryStatus 3 + online; 5 + online; 1 + online | OK; FAIL; FAIL | OK; FAIL; FAIL |
| CBS RebootPending | FAIL reboot | FAIL reboot |
| WU RebootRequired only (A3 m13) | FAIL reboot | FAIL reboot (`WU RebootRequired PRESENT`) |
| PendingFileRenameOperations only | OK (printed) | OK |
| active 8->17, no pause | FAIL updates | FAIL updates |
| same + pause to 2026-10-07 | OK | OK (`pause to 2026-10-07T00:00:00Z > At+5h (2026-10-05T23:00:00Z)`) |
| active 18->6, At 2026-10-06 01:00 | OK (06:00 inclusive) | OK |
| active 18->5, same At | FAIL updates | FAIL updates |
| no ActiveHours values, no pause (A3 m13) | FAIL updates | FAIL updates (`active hours missing; no pause`) |
| no ActiveHours values + pause | OK | OK |
| only ActiveHoursStart missing | FAIL | FAIL |
| pause expiry == At+5h; At+5h+1 s | FAIL; OK | FAIL (`<=`); OK |
| active 19->6 / 20->6 at At 19:30 | OK / FAIL | OK / FAIL (start inclusive) |
| active 15->1 / 15->0 at At 20:00 | OK / FAIL | OK / FAIL (end inclusive) |
| standby + CBS | FAILED (2): standby-ac, reboot | as expected |
| all five failing | FAILED (5) | `NIGHT GATES FAILED (5): standby-ac, hibernate-ac, power, reboot, updates` |

Mutants (one edit each in a copy; the targeted case must change): standby `-eq 0`->`-ge 0`, hibernate likewise, reboot ignoring
WU RebootRequired, active-hours end exclusive, active-hours start exclusive, pause `-gt`->`-ge`, power accepting any status when
the line is online: all 7 FLIPPED.

**Real run, quoted** (`-At '2026-10-05 21:00'`, exit 0; the cal file also has 19:30 and 2026-10-06 01:00, all exit 0):

```
NIGHT standby-ac: OK AC sleep timeout 0x00000000 (0 s)
NIGHT hibernate-ac: OK AC hibernate timeout 0x00000000 (0 s)
NIGHT power: OK battery status 2 (2 = AC; 3/6/7/8/9/11 accepted only with AC line online), AC line online
NIGHT reboot: OK CBS RebootPending absent, WU RebootRequired absent (PendingFileRenameOperations present, not gated)
NIGHT updates: OK [2026-10-05 20:30 .. 2026-10-06 02:00] active hours 15->6 cover; pause to 2026-10-14T13:41:25Z > At+5h (2026-10-05T23:00:00Z)
NIGHT GATES OK
```

Concerns:
- **Deviation from A2's literal `power` gate (flagged for the reviewer).** A2: "no battery, or BatteryStatus 2". This machine has a
  battery; Windows reports 6 (charging) or 3 (fully charged) on AC as well, so a literal gate could false-FAIL tonight after the
  battery drains and recharges. The script keeps every literal OK/FAIL and adds OK only for AC-connected charge states
  {3,6,7,8,9,11} when `GetSystemPowerStatus` independently reads the AC line online (cases 4b-4f). Reviewer may revert it
  to the literal rule, at the price of that false-FAIL risk.
- The pause is judged by `PauseUpdatesExpiryTime > At+5 h` only, as written; `PauseUpdatesStartTime` (2026-09-09 here) is not gated.
- The `updates` gate reads the registry, not the effective Windows Update policy (a Group Policy / MDM active-hours override
  would not show). Not checked tonight.
- Active hours are compared on local wall-clock hours (Turkey has no DST; a DST zone would need care across a change).
- `PendingFileRenameOperations` is present on this machine (not gated, per A2).

## What blocks tonight, and what is not done

- **Blocking gate not yet run:** cal (f) and `eq-b4-cal.mjs E\smoke-run-tmp --g S1Q04F,S1Q06F` need the Task 10 smoke and
  `F\smoke\smoke-rundir.mjs` first. Cal (a) passing is only the early warning on cue-era bytes.
- **Opus review READY** (A3 "Per task") is not done for any of the three; I have no subagent. Reviewer should read the `power`
  deviation above first.
- Unrelated files appeared in E while I worked (`P2-package.diff`, `P2-report.md`, `P2-review.md`): not mine, untouched.
- Nothing was written in MAIN, nothing committed. `instruments.sha256.txt` was not touched (A2.5: the controller appends the
  three shas, the cal files' shas and the review file name before first use on the run folder).


---

## Fix round 1 (2026-10-05, about 17:55 local)

Inputs: `tools-367-review.md` (eq-b4-cal CHANGES, window-eq APPROVE, night-gates CHANGES), `AMENDMENT-A4.md` (case (c'), power
gate), `A4-RECHECK.md` (m2, m4, m5, m6). Only the three tools, their three drivers and their cal files were touched in E; MAIN
was only read (`earlierQuestionArm.mjs`, `transcriptCleaner.ts`, the built dist module, the c2 builder); no model call, no app
start, no subagent. No prompt text was printed (the new cases print ids, counts and character offsets; the crash case proves a
canary string inside a corrupt prompts.json is not echoed). The machine's power and update settings were only read.

**Method.** Each new driver was run first against the saved old tool (red), then the tool was changed (green). Red counts, new
driver vs old tool: eq-b4-cal `CALIBRATION FAILED (29)`, window-eq `CALIBRATION FAILED (3)`, night-gates `CALIBRATION FAILED (38)`
(26 cases plus the anchors of the new checks). Honest note: for night-gates the new script text was drafted before the driver was
written; the red run is the finished driver against the saved old script. Every new check also has a mutant of the tool with the
check removed, and the targeted case must stop reading as expected (the tables below).

### New hashes

| file | sha256/12 | was | full sha256 (tools) |
|---|---|---|---|
| `eq-b4-cal.mjs` | `383b031e8319` | `ab5c37ecfbac` | `383b031e831928e073136cdd56b8062e631ce839eb6e6056501fe89b23114b8a` |
| `eq-b4-cal.cal.mjs` | `02307ee7bab9` | `6ae337f3732c` | |
| `eq-b4-cal.cal.txt` | `6adc96cc0a04` | `f6dc866a606a` | |
| `window-eq.mjs` | `ca664e741ad0` | `e93cb89ab1f9` | `ca664e741ad08bdf9a51b09367b3f59a8139690a899e755a2eadd77038480771` |
| `window-eq.cal.mjs` | `33c61f9b3af5` | `446437931c25` | |
| `window-eq.cal.txt` | `9f0ad0582c6a` | `a44d9807fd3d` | |
| `night-gates.ps1` (UTF-8 BOM kept, 0 non-ASCII bytes after it, ParseFile 0 errors) | `f134c428d373` | `88750f8aadc1` | `f134c428d37352616e6bb31c08ccbffeb60d81daa39306125d0b81addf200730` |
| `night-gates.cal.mjs` | `2e0b19fa9e8b` | (not recorded) | |
| `night-gates-cal.txt` = `night-gates.cal.txt` | `4398c31cae4b` | `cdd6436c27d1` | |

Results: eq-b4-cal `CALIBRATION PASSED (a-e2, g, h, R7, R8, R12, R13, R14, mf, crash, rb, c', c'', 9 checks x mutants, r, w; f pending the
smoke)`; window-eq `CALIBRATION PASSED (26 cases x 2 time zones, identical; 5 mutants flipped)`; night-gates `CALIBRATION PASSED`
(68 `=> PASS`, 0 `=> FAIL`, 17 mutants flipped, 0 did not).

### What changed, per finding

**eq-b4-cal.mjs**

| finding | change | case that flips without it |
|---|---|---|
| B-I1 / A3-RECHECK I2(c) | third output line `LABEL OUTSIDE --g <ids>` or `LABEL OUTSIDE --g NONE`: every id not in `--g` whose user text carries the LABEL (well-formed or not); exit 1 when non-empty | R12 (block in X and in non-G Y), R13 (malformed block in Y), mutant M-outside |
| B-I2 | header reworded: TRANSCRIPT checks ONLY that every transcript part is a fixed point of the app's renderer, i.e. only bytes the renderer could produce; bytes before the marker (the block included) are copied by the builder and not checked; it is blind to the strip itself. It no longer claims to prove the twins send flag-off bytes. Two blind-spot cases added and printed as KNOWN BLIND SPOT | (c') lowercase-for-lowercase swap, (c'') change in the pinned last line: both must read OK; mutant M-nostrip (the strip removed) must NOT flip (b) or (c) |
| A4 (c') + A4-RECHECK m5 | fixed swap rule in the driver: in a non-final role line, the first word of at least 6 letters has its 3rd letter replaced by `q` (`z` if it already is `q`); the new word must be in neither `transcriptCleaner`'s filler nor acknowledgement list and must not repeat a neighbour; on DIFF the driver tries the next candidate (up to 8) | candidate 1 read OK on cuesmoke, so no retry was needed; the driver checks at start that every list entry is still in `transcriptCleaner.ts` |
| A4-RECHECK m4 | `TRANSCRIPT UNCALIBRATED <n>; G-ids also failing: <ids>` when a non-G id fails and a G id fails too; exit stays 3 | R14, mutant M-galso |
| A4-RECHECK m6 | marker text before the LABEL is a printed class: `BLOCK FAIL <id> (marker-first marker=<n> label=<n>)`, numbers only; not a refusal | (mf), mutant M-markerfirst |
| B-m3 | leading separator required: the LABEL is first in the text or is preceded by exactly `\n\n` and not `\n\n\n` | R7 (`\n`), R8 (`\n\n\n`), mutant M-lead |
| B-m5 | the whole body is in try/catch: a crash prints `B4CAL CRASH: <class> ...` (message not echoed unless the error carries a string code) and exits 4 (0 OK, 1 FAIL, 2 refusal, 3 UNCALIBRATED, 4 crash) | (crash), mutant M-crash |
| B-m6 | refuses (exit 2) when `REPLAY_BREAK` is set in the environment, any value | (rb) with 1 and 0, mutant M-replay (reads `UNCALIBRATED 18` instead) |

Kept as is: the BLOCK length identity `+ 2` (mutant M-plus3 still flips (b)). Named, not changed (B-m1): once the split is non-null,
BLOCK's "no LABEL left", round-trip and `+ 2` clauses follow from `splitEarlierQuestion`'s construction; the round trip has power
only when the marker text occurs before the LABEL, which is exactly what (mf) exercises. **The limit to name in the next
amendment's section 9, beside the before-marker limit:** TRANSCRIPT cannot see a renderer-producible change, a lowercase-for-lowercase
swap in a window turn, a change in the pinned last line, or whether the strip ran at all.

Not exercised: `first === 0` branch of the separator clause; a crash from a missing dist module (only the corrupt-JSON crash was
driven); cal (f) (the smoke dir did not exist at my last run; B-m4, the smoke-ids comparison and its negative control, was not in
this round).

**window-eq.mjs**

| finding | change | case that flips without it |
|---|---|---|
| W-m1 | a run-dir that is not an existing directory is a usage error (exit 2, stderr `usage: ... (run-dir is not an existing directory)`), never UNREADABLE (exit 4); a missing or corrupt timeline inside an existing dir stays UNREADABLE | cases 25 (no such dir) and 26 (a file), mutant W-m1 |
| W-m2 | the three bound mutants moved into the driver, plus W1 (local getters in the `local=` display), run through all 26 cases in both zones | W1 flips 14 cases, all in the TZ=UTC pass only (the machine zone is +03:00, so the local getters equal the fixed offset there) |

**night-gates.ps1**

| finding | change | case that flips without it |
|---|---|---|
| N-I1 + A4-RECHECK m2 | `power` needs the AC line online in EVERY passing case, status 2 included. Statuses 2,3,6,7,8,9,11 all need it. An empty `Win32_Battery` result is "no battery" only when `GetSystemPowerStatus` BatteryFlag also says 128 (the deliberate desktop signal) and the line is online; a failed query (`-ErrorAction Stop` in try/catch) is FAIL | 4a (flag 128, online: OK), 4a1/4a2 (flag 1 or unknown: FAIL), 4a3/4a4 (offline/unknown: FAIL), 4g (query failed: FAIL), 4h/4i (status 2 offline/unknown: FAIL), 4j; mutants on the AC test, the query error and the flag |
| N-m1 | powercfg: exactly five `0x........` values, AC is `$hexes[3]`, else unreadable = FAIL; the parse is `Get-AcFromPowercfgText`, fed in calibration by `-PowercfgTextFile`; the reboot gate FAILs when `Component Based Servicing` or `WindowsUpdate\Auto Update` is missing | tx1-tx7 (saved real-shape text, AC edited, DC edited, 4 and 6 values, Turkish labels, empty); 5a/5b; mutants on count, index 0, index 4, and the parent check |
| N-m2 | the pause is the EARLIEST of PauseUpdatesExpiryTime, PauseQualityUpdatesEndTime, PauseFeatureUpdatesEndTime that are present (strict `>` At+5h; an unparseable present value = no pause) | 13b, 13c, 13d, 13e, 13f; mutant "Expiry only" |
| N-m3 | two printed `INFO` lines (policy NoAutoUpdate/AUOptions and which of eight override values are present; PausedQualityStatus/PausedFeatureStatus). Informational only: A4 does not make them a gate | 1, i1 (overrides present, all gates still OK); mutants remove either line |
| N-m4 | parameter `$AtText` renamed to `$At`; the driver scans the AST: exactly one parameter starts with "At" (case-insensitively) and it is `At` | the scan on a copy renamed back to `$AtText` reads FAIL |

`-FakeJson` schema changed: nine new required keys (`batteryFlag`, `rebootParentMissing`, `pauseQualityUpdatesEnd`,
`pauseFeatureUpdatesEnd`, `pausedQualityStatus`, `pausedFeatureStatus`, `policyNoAutoUpdate`, `policyAUOptions`, `policyOverrides`) and
`battery` also accepts `"error"`; the keys are listed in the script header. New calibration-only parameter `-PowercfgTextFile`.

**Real run, read-only** (`-At '2026-10-05 21:00'`, exit 0; the cal file also has 19:30 and 2026-10-06 01:00, all exit 0):

```
NIGHT standby-ac: OK AC sleep timeout 0x00000000 (0 s)
NIGHT hibernate-ac: OK AC hibernate timeout 0x00000000 (0 s)
NIGHT power: OK AC line online, battery status 2, BatteryFlag 0 (OK needs AC online and every status in 2,3,6,7,8,9,11, or no battery with BatteryFlag 128)
NIGHT reboot: OK CBS RebootPending absent, WU RebootRequired absent (PendingFileRenameOperations present, not gated)
NIGHT updates: OK [2026-10-05 20:30 .. 2026-10-06 02:00] active hours 15->6 cover; pause to 2026-10-14T13:41:25Z > At+5h (2026-10-05T23:00:00Z) [earliest of 3 value(s)]
NIGHT policy: INFO NoAutoUpdate=1 AUOptions=2; override values present: none (informational, not gated)
NIGHT pause-status: INFO PausedQualityStatus=1 PausedFeatureStatus=1 (informational, not gated)
NIGHT GATES OK
```

The cal file also records the real boundary check: the live `powercfg /q` text (5 hex values) fed through `-PowercfgTextFile`
reads the same `standby-ac` line as the live script (identical).

Not exercised (real-mode failure branches were driven by fakes only): a real WMI failure, a real missing parent key, a real
powercfg failure, a real policy override value present (none is on this machine; the INFO line printed the live
`NoAutoUpdate=1 AUOptions=2`). The real path for BatteryFlag 128 was never seen (this laptop reports 0).

### Unresolved

1. **eq-b4-cal exit 4 (crash) is new.** A4.4(b) lists 0, 1, 3, 2; the amendment must add 4 = "tool crashed, not a verdict".
2. **marker-first line still starts `BLOCK FAIL` and exits 1.** A4-RECHECK m6 says such an id is not 5d and must not make `eq-gsitting`
   refuse; `eq-gsitting` must therefore match `BLOCK FAIL` ids ignoring the ones annotated `(marker-first ...)`. Unbuilt, not mine.
3. **A third output line** (`LABEL OUTSIDE --g ...`) changes the A4.4(b) output description and every reader of the tool's stdout
   (the smoke step 5(i) must read it; any id on it = b4 not met = no flight, as the review states). The verdict mapping for a
   well-formed LABEL outside `--g` (a 1(e) question) vs a malformed one inside `G \ G_twin` (5d) still needs its amendment text.
4. **night-gates:** the FAIL-on-override rule of N-m3 (SetActiveHours, deadlines, SetDisablePauseUXAccess,
   AlwaysAutoRebootAtScheduledTime present = FAIL updates) was NOT built, because the assignment made these informational unless
   A4 says otherwise and A4 is silent; if the amendment wants it, it is one condition in the `updates` gate. The new INFO lines and
   the nine new `-FakeJson` keys also reach any script that parses the output or writes fakes (guard-eq, the precheck).
5. **Open, not in this round:** B-m4 (cal (f): `--smoke-ok` three-way equality and its negative control), N-m5 (quote the fake schema in
   the instruments note), the report's instruments sha record (`instruments.sha256.txt` untouched), and the Opus re-review of the new
   shas. `E\smoke-run-tmp` appeared at 17:50, after my last eq-b4-cal driver run (17:45); I did not touch it, so (f) is still unrun.

### Calibration tables (generated from the three cal files; the files hold the full output)

Every eq-b4-cal row prints a three-line reading (TRANSCRIPT | BLOCK | LABEL OUTSIDE). The KNOWN BLIND SPOT cases (c') and (c'')
are labelled as such in `eq-b4-cal.cal.txt` ("TRANSCRIPT OK although a transcript byte changed (the renderer reproduces it)");
the contrast line next to them points at case (c), which upper-cases one character of a non-final line and reads DIFF.

#### eq-b4-cal (cuesmoke folder, 19 ids, X = S1Q01F, Y = S1Q02)

| case | expected | actual | exit exp/act | verdict |
|---|---|---|---|---|
| (a) unmodified cuesmoke, --g '' | TRANSCRIPT OK 19/19 \| BLOCK NONE (no --g ids) \| LABEL OUTSIDE --g NONE | TRANSCRIPT OK 19/19 \| BLOCK NONE (no --g ids) \| LABEL OUTSIDE --g NONE | 0/0 | PASS |
| (b) X given a synthetic block via withEarlierQuestion, --g X | TRANSCRIPT OK 19/19 \| BLOCK OK 1/1 \| LABEL OUTSIDE --g NONE | TRANSCRIPT OK 19/19 \| BLOCK OK 1/1 \| LABEL OUTSIDE --g NONE | 0/0 | PASS |
| (c) as (b) + one NON-final transcript line of X: a lowercase letter upper-cased | TRANSCRIPT DIFF S1Q01F \| BLOCK OK 1/1 \| LABEL OUTSIDE --g NONE | TRANSCRIPT DIFF S1Q01F \| BLOCK OK 1/1 \| LABEL OUTSIDE --g NONE | 1/1 | PASS |
| (d) as (b) + the block's trailing \n\n reduced to \n | TRANSCRIPT OK 19/19 \| BLOCK FAIL S1Q01F \| LABEL OUTSIDE --g NONE | TRANSCRIPT OK 19/19 \| BLOCK FAIL S1Q01F \| LABEL OUTSIDE --g NONE | 1/1 | PASS |
| (e) as (b) + one NON-G id (Y) transcript part changed | TRANSCRIPT UNCALIBRATED 1 \| BLOCK OK 1/1 \| LABEL OUTSIDE --g NONE | TRANSCRIPT UNCALIBRATED 1 \| BLOCK OK 1/1 \| LABEL OUTSIDE --g NONE | 3/3 | PASS |
| (e2) no G, one id (Y) transcript part changed | TRANSCRIPT UNCALIBRATED 1 \| BLOCK NONE (no --g ids) \| LABEL OUTSIDE --g NONE | TRANSCRIPT UNCALIBRATED 1 \| BLOCK NONE (no --g ids) \| LABEL OUTSIDE --g NONE | 3/3 | PASS |
| (R12) well-formed block in X (--g X) AND in the non-G id Y | TRANSCRIPT OK 19/19 \| BLOCK OK 1/1 \| LABEL OUTSIDE --g S1Q02 | TRANSCRIPT OK 19/19 \| BLOCK OK 1/1 \| LABEL OUTSIDE --g S1Q02 | 1/1 | PASS |
| (R13) MALFORMED block (trailing \n only) in the non-G id Y, --g '' | TRANSCRIPT OK 19/19 \| BLOCK NONE (no --g ids) \| LABEL OUTSIDE --g S1Q02 | TRANSCRIPT OK 19/19 \| BLOCK NONE (no --g ids) \| LABEL OUTSIDE --g S1Q02 | 1/1 | PASS |
| (R7) as (b) with the LEADING separator before the block reduced to one \n | TRANSCRIPT OK 19/19 \| BLOCK FAIL S1Q01F \| LABEL OUTSIDE --g NONE | TRANSCRIPT OK 19/19 \| BLOCK FAIL S1Q01F \| LABEL OUTSIDE --g NONE | 1/1 | PASS |
| (R8) as (b) with the LEADING separator before the block raised to \n\n\n | TRANSCRIPT OK 19/19 \| BLOCK FAIL S1Q01F \| LABEL OUTSIDE --g NONE | TRANSCRIPT OK 19/19 \| BLOCK FAIL S1Q01F \| LABEL OUTSIDE --g NONE | 1/1 | PASS |
| (R14) as (c) AND the same change in the non-G id Y | TRANSCRIPT UNCALIBRATED 1; G-ids also failing: S1Q01F \| BLOCK OK 1/1 \| LABEL OUTSIDE --g NONE | TRANSCRIPT UNCALIBRATED 1; G-ids also failing: S1Q01F \| BLOCK OK 1/1 \| LABEL OUTSIDE --g NONE | 3/3 | PASS |
| (mf) synthetic: the marker text occurs BEFORE the LABEL (and once after it) | TRANSCRIPT DIFF S1Q01F \| BLOCK FAIL S1Q01F (marker-first marker=0 label=4401) \| LABEL OUTSIDE --g NONE | TRANSCRIPT DIFF S1Q01F \| BLOCK FAIL S1Q01F (marker-first marker=0 label=4401) \| LABEL OUTSIDE --g NONE | 1/1 | PASS |
| (crash) prompts.json is truncated JSON that contains a canary string | stderr "B4CAL CRASH: ..." without the canary, no stdout lines, exit 4 (not 1, 2 or 3), work folder removed | stderr "B4CAL CRASH: SyntaxError (message not echoed: it can carry prompt text) \| at JSON.parse (<anonymous>)", stdout lines 0, canary printed: false | /4 | PASS |
| (rb) REPLAY_BREAK=1 in the environment, case (b) | refusal naming REPLAY_BREAK on stderr, no stdout lines, exit 2 | stderr "B4CAL REFUSED: REPLAY_BREAK is set in the environment; unset it (it makes the builder corrupt every id)", stdout lines 0 | /2 | PASS |
| (rb) REPLAY_BREAK=0 in the environment, case (b) | refusal naming REPLAY_BREAK on stderr, no stdout lines, exit 2 | stderr "B4CAL REFUSED: REPLAY_BREAK is set in the environment; unset it (it makes the builder corrupt every id)", stdout lines 0 | /2 | PASS |
| (c') as (b) + a lowercase-for-lowercase swap: candidate 1 (line 0, word 2, offset 4422; 1 char changed) | TRANSCRIPT OK 19/19 \| BLOCK OK 1/1 \| LABEL OUTSIDE --g NONE | TRANSCRIPT OK 19/19 \| BLOCK OK 1/1 \| LABEL OUTSIDE --g NONE | 0/0 | PASS |
| (c'') as (b) + the PINNED last transcript line changed (a lowercase letter upper-cased; 1 char changed) | TRANSCRIPT OK 19/19 \| BLOCK OK 1/1 \| LABEL OUTSIDE --g NONE | TRANSCRIPT OK 19/19 \| BLOCK OK 1/1 \| LABEL OUTSIDE --g NONE | 0/0 | PASS |
| (g) --g names an id that carries NO block | TRANSCRIPT OK 19/19 \| BLOCK FAIL S1Q01F \| LABEL OUTSIDE --g NONE | TRANSCRIPT OK 19/19 \| BLOCK FAIL S1Q01F \| LABEL OUTSIDE --g NONE | 1/1 | PASS |
| (h) two blocks in X (strip refuses: not a single well-formed block) | TRANSCRIPT OK 19/19 \| BLOCK FAIL S1Q01F \| LABEL OUTSIDE --g NONE | TRANSCRIPT OK 19/19 \| BLOCK FAIL S1Q01F \| LABEL OUTSIDE --g NONE | 1/1 | PASS |

Other lines of that file (candidates tried for (c'), refusals, work folders, (f)):

```
Contrast: case (c) above changes one char of a NON-final line to upper case and reads TRANSCRIPT DIFF - so the two OK readings are not an artefact of a dead check.
(r) refusals: --g NOPE -> exit 2 "B4CAL REFUSED: --g id NOPE is not in prompts.json"; no --g -> exit 2; bare trailing --g -> exit 0 (= none)  => PASS
(w) work folders removed by the tool after runs (incl. the refusal and the crash): b4cal-tmp absent, b4cal-tmp-out absent
(f) NOT RUN: E\smoke-run-tmp does not exist yet (Task 10 smoke + F\smoke\smoke-rundir.mjs come first; A3 final list step 4).
    Re-run this driver then; it reads both and prints the comparison. (tools-367-review B-m4: still half-built, not in this round.)
CALIBRATION PASSED (a-e2, g, h, R7, R8, R12, R13, R14, mf, crash, rb, c', c'', 9 checks x mutants, r, w; f pending the smoke)
```

Mutants (a copy of the tool with ONE check removed; the targeted case must stop reading as expected):

| mutant | now reads | verdict |
|---|---|---|
| M-plus3: BLOCK length identity "+ 2" -> "+ 3", case (b) | TRANSCRIPT OK 19/19 \| BLOCK FAIL S1Q01F \| LABEL OUTSIDE --g NONE (exit 1)  | FLIPPED (calibrated) |
| M-outside: LABEL OUTSIDE detection removed, case (R12) | TRANSCRIPT OK 19/19 \| BLOCK OK 1/1 \| LABEL OUTSIDE --g NONE (exit 0)  | FLIPPED (calibrated) |
| M-outside (R13 form): same mutant, case (R13) | TRANSCRIPT OK 19/19 \| BLOCK NONE (no --g ids) \| LABEL OUTSIDE --g NONE (exit 0)  | FLIPPED (calibrated) |
| M-lead: leading-separator clause removed, case (R7) | TRANSCRIPT OK 19/19 \| BLOCK OK 1/1 \| LABEL OUTSIDE --g NONE (exit 0)  | FLIPPED (calibrated) |
| M-lead: same mutant, case (R8) | TRANSCRIPT OK 19/19 \| BLOCK OK 1/1 \| LABEL OUTSIDE --g NONE (exit 0)  | FLIPPED (calibrated) |
| M-galso: "G-ids also failing" removed, case (R14) | TRANSCRIPT UNCALIBRATED 1 \| BLOCK OK 1/1 \| LABEL OUTSIDE --g NONE (exit 3)  | FLIPPED (calibrated) |
| M-markerfirst: marker-first classification removed, case (mf) | TRANSCRIPT DIFF S1Q01F \| BLOCK FAIL S1Q01F \| LABEL OUTSIDE --g NONE (exit 1)  | FLIPPED (calibrated) |
| M-crash: the crash exit code 4 -> 1 (a crash reads like a FAIL), case (crash) | exit 1  | FLIPPED (calibrated) |
| M-replay: the REPLAY_BREAK refusal removed, REPLAY_BREAK=1 on case (b) | TRANSCRIPT UNCALIBRATED 18; G-ids also failing: S1Q01F \| BLOCK OK 1/1 \| LABEL OUTSIDE --g NONE (exit 3)  | FLIPPED (calibrated) |
| M-nostrip (tools-367-review M1): the strip step removed, case (b) - must stay OK | TRANSCRIPT OK 19/19 \| BLOCK OK 1/1 \| LABEL OUTSIDE --g NONE (exit 0)  | UNCHANGED, as the known blind spot predicts (PASS) |
| M-nostrip: same mutant, case (c) - must stay DIFF | TRANSCRIPT DIFF S1Q01F \| BLOCK OK 1/1 \| LABEL OUTSIDE --g NONE (exit 1)  | UNCHANGED, as the known blind spot predicts (PASS) |

#### window-eq (every case run twice: machine zone -180 min, TZ=UTC 0 min; identical output required)

| # | case | actual (machine zone) | exit | TZ=UTC |
|---|---|---|---|---|
| 1 | 16:29:59.999Z out (just before) | WINDOW-EQ startedAt=2026-10-05T16:29:59.999Z local=2026-10-05 19:29:59+03 OUT OF WINDOW (cannot PASS...) | 3 | identical, PASS |
| 2 | 16:30:00.000Z in (exact lower bound) | WINDOW-EQ startedAt=2026-10-05T16:30:00.000Z local=2026-10-05 19:30:00+03 IN WINDOW 2026-10-05 19:30 .. 2026-10-06 01:30 | 0 | identical, PASS |
| 3 | 20:59Z = 23:59 local in | WINDOW-EQ startedAt=2026-10-05T20:59:00.000Z local=2026-10-05 23:59:00+03 IN WINDOW 2026-10-05 19:30 .. 2026-10-06 01:30 | 0 | identical, PASS |
| 4 | 21:00Z = 00:00 on the 6th local in (midnight crossing) | WINDOW-EQ startedAt=2026-10-05T21:00:00.000Z local=2026-10-06 00:00:00+03 IN WINDOW 2026-10-05 19:30 .. 2026-10-06 01:30 | 0 | identical, PASS |
| 5 | 22:30:00.000Z in (A3 exact upper bound) | WINDOW-EQ startedAt=2026-10-05T22:30:00.000Z local=2026-10-06 01:30:00+03 IN WINDOW 2026-10-05 19:30 .. 2026-10-06 01:30 | 0 | identical, PASS |
| 6 | 22:30:00.001Z out (A3 one ms past) | WINDOW-EQ startedAt=2026-10-05T22:30:00.001Z local=2026-10-06 01:30:00+03 OUT OF WINDOW (cannot PASS...) | 3 | identical, PASS |
| 7 | 22:30:59.999Z out (A2 said in; A3 m14 wins) | WINDOW-EQ startedAt=2026-10-05T22:30:59.999Z local=2026-10-06 01:30:59+03 OUT OF WINDOW (cannot PASS...) | 3 | identical, PASS |
| 8 | 22:31:00.000Z out | WINDOW-EQ startedAt=2026-10-05T22:31:00.000Z local=2026-10-06 01:31:00+03 OUT OF WINDOW (cannot PASS...) | 3 | identical, PASS |
| 9 | 2026-10-04T21:30:00Z (00:30 on the 5th) out | WINDOW-EQ startedAt=2026-10-04T21:30:00.000Z local=2026-10-05 00:30:00+03 OUT OF WINDOW (cannot PASS...) | 3 | identical, PASS |
| 10 | offset input 19:30:00.000+03:00 in (same instant as 16:30Z) | WINDOW-EQ startedAt=2026-10-05T16:30:00.000Z local=2026-10-05 19:30:00+03 IN WINDOW 2026-10-05 19:30 .. 2026-10-06 01:30 | 0 | identical, PASS |
| 11 | offset input 19:29:59.999+03:00 out | WINDOW-EQ startedAt=2026-10-05T16:29:59.999Z local=2026-10-05 19:29:59+03 OUT OF WINDOW (cannot PASS...) | 3 | identical, PASS |
| 12 | offset input 01:30:00.000+03:00 on the 6th in | WINDOW-EQ startedAt=2026-10-05T22:30:00.000Z local=2026-10-06 01:30:00+03 IN WINDOW 2026-10-05 19:30 .. 2026-10-06 01:30 | 0 | identical, PASS |
| 13 | offset input 01:30:00.001+03:00 on the 6th out | WINDOW-EQ startedAt=2026-10-05T22:30:00.001Z local=2026-10-06 01:30:00+03 OUT OF WINDOW (cannot PASS...) | 3 | identical, PASS |
| 14 | s50m run folder (2026-09-22) -> out | WINDOW-EQ startedAt=2026-09-22T07:14:07.873Z local=2026-09-22 10:14:07+03 OUT OF WINDOW (cannot PASS...) | 3 | identical, PASS |
| 15 | copy of s50m timeline WITHOUT startedAt -> unreadable | WINDOW-EQ UNREADABLE (startedAt missing or unparseable) - cannot PASS | 4 | identical, PASS |
| 16 | run dir with no timeline file -> unreadable | WINDOW-EQ UNREADABLE (startedAt missing or unparseable) - cannot PASS | 4 | identical, PASS |
| 17 | run dir with a corrupt timeline -> unreadable | WINDOW-EQ UNREADABLE (startedAt missing or unparseable) - cannot PASS | 4 | identical, PASS |
| 18 | impossible date 2026-02-30 -> unreadable (Date would roll it to Mar 2) | WINDOW-EQ UNREADABLE (startedAt missing or unparseable) - cannot PASS | 4 | identical, PASS |
| 19 | no zone (machine-TZ dependent) -> unreadable | WINDOW-EQ UNREADABLE (startedAt missing or unparseable) - cannot PASS | 4 | identical, PASS |
| 20 | 4 fraction digits (Date would truncate 22:30:00.0009 into the window) -> unreadable | WINDOW-EQ UNREADABLE (startedAt missing or unparseable) - cannot PASS | 4 | identical, PASS |
| 21 | 24:00 -> unreadable | WINDOW-EQ UNREADABLE (startedAt missing or unparseable) - cannot PASS | 4 | identical, PASS |
| 22 | junk -> unreadable | WINDOW-EQ UNREADABLE (startedAt missing or unparseable) - cannot PASS | 4 | identical, PASS |
| 23 | no args -> usage exit 2 | usage: node window-eq.mjs <run-dir> \| --at <ISO instant> | 2 | identical, PASS |
| 24 | --at without a value -> usage exit 2 | usage: node window-eq.mjs <run-dir> \| --at <ISO instant> | 2 | identical, PASS |
| 25 | W-m1: a mistyped run-dir (no such directory) -> usage exit 2, NOT unreadable exit 4 | usage: node window-eq.mjs <run-dir> \| --at <ISO instant>  (run-dir is not an existing directory) | 2 | identical, PASS |
| 26 | W-m1: a FILE where the run-dir should be -> usage exit 2 | usage: node window-eq.mjs <run-dir> \| --at <ISO instant>  (run-dir is not an existing directory) | 2 | identical, PASS |

Mutants (ONE edit in a copy, all 26 cases in both zones; the targeted case must flip):

| mutant | machine-zone pass flips | TZ=UTC pass flips | verdict |
|---|---|---|---|
| W-upper: upper bound exclusive (t <= HI -> t < HI) | c5,c12 | c5,c12 | targets c5: FLIPPED (calibrated) |
| W-lower: lower bound exclusive (t >= LO -> t > LO) | c2,c10 | c2,c10 | targets c2: FLIPPED (calibrated) |
| W-A2: A2's old +59.999 s tolerance (t <= HI -> t <= HI + 59999) | c6,c7,c13 | c6,c7,c13 | targets c6,c7: FLIPPED (calibrated) |
| W1: local-time getters in the local= display (no fixed +03:00) | none | c1,c2,c3,c4,c5,c6,c7,c8,c9,c10,c11,c12,c13,c14 | targets c1,c5: FLIPPED (calibrated) |
| W-m1: the run-dir existence check removed (a typo reads UNREADABLE again) | c25,c26 | c25,c26 | targets c25,c26: FLIPPED (calibrated) |

Last line: `CALIBRATION PASSED (26 cases x 2 time zones, identical; 5 mutants flipped)`

#### night-gates (At 2026-10-05 21:00 unless stated; expected = the five gate verdicts and the last line)

| case [At] | expected | actual (gate verdicts, last line) | exit | verdict |
|---|---|---|---|---|
| 1 all-good fake (+ both INFO lines) [2026-10-05 21:00] | standby-ac=OK hibernate-ac=OK power=OK reboot=OK updates=OK \| NIGHT GATES OK \| lines present: 2 | standby-ac=OK hibernate-ac=OK power=OK reboot=OK updates=OK; NIGHT GATES OK; INFO lines 2 | 0/0 | PASS |
| 2 standby 0x384 (900 s) -> FAIL standby-ac [2026-10-05 21:00] | standby-ac=FAIL hibernate-ac=OK power=OK reboot=OK updates=OK \| NIGHT GATES FAILED (1): standby-ac | standby-ac=FAIL hibernate-ac=OK power=OK reboot=OK updates=OK; NIGHT GATES FAILED (1): standby-ac; INFO lines 2 | 1/1 | PASS |
| 3 hibernate nonzero (7200 s) -> FAIL hibernate-ac [2026-10-05 21:00] | standby-ac=OK hibernate-ac=FAIL power=OK reboot=OK updates=OK \| NIGHT GATES FAILED (1): hibernate-ac | standby-ac=OK hibernate-ac=FAIL power=OK reboot=OK updates=OK; NIGHT GATES FAILED (1): hibernate-ac; INFO lines 2 | 1/1 | PASS |
| 4 BatteryStatus 1 (discharging), AC line offline -> FAIL power [2026-10-05 21:00] | standby-ac=OK hibernate-ac=OK power=FAIL reboot=OK updates=OK \| NIGHT GATES FAILED (1): power | standby-ac=OK hibernate-ac=OK power=FAIL reboot=OK updates=OK; NIGHT GATES FAILED (1): power; INFO lines 2 | 1/1 | PASS |
| 4a NO battery (Win32_Battery empty) + BatteryFlag 128 + AC online -> OK power (the deliberate desktop signal) [2026-10-05 21:00] | standby-ac=OK hibernate-ac=OK power=OK reboot=OK updates=OK \| NIGHT GATES OK | standby-ac=OK hibernate-ac=OK power=OK reboot=OK updates=OK; NIGHT GATES OK; INFO lines 2 | 0/0 | PASS |
| 4a1 no Win32_Battery instance but BatteryFlag 1 (OS reports a battery), AC online -> FAIL power (empty query is not "no battery") [2026-10-05 21:00] | standby-ac=OK hibernate-ac=OK power=FAIL reboot=OK updates=OK \| NIGHT GATES FAILED (1): power | standby-ac=OK hibernate-ac=OK power=FAIL reboot=OK updates=OK; NIGHT GATES FAILED (1): power; INFO lines 2 | 1/1 | PASS |
| 4a2 no Win32_Battery instance, BatteryFlag unknown (null), AC online -> FAIL power [2026-10-05 21:00] | standby-ac=OK hibernate-ac=OK power=FAIL reboot=OK updates=OK \| NIGHT GATES FAILED (1): power | standby-ac=OK hibernate-ac=OK power=FAIL reboot=OK updates=OK; NIGHT GATES FAILED (1): power; INFO lines 2 | 1/1 | PASS |
| 4a3 no battery (flag 128) with AC line OFFLINE -> FAIL power (N-I1 C1) [2026-10-05 21:00] | standby-ac=OK hibernate-ac=OK power=FAIL reboot=OK updates=OK \| NIGHT GATES FAILED (1): power | standby-ac=OK hibernate-ac=OK power=FAIL reboot=OK updates=OK; NIGHT GATES FAILED (1): power; INFO lines 2 | 1/1 | PASS |
| 4a4 no battery (flag 128) with AC line UNKNOWN -> FAIL power [2026-10-05 21:00] | standby-ac=OK hibernate-ac=OK power=FAIL reboot=OK updates=OK \| NIGHT GATES FAILED (1): power | standby-ac=OK hibernate-ac=OK power=FAIL reboot=OK updates=OK; NIGHT GATES FAILED (1): power; INFO lines 2 | 1/1 | PASS |
| 4b BatteryStatus 6 (charging) with AC line online -> OK power [2026-10-05 21:00] | standby-ac=OK hibernate-ac=OK power=OK reboot=OK updates=OK \| NIGHT GATES OK | standby-ac=OK hibernate-ac=OK power=OK reboot=OK updates=OK; NIGHT GATES OK; INFO lines 2 | 0/0 | PASS |
| 4c BatteryStatus 6 with AC line offline -> FAIL power [2026-10-05 21:00] | standby-ac=OK hibernate-ac=OK power=FAIL reboot=OK updates=OK \| NIGHT GATES FAILED (1): power | standby-ac=OK hibernate-ac=OK power=FAIL reboot=OK updates=OK; NIGHT GATES FAILED (1): power; INFO lines 2 | 1/1 | PASS |
| 4d BatteryStatus 3 (fully charged) with AC line online -> OK power [2026-10-05 21:00] | standby-ac=OK hibernate-ac=OK power=OK reboot=OK updates=OK \| NIGHT GATES OK | standby-ac=OK hibernate-ac=OK power=OK reboot=OK updates=OK; NIGHT GATES OK; INFO lines 2 | 0/0 | PASS |
| 4e BatteryStatus 5 (low) even with AC line online -> FAIL power [2026-10-05 21:00] | standby-ac=OK hibernate-ac=OK power=FAIL reboot=OK updates=OK \| NIGHT GATES FAILED (1): power | standby-ac=OK hibernate-ac=OK power=FAIL reboot=OK updates=OK; NIGHT GATES FAILED (1): power; INFO lines 2 | 1/1 | PASS |
| 4f BatteryStatus 1 even with AC line online -> FAIL power (only 2 / charge states) [2026-10-05 21:00] | standby-ac=OK hibernate-ac=OK power=FAIL reboot=OK updates=OK \| NIGHT GATES FAILED (1): power | standby-ac=OK hibernate-ac=OK power=FAIL reboot=OK updates=OK; NIGHT GATES FAILED (1): power; INFO lines 2 | 1/1 | PASS |
| 4g Win32_Battery query FAILED (battery "error"), BatteryFlag 128, AC online -> FAIL power (A4-RECHECK m2) [2026-10-05 21:00] | standby-ac=OK hibernate-ac=OK power=FAIL reboot=OK updates=OK \| NIGHT GATES FAILED (1): power | standby-ac=OK hibernate-ac=OK power=FAIL reboot=OK updates=OK; NIGHT GATES FAILED (1): power; INFO lines 2 | 1/1 | PASS |
| 4h BatteryStatus 2 with AC line OFFLINE -> FAIL power (A4.3b; N-I1 C2; flips the old build) [2026-10-05 21:00] | standby-ac=OK hibernate-ac=OK power=FAIL reboot=OK updates=OK \| NIGHT GATES FAILED (1): power | standby-ac=OK hibernate-ac=OK power=FAIL reboot=OK updates=OK; NIGHT GATES FAILED (1): power; INFO lines 2 | 1/1 | PASS |
| 4i BatteryStatus 2 with AC line UNKNOWN -> FAIL power [2026-10-05 21:00] | standby-ac=OK hibernate-ac=OK power=FAIL reboot=OK updates=OK \| NIGHT GATES FAILED (1): power | standby-ac=OK hibernate-ac=OK power=FAIL reboot=OK updates=OK; NIGHT GATES FAILED (1): power; INFO lines 2 | 1/1 | PASS |
| 4j two batteries [6,1], AC online -> FAIL power (every status must be acceptable) [2026-10-05 21:00] | standby-ac=OK hibernate-ac=OK power=FAIL reboot=OK updates=OK \| NIGHT GATES FAILED (1): power | standby-ac=OK hibernate-ac=OK power=FAIL reboot=OK updates=OK; NIGHT GATES FAILED (1): power; INFO lines 2 | 1/1 | PASS |
| 4k two batteries [2,6], AC online -> OK power [2026-10-05 21:00] | standby-ac=OK hibernate-ac=OK power=OK reboot=OK updates=OK \| NIGHT GATES OK | standby-ac=OK hibernate-ac=OK power=OK reboot=OK updates=OK; NIGHT GATES OK; INFO lines 2 | 0/0 | PASS |
| 5 CBS RebootPending -> FAIL reboot [2026-10-05 21:00] | standby-ac=OK hibernate-ac=OK power=OK reboot=FAIL updates=OK \| NIGHT GATES FAILED (1): reboot | standby-ac=OK hibernate-ac=OK power=OK reboot=FAIL updates=OK; NIGHT GATES FAILED (1): reboot; INFO lines 2 | 1/1 | PASS |
| 5a CBS parent key missing -> FAIL reboot (N-m1: a path typo must not read as "absent") [2026-10-05 21:00] | standby-ac=OK hibernate-ac=OK power=OK reboot=FAIL updates=OK \| NIGHT GATES FAILED (1): reboot \| lines present: 1 | standby-ac=OK hibernate-ac=OK power=OK reboot=FAIL updates=OK; NIGHT GATES FAILED (1): reboot; INFO lines 2 | 1/1 | PASS |
| 5b WU Auto Update parent key missing -> FAIL reboot [2026-10-05 21:00] | standby-ac=OK hibernate-ac=OK power=OK reboot=FAIL updates=OK \| NIGHT GATES FAILED (1): reboot | standby-ac=OK hibernate-ac=OK power=OK reboot=FAIL updates=OK; NIGHT GATES FAILED (1): reboot; INFO lines 2 | 1/1 | PASS |
| 6 WU RebootRequired ONLY (A3 m13) -> FAIL reboot [2026-10-05 21:00] | standby-ac=OK hibernate-ac=OK power=OK reboot=FAIL updates=OK \| NIGHT GATES FAILED (1): reboot | standby-ac=OK hibernate-ac=OK power=OK reboot=FAIL updates=OK; NIGHT GATES FAILED (1): reboot; INFO lines 2 | 1/1 | PASS |
| 6a PendingFileRenameOperations only -> OK (printed, not gated) [2026-10-05 21:00] | standby-ac=OK hibernate-ac=OK power=OK reboot=OK updates=OK \| NIGHT GATES OK | standby-ac=OK hibernate-ac=OK power=OK reboot=OK updates=OK; NIGHT GATES OK; INFO lines 2 | 0/0 | PASS |
| 7 active 8->17, no pause, At 21:00 -> FAIL updates [2026-10-05 21:00] | standby-ac=OK hibernate-ac=OK power=OK reboot=OK updates=FAIL \| NIGHT GATES FAILED (1): updates | standby-ac=OK hibernate-ac=OK power=OK reboot=OK updates=FAIL; NIGHT GATES FAILED (1): updates; INFO lines 2 | 1/1 | PASS |
| 8 active 8->17 + pause to 2026-10-07 (PauseUpdatesExpiryTime only) -> OK updates [2026-10-05 21:00] | standby-ac=OK hibernate-ac=OK power=OK reboot=OK updates=OK \| NIGHT GATES OK | standby-ac=OK hibernate-ac=OK power=OK reboot=OK updates=OK; NIGHT GATES OK; INFO lines 2 | 0/0 | PASS |
| 9 active 18->6, At 2026-10-06 01:00 -> OK (06:00 inclusive) [2026-10-06 01:00] | standby-ac=OK hibernate-ac=OK power=OK reboot=OK updates=OK \| NIGHT GATES OK | standby-ac=OK hibernate-ac=OK power=OK reboot=OK updates=OK; NIGHT GATES OK; INFO lines 2 | 0/0 | PASS |
| 10 active 18->5, same At -> FAIL updates [2026-10-06 01:00] | standby-ac=OK hibernate-ac=OK power=OK reboot=OK updates=FAIL \| NIGHT GATES FAILED (1): updates | standby-ac=OK hibernate-ac=OK power=OK reboot=OK updates=FAIL; NIGHT GATES FAILED (1): updates; INFO lines 2 | 1/1 | PASS |
| 11 no ActiveHours values, no pause (A3 m13) -> FAIL updates [2026-10-05 21:00] | standby-ac=OK hibernate-ac=OK power=OK reboot=OK updates=FAIL \| NIGHT GATES FAILED (1): updates | standby-ac=OK hibernate-ac=OK power=OK reboot=OK updates=FAIL; NIGHT GATES FAILED (1): updates; INFO lines 2 | 1/1 | PASS |
| 12 no ActiveHours values + pause past At+5h (A3 m13) -> OK updates [2026-10-05 21:00] | standby-ac=OK hibernate-ac=OK power=OK reboot=OK updates=OK \| NIGHT GATES OK | standby-ac=OK hibernate-ac=OK power=OK reboot=OK updates=OK; NIGHT GATES OK; INFO lines 2 | 0/0 | PASS |
| 12a only ActiveHoursStart missing, no pause -> FAIL updates [2026-10-05 21:00] | standby-ac=OK hibernate-ac=OK power=OK reboot=OK updates=FAIL \| NIGHT GATES FAILED (1): updates | standby-ac=OK hibernate-ac=OK power=OK reboot=OK updates=FAIL; NIGHT GATES FAILED (1): updates; INFO lines 2 | 1/1 | PASS |
| 13 pause expiry == At+5h exactly (2026-10-05T23:00:00Z), active 8->17 -> FAIL (must be strictly greater) [2026-10-05 21:00] | standby-ac=OK hibernate-ac=OK power=OK reboot=OK updates=FAIL \| NIGHT GATES FAILED (1): updates | standby-ac=OK hibernate-ac=OK power=OK reboot=OK updates=FAIL; NIGHT GATES FAILED (1): updates; INFO lines 2 | 1/1 | PASS |
| 13a pause expiry At+5h+1 s (2026-10-05T23:00:01Z), active 8->17 -> OK [2026-10-05 21:00] | standby-ac=OK hibernate-ac=OK power=OK reboot=OK updates=OK \| NIGHT GATES OK | standby-ac=OK hibernate-ac=OK power=OK reboot=OK updates=OK; NIGHT GATES OK; INFO lines 2 | 0/0 | PASS |
| 13b PauseUpdatesExpiryTime far, PauseQualityUpdatesEndTime == At+5h exactly, active 8->17 -> FAIL (N-m2: the EARLIEST of the three counts) [2026-10-05 21:00] | standby-ac=OK hibernate-ac=OK power=OK reboot=OK updates=FAIL \| NIGHT GATES FAILED (1): updates | standby-ac=OK hibernate-ac=OK power=OK reboot=OK updates=FAIL; NIGHT GATES FAILED (1): updates; INFO lines 2 | 1/1 | PASS |
| 13c Expiry far, PauseFeatureUpdatesEndTime At+1h, active 8->17 -> FAIL [2026-10-05 21:00] | standby-ac=OK hibernate-ac=OK power=OK reboot=OK updates=FAIL \| NIGHT GATES FAILED (1): updates | standby-ac=OK hibernate-ac=OK power=OK reboot=OK updates=FAIL; NIGHT GATES FAILED (1): updates; INFO lines 2 | 1/1 | PASS |
| 13d all three far, active 8->17 -> OK [2026-10-05 21:00] | standby-ac=OK hibernate-ac=OK power=OK reboot=OK updates=OK \| NIGHT GATES OK | standby-ac=OK hibernate-ac=OK power=OK reboot=OK updates=OK; NIGHT GATES OK; INFO lines 2 | 0/0 | PASS |
| 13e only PauseQualityUpdatesEndTime present (At+5h+1 s), active 8->17 -> OK (whichever are present) [2026-10-05 21:00] | standby-ac=OK hibernate-ac=OK power=OK reboot=OK updates=OK \| NIGHT GATES OK | standby-ac=OK hibernate-ac=OK power=OK reboot=OK updates=OK; NIGHT GATES OK; INFO lines 2 | 0/0 | PASS |
| 13f Expiry far but PauseFeatureUpdatesEndTime unparseable, active 8->17 -> FAIL [2026-10-05 21:00] | standby-ac=OK hibernate-ac=OK power=OK reboot=OK updates=FAIL \| NIGHT GATES FAILED (1): updates | standby-ac=OK hibernate-ac=OK power=OK reboot=OK updates=FAIL; NIGHT GATES FAILED (1): updates; INFO lines 2 | 1/1 | PASS |
| 14 active 19->6, At 19:30 (window starts 19:00 = active start) -> OK (inclusive) [2026-10-05 19:30] | standby-ac=OK hibernate-ac=OK power=OK reboot=OK updates=OK \| NIGHT GATES OK | standby-ac=OK hibernate-ac=OK power=OK reboot=OK updates=OK; NIGHT GATES OK; INFO lines 2 | 0/0 | PASS |
| 14a active 20->6, At 19:30 -> FAIL updates [2026-10-05 19:30] | standby-ac=OK hibernate-ac=OK power=OK reboot=OK updates=FAIL \| NIGHT GATES FAILED (1): updates | standby-ac=OK hibernate-ac=OK power=OK reboot=OK updates=FAIL; NIGHT GATES FAILED (1): updates; INFO lines 2 | 1/1 | PASS |
| 15 active 15->1, At 20:00 (window ends 01:00 = active end) -> OK (inclusive) [2026-10-05 20:00] | standby-ac=OK hibernate-ac=OK power=OK reboot=OK updates=OK \| NIGHT GATES OK | standby-ac=OK hibernate-ac=OK power=OK reboot=OK updates=OK; NIGHT GATES OK; INFO lines 2 | 0/0 | PASS |
| 15a active 15->0, At 20:00 -> FAIL updates [2026-10-05 20:00] | standby-ac=OK hibernate-ac=OK power=OK reboot=OK updates=FAIL \| NIGHT GATES FAILED (1): updates | standby-ac=OK hibernate-ac=OK power=OK reboot=OK updates=FAIL; NIGHT GATES FAILED (1): updates; INFO lines 2 | 1/1 | PASS |
| 16 two failures: standby + CBS reboot [2026-10-05 21:00] | standby-ac=FAIL hibernate-ac=OK power=OK reboot=FAIL updates=OK \| NIGHT GATES FAILED (2): standby-ac, reboot | standby-ac=FAIL hibernate-ac=OK power=OK reboot=FAIL updates=OK; NIGHT GATES FAILED (2): standby-ac, reboot; INFO lines 2 | 1/1 | PASS |
| 17 all five failing [2026-10-05 21:00] | standby-ac=FAIL hibernate-ac=FAIL power=FAIL reboot=FAIL updates=FAIL \| NIGHT GATES FAILED (5): standby-ac, hibernate-ac, power, reboot, updates | standby-ac=FAIL hibernate-ac=FAIL power=FAIL reboot=FAIL updates=FAIL; NIGHT GATES FAILED (5): standby-ac, hibernate-ac, power, reboot, updates; INFO lines 2 | 1/1 | PASS |
| i1 policy override value present (SetActiveHours), NoAutoUpdate/AUOptions absent -> still all OK; the INFO lines say so (N-m3: informational) [2026-10-05 21:00] | standby-ac=OK hibernate-ac=OK power=OK reboot=OK updates=OK \| NIGHT GATES OK \| lines present: 2 | standby-ac=OK hibernate-ac=OK power=OK reboot=OK updates=OK; NIGHT GATES OK; INFO lines 2 | 0/0 | PASS |
| tx1 saved powercfg text, AC 0 / DC 0 -> OK both sleep gates [2026-10-05 21:00] | standby-ac=OK hibernate-ac=OK power=OK reboot=OK updates=OK \| NIGHT GATES OK \| lines present: 1 | standby-ac=OK hibernate-ac=OK power=OK reboot=OK updates=OK; NIGHT GATES OK; INFO lines 2 | 0/0 | PASS |
| tx2 saved text with AC edited to 0x00000384 -> FAIL standby-ac and hibernate-ac (the AC value, the 4th hex) [2026-10-05 21:00] | standby-ac=FAIL hibernate-ac=FAIL power=OK reboot=OK updates=OK \| NIGHT GATES FAILED (2): standby-ac, hibernate-ac \| lines present: 1 | standby-ac=FAIL hibernate-ac=FAIL power=OK reboot=OK updates=OK; NIGHT GATES FAILED (2): standby-ac, hibernate-ac; INFO lines 2 | 1/1 | PASS |
| tx3 saved text with AC 0 and DC edited to 0x00000384 -> OK (DC is not AC) [2026-10-05 21:00] | standby-ac=OK hibernate-ac=OK power=OK reboot=OK updates=OK \| NIGHT GATES OK | standby-ac=OK hibernate-ac=OK power=OK reboot=OK updates=OK; NIGHT GATES OK; INFO lines 2 | 0/0 | PASS |
| tx4 saved text with the "increment" line missing (4 hex values) -> FAIL both (not exactly five = unreadable) [2026-10-05 21:00] | standby-ac=FAIL hibernate-ac=FAIL power=OK reboot=OK updates=OK \| NIGHT GATES FAILED (2): standby-ac, hibernate-ac \| lines present: 1 | standby-ac=FAIL hibernate-ac=FAIL power=OK reboot=OK updates=OK; NIGHT GATES FAILED (2): standby-ac, hibernate-ac; INFO lines 2 | 1/1 | PASS |
| tx5 saved text with a 6th hex value (an extra Minimum line) -> FAIL both [2026-10-05 21:00] | standby-ac=FAIL hibernate-ac=FAIL power=OK reboot=OK updates=OK \| NIGHT GATES FAILED (2): standby-ac, hibernate-ac | standby-ac=FAIL hibernate-ac=FAIL power=OK reboot=OK updates=OK; NIGHT GATES FAILED (2): standby-ac, hibernate-ac; INFO lines 2 | 1/1 | PASS |
| tx6 Turkish-labelled text (localised), AC 0x00000384 -> FAIL both (the parse is label-independent) [2026-10-05 21:00] | standby-ac=FAIL hibernate-ac=FAIL power=OK reboot=OK updates=OK \| NIGHT GATES FAILED (2): standby-ac, hibernate-ac \| lines present: 1 | standby-ac=FAIL hibernate-ac=FAIL power=OK reboot=OK updates=OK; NIGHT GATES FAILED (2): standby-ac, hibernate-ac; INFO lines 2 | 1/1 | PASS |
| tx7 empty text -> FAIL both (unreadable) [2026-10-05 21:00] | standby-ac=FAIL hibernate-ac=FAIL power=OK reboot=OK updates=OK \| NIGHT GATES FAILED (2): standby-ac, hibernate-ac | standby-ac=FAIL hibernate-ac=FAIL power=OK reboot=OK updates=OK; NIGHT GATES FAILED (2): standby-ac, hibernate-ac; INFO lines 2 | 1/1 | PASS |

Header checks, refusals, mutants and the real-machine reading (as written to the file):

```
UTF-8 BOM present; ParseFile errors 0 (expected 0); non-ASCII bytes after the BOM 0
read-only scan: mutating-verb matches 0 (expected 0); every powercfg call's first argument: /q (expected only /q)
parameter names: At, FakeJson, PowercfgTextFile; names starting with "At" (case-insensitively): At (expected exactly "At", N-m4)  => PASS
machine zone for At: Europe/Istanbul, offset 3 h (the pause boundary cases derive their instants from it)
Refusals (exit 2, no gate lines):
  bad -At "garbage": exit 2, first line "NIGHT usage error: -At must be a valid 'yyyy-MM-dd HH:mm' (got 'garbage')" => PASS
  bad -At "2026-10-05 25:00": exit 2, first line "NIGHT usage error: -At must be a valid 'yyyy-MM-dd HH:mm' (got '2026-10-05 25:00')" => PASS
  bad -At "2026-10-5 21:00" (not zero padded): exit 2, first line "NIGHT usage error: -At must be a valid 'yyyy-MM-dd HH:mm' (got '2026-10-5 21:00')" => PASS
  bad -At "2026-02-30 21:00": exit 2, first line "NIGHT usage error: -At must be a valid 'yyyy-MM-dd HH:mm' (got '2026-02-30 21:00')" => PASS
  no -At at all: exit 2, first line "NIGHT usage error: -At must be a valid 'yyyy-MM-dd HH:mm' (got '')" => PASS
  -FakeJson file missing: exit 2, first line "NIGHT usage error: -FakeJson file not found" => PASS
  -PowercfgTextFile missing: exit 2, first line "NIGHT usage error: -PowercfgTextFile not found" => PASS
  -FakeJson lacks key rebootRequiredWu: exit 2, first line "NIGHT usage error: -FakeJson lacks key 'rebootRequiredWu' (a fake replaces every reading)" => PASS
  -FakeJson lacks key batteryFlag: exit 2, first line "NIGHT usage error: -FakeJson lacks key 'batteryFlag' (a fake replaces every reading)" => PASS
  -FakeJson lacks key rebootParentMissing: exit 2, first line "NIGHT usage error: -FakeJson lacks key 'rebootParentMissing' (a fake replaces every reading)" => PASS
  -FakeJson lacks key pauseQualityUpdatesEnd: exit 2, first line "NIGHT usage error: -FakeJson lacks key 'pauseQualityUpdatesEnd' (a fake replaces every reading)" => PASS
  -FakeJson lacks key policyOverrides: exit 2, first line "NIGHT usage error: -FakeJson lacks key 'policyOverrides' (a fake replaces every reading)" => PASS
  -FakeJson is not JSON: exit 2, first line "NIGHT usage error: -FakeJson is not valid JSON" => PASS
  -FakeJson battery is a string other than none/error: exit 2, first line "NIGHT usage error: -FakeJson battery must be 'none', 'error', an int or an int array" => PASS

Mutants (a copy of the script with one edit; the targeted case must NOT pass, i.e. the case can see the branch):
  standby test -eq 0 -> -ge 0: case "2 standby 0x384 (900 s) -> FAIL standby-ac" now reads NIGHT GATES OK (exit 0) => FLIPPED (calibrated)
  hibernate test -eq 0 -> -ge 0: case "3 hibernate nonzero (7200 s) -> FAIL hibernate-ac" now reads NIGHT GATES OK (exit 0) => FLIPPED (calibrated)
  reboot ignores WU RebootRequired: case "6 WU RebootRequired ONLY (A3 m13) -> FAIL reboot" now reads NIGHT GATES OK (exit 0) => FLIPPED (calibrated)
  reboot ignores a missing parent key (N-m1): case "5a CBS parent key missing -> FAIL reboot (N-m1: a path typo " now reads NIGHT GATES OK (exit 0) => FLIPPED (calibrated)
  active-hours end exclusive ($to -lt $winEnd): case "9 active 18->6, At 2026-10-06 01:00 -> OK (06:00 inclusive)" now reads NIGHT GATES FAILED (1): updates (exit 1) => FLIPPED (calibrated)
  active-hours start exclusive ($winStart -lt $from): case "14 active 19->6, At 19:30 (window starts 19:00 = active star" now reads NIGHT GATES FAILED (1): updates (exit 1) => FLIPPED (calibrated)
  pause test -gt -> -ge: case "13 pause expiry == At+5h exactly (2026-10-05T23:00:00Z), act" now reads NIGHT GATES OK (exit 0) => FLIPPED (calibrated)
  pause reads PauseUpdatesExpiryTime only, not the earliest of the three (N-m2): case "13b PauseUpdatesExpiryTime far, PauseQualityUpdatesEndTime =" now reads NIGHT GATES OK (exit 0) => FLIPPED (calibrated)
  power: any status accepted when AC line online: case "4f BatteryStatus 1 even with AC line online -> FAIL power (o" now reads NIGHT GATES OK (exit 0) => FLIPPED (calibrated)
  power: the AC-online requirement removed (the A2-literal status-2 path, N-I1 C2): case "4h BatteryStatus 2 with AC line OFFLINE -> FAIL power (A4.3b" now reads NIGHT GATES OK (exit 0) => FLIPPED (calibrated)
  power: a failed Win32_Battery query read as "no battery" (N-I1 C1 / A4-RECHECK m2): case "4g Win32_Battery query FAILED (battery "error"), BatteryFlag" now reads NIGHT GATES OK (exit 0) => FLIPPED (calibrated)
  power: an empty query accepted without BatteryFlag 128: case "4a1 no Win32_Battery instance but BatteryFlag 1 (OS reports " now reads NIGHT GATES OK (exit 0) => FLIPPED (calibrated)
  powercfg: "exactly five hex values" relaxed to "at least four": case "tx4 saved text with the "increment" line missing (4 hex valu" now reads NIGHT GATES OK (exit 0) => FLIPPED (calibrated)
  powercfg: the AC value taken from the Minimum hex ($hexes[0]): case "tx2 saved text with AC edited to 0x00000384 -> FAIL standby-" now reads NIGHT GATES OK (exit 0) => FLIPPED (calibrated)
  powercfg: the AC value taken from the DC hex ($hexes[4]): case "tx3 saved text with AC 0 and DC edited to 0x00000384 -> OK (" now reads NIGHT GATES FAILED (2): standby-ac, hibernate-ac (exit 1) => FLIPPED (calibrated)
  the policy INFO line removed (N-m3): case "i1 policy override value present (SetActiveHours), NoAutoUpd" now reads NIGHT GATES OK (exit 0) => FLIPPED (calibrated)
  the pause-status INFO line removed (N-m3): case "i1 policy override value present (SetActiveHours), NoAutoUpd" now reads NIGHT GATES OK (exit 0) => FLIPPED (calibrated)
  parameter renamed back to $AtText: parameter names AtText, FakeJson, PowercfgTextFile => the scan reads FAIL (FLIPPED, calibrated)

REAL MACHINE reading (read-only; informative, this is the arming reading, not a calibration case):
  powershell -File night-gates.ps1 -At '2026-10-05 19:30'   (exit 0)
    NIGHT standby-ac: OK AC sleep timeout 0x00000000 (0 s)
    NIGHT hibernate-ac: OK AC hibernate timeout 0x00000000 (0 s)
    NIGHT power: OK AC line online, battery status 2, BatteryFlag 0 (OK needs AC online and every status in 2,3,6,7,8,9,11, or no battery with BatteryFlag 128)
    NIGHT reboot: OK CBS RebootPending absent, WU RebootRequired absent (PendingFileRenameOperations present, not gated)
    NIGHT updates: OK [2026-10-05 19:00 .. 2026-10-06 00:30] active hours 15->6 cover; pause to 2026-10-14T13:41:25Z > At+5h (2026-10-05T21:30:00Z) [earliest of 3 value(s)]
    NIGHT policy: INFO NoAutoUpdate=1 AUOptions=2; override values present: none (informational, not gated)
    NIGHT pause-status: INFO PausedQualityStatus=1 PausedFeatureStatus=1 (informational, not gated)
    NIGHT GATES OK
  powershell -File night-gates.ps1 -At '2026-10-05 21:00'   (exit 0)
    NIGHT standby-ac: OK AC sleep timeout 0x00000000 (0 s)
    NIGHT hibernate-ac: OK AC hibernate timeout 0x00000000 (0 s)
    NIGHT power: OK AC line online, battery status 2, BatteryFlag 0 (OK needs AC online and every status in 2,3,6,7,8,9,11, or no battery with BatteryFlag 128)
    NIGHT reboot: OK CBS RebootPending absent, WU RebootRequired absent (PendingFileRenameOperations present, not gated)
    NIGHT updates: OK [2026-10-05 20:30 .. 2026-10-06 02:00] active hours 15->6 cover; pause to 2026-10-14T13:41:25Z > At+5h (2026-10-05T23:00:00Z) [earliest of 3 value(s)]
    NIGHT policy: INFO NoAutoUpdate=1 AUOptions=2; override values present: none (informational, not gated)
    NIGHT pause-status: INFO PausedQualityStatus=1 PausedFeatureStatus=1 (informational, not gated)
    NIGHT GATES OK
  powershell -File night-gates.ps1 -At '2026-10-06 01:00'   (exit 0)
    NIGHT standby-ac: OK AC sleep timeout 0x00000000 (0 s)
    NIGHT hibernate-ac: OK AC hibernate timeout 0x00000000 (0 s)
    NIGHT power: OK AC line online, battery status 2, BatteryFlag 0 (OK needs AC online and every status in 2,3,6,7,8,9,11, or no battery with BatteryFlag 128)
    NIGHT reboot: OK CBS RebootPending absent, WU RebootRequired absent (PendingFileRenameOperations present, not gated)
    NIGHT updates: OK [2026-10-06 00:30 .. 2026-10-06 06:00] active hours 15->6 cover; pause to 2026-10-14T13:41:25Z > At+5h (2026-10-06T03:00:00Z) [earliest of 3 value(s)]
    NIGHT policy: INFO NoAutoUpdate=1 AUOptions=2; override values present: none (informational, not gated)
    NIGHT pause-status: INFO PausedQualityStatus=1 PausedFeatureStatus=1 (informational, not gated)
    NIGHT GATES OK
LIVE powercfg text (5 hex values) through -PowercfgTextFile vs the live script, standby-ac line: NIGHT standby-ac: OK AC sleep timeout 0x00000000 (0 s) | NIGHT standby-ac: OK AC sleep timeout 0x00000000 (0 s) => PASS (identical)

CALIBRATION PASSED

```



## Fix round 2 (2026-10-05, about 18:15 local)

Inputs: `tools-367-rereview.md` (NG-I1, B4-I1, B4-I2), A5.5 (N-m3, B-m4) and A5 FINAL items 5 and 7. Touched in E: `night-gates.ps1`,
`night-gates.cal.mjs`, `eq-b4-cal.mjs`, `eq-b4-cal.cal.mjs`, and the two cal outputs they write (`night-gates.cal.txt` =
`night-gates-cal.txt`, `eq-b4-cal.cal.txt`). Nothing else in E, nothing in MAIN (only read). No model call, no app start, no
subagent. No prompt text was printed (ids, counts, offsets, sha12s only). The machine's power and update settings were only read.

### New hashes

| file | sha256/12 | was | full sha256 |
|---|---|---|---|
| `night-gates.ps1` (UTF-8 BOM kept, 0 non-ASCII bytes after it, ParseFile 0 errors) | `5e6cd2acaed4` | `f134c428d373` | `5e6cd2acaed4f98a0cfec1fd57fa0465e8294dec96866792f9a925cc5b172137` |
| `night-gates.cal.mjs` | `ef08f1bf4ae4` | `2e0b19fa9e8b` | |
| `night-gates.cal.txt` = `night-gates-cal.txt` | `b4835d5b5585` | `4398c31cae4b` | |
| `eq-b4-cal.mjs` | `aa8dad977672` | `383b031e8319` | `aa8dad9776722a5a28c1f38c496c6d10d14ab268d4d15c318a3158e00ff24671` |
| `eq-b4-cal.cal.mjs` | `a2ec4d996d89` | `02307ee7bab9` | |
| `eq-b4-cal.cal.txt` (records (f) PASS) | `92a94465a9a4` | `6adc96cc0a04` | |

`window-eq.mjs` and its cal files are unchanged (`ca664e741ad0`, `33c61f9b3af5`, `9f0ad0582c6a`).
Everything that quotes `night-gates.ps1` or `eq-b4-cal.mjs` by sha (guard-eq-cal, the instruments note, the arming record) must
re-read these.

Results: night-gates `CALIBRATION PASSED` (71 `=> PASS`, 0 `=> FAIL`, 21 mutants flipped incl. the `$AtText` scan, 0 did not);
eq-b4-cal `CALIBRATION PASSED (a-e2, g, h, R7, R8, R12, R13, R14, mf, mf2, mf3, crash, rb, c', c'', 12 checks x mutants, r, w; f three-way on the smoke dir)`
(23 `=> PASS`, 0 `=> FAIL`, 12 mutants FLIPPED, the 2 M-nostrip mutants UNCHANGED as the blind spot predicts).

### (NG-I1) night-gates.ps1: a policy override value is FAIL updates

The name list is A5.5's, as already read by the tool: `SetActiveHours`, `ActiveHoursStart`, `ActiveHoursEnd` (policy keys),
`ConfigureDeadlineForQualityUpdates`, `ConfigureDeadlineForFeatureUpdates`, `SetComplianceDeadline`, `SetDisablePauseUXAccess`,
`AlwaysAutoRebootAtScheduledTime`, read under `Policies\Microsoft\Windows\WindowsUpdate` and `...\WindowsUpdate\AU`.

Change (tool): `$ovOk = (@($rd.policyOverrides).Count -eq 0)`; `Emit-Gate 'updates' (($hoursOk -or $pauseOk) -and $ovOk) (... + '; policy override values: ' + $ovTxt)`.
The override is an AND with the hours-or-pause test, not an alternative. The header (l. 22-30) and the INFO line wording changed
("(also gate updates)" in place of "(informational, not gated)"); the INFO line itself is kept. The pause-status INFO line is unchanged.

Method: the driver was changed first and run against the old script (red): `CALIBRATION FAILED (8)` = cases 1 and i3 (the INFO
wording), i1, i2, i2a, and the 3 new mutants' anchors. Then the script was changed: `CALIBRATION PASSED`.

| case | fake | expected | read |
|---|---|---|---|
| i1 (flipped from OK) | overrides `SetActiveHours`, `SetDisablePauseUXAccess`; hours 15->6 cover | `NIGHT updates: FAIL`, `NIGHT GATES FAILED (1): updates`, exit 1; both INFO lines as printed | PASS |
| i2 (new) | `ConfigureDeadlineForQualityUpdates` alone; hours cover | FAIL updates, exit 1 (A5 item 7: "a policy deadline value") | PASS |
| i2a (new) | `AlwaysAutoRebootAtScheduledTime`; hours 8->17 do not cover, pause far | FAIL updates (AND, not alternative) | PASS |
| i3 (new, clean) | `NoAutoUpdate=0`, `AUOptions=4`, no override value | all five OK, `NIGHT GATES OK`, INFO prints `NoAutoUpdate=0 AUOptions=4; override values present: none` | PASS |
| 1 (all-good) | no overrides | all OK, INFO line with the new wording | PASS |

| mutant (one edit in a copy of the script) | target case | now reads | verdict |
|---|---|---|---|
| `$ovOk = $true` (the old build) | i1 | `NIGHT GATES OK` (exit 0) | FLIPPED |
| `$ovOk = $true` | i2 | `NIGHT GATES OK` (exit 0) | FLIPPED |
| `($hoursOk -or $pauseOk -or -not $ovOk)` (override as an alternative) | i2a | `NIGHT GATES OK` (exit 0) | FLIPPED |

The two INFO-line-removal mutants and the 17 older mutants still flip their cases.

**Real run, once, read-only** (`-At '2026-10-05 21:00'`, exit 0). The verdict line, and the changed `updates` and INFO lines:

```
NIGHT updates: OK [2026-10-05 20:30 .. 2026-10-06 02:00] active hours 15->6 cover; pause to 2026-10-14T13:41:25Z > At+5h (2026-10-05T23:00:00Z) [earliest of 3 value(s)]; policy override values: none
NIGHT policy: INFO NoAutoUpdate=1 AUOptions=2; override values present: none (also gate updates)
NIGHT GATES OK
```

The cal file also holds the real readings at 19:30 and 2026-10-06 01:00 (both `NIGHT GATES OK`, exit 0) and the live-powercfg
comparison (identical). Tonight's reading is unchanged: no override value on this machine.

Not exercised: a real override value in the registry (none is present; the real name list inside `Read-Real` is never hit by a fake,
and no value may be written to prove it: NG-m1 stays a residual risk); the guard-eq-cal re-run (the other agent's, it drives this script).

### (B4-I1) eq-b4-cal.cal.mjs: B-m4, cal (f) with `--smoke-ok`

The reviewer's fix was driver-only, so `eq-b4-cal.mjs` needed no `--smoke-ok` flag for it. The driver now takes
`--smoke-ok <ids>` (verify-smoke-prompts' OK ids) and `--played <json>` (default: MAIN `interview60.runs\smoke-eq-on.played.json`).
With `E\smoke-run-tmp` present and no `--smoke-ok`, (f) FAILS (never "not run"). The OK ids were taken from a fresh run of
`verify-smoke-prompts.mjs` on segment 1 (`smoke-eq-on.natively_debug.log` + `.verbal-prompts.log`, exit 0; it printed sha12s only):
`OK S1Q04`, `OK S1Q04F`, `OK S1Q06`, `OK S1Q06F`, `OK WHY`; `VERIFY: 2 with a block, 3 without, 0 FAIL of 5 clips`.

Command run in E: `node eq-b4-cal.cal.mjs --smoke-ok S1Q04,S1Q04F,S1Q06,S1Q06F,WHY`.

| (f) reading | value | verdict |
|---|---|---|
| run dir `smoke-run-tmp` prompt keys | S1Q04, S1Q04F, S1Q06, S1Q06F, WHY | |
| played ids (`smoke-eq-on.played.json`) | S1Q04, S1Q04F, S1Q06, S1Q06F, WHY | |
| verify-smoke-prompts OK ids (`--smoke-ok`) | S1Q04, S1Q04F, S1Q06, S1Q06F, WHY | |
| the registered five | S1Q04, S1Q04F, S1Q06, S1Q06F, WHY | PASS (all four equal) |
| negative: `--smoke-ok` list WITHOUT WHY (the B-m4 negative) | | NOT EQUAL (FAIL, as it must) |
| negative: played ids without S1Q06F | | NOT EQUAL |
| negative: run dir keys without S1Q04 | | NOT EQUAL |
| negative: `--smoke-ok` plus an extra id | | NOT EQUAL |
| negative: `--smoke-ok` with WHY twice | | NOT EQUAL |

The PASS line no longer says "f pending the smoke": it says `f three-way on the smoke dir`, or `NOT RUN (no smoke dir or no --smoke-ok)`.
Not exercised: the "smoke dir present, no `--smoke-ok`" branch (it only increments the failure count; running it would overwrite the cal file);
the three-way check lives in the driver, so it is calibrated by its five negatives, not by a mutant of the tool. The comparison is
of id sets: it does not re-prove that verify-smoke-prompts' OK means what its own record says (RESULT-smoke-eq.md).

### (B4-I2) eq-b4-cal.mjs: the marker-first tag only when the round trip is the ONLY failing check

Change (tool): `rest = sepOk && !s.user.includes(LABEL) && length identity`; `rt = withEarlierQuestion(s.user, s.block) === user`;
`ok = rest && rt`; the id is tagged `(marker-first marker=<n> label=<n>)` only when `rest && !rt && markerFirst(user)`. An id whose
split returns null is never tagged. Header (l. 17-24) says so. Format unchanged (B4-m1: the parenthesised form).

| case | fake | expected | read |
|---|---|---|---|
| (mf) | block well formed, marker text at offset 0 | `BLOCK FAIL S1Q01F (marker-first marker=0 label=4401)` (still tagged) | PASS |
| (mf2) new | marker text at offset 0 + a block with two parent lines (split null) | `TRANSCRIPT DIFF S1Q01F`, plain `BLOCK FAIL S1Q01F`, exit 1 | PASS |
| (mf3) new | marker text at offset 0 + the leading separator cut to one `\n` (split non-null, a second check fails) | plain `BLOCK FAIL S1Q01F` | PASS |

| mutant | target | now reads | verdict |
|---|---|---|---|
| the OLD rule (`markerFirst(PROMPTS[id].user)` in place of `markerFirstIds.has(id)`) | (mf2) | `BLOCK FAIL S1Q01F (marker-first marker=0 label=4401)` | FLIPPED |
| the OLD rule | (mf3) | `BLOCK FAIL S1Q01F (marker-first marker=0 label=4400)` | FLIPPED |
| tag without `rest` (`!rt && markerFirst(user)`) | (mf3) | tagged | FLIPPED |
| (M-markerfirst, existing: classification removed) | (mf) | untagged | FLIPPED |

The full driver passes (above). All earlier cases read as before (a, b, c, c', c'', d, e, e2, g, h, R7, R8, R12, R13, R14, crash, rb, r, w).

**The real gate, re-run on the new sha `aa8dad977672` while `E\smoke-run-tmp` exists** (`node eq-b4-cal.mjs E\smoke-run-tmp --g S1Q04F,S1Q06F`, exit 0):

```
B4CAL run=smoke-run-tmp ids=5 g=2 [S1Q04F,S1Q06F]
TRANSCRIPT OK 5/5
BLOCK OK 2/2
LABEL OUTSIDE --g NONE
```

The work folders `b4cal-tmp` and `b4cal-cases-tmp` are absent afterwards. The gate caveat of the re-review stands (both G ids' transcript parts are
one line, the pinned line, so TRANSCRIPT lies in the (c'') blind spot for them; BLOCK OK and LABEL OUTSIDE NONE carry the G ids).

### Still open (not this round)

- B4-I3 (the dated note ruling exit 4, the REPLAY_BREAK refusal, the G-also string, the marker-first format) and N-m5 (the `-FakeJson` schema in the instruments note): text, at arming.
- `instruments.sha256.txt` and the arming record must take the six new shas above.
- guard-eq-cal must be re-run (it drives the real `night-gates.ps1`; its fake-standby.json already carries the 19 keys and no overrides, so N-d should not move).
- eq-gsitting (unbuilt) must match the marker-first tag by the parenthesised form.

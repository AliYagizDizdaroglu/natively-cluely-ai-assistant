# Amendment A5 to PREREGISTER-flight-eq.md: A4-RECHECK's fixes (pre-data)

Written **2026-10-05, begun 17:37 TST by `date`** (Opus, author; a fresh Opus re-checks it). It builds on the registration,
A1, A2, A3 and A4, all unedited (sha256 at the end). **No flight datum exists.** The smoke (`Natively-smoke-eq`) was
registered for 17:37; it is pre-hour material, not flight data.

Precedence: **A5 > A4 > A3 > A2 > A1 > registration**. Everything not named here stands.

`tools-367-review.md` (fresh Opus, ~17:35): **out before A5 was finished. Its spec rulings are folded into A5.5**
(SPEC PASS for all three tools; the power departure ruled acceptable; QUALITY CHANGES on eq-b4-cal and night-gates).

## 0. Resolutions (the re-checker's fixes adopted as worded unless stated)

| item | resolution | binds at |
|---|---|---|
| **I1** 1(e) lost "in the run window" | ADOPTED: second half limited to captures whose `at` ∈ [`startedAt`, `endedAt`]; out-of-window LABEL captures counted, printed `ignored <n>`, never read under 1(e) or 5d; reader cal on tonight's smoke captures | A4.1 1(e), b5 |
| **I2** step 12 impossible; "after step 13" not observable | ADOPTED: `eq-precheck.ps1 -ArmingPath`; gate = record's `T:` == `-At` + 6 min == the flight task's `NextRunTime`; cal: stub OK / missing FAIL / other-T FAIL. ("+ 6 min" because P8's `-At` is the precheck's own time T − 6, per A2.10's contract; the re-checker's "T == -At" reads `-At` as T) | A4.6 m9, P8, step 12 |
| **I3** regeneration leaves old tasks armed | ADOPTED: on overrun, disable both old tasks first, read back `Disabled`, rename the record aside, then regenerate | A4.6 |
| **I4** leak checker blind to trims | ADOPTED: a shared run of ≥ 24 normalised characters is a leak; cal: whole cue, 30-char prefix, clean h40d | A4.3a |
| **m1** 5d text stale | ADOPTED as worded | A3.1a / A4.1 |
| **m2** "no battery" fails open | ADOPTED: AC line online is required in every case; a `Win32_Battery` query error = FAIL; cal case | A4.3b, P5 |
| **m3** power-gate direction | ADOPTED: named as a **departure from A2's literal "status 2"** (a relaxation on charge states, with the line required online) | A4.3b |
| **m4** UNCALIBRATED masks DIFF | ADOPTED: print `G-ids also failing: <ids>`; exit stays 3 | eq-b4-cal |
| **m5** (c′) swap rule | ADOPTED as worded | eq-b4-cal cal |
| **m6** marker-first BLOCK FAIL | ADOPTED: the tool prints `BLOCK FAIL <id> (marker-first)`; not 5d; `eq-gsitting` does not refuse on it; synthetic cal case | eq-b4-cal, A4.1 m1 |
| **m7** step 8 HEAD-moved needs step 9's HEAD | ADOPTED: current HEAD's parent at step 8; registered HEAD's parent re-run at step 9 | steps 8, 9 |
| **m8** later texts into the registered HEAD | ADOPTED: A5, the tools-review note and cue rev 7 (if out) go into step 9's commit; later ones put their sha in the arming record. b10's `registeredHead` is read from `ARMING-flight-eq.md` (rev 6 re-check T1) | step 9, A4.3a |
| **TR** tools-367-review | ADOPTED: B-I1 (`LABEL OUTSIDE --g` line, exit 1; at the smoke gate any id = no flight); B-I2 (wording + (c′)/(c″) blind cases); B-m2 replaces A5.3 m4's string; B-m3..m6; W-m1, W-m2; N-I1 (= A5.1's power rule); N-m1..m4; the power departure recorded in A5.1 per the review's ruling | A5.5 |
| **R7** cue-grading rev 7's deltas to b10 | ADOPTED by this dated note, citing rev 7 sha256 `b1a41225…1f39` (re-check pending): `registeredHead` from the ARMING record, whose sha must equal the real launcher log's `ARMING sha256=` line; `superseded <logLine>` lines; four producer cal cases. **Binds b10's build (post-hour, A2.5), not arming**; the one arming-side consequence is that the record is frozen once the real launcher has read it | A4.3a, b10 (A5.4) |

## A5.1 Text replacements

- **1(e), second half (replaces A4.1's).** "Every capture **whose `at` lies in the run window [timeline `startedAt`,
  `endedAt`]** and carries the LABEL, well-formed or not, has a `gate=block` window. LABEL captures outside the run
  window (the smoke's, earlier sessions') are counted and printed as `ignored <n>`, and are never read under 1(e) or 5d."
  The reason: `verbal-prompts.log` is cumulative and is copied whole into the run folder, so tonight's smoke captures of
  S1Q04F and S1Q06F WILL be in it.
- **b5 calibration cases added.**
  - (i) On the run folder's real `verbal-prompts.log` after the hour, before reading any rule: the smoke's two LABEL
    captures fall before `startedAt` → `ignored ≥ 2`, VOID 0. Ids and counts only.
  - (ii) Pre-hour, on a synthetic copy: one LABEL capture stamped before `startedAt` → `ignored 1`, VOID 0; the same
    capture stamped inside the window, in a non-block window → VOID 1(e).
- **Rule 5d (replaces A3.1a's sentence).** "TRANSCRIPT DIFF or BLOCK FAIL on any post-hour `--g` id whose window is
  `gate=block` (including a `short` window). On a non-block id it is VOID 1(e), with the reading reported. A `BLOCK
  FAIL (marker-first)` is reported, not 5d."
- **Power gate (replaces A4.3b's rule).**
  - **OK iff the AC line is online (1) AND (no battery OR every BatteryStatus ∈ {2, 3, 6, 7, 8, 9, 11}).** A
    `Win32_Battery` query error = FAIL power; a `GetSystemPowerStatus` line of 0 or 255 = FAIL.
  - **Departure from A2's literal** ("no battery, or BatteryStatus 2"): charge states {3, 6, 7, 8, 9, 11} also pass,
    because Windows reports 6 or 3 on AC on this laptop and the literal rule would false-FAIL after a recharge. In
    exchange, every state, status 2 and no-battery included, now requires the line online, so no battery-only state
    passes.
  - Cal cases added: status 2 + line offline → FAIL (flips the current build, `night-gates.ps1:144`); fake `battery:
    "error"` → FAIL; no battery + line 255 → FAIL; status 6 + online → OK.
- **Leak checker (replaces A4.3a's calibration).**
  - It normalises case and whitespace and reports a leak for any shared run of **≥ 24 characters** between a cue string
    and the checked file. It prints `leak <n>`, never text.
  - It runs on every counts-only summary, the completeness file and the result note before they are quoted or
    committed. `leak ≥ 1` = not quoted; regenerate.
  - Cal: whole cue inserted → `leak 1`; its first 30 characters inserted → `leak 1`; the h40d summary → `leak 0`.
  - Post-hour (it decides nothing tonight).

## A5.2 Precheck and regeneration (I2, I3)

- **P8 `eq-precheck.ps1 … -ArmingPath <file>`** (default `E\ARMING-flight-eq.md`). Gate `arming-record` passes when:
  - the file exists;
  - its line `T: yyyy-MM-dd HH:mm` equals `-At` + 6 min;
  - that equals the flight task's `(Get-ScheduledTaskInfo).NextRunTime`.

  The dummy's NextRunTime is read when `-Label eqcal` is used. "Written after step 13" is replaced by this equality.
- **P8 calibration** (dummy task, trigger At + 6, At = now + 2):
  - stub record naming At + 6 → OK (the clean case);
  - record absent → `FAILED (1): arming-record`;
  - stub naming At + 21 → `FAILED (1): arming-record`.

  A4's other cases (`-FakeFail port`, `-At '00:09'`) stand.
- **Overrun (replaces A4.6's first overrun sentence).**
  1. `Disable-ScheduledTask` both `Natively-flight-eq` and `Natively-flight-eq-precheck`, and read back `Disabled` for
     each.
  2. Rename `ARMING-flight-eq.md` to `ARMING-flight-eq.superseded-<HHmm>.md`.
  3. Only then regenerate from step 10.
  4. If the old T − 6 has already passed when the overrun is noticed, there is no flight at that T; regenerate (still
     ≤ 01:00, else no flight tonight).

  The superseded record and its T are named in the new record.

## A5.3 Tool details (m4, m5, m6, m7)

- **`eq-b4-cal.mjs` m4.** Superseded by the tools review's B-m2 (A5.5), which keeps A3's strings unchanged.
- **(c′) swap rule (m5).** In the first word of ≥ 6 letters of that non-final line, replace its 3rd letter with a
  different lowercase letter. The result must be no word in `transcriptCleaner`'s filler and ack lists. If the result
  reads DIFF, the driver tries the next such word; this does not stop the flight. Expected: `TRANSCRIPT OK`, printed as
  "documented blind spot".
- **marker-first (m6).** BLOCK FAIL with the marker's index < the LABEL's index → `BLOCK FAIL <id> (marker-first)
  marker=<n> label=<n>` (numbers only). Cal: a synthetic copy with an extra `INTERVIEWER JUST SAID:\n` placed before the
  block → that line. `eq-gsitting.ps1` refuses on BLOCK FAIL except marker-first.
- **Step 8's HEAD-moved case (m7).** At step 8, `NATIVELY_FLIGHT_COMMIT` = the parent of MAIN's current HEAD →
  `GUARD FAILED`. It is re-run at step 9 with the registered HEAD's parent.

## A5.5 The tools review's rulings (`E\tools-367-review.md`), adopted

**eq-b4-cal.mjs:**
- **B-I1.** After the BLOCK loop, the tool prints `LABEL OUTSIDE --g <ids>` or `LABEL OUTSIDE --g NONE`. A non-empty
  line → exit 1.
  - **Smoke gate (step 5(i)):** it must read `NONE`; any id = b4 not met = no flight.
  - **After the hour:** `--g` = every id whose kept entry includes the LABEL (A4.1), so the line is `NONE` by
    construction; a non-empty line there is a tool defect.
  - Cal: R12 (a well-formed block in non-G Y) and R13 (a malformed one) → `LABEL OUTSIDE --g S1Q02`, exit 1. Cal (a)
    stays `NONE`.
- **B-I2.** The header and report wording become: "TRANSCRIPT: every transcript part is a fixed point of the app's
  renderer; bytes before the marker, the block included, are copied by the builder and not checked by it; a
  renderer-producible change is invisible." This is §9's limit.
  - Printed known-blind cases, each must read OK:
    - (c′) per A5.3's swap rule → `TRANSCRIPT OK n/n`;
    - (c″) an uppercase flip in X's last (pinned) line → `TRANSCRIPT OK n/n`.
- **B-m1.** Three BLOCK clauses are tautological once the split is non-null; say so in the report. No code change.
- **B-m2.** When any non-G id fails and G ids also fail, the tool prints an extra line `TRANSCRIPT G ALSO FAILING <ids>`
  (informational). A3's strings and exit 3 are unchanged.
- **B-m3.** A fifth BLOCK clause on the leading separator:
  `first === 0 || (user.slice(first-2, first) === '\n\n' && user[first-3] !== '\n')`. Cal R7, R8 → BLOCK FAIL.
- **B-m4.** Cal (f) takes `--smoke-ok <ids>` (verify-smoke-prompts' five OK ids) and requires three-way equality
  (dir keys = played ids = OK ids).
  - Negative case: the list with WHY removed → FAIL.
  - The post-(f) cal file's sha goes into `instruments.sha256.txt`.
- **B-m5.** A crash (a missing dist module, an I/O error) → refuse, exit 2, never exit 1.
- **B-m6.** `REPLAY_BREAK` is deleted from the builder child's env.

**window-eq.mjs:**
- **W-m1.** A run-dir that does not exist, or is not a dir → usage, exit 2 (cal case added).
- **W-m2.** The three bound mutants and W1 (local getters) move into `window-eq.cal.mjs`.

**night-gates.ps1:**
- **N-I1** is A5.1's power rule; the review's tested fix lines are the implementation.
  - Cal: no battery + online → OK; C1 (empty list + offline) → FAIL; C2 (`[2]` + offline) → FAIL; no battery + `acLine:
    null` → FAIL.
- **N-m1.**
  - Exactly 5 hexes, `$hexes[3]` = AC, else FAIL.
  - A `-PowercfgTextFile` cal switch, with a saved `/q` text with AC edited to `0x00000384` → FAIL standby-ac.
  - Absent CBS or `WindowsUpdate\Auto Update` parent keys → FAIL reboot "unreadable".
- **N-m2.** The pause = the minimum of `PauseUpdatesExpiryTime`, `PauseQualityUpdatesEndTime` and
  `PauseFeatureUpdatesEndTime` (those present); `PausedQualityStatus` is printed.
- **N-m3.** One printed line `NIGHT policy: …`. `updates` FAILs if any of these policy values is present:
  `SetActiveHours`, policy `ActiveHoursStart/End`, `ConfigureDeadlineForQualityUpdates`,
  `ConfigureDeadlineForFeatureUpdates`, `SetComplianceDeadline`, `SetDisablePauseUXAccess`,
  `AlwaysAutoRebootAtScheduledTime`. None is present tonight.
- **N-m4.** The parameter becomes `[string]$At`. **N-m5:** the `-FakeJson` key schema is quoted in the instruments note.

Each changed tool re-runs its full calibration and records its new sha (A2.5). The review's re-runs used copies, so E's
cal files are as built.

## A5.4 b10, cue-grading rev 7's deltas (dated note, 2026-10-05 ~17:45 TST)

This note cites `PREREGISTER-cue-grading-rev7.md`, sha256
`b1a412257cc8edc7087e6da22097db66717a53900785120415887781cf781f39`, section "Contract deltas, rev 6 → rev 7" (its
re-check is pending; a later revision reaches b10 only by another dated note). On top of A4.3a (rev 6 by reference),
b10's output contract adds:

1. **`registeredHead`** = the registered HEAD as `E\ARMING-flight-eq.md` records it, not §11. That file's sha256 must
   equal the `ARMING sha256=` line of the REAL launcher log (not the dry run's `ARMING absent`). **Arming consequence:**
   from the moment the real launcher prints that line, the record is frozen. Any later edit breaks cue grading's input.
   Notes after T go in the result note, never in the record.
2. **Completeness file.** One line `superseded <logLine>` (line number only) for each in-window `[Answer] cues: ` line
   that has no entry because its stream was superseded.
3. **Producer calibration cases** (b10's A2.5 calibration, on h40d's run folder, in addition to A4.3a's):
   - (i) every in-app entry's `logLine` addresses a line matching `^\S+ \[LOG\] \[Answer\] cues: (\[.*\])$` whose
     parsed JSON equals its `cues`;
   - (ii) the completeness file's last line is `EXPORT COMPLETE` and its `LOG` line's sha256 is the log's;
   - (iii) the top-level keys are exactly the five named;
   - (iv) the superseded R29 stream appears as exactly one `superseded <logLine>` line.

Keys, enumerations, forbidden fields, file names and the `LOG` / `EXPORT …` lines stay as in rev 6. **This binds
b10's build (post-hour, A2.5), not arming**; nothing in the pre-hour list changes for it except the freeze in point 1.

## Hashes as read (sha256)

- `PREREGISTER-flight-eq.md` `9ca3149bfb5ed44bff9f7d7c81e6203c15d9fe1b6442b47210ccfb59e2d14f44`
- `AMENDMENT-A1.md` `3e3f0ddd2ace1586bc4137394ee5c27868bf7ae121b73f1605519b8cd1d863c8`
- `AMENDMENT-A2.md` `0bd449be9b3bc68c80b3711308b1b4916f21e479fa36adac57a27eea0089f68e`
- `AMENDMENT-A3.md` `36aa80002a6b36d41a5c0ac613e4e7f705f81faa46b559566e9edaad79e31d6e`
- `AMENDMENT-A4.md` `1e0ac7735fce2f857a74588521d43d0b73e721e5c95f1bab0a7e13cee4cd26e0`

## FINAL pre-hour list (supersedes A4's)

State as of 17:4x, read from `F\build\progress.md`, `LANDED.txt` and file names. Each piece needs Opus review READY, and
each known answer must flip.

1. **Build and land.** **DONE**: LANDED 355ad0a. Known answers: `EQ_DIST_BREAK` → ≥ 21 MISMATCH, exit 1; missing
   fixture → FAIL; `REPLAY_BREAK` → c2 fails; Step 5b → exit 2 with T3's text.
2. **P2, focused-off.** **DONE**: MAIN b42ca32. Known answers (dry runs): `off` → 0 Flash arms; unset → 4; `yes` →
   exit 2.
3. **`eq-b4-cal.mjs`.** **BUILT, reviewed (SPEC PASS / QUALITY CHANGES); edits pending:** B-I1, B-I2, B-m2..m6,
   marker-first (A5.3). Known answers: (a) OK 19/19 + `LABEL OUTSIDE --g NONE`; (b) OK + BLOCK OK; (c) DIFF; (c′) and
   (c″) OK (blind); (d) BLOCK FAIL; (e) UNCALIBRATED 1 + `TRANSCRIPT G ALSO FAILING` when applicable; R12/R13 → LABEL
   OUTSIDE, exit 1; R7/R8 → BLOCK FAIL; marker-first; +3 mutant → BLOCK FAIL; crash → exit 2.
4. **Smoke + smoke run dir.** **Tooling BUILT; smoke RUNNING** (registered 17:37, ~17:53). Known answers:
   `check-smoke-eq` synthetic flips (21/21); `verify-smoke-prompts` (12/12); rundir (7/7). Live: both segments
   `CHECK CLEAN`, the WHY line, and (cal f) the run dir's keys = the five played ids.
5. **`eq-b4-cal` on the smoke dir + n5.** **Not run** (waits on 4 and on 3's edits). Known answers: (f) with
   `--smoke-ok` three-way equal (WHY-less list → FAIL); (i) `--g S1Q04F,S1Q06F` → OK + BLOCK OK + `LABEL OUTSIDE --g
   NONE`, else no flight; (ii) `--only S1Q04F` → `block=stripped…` + 1 answer; `--only S1Q04` → exit 2, no request.
   Then delete the probe file, the dir and the env names.
6. **`window-eq.mjs`.** **BUILT, reviewed (SPEC PASS / APPROVE); minor edits pending:** W-m1, W-m2. Known answers:
   22:30:00.000Z in / .001Z out; identical under `TZ=UTC`; W1 mutant flips under `TZ=UTC`; no such dir → exit 2.
7. **`night-gates.ps1`.** **BUILT, reviewed (SPEC PASS / QUALITY CHANGES); edits pending:** A5.1/N-I1 power,
   N-m1..m4. Known answers: status 2 + offline → FAIL; empty list + offline → FAIL; query error → FAIL; no battery +
   null line → FAIL; 6 + online → OK; standby 0x384 (fake and powercfg text file) → FAIL; RebootRequired only → FAIL;
   18→5 at 01:00 → FAIL; a policy deadline value → FAIL updates.
8. **`guard-eq.mjs`.** **UNBUILT.** Known answers: each premise broken once → FAILED; old parity line → g1 FAILED;
   `--now` T+11 → FAILED; current-HEAD's parent → FAILED; true env → `GUARD OK`.
9. **`passes/` commit** (registration with §11 unfilled + A1–A5 + the tools-review note + cue rev 7 if out). **Not
   done.** Known answer: guard with the registered HEAD's parent → FAILED; at the HEAD → `GUARD OK`.
10. **Launchers (generator + `launch-eq-src.txt`), T chosen per A4.6.** **UNBUILT.** Known answers:
    `GUARDS_ALL_PASSED`; the mangled-marker copy exits with its code and writes the error-log line; `ARMING absent`
    printed.
11. **Dry task registered and run.** **Not done.** Known answers: `GUARD OK` + `NIGHT GATES OK` in its log; duration
    recorded against 240 s; no `%TEMP%` error log.
12. **`eq-precheck.ps1`.** **UNBUILT.** Known answers (dummy): stub record → OK; absent → FAILED arming-record; At + 21
    → FAILED arming-record; `-FakeFail port` → FAILED + dummy Disabled; `-At '00:09'` → exit 2.
13. **Register the flight at T and the precheck at T − 6.** **Not done.** Known answer: StartWhenAvailable False; both
    NextRunTimes read back.
14. **Arming record `E\ARMING-flight-eq.md`** (`T:` line, ledger ≥ 475 / ≥ 372, U1, the smoke's b4 reading, night-gate
    lines, shas incl. A5 and any later texts; **the registered HEAD**, which b10 reads per A5.4). **Not done.** It must
    end by T − 10, else A5.2's overrun. It is **frozen once the real launcher prints its sha** (A5.4).

**Recommended pre-hour (UNBUILT):** b5 `eq-flight-read.mjs` (with A5.1's cases); `launch-grader.mjs --model-id` +
`cwdprobe-3`; b10 `eq-cues-export.mjs`; the leak checker. **Post-hour, UNBUILT:** `eq-gsitting.ps1`, `power-events.ps1`,
`eq-twins.mjs`.

**Not covered:** the tools review is not out. Cue rev 7's re-check is pending (A5.4 cites its current sha). NextRunTime read-back under the precheck task's
account is assumed, as in P9. The critical path still needs three new tools (8, 10, 12) plus the edits to 3 and 7.

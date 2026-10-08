VERDICT: APPROVE WITH FIXES

# Re-check of AMENDMENT-A4.md (pre-data, scoped)

Fresh Opus, independent of the A4 author, 2026-10-05 ~17:35 TST. I edited no file except this one. I read no captured
prompt, cue text, key, `verbal-prompts.log`, `*-gated*.json`, `turn-parity-*.json` or `interview60.prompts.json`
content. Logs were read for line counts only. No model call, no subagent.

**Counts: 0 Critical, 4 Important, 8 Minor.** A4 resolves all 14 A3-RECHECK items in substance, and its new rulings
are sound in intent. Four defects must be fixed before step 9's commit:
- **I1** makes tonight's hour VOID by construction if the reader is built as written.
- **I2** makes step 12 impossible as written.
- **I3** can let a stale task fly while arming is being regenerated.
- **I4** is a leak checker that cannot see the leak it exists for.

## Holds (checked)

- **Hashes (sha256).**
  - A4 = `1e0ac7735fce2f857a74588521d43d0b73e721e5c95f1bab0a7e13cee4cd26e0`, as expected.
  - The registration, A1, A2, A3 and rev 6 (`ab13dc2e…94af3`) match A4's "Hashes as read".
  - The tools match `tools-367-report.md`: `eq-b4-cal.mjs ab5c37ec…`, `window-eq.mjs e93cb89a…`, `night-gates.ps1 88750f8a…`.
- **The A3-RECHECK items are resolved in substance:**

  | item | status |
  |---|---|
  | I1 | resolved; the claim about the driver is verified (below) |
  | I2 | (a) and (c) resolved; (b) restored but loses "in the run window", see I1 |
  | m1, m2, m3, m4, m6, m7, m9, m10, m11, m12 | resolved as worded |
  | m5 (a)–(d) | resolved |
  | m8 | resolved, but the regeneration path has the hole in I3 |
- **I1 claim verified.**
  - `eq-b4-cal.cal.mjs:36-49` `flipOneChar` upper-cases the first lowercase letter of a role-tagged line and never touches the last line. So cases (c) and (e) are already the "non-final line" cases, and X necessarily has ≥ 2 transcript lines.
  - Tool exit codes match A4.4(b): 0, 1, 3, 2 (`eq-b4-cal.mjs:105-112`).
  - Two blocks (case (h)) give split = null. So a doubled block is "malformed" and reaches 5d. My worry that a split-non-null BLOCK FAIL would have no mapping does not arise.
- **m4 counts (lines matching only).**

  | run | verbal-diag `route: FAST-OVERRIDE\|BEHAVIORAL` lines | debug-log `intent override → behavioral` lines |
  |---|---|---|
  | s50m folder | 24 | 1 |
  | s50l folder | 23 | 1 |

  - s50m: 24 − 1 in-window = 23 ignored, as A4 says.
  - s50l: 22 should print as ignored.
- **The power-gate claim is true.** `night-gates.ps1:144` accepts status 2 unconditionally (`if ($b -eq 2) { continue }`). The A4.3b case (status 2, line offline → FAIL) therefore flips the current build.
- **Counts-only weakens no bar.** Reg. l. 246 makes the cue-effect paragraph "never gating". Withdrawing "trims quoted" removes a report, not a check.
- **The b10 contract is adopted correctly by reference.** A4.3a's summary matches rev 6 l. 417-454: files, schema, keys, forbidden fields, duplicates.
- **m10 is not a weakening.** 5b FAILs only with a wrong answer (reg. l. 264-267), and 4a still reads that answer.
- **The T rule** fits guard-eq's bounds (19:29 → FAILED, 01:01 → FAILED; A3.7) and window-eq's upper bound. That bound is 01:30:00.000 local, and playback starts about 6 min after T.
- **The night-gates window works for a late T.** At T = 01:00 the window is [00:30, 06:00], and today's active hours run 15→6 with the end inclusive.

## Critical

None.

## Important

**I1. 1(e)'s restored second half dropped "in the run window", and `verbal-prompts.log` is cumulative. Tonight's hour would read VOID 1(e) by construction.**

Evidence:
- A2.4 (l. 135-136) reads: "every LABEL capture **in the run window** has a `gate=block` window".
- A4.1's final form reads: "every capture carrying the LABEL, well-formed or not, has a `gate=block` window". It has no window qualifier.
- `promptCapture.ts:21,48` appends and never rotates the file.
- `interview60.run.mjs` never truncates `PROMPT_LOG` (l. 41, 573) and copies the whole file into the run folder.
- The smoke builder's own report (`F\smoke\BUILD-REPORT.md` l. 111) confirms earlier sessions' captures ride along.
- Tonight's smoke writes LABEL captures for S1Q04F and S1Q06F into MAIN's file before the hour. They have no `gate=block` window in the hour, so a literal reader returns VOID 1(e).

*Fix (A4.1, 1(e) second half):*
> "(second half) every capture **whose `at` lies in the run window [timeline `startedAt`, `endedAt`]** and carries the LABEL, well-formed or not, has a `gate=block` window. LABEL captures outside the run window (the smoke's, earlier sessions') are counted and printed as ignored, never read under 1(e) or 5d."

Add a reader (b5) cal case:
> "a copy of a LABEL capture stamped before `startedAt` → `ignored 1`, VOID 0; the same capture stamped inside the window in a non-block window → VOID 1(e)."

**I2. P8's new `arming-record` gate makes step 12's "Clean → OK" case impossible, and "written after step 13" is not operational.**

- Step 12 runs before step 13 (registration) and step 14 (the record is written). A clean precheck at step 12 must therefore read `FAILED (1): arming-record`, so the piece "has not passed".
- "Written after step 13" names no observable.
- Only the "absent" case is calibrated. "Names a different T", the failure the gate exists for under regeneration, is never shown to flip.

*Fix (A4.6 m9 and step 12):*
> "P8 takes `-ArmingPath` (default `E\ARMING-flight-eq.md`). Gate `arming-record` = the file exists, its `T:` line equals `-At`, and equals the flight task's read-back `NextRunTime` (`Get-ScheduledTaskInfo`). Cal on the dummy: a stub record naming the dummy's At → OK (this is the clean case); absent → `FAILED (1): arming-record`; a stub naming At + 15 min → `FAILED (1): arming-record`."

"Written after step 13" is replaced by the NextRunTime equality.

**I3. Regeneration leaves the old T's tasks armed.**

- A4.6 regenerates from step 10 when step 14 ends after T − 10. Nothing disables the tasks registered at step 13.
- The old precheck fires at T − 6 and the old flight at T, while steps 10–11 are re-running. If the record already names the old T, the old flight passes P8 and flies at a T that broke the deadline.
- It can then overlap the new dry run, and the record is later overwritten with a T that did not fly.

*Fix (A4.6, first sentence of "Overrun"):*
> "On overrun, first `Disable-ScheduledTask` both the flight and the precheck task and read back `Disabled`, and rename `ARMING-flight-eq.md` to `ARMING-flight-eq.superseded-<HHmm>.md`; only then regenerate from step 10. If the old T − 6 has already passed when the overrun is noticed, no flight at that T; regenerate."

**I4. The leak checker cannot catch the leak it is named for.**

- A4.3a bans "a quoted trim". A trim (a `cues trimmed:` cut) is a prefix or fragment of a cue string, not the whole string.
- The only mutant inserts a whole cue string, and no matching rule is specified. A whole-string matcher passes its cal and misses every trim.
- This does not affect tonight's verdict; the checker may be built post-hour.

*Fix (A4.3a calibration):*
> "The leak checker normalises case and whitespace and reports a leak for any shared run of ≥ 24 characters between a cue string and the checked file. It is run on every counts-only summary, the completeness file and the result note before they are quoted or committed; `leak ≥ 1` = not quoted, regenerate. Cal: whole cue inserted → `leak 1`; its first 30 characters inserted → `leak 1`; h40d summary → `leak 0`."

## Minor

- **m1. 5d's text is stale against the broadened `--g`.**
  - A3.1a's rule 5d says "on any G_twin id". Post-hour `--g` is now every LABEL id.
  - Fix (A4.1): "Rule 5d: TRANSCRIPT DIFF or BLOCK FAIL on any post-hour `--g` id whose window is `gate=block` (including a `short` window); on a non-block id it is VOID 1(e) with the reading reported."
- **m2. "No battery" fails open.**
  - `night-gates.ps1:71` reads `Win32_Battery` with `-ErrorAction SilentlyContinue`. A CIM failure therefore yields an empty list, read as "no battery" → OK, even on battery.
  - Fix (A4.3b): "OK iff AC line online (1) AND (no battery OR every BatteryStatus ∈ {2,3,6,7,8,9,11}); a `Win32_Battery` query error = FAIL power."
  - Cal: fake `battery: "error"` → FAIL.
  - This also makes a no-battery box with line 255 fail, which is acceptable here.
- **m3. The power gate's direction is mislabelled.**
  - A4.3b calls the rule "stricter". Against A2's literal "no battery, or BatteryStatus 2", accepting {3,6,7,8,9,11} with the line online is a relaxation.
  - It is justified (intent "on AC"; the line must be online), but it should be named as a departure from A2 in A4.0's table.
- **m4. UNCALIBRATED masks DIFF.**
  - `eq-b4-cal.mjs:99` prints only `TRANSCRIPT UNCALIBRATED` when any non-G id fails, which hides failing `--g` ids.
  - The reading (reported, not 5d) is defensible, but the ids should be visible. Print `TRANSCRIPT UNCALIBRATED <n>; G-ids also failing: <ids>`. Exit stays 3.
- **m5. (c′) needs a deterministic swap rule.**
  - A swap that creates a filler, an ack or a repeat is normalised away, and reads DIFF.
  - Pin it: "in the first word of ≥ 6 letters of that line, its 3rd letter replaced by a different lowercase letter, the result checked to be no word in `transcriptCleaner`'s filler/ack lists". If it reads DIFF, the driver tries the next such word; it does not stop the flight.
- **m6. The hand-read of the marker-first BLOCK FAIL is undefined, and `eq-gsitting` refuses on it.**
  - The tool should compute the case itself: `BLOCK FAIL <id> (marker-first)`, with the marker index before the LABEL index printed as numbers only.
  - Such an id is not 5d and does not make `eq-gsitting` refuse. Add one synthetic cal case.
- **m7. Step 8's HEAD-moved case cannot run as written.**
  - It needs "the registered HEAD's parent" before step 9 creates that HEAD.
  - Fix: at step 8, set `NATIVELY_FLIGHT_COMMIT` to the current HEAD's parent; re-run it at step 9 with the registered HEAD's parent.
- **m8. Later texts must ride into the registered HEAD.**
  - This re-check's fixes, the tools review's dated note, and rev 7 must go into step 9's `passes/` commit. Rev 7 is being written; rev 6's re-check T1 moves the `registeredHead` source to the ARMING record. Any that land after step 9 need their sha in the arming record.
  - Name the known pending rev-7 change in A4.3a: b10's `registeredHead` is read from `ARMING-flight-eq.md`, not §11.

## Verdict map with A4's rulings (after the fixes)

| outcome | maps to |
|---|---|
| malformed LABEL capture, run window, `gate=block` window | 5d (rung 1); 1(e) first half satisfied |
| LABEL capture (either form), run window, non-block window | VOID 1(e); item-1 FAILs not read (A3.2 I3); its 5d reading reported, id named |
| LABEL capture outside the run window | ignored, counted (I1) |
| post-hour BLOCK FAIL / DIFF on a block-window `--g` id | 5d; `eq-gsitting` refuses, and the FAIL outranks the INCOMPLETE that follows |
| the same on a non-block id | VOID 1(e) |
| BLOCK FAIL (marker-first) | reported, not 5d (m6) |
| UNCALIBRATED | reported |
| verbal-diag-only fast route in the window | `fast-route`: in G, out of G_twin |
| fast-route G item under 5b | referent UNREAD, reported; 4a reads |
| power, or any night gate, FAIL | no arming (precheck disables) |
| T > 01:00 at step 10, or after a regeneration | no flight tonight |
| `arming-record` FAIL | the flight task is disabled |

- The map is total and unambiguous once I1 and m1 are applied.
- **Bars:** apart from U1, no bar is weakened against the registration or A1–A3.
  - Stricter: the restored 1(e) second half, BLOCK on every LABEL id, power with status 2 offline, and the arming-record gate.
  - The one literal relaxation is the power gate's charge states (m3), which is justified.
  - The trims withdrawal touches only a never-gating report.

## Pre-hour list: complete, ordered, and built?

- **Order:** correct, except m7.
- **Known answers:** every step has one, except step 12 (I2). Step 14's "end by T − 10" needs I3's disable step.
- **State at 17:31** (files checked by name):

  | step | state |
  |---|---|
  | 1 Build and land | DONE: LANDED 355ad0a, `F\build\LANDED.txt` |
  | 2 P2 | DONE: MAIN b42ca32, per `progress.md` |
  | 3 `eq-b4-cal` | BUILT; (c′) and the review pending |
  | 4 smoke | tools present in `F\smoke` (`smoke-eq.mjs`, `launch-smoke-eq.cmd`, `check-smoke-eq`, `verify-smoke-prompts`, `smoke-rundir` + cals); smoke not flown |
  | 5 | waits on 4 |
  | 6 `window-eq` | BUILT; review pending |
  | 7 `night-gates` | BUILT; A4.3b change, m2 and review pending |
  | 8 `guard-eq.mjs` | **NOT FOUND** |
  | 9 `passes/` commit | not done |
  | 10 flight-eq launcher generator | **NOT FOUND** (only validation-hour's exists) |
  | 11 dry task | not done |
  | 12 `eq-precheck.ps1` | **NOT FOUND** |
  | 13–14 | not done |

  - Also absent: the recommended b5 `eq-flight-read.mjs`, b10 `eq-cues-export.mjs` and the leak checker; `eq-gsitting.ps1` and `power-events.ps1` (both post-hour); and the `--model-id` edit to `F\R\launch-grader.mjs`.
  - `tools-367-review.md` is not out.
- **Buildable tonight:** yes. No piece needs app code or quota beyond the smoke and n5. The critical path is smoke → 5 → 8 → 9 → 10 → 11 → 12 → 13 → 14, with three tools still to write (8, 10, 12) plus the edits to 3 and 7.

## Not checked

- I ran no tool and no calibration. A4's tool claims rest on the cal files and the code I read.
- I did not check the in-window placement of the s50m/s50l signature lines (needs the timeline); I counted totals only.
- The rev 6 re-check and the tools review are not reflected beyond A4's own deferral clauses.
- Whether `Get-ScheduledTaskInfo NextRunTime` reads back reliably under the precheck's account (I2's fix assumes it does, as P9 already does).

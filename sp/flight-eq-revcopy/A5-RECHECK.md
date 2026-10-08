VERDICT: APPROVE WITH FIXES

# Re-check of AMENDMENT-A5.md (pre-data, scoped)

Fresh Opus, independent of the A5 author, 2026-10-05 ~17:50 TST. I edited no file except this one. I read no captured
prompt, cue text, key or log content; no model call, no subagent, no tool or calibration run.

**Counts: 0 Critical, 2 Important, 7 Minor.** A5 resolves all 12 A4-RECHECK items in substance and folds the tools
review faithfully. Two text fixes are needed before step 9's commit: one lets the arming-record gate pass an unfinished
record (I1), one gives a b5 calibration case an expectation that is really the hour's result (I2).

## Holds (checked)

- **Hashes (sha256), all match.** A5 = `a1f9a2e0…76b6` (full `a1f9a2e0a185bbb7a93eef07e866325981b8ddc4cabe87b7ac0b4d1abbe876b6`).
  Registration `9ca3149b…2d14f44`, A1 `3e3f0ddd…63c8`, A2 `0bd449be…f68e`, A3 `36aa8000…31d6e`, A4 `1e0ac773…26e0`.
  Rev 7 = `b1a41225…1f39`, as A5.4 cites. Tools as reviewed: `eq-b4-cal.mjs ab5c37ec…07b5d`, `window-eq.mjs e93cb89a…877aa`,
  `night-gates.ps1 88750f8a…7df04b4` (unchanged since the review; edits still pending, as A5 says).
- **I1 (run window): resolved.** `promptCapture.ts:27,46` stamps every capture with an ISO `at`, so the window test is
  computable. The `ignored <n>` line and both cal cases are present. See I2 for case (i)'s expectation.
- **I2 ("+ 6"): A5 is right; the re-checker's "T == -At" was the slip.** A2.10 P8 defines `-At` as the precheck's own
  time and its gate as "the flight task Ready with next run = At + 6 min"; P9 registers the precheck at T − 6. So the
  record's `T:` = `-At` + 6 min = the flight's NextRunTime is consistent with A2, and the cal (dummy trigger At + 6; stub
  At + 6 → OK; absent → FAIL; At + 21 → FAIL) flips both failure directions.
- **I3 (regeneration): resolved.** Disable both tasks, read back `Disabled`, rename the record aside, then regenerate;
  the no-flight-at-old-T clause is present.
- **I4 (leak checker): resolved as worded** (≥ 24 normalised chars; whole cue, 30-char prefix, clean h40d). Post-hour.
- **m1–m8: adopted as worded.** m4 is correctly superseded by the review's B-m2 (A3's strings unchanged).
- **Tools-review fold (A5.5) matches `tools-367-review.md`** item by item: B-I1 (with the smoke-gate mapping the
  review asked an amendment to make), B-I2 wording and (c′)/(c″), B-m1..m6, W-m1/W-m2, N-I1 (= A5.1's power rule,
  including no battery + null/255 line → FAIL), N-m1..m5. B-m3 (optional in the review) is made mandatory: stricter.
- **R7 (A5.4) matches rev 7 §1F "Contract deltas" (l. 500-509)** verbatim in substance: `registeredHead` from the
  ARMING record with the launcher-sha equality, `superseded <logLine>`, the four producer cases. It binds b10 only.
- **Bars.** Nothing is weakened against the registration or A1–A4 except the user's 4c ruling and the power-gate
  departure, which A5.1 now names as a departure from A2's literal (a relaxation on charge states {3,6,7,8,9,11}, paid
  for by requiring the AC line online in every state, status 2 and no-battery included). Stricter: the line requirement,
  the query-error FAIL, `LABEL OUTSIDE --g` at the smoke gate, B-m3, N-m1/N-m3, the arming-record equality.

## Critical

None.

## Important

**I1. The `arming-record` gate passes an unfinished record, so the T − 10 deadline is enforced only by the controller.**

- The gate checks existence + the `T:` line + NextRunTime. Step 14 writes several items; if the record exists with its
  `T:` line while step 14 is still running at T − 6 (already an overrun), the precheck passes it.
- If the controller then stalls past T, the flight flies on a record that is not complete, and A5.4's freeze means any
  completion edit after the launcher prints `ARMING sha256=` breaks cue grading's input. A5.2's "no flight at that T"
  cannot act on a flight already running.
- *Fix (A5.2, add to the gate and to step 14):*
  > "Step 14 writes the record to `ARMING-flight-eq.md.tmp` and renames it into place in one step; its last line is
  > `ARMING COMPLETE <yyyy-MM-ddTHH:mm:ss+03>`. Gate `arming-record` additionally requires that last line with a stamp
  > ≤ `-At` − 4 min (= T − 10). Cal: a stub naming At + 6 without the line → `FAILED (1): arming-record`; a stub
  > stamped At − 3 → `FAILED (1): arming-record`."
- This makes the overrun rule self-enforcing: an overrun record can never pass the precheck, so the flight is disabled.

**I2. b5 case (i) expects `VOID 0` on the real hour; that is the hour's reading, not a known answer.**

- Case (i) runs on the run folder's real `verbal-prompts.log` "before reading any rule" and expects `ignored ≥ 2, VOID 0`.
  If the hour genuinely has an in-window LABEL capture in a non-block window, the correct output is VOID 1(e), and the
  text then reads as a failed calibration. The map does not say which wins, and "fixing" the reader to VOID 0 would
  suppress a real VOID.
- *Fix (A5.1, case (i)):*
  > "(i) On the run folder's real `verbal-prompts.log` after the hour: every LABEL capture with `at` < the smoke's end
  > (the smoke's S1Q04F/S1Q06F captures, ≥ 2) is counted under `ignored` and none appears under 1(e) or 5d. The 1(e)
  > count on the hour is the hour's reading, never part of this case. A failure of this case = the reader is defective
  > and is rebuilt under A2.5 before 1(e) is read."

## Minor (recorded, not blocking)

- **m1. Cal stubs must not touch the real record path.** Add to A5.2: "P8's cal stubs live in `E\eqcal-arming\` and are
  passed by `-ArmingPath`; the cal never writes `E\ARMING-flight-eq.md`."
- **m2. One `T:` line.** A5.2 names the superseded T in the new record. Add: "the record has exactly one line matching
  `^T: \d{4}-\d\d-\d\d \d\d:\d\d$`; a superseded T is written as `Superseded: …`; two `T:` lines → FAIL arming-record."
- **m3. A LABEL capture whose `at` does not parse.** Add to 1(e) second half: "a LABEL capture with a missing or
  unparseable `at` is read as in the window" (fails closed).
- **m4. The post-hour `LABEL OUTSIDE --g` "tool defect" has no verdict mapping.** Add to A5.5 B-I1: "post-hour, a
  non-empty line means `--g` was built wrong: rebuild `--g` from the kept entries and re-run; the line is never 5d by
  itself."
- **m5. Cues shorter than 24 normalised chars are invisible to the leak checker.** Add: "a cue string shorter than 24
  normalised characters is matched whole; the whole-cue cal case uses a cue of ≥ 30 characters." Post-hour.
- **m6. A5.5 adopts `tools-367-review.md` without its sha.** Add `d19d4f741f8adc015695d28ee076cb907d893afa46e925402b353d57974155cf`
  to "Hashes as read".
- **m7. Section order.** A5.5 precedes A5.4 in the file; cosmetic.

## Verdict map with A5's changes (after the fixes)

| outcome | maps to |
|---|---|
| LABEL capture, `at` in [startedAt, endedAt] (or unparseable, m3), non-block window | VOID 1(e) |
| malformed LABEL capture in the window, block window | 5d (1(e) first half satisfied) |
| LABEL capture outside the window | `ignored <n>`, never 1(e)/5d |
| post-hour DIFF/BLOCK FAIL on a block-window `--g` id | 5d |
| the same on a non-block id | VOID 1(e), reading reported |
| `BLOCK FAIL (marker-first)` | reported, not 5d; `eq-gsitting` does not refuse |
| `LABEL OUTSIDE --g` non-empty at the smoke gate | b4 not met, no flight |
| the same post-hour | `--g` rebuilt and re-run (m4) |
| UNCALIBRATED (+ `G ALSO FAILING`) | reported |
| eq-b4-cal crash | exit 2 refusal; at the smoke gate, no flight |
| power / any night gate FAIL | guard FAILED / precheck disables |
| `arming-record` FAIL (absent, other T, ≠ NextRunTime, incomplete per I1) | flight disabled |
| overrun | both tasks disabled, record renamed, regenerate if new T ≤ 01:00, else no flight |

Total and unambiguous once I2 and m4 are applied.

## Pre-hour list

- **Complete and ordered:** yes. Step 12 precedes 13–14 and its clean case is now possible (stub). Step 12 is
  T-independent, so regeneration rightly skips it. Step 9 carries A5, the tools-review note and rev 7; this file and any
  A6 go in the arming record by sha (A5 m8).
- **Known answers:** every step has one that flips both ways, once I1's two cal cases join step 12.
- **Still unbuilt:** 8 `guard-eq.mjs`, 10 the launchers, 12 `eq-precheck.ps1`, plus the edits to 3 and 7 (as A5 says).

## Not checked

- No tool was run; claims about flips rest on the review's measured runs and the code as cited.
- Whether `Get-ScheduledTaskInfo` NextRunTime reads back under the precheck task's account (assumed, as P9).
- How many LABEL captures the smoke actually wrote (hence "≥ 2", not "= 2").
- Rev 7's own re-check is pending; A5.4 binds only its cited sha.

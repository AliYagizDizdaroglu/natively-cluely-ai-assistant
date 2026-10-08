# Amendment A7 to PREREGISTER-flight-eq.md: T = 2026-10-06 03:00, on the user's ruling (pre-data)

Written **2026-10-05 23:58 TST by `date`** (Opus, author). **No flight datum exists**: no task of this hour has flown, and
both earlier T's were superseded before playback. Precedence: **A7 > A6 > … > the registration.** Everything not named
here stands.

**The user's ruling, verbatim** (in chat, ~23:58 TST 2026-10-05): "run the flight at 3 am, when done do the grading and
provide the full report; I will be sleeping then".

## A7.1 The two superseded T's

| T | superseded at | reason |
|---|---|---|
| 2026-10-06 00:00 | 23:56 | The 23:54 precheck FAILED only its `arming-record` gate, and disabled the flight task as designed. Every other gate was OK and the dry twin exited 0x0. Cause: the controller stamped `ARMING COMPLETE 2026-10-05T23:08:17.455+03:00`, which `eq-precheck.ps1:118` (format `yyyy-MM-ddTHH:mm:ss+03`) rejects. The gate did its job; the record was renamed aside (`ARMING-flight-eq.superseded-2356.md`) |
| 2026-10-06 00:45 | 23:58 | The re-arm (launchers regenerated, dry twin 0x0, tasks registered) was superseded by the user's ruling **before any arming record existed** |

Both are named as `Superseded:` lines in the new arming record (A6 m2: exactly one `T:` line).

**Stamp format, stated:** the `ARMING COMPLETE` stamp is exactly the gate's format, `yyyy-MM-ddTHH:mm:ss+03`, e.g.
`2026-10-06T02:41:07+03`. It has no milliseconds and no `:00` after the offset. The record is written by
`E\write-arming.mjs` in that format, and the format is checked against the gate's pattern before the rename (A6 I1).

## A7.2 The new T and window

- **T = 2026-10-06 03:00** (local, +03:00). **The latest start is 03:00.** The precheck runs at T − 6 = 02:54. The
  arming record must carry `ARMING COMPLETE` ≤ 02:50 (A6).
  - A4.6's "first quarter-hour ≥ now + 45 min" rule is replaced, for this flight, by the user's fixed T.
  - An overrun past 02:50, or any precheck FAIL, means **no flight at 03:00**, and there is no later T tonight. Both
    tasks are disabled (A5.2), and the hour is re-flown under §6 on another day.
- **The T range** becomes **2026-10-05 19:30 ≤ T ≤ 2026-10-06 03:00**. The lower bound is A1.1's, unchanged.
- **The playback-start window** (A1.1, A3.2 m14) becomes **2026-10-05T16:30:00.000Z ≤ startedAt ≤
  2026-10-06T00:30:00.000Z** (19:30:00 to 03:30:00 local). Only the end moves, from 01:30 to 03:30. Out of window =
  §5 item 5, as before.

**Why moving later changes no bar:**
- **Same quota day.** The lite reset is 10:00 local, so 2026-10-05 10:00 → 2026-10-06 10:00. The arming ledger bar
  (≥ 475 / ≥ 372, A2.2) is read against the same day.
- **The chain ends before the reset.** T 03:00 plus the 5 h task limit ends the chain by 08:00, before the 10:00 reset;
  A1.1's "no straddle" holds.
- **The post-hour arms run after the hour.** That covers the harness's `PAIRED_ARMS` inside the chain, then the reader,
  `eq-b4-cal` and the G sitting. They run on this quota day if they finish before 10:00. Otherwise A2.2/A3.4's sitting
  rule applies: the sitting moves whole to the next quota day, and every clause still gates, because both sides of
  every pair share one sitting.
- **Twin clauses are same-sitting.** 2a–2d, 3a, 4b and 4c are same-hour or same-sitting comparisons. 2e's br1 clocks
  were already reported only, with time of day named (A1.1). 3:00 is now named beside it in "does not show".
- **Grading is unchanged.** The graders, the grader count and the pinned `claude-opus-5-5` follow the user's ruling
  "when done do the grading": the post-hour pieces run unattended in the order A1.4/A2.5 give, each instrument
  calibrated and recorded before its first touch (A2.5). The full report is the result note of §8.

**Unchanged conditions, and the user's ruling on them:**
- The machine is quiet from T − 30 to `FLIGHT EXIT`.
- The user is logged on, on AC power, and the run is unattended (A1.2, A1.3, A2.6).
- **The user will be asleep: no one may use the PC from the arming record's completion to `FLIGHT EXIT`** — recorded as
  the user's ruling.
- A logoff, sleep or restart before T means no hour (A1.3). After T, rule 1(k) applies.

## A7.3 Tool constants that must change, each with its known-answer cases

Each tool re-runs its full calibration, and its new sha is recorded in `E\instruments.sha256.txt` (A2.5) before step 10
is repeated.

| tool | constant | new value | known answers (must flip) |
|---|---|---|---|
| `guard-eq.mjs` g4 (l. 25, 205, 209, 422 text) | `T_MAX` | 2026-10-06 03:00 | `NATIVELY_EQ_T` 2026-10-06 03:00 → passes g4; 03:01 → `GUARD FAILED g4`; 2026-10-05 19:29 → FAILED (unchanged) |
| `gen-launchers-eq.mjs` (l. 7–8, 48, 52) | `T_HI` | 2026-10-06 03:00 | `--t '2026-10-06 03:00'` → generated; `03:01` → refused |
| `register-eq.ps1` (l. 17, 143, 158–159) | `$hi` and the supersede text "≤ 01:00" | 2026-10-06 03:00 | `-T '2026-10-06 03:00'` → accepted; `03:01` → `REFUSED … outside`; the supersede text reads "≤ 03:00" |
| `window-eq.mjs` (l. 3, the `HI` constant, `WINDOW_TEXT` l. 17) | `HI` | `2026-10-06T00:30:00.000Z`; text `IN WINDOW 2026-10-05 19:30 .. 2026-10-06 03:30` | startedAt 2026-10-06T00:30:00.000Z (03:30:00) → IN; …00:30:00.001Z → OUT; 2026-10-05T22:30:00.001Z (old end + 1 ms) → now IN; 16:29:59.999Z → OUT; the whole calibration identical under `TZ=UTC` |
| `night-gates.ps1` | no constant; the `updates` coverage follows `-At` = [At − 30 min, At + 5 h] | — | real reading `-At '2026-10-06 03:00'` → window [02:30, 08:00]. Active hours 15→6 do not cover 08:00, so `updates` passes only on the pause (expiry 2026-10-14) → `NIGHT GATES OK`. Fake: active 15→6, no pause, At 03:00 → `FAIL updates`. Fake: active 15→8, no pause, At 03:00 → OK (08:00 inclusive) |

| `write-arming.mjs` | the stamp it writes | `yyyy-MM-ddTHH:mm:ss+03`, matched against the gate's regex `^ARMING COMPLETE (\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\+03$` (`eq-precheck.ps1`, l. 118) before the `.tmp` is renamed; no match → refuse | a stamp `2026-10-05T23:08:17.455+03:00` (the 23:54 failure) → refused; `2026-10-06T02:41:07+03` → written |

The dry twin's guard and the precheck use these tools unchanged otherwise. `eq-precheck.ps1` carries no T range (its
`-At` comes from `register-eq.ps1`).

## A7.4 Registration and launchers

- **New registered HEAD.** A7 is committed into MAIN `passes/` beside A1–A6 by the step-9 recipe, and that commit is
  the new registered HEAD. The guard's HEAD pin (`NATIVELY_FLIGHT_COMMIT`) and the HEAD-moved case (parent sha →
  FAILED, A5 m7) are re-run at it.
- **The launchers' `--passes` list grows by A7.** The launcher then prints A7's sha line with the others.
- **Steps 10–14 are repeated** with T = 2026-10-06 03:00: launchers, dry twin (0x0, `GUARD OK`, `NIGHT GATES OK`),
  registration (precheck 02:54, flight 03:00, NextRunTime read back), and the arming record. The arming record carries
  `T: 2026-10-06 03:00`, the two `Superseded:` lines, the new registered HEAD and A7's sha, and ends with an
  `ARMING COMPLETE` line in the gate's format, stamped ≤ 02:50.

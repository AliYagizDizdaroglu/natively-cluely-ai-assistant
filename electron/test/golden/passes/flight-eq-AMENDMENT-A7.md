# Amendment A7 to PREREGISTER-flight-eq.md: T = 2026-10-06 03:00, on the user's ruling (pre-data)

Written 2026-10-05 23:58 TST; **revised in place 2026-10-06 00:04 TST by `date`** after `E\A7-RECHECK.md`, before A7
was committed. The pre-revision text is kept byte-identical as `AMENDMENT-A7.rev1.md` (sha256 `35d0b374…047f`). Author:
Opus. **No flight datum exists**: no task of this hour has flown, and both earlier T's were superseded before playback.
Precedence: **A7 > A6 > … > the registration.** Everything not named here stands, except the superseded time texts
listed in A7.5.

**The user's ruling, verbatim** (in chat, ~23:58 TST 2026-10-05): "run the flight at 3 am, when done do the grading and
provide the full report; I will be sleeping then".

## A7.0 Resolutions of the A7 re-check

| item | resolution | where |
|---|---|---|
| I1 write-arming cases cannot run | ADOPTED with the controller's decision: no cal cases. After the rename, the tool reads back the real record's last line and tests it against the pattern extracted at runtime from `eq-precheck.ps1`; a mismatch → exit 2. Two in-memory known answers run before writing | A7.3 |
| I2 stale arming body | ADOPTED: the tool refuses unless the body's single `T:` line is exactly `T: 2026-10-06 03:00`; the body is refreshed | A7.4 |
| I3 10:00 boundary has no rule | ADOPTED: a start cutoff for the G sitting; the smaller same-day re-run budget is named | A7.2 |
| I4 no fresh ledger read | ADOPTED: the ledger is read fresh at step 14, quoted with its clock time, with router40's 48 calls on 3.1-lite included | A7.2, A7.4 |
| m1 old time texts | ADOPTED: listed as superseded | A7.5 |
| m2 no hashes section | ADOPTED | end |
| m3 stale guard line ref | ADOPTED: l. 25/205/209 | A7.3 |
| m4 A2.2's "~02:00–06:00" | ADOPTED: now ~04:00–08:00 (descriptive) | A7.5 |

## A7.1 The two superseded T's

| T | superseded at | reason |
|---|---|---|
| 2026-10-06 00:00 | 23:56 | The 23:54 precheck FAILED only its `arming-record` gate, and disabled the flight task as designed. Every other gate was OK and the dry twin exited 0x0. Cause: the stamp was written as `ARMING COMPLETE 2026-10-05T23:08:17.455+03:00`, which `eq-precheck.ps1` l. 118 (`yyyy-MM-ddTHH:mm:ss+03`) rejects. The record was renamed to `ARMING-flight-eq.superseded-2356.md` |
| 2026-10-06 00:45 | 23:58 | The re-arm (launchers regenerated, dry twin 0x0, tasks registered) was superseded by the user's ruling **before any arming record existed** |

Both appear as `Superseded:` lines in the new record (A6 m2: exactly one `T:` line). **The stamp format is exactly the
gate's**, `yyyy-MM-ddTHH:mm:ss+03` (e.g. `2026-10-06T02:41:07+03`): no milliseconds, and no `:00` after the offset.

## A7.2 The new T, the window, quota and the 10:00 boundary

- **T = 2026-10-06 03:00** (local, +03:00), **the latest start**.
  - The precheck runs at T − 6 = 02:54; the `ARMING COMPLETE` stamp must be ≤ 02:50 (A6).
  - A4.6's "now + 45 min" rule is replaced by the user's fixed T.
  - An overrun past 02:50, or any precheck FAIL → **no flight at 03:00 and no later T tonight**: both tasks are disabled
    (A5.2), and the hour is re-flown under §6 on another day.
- **T range: 2026-10-05 19:30 ≤ T ≤ 2026-10-06 03:00.** The lower bound is A1.1's, unchanged.
- **Playback-start window: 2026-10-05T16:30:00.000Z ≤ startedAt ≤ 2026-10-06T00:30:00.000Z** (19:30:00 to 03:30:00
  local). Out of window = §5 item 5.

**Why moving later changes no bar:**
- **Same quota day.** The lite reset is 10:00 local, so the day runs 2026-10-05 10:00 → 2026-10-06 10:00.
- **The chain ends before the reset.** T + the 5 h task limit ends the chain by 08:00; A1.1's "no straddle" holds.
- **Twin clauses are same-sitting.** 2a–2d, 3a, 4b and 4c are same-hour or same-sitting comparisons. 2e's br1 clocks
  were already reported only, with time of day named; 3:00 is named beside them in "does not show".
- **Grading is unchanged.** Graders, their count and the pinned `claude-opus-5-5` are as before. "When done do the
  grading" is the post-hour sequence of A1.4/A2.5, unattended, each instrument calibrated and recorded before its first
  touch. The full report is §8's result note.

**I4, the quota read at arming.** The ledger is **read fresh at step 14** (A1.1's "immediately before arming") and
quoted in the arming record **with its clock time**. The read counts router40's 48 calls on 3.1-lite
(`arming-body.md` records them as a superseding ruling). The bars are unchanged: ≥ 475 on 3.5-lite, ≥ 372 on 3.1-lite.
Less = no flight at 03:00.

**I3, the 10:00 boundary after the hour.**
- **The G sitting starts only if it is projected to finish before 10:00 local.** The projection = the start time + 3
  min × the sitting's 16 steps (≈ 48 min at |G_twin| = 4), so the latest same-day start is ≈ 09:12.
- **Otherwise it starts after 10:00**, on a fresh ledger read that meets A2.2 m6's bars (≥ 10·|G_twin| + 12 on
  3.5-lite, ≥ 6·|G_twin| + 8 on 3.1-lite). It is never split across 10:00 (A2.2, A3.4); every clause still gates.
- **Hole re-runs** (reg. §4, A3.4 m5) and A2.6's INCOMPLETE arm re-runs keep their "same quota day if the ledger
  allows" rule, with the same cutoff: start only if projected to end before 10:00. A G-sitting hole re-run belongs to
  the sitting's own quota day.
- **Named in "does not show": the smaller same-day re-run budget.** The chain ends by ~08:00 at worst (~04:15 at best)
  instead of ~06:00, leaving ≈ 2 h instead of ≈ 4 h before the reset. That raises the chance that an INCOMPLETE harness
  arm becomes a re-fly (§5 item 3).

**Unchanged conditions, and the user's ruling on them:**
- The machine is quiet from T − 30 to `FLIGHT EXIT`.
- The user is logged on, on AC power, and the run is unattended (A1.2, A1.3, A2.6).
- **The user will be asleep: no one may use the PC from the record's completion to `FLIGHT EXIT`** — recorded as the
  user's ruling.
- A logoff, sleep or restart before T means no hour (A1.3); after T, rule 1(k) applies.

## A7.3 Tool constants, each with its known-answer cases

Each changed tool re-runs its full calibration and records its new sha in `E\instruments.sha256.txt` (A2.5) before step
10 is repeated.

| tool | change | known answers (must flip) |
|---|---|---|
| `guard-eq.mjs` g4 (l. 25, 205, 209) | `T_MAX` = 2026-10-06 03:00 | `NATIVELY_EQ_T` 2026-10-06 03:00 → passes g4; 03:01 → `GUARD FAILED g4`; 2026-10-05 19:29 → FAILED |
| `gen-launchers-eq.mjs` (l. 7–8, 48, 52) | `T_HI` = 2026-10-06 03:00 | `--t '2026-10-06 03:00'` → generated; `03:01` → refused |
| `register-eq.ps1` (l. 17, 143, 158–159) | `$hi` = 2026-10-06 03:00; supersede text "≤ 03:00" | `-T '2026-10-06 03:00'` → accepted; `03:01` → refused |
| `window-eq.mjs` (l. 3, `HI`, `WINDOW_TEXT`) | `HI` = `2026-10-06T00:30:00.000Z`; text `… .. 2026-10-06 03:30` | 2026-10-06T00:30:00.000Z → IN; …00:30:00.001Z → OUT; 2026-10-05T22:30:00.001Z → IN; 16:29:59.999Z → OUT; identical under `TZ=UTC` |
| `night-gates.ps1` | none; `updates` coverage follows `-At` | real `-At '2026-10-06 03:00'` → [02:30, 08:00]; active hours 15→6 do not cover it, so it passes only on the pause (to 2026-10-14) → `NIGHT GATES OK`. Fake 15→6, no pause → `FAIL updates`; fake 15→8, no pause → OK |
| `write-arming.mjs` (I1, I2) | (a) refuses unless the body has exactly one `T:` line and it is `T: 2026-10-06 03:00`; (b) the pattern is extracted at runtime from `eq-precheck.ps1` (the `'^ARMING COMPLETE …'` literal), refusing if not found exactly once; (c) after the `.tmp` → record rename, it reads back the REAL record's last line and tests it against that pattern; mismatch → **exit 2**, loudly: "fix the record before the 02:54 precheck". No cal cases, and it never writes a cal record | Run in memory against the extracted pattern **before writing**: `ARMING COMPLETE 2026-10-05T23:08:17.455+03:00` (the 23:54 failure) → refused; `ARMING COMPLETE 2026-10-06T02:41:07+03` → accepted. Either answer wrong → exit 2, nothing written. Body with `T: 2026-10-06 00:45` → refused |

`eq-precheck.ps1` carries no T range: its `-At` comes from `register-eq.ps1`. The 23:54 precheck already showed the gate
fails closed on the malformed stamp.

## A7.4 Registration, launchers and the refreshed arming record

- **New registered HEAD.** A7 (this revision) is committed into MAIN `passes/` beside A1–A6 by the step-9 recipe, and
  that commit is the new registered HEAD. The HEAD pin and the HEAD-moved case (parent sha → FAILED) are re-run at it.
- **The launchers' `--passes` list grows by A7.**
- **Steps 10–14 are repeated** with T = 2026-10-06 03:00: launchers, dry twin, registration (precheck 02:54, flight
  03:00, NextRunTime read back), and the record.
- **The body (`arming-body.md`) is refreshed (I2) before `write-arming.mjs` runs.** It holds:
  - `T: 2026-10-06 03:00` (one line), `Superseded: 2026-10-06 00:00 …` and `Superseded: 2026-10-06 00:45 …` with
    A7.1's reasons;
  - the 23:58 ruling verbatim;
  - a fresh quota ledger read with its clock time (I4);
  - night gates read at `-At '2026-10-06 03:00'`;
  - the new dry twin's result (0x0, `GUARD OK`, `NIGHT GATES OK`, duration) and the verify read;
  - the new registered HEAD and A7's sha;
  - confirmation text that names start 03:00 and the PC unused while the user sleeps.
- **The record ends with `ARMING COMPLETE <yyyy-MM-ddTHH:mm:ss+03>` ≤ 02:50.**

## A7.5 Superseded time texts (m1, m4)

These read as replaced by A7.2 for this flight:

| text | now reads |
|---|---|
| A1.1 "not all passed by 00:50" | "not all passed by 02:50" |
| A2 header "T in 19:30–01:00" | "19:30 to 03:00" |
| A4.6 "If T > 01:00, there is no flight tonight" | T > 03:00 |
| A5.2 overrun item 4 "still ≤ 01:00" | ≤ 03:00 |
| A2.2's descriptive "night flight ends ~02:00–06:00" | ~04:00–08:00 |

`register-eq.ps1`'s "(still <= 03:00 …)" agrees with A7's "no later T tonight": any T > 03:00 is refused.

## Hashes as read (sha256)

- `PREREGISTER-flight-eq.md` `9ca3149bfb5ed44bff9f7d7c81e6203c15d9fe1b6442b47210ccfb59e2d14f44`
- `AMENDMENT-A1.md` `3e3f0ddd2ace1586bc4137394ee5c27868bf7ae121b73f1605519b8cd1d863c8`
- `AMENDMENT-A2.md` `0bd449be9b3bc68c80b3711308b1b4916f21e479fa36adac57a27eea0089f68e`
- `AMENDMENT-A3.md` `36aa80002a6b36d41a5c0ac613e4e7f705f81faa46b559566e9edaad79e31d6e`
- `AMENDMENT-A4.md` `1e0ac7735fce2f857a74588521d43d0b73e721e5c95f1bab0a7e13cee4cd26e0`
- `AMENDMENT-A5.md` `a1f9a2e0a185bbb7a93eef07e866325981b8ddc4cabe87b7ac0b4d1abbe876b6`
- `AMENDMENT-A6.md` `92929cd322dd52e8cd4aa10d3da97f3ac42b37cdcd8c6d40d256a80f0af2e303`
- `AMENDMENT-A7.rev1.md` (this file before revision) `35d0b37453785d3bc1b89b1cb76c5c6104f1c5946000f40181948911464e047f`

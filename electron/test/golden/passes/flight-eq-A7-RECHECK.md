# A7 re-check (Opus, read-only, 2026-10-06)

**Verdict: OK WITH FIXES** — no BLOCKING item. A7 changes no bar, metric, roster, arm or grader. Every rule that depends
on the window is covered or overridden by precedence. Four IMPORTANT items should be fixed before step 14.

Seal: `sha256sum AMENDMENT-A7.md` = `35d0b37453785d3bc1b89b1cb76c5c6104f1c5946000f40181948911464e047f`, which matches.
The registration and A1–A6 are unedited: their hashes match A6's list, and A6 = `92929cd3…`, as in `arming-body.md`.

## (1) Bars, metrics, roster, arms, graders

None changed. A7 changes only T, the startedAt window end, the stamp format (procedural) and the tool constants.
The grader pin is `claude-opus-5-5`, consistent with reg. l. 328/332, A2 and A3.

## (2) Rules that depend on the window

| rule | status |
|---|---|
| T range / start (A1.1, guard g4, gen T_HI, register $hi) | covered. The tools already read 03:00 (guard-eq.mjs:106, gen-launchers-eq.mjs:48, register-eq.ps1:158) |
| startedAt window (A1.1, A2.3, A3 m14) | covered. window-eq.mjs:16 HI = 2026-10-06T00:30:00.000Z, inclusive. The margin is 30 min after T, as before |
| 5 h task limit | covered. The chain ends by 08:00, before the 10:00 reset |
| precheck -At / stamp | consistent. -At = T−6 = 02:54. Stamp ≤ At−4 = 02:50 (eq-precheck.ps1:129). write-arming refuses after T−10 = 02:50, with the same edge |
| night gates `updates` | covered. [02:30, 08:00] passes only on the pause (to 2026-10-14). A7 states this |
| quota day | same day (10-05 10:00 → 10-06 10:00). A fresh read is still needed: see I2 |
| G sitting / same-day re-runs | the rule is unchanged, but its time budget shrinks: see I3 |

Text that still names an old time. Each is overridden by A7's precedence, and none would refuse 03:00:
- A1.1 "not all passed by 00:50".
- A4.6 "If T > 01:00, there is no flight tonight".
- A5.2 overrun item 4 "still ≤ 01:00".
- A2 l. 9 "T in 19:30–01:00".
- register-eq.ps1:143 "(still <= 03:00, else no flight tonight)" against A7's "no later T tonight". These are functionally the same, because any new T > 03:00 is refused.

## Findings

- **IMPORTANT I1.** The write-arming known answers in A7.3 cannot be run as worded:
  - `write-arming.mjs` takes its stamp from `now`, so it accepts no injected stamp and has no output path.
  - Its regex check tests its own formatter, so the check is tautological.
  - Running it for calibration would write the real `E\ARMING-flight-eq.md`, against the spirit of A6 m1.
  - Fix: add `--stamp`/`--out` hooks and run the cases into `E\eqcal-arming\`. Or reword the row: after the write, match the real record's last line against the l. 118 pattern. The 23:54 precheck already proved that the malformed stamp fails closed.
- **IMPORTANT I2.** `arming-body.md` (23:58) is the 00:45 draft, and `write-arming.mjs` copies it verbatim. It does not check that the body's `T:` equals its own T constant (03:00). Stale parts:
  - `T: 2026-10-06 00:45`, and no `Superseded: 00:45` line.
  - Ledger reads at 21:41 and 22:30. A1.1 requires a read "immediately before arming".
  - Night gates read at `-At 2026-10-06 00:00`.
  - The confirmation text "up to ~01:00 / start 00:00".

  A stale T fails closed at the precheck, so the flight is lost with no later T. Fix: update the body (with a fresh ledger read, night gates at -At 03:00, both Superseded lines and the 23:58 ruling). Make write-arming refuse when the body's `T:` ≠ `2026-10-06 03:00`.
- **IMPORTANT I3.** The 10:00 boundary after the hour has no decision rule, and moving T from 01:00 to 03:00 leaves about 2 h instead of about 4 h between the chain's end and the reset:
  - A2.2 m6 / A3.4 say the sitting is "never split across days", but nothing says when the sitting may start.
  - The reg. §4 hole re-runs, §5 item 3 and A2.6's INCOMPLETE re-runs all require "the same quota day … else re-fly".
  - Fix: state the start cutoff. For example, start the sitting only if its estimated end is < 10:00, else start after 10:00 on the new day's ledger re-read. Also name in "does not show" that the shorter same-day re-run budget raises the chance that an INCOMPLETE leads to a re-fly.
- **IMPORTANT I4.** A7's quota paragraph says the bar "is read against the same day" but does not require a fresh read at the new arming. Fix: say the ledger is re-read at step 14 (A1.1) and quoted with its clock time. That read includes router40's 48 3.1-lite calls, which `arming-body.md` records as a superseding ruling.
- **MINOR m1.** A7 says "Everything not named here stands". Name the superseded time texts listed above, so that no literal reader keeps them.
- **MINOR m2.** A7 has no "Hashes as read" section for the registration and A1–A6, unlike A6.
- **MINOR m3.** A7.3 cites guard-eq.mjs "l. 422 text", but l. 422 holds no window text now. The window text is at l. 25/205/209. The line reference is stale and harmless.
- **MINOR m4.** A2.2's prose "night flight ends ~02:00–06:00" is now ~04:00–08:00. It is descriptive and gates nothing.

## (3) Contradictions inside A7

There are none of substance:
- 02:54, ≤ 02:50, 03:30 and 08:00 agree with each other and with A5.2/A6 and the tools.
- "No later T tonight" is consistent with T_MAX = 03:00.

## Not shown

- I did not run any tool or calibration.
- I did not read the tools' calibration outputs after the A7 edits, or `instruments.sha256.txt`.
- The launchers still carry `NATIVELY_EQ_T=2026-10-06 00:45`. That is expected until step 10 is repeated, and it was not checked further.

## Scoped re-check of the revision

**Verdict: OK WITH FIXES.** All eight items (I1–I4, m1–m4) are adopted. The revision adds no bar change and no
contradiction. One IMPORTANT item remains, on the controller's side (R1).

Seals:
- `AMENDMENT-A7.md` = `91f252b376967119fb1f4c0344a33186395fe31cbc7875e366adfc67a67349a4`, which matches.
- `AMENDMENT-A7.rev1.md` = `35d0b374…047f`, byte-identical to the text I checked first.

### Adoption

| item | adopted? | check |
|---|---|---|
| I1 | yes | A7.3 row. The tool extracts the pattern from `eq-precheck.ps1`, runs two in-memory known answers before writing, and reads the real record's last line back after the rename (exit 2 on a mismatch) |
| I2 | yes | The tool refuses any body whose single `T:` line is not `T: 2026-10-06 03:00`. A7.4 lists the refreshed body's contents |
| I3 | yes | A7.2 sets a start cutoff for the sitting (start + 3 min × 16 steps < 10:00; latest start ≈ 09:12), else after 10:00 on a fresh m6 read. The same cutoff applies to hole and INCOMPLETE re-runs. The smaller budget is named in "does not show" |
| I4 | yes | Fresh ledger read at step 14, quoted with its clock time, router40's 48 calls included. The bars are unchanged |
| m1, m4 | yes | A7.5 table, and the header names the A7.5 exception |
| m2 | yes | Hashes section added. A1–A6 still match these hashes |
| m3 | yes | `guard-eq.mjs` l. 25/205/209 |

### Bars and contradictions

- **Bars:** none changed. 475/372, m6's formulas, the window, the roster, the arms and the grader pin are as before.
- **The I3 cutoff** adds a constraint on when the sitting and re-runs start, not a bar.
- **The "full calibration" heading** has an explicit exception in the `write-arming` row, so it is not a contradiction.

### `write-arming.mjs` (00:04) against the revised I1/I2

Correct on:
- **Pattern extraction:** `'(\^ARMING COMPLETE [^']+)'` finds exactly one literal in `eq-precheck.ps1` (l. 118). The comment at l. 23 uses backticks, so it is not matched.
- **Escaping:** the literal is the same under .NET and JS (`\d`, `\+`, `^…$`).
- **Known answers:** the .455+03:00 stamp is refused and the 02:41:07+03 stamp is accepted. Either one wrong → exit 2, before anything is written.
- **T line:** exactly one `^T: ` line, equal to `T: 2026-10-06 03:00`.
- **Read-back:** after the rename, the last non-empty line is read back. This is the same reading the precheck makes (its TrimEnd and empty-line filter); LF endings, so no CR.
- **02:50 edge:** the tool refuses after 02:50:00.000. The stamp is truncated to seconds, so it is ≤ At − 4 = 02:50:00, as the precheck requires.

### Findings

- **IMPORTANT R1 (controller, before step 14).** `arming-body.md` (00:04) has only its `T:` and `Superseded:` lines refreshed. Still stale:
  - the ledger "read 21:41 and 22:30";
  - night gates at `-At 2026-10-06 00:00`;
  - the dry twin, tools and machine state at 23:07;
  - the registered HEAD e0056c4 (A7 is not yet committed);
  - the confirmation text.

  `write-arming.mjs` now accepts this body, and the precheck would pass it, because neither checks those parts. A7.4/I4 are therefore enforced only by hand. Fix: refresh all of them at step 14. Cheap guard: make the tool also require `-At 2026-10-06 03:00` and A7's sha `91f252b3` in the body.
- **MINOR R2.** A7.3 says the pattern is "refused if not found exactly once", but the tool uses a non-global `match`, so it does not test uniqueness. There is 1 occurrence today, so this is harmless.
- **MINOR R3.** A7.3 lists "body with `T: 2026-10-06 00:45` → refused" as a known answer. A7.0 says two in-memory answers run, and the tool does not exercise the 00:45 case. The check exists, but it has not been calibrated.
- **MINOR R4.** I3's "3 min per step" has no stated provenance. A7 does not say what happens if a sitting that was projected in time still runs past 10:00. Suggest: "it completes; calls after 10:00 count on the new day; no clause changes". A straddle can only add quota headroom.
- **MINOR R5.** The pre-write `GATE` test on the tool's own formatter is still tautological. It is harmless, because the read-back covers it.

### Not shown

- I did not run `write-arming.mjs` or any other tool.
- I did not check the 00:04 tool's sha in `instruments.sha256.txt`.

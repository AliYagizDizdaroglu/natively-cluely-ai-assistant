VERDICT: APPROVE WITH FIXES

# Re-check of AMENDMENT-A1.md (fresh Opus, 2026-10-05 ~17:5x TST, before any router40 call)

**Hashes verified (node `crypto`, LF files):**
- A1's seal (every byte above its seal line) = `483c56ccb7758b88104dd406abf6c52f40f85e795d24488c2a3e0e28a7fe3265`: **equal**. Whole file `132739e6…f8aa`, 19,084 bytes.
- A1's "Read as" lines all equal: registration whole `5b7daaee…b446057` and seal `2d38dd89…860c16f`; PREREG-REVIEW `5eed93a2…c0457`; USER-RULINGS `6dfc40f6…928b8`.

**What I read:** the four files named, flight-eq A2.2 and A2.10 (for F, the G sitting and how it is launched), and the `Natively-*` task list. From the task list I read names, states and times only, at 17:51: `Natively-smoke-eq` is now Ready with no next run, and no `Natively-flight-eq` exists. I read no prompt contents, answer texts or keys. I made no model call and used no subagent.

**Not shown:**
- I did not re-measure A1.4's offsets (150 / 667 chars) or its three builder booleans. That would mean reading captured prompt contents. The arithmetic does match: 150 − 131 = 19 = `<intent_and_shape>\n`.
- No harness exists, so no calibration in A1.8 was run.
- The RPM contention in I4 is reasoned, not measured.

## Resolution check

Each review item is resolved in substance:
- **C1:** B is the routing block; the sentence is corrected; B's expectation is added.
- **C2:** resolved by K1. With 0 lite calls on the 2026-10-05 quota day, the unit question does not arise tonight.
- **Important and minor items:** I1–I6 and m1–m10 are adopted as worded, or better (I1 measures the element exactly; m3 is fixed by the chain history rather than only named).
- **D1–D4:** recorded. D3's supersession is flagged as untold.

**The readings table stays total and unambiguous.** The rows are unchanged, and every new class (`cut`, `early`, extended `malformed`) routes to L. So `EASY_caught`, `AF_answered`, `acc_R`, `wrong_R` and `M` each have exactly one definition.

**The day split's consequences are stated:** Live/lite day variance, `lead` across two days and two clocks (A1.2, A1.9), the 20:30 deadline scope, and the R naming.

**The CAP' formula is arithmetically sound:** L ≤ CAP' leaves ≥ F + 20 for the flight, and a double count of a partly-run sitting errs closed. But it does not fail closed on its inputs (I1, I2), and the guards have two blind spots (I3, I4).

**Nothing in A1 can spend 3.5-lite or full Flash** (but see m5 on the check's scope).

## Important

**I1. No tool enforces "L after 10:00 on 2026-10-06", and the gate passes with U = 0 before it.**
- **The gap.** A1.2 says "after 10:00". Neither A1.6 nor P9 nor `lite-l.mjs` checks it.
- **What happens at 09:30 on 2026-10-06.** U's window starts at 07:00Z, which is still in the future, so the ledger reads 0 and CAP' = 60 PASS. L would then spend the 2026-10-05 quota day, the flight's day: its unattended post-hour arms and G sitting run until about 02:00–06:00. That breaks K1's premise ("0 lite requests on this quota day"), and the gate cannot catch it.
- **Fix, appended to A1.6's "tomorrow" bullet:**
  > "L (start and every item) refuses unless now ≥ 2026-10-06 10:00:00 local; U's window is [the latest 07:00Z ≤ now, now] and P9 FAILs if that instant is not 2026-10-06T07:00:00Z. P9 decides its mode from now's local date and the arm: R on 2026-10-05 = tonight rules; L on 2026-10-05, or before 10:00 on 2026-10-06 = FAIL."
- **Add these P9 cases:**
  - `--arm L --now 2026-10-06T09:59` → FAIL
  - `--arm L --now 2026-10-05T19:00` → FAIL
  - `--arm L --now 2026-10-06T10:01`, stub U = 0, F = 0 → CAP' 60 PASS

**I2. CAP' does not fail closed on bad inputs.**
- **The four holes.** Each would raise CAP' or leave it unbounded:
  1. A failed or unparseable ledger read can become U = 0.
  2. An answers file whose entries carry no `model` field counts 0. The flight's `interview60.answers.mjs` arm files may hold the model at file level only.
  3. An F line with no fixed format, no date, or a negative or non-integer value is accepted.
  4. A restart honours only "never raises", not a lower fresh CAP'.
- **Fix, in A1.3:**
  > "P9 FAILs when `quota-ledger-today.mjs` exits ≠ 0 or its 3.1-lite count line is absent or not an integer; when a listed answers file outside R40 has no model at entry or file level (count by the file-level model if only that exists); and unless `USER-RULINGS.txt` holds exactly one line matching `^F 2026-10-06: (\d+) — <reason>$` written by the controller, with 0 ≤ F ≤ 500. A restart runs at min(recorded cap, the new `--cap`). The answers-file part of U counts entries, a lower bound on requests (retries are invisible); the 20 margin covers it."
- **Add these cases:**
  - P9: stub ledger exit 1 → FAIL; a ledger text with no count line → FAIL; an answers file with no model → FAIL; `F 2026-10-05: 0` → FAIL; two F lines → FAIL; `F 2026-10-06: -5` → FAIL.
  - P4 (h'): recorded cap 55, restart with `--cap 50` → runs at 50.

**I3. No calibration distinguishes a per-chain or per-item guard from a start-only guard. That distinction is I5's whole point.**
- **P2:** "a stub deadline inside the next chain's est → no chain starts" also passes when the guard runs only at start.
- **P4:** has no guard case at all.
- **Fix, replace in P2:**
  > "stub deadline that admits chain 1's est but not chain 2's → exactly 1 chain runs, the run saves, exits, R INCOMPLETE; a stub task list that turns a `Natively-*` task Running after chain 1 → exactly 1 chain runs"
- **Fix, add to P4:**
  > "(m) stub fetch, stub deadline admitting 2 items' est → exactly 2 items asked, then saved and exited INCOMPLETE; a stub task turning Running after item 1 → exactly 1 item asked"

**I4. Tomorrow's guard cannot see the flight's G sitting if it overlaps L.**
- **Why the guard misses it.** `eq-gsitting.ps1` runs `interview60.answers.mjs` arms from MAIN (flight-eq A2.10). These are node processes, not electron. They are not necessarily a scheduled task, and they have no NextRunTime.
- **What overlap would do.** L and the sitting would then call 3.1-lite concurrently. Rate-limit 429s would put holes in the flight's gating twin pairs (2b–2d, 3a, 4b, 4c). F protects the daily count, not concurrency.
- **Fix, added to A1.6's guard list (tomorrow, L and R):**
  > "`E\gsitting.log` has no `STEP … start` line without its `end`; no node.exe command line contains `interview60.answers.mjs` or `eq-gsitting` (boolean only, argv never printed); and the F line states `G sitting: done | none today | pending from <hh:mm>`. If pending, deadline = min(T_any, that time) − 30 min."
- **Add these P9 cases:** stub gsitting.log with an open STEP → FAIL; a stub process list holding that argv → FAIL; `pending from 11:00` with now 10:40 → FAIL.

**I5. P3's 17 synthetic cases do not exercise two of I2's new rules, and their expected classes are written for variant A.**
- **The missing rules.** Neither "'hard' among the last 3 words" nor "a later completed turn starting with 'hard'" has a case, so removing either check flips nothing.
- **The variant problem.** The registered cases "150 words → answer" and "151 → too-long (A)" are wrong under B, the run variant.
- **Fix, replace A1.5's P3 (a):**
  > "the synthetic file grows to **19 cases** run with `--variant B` (+ 'Redis is an in-memory store, so this one is hard' → malformed; two completed turns, the second 'hard' → malformed); expected classes under B: 151, 150 and 81 words → too-long, **80 words → answer** (the boundary), 40 words → answer; one flipped expectation must be reported."

## Minor

- **m1. Tonight's deadline ignores every task but flight-eq.**
  - Today a flight-eq task implies the smoke passed, and its precheck runs at T − 6, so I see no live hole.
  - Fix in A1.6 tonight: "`deadline = min(20:30, T_flight − 30 min, T_any − 30 min)`, with T_any as tomorrow's".
  - P9 cases: flight-eq 21:00 + `Natively-smoke-eq` next 19:40 → deadline 19:10; a stub process list with electron.exe → FAIL; one with tail.exe → FAIL. That process check has no known answer anywhere.
- **m2. Expectation text.**
  - "A1.1's 'Expected 13–17' replaces §7's 'Under B: `EASY_caught` 14–19'. §7's 'false EASY 1–3' stands."
  - "§5's 'the seven classes' reads 'the nine classes'."
- **m3. F's definition.**
  - Add to A1.3: "F includes any flight piece that slipped onto 2026-10-06's quota day: the G sitting, any post-hour arm still unrun, hole re-runs, or a postponed flight (its 372 bar)."
  - Add: "If L runs on a quota day the flight also uses, `router40 3.1-lite requests sent: N` goes to the flight's controller before the G sitting's m6 re-read and is added to it."
- **m4. Which R is graded.**
  - Add to A1.2: "Exactly one complete R run may exist. It is named `router40-R`, is graded, and is never re-run. Every stopped run is named `router40-R-<hhmm>` (replacing the registration's 'under a new name') and is never graded."
  - This forbids choosing between complete R runs.
- **m5. The model-id check's scope.** "No `3.5`" misses full-Flash ids.
  - Replace P4 (f): "the file contains exactly one `gemini-` id string, `gemini-3.1-flash-lite`; before each fetch the URL's model segment is asserted equal to it".
  - Add to P2: "the session model is asserted `gemini-3.8-live` before connect".
- **m6. Timing details.**
  - "R starts only if now + Σ chains' est < deadline" (replaces 'R full run by 19:50').
  - "The guard runs before every chain attempt, retries included."
  - "`lite-l` aborts an attempt at 90 s (a failed attempt), so an item's 120 s est holds."
- **m7. Overnight §0 drift.**
  - MAIN's dist filter and judge may change before tomorrow.
  - Add: "Tomorrow a §0 or filter hash mismatch at L's or grading's start is a FAIL. L or grading waits for a dated amendment naming the new hash. No arm runs on a §0 input other than the registered one without it."
- **m8. D3's supersession.** Add before L: "`USER-RULINGS.txt` holds a dated line recording that the user was told K1 supersedes D3."

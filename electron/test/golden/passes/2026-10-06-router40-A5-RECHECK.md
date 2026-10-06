VERDICT: APPROVE

# A5 (+ A6) re-check: router40 tonight

Re-checked 2026-10-05 ~21:50 TST by a fresh Opus reviewer. Scoped, quick re-check. No model calls, no prompts or answers or keys read, nothing edited but this file.

## Seals and inputs (verified with node sha256)

- A5 seal (every byte above the seal line) = `7b8f78fd065e41a7060397f63df2c4611d400c24b812149e1e3f6c09ae2a9896`. **MATCH.** Whole-file A5 = `1bb7537e…0161`, which matches A6's "read as".
- A6 seal = `fb32a0a0906d4d27255566640d35077527ca972e6aa92df52b3cd146530eda4e`. **MATCH.**
- A5's "read as" hashes: registration, A1, A2, A3 and A4 **all match** the files on disk now.
- A5's `USER-RULINGS.txt` hash `8e5e3b40…` equals the file's **first 5 lines (665 bytes)**, which ends at the 17:58 controller line. The file now has 9 lines (`9b6fb31e…`): the 21:41 U2 line, the 21:43 U3 line, the TONIGHT line and the 21:47 U4 line were added after it. A5 quotes U2 and U3 as relayed in chat, and their content matches the file (see m6).

## Scope checks

1. **The rulings are implemented faithfully: yes.**
   - "Run tonight": A5 sets the window to [2026-10-05 21:45, 23:15) local. There is no 2026-10-06 window for R or L any more (A5.1).
   - "3.8 Live as ear and easy answerer, 3.1-lite for medium/hard": R is pinned to `gemini-3.8-live`. The hard path is R composed with L.
   - Thinking level: HIGH (U3) was set in A5.7, then reverted to LOW by A6 under the user's 21:47 ruling.
2. **The window and guards fail closed against the flight: yes.**
   - A check runs before every L item, every R chain attempt (retries included) and every grader/classifier launch.
   - It requires `now + remaining est < min(23:15, T_any − 30 min)`. `T_any` is the earliest future NextRunTime of any `Natively-*` task, which covers every `Natively-flight-eq*`.
   - A Running `Natively-*` task fails the check.
   - An unreadable task list or process list fails the check.
   - "Flight-eq not armed" is not trusted on its own word: the T_any read backs it.
   - Live calibration at 21:48: `readTasks()` returned all 43 `Natively-*` tasks, all Ready, none with a NextRunTime, and no flight-eq task yet. The reader sees real tasks.
   - Residual edges are listed under Minor (m1–m3). None of them lets router40 reach within about 27 min of a flight T that the guard can see.
3. **Nothing can spend 3.5-lite or full Flash: yes.**
   - Every Gemini id in the harness: `lite-l.mjs` pins `gemini-3.1-flash-lite`; `run-r.mjs` pins `gemini-3.8-live`; `pre-run-r40.mjs` only reads the 3.1-lite id.
   - `quota-ledger-today.mjs` only reads logs (a regex over the lite ids). It makes no calls.
   - The graders and the l38base classifiers are Opus (`claude-opus-5-5` pinned), not Gemini.
   - The flight's ear is `gemini-3.1-flash-live-preview`, a different model from R's `gemini-3.8-live`, so R draws on no flight model quota.
4. **The readings table is still total: yes.**
   - A5 and A6 change no row of §7. Row 1 (INCOMPLETE) absorbs every new stop path: the 23:15 cap, T_any, a Running task, and grading deferred or failed. Row 5 is the catch-all.
   - With A6, L is again the app's shipped back-leg config (3.1-lite LOW, temperature 0.4), so `acc_R` vs `acc_L` and `lead` mean what the registration meant.
5. **The stated consequences of HIGH and of concurrency are honest.**
   - A5.7 (HIGH) was honest: the TTFT range was labelled a guess, the 90 s abort risk was named, the shift of lead toward ≥ 1 s was named, and it said the arm was not the shipped leg.
   - A6 withdraws all of those, and correctly restores A1.7 m2's "3–9 s". I verified that m2 replaced the registration's 1.5–3.5 s.
   - The concurrency cost is named for L's TTFT but not for R (m4).
6. **A6 does exactly the revert and nothing else: yes.**
   - It sets the level back to LOW everywhere and turns the P4 known-answer case around (exact body with `'LOW'`; a mutated `'HIGH'` copy must FAIL).
   - It withdraws A5.7, including the "not the shipped leg" / CANDIDATE caveat, the 5–20 s range, the 90 s-abort remark and the quality remark.
   - Everything else in A5 is kept explicitly.
   - Keeping L's 40 s per later item is correctly called stricter at LOW.

No Critical. No Important.

## Minor (recorded, not blocking)

- **m1. L's current-item estimate is shorter than its own worst case.**
  - `est` for the current L item is 120 s, but the item can take up to 3 attempts × 90 s abort + 2 × 8 s backoff ≈ 286 s.
  - So an L item that passes the check at 23:12:59 can run until about 23:17:45. The "23:15 hard end" is a start gate, not a hard stop.
  - The flight stays safe: the overrun into the T − 30 min margin is at most about 166 s, which still leaves about 27 min before T.
  - R uses its chain's worst case, so R has no such gap.
  - Recommended one-constant fix before arming: current-item est = 290 s.
- **m2. "Running task → stop" is enforced only between items and chains.**
  - A flight task that starts mid-item is caught at the next check, at most one L item (~4.8 min) or one R chain later.
  - It can only start inside that gap if someone starts it by hand, or arms it with a trigger less than 30 min away. The second breaks the controller's "T ≥ router end + 30 min" commitment.
  - No mid-item abort exists. Acceptable, but name it.
- **m3. `readTasks()` (pre-existing code, not A5) can fail open in two edge cases.**
  - It uses `Get-ScheduledTask … -ErrorAction SilentlyContinue`. If the cmdlet itself errors, the result is `[]`, which passes.
  - A task armed with no time trigger (on-demand) has no NextRunTime, so T_any does not see it until it is Running.
  - Observed working tonight (43 tasks read).
  - Cheap hardening: drop SilentlyContinue on `Get-ScheduledTask`, or require ≥ 1 `Natively-*` task to be read.
- **m4. The concurrency cost is understated, and its reason no longer holds.**
  - A5.1 names only L's TTFT being measured during R's stream. R's Live first-text, which is the other term of `lead`, is also measured during L's traffic.
  - The effect should be negligible against row 4's 1 s threshold when L's p50 is 3–9 s.
  - A5.1's reason for running R and L concurrently was HIGH's ~32 min. At LOW (A6), L sequentially would take about 10 min and the sequential order (~41 min total) would fit. A6 keeps concurrency, which is within "nothing else". Recorded so that the confound is a choice, not an accident.
- **m5. Tonight's grading will almost certainly be split, and A5.5 is ambiguous about it.**
  - §6.1 runs 8 sessions, at most 2 at a time, at 25 min est each, plus 2 classifiers. Because `launch-grader-r40.mjs` sits in the same-harness guard, launches are effectively serial.
  - After the arms end (~22:45 at the earliest), little or none of this fits before 23:15.
  - "A launch that would not pass → that grading waits for tomorrow" does not say whether one launch waits or the whole batch waits. So the blind batch could be split across two days.
  - The pinned grader id limits drift, so this does not make the reading wrong. Suggest: grade tonight only if all 10 launches fit; otherwise grade it all tomorrow.
- **m6. The ruling times in the amendments differ from the file.**
  - A5 says U2 and U3 were "~21:45". The file says 21:41 and 21:43.
  - A6 says U4 was "~21:50". The file says 21:47.
  - A6 does not record a `USER-RULINGS.txt` hash. Content matches; only the times differ.
- **m7. A known-answer case is missing for the real rulings file.**
  - Line 6 of the real `USER-RULINGS.txt` contains "TONIGHT" in the middle of the line.
  - The parser in `pre-run-r40.mjs` (being built now) uses a trimmed `startsWith('TONIGHT ')`, so that line is not a near-miss. That is correct.
  - A5.6 has no case for "a ruling line containing TONIGHT mid-line → PASS". Add it, since the live file has one.
- **Not checked:** I did not review the A5.6 build in progress (`pre-run-r40.mjs` already holds the TONIGHT constants) or its cases. A5/A6 say they must all pass before the first call. I did not review the flight-eq launcher's own guards against router40 processes, or K4's request estimate.

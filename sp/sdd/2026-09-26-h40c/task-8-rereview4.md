ALL ADDRESSED

# Task 8 re-review 4: fix round 4, plus a last read of PREREGISTER-h40c.md

Reviewer: Opus. Scope:
- the rulings on N-I1 and N-M1 to N-M3;
- the pre-registration's commit list;
- anything new;
- a whole-document read of PREREGISTER-h40c.md as the permanent record: is every rule computable exactly as written, and do any two sentences contradict.

Files as of 22:07-22:12. MAIN HEAD is e94305a.

What I ran, read-only:
- `h40c-hedge-stats.mjs` on nine existing fixtures, stdout only; no calibration script was re-run and no fixture was rebuilt;
- `git log 07a0e5e..HEAD`;
- byte checks on the launchers.

## Status of each ruling

- **N-I1: addressed.**
  - `rule2Verdict` is three-valued (stats:249-254).
    - FAIL when `answerFailures > 0`, or when median or p90 is over its ceiling with first-token coverage ≥ 90%.
    - Otherwise INCOMPLETE when something is undecided.
    - Otherwise PASS.
  - The report prints `verdict: …` with an "(also undecided: …)" aside (stats:320-329).
  - My three scenarios, read off the existing fixtures:
    - charged failures plus an unresolved window → `verdict: FAIL (also undecided …)` (ni1-failplus; synth likewise);
    - median 9 s at full coverage plus an unresolved window → `FAIL` (ni1-slowplus);
    - an unresolved window with everything else passing → `INCOMPLETE, cannot read PASS` (r2-unresolved).
  - Also correct:
    - thin coverage with nothing failed → INCOMPLETE (r6-sparse);
    - 1 resolved failure → FAIL (r2-failure);
    - clean fixtures → PASS (r2-delivered, r6-full).
  - A median over the ceiling on *thin* coverage stays INCOMPLETE, not FAIL (code: `&& firstTokenCoverageOk`), as ruled.
  - The pre-registration states the precedence at :130-138 and :160-166.
- **N-M1: addressed** in item 1 (:216-220): `git diff --stat <smoke HEAD>..<registered HEAD> -- electron src premium package.json` must be empty. One sentence elsewhere was left behind (R4-M1).
- **N-M2: addressed.** `buildSmokeWindow` throws when no diag line has a parseable timestamp (smoke-window:106). `pooled` is gone from the return value, the CLI line and the header. The recipe (:230-233) says the step "cannot be carried out … never silently substituted with a weaker, pooled measurement".
- **N-M3: addressed.**
  - :127 now says "CONTAINS".
  - launch-h40c-dry.cmd:40-44 mirrors launch-h40c.cmd:36-40.
  - Both launchers are CRLF (58/0 and 61/0) and ASCII, and their `set` lines are identical.
- **Commit list: correct.** Pre-registration :10-48 reads e311019, 6c50ec3, da28f25, 51e349d, 18242df, e94305a, then the pre-registration's own commit. `git log --reverse 07a0e5e..HEAD` gives exactly e311019, 6c50ec3, da28f25, 51e349d, 18242df, e94305a. The round-3 slip was in the report only, and the report's round-4 note corrects it.
- **Baseline still reproduces.** The h40b copy reads `first token n=44 median=5.026s p90=13.608s … median PASS, p90 PASS, failures PASS; verdict: PASS`.

## Whole-document read (the permanent record)

**Rules that `h40c-hedge-stats.mjs` computes exactly as written:**
- Rule 1 (a), (b) and (c): the startup line is the last match before the window (`=== 'on trigger=5000ms'`); (b) is front coverage `< 0.95`; (c) is `frontErrorCount / hedgeRuns >= 0.5`.
- The 3.5-lite share: per window, exact compare, over windows with a won-by line.
- Rule 2 in full: median ≤ 6.026, p90 ≤ 13.608, charged failures ≤ 0, UNRESOLVED windows, the 90% coverage floor, and the three-valued verdict.
- Each threshold's direction matches the text (`<` / `>=` / `<=`).

Rule 3 is the judge's. The grader is read from transcripts. Neither contradicts anything above. The gaps are listed in R4-M3.

**Contradictions or gaps:** two small ones (R4-M1, R4-M4). No contradiction between rules 1-3 or between the rules and the "What a FAIL, VOID, or INCOMPLETE means" section.

## New findings

Critical: none. Important: none.

### Minor

**R4-M1. The freeze paragraph contradicts item 1.**
- :205-207 says "Both items below run against that same frozen tree, after this pre-registration's own commit exists".
- :216-220 (N-M1) says a smoke "already run at a qualifying HEAD does not need to be re-run". That smoke may have run before the commit.
- **Fix:** "Item 2 runs after this commit. Item 1's smoke may predate it at a qualifying HEAD; its stats-script run and recorded output come after the commit and before arming."

**R4-M2. Blocking item 1 has no pass criterion.** :234-235 says "record the output before arming". Nothing it could show blocks arming, so the calibration never has to agree with a known answer.
- **Fix:** name the criterion. For example, on the `default` segment:
  - startup flag `on trigger=5000ms`;
  - rule 1 not void;
  - the script's dispatch-window, `won by` and winner counts equal what Task 7's checker counts independently for the same segment (one `front=` and one `won by` per answer, label `<winner> (hedge)`);
  - rule 2's verdict is not INCOMPLETE.
  Any mismatch blocks arming.

**R4-M3. Three items the rule relies on are not computed by any script as written.**
- The daytime-window test (:170-181) needs playback start in local time against 12:00-15:00. `timeline.startedAt` is in the run folder the stats script already reads, but it never prints the check. That decides whether the hour can PASS, so a one-line window check belongs in the script.
- The per-item twin-band reading (:150-152) needs a dispatch-window → roster-item join, which the judge's pairing and the stats script's windows each hold only half of. It is reported only.
- The percentile method is unstated. It is the element at `floor(n × p)` of the sorted list, the method that reproduces h40b's 5.026 and 13.608.
- **Fix:** add the window check to the script, or say it is read by hand from `startedAt`. Name who does the twin-band join. State the percentile in one clause.

**R4-M4. The "What a FAIL, VOID, or INCOMPLETE means" section leaves three cases open.**
- "(2) fails … the hedge is not faster in the app" (:154-155), but rule 2 can also fail on one charged answer failure with fast latency. Say "not faster, or it lost an answer".
- "(3) fails while … (2) holds" (:155-157) leaves (3) FAIL with (2) INCOMPLETE undefined. It is still a quality failure.
- An INCOMPLETE hour's outcome ("not a result to act on either way", :163-164) never says what happens next. Say it cannot PASS and is re-flown before any ship decision, mirroring the out-of-window wording at :178-181.

Counts: every ruling (N-I1, N-M1 to N-M3) is met and the commit list is correct. New: Critical 0, Important 0, Minor 4.

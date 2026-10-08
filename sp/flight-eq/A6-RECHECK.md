VERDICT: APPROVE WITH FIXES

# Re-check of AMENDMENT-A6.md (pre-data, narrow)

Fresh Opus, 2026-10-05. I edited no file except this one. I read no captured prompt, cue text, key or log; no model
call, no subagent, no tool or calibration run. Read: AMENDMENT-A6.md, A5-RECHECK.md, AMENDMENT-A5.md (A5.1, A5.2, the
pre-hour list); hashed the files below.

**Counts: 0 Critical, 0 Important, 2 Minor.** A6 carries every fix verbatim and the hashes are right. Two small
pre-hour-list points need wording: A5's clean calibration case now fails under A6's gate unless the stub gains the new
line (F1), and A6 adds one calibration case the re-checker did not word without saying so (F2).

## Holds (checked)

- **A6's own sha256** = `92929cd322dd52e8cd4aa10d3da97f3ac42b37cdcd8c6d40d256a80f0af2e303` (matches `92929cd3…e303`).
- **Hashes recorded in A6 = files on disk, all 7 match:**
  registration `9ca3149b…2d14f44`, A1 `3e3f0ddd…63c8`, A2 `0bd449be…f68e`, A3 `36aa8000…31d6e`, A4 `1e0ac773…26e0`,
  A5 `a1f9a2e0…76b6`, `tools-367-review.md` `d19d4f74…155cf` (full values identical to A6 l. 45-51).
- **Fixes vs `A5-RECHECK.md`, text compared word for word:**

| item | in A6 | verbatim | meaning |
|---|---|---|---|
| I1 | A6.1 l. 23-27 | yes (the trailing parenthetical is the re-checker's own rationale, l. 56; no new rule) | intact |
| I2 | A6.1 l. 28-31 | yes | intact |
| m1 | l. 32-33 | yes | intact |
| m2 | l. 34-35 | yes ("The" vs "the", capital only) | intact |
| m3 | l. 36-37 | yes, incl. "(fails closed)" | intact |
| m4 | l. 38-39 | yes | intact |
| m5 | l. 40-41 | yes, incl. "Post-hour" | intact |
| m6 | hashes, l. 51 | yes, same sha | intact |
| m7 | table only, "cosmetic; no text moved" | — | correct |

- **Resolutions table** paraphrases each fix faithfully (I2 row: "no expected VOID count" = the re-checker's intent);
  binds-at targets (A5.2, A5.1 1(e), A5.1 leak checker, A5.5 B-I1, steps 12/14) are the sections the re-checker named.
- **Nothing else in the rules is added or altered.** Precedence line is the standard one; A5.1 case (ii), the overrun
  procedure and everything else in A5 stand.
- **Step 14 vs A5's list:** A5 l. 223 "must end by T − 10"; A6 `ARMING COMPLETE <stamp>` ≤ `-At` − 4 min, and
  `-At` = T − 6 (A5.2), so ≤ T − 10. Consistent; it makes A5's deadline machine-checked.
- **Step 12 vs A5's list:** additions only; A5's five cases (stub OK, absent, At + 21, `-FakeFail port`, `-At '00:09'`)
  are untouched; stub location matches m1.

## Minor

**F1. A5's clean case ("stub record naming At + 6 → OK") now FAILs under A6's gate.** A6 makes `ARMING COMPLETE` with a
stamp ≤ `-At` − 4 min mandatory, but neither A6.1 nor A6's step-12 list updates A5.2's clean stub. Built as A5 words it,
the clean case reads `FAILED (1): arming-record`, which looks like a broken precheck; and without a passing stamped stub
the "At − 3 → FAIL" case does not flip.
- *Fix (A6 step 12, add as first bullet):* "the clean stub (A5.2) names At + 6, has exactly one `T:` line and ends with
  `ARMING COMPLETE <stamp>` with stamp ≤ At − 4 min → OK; each failing stub below is that clean stub with one change."

**F2. The two-`T:`-lines calibration case is A6's addition, undeclared, and its wording is looser than the others.**
m2 in A5-RECHECK words the rule only, no cal case; A6 says it "changes nothing else". The case is stricter and useful,
so keep it, but declare it. Also, step 12's first new bullet drops "naming At + 6" from I1's wording, and the third says
"FAILED" without the gate name.
- *Fix (A6 table, m2 row):* "ADOPTED as worded; A6 adds one cal case (two `T:` lines → `FAILED (1): arming-record`) so
  the rule flips".
- *Fix (A6 step 12 bullets):* "a stub naming At + 6 without `ARMING COMPLETE` → `FAILED (1): arming-record`;" and "a
  stub with two `T:` lines → `FAILED (1): arming-record`." (With F1's sentence each case isolates one change.)

## Not checked

- The `.tmp` file's fate in A5.2's overrun (step 2 renames only the `.md`); outside A6's scope and not raised by the
  A5 re-check. Low risk: the gate reads the `.md` only.
- Nothing was run; the gate's flips are read from the text, not measured.

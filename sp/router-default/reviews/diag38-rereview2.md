# diag38 re-review, round 2 (Opus): fixes to N1-N4

**Verdict: GO.** All four round-1 findings are fixed. No finding makes a reading wrong on r1. Two cosmetic Minors are left.

No model or network call was made, and `--run` was not exercised. `--select` and `--plan` wrote to the scratchpad (`--out-dir`), so `diag38\` is unchanged (10 files). The probes printed only ids, counts and scores.

## Re-run
- `cal-diag38.mjs`: CAL OK, 218/218.
- `cal-launch-grader-diag38.mjs`: CAL OK, 75/75.
- `mutants-diag38.mjs`: 64 of 64 killed.
- `--select` on r1:
  - 8 of 8 candidates, 0 cut.
  - Selected: `RH09(inapp, B-only) RH19(inapp) RE06(live, S:acceptable, A under RH04) RH08(live, S:acceptable) RH07 RH12 RH18(A under EF07) RE18(A under RH18)`. The last four are bare.
  - 0 refused, 17 captured-high verdicts dropped, 15 re-keyed captures.
- `--plan`: 15 of 20 requests (7 pairs + 1 B-only). "nothing was called". It prints the refused and cut lists.

## Prior findings
| Finding | Status | Evidence |
|--|--|--|
| N1 bare rows mislabelled | FIXED | See note 1. |
| N2 RH09 refused | FIXED | See note 2. |
| N3 refused/cut ids not listed | FIXED | `--plan` at `diag38.mjs:441-442`. `--read` at `diag38.mjs:540-544`. |
| N4 RE06 used a donor's CONTEXT | FIXED (superseded) | `rekeyCaptures` (`diag38.mjs:100-112`) gives RE06 its own capture, the one under RH04 (1.00). RH18 and RE18 get theirs too. |

1. N1 notes:
   - `reading()` has a bare branch at `diag38.mjs:305-312` and never says pipeline defect or ceiling there. Cal 198 covers it, and so do the mutants.
   - On r1, every bare item has exactly one shown answer, and it was graded acceptable:
     - RH07: Live, t16;
     - RH12: in-app, t31;
     - RH18: in-app, t47;
     - RE18: Live, t48.
   - So the label "no shown answer failed" is true for every bare item on r1.
2. N2 notes:
   - Any source with no match runs B-only (`diag38.mjs:151`, `365-367`). The in-app reading is at `diag38.mjs:313`.
   - RH09's best capture scores 0.12, so it has no capture at all.
   - Its donor is RE01, with the intent and USER QUESTION blocks removed (0 left).

## Hunt (ids and counts only)
- **Mis-keyed A:** none.
  - No capture key is claimed by two ids.
  - Each selected A beats the runner-up by a wide margin:
    | Item | A score | Runner-up |
    |--|--|--|
    | RH19 | 0.91 | 0.36 |
    | RE06 | 1.00 | 0.20 |
    | RH08 | 1.00 | 0.22 |
    | RH07 | 0.88 | 0.19 |
    | RH12 | 0.86 | 0.14 |
    | RH18 | 1.00 | 0.13 |
    | RE18 | 1.00 | 0.25 |
  - RE18 and RE06 match on few tokens (4 and 5). Both still score 1.00 against at most 0.25.
- **B leakage:** none.
  - No PREVIOUS / EARLIER / LIVE block is left.
  - The number of label lines is as expected: 2 for the RH08 follow-up and 1 for every other item.
  - The system prompt is identical.
  - Transcript 6-shingles outside the roster text: at most 1 per B. This is the known label shingle.
  - 6-shingles shared with any of the 339 graded answer texts: 0, except RH07 and RH08 (5 each). All 5 come from the roster question, which the answers echo. None is in the template head.
- **Labels:**
  - The two Live items with S acceptable get the fixed note, and their A/B result is ignored.
  - The RH09 in-app item reads on B alone.
  - RH19 gets the plain table.
- **Quota and pairing:**
  - 15 ≤ 20.
  - An item starts only while its pending requests + 1 remain (`diag38.mjs:496`).
  - Export drops an item that has an A but no B (`diag38.mjs:509`).

## Minor (non-blocking)
- **m1** (`DESIGN.md:10-11`): this text still says A is "keyed by roster id … the LAST dispatch's capture". Selection §0 overrides it, so it should point there.
- **m2** (`diag38.mjs:542`): `--read` prints the same "NO ROW … not answered or not graded" line for every selected item without a row. That includes an item `loadPlan` dropped (ambiguous at plan time, or B unbuildable), and the actual reason is not shown. Nothing on r1 reaches this line.

## Not shown
- The real runner and the 3.8 and `claude` calls were not run.
- The bare label is derived from the source rank. The code does not check that a shown answer exists and was accepted. This was verified for r1 only.
- RE06 and RH08 spend 4 of the 15 requests on rows whose label ignores A/B. This is by design.

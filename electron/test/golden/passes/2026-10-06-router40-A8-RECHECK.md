# A8 re-check (router40, pre-grading amendment, rev3)

Reviewer: Opus, fresh session, 2026-10-06. Read-only: nothing was executed except sha256 reads. No model call, no
scheduled task, no key read.

## Verdict

**APPROVE WITH CHANGES: 0 BLOCKING, 2 IMPORTANT, 5 MINOR.** A8 changes no bar, reading, grader, arm, classifier or
blinding. The order deviation is recorded honestly, and "changes no bar" holds. The one real defect is that A8
reverses a registered scheduling rule (§8) while saying that rule stands.

## Integrity

| file | expected | read | ok |
|---|---|---|---|
| A8 seal (bytes above the seal line, LF) | `9ade4c1f…2dd3` | `9ade4c1ff201777f7ce908a3c2fa94eb5683daf06e1849f96e2ab45a96352dd3` | yes |
| A8 whole file | — | `1bbb146e…e821` | (recorded) |
| registration | `5b7daaee…6057` | same | yes |
| AMENDMENT-A7.md | `12312418…9e9b` | same | yes |
| USER-RULINGS.txt | `6db50027…e2c5` | same | yes |
| HARNESS-REVIEW.md | `48fabcaa…fe92` | same | yes |
| A8.rev1 / rev2 | `5fead935…c7c2` / `68f3597a…59a2` | same | yes |

## Check 1: does A8 change a bar, reading, grader, arm, classifier or blinding?

No. §7 rows and thresholds, the 8 sessions with the pinned `claude-opus-5-5`, the flight recipe, one re-grade, arms
A/L/R (none re-run), c3/c4 with the 22/22 rule, and the 4 whole-item files with seed `blind:router40:r1` are all left
as registered (A8.5). The changes are scheduling (the date gate moves from 10:00 to 04:15, and sessions run 1 at a
time instead of ≤ 2) and harness preconditions (I1/I2). The ≤ 2 → 1 change was already in effect through A7 m5's
serial rule.

## Check 2: the order deviation (L before R)

It is recorded honestly. The 22:30 line in USER-RULINGS was a controller ruling, not an amendment, and A8.3 says so.
It cites HARNESS-REVIEW's schedule-risk note and dates the record before any grading. The consoles agree:
- L: COMPLETE, 47 answers, 0 holes, 48 requests, LOW.
- R smoke (C02): COMPLETE.
- R full: 31/31 chains in +1255 s, so ≈ 23:02 from a 22:41:14 t0, which is before the 22:45:47 latest start.
- No overlap between arms.

**"Changes no bar" is justified.** The arms do not depend on each other, and R's non-answer items reuse L's text,
which does not depend on order. A7 m4 protected one property: neither arm's latency (either term of `lead`) is
measured under the other's traffic. That property held. The inputs and caps match the registered ones (U4/A6 LOW).
The order only moved R closer to the 23:15 deadline, which affected schedule risk, not data.

## Check 3: are the preconditions sufficient and testable?

They are mostly testable: the gate cases (04:14 FAIL / 04:16 PASS), arms-complete, no F line, the G-sitting re-runs,
the I2 NOT-CLEAN → READING 1 case, a fresh Opus re-review, and the step-7 written check. Gaps: I-2 below and M-2 to M-4.

## Findings

### IMPORTANT

**I-1. A8 reverses registration §8's grading order while saying §8 stands.**
- §8 (line 318) says router40 grading runs "after the flight's hour has ended and after the flight's own graders have
  finished (never interleaved with them)".
- A2.1 withdrew only §8's 20:30 deadline and latest starts, so this clause is still in force.
- A8.1 orders flight hour → G sitting → **router40 block → flight-eq's graders**, and also says "registration §8 and
  A1.2 stand". The §0 table likewise says "Kept (K5)".
- Under A8's own clause "every rule A8 does not name stands", §8's "after the flight's own graders" stays in force and
  contradicts A8.1.
- Fix: one line in A8.1 and the §0 row: "§8's 'after the flight's own graders have finished' is replaced by K5's
  order; only 'never interleaved' is kept". Name the consequence: flight-eq's graders wait for router40's ≥ 250 min
  block. No bar moves.

**I-2. The I1 re-calibration cannot detect whether I1 was fixed.**
- Every step-2 expectation passed before the fix: P3a 20/20 (cal was 30/30), and P3b 46/46, which HARNESS-REVIEW says
  "the bound keeps".
- So step 2 is a non-regression check only. A missing or wrong `itemDone` bound would pass it (rule 8).
- Fix: add known-answer cases for the bound, each with its expected class, and run the unfixed reader against them to
  watch them fail:
  1. A finished `answer` followed by a late turn in the post-itemDone gap → stays `answer`.
  2. A silent item followed by an abnormal close after itemDone → `silent`, not `missing`.
  3. A capped turn that completes in the gap → `cut`.
  4. `ans.turns` longer than `segs` → text from the first `segs.length` turns.

### MINOR

**M-1. "The existing guard enforces this" overstates guard 3 (A8.1, K5 point 3).**
- Guard 3 checks that the G sitting is not running now: no open STEP, no matching process, and the F-line state.
- It cannot tell "finished" from "not yet started". "Finished" rests on the controller writing `done` only after the
  sitting's end (A8.2), and that is fail-closed only because no F line exists before then.
- Fix: say so. Also say that the controller writes the F line only after the sitting's last STEP `end`.

**M-2. The reader changes after router40-R's data exist, and nothing records its effect or checks the freeze.**
- Fix: report the per-item class diff on `router40-R` (old reader vs fixed reader) in the result note, read but not
  acted on.
- Record `read-r.mjs`'s sha at P5 and require the same sha at P8, so "the reader is then frozen" is checked by code,
  not only by rule.

**M-3. Step 5's case list is incomplete or mis-cited.**
- The live 09:59 grade case is A5.6's "(kept)" (`cal-pre-run-r40.mjs` GR5), not A3.6's.
- The real-clock case X3 ("before 2026-10-06 10:00 … must FAIL") and P6-5 (09:59 → REFUSED) need explicit new
  expectations. X3's answer depends on when the re-calibration runs.
- Add a 04:15:00 boundary case (PASS) and a `--classify` launch at 04:14 (REFUSED) and 04:16.

**M-4. Step 7's "classifier launch records" is vague.**
- Fix: name the path `grade\classify\launches.jsonl` (written by `launch-grader-r40.mjs:62,129`).
- Confirm that each record carries a start timestamp. Not verified here.

**M-5. "Not covered" omits two cross-registration dependencies.**
- Whether flight-eq's grader sessions occupy the FR slot that P6 checks. A8.1's "one at a time across both" relies on
  that, and if flight-eq's launcher differs, nothing in router40 sees its graders.
- Whether any flight-eq grader or G-sitting step is a scheduled `Natively-*` task. Its NextRunTime would enter
  `T_any` and could refuse launches mid-block.

## Not shown

- Nothing was run: no calibration and no guard. The step-5 and step-2 outcomes are untested.
- Flight-eq's registration was only grepped (A7 I3), not read in full.
- The run-file timestamps (L 22:31:03 / R smoke 22:40:10) were taken from A8. The consoles carry only relative times.
- The FR-slot and lock semantics of flight-eq's grader launcher were not read.

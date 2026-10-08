# REVIEW-2: SPEC-cue-grader.md (revision 2)

Reviewer: Opus 5.5 (claude-opus-5-5), fresh subagent, 2026-10-07. A scoped re-check of the revision against REVIEW-1. Read-only: no model calls and no git. Two throwaway counting scripts ran in the scratchpad. No question, answer or cue text was printed; only counts, field names and id prefixes were read.

## Verdict: CHANGES (small; all are text edits)

Every REVIEW-1 finding is addressed, and the data claims I could check hold. The revision adds three new problems, each one a sentence to fix:
- the revision's file tags collide with the first calibration's verdicts (N1);
- the session cap counts the wrong log (N2);
- the eq pool is one base short of the stated fallback trigger, and "acceptable" is undefined (N3).

Three further ambiguities would leave the builder or the reading guessing (N4-N6).

## Claims checked against the files

| Claim (spec line) | Measured | Result |
|--|--|--|
| r1: 49 `[Answer] cues:` lines (:182) | 49 | TRUE |
| r1: the router regex matches 49 lines, plus 2 `turn=-` lines (:183) | 49 + 2 | TRUE (I1 fixed) |
| r1: 27 pipeline, 22 live, 0 unassigned (:184) | 27 / 22 / 0 | TRUE |
| r1: all 47 judge pairs appear as `[Answer] full:` text (:186, :89) | 47/47 | TRUE |
| r1: expected graded n ≈ 23 (:17, :188) | 26 of the 27 pipeline cue lines join a judge answer exactly (26 distinct ids); 23 is score-rd's `checked` count, not the cue join | OFF BY 3 (M1) |
| r1 arms 31/31 with cues (:190) | high 31/31, low 31/31 | TRUE |
| h40d: 47 cue lines, 46 paired, 1 unpaired, 44 exact (44 distinct) (:193-195) | 47 / 46 / 1 / 44 (44) | TRUE |
| h40d arms 33 (:197) | 33/33, 33/33 | TRUE |
| eq: 42 cue lines, 0 empty, 40 pairs, 40 exact (:107-108, :89) | 42 / 0 / 40 / 40 (40 distinct) | TRUE |
| eq is scenario50 (:106) | every pair id has prefix `S` | TRUE |
| `""` lines in logged in-app blocks | 0 in r1, eq and h40d | The rule is correct; it fires on arms only, if at all |
| rd exports `FLAGS`, `pairsArgs(rubric=)`, `transcriptModels`, `modelMatchesPin`, `probeRecordProblem({alias, launcherSha})` (:249-252) | all exported, with those parameters (`launch-grader-rd.mjs:53,55,59,61,89`) | TRUE |
| Budget 2 + 6 + 4 + 4 = 16, with + 8 + 2 = 26 (:287-295) | arithmetic holds; revision 64 blocks = 4 files × 16 | TRUE (but see N2) |

## REVIEW-1 findings

| Finding | Status |
|--|--|
| B1 launcher/gate | FIXED in substance (§5.1): a new launcher, its own 2-slot gate, its own sha and logs, 11 mutations. Residual: N5 |
| B2 precedence, h40d-skipped case, n-scaled bars | FIXED (§6 rows 0-4, in a fixed order; floor/ceil of n). Worked example at n = 67 is correct (2 / 4 / 54). Residual: N4 |
| I1 router pattern | FIXED, re-measured (above) |
| I2 cut line, `""` lines, too-long plant | FIXED (§1.1, §1.2 G 0 anchor, §3.2) |
| I3 calibration pool | FIXED in direction. Residual: N3 |
| I4 halo, off-question donor, feasibility | FIXED (§3.2:134, :128, :140-142) |
| I5 fresh plants pass on their own | FIXED (§3.4:168-173). Wording: M2 |
| I6 freeze of the reading | FIXED (§4.5). Pre-freeze state: N6 |
| Minors | all adopted |

## New findings

**N1. §3.4:167 + §5.1:257 + §5.1:279. The revision's re-grade collides with the first calibration.**
- The tags are `cal-1..4.g1|g2`. The first calibration writes `cal-1..3`; a revision re-grades in 4 files with the same names.
- Mutation 11 refuses when "the verdicts file already exists". So the revision's `cal-1..3` launches are refused, or the first run's verdicts must be moved and the "report both runs" rule (:174) loses its evidence.
- **Fix:** give the revision its own tags (for example `rev-1..4.g1|g2`) and add them to the tag list.

**N2. §5.1:256 vs §5.2:289, :295. The cap counts a log that holds no probes.**
- The probes count in the budget (2 of 16), but they are logged in `grader-cwd.launches.jsonl`. The counter reads only `launches.jsonl`. As written, the cap allows 26 graders plus the probes, which is 28 sessions.
- **Fix:** the counter sums both logs (every `claude -p` started, failed attempts included). Mutation 10 tests the sum.

**N3. §3.1:109-110 + §4.6:239-242. "Acceptable" is undefined, and eq is one base short.**
- eq's `interview60.judge.verdicts.json` holds one grader's scores (`correctness`, `on_topic`, `delivery`), not labels.
  - Under the rd rule (correctness 2 AND on_topic 2), 31 of 40 qualify.
  - Correctness 0 occurs 0 times.
- The fallback threshold is 32 (:110). So a revision is certain to draw at least 1 base from the ungraded cuesmoke pool.
- The adds-error and echo counts (§4.6, row 1) also need an answer-grade rule per run:
  - r1 has two graders (score-rd: acceptable = both give C2 and O2; wrong = either gives C0);
  - h40d has one.
- **Fix:**
  - name the acceptable/wrong rule for eq, r1 and h40d;
  - state the measured 31;
  - either lower the hidden reserve to 15 or accept one reviewed cuesmoke base explicitly.

**N4. §6:313 (row 3). Axis attribution is not deterministic under two graders.**
- The final verdict is the worse of two, but the per-axis figures are means (§4.3:224). Row 3 needs a per-block rule: which grader's axes explain a not-good block?
- It also needs rules for:
  - empty blocks: they are in not-good, but they have no axis;
  - two axes tied at ≥ 50%.
- **Fix:**
  - attribute each block by the grader whose derived verdict is the final one (either grader, if they tie);
  - exclude empties from the axis share (they are already counted by row 1);
  - on a tie, name both axes.

**N5. §5.1:249-252. The import list omits the attempt machinery and the side effects of importing rd.**
- The launcher still needs `launchAttempt`, `findSession`, `toolCounts`, `readLaunches` and `launchRecord` from `followup-turn\R\launch-grader.mjs`, and `scan` from `check-grader-memory.mjs`. The spec does not say where they come from.
- Importing `launch-grader-rd.mjs` has top-level effects (`:26-41`):
  - it exits 2 if `TURN_FAKE_CLAUDE` or other seams are set without `RD_CAL_FAKE=1`, which is what the §5.1 stand-in-binary mutation tests set;
  - it overwrites `TURN_GRADING_DIR` and `FQ_OUT_DIR` with router-default's folders;
  - it imports `build-blind-rd.mjs`.
- **Fix:**
  - name the L imports;
  - require the cue launcher to set its own `TURN_GRADING_DIR` (under `LAB\`) and to prove, by a calibration case, that no cwd lands in router-default;
  - state how the mutation tests set `RD_CAL_FAKE`.

**N6. §4.5:236 + §5.1:277. The hashes do not exist yet during calibration.**
- Mutation 9 refuses on a hash mismatch, but `rubric.sha` and `spec.sha` are written only after calibration passes.
- **Fix:** a missing hash is allowed for `cal-*` and `rev-*` tags only. Every `r1-*` and `h40d-*` tag refuses without both. Add that as a mutation.
- Also say that the §6 thresholds are confirmed by the user before `spec.sha` is taken. Any later edit changes the sha.

## Minor

- **M1. §0:17, §4.1:188, §6:303.**
  - The cue join yields 26 r1 in-app blocks, not about 23, so the pooled n is about 70.
  - Bars at n = 70: wrong ≤ 2, empty ≥ 4 fires, good ≥ 56.
  - State 26 as the measured join, and list the 1 unjoined pipeline cue line.
- **M2. §3.4:165.** "Goods built from eq bases … never shown in any file" contradicts itself: a fresh good IS its base, and it is shown in the revision's files. Say "never shown in the first calibration's files".
- **M3. §6:311, :313.** `adds-error ≥ 2` and `not-good ≥ 5` are absolute counts, unlike the n-scaled bars. They are fine, but say that this is deliberate.

## Holdout and order

- holdout40 is never used to tune.
- Calibration material is eq (scenario50) only, with cuesmoke as the fallback.
- R33 is read-only (:229).
- The rubric and spec shas freeze before any h40d export (:199, :231-236).
- The order is fixed: probes, calibration, freeze, r1, the agreement check, then h40d (:218).
- The decision to skip h40d depends on r1 only.

## Not checked
- The cuesmoke counts and the `trimCues` source diff (the spec defers both to the builder).
- Whether rd's `pairsArgs` `Edit(verdicts)` rule lets a grader create a new file. That is proven by rd's own run, not re-proven here.

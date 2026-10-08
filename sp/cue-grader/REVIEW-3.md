# REVIEW-3: SPEC-cue-grader.md (revision 3)

Reviewer: Opus 5.5 (claude-opus-5-5), fresh subagent, 2026-10-07. Scoped re-check of REVIEW-2's findings only. Read-only: no model calls, no git. One throwaway counting script ran in the scratchpad; it printed only counts and field names, no question, answer or cue text.

## Verdict: APPROVE

Every REVIEW-2 finding is fixed, and each is verifiable against the files. No new contradiction that changes the work. Three wording nits are below; none blocks.

## REVIEW-2 findings

| Finding | Status | Evidence |
|--|--|--|
| N1 tag collision | FIXED | `rev-1..4.g1\|g2` at :184 and :299; `cal-1..3` kept as evidence (:184); mutation 11 no longer collides |
| N2 probes outside the cap | FIXED | the counter sums both logs (:296, :346); mutation 10 states the boundary: 26 records refuses the 27th, 25 allows the 26th (:323) |
| N3 acceptable undefined, one base short | FIXED | rule per run (§3.1.1 :123-129). **Measured:** eq has 42 cue lines, all 42 paired to a `full:` line; 40/40 judge pairs joined exactly; 40 verdict keys with fields `correctness,on_topic,delivery,reason`; correctness 2 AND on_topic 2 = **31**, all 31 among the joined; correctness 0 = **0**. 16 + 15 = 31, and the reserve arithmetic holds (4 goods + 11 bases hosting 12 mutants). The r1 path `router-default\grade\verdicts\verdicts.inapp.g1/g2.json` exists. The cuesmoke fallback folder exists |
| N4 row 3 not deterministic | FIXED | :373-384: the final-verdict grader's scores (g1 on a tie); empties out of NG; every axis ≥ 50% named, with a fixed order |
| N5 import source and rd side effects | FIXED | `followup-turn\R\launch-grader.mjs` exists and exports `launchAttempt`(:149), `findSession`(:121), `toolCounts`(:130), `readLaunches`(:146), `launchRecord`(:178), `absRule`(:75), `PROJECTS`(:53). It reads `FQ_OUT_DIR`/`TURN_GRADING_DIR` at import (:51-52, as the spec says), and `main()` is guarded (:288). Its static imports (`audit-graders.mjs`, `check-grader-memory.mjs`, `legs-decide.mjs`) have guarded mains and no top-level exits. `check-grader-memory.mjs` exports `scan` (:33). The rd line numbers 53/55/59/61/89 are correct; `probeRecordProblem` takes `{alias, projects, launcherSha}` (:89) |
| N6 hashes during calibration | FIXED | §4.5 :256-261 plus mutation 9b (:322); the user confirms the thresholds before `spec.sha` (:254) |
| M1 r1 = 26, n ≈ 70 | FIXED | :17, :206, :229, :354, :367. The bars at n = 70 check: floor(2.1) = 2, ceil(3.5) = 4, ceil(56) = 56 |
| M2 "never shown" | FIXED | :183 |
| M3 absolute counts | FIXED | :369-371 |

## Session count

- 2 + 6 + 4 + 4 = 16 planned (:338-344).
- Contingency: 8 revision sessions + 2 retries = 10, so the cap is 26 (:345-346).
- §0 :20, §5.1 :296, mutation 10 :323 and §5.2 all agree that the probes and failed attempts count.
- Skipping h40d saves 4 (:237).
- Consistent.

## Nits (non-blocking)

- **n1. §9:423.** The B1 row still says "11 mutations named". The table now has 15 (1-14 plus 9b). It is a historical row; update the count or mark it as from revision 2.
- **n2. §5.1:285.** The "verbatim" copies keep their free names:
  - `pairsArgs`'s default `rubric = A.RUBRIC` refers to rd's `audit-graders` import, which the cue launcher does not bind. It is harmless, because `rubric` is always passed.
  - `probeRecordProblem` uses `L`, `scan`, `PIN` and `LAUNCHER_SHA12`.
  - Say that the cue launcher binds those names, so a builder does not "fix" the text and then fail mutation 14. Also, `L.launchAttempt`'s record has no `launcher` field. The cue launcher must add its sha12 to every record, as rd does, or `probeRecordProblem` refuses every probe.
- **n3. §3.4:183.** "The 11 hidden bases … never shown in any file": a fresh off-question mutant's donor block could be a hidden base's cue block. Say that donors come from the 16 shown bases or from the hidden base being mutated.

## Not checked

- The r1 and h40d joins were not re-run; REVIEW-2 measured them, and revision 3 did not change them.
- The cuesmoke counts and the `trimCues` cross-build diff are deferred to the builder.

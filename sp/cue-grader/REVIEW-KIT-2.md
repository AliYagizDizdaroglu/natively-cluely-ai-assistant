# REVIEW-KIT-2: scoped re-check of the REVIEW-KIT fixes

Reviewer: Opus (not the builder), 2026-10-07. Scope: (1) replacement plants, (2) hash and freeze gates, (3) identical blocks per cal file. No model call, no claude -p, no git. Ids and file:line only.

**Verdict: CHANGES.** Two plants: S2Q07 (base) and S1Q09F/contradicts. The gates (2) and the identical-block rule (3) pass.

## 1. Replacement plants

| Plant | Expected | Ruling | Reason |
|--|--|--|--|
| S1Q09F / good | good | KEEP (note) | All 3 asked services are mapped. The "why" is carried only by each line's workload descriptor. A strict grader could call "why" a missing named part and give V 1. Acceptable, but it is the weakest of the new goods |
| S1Q09F / contradicts | weak | **REPLACE the line** | The line names a different workload for the first service. It has no explicit negation, and the claim is true on its own (C 2). A grader who reads it as "unsupported" rather than "contradicted" gives K 1, and `lib.mjs:95` then derives **good** (good allows K ≥ 1). Fix: state the opposite choice explicitly, the way S2Q08F and S2Q09F do ("X, not Y"), so K 0 is forced |
| S1Q09F / halo | weak | KEEP (cosmetic) | The edit clearly contradicts line 3 (K 0), and every line stays C 2. The edited answer sentence has no destination after "put" (`plants.author.json` S1Q09F halo answerReplace). Not label-changing, but worth a grammatical fix |
| **S2Q07 / good** | good | **REPLACE the base** | The 4 "explain" parts are covered. The question also lists 5 "has to support" requirements, and 3 to 4 of them are touched by no line (deletions, citations, async ingestion, interactive queries). That is the same pattern REVIEW-KIT ruled V 1 for S2Q05 ("a named constraint is not covered"). So the base is not unambiguously good. Its mutants go with it (missing: weak, OK on its own; wrong_fact: clearly false, OK on its own) |
| S2Q07F / good | good | KEEP | Both "where" and "when" are covered, with R2/G2 lines |
| S2Q07F / halo | weak | KEEP | The answer flips to a single check, which contradicts both lines (K 0). Both lines stay true |
| S2Q07F / off_question | wrong | KEEP | The donor's lines are about another topic (R 0) |
| S2Q08F / good | good | KEEP | Complete, current and quality are each covered |
| S2Q08F / contradicts | weak | KEEP | The explicit "not" contradicts the answer's method (K 0). The alternative method is legitimate (C ≥ 1) |
| S2Q08F / wrong_fact | wrong | KEEP | The claim is false by definition (C 0) |
| S1Q08F / repeats (rewritten) | wrong | KEEP | The false claim is now echoed by a coherent answer, so C 0 is clear. The prior self-contradiction is gone |
| S2Q09F / contradicts (rewritten) | weak | KEEP (small risk) | The explicit "not" contradicts the answer (K 0). It is a weaker design choice, not a false claim (C ≥ 1). The residual risk: a one-line block whose only line is adjacent to the main ask could be scored R 0, which derives wrong. I judge R 1 likely |

## 2. Gates (code read + one run)
- `score-cue.mjs:30`: `loadTag` calls `hashProblem`. For a real tag, rubric.sha, spec.sha and thresholds.sha must all exist and match (`lib.mjs:64-74`).
- `score-cue.mjs:38`: the launch record's `rubricSha12`/`specSha12` must equal the frozen files. **K1: fixed.**
- `freeze.mjs`: freezing is refused without the user's flag, and also:
  - while the spec matches `/AWAITING THE USER/`;
  - when the spec's `THRESHOLDS:` line disagrees with `thresholds.json`;
  - after a real launch;
  - when a sha file already exists.
- The spec currently still says AWAITING (SPEC lines 4 and 350). The `THRESHOLDS:` line (352) equals `thresholds.json`. **K2: fixed.**
- `node cal-kit.mjs`: **ALL OK 134/134, exit 0.** This run includes these mutations:
  - `score-no-frozen-hash-check`
  - `freeze-allows-awaiting-spec`
  - the real end-to-end refusals for an edited rubric, edited thresholds, and a record with a different rubricSha12.

## 3. Identical blocks per cal file
- `plants/plants.json`, 48 plants: **0 identical cue blocks under two questions in one file** (checked by file + exact cue array).
- `plants.mjs:188-189` enforces it, plus "donor's base not in the off plant's file".
- Partial line overlap remains, and the builder treats it as a soft minimum (`plants.mjs:166-177`):
  - file 1: S1Q05/S1Q10F (2 lines), S2Q04F/S2Q10 (1)
  - file 2: S2Q06/S2Q07F (2)
  - file 3: S1Q07F/S1Q08F (2)
- This is narrower than REVIEW-KIT K3's suggested fix ("no plant of the donor base in the off file"), but it meets the scope asked here. It is noted, not blocking.

## Not shown
- Labels are judged against the rubric text and domain knowledge, not by any grader.
- A replacement for S2Q07, and the reworded S1Q09F/contradicts line, need this check again. Replacing S2Q07 also re-runs the 2-mutants-per-base and 4-per-kind feasibility.
- The reserve count after these replacements was not re-counted. The packet lists 4 hidden, so P0 still stands.

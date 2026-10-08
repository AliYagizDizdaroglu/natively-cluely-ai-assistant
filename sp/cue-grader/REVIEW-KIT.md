# REVIEW-KIT: cue grader kit + plants vs SPEC-cue-grader.md rev 3a

Reviewer: Opus (not the builder), 2026-10-07. One pass. No model call, no claude -p, no git. Ids, counts and file:line only; no question, answer or cue text.

**Verdict: CHANGES.** Plants: 6 bases or plants to replace, which runs into a reserve shortfall the user must rule on (P0). Kit: two fixes before the freeze (K1, K2) and one before re-export (K3). Both calibration suites pass as built.

## Re-runs (this review)
| Check | Result |
|--|--|
| `node cal-kit.mjs` | ALL OK 124/124, exit 0 |
| `node cal-launch-grader-cue.mjs` | ALL OK 94/94, exit 0 (mutation 14, copy-identity, included) |
| `node extract.mjs` | r1: 49 cue lines, 27 pipeline / 22 live / 0 unassigned, 26 joined (26 distinct ids), 1 unjoined (turn 2). h40d: 46 paired / 1 unpaired, 44 joined, 3 unjoined. eq: 40 joined, 31 acceptable. Arms: r1 31/31, h40d 33/33; trim changed r1 HIGH 3, h40d HIGH 2 |
| `node trim.mjs` | trimCues region text + behaviour identical: h40d 2b0906f4, r1 fade67f8, eq 56bda9eb, MAIN dist (battery 1168 blocks) |

All of these match the counts the spec measured.

## A. Plants

### Rulings
| Plant | Ruling | Reason (one sentence) |
|--|--|--|
| **S1Q02F** (good, contradicts, off_question) | **REPLACE the base**: the builder's doubt is upheld | Line 1 is a bare metric label with no conclusion, and line 2 is a generic heading, so no line clearly reaches R2 and G2. The contradicts line names an operating-point policy that the answer leaves room for, so it is not a clean K 0 |
| **S2Q01** good | **REPLACE the base** | The question names 8 stages, and the block leaves several of them untouched (chunking, embedding, context assembly). By the rubric's own V anchor, "a named part is missing", that is V 1, so the base is weak, not good |
| **S1Q07** good | **REPLACE the base** | 2 of the 8 named parts (training, prediction storage) are untouched, so a grader applying the rubric literally gives V 1 → weak |
| **S2Q05** good | **REPLACE the base** | 1 of the 4 named constraints (dedupe) is not covered by any line, so V 1 → weak |
| **S1Q08F** repeats | **REPLACE** | The cue claim is defensible: treated customers were selected as the high-risk band, so they do look churn-prone in the data. The edited answer sentence also contradicts itself, so C 0 is not certain |
| **S2Q09F** contradicts | **REPLACE** | Failing over to another region breaks the residency constraint the question sets, so a correct grader rates that line C 0 → wrong, not the expected weak (K 0, C ≥ 1) |

- Four doubtful goods would use up the "good ≥ 14/16" bar on plant error before any grader error is counted. That is why the goods are ruled strictly.
- When a base is replaced, its mutants go with it. The mutants of S2Q01, S1Q07 and S2Q05 hold their own labels, but §3.1 requires a good base, so the kinds must be re-assigned to the new bases and the author re-checks the 2-mutants-per-base feasibility.

### Checked and kept
- **Wrong fact:** S1Q01F, S1Q03F, S1Q07, S2Q05 are each clearly false.
- **Off-question:** S1Q08F, S1Q10F, S2Q10 are all R 0. S1Q02F is replaced with its base.
- **Repeats:** S1Q05 and S2Q04F are clear.
  - S2Q09F/repeats is kept, but it rests on Azure "Global" deployment semantics, a niche fact. If it is missed, that is the grader-ceiling risk in §8.
- **Filler:** S1Q06F is weak with no help from the other axes.
  - S1Q01F, S1Q10F and S2Q06 each keep one R2/G2 line, so their `weak` rests on V 1, because the filler also drops a named part. That still gives not-good, so they are kept.
- **Cut:** all 4 are dangling 5-word cuts (G 0).
- **Contradicts:** S1Q07F and S2Q01 are clean K 0 with C ≥ 1. S2Q01 needs re-hosting with its base.
- **Missing:** all 4 drop a named part.
- **Halo:** all 4 contradict a cue line that stays true.
- **One-line goods:** the 4 hand-written goods (S1Q03F, S1Q08F, S2Q09F, S2Q10) are good blocks. This deviation is accepted, but it must be stated in the pass record: they are not as-flown, because `plants.mjs:35` drops every as-flown block with fewer than 2 lines.
- **Cosmetic:** S1Q08F/off_question is labelled "one-line form" but shows the donor's 3 lines.

### P0: the reserve shortfall (user ruling needed)
- `plants.mjs:35` excludes `displayAltered` blocks (7) and blocks with fewer than 2 lines. That leaves 24 usable bases: 16 shown + **8 hidden**.
- §3.1 needs a **15-base** hidden reserve (4 fresh goods + 11 hidden bases). The revision path of §3.4 is therefore already infeasible from eq.
- The 4 base replacements above would cut the reserve to 4.
- Options:
  - (a) Re-admit the altered blocks whose displayed lines are clean, i.e. cleaned or dropped only, with no dangling cut. Their logged array IS what the candidate saw, and §1.1 says the in-app logged array is the displayed block. The spec gives no reason to exclude them.
  - (b) Use the cuesmoke fallback (§3.1) for the revision reserve.
  - (c) The user accepts a smaller revision.
- Recommend (a), then re-count.

## B. Kit

| # | Where | Finding | Severity |
|--|--|--|--|
| K1 | `score-cue.mjs:8, 28-38` | `hashProblem` is imported but never called, so the scorer does not apply the §4.5 hash rule ("the exporter, the launcher and the scorer apply the same rule"). A rubric or spec edited after a real launch would still be scored. Fix: call `hashProblem(tag, lab)` in `loadTag`, and compare `rec.rubricSha12`/`rec.specSha12` (already in the record, `launch-grader-cue.mjs:225`) to the frozen files | **blocking before real scoring** |
| K2 | `freeze.mjs:12-22`; `score-cue.mjs:129-133` | The ordering is right: calibration pass → the user's flag → both hashes in one call → real exports and launches unblocked. But the §6 thresholds (3% / 5% / 80% / adds ≥ 2 / NG ≥ 5) are hard-coded in the scorer, and the spec text still says "AWAITING". If the user changes a threshold, the frozen spec and the scorer would disagree silently. Fix: before `spec.sha` is taken, edit §6 to record the confirmed values; `freeze.mjs` refuses while the spec still contains "AWAITING THE USER's confirmation"; the scorer constants are checked against the confirmed values | **blocking before the freeze** |
| K3 | `plants.mjs:168` | The off-question placement check covers only the donor's GOOD plant, not its mutants. Result: S1Q02F/off_question (file 3) shows exactly the cue block of S1Q06F/halo (file 3) under the donor's own question. There are partial overlaps in file 1 too (S1Q08F/off vs S1Q07F/contradicts 2 lines; S1Q10F/off vs S1Q05/missing 2 lines; S2Q10/off vs S2Q04F/cut 1 line). This inflates "wrong is wrong". Fix: no plant of the donor base in the off-question's file | before re-export |
| K4 | `extract.mjs:74` | r1 pairs each cue with `cur.fulls[0]` regardless of order, while the spec says "nearest following". It is harmless here: 0 segments are other than 1 cue + 1 full | note |
| K5 | export (data) | Some in-app answers start with a leftover `__ASSISTANT_RESPONSE__` marker (seen in the S1Q05 base and its mutants). The candidate never saw it. Files are single-source, so it does not unblind, but it is noise in front of the grader. Count it per source, or strip it consistently. Not measured beyond S1Q05 | minor |

### Verified OK
- **r1 join:** it reproduces 27/22/0 and 26 joined, without `interview60.prompts.json` (`extract.mjs:2-3, 94-100`).
  - **The 1 unjoined line at turn 2 is right.** Its cue is logged before the first play window (window = none), and its answer matches no judge-pair answer exactly, after whitespace normalisation, or by a 60-char prefix. It is a pre-roster turn. Turns 1 and 3 match RE06 and RE01.
- **trimCues parity:** identical text and behaviour across the 3 builds + dist. `exportReal` refuses on any difference (`export.mjs:76-77`).
- **Blinding:**
  - a pairs item has exactly {key, question, cues, answer} (`lib.mjs:126-139`);
  - pairs, verdicts and cwd names are opaque hashes (`lib.mjs:55-58`);
  - the key sits in `keyhold\`;
  - one source of one run per file;
  - the launcher refuses non-pairs files in `pairs\` (`launch-grader-cue.mjs:106-110`).
- **Launcher:**
  - exact pin `claude-opus-5-5` (`:47, :61, :138`), no alias slot;
  - `--setting-sources project,local` + `--strict-mcp-config` (`:58`, copied verbatim; copy-identity tested);
  - memory ABSENT is required for exit 0 (`:234`) and by the scorer (`score-cue.mjs:17`);
  - the session counter sums both logs (`:98`), cap 26 with the 27th refused (`:155, :217`), failed attempts recorded;
  - seams only under `CUE_CAL_FAKE=1`, with LAB containment (`:27-41`);
  - rd is not imported.
- **Scorer:**
  - `derive` = §1.4 (`lib.mjs:79-84`);
  - worse-of-two, with the explainer = the final-verdict grader and g1 on a tie (`score-cue.mjs:109-117`);
  - rows 0-4 in order with floor/ceil of n (`:123-137`, `:191-198`);
  - axis flags = §6 step 3 (`:96-104`);
  - contested "better verdict" clause (`:188-190`);
  - calibration bars + revision fresh bars = §3.4 (`:59-60`).
- **Answer grades:** r1 uses both graders' files and the keys line up (24 acceptable of 26).

## Not shown
- Plant labels are judged against the rubric text and domain knowledge, not by any grader.
- The replacement plants do not exist yet, so they need this review again.
- K5's frequency was not counted.
- The scorer's behaviour on real files was exercised only through the cal-kit stand-ins.

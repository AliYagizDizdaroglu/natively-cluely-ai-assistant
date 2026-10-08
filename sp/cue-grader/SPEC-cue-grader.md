# SPEC: cue grader (design + reading rules)

Revision 3, 2026-10-07: addresses every finding of `REVIEW-1.md` (B1-B2, I1-I6, minors) and `REVIEW-2.md` (N1-N6, M1-M3); mapping in §9. Written before any cue is graded. Revision 3a (2026-10-07, before the freeze): the three wording nits of `REVIEW-3.md` applied (§3.4, §5.1, §9); no rule, bar or threshold changed.
Status: for an Opus re-check, then the user's approval. The reading thresholds in §6 were CONFIRMED by the user on 2026-10-07 ('Confirm and proceed'), unchanged.
REPORTED READING ONLY: it changes no flight's verdict and no registered bar. No code, no model calls and no git are in this document.
LAB = `C:\Users\sotka\OneDrive\Masaüstü\natively-lab\sp\cue-grader`. MAIN = `C:\Users\sotka\OneDrive\Masaüstü\natively-cluely-ai-assistant`. RUNS = `MAIN\electron\test\golden\interview60.runs`.

## 0. Verdict first

- **What is graded:** the cue block the candidate actually sees (≤ 3 lines × ≤ 5 words). Each line gets 3 scores and each block 2.
  - The block verdict (good / weak / wrong / empty) is DERIVED from those scores by a fixed rule.
  - The grader's own label is recorded as a check only.
- **What the grader sees:** the roster question, then the cue block, then the full answer shown below it. Nothing reveals the source, model, run, timing or the `heard` text.
- **Calibration comes first:** 48 planted blocks built from scenario50 only (the graded eq run), each graded by 2 graders.
  - Bars: ≥ 22/24 planted-bad blocks caught; ≥ 11/12 must-be-wrong blocks rated wrong; ≥ 3/4 caught per kind; ≥ 14/16 good blocks rated good with 0 rated wrong; ≥ 3/4 halo plants not rated wrong; agreement ≥ 40/48.
- **Real runs:**
  - r1: the in-app pipeline-shown blocks (26, measured by the cue join) take 2 graders; bare 3.5-lite HIGH (31) and bare 3.1-lite LOW (31) take 1 grader each.
  - h40d: the in-app blocks (44) take 2 graders; bare HIGH (33) and bare LOW (33) take 1 grader each.
  - Where an in-app block has 2 graders, the final verdict is the worse of the two.
- **Budget:** 16 `claude -p` sessions planned, hard cap 26. Both numbers include the 2 probes and every failed attempt.
- **Use:** a reading for the parked cue-mode ruling (keep ON / flag-off by default / redesign). The rules are evaluated in a fixed order, and the spec's sha is frozen before the first real export.

## 1. What is graded

### 1.1 The unit
- **Block** = the cue array as DISPLAYED: the output of `trimCues(raw, CUE_MAX_LINES=3, CUE_MAX_WORDS=5)`, which drops, cuts and notation-cleans lines.
  - **In-app:** the logged `[Answer] cues: <json array>` IS the displayed array. `IntelligenceEngine.ts:472-474` logs `t.cues` after `trimCues`.
  - **Arms:** the answer files' `cues` field is RAW. `interview60.answers.mjs:201` fills it from the `stripCueBlock` callback, with no trim.
    - The builder applies the shipped `trimCues` from MAIN's dist to every arm block.
    - It reports, per source, how many blocks the trim changed. Measured raw over-limit blocks: r1 HIGH 3/31, h40d HIGH 2/33.
    - The grader never sees a raw arm block.
- **Empty-string lines:** `trimCues` can turn a line into `""`, for example a cleaned `**`. `CueBlock.tsx` still renders such rows.
  - The builder drops `""` lines before grading and counts them per source.
  - A block whose lines are all `""` is `empty`.
- **Line** = one non-empty string of the block, presented as `1.`, `2.`, `3.`. No `__CUES__` and no `N|` markup.
- **Empty block** (0 non-empty lines) = verdict `empty`. It is never sent to a grader; it is counted mechanically.
- **Shape checks, mechanical and outside the grader:**
  - line count ≤ 3 and words ≤ 5 per line on every displayed block (in-app should be 100% by the code cap; arms after trim);
  - no sentinel or raw notation left in a line.
  - The shape script is calibrated on known cases before use: a known-good block gives 0 flags, and a planted 4-line block, a 7-word line and a `$…$` line each give 1 flag.

### 1.2 Per-line scores (0-2 each)

| Axis | 2 | 1 | 0 |
|--|--|--|--|
| **R: answers the question** | addresses a part the question asks | on the topic, but not what was asked (an adjacent point, generic context) | off-question: about something not asked |
| **C: correct** | true, or a pure label with no claim | imprecise or ambiguous in a way that could mislead a little (a vague number, a near-miss term) | a false claim. A line that repeats a false claim from the answer is 0: echoing is not a defence |
| **G: usable at a glance** | the candidate can speak from it in ~1 s: a specific term, number, named choice or mechanism | usable but generic: a category word or heading the candidate must expand | filler or vague; needs re-reading; raw notation; or **cut mid-phrase / dangling** (ends on a connective, an article or a half-term, as `trimCues`' word cut produces) |

- C is judged against the question and the facts of the domain, NEVER against the answer below.
- The answer is evidence for consistency (axis K, §1.3), not for truth.

### 1.3 Per-block scores (0-2 each) and one flag

| Axis | 2 | 1 | 0 |
|--|--|--|--|
| **V: coverage** | every part the question asks is touched by the lines (grouping parts into themes counts); a one-part question with one good line is 2 | the main ask is covered, but a named part is missing | the main ask is missing |
| **K: consistent with the answer** | every line agrees with the full answer | a line the answer does not support, but does not contradict | a line contradicts the answer (a different choice, number or claim) |

- **D: direct answer first** (yes / no / n-a). When the question asks for a choice, a yes/no or a number, does line 1 carry it? Reported only; it feeds no verdict.
- **Order the grader is told to work in:** R, C and G for every line, then V, and K last. This is a soft halo control: the grader reads the answer for consistency only after judging the cues on their own.

### 1.4 Derived block verdict (computed by the scorer)

- **wrong** if any line has C = 0, OR every line has R = 0.
- **good** if all of these hold:
  - it is not wrong;
  - V = 2 and K ≥ 1;
  - every line has R ≥ 1 and G ≥ 1;
  - at least one line has both R = 2 and G = 2.
- **weak** otherwise. This includes K = 0 with every line C ≥ 1: the cue is right, but the screen contradicts itself.
- **empty:** 0 displayed non-empty lines (mechanical).

### 1.5 Grader output, per key
`{ lines: [{R, C, G}], V, K, D: "yes"|"no"|"na", label: "good"|"weak"|"wrong", note: "<= 12 words" }`.

The cue scorer has its OWN validator. It refuses a verdicts file when:
- a key is missing, or a key is not in the pairs file;
- `lines` has a different length from the block;
- any score is outside 0-2;
- `D` or `label` is outside its set.

## 2. Blinding

- **Shown, in this order:**
  1. `question`: the roster text exactly as the flight grader saw it. It is the `question` field of the run's `interview60.judge.pairs*.json` and already carries a follow-up's parent.
  2. `cues`: the displayed non-empty lines.
  3. `answer`: the full answer shown below the cues.
     - In-app: the `[Answer] full:` text paired with the cue line. Measured exact equality with the judge pair's `answer`: r1 47/47, h40d 44/44, eq 40/40.
     - Arm: the arm's `spoken` field.
- **Not shown:** the source (in-app or arm), model, thinking level, run label, roster family, ids, timings, `heard`, offers and trim records.
- **Files:**
  - Each file holds ONE source of ONE run, so it trivially holds at most one block per roster id. A single source per file also removes cross-source style contrast inside a session.
  - Keys are `c01..` with a seeded shuffle.
  - The key (key → run, source, id) is written to `LAB\keyhold\`, outside `LAB\pairs\`. The launcher refuses any non-pairs file in `LAB\pairs\`.
- **Why the full answer is shown (decided):**
  - axis K cannot be judged without it;
  - the candidate sees the cues and the answer together;
  - a 1-3-word cue is often only interpretable next to its answer.
  - The cost is the halo risk. It is controlled by the C rule (§1.2) and the work order (§1.3), and measured by the halo plants in one direction and the filler plants in the other (§3.2).
- **Residual leak:** in-app answers are shaped by prior turns and Context; the arms' answers are not. With one source per file, the grader cannot compare the two inside a session.

## 3. Calibration (before any real grading)

### 3.1 Material: scenario50 ONLY
- **Primary pool:** `RUNS\2026-10-06T01-12-56-eq`. It is scenario50 with cue mode on, and it has judge pairs and flight verdicts.
  - It has 42 `[Answer] cues:` lines, 0 of them empty.
  - It has 40 judge pairs; 40 cue lines pair to a judge pair's answer exactly, by the h40d join in §4.1.
  - **Bases:** only in-app blocks whose flight answer is **acceptable** under the answer-grade rule in §3.1.1. **Measured: 31 of 40 qualify**, and 0 have correctness 0. The builder re-prints the count before the plant author starts.
  - **The 31 are split before any plant is written:**
    - 16 bases for the 48-plant set (§3.2);
    - a 15-base hidden reserve for a revision's fresh plants (§3.4): 4 fresh goods plus 11 hidden bases hosting the 12 fresh mutants. One hidden base hosts 2 mutants, and those 2 go in different files.
  - **A base is usable only if the plant reviewer also judges its CUE block good.** The answer grade alone does not make a cue good.
- **Fallback, only when a base is rejected or a plant is disputed and eq has no unused base left:**
  - source: `<whole-turn worktree>\electron\test\golden\interview60.runs\2026-10-01T02-37-41-cuesmoke` (22 cue lines, no answer grades);
  - each fallback base needs the plant reviewer to confirm that its answer is correct and its cue block is good;
  - the report counts the fallback bases used.
  - NOT `2026-09-30T02-38-22-cuesmoke`: it predates the 3×5 limit.

#### 3.1.1 Answer-grade rule, per run
It uses the flight's own answer verdicts (scores `correctness` / `on_topic` / `delivery`, 0-2). `delivery` is not used.

| Run | Verdicts | acceptable | wrong |
|--|--|--|--|
| eq (calibration pool) | `interview60.judge.verdicts.json`, 1 grader | correctness 2 AND on_topic 2 | correctness 0 |
| r1 in-app (§4.6) | `router-default\grade\verdicts\verdicts.inapp.g1/g2.json`, 2 graders | BOTH graders give correctness 2 AND on_topic 2 (the score-rd rule) | EITHER grader gives correctness 0 |
| h40d in-app (§4.6) | `interview60.judge.verdicts.json`, 1 grader | correctness 2 AND on_topic 2 | correctness 0 |

An answer that is neither acceptable nor wrong is `weak`.
- **Not live40:** it is r1's roster, so tuning on it would tune on the data it then grades.
- **Not holdout40:** it is never used for tuning.
- **Who writes and checks the plants:**
  - an Opus subagent that is not a grader writes each plant and its expected labels;
  - a separate Opus reviewer checks every expected label before any grader runs;
  - a disputed plant is replaced, not argued.

### 3.2 The planted set: 48 blocks
There are 16 good bases. Every other plant is a ONE-EDIT mutant of a base (a minimal pair).

| Kind | n | Edit | Expected |
|--|--|--|--|
| good | 16 | none. A mix of 1-, 2- and 3-line blocks: ≥ 4 one-line terse answers, so the grader does not punish short ones; ≥ 4 many-part questions grouped into themes | good |
| wrong fact | 4 | one line's number, term or mechanism made false | wrong |
| off-question | 4 | the block replaced by a correct block from a DIFFERENT eq question on the same topic (the donor). The donor's own base is never in the same file as this plant | wrong (all R 0) |
| repeats a wrong answer | 4 | the answer gets one false claim AND a cue line states the same false claim | wrong |
| filler / vague | 4 | specific lines replaced by generic ones | weak (G ≤ 1) |
| cut mid-phrase | 4 | one line cut the way `trimCues` cuts an over-long line: the first 5 words of a longer phrase, ending dangling | weak (G 0) |
| contradicts answer | 4 | a line names a different, also defensible, choice than the answer recommends | weak (K 0) |
| missing part | 4 | the line carrying one named part removed from a ≥ 2-line block on a multi-part question | weak (V 1) |
| halo | 4 | the cues kept as they are; the ANSWER gets one false claim that directly CONTRADICTS a specific cue line, and that cue line stays true | weak (K 0, every line C 2), NOT wrong |

- **Planted bad** = wrong fact + off-question + repeats + filler + cut + contradicts = **24**.
- **Must-be-wrong** = the first three kinds = **12**.
- Over-limit blocks are not planted: displayed blocks cannot exceed 3×5, and the shape check in §1.1 tests that mechanically.

**Feasibility constraint for the plant author:**
- 32 mutants over 16 bases in 3 files means exactly 2 mutants per base, one in each of the base's two other files.
- One-line bases cannot host missing-part. The author assigns kinds to bases before writing anything.

### 3.3 Files and graders
- 3 files × 16 blocks; a base and its mutants never share a file.
- The dispatch text, rubric and launcher are the same as for the real runs, so the grader cannot tell calibration from real grading.
- Each file is graded by 2 graders (g1, g2): 6 sessions.

### 3.4 Pass bars (each grader separately; agreement jointly)

| Bar | Threshold | Why |
|--|--|--|
| Catch | ≥ 22 of 24 planted bad rated not-good | 92% sensitivity. An in-app source holds 26-44 blocks, so missing more than 1 in 12 would hide a difference of 2-3 blocks, which is the size of effect the reading in §6 turns on |
| Wrong is wrong | ≥ 11 of 12 must-be-wrong rated `wrong` | a wrong cue is the costly failure: the candidate says it aloud |
| No blind spot | ≥ 3 of 4 in EVERY bad kind, and in missing-part | with n = 4 per kind, 3/4 is the lowest count that one lucky hit does not explain |
| Pass good | ≥ 14 of 16 good rated good, and 0 of 16 rated wrong | ≤ 2 false alarms; a false `wrong` alone would argue for redesign |
| Halo | ≥ 3 of 4 halo plants not wrong, with every cue line C = 2 | the answer must not drag a correct cue into `wrong` |
| Agreement | g1 and g2 derived verdicts agree on ≥ 40 of 48 (83%) | below that, the worse-of-two rule (§4.3) is driven by noise |
| Label check | the grader's own `label` matches the derived verdict on ≥ 42 of 48 | a large gap means the rubric's words and the derivation rule disagree |

**If both graders pass every bar:** the rubric file is frozen. Its sha256 goes into `LAB\rubric.sha`, and the launcher refuses any other rubric sha from then on.

**If any bar fails, one revision is allowed:**
1. The revision is written against the failing plants only.
2. Re-calibration grades the 48 plants plus 16 FRESH plants, all built from the hidden reserve (§3.1), which the reviser has never seen.
   - Fresh set: 4 good, plus 2 each of the 6 bad kinds = 16.
   - The 4 fresh goods were never shown in the first calibration's files. The 11 hidden bases behind the 12 fresh mutants are never shown in any file. A hidden base is never an off-question donor: a fresh off-question mutant's donor is one of the 16 shown bases, or the hidden base being mutated.
   - It runs as 4 files × 16 blocks × 2 graders = 8 sessions, under its OWN tags `rev-1..4.g1|g2`. The first calibration's `cal-1..3` verdict files stay untouched as evidence.
   - The 64 blocks are re-split over the 4 files. A base and its mutants never share a file.
3. **The 16 fresh plants must pass on their own,** each grader separately:
   - bad caught ≥ 11 of 12;
   - must-be-wrong rated wrong 6 of 6;
   - good: 0 of 4 rated wrong and ≥ 3 of 4 rated good;
   - agreement ≥ 13 of 16.
4. The reused 48 must also pass their original bars. A pass on the reused 48 alone is NOT a pass.
5. A second failure → stop, report both runs; the user rules.

## 4. Real runs

### 4.1 Sources and joins
Only ids and counts are recorded. No question, answer or cue text goes anywhere but the blind pairs files.

**r1** = `RUNS\2026-10-07T00-22-47-router-default-r1`, roster `live40.questions.mjs`.
- **In-app:** `natively_debug.log` has 49 `[Answer] cues:` lines.
  - Each line belongs to the turn closed by the next Router turn line, whose form is `[Router] turn=N … shown=<pipeline|live>`. The regex `/\[Router\] turn=\d+ .*shown=(pipeline|live)/` matches 49 lines; 2 more lines carry `turn=-`/`shown=-` and are ignored.
  - Measured assignment: 27 cue lines go to `shown=pipeline` turns, 22 to `shown=live` turns, 0 are unassigned.
  - The 22 on Live-shown turns are the pipeline SHADOW, never displayed: excluded.
  - Each of the 27 pipeline-shown cue lines is paired with the nearest following `[Answer] full:` line before its Router line. That text must equal a judge pair's `answer` exactly (47 of 47 judge pairs do).
  - The id comes from the judge pair AND from the play window in `interview60.timeline.json`. A disagreement is refused and listed.
  - **Measured join: 26 of the 27 pipeline-shown cue lines join a judge answer exactly (26 distinct ids). The builder must reproduce 26 and list the 1 unjoined line by turn and reason.** (The 23 in score-rd is its `checked` count, which is a different count.)
- **Not used:** `interview60.prompts.json` ids. They are mis-keyed for 16-17 of 42 (`router-default\reviews\diag38-review.md` B1). For the same reason no captured arm is graded.
- **Bare arms:** `interview60.answers.gemini-3.5-flash-lite_high.json` (31, cues 31/31) and `_3.1-flash-lite_low.json` (31, cues 31/31). The question comes from the matching `interview60.judge.pairs.gemini-*.json`.

**h40d** = `RUNS\2026-10-02T11-39-41-h40d`, roster `holdout40.questions.mjs`.
- **In-app:** 47 `[Answer] cues:` lines, each paired with the next `[Answer] full:` line before the next cue line.
  - Measured: 46 paired and 1 unpaired.
  - 44 match a judge pair's `answer` exactly (44 distinct ids, 0 duplicates). 2 do not: a replaced or doubled answer.
  - The 44 are graded; the 3 others are listed by reason.
- **Bare arms:** `_3.5-flash-lite_high.json` (33) and `_3.1-flash-lite_low.json` (33), under the bare-arm rule.
- **Captured arms are not graded:** captured-high reps 1-3, captured-low and minimal. They replay the in-app prompt, so they are second samples that feed no reading row.
- **holdout40:** grading it is reading. The rubric AND the reading rules are frozen (§4.5) before any h40d block is exported. Nothing changes after the h40d grades; a change means a new spec and a full re-grade.

**Before export, the builder checks the `trimCues` versions (read-only):**
- It compares `trimCues` in `electron/llm/verbalStreamFilter.ts` across the h40d build (registered HEAD 2b0906f), the r1 build (read from the run's own records) and the dist used for the arm trim.
- If they are identical, the residual risk is closed.
- If they differ, each run's arm blocks are trimmed with the function of the build that flew that run, and this is reported.
- Both builds are named in the report.

### 4.2 Files and graders

| Run | File (one source each) | Blocks | Graders | Sessions |
|--|--|--|--|--|
| r1 | in-app | 26 | 2 (g1, g2) | 2 |
| r1 | bare HIGH | 31 | 1 | 1 |
| r1 | bare LOW | 31 | 1 | 1 |
| h40d | in-app | 44 | 2 | 2 |
| h40d | bare HIGH | 33 | 1 | 1 |
| h40d | bare LOW | 33 | 1 | 1 |

- **Order:** probes → calibration → freeze (§4.5) → r1 → r1 agreement check → h40d.
- If r1 in-app agreement is below 75% (§4.3), h40d is NOT run, which saves 4 sessions.
- The arm numbers carry no second-grader check, and the report says so beside them.

### 4.3 Two graders on in-app: the disagreement rule
- **Final block verdict** = the WORSE of the two derived verdicts (wrong < weak < good).
- **`contested`** marks every block where the two differ. Per-axis numbers are the mean of the two graders.
- **Real-data reliability:** derived-verdict agreement must be ≥ 75% per run. Below that, the run is reported as "grader unreliable on real data", with both graders' counts and no reading from §6.
- **Mandatory clause in the verdict sentence:** the contested count. If the reading's row would change with every contested block taking its BETTER verdict, the sentence says "rests on contested blocks". The worse-of-two rule inflates `wrong`, so this clause is never dropped.

### 4.4 A known case on real data (reading, not tuning)
h40d R33's in-app cue repeated its wrong answer (`project_cue_mode_next`). The expected verdict is `wrong`. If R33 does not come out wrong, the report says so first. Nothing is tuned on it.

### 4.5 The freeze before the first real export
After calibration passes, two hashes go into `LAB\` and into the pass record before anything is exported:
- the rubric sha256 (`rubric.sha`);
- this spec file's sha256 (`spec.sha`), which covers §1.4 and §6.

The user confirms the §6 thresholds BEFORE `spec.sha` is taken. Any later edit to the spec changes the sha and refuses every real launch.

**Hash states:**
- **Calibration and revision tags (`cal-*`, `rev-*`):** a missing `rubric.sha` or `spec.sha` is allowed. The hashes do not exist yet.
  - If a hash file exists, it must match. A revision deletes `rubric.sha` only if one was written (it is not, on a failed calibration).
- **Real tags (`r1-*`, `h40d-*`):** both hashes must exist and match. A missing hash refuses, and so does a mismatch.

The exporter, the launcher and the scorer apply the same rule.

### 4.6 Joins to existing grades (after cue grading, read-only)
For each in-app block, cross-tab its cue verdict with its flight answer grade (acceptable / weak / wrong, by the per-run rule in §3.1.1). Three counts:
- **adds-error:** the cue is wrong while the answer is acceptable;
- **echo:** the cue is wrong and the answer is wrong;
- the cue is good while the answer is wrong.

## 5. Launcher, gate and budget

### 5.1 A NEW launcher (`LAB\launch-grader-cue.mjs`)
It does not run `launch-grader-rd.mjs`'s `main()` and does not use its `probeGate()`. That gate hard-requires the alias probe, keys its records to the rd launcher's sha, logs in router-default, and needs rd's fixed tags, a run folder and the flight dispatch.

**It does NOT import `launch-grader-rd.mjs` at all.** Importing rd has top-level side effects (`launch-grader-rd.mjs:26-41`):
- it exits 2 when a test seam is set without `RD_CAL_FAKE=1`;
- it overwrites `TURN_GRADING_DIR` and `FQ_OUT_DIR` with router-default's folders;
- it imports `build-blind-rd.mjs`.

**Where each piece comes from:**

| Piece | Source | How |
|--|--|--|
| `launchAttempt`, `findSession`, `toolCounts`, `readLaunches`, `launchRecord`, `absRule`, `PROJECTS` | `natively-lab\sp\followup-turn\R\launch-grader.mjs` (L) | dynamic import, read-only. The cue launcher sets `TURN_GRADING_DIR = LAB\grading` and `FQ_OUT_DIR = LAB` BEFORE the import, because L reads both at import (`:51-52`). L's `main()` does not run on import |
| `scan` (memory check) | `natively-lab\sp\followup-turn\R\check-grader-memory.mjs` | dynamic import, read-only |
| `FLAGS`, `pairsArgs`, `transcriptModels`, `modelMatchesPin`, `probeRecordProblem` | `launch-grader-rd.mjs:53, 55, 59, 61, 89-108` | COPIED verbatim into the cue launcher, with a provenance comment (rd's sha12 and line numbers). `probeRecordProblem` keeps its parameters and is called with `alias: false`, `launcherSha =` the cue launcher's own sha12, and `projects = L.PROJECTS`. `pairsArgs` is called with `rubric =` the cue rubric. A calibration case reads rd's file as TEXT and asserts that the copied function bodies are identical  The cue launcher BINDS the free names these bodies use (`L`, `scan`, `PIN`, `LAUNCHER_SHA12`, and `A` for `pairsArgs`' default `rubric = A.RUBRIC`) and a builder must not "fix" the text, or mutation 14 fails. `L.launchAttempt`'s record has no `launcher` field: the cue launcher stamps its own sha12 on EVERY probe and grader record, as rd does, or `probeRecordProblem` refuses every probe |

**Seams:**
- The mutation tests use L's own seams (`TURN_FAKE_CLAUDE`, `TURN_PROJECTS`) plus the cue launcher's directory seams.
- They are honoured only under `CUE_CAL_FAKE=1`. Without it, any seam that is set refuses with exit 2.
- `RD_CAL_FAKE` plays no part, since rd is not imported.
- A calibration case proves that every grader cwd, verdicts path and log path lands under `LAB\`, and none under `router-default\` or `followup-turn\`.

**Its own gate:**
- **Probes:** two slots, cwdprobe-1 and cwdprobe-2, both pinned. There is no alias slot. The alias read decided nothing in r1, every grader is pinned, and no new model has been announced.
- **Logs:** `LAB\launches.jsonl` holds the graders; `LAB\grader-cwd.launches.jsonl` holds the probes.
- **Session counter:** the SUM of the records in both logs, counting every `claude -p` started, failed attempts and probes included.
- **Tags:**
  - `cal-1..3.g1|g2`: the first calibration;
  - `rev-1..4.g1|g2`: the one revision, with its own verdict files;
  - `r1-inapp.g1|g2`, `r1-high`, `r1-low`;
  - `h40d-inapp.g1|g2`, `h40d-high`, `h40d-low`.
- **Pin and settings, kept exactly:**
  - `--model claude-opus-5-5`; any other value, an alias or a suffix is refused;
  - `--setting-sources project,local` and `--strict-mcp-config`;
  - tools: Read(pairs), Read(rubric), Edit(verdicts) only.
- **After every launch, the transcript is re-read:** memory must be ABSENT, the tools must be Read/Write/Edit only, and every assistant message's model must equal the pin. The scorer refuses a file whose last launch record is not clean.
- **Its own verdict validator,** per §1.5.

**Mutation tests the gate must fail on.** Each is a calibration case run against a stand-in `claude` binary, so no model is called:

| # | Mutation | Must |
|--|--|--|
| 1 | a probe record missing | refuse |
| 2 | probe exit ≠ 0 | refuse |
| 3 | a probe recorded by another launcher sha (including rd's) | refuse |
| 4 | memory LOADED in a probe or grader transcript | refuse |
| 5 | a transcript model ≠ `claude-opus-5-5` (an alias or another model) | refuse |
| 6 | probe tools other than exactly one Read + one Write | refuse |
| 7 | `--model-id` absent, an alias or another id | refuse |
| 8 | `--setting-sources project,local` removed from the argv | the calibration's flag count fails |
| 9 | rubric sha ≠ `rubric.sha`, or spec sha ≠ `spec.sha` (any tag, when the hash file exists) | refuse |
| 9b | an `r1-*` or `h40d-*` tag with `rubric.sha` or `spec.sha` MISSING | refuse; a `cal-*` or `rev-*` tag with them missing is allowed |
| 10 | the two logs together already hold 26 records (for example 2 probes + 24 graders, or 1 probe + 25), so this would be session 27 | refuse; at 25 records the 26th is allowed |
| 11 | the verdicts file already exists, or a non-pairs file sits in `LAB\pairs\` | refuse |
| 12 | a seam set without `CUE_CAL_FAKE=1` | refuse, exit 2 |
| 13 | a path that resolves outside `LAB\` (cwd, verdicts or log) | refuse |
| 14 | a copied rd function differs from rd's text | the calibration fails |

**Who builds it:** the building code (extract and join, trim, the shape check, export, the launcher, the scorer) is built by Sonnet and reviewed by Opus.
- Each script is calibrated on known cases before use. The joins must reproduce:
  - r1: 27/22/0, and 26 joined;
  - h40d: 46/1 and 44/2;
  - eq: 40/40, and 31 acceptable bases.
- A test written after the code must fail on a broken copy.

### 5.2 Budget (the user's weekly Claude usage stands at 74%)

| Step | Sessions |
|--|--|
| Probes (cwdprobe-1, -2) | 2 |
| Calibration: 3 files × 2 graders | 6 |
| r1: in-app × 2, bare HIGH × 1, bare LOW × 1 | 4 |
| h40d: in-app × 2, bare HIGH × 1, bare LOW × 1 | 4 |
| **Planned** | **16** |
| Contingency: one rubric revision (`rev-1..4`, 4 files × 2) + up to 2 failed-launch retries (probe or grader) | +10 |
| **Hard cap, probes included** | **26**. The counter sums `launches.jsonl` and `grader-cwd.launches.jsonl` and refuses the 27th `claude -p` (mutation 10) |

## 6. What the result is for

The reading was written before any grade. **The THRESHOLDS were CONFIRMED by the user on 2026-10-07, unchanged, after calibration passed and before any real export.**
The numbers below are kept in ONE file, `LAB\thresholds.json` (read by the scorer, the launcher and `freeze.mjs`; hashed in `thresholds.sha`). To confirm, the user edits this line if needed and deletes the AWAITING wording (header and here); `freeze.mjs` refuses while the word AWAITING remains or while this line differs from `thresholds.json`:
THRESHOLDS: goodPct=80 wrongPct=3 emptyPct=5 addsMin=2 ngMin=5 axisPct=50 agreePct=75

It informs the parked ruling of 2026-10-02: cue mode OFF by default behind an env flag. Cue mode is still ON in MAIN today.
- **Which blocks the reading uses:** the in-app sources (what the candidate saw), r1 and h40d pooled.
- **n** = the in-app graded blocks + the in-app empties, after the exclusions in §4.1. Measured joins: r1 26 + h40d 44 ≈ 70.
- Every count bar is a function of the final n.

**Rules, evaluated in this order; the first one that fires is the reading:**

| # | Reading | Condition (in-app, final verdicts, pooled) | Argues for |
|--|--|--|--|
| 0 | **No reading** | h40d not run (r1 agreement < 75%), or either run is "grader unreliable" (§4.3) | nothing: r1-only counts are printed (n = 26 is too small) |
| 1 | **Redesign (hard)** | wrong > floor(0.03·n), OR adds-error ≥ 2, OR empty ≥ ceil(0.05·n) | the cues put errors or blanks in front of the candidate |
| 2 | **Keep ON** | good ≥ ceil(0.80·n) AND wrong ≤ floor(0.03·n) AND adds-error = 0 | the benefit is real; weigh it against the measured +161 thinking tokens (~0.5 s) |
| 3 | **Redesign (axis)** | good < ceil(0.80·n) AND NG ≥ 5 AND one axis's share ≥ 50% (rule below) | a specific, fixable failure in the content or the rule; name the axis |
| 4 | **Flag off by default** (the 2026-10-02 ruling stands) | none of the above | the benefit is unproven while the cost is measured |

At n = 70: wrong ≤ 2 (wrong ≥ 3 fires row 1), empty ≥ 4 fires row 1, and good ≥ 56.

**Absolute counts, on purpose:** `adds-error ≥ 2` and `NG ≥ 5` do not scale with n.
- A cue that adds an error the answer did not have is the failure that matters, whatever the n. One such block can be a grader slip; two cannot.
- Below 5 not-good blocks, a 50% share is 2-3 blocks, too few to name a pattern.

**Row 3: the axis attribution, deterministic.**
1. **NG** = the non-empty in-app blocks whose final verdict is not good. Empties are excluded: they have no axes, and row 1 already counts them.
2. **Which grader's scores explain a block:** the grader whose derived verdict IS the final verdict (the worse one). When both graders' derived verdicts are equal, g1's scores are used. This is a fixed choice; it is not "either grader".
3. **The axis flags of a block,** from that grader's scores. A block can carry several flags:
   - **G:** some line has G = 0, or no line has G = 2;
   - **V:** V ≤ 1;
   - **K:** K = 0;
   - **R:** some line has R = 0, or no line has R = 2;
   - **C:** some line has C ≤ 1.
4. **An axis's share** = the blocks in NG carrying its flag ÷ NG.
5. **Row 3 fires** when any axis's share is ≥ 50%. The reading names EVERY axis at or above 50%, so ties name all of them, ordered by share and then G, V, K, R, C.
6. The report prints all five shares whether row 3 fires or not.

**Reported beside the reading:**
- the per-run figures next to the pooled ones, with the build named: r1 and h40d are different builds, with d83fdfe landing between them;
- good / weak / wrong / empty per source, and the contested counts;
- the D rate on choice questions;
- the bare 3.5-lite HIGH vs 3.1-lite LOW arms, marked "1 grader";
- trim changes and `""`-line drops per source;
- **cue presence:** the share of DISPLAYED turns that carried a cue block at all. On r1, 27 of 49 Router turns were pipeline-shown; the 22 Live-shown turns carried none.

It changes NO verdict of any flight: h40d's 2c FAIL and router-default r1's INCONCLUSIVE stand, and it sets no bar for one. A future cue flight may cite this spec's rubric sha as its cue clause, in a new registration.

## 7. Outputs
- `LAB\pairs\`, `LAB\keyhold\` (the plant key too), `LAB\verdicts\`, `LAB\launches.jsonl`;
- `LAB\rubric.md` + `rubric.sha`, `LAB\spec.sha`;
- `LAB\plants\`, `LAB\report.md`.

The pass record (`passes/<run>.md` + INDEX, grader named, both shas) is committed in MAIN with the report, under the pass-records rule.

## 8. Not covered / residual risks
- **Glance is judged from text, not timed.** Nobody measures whether a candidate really speaks from a line in ~1 s; G is an Opus opinion.
- **Agreement is reliability, not validity.** Two Opus graders with one prompt share blind spots: they can agree and both be wrong. Only the plants and R33 anchor validity.
- **Halo on real data is unmeasured.** It is tested on 4 + 4 plants only. A cue-only pass is not planned; an optional 1-session check (§9) is left to the user.
- **Correctness ceiling:** the grader's own domain knowledge. A confidently wrong grader on a niche fact passes a wrong cue.
- **The arms carry one grader each,** so they have no agreement check.
- **Small n:** ≈ 70 pooled in-app blocks. A 95% interval on 80% is about ±10 percentage points, so the reading is a direction, not an estimate.
- **Not graded:**
  - all captured arms;
  - the 22 r1 shadow blocks;
  - h40d's 3 unjoined cue lines;
  - typed-chat cues;
  - the on-screen rendering itself (`CueBlock.tsx`; for example, `""` rows still render as rows).
- **The plants differ from real failures:** they are edits a model did not make, so real failures may be subtler. R33 is the only real-data anchor.
- **The +161 vs +55 thinking-token gap** is not addressed here.

## 9. REVIEW-1 mapping, and what is left for the user

| Finding | Status |
|--|--|
| B1 launcher/gate | FIXED §5.1: a new launcher with its own 2-slot gate, its own sha and logs; the pin, the setting sources and the memory-ABSENT check kept; 15 mutations named (1-14 plus 9b) |
| B2 reading precedence / h40d skipped / n-relative | FIXED §6: ordered rows 0-4; row 0 for the skipped or unreliable case; floor/ceil of n |
| I1 router pattern | FIXED §4.1, re-measured 49 matches |
| I2 cut-line, `""` lines, too-long plant | FIXED §1.1-1.2 (G 0 anchor, `""` rule), §3.2 (cut mid-phrase replaces too-long; over-limit is mechanical) |
| I3 calibration pool | FIXED §3.1: eq is primary with acceptable-only bases; cuesmoke is the reviewed fallback; the s50m fallback removed |
| I4 halo / off-question / feasibility | FIXED §3.2 |
| I5 revision on fresh plants alone | FIXED §3.4 |
| I6 freeze the reading | FIXED §4.5 |
| Minors | all adopted: the trimCues check (§4.1), presentation order and K last (§1.3, §2), the contested clause mandatory (§4.3), reliability ≠ validity (§8), cue presence (§6), both builds named (§4.1, §6). The 0.70 content-check note is moot: no captured arm is graded |
| Budget | ADOPTED: 16 planned, cap 26; 1 grader on the bare arms; h40d captured-high dropped |

**REVIEW-2:**

| Finding | Status |
|--|--|
| N1 the revision's tags collide with `cal-*` | FIXED §3.4, §5.1: the revision gets its own `rev-1..4` tags; the `cal-1..3` verdicts stay as evidence |
| N2 probes not counted against the cap | FIXED §5.1, §5.2: the counter sums both logs, failed attempts included; the cap of 26 includes the probes; mutation 10 tests the sum |
| N3 "acceptable" undefined; one base short | FIXED §3.1, §3.1.1: per-run answer-grade rule; measured 31; the reserve is 15 (4 goods + 11 hidden bases, one hosting 2 mutants); cuesmoke only for replacements |
| N4 row 3 not deterministic | FIXED §6: the final-verdict grader's scores (g1 on a tie); empties excluded from NG; every axis ≥ 50% named |
| N5 attempt machinery source; rd's import side effects | FIXED §5.1: L and the memory check imported with LAB dirs set first; rd NOT imported, its five helpers copied verbatim with a text-identity check; the `CUE_CAL_FAKE` seam gate; mutations 12-14 |
| N6 hashes absent during calibration | FIXED §4.5: missing hashes allowed for `cal-*`/`rev-*` only, refused for real tags (mutation 9b); the user confirms the thresholds before `spec.sha` |
| M1 r1 = 26 | FIXED §0, §4.1, §4.2, §6: n ≈ 70; the bars at 70 are wrong ≤ 2, empty ≥ 4 fires, good ≥ 56 |
| M2 the "never shown" wording | FIXED §3.4 |
| M3 absolute counts | FIXED §6: stated as deliberate, with the reason |

**Left for the user:**
1. Confirm or change the §6 thresholds (80% good, 3% wrong, 5% empty, adds-error ≥ 2).
2. Optional, not in the budget: 1 extra session grading r1 in-app cue-only (R/C/G), to measure the halo on real data.

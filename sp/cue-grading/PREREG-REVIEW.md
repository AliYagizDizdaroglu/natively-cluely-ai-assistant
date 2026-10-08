# Review: PREREGISTER-cue-grading.md (Fable, 2026-10-03 18:4x)

Reviewer: Opus, 2026-10-03, read-only. No model call, no subagent, `.env` not read; no captured prompt, profile, cue
text or answer text printed. Recounts are from read-only scripts in `SP\cue-grading-review\` (`recount-inapp.mjs`,
`recount-twins.mjs`, `recount-bench.mjs`, `notation-kinds.mjs`, `spoken-check.mjs`). They print ids, counts and
character classes only.

**VERDICT: APPROVE WITH FIXES.** Every count checks out and the design answers the user's question. The decision rule
cannot yet be computed as written (C1), and several gating counts can be moved by things other than the cue rule:
the twin display, inherited and pipeline errors, grader disagreement, and calibration that has no specificity check.
Amend C1 and I1 to I8 in this file, dated, before the hard classification or any grader is dispatched.

Counts: **Critical 1, Important 8, Minor 12.**

---

## (1) Counts: recounted, all correct

| Claim | Recount | Evidence |
|---|---|---|
| 47 `[Answer] cues:` lines | 47 | `natively_debug.log` |
| 2 readiness-probe lines excluded | 10:33:26.979Z and 10:33:43.973Z, both before the first item played (10:33:52.110Z) | timeline `playedAt` |
| R29 has two, the 11:31:30Z one superseded | 11:31:30.776Z cues, then `stream aborted by new generation` at 11:31:30.777Z; the kept one is 11:31:32.685Z | log |
| R05 has none | the only roster item without a block | join |
| IN-APP 44 on 44 items | 44 distinct items; all 44 judge-pairs ids have a block | join |
| Log line is post-`trimCues` | `IntelligenceEngine.ts:419-421` logs `t.cues` after `trimCues(raw, 3, 5)` | code |
| 4 display trims (R04F cleaned; R12, R13, R32 cut) | 4 `cues trimmed` lines at those items | log |
| TWINS-H 44 / 44 / 44 | 44 / 44 / 44 blocks; 0 over 3 lines; blocks with a capped line over 5 words 1 / 4 / 1 | answers files |
| r1 R09 has an empty prose | r1 `spoken` empty on R09 only; r1 judge has 43 items | answers + judge |
| TWINS-L r1 42 blocks (R01, R09F absent) | 42, absent R01 and R09F | answers file |
| Bare arms 33 blocks each | `_high` 33, `_low` 33 | answers files |
| Roster levels (verbal 5 … followup 12) | timeline: verbal 6, which is 5 without R05; the other six levels match | timeline |
| 3.5-lite won 38 of 44 windows | consistent with the h40d result note, Appendix A | result note |
| Calibration pool: 39 scenario50 ids | `_cues-r1/2/3`: 39 ids each (S1 19, S2 20); blocks 38 / 39 / 39 | WT golden |

Supporting facts the findings use:
- In-app frozen-grader correctness: 2 on 37 items, 1 on 6 (R02F, R08, R11F, R12, R13, R22F), 0 on 1 (R33). R11F's
  verdict is "wrong", but its correctness is 1.
- Twins correctness histogram: r1 {2: 36, 1: 7}; r2 {2: 39, 1: 3, 0: 2}; r3 {2: 40, 1: 4}; TWINS-L r1 {2: 38, 1: 5,
  0: 1}.
- Twin `spoken` equals the judge pairs' `answer` on every paired id (43 / 44 / 44 / 44).

The exclusions are right and their reasons hold. One wording slip is noted in M1.

---

## Critical

### C1. GOOD, HARMFUL, consensus and cue-introduced cannot be computed as written

- **Evidence.** §2 and §3 have condition A (correct, covers, specific, glance) and condition B (consistent) graded by
  two *different* pairs of agents. §3 then says "counts per file are the mean of the two graders" and "consensus
  means both graders". §4 also defines every block-level quantity across both conditions:
  - GOOD needs correct, covers, specific and glance from A, plus consistent from B.
  - HARMFUL is correct 0 or glance 0 (from A) or consistent 0 (from B).
  - Cue-introduced is consensus correct 0 (A) or consensus consistent 0 (B).
- **Why it matters.** No one pair of graders produced all of a block's axes, so "the two graders" is undefined.
  `cue-decide.mjs` has to invent a pairing, and the plausible choices give different GOOD fractions and harmful
  counts:
  - pair A1 with B1 and A2 with B2;
  - average over all four (A, B) pairings;
  - take a per-axis mean or minimum first.
  The "per file" wording has the same problem, because these quantities span two files (see M9).
- **Fix.** Define the per-axis reduction first, then the block-level predicates.
  - Example: per axis, consensus = both graders of that condition give the same score. For GOOD, take each axis as
    the *lower* of its two graders' scores.
  - HARMFUL(consensus) = both A graders give correct 0, or both A graders give glance 0, or both B graders give
    consistent 0.
  - GOOD fraction = blocks whose axes meet the bar after the per-axis reduction, divided by HARD blocks.
  - Write it as a formula, and calibrate `cue-decide.mjs` on a set where the pairings would disagree.

---

## Important

### I1. "consistent" 0 and 1 overlap; the overlap feeds HARMFUL and cue-introduced errors

- **Evidence.** Score 1 is "a line the answer never reaches, but nothing contradicts it". Score 0 includes "a line
  [that] carries a number, name or product the answer never states".
  - A true line naming a service that the answer describes only generically fits both definitions.
  - So does a rounded number (a cue "~30.7 GB" against an answer's "about 31 gigabytes": "same numbers"?).
- **Why it matters.** consistent 0 is HARMFUL. On an answer scored correctness 2 it is also a *cue-introduced error*:
  two of those per file trigger CUES NEED A FIX. A correct, harmless extra name could fail the cue rule.
- **Fix.**
  - 0 = the line contradicts the answer, or states a number or name that is false on its own terms.
  - 1 = the line is true or plausible but the answer never states it (an unsupported extra).
  - Rounding to the same value counts as "same number".
  - Cue-introduced error then becomes consensus correct 0, or consensus consistent 0 *by contradiction*.

### I2. Disagreement makes a pass easier: a second way to pass

- **Evidence.** HARMFUL and cue-introduced count only when *both* graders agree. SAFE needs consensus-harmful ≤ 2 and
  cue-introduced ≤ 1. Agreement is "reported, never gating".
- **Why it matters.** Two noisy or disagreeing graders mechanically produce fewer consensus-harmful blocks, so SAFE
  becomes easier as the instrument gets worse. GOOD, a mean, moves the other way. Calibration (I6) does not bound
  agreement on genuine blocks either.
- **Fix.** Add a gate on agreement. Either:
  - an agreement floor per file (for example, the GOOD and HARMFUL calls match on ≥ 80% of blocks), else VOID for that
    reading; or
  - make SAFE also require that the either-grader harmful count stays under a stated bound (for example ≤ 4). Report
    both counts.

### I3. The twin cap departs from the app for no reason, and the departure lands on the gate

- **Evidence.** §1 says notation is not cleaned on twin blocks: "the app's `cleanNotation` is not replicated".
  - `trimCues(raw, maxLines, maxWords)` is pure and exported from MAIN's dist
    (`dist-electron/electron/llm/verbalStreamFilter.js`, loaded by `notation-kinds.mjs`), and it runs `cleanNotation`
    before the cut (`verbalStreamFilter.ts:700-712`).
  - Two TWINS-H blocks carry `$` notation that `trimCues` changes: r1 R23 and r2 R04F. In-app R04F was "cleaned" by
    the same function live.
  - Four more TWINS-H blocks carry only underscores (identifiers), which `trimCues` leaves unchanged.
- **Why it matters.** Raw notation is glance 0 under the rubric, so it counts as HARMFUL. With "consensus-harmful ≤ 2
  per file" as the SAFE bar, one display artefact the app would never show uses up half of r1's or r2's allowance.
- **Fix.** Build twin and bench material as `trimCues(cues, CUE_MAX_LINES, CUE_MAX_WORDS).cues`, from MAIN's dist.
  - Record the dist's filter sha (h40d's `42d9bc42dbd17870`) so the material is what the app would have displayed.
  - Keep the raw-notation count as a reported line.

### I4. Inherited and pipeline errors count toward the gate whose consequence is "change the cue rule"

- **Evidence.**
  - R33 is inherited: its answer has correctness 0, and its block repeats the answer's error (result note, rule 4). It
    is near-certain to be consensus-harmful in-app, so in-app starts at 1 of its 2 allowed.
  - The pipeline items, per the h40d result note, are graded against the *scripted* question, which the model never
    received:
    - R11F: parent evicted; twins 0/9 acceptable.
    - R02F: parent evicted.
    - R07F: Live merged the parent into the question.
    - R31: a partial dispatch, then Live's rewrite.
  - The twins replay the same captured prompts, so these items depress GOOD and can add HARMFUL in *all four* gating
    files at once.
  - h40d's own rule excluded follow-ups of this class from 3b for this reason.
- **Why it matters.** CUES NEED A FIX prescribes a cue-rule change. Neither a wrong answer nor a lost parent can be
  fixed by the cue rule, so the verdict would be misattributed.
- **Fix.**
  - Gate HARMFUL on cue-attributable blocks only: exclude inherited blocks (answer correctness 0), and name the
    pipeline-attributed items now (R11F, R02F, R07F, R31, from the h40d result note).
  - Report every excluded item beside the gate, with its axis scores.
  - Alternatively, grade those items against the dispatched text, which would need the prompts, so exclusion is
    simpler.
  - State the denominator (HARD blocks minus excluded items).

### I5. The decision rule's operating characteristics were not computed; the expectation straddles both thresholds

- **Evidence.**
  - SAFE requires all four gating files (IN-APP and the three TWINS-H reps) to clear GOOD ≥ 85%, consensus-harmful
    ≤ 2 and cue-introduced ≤ 1.
  - FIX fires if *any one* file has GOOD < 75%, consensus-harmful ≥ 3, or cue-introduced ≥ 2.
  - The expectation in the file is in-app GOOD 85 to 92%, consensus-harmful 1 to 3, "TWINS-H similar per rep". The
    harmful range includes the FIX trigger, and the GOOD range starts at the SAFE bar.
  - On about 40 blocks, the sampling SD of a proportion near 0.88 is about 5 points. §6 itself says "about ±8".
- **Why it matters.** At the expected rates, sampling noise across four files largely decides FIX versus SAFE versus
  REPORTED. The verdict would then measure noise, not the cue rule.
- **Fix.** Before the data, compute P(SAFE), P(FIX) and P(REPORTED) under the recorded expectation with a short
  binomial simulation, and write the numbers into the file.
  - Pool the three TWINS-H reps (132 blocks) for the rate bars (GOOD, and harmful as a rate).
  - Keep IN-APP as its own file.
  - Size the harmful and cue-introduced bounds so that P(FIX | the expectation is true) is small, for example ≤ 10%.

### I6. Calibration checks sensitivity only, misses the realistic failure, and has no specificity check

- **Evidence.**
  - Pass is 8 of 8 planted cases hit by both graders. The 12 genuine blocks are "reported, not gated".
  - A grader that scores harshly passes 8 of 8 and then inflates HARMFUL, which drives FIX.
  - The plants are blatant: LaTeX, a question line, generic labels, a swapped block, a negation. None tests the class
    that actually occurred in h40d (R33): a plausible wrong fact *shared with* a wrong answer (correct 0 with
    consistent 2). Detecting that class needs condition A to judge truth on its own.
  - No plant tests the boundaries that decide HARMFUL:
    - a cut line ending in "and" (meant to be glance 1, not 0);
    - a true extra name (I1);
    - the right parts in the wrong order (covers 1).
- **Fix.**
  - Pair each mutation with its unmutated source in the same blind file. Require the source to score above the bar
    on the targeted axis (≥ 1 from both graders).
  - Require consensus-harmful ≤ 1 of the 12 genuine blocks. That is the specificity gate.
  - Add three plants with expected scores:
    - an R33-class error (correct 0, consistent ≥ 1), written from a *non-holdout* item;
    - a trailing-conjunction cut (glance 1);
    - a true extra name (consistent 1 after I1).
  - Plant each class twice, so that "8 of 8" is not n = 1 per class.

### I7. The HARD definition is not the class "cues on hard only" will be gated by

- **Evidence.**
  - §1 uses the l38base definition: EASY = one fact in ≤ 5 words. On 176 non-holdout items it found 1 EASY. The file
    expects 40 to 44 of 44 HARD, so "HARD only" means almost every item.
  - The roadmap step this prereg serves (AGENDA 18:24, step 5: "cue grading -> cues on hard only") inherits its
    easy/hard boundary from the router.
  - The router's definition, approved by the user at about 18:35 (`SP\router40\SET-draft.md` §1), is wider: one named
    concept, a 30 to 60 word answer, ", and why" = HARD, all follow-ups HARD.
  - §6 names the mismatch as not shown, but the gate is still read on the narrower class.
- **Fix.**
  - Classify under router40 §1, verbatim, as the gating split. Report the base-rate split beside it.
  - Restate the HARD expectation under router40: the 12 follow-ups are HARD by rule, plus the mains router40 would not
    call EASY.
  - Check that the VOID bar of fewer than 30 HARD items still sits safely below that expectation. If it does not,
    state what the reading falls back to.

### I8. The VOID clauses can be read two ways, and one of them is always met

- **Evidence.**
  - Scope conflict. §3 says "any other model = VOID **for that file**". §5.1 says "a grader pin not met" → VOID, with
    no verdict. Two readings follow:
    - a non-gating TWINS-L pin miss voids everything; or
    - only that file is voided, and it is re-run.
  - Re-running only the voided file, after the other files' scores are visible, is grader shopping unless the rule
    says otherwise.
  - Reachability. "A key file reachable by a grader" is literally true of `SP\cue-grading\keyhold\`, which is on the
    same disk as the blind files. The same was true of the bench's sibling `cuebench-keyhold`, and of the unblinded
    MAIN run folder, which holds ids, models and grades. As written, the clause either always fires or is
    uncheckable.
- **Fix.**
  - A pin miss voids the *reading* until that file is regraded by fresh agents. The regrade replaces the file whatever
    its scores, and the voided file's scores are reported.
  - A TWINS-L pin miss voids only the TWINS-L report.
  - Replace "reachable" with a check the transcripts can answer: the grader's transcript shows no tool call other than
    reading its own blind file. Extend `h40d-grader-models.mjs` (it already parses the transcripts) to print the
    tool_use names and paths. Alternatively, give the graders the material inline with no file tools.

---

## Minor

- **M1.** §1 says the in-app join is "by dispatch window as `smoke-facts.mjs` does". `smoke-facts.mjs` actually joins
  by the item *playing* (timeline `playedAt`). On h40d the two joins agree on all 47 lines (0 disagreements,
  `recount-inapp.mjs`). Fix the wording, or use the pairs' `dispatchedAt` explicitly.
- **M2.** R05 is named as an EASY candidate, but it is not among the 44 classified texts (no pair, no twin). "HARD =
  not EASY by both graders" also reads two ways. Write "EASY only when both graders say EASY; otherwise HARD". The
  l38base file's own rule is "when in doubt, HARD", and its count was the BOTH-easy one.
- **M3.** Blocks on answers with correctness 1 are neither cue-introduced (which needs correctness 2) nor inherited
  (which needs 0). That is in-app 6 (R02F, R08, R11F, R12, R13, R22F) and twins 7 / 3 / 4. Name a third, reported
  class: "on a partly-correct answer".
- **M4.** Only the rubric is frozen. Freeze the grader instruction prompt too (output schema, the blinding note, how to
  treat markers): one file with its sha recorded before calibration, as the frozen answer grader has its stamp.
- **M5.** covers never penalises a line for a part the question did *not* name, which the cue rule forbids ("never for
  a point you add on your own"). Add it to covers 1, or report it.
- **M6.** glance 0 lumps format violations (a question line, "you", markup) with unusable lines. All of them count as
  HARMFUL beside false facts. Report HARMFUL split into content (correct 0 or consistent 0) and display (glance 0).
  Tell the graders that "you" inside a phrase ("keys you control") is not addressing the listener.
- **M7.** One twin `spoken` in r1 and one in r2 carry a raw `__CUES__` marker, and 1 to 2 per file carry another
  `__X__` marker (`spoken-check.mjs`). The condition B graders will see them. Name this, and tell the graders to ignore
  markers when judging consistent.
- **M8.** The calibration pool is raw:
  - 7, 8 and 7 blocks per rep have a line over 5 words, and r2 has one 4-line block. Cap the pool with `trimCues` as in
    I3.
  - It has no one-line block (0 of 116), so the "one-first" one-line case is not among the genuine 12. Plant or pick
    one.
  - r1 has one empty block, the `MALFORMED_RESPONSE` one. Exclude it from the genuine 12.
- **M9.** "Per file" for cue-introduced, GOOD and HARMFUL should be "per set", since each set's quantities span its A
  and B files.
- **M10.** For each plant, give the expected score only on its target axis and condition. A number changed against
  the answer, for example, has no defined condition A expectation. State that non-target axes are not checked.
- **M11.** Some rubric and expectation wording comes from holdout blocks already read in the h40d result note:
  - "a 'Yes' where the answer is no, the wrong metric" matches R33's block;
  - "cut mid-phrase, a trailing 'and'" matches R12's line;
  - the expectation assigns R12 glance 1 "not 0".
  Holdout rule (a) restricts only the cue rule, so this is not a violation. Disclose it, and state that per-item
  expectations do not bind the graders. The I6 boundary plant, built from non-holdout material, is what settles the
  "and" case.
- **M12.** §3 calibrates `cue-decide.mjs` on "4 hand-made verdict sets … one per verdict in §5 and one refusal". §5
  has four verdicts, so that makes five sets. Fix the count, and add boundary sets: GOOD exactly 85.0% and 75.0%,
  harmful exactly 2 and 3, cue-introduced exactly 1 and 2, and a C1 case where the graders disagree.

---

## The seven questions, answered briefly

1. **Counts.** All correct; see the table. The exclusions are right: the 2 probe lines, R29's superseded line, R05,
   r1 R09's empty prose (A only), and TWINS-L's two absent blocks.
2. **Rubric.** It answers the user's question (right, answers what was asked, usable at a glance), but:
   - it is not computable across the A and B graders (C1);
   - consistent is ambiguous at 0 and 1 (I1);
   - correctness-1 answers are unclassified (M3);
   - over-coverage is ungraded (M5).
3. **Blinding, pinning, holdout.**
   - Blinding: the A/B split is sound. "Reachable" needs a checkable form (I8).
   - Pinning: sound. The pin script is generic (`<tag>=<agentId>`, exit 0 only if every agent is `claude-opus-5-5`).
   - Holdout rule: sound, with the M11 disclosure.
4. **Thresholds.**
   - A result can be read two ways through C1, the VOID scope (I8) and per-file versus per-set (M9).
   - There is a second way to pass: grader disagreement (I2).
   - VOID at fewer than 30 HARD is consistent with the 40 to 44 expected under the stated definition. Recheck it under
     I7.
   - The thresholds sit inside the expectation (I5).
5. **Calibration.** It cannot yet show that the graders catch a bad cue *without also condemning good ones*. It has no
   specificity check, and the realistic failure class and the HARMFUL boundaries are not planted (I6).
6. **Scripts.** Both are feasible.
   - `cue-material.mjs`: the join, `trimCues` from MAIN's dist (I3), and the bench's seeded-coin keyhold method
     already exist.
   - `cue-decide.mjs`: feasible once C1 and I1 fix the definitions. The judge files are keyed by id with an integer
     `correctness`; r1 has 43 items, and R09 is handled by the A-only clause.
7. **Missing.**
   - an agreement gate (I2);
   - the pipeline and inherited exclusions (I4);
   - operating characteristics (I5);
   - a frozen grader prompt (M4);
   - the content/display harm split (M6).

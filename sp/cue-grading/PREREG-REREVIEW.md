# Re-review: PREREGISTER-cue-grading.md revision 2 (scoped)

Reviewer: Opus, 2026-10-03 ~19:05 local, read-only. No model call, no subagent, `.env` not read; no prompt, profile,
cue or answer text printed. Scope: (1) C1 and I1–I8 fixed? (2) `oc-sim.mjs` re-run against the quoted table and the
rule; (3) new errors in rev 2. Throwaway checks in `SP\cue-grading-review\`: `rr-exclusions.mjs` (ids and
correctness only), `rr-oc-check.mjs` (sizes and the GOOD/either-harmful constraint), `rr-oc-corr.mjs` (same-item
correlation bound). Line numbers refer to the rev 2 file as of 18:58.

**VERDICT: APPROVE WITH FIXES. C1 and I1–I5 and I7 are fixed. I6 and I8 are only partly fixed, and each leaves a
condition that is always met or always passes. The sha pin needs a pinned build. Counts: Critical 0, Important 3,
Minor 9.**

---

## (1) The original items

| Item | Status | Where |
|---|---|---|
| C1 | **Fixed.** Per-axis `min`, `cons0` and `any0` are defined first, then GOOD, HARMFUL, EITHER-HARMFUL, CUE-INTRODUCED and AGREEMENT, all per set. The decide script is calibrated on a set where a wrong A/B pairing changes the verdict. | L113–126, L149–150 |
| I1 | **Fixed.** consistent 1 = an unsupported extra; 0 = a contradiction or false on its own terms; rounding counts as the same number. See m9 for a wording mismatch in the change log. | L92–95 |
| I2 | **Fixed.** The either-harmful bound in SAFE (≤ 16%) closes the "disagreement passes" path. An agreement VOID was added; see m4. | L120, L124–125, L168, L177 |
| I3 | **Fixed in design.** Twins and the calibration pool go through MAIN's dist `trimCues`, with the sha required. The pin is fragile; see RI3. | L27, L128 |
| I4 | **Fixed.** Inherited and pipeline blocks are excluded, reported, and the denominator is stated. See m6 for counts stated before the exclusion. | L40–50 |
| I5 | **Fixed.** Rates, TWINS-H pooled, simulated bounds; the table reproduces exactly (section 2). | L164–202 |
| I6 | **Partly fixed.** Pairing with the source, 11 classes × 2, and the specificity gate are in. The three boundary plants are scored one-sided, so the harsh-grader failure that I6 targeted still passes; see RI1. | L127–144 |
| I7 | **Fixed.** The router40 §1 class gates; base rate and roster level are reported. Expectation and VOID bars are restated. See m5 and m7. | L61–70 |
| I8 | **Partly fixed.** One reading, a regrade that replaces the file whatever its scores, a TWINS-L miss scoped, and a transcript check instead of "reachable". The new check voids every grader that writes its verdict file; see RI2. | L110–112, L166–171 |

---

## (2) `oc-sim.mjs`

Re-run with `node oc-sim.mjs` (no network). The rule registered in §5 equals the script's `v3` exactly:
- SAFE: GOOD ≥ .75, consensus-harmful ≤ .07, either-harmful ≤ .16, cue-introduced ≤ .04;
- FIX: GOOD < .65, consensus-harmful ≥ .11, cue-introduced ≥ .07.

Every row of the §5 table matches the `v3` output to the decimal:
- centre 83.0 / 2.6 / 14.4;
- low edge 41.2 / 12.8 / 46.0;
- high edge 98.6 / 0.1 / 1.3;
- bad 0.0 / 94.2 / 5.8;
- mediocre 11.4 / 34.9 / 53.8;
- noisy 11.0 / 2.5 / 86.5.

Two other figures also match:
- The "rejected" rules: `draft` SAFE 38.9% and `v2` SAFE 71.7% at the centre, quoted as 39% and 72%.
- The illustrative counts at (36, 118): SAFE ch ≤ 2 / 8, eh ≤ 5 / 18, ci ≤ 1 / 4; FIX ch ≥ 4 / 13, ci ≥ 3 / 9.

The verdict logic (FIX first, then SAFE needs every set, otherwise REPORTED) follows §5's precedence, and
cue-introduced is a subset of consensus-harmful as §3 defines it. The simulation does not model VOID (the agreement
gate or the floors).

Three modelling errors were found and checked. None moves a conclusion by more than about 2.5 points:
- **Sizes (m1).** It uses 118 pooled blocks, but §1 implies 110 when in-app is 36 (see m1). At (36, 110) and at
  (32, 98), the centre still reads FIX 2.4% and 1.7%.
- **GOOD versus either-harmful (m2).** It draws GOOD independently of the single-grader harmful calls. Under the
  min-reduction, an either-harmful block can never be GOOD. Constraining this changes no row by more than 2 points.
  The "noisy graders" scenario is infeasible as labelled: GOOD .854 plus either-harmful .175 is 1.029 > 1.
- **Item recurrence (stated as approximate).** The same items recur in-app and in all three reps. With 5–10% of items
  carrying 60% of the harmful mass, FIX at the centre stays at 2.3–2.6%, and at the low edge 12.8–14.0%. The stated
  approximation is benign.

---

## (3) Findings in revision 2

### Important

**RI1. The calibration's boundary plants pass a harsh grader (I6 is not closed).**
- **Evidence.** The pass rule (i) is "22 of 22 plants *at or below* their expected score from BOTH graders" (L140).
  The three plants added for I6 have expected scores that are floors, not ceilings:
  - trailing-conjunction cut: glance **1**;
  - true extra name: consistent **1**;
  - R33-class plant in condition B: consistent **≥ 1** (L138–139).
- **Why it matters.**
  - "At or below" accepts glance 0 and consistent 0 on these plants. A grader that calls an "and"-cut unusable, or a
    true extra name a contradiction, passes calibration. That is the harsh grader I6 named, and its calls are
    HARMFUL.
  - For the R33 B plant, "at or below" an expectation of "≥ 1" is not a defined test.
  - Check (ii), the paired source scoring ≥ 1, scores the *unmutated* line, so it does not cover this.
  - Check (iii), consensus-harmful ≤ 1 of 13 genuine blocks, will rarely contain these boundary shapes.
- **Fix.** Give each plant a direction:
  - "harm" plants (target 0, or covers ≤ 1) pass at or below the target;
  - the three boundary plants pass only at **exactly 1** (glance, consistent), or **≥ 1** for R33's condition B, from
    both graders.
  State which plants are which.

**RI2. The tool-use VOID fires on every grader that writes its verdicts (I8 regresses to "always met").**
- **Evidence.** L111–112: "a grader whose transcript shows any read other than its own blind file (or any write)
  voids that set's reading".
  - The method the prereg adopts has graders write their own verdict file. The cue bench's runbook substitutes
    `VERDICTS = CB\blind\verdicts.r<r>.h<h>.g<g>.json` into the dispatch (`SP\cuebench\RUNBOOK-bench.md:55`).
  - §3 itself waits until "the last verdict file exists" (L108).
- **Why it matters.** As written, every set is VOID. Otherwise the check has to be read loosely after the fact, which
  is the two-readings problem I8 was meant to remove.
- **Fix.** State the allowed reads and writes:
  - one read of its own blind file and the frozen instruction file, if it is a file;
  - one write to its own verdict path.
  - Anything else voids the set.
  - Calibrate the extended `h40d-grader-models.mjs` on one transcript that does read a key path. Rule 8: it has to
    answer differently when the effect is present.

**RI3. The filter-sha pin points at a dist that MAIN is about to replace; pin a build.**
- **Evidence.**
  - MAIN's `dist-electron/electron/llm/verbalStreamFilter.js` still hashes to sha256/16 **`42d9bc42dbd17870`**,
    recomputed now; the dist was built 2026-10-01 16:37.
  - The source has moved past it twice:
    - `801442d` (18:57) changed `stripSpokenNotation`'s hold regex only;
    - MAIN's working copy (mtime 18:59, blob `6c4cc5a` against the committed `6a0b4ea`) has an **uncommitted** edit to
      `cutAtWordBudget`, the coaching-card pass-through.
  - Neither touches `cleanNotation` or `trimCues`, so `trimCues`' behaviour is unchanged today. But the next build of
    MAIN, by any session, changes the whole-file sha.
  - The prereg's only response to a mismatch is to refuse (L27, L218). It names no path, so the work stops or invites
    an after-the-fact amendment.
- **Fix.** Before step 1, copy the dist file as it is now into `SP\cue-grading\` with its sha256 recorded as a dated
  amendment, and load `trimCues` from that copy. It is self-contained (`require` of `fs` and `path` only). Then any
  MAIN rebuild is irrelevant.
  - Alternatively, register the rule that a different sha is accepted only if `trimCues` output is byte-identical
    on every block of the material (44 / 44 / 44 / 44 / 42 plus the 116-block pool) against the pinned copy.
  - Either way, record MAIN's HEAD at the copy (`801442d` plus a dirty tree today).

### Minor

- **m1. The simulation's sizes contradict §1.**
  - With pipeline 4 per rep, inherited in-app R33, inherited r2 R11 only (r2's other correctness-0 answer is R02F,
    already pipeline; `rr-exclusions.mjs`), and EASY e of the 32 mains:
    - in-app = 39 − e;
    - TWINS-H pooled = 119 − 3e.
  - In-app 36 implies e = 3, which implies pooled **110**, not 118. 118 is e = 0, outside §1's own 96–110.
  - Fix the size, the table and the illustrative counts in L184–186; at n = 110 the counts are SAFE ch ≤ 7, eh ≤ 17,
    ci ≤ 4, and FIX ch ≥ 13, ci ≥ 8. The conclusions stand (section 2).
- **m2. The GOOD draw and the noisy scenario.**
  - GOOD should be drawn only from non-either-harmful blocks; the effect is immaterial.
  - The "noisy graders" scenario is infeasible as labelled. Relabel it as GOOD ≤ .82 with either-harmful .175; the
    conclusion (REPORTED, not SAFE) holds.
- **m3. Rule shopping is only partly disclosed.**
  - The script holds a fourth rule, `v4`, at centre SAFE 85.8 / FIX 0.7 and low edge FIX 5.6. L202 says only `draft`
    and `v2` were "tried before this one". Disclose `v4` and why `v3` was kept. It is the stricter choice, so that is
    defensible.
  - Also state that the low edge (FIX 12.8%) is above the 10% the review suggested. The text already reports the
    number; say that it was accepted.
- **m4. The agreement VOID is nearly vacuous, and its repair is underspecified.**
  - At the expected rates the gate cannot fire: agreement < 80% needs single-grader harmful disagreements on more than
    20% of blocks, which is already beyond the either-harmful ≤ 16% SAFE bar.
  - Three things are left open:
    - It does not say whether agreement is computed over all blocks or over the cue-attributable HARD ones.
    - It is defined per *set* (TWINS-H pooled = 6 files), but the repair is per *file*.
    - Regrades have no cap. Repeated regrades until agreement ≥ 80% select the lower-disagreement draw.
  - Fix:
    - compute agreement per file, over the file's gating blocks;
    - regrade the failing file once;
    - a second void leaves the reading VOID, reported.
- **m5. A floor VOID cannot be repaired by a regrade.** L169–170 give one repair path, regrading. The < 30 / < 90
  floors count classified blocks, and a regrade does not change them. State that a floor VOID is final for that
  reading. The floors trip at e ≥ 10 for both sets, 3 above the expectation's edge of 7, so this is not likely.
- **m6. Counts stated before the exclusions.**
  - L48–50 give partly-correct counts as in-app 6 and twins 7 / 3 / 4. After the pipeline exclusion (R02F, R11F
    in-app; R02F, R07F, R11F in r1; R07F, R11F in r2; R11F in r3) they are in-app **4** and twins **4 / 1 / 3**.
  - L43's "r2 has 2, TWINS-L r1 one" inherited answers include R02F, which is already pipeline. The inherited class
    adds only in-app R33 and r2 R11.
- **m7. Pin the router40 text that is sent.**
  - `SP\router40\SET-draft.md` is a live draft: revised 18:37 and 18:48, mtime 18:49.
  - Its §1 boundary cases cite router40 ids (RH19, RE09, RH04) that mean nothing to a holdout classifier.
  - The sanitised `classifier-dispatch.txt` part A already exists. Name it, or a copy, with its sha256 as the text
    sent, and drop part B, the difficulty grade.
  - Router40's own definition calibration (§6.4) has not run. Say that this reading uses §1 as approved, uncalibrated.
- **m8. r1 R09 has no frozen-grader correctness** (that judge holds 43 items). Its cue-introduced, inherited and
  partly-correct class is undefined. State "not cue-introduced, named".
- **m9. The change log and §3 differ on cue-introduced.** The change log (L231) says cue-introduced reads "consensus 0
  by contradiction". §3 (L121) uses `cons0(consistent)`, which also covers "false on its own terms". Align them;
  §3's wider form is the sensible one.

No other contradictions were found in the router40 class reuse, the exclusions or the decide-script calibration list.

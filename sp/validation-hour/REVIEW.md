# Review: PREREGISTER-h40d-DRAFT.md (cue mode's validation hour on holdout40)

Reviewer: Opus (`claude-opus-5-5`), 2026-10-01, from 01:00 local. The review was read-only. The throwaway scripts in
`validation-hour\review-scratch\` only read files and print numbers. I ran no test, build, npm or tsc, and made no API
or model call. I did not read any captured prompt, key, `.env` or `spike*`/`probe-shipped*`/`repro*` file, and no model
answer text is quoted here.

## VERDICT: NOT READY

**Counts: Critical 2 · Important 6 · Minor 13**

Rule 3c's wrong clause has two Critical defects. As written, it contradicts its own calibration case. It also fails
cue mode on noise about one time in four, and that failure leads to a revert. Six Important defects cover the latency
escape hatch, the design of 2c, empty answers in the twins, a log line the draft relies on that is never printed,
outcomes with no stated consequence, and a Thursday schedule that the draft's own inputs rule out.

Every fix is a change of text or of an instrument. None needs new data or a model call, and all of them fit into
Thursday. A scoped re-check of the changed clauses is enough; the whole document does not need another full review.

## What checked out (so it need not be re-checked)

- **The clocks script** (`h40d-clocks.mjs`) only reads files. I ran it on four folders. It reproduces:
  - h40c's registered first token: median 4.100 s, p90 6.498 s over 45 samples, the same as the result note's appendix A;
  - br1's p90 of 11.148 s (its note says "11.1 s");
  - the 16:12 run's cue cost C: median 0.217 s over the window (n 20). hold-read gives 218.5 ms on the whole log
    (n 22), which is consistent;
  - the 05:00 v1 smoke: 5.025 / 6.448 s;
  - the 2d fixtures: `r2-failure` gives 1 and `r2-delivered` gives 0.
- **The tree claims in §1:**
  - MAIN's tip is `fed4b07`.
  - The app-path commits since `0e1e8b2` are exactly `f745d7e` and `0ef42a0`.
  - `279103b` has parents `fd57512` and `0ef42a0`.
  - The diff from MAIN's tip to the cue branch is 35 files, +1884/−94, all under `electron`, `src`, `premium` and
    `package.json`.
  - MAIN's four commits since the merge base touch only `electron/test/golden/passes/`. No other build file or config
    differs.
  - `d83fdfe..8a13abb` is empty on the app paths.
- **The arms:** `PAIRED_ARMS` (flight.mjs:176–196) and the quota arithmetic. On 3.5-lite: 45 + 33 + 33 + 132 + 132 =
  375. On 3.1-lite: 33 + 33 + 44 + 132 = 242.
- **The h40c numbers the draft quotes:**
  - 35 of 45 acceptable (28 + 7);
  - the twin bands 36–38 and 36–37;
  - the gate row "29 acceptable, 4 weak, 0 wrong of 33, follow-ups 7 of 12";
  - words 57 / 72 / 92;
  - the Live-ear shares 9/44 and 7/45;
  - the grader pin, and the rubric stamp `8564ba96369a`.
- **The guard's dirty-tree whitelist** covers the tracked `interview60.chains.json`, and `*.stale-*.json` is
  gitignored. So Thursday's chains run (§7.5) will not trip Friday's guard.
- **The logs:** each run folder's `natively_debug.log` starts at its own app session. So Thursday's pre-hour start cannot
  leak into Friday's folder.
- **The 2d second term's logic** catches the one real block-only answer. I applied the same regexes and markers to the
  WHOLE 16:12 log (`review-scratch/term2-wholelog.mjs`). They flag exactly the readiness-probe window dispatched at
  13:12:04Z (one won-by line, no Stream-failed line) and nothing on h40c's whole log. See M4.

---

## Critical

### C1. Rule 3c's "wrong" contradicts its own calibration case and rule 3b

- **Where:** §4 rule 3c ("wrong: … wrong answers (correctness 0)"; "wrong = ids with correctness 0"), and the adapter's
  known case ("worst control wrong 2, cue wrong 1 / 0 / 2 → no stop, cue check n/a (no cues) → PASS").
- **What is wrong:** 3c defines "wrong" as correctness 0. The known case, h40c's result tables and 3b (through
  `h40c-rule3.mjs`, which tests `verdict === 'wrong'`) all count the judge's `verdictOf` "wrong" instead. That verdict is
  correctness 0 **or** on_topic 0 (`interview60.judge.mjs:171–175`).
- **Evidence** (`review-scratch/twin-wrongs.mjs`, counts only), on h40c's twins:
  - `captured-low` r1/r2/r3 have verdict-wrong 2/1/2 but correctness-0 only 1/0/1.
  - `captured-high` has 1/0/2 under either definition.
  - Under 3c's text, the known case reads: worst control 1, cue r3 at 2 → benchDecide **STOP**, not PASS.
  - Separately, "cue check n/a (no cues) → PASS" is not what `benchDecide` does. With no cues, present is 0 < 0.9·n in
    every rep, so it returns STOP. The case can only pass through special handling in the adapter, so the real
    cue-check path is never calibrated.
  - h40b shows the definitions do diverge in practice: its in-app R11F was "wrong" on on_topic 0 with correctness above 0.
- **Why it matters:** the adapter will be written against a known answer that its own rule says is wrong. Either the
  calibration "fails", or the adapter is bent to match the known answer. In both cases the definition that flies is
  decided by accident. 3b and 3c would also count different things under the same word.
- **Fix:**
  - Define "wrong" once, for 3b and 3c alike, as the judge's `verdictOf` "wrong". That is what `h40c-rule3.mjs` and
    h40c's tables count.
  - Restate the known case after C2's exclusion. On the 40 gated ids, the control (captured-low) is 1/0/0 (R08 in r1)
    and the cue side (captured-high) is 0/0/0 → PASS.
  - Calibrate the cue check on a case that has cues (M9) instead of "n/a".

### C2. 3c's wrong clause is decided by the five parentless follow-ups that 3b excludes as noise

- **Where:** §4 rule 3c, "wrong: no cue rep with more wrong answers … than the worst no-cue rep". It is computed on all
  ids.
- **What is wrong:** 3b excludes R02F R04F R09F R11F R13F because they arrive without their parent on every hour, so
  their grade is a coin flip. 3c counts them.
- **Evidence** (`twin-wrongs.mjs` over h40a–h40c, ids only):
  - Every wrong answer on the 3.5-lite HIGH twins of h40b and h40c (9 of 9: h40b 3/1/2, h40c 1/0/2 per rep) is on
    R02F, R09F or R11F.
  - On the 40 gated ids, the HIGH twins have **0 wrong in all nine reps** of h40a–h40c.
  - The null probability that "some cue rep > the worst control rep" when cue mode has no effect, computed exactly from
    the observed per-rep counts (`review-scratch/wrong-clause-null.mjs`):
    - verdict-wrong on all ids: **30.1%**;
    - correctness-0 on all ids: **21.0%**;
    - on the 40 gated ids: about 0.
- **Why it matters:** a 3c STOP is a cue-attributable FAIL, and §5 then prescribes "a reviewed revert of the merge on
  MAIN". About one hour in four would revert cue mode because of how R09F and R02F happen to be drawn.
- **Fix:** compute the wrong clause on the 40 gated ids, as 3b does, and print the all-ids counts beside it. Keep the
  band on all ids. The band is symmetric and lenient, with about 5% null failure for iid reps.

---

## Important

### I1. The latency decomposition is wrong, so the provider reading blames cue mode for a slow knowledge call

- **Where:**
  - §3: "The screen clock is the sum of the other two, up to the milliseconds between `dispatch` and the hedge's own
    `t0`."
  - Rule 2's provider reading ("if 2a fails while 2b and 2c PASS and the model clock's median exceeds 4.499 s").
  - 2a's calibration line ("the 16:12 run under the hold 5.313 FAIL").
- **What is wrong:**
  - The screen clock's t0 is `WhatToAnswerLLM.ts:310`, a few ms after the dispatch line.
  - The hedge's t0 is `LLMHelper.ts:3478`.
  - Between the two, `streamChat` awaits the knowledge step (`LLMHelper.ts:2441–2474` →
    `KnowledgeOrchestrator.processQuestion` → `getRelevantNodes(…, this.embedFn, …)`). That is an embedding call through
    the cascaded pipeline (OpenAI → Gemini → Ollama → a local model, `main.ts:660–670`): a network round trip unless
    the local model serves it. Cue mode does not touch it.
  - So screen = G + model + C, and G is about half a second, not "milliseconds".
- **Evidence** (`review-scratch/gap-g.mjs`, per window):

  | run | G median | G p90 | G max | dispatch line → screen t0, median |
  |---|---|---|---|---|
  | h40c | 504 ms | 635 ms | 786 ms | 4 ms |
  | br1 | 501 ms | 555 ms | 1219 ms | 5 ms |
  | the 16:12 run | 625 ms | 1042 ms | — | 11 ms |

  The 16:12 extremes are left out: the simple per-window pairing breaks on its superseded window.

  - The draft's own 16:12 known case contradicts its own rule. There, 2a fails (5.313 s), 2b passes (0.217 / 0.717 s)
    and the model clock is 4.594 s, above 4.499. By the draft's own provider reading that is **NO LATENCY VERDICT**,
    not FAIL. Only 2e catches the hold.
- **Why it matters:** take a moderately slow day: the model clock at 4.2–4.5 s, G a little up, C in bounds. 2a fails
  with the model clock at or under 4.499 s, and the draft then reads a **FAIL: "the extra time is cue mode's"**. On such
  a day, cue mode's parts are exactly C (gated by 2b) and the model-side cost (gated by 2c), and both passed.
- **Fix:**
  - Correct §3: screen = G + model + C + about 5 ms. Report G (dispatch→won-by minus the model clock) beside the others.
  - Make a 2a breach a FAIL only when 2b or 2c fails. With both passing, it is **NO LATENCY VERDICT** (re-fly).
  - An equivalent alternative: key the provider reading on the dispatch→won-by median (G + model; h40c 4.101 s) above
    4.751 s (4.101 + 1.000 − 2b's 0.350).
  - Correct the 16:12 calibration line to say that 2e alone catches the hold.

### I2. 2c compares arms run at different times, and its threshold's "first known case" is not like-for-like

- **Where:** rule 2c and §11 ("Thursday's bench: … cue-vs-control TTFT median difference").
- **What is wrong:**
  - The flight runs the arms one after another in `PAIRED_ARMS` order, and the three no-cue twins always run **last**,
    after `high`. On h40c, `captured-high` ran 15:15–15:26 local and `high` 15:26–15:29 (flight-h40c.launcher.log), so
    the control starts about 15 minutes after the cue side. Provider drift is therefore confounded with the cue rule,
    always in the same direction.
  - The 0.5 s allowance rests on h40c's calm hour alone.
  - Thursday's bench is not a known case for this clause. Its controls are s50m's answer files from 2026-09-22, a
    different day. And `cuebench-score.mjs` prints only p90s (`ttft p90 control / cue`), no median.
- **Evidence** (`review-scratch/arm-ttft.mjs`), captured-high rep medians for the same bytes, minutes apart:

  | hour | r1 | r2 | r3 | spread |
  |---|---|---|---|---|
  | h40c | 3248 ms | 3393 ms | 3525 ms | 0.28 s |
  | h40b | 3943 ms | 4882 ms | 3888 ms | **0.99 s** |
  | h40a | 3462 ms | 3606 ms | 3681 ms | 0.22 s |

  Pooled HIGH medians across the three days: 3.53 / 4.03 / 3.36 s. That spread alone exceeds 0.5 s.
- **Why it matters:** a 2c FAIL is cue-attributable and leads to a revert. On an h40b-like afternoon, the gap between
  arm blocks is within the noise of 0.5 s.
- **Fix, preferred:** gate the model-side cost on **thinking tokens**, which provider load cannot move. `answers.mjs`
  records `thoughts` (usageMetadata.thoughtsTokenCount) for every Gemini answer on both sides.
  - The HIGH rep medians were 705–783 tokens over nine reps on three days, while TTFT medians ranged 3.25–4.88 s
    (`review-scratch/arm-thoughts.mjs`).
  - Within a rep, TTFT tracks them at about 3 ms per thought token (Theil–Sen 2.4–4.3 over the nine reps,
    `review-scratch/thoughts-slope.mjs`).
  - A rule such as "cue pooled median thoughts ≤ no-cue pooled median + 150 tokens (≈ 0.5 s)" measures what 2c means
    ("the model thinks longer under the cue rule") without the order confound. Report TTFT beside it, with the order
    named.
- **Fix, second choice:** keep TTFT but gate at 1.0 s (above h40b's 0.99 s adjacent-rep spread). Report the 0.5 s line,
  and state in §10 that this hour cannot detect a sub-second model-side cost.
- **Either way:** drop the bench's TTFT as the "first known case". If a bench number is wanted, use its thinking-token
  difference: token counts are comparable across days.

### I3. An empty answer in a twin is counted as a transport hole, and holes count against the cue check

- **Where:** rule 3c ("an id with no answer in a rep (a transient error) counts as not acceptable and not wrong …, and
  as not present for the cue check; a rep with more than 3 such ids makes 3c INCOMPLETE"), the counting rulings, open
  question 8, and 2c ("over the ids answered").
- **What is wrong:**
  - (a) `pairsFromAnswers` (`interview60.judge.mjs:163–168`) drops **every** record whose `spoken` is empty, not only
    transient errors. A block-only twin answer (cues present, no prose: the exact cue failure the offers fix was for) or
    an answer the filters emptied is never graded. In the verdict files it looks just like an HTTP 503. 3c then counts
    it as "not acceptable, not wrong". With more than 3 of them, 3c is INCOMPLETE and a same-day re-run follows, which
    can resample a cue failure away. The bench counts empty prose as wrong ("Empty prose was not graded and counts
    wrong for both graders").
  - (b) Counting a transient hole as "not present" puts transport failures into the cue gate. 3 holes (allowed) plus 2
    misshaped blocks give 39 of 44 = 88.6% < 90% → STOP, a cue-attributable FAIL. Without the holes the same rep reads
    39 of 41 = 95%.
- **Fix:** the adapter reads the answers files, not only the verdicts.
  - `transientError` means a hole. Exclude it from that rep's n for acceptable, wrong **and** the cue check. More than
    3 holes in a rep → INCOMPLETE, as drafted.
  - `spoken` empty without `transientError` means an answer that says nothing. It counts as wrong on either side (the
    bench's rule), and on the cue side it is named as a block-only twin.
  - Define 2c's "ids answered" the same way.

### I4. Rule 1(e), §2 and §9.1 rely on a log line the flight never prints on a cue hour

- **Where:**
  - §2: "its rule summary (`0 of N lack it`) prove the captured prompts carry the rule";
  - rule 1(e): "a rule summary other than `0 of N lack it`";
  - §9.1: "every `captured-no-cues-high` arm ran, `0 of N lack it`".
- **What is wrong:** `interview60.flight.mjs:341–347` builds `ruleSummary` but logs it **only inside the skip line**
  (`paired arm … skipped — ${ruleSummary}, …`). When all captured prompts carry the rule, nothing is skipped, and "0 of
  N lack it" never appears.
- **Why it matters:** the reader looks for a proof that cannot exist. A strict reading of §2 or §9.1 could VOID a valid
  hour, and in any case the step cannot be carried out as written.
- **Fix:** the proof is:
  - (i) no line containing `paired arm captured-no-cues-high` and `skipped`;
  - (ii) `interview60.flight.done.json` `pairedArms` lists all three no-cue tags;
  - (iii) the three `--no-cues` `answers.mjs` runs log `EXIT 0`. `answers.mjs:301–305` exits 2 on any captured prompt
    without the rule.

  VOID when any of the three fails.

### I5. Several outcomes have no stated consequence, and a VOID can hide a cue failure

- **Where:** §5 and §6.
- **What is wrong:**
  - (a) **2e FAIL** (NOT GONE while gated) has no §5 branch, yet it is plainly cue-attributable.
  - (b) **A rule-5 FAIL** has no branch. That is 5a at 43 or fewer, or 5b at 0 of 1, for a cause after dispatch: an
    answer attributed to nobody, or a dispatched item never delivered that 2d did not charge.
  - (c) **The grader not pinned:** "rule 3 is reported, not gated, and the hour cannot PASS". The outcome has no name and
    no next step. If the `opus` alias has moved past `claude-opus-5-5` by Friday, no re-grade can restore the pin and
    the hour can never pass.
  - (d) **A 2a breach with the model clock above 4.499 and 2c INCOMPLETE** fits neither "2b and 2c PASS" nor "2b or 2c
    failing".
  - (e) **Several FAIL branches at once** (for example 3a and 3c): no precedence is stated.
  - (f) **VOID masking.** A VOID on 1(a)–(c) or (f) makes the other rules "reported for what they show", and then the
    hour is re-flown unchanged. A true block-only answer (rule 4) or a 3c STOP seen in, say, an hour that is VOID only
    because a second item was lost before dispatch would lead to re-flying holdout40 with a known cue defect. That is
    sampling until it passes.
- **Fix:**
  - Put 2e in the cue-attributable branch, and add a branch for rule 5.
  - Name the grader outcome, "GRADER DRIFT", with the user's choice between a dated re-pin amendment and "not validated".
  - Make (d) INCOMPLETE until 2c is decided.
  - State the precedence: cue-attributable FAIL > other FAIL > INCOMPLETE > NO LATENCY VERDICT.
  - State that a cue failure (rule 4) or a 2b/2c/3c FAIL acts as a cue-attributable FAIL in any hour whose dist proofs
    and captured-rule proof pass (1(d), 1(e)), even when the hour is VOID on (a)–(c) or (f).

### I6. The Thursday the draft assumes is ruled out by the two pre-registrations it depends on

- **Where:** §6 ("The hour flies only after: … the bench PASSED …, the follow-up replay has run (its own day rule)"),
  rule 2c ("Thursday's bench") and §12, question 9.
- **What is wrong:**
  - The bench's second amendment says the bench runs on "the next quota day that has neither a flight nor another
    pre-registered replay on 3.5-lite. That day is not Thursday: the follow-up replay's day rule excludes a cue bench."
  - The follow-up replay's §8 says: "Run only after 10:00 local on a day with NO flight and NO cue bench."
  - The draft (and the agenda's 00:06 plan) needs both on Thursday.
  - Neither can move to Friday, because Friday is a flight day.
  - This hour does not need the replay at all. The replay's own §6.2 lets its calibration run after the merge against a
    dist compiled at `0e1e8b2`.
- **Fix:**
  - Drop "the follow-up replay has run" from §6's preconditions.
  - State where the bench runs. One option: before 10:00 Thursday, on Wednesday's quota day, if the ledger shows at
    least 169 requests of headroom on 3.5-lite (bench 117 + probe 52). The other: after 10:00 Thursday, with the replay
    moved to a later quota day with no flight, at the user's call.
  - Put the resulting h40d date in "What flies".
  - If both must share Thursday's quota day, the user amends one day rule, dated, with the arithmetic: bench 117 +
    probe 52 + replay ≤ 120 + pre-hour start ≤ 5 = ≤ 294 on 3.5-lite. Either way, the draft says which reading of
    "day" (quota day or calendar day) it uses.

---

## Minor

- **M1. The grader-model check only works in this session.**
  - `h40c-grader-models.mjs` hard-codes session `9c5886c7-…`. If Friday's grading runs in another session, it prints
    "NO TRANSCRIPT FOUND", rule 3 goes ungated and the hour cannot pass.
  - Fix: add `h40d-grader-models.mjs` to §7.4, with the session as a parameter or a search over all sessions'
    `subagents/`, and recalibrate it on a known Opus, a known Sonnet and a missing transcript.
- **M2. 3e's reason misquotes h40c, and 5a over-states R05.**
  - On mains, h40c **passes** 3e at its edge: in-app 28 against HIGH twins 28/29/30 on the 32 mains captured
    (`review-scratch/mains-band.mjs`). "One below" is the all-items band (35 against 36–38).
  - h40b's 27 against 28–30 is right.
  - The real reason to report 3e is that at the edge the baseline itself fails it about half the time. Say that.
  - 5a says R05 is lost "on every hour of this roster", but h40a answered it.
- **M3. The 3d join cannot be made from the named outputs.** The rows `h40d-clocks.mjs --list` prints carry no time, so
  "the join of items to winners … from the judge's pairs and the clocks script's `--list`" is impossible from those two
  outputs. Add the dispatch ISO time (and the won-by time) to each row. The in-app pairs carry `dispatchedAt`.
- **M4. 2d's bookkeeping.**
  - "(ii) any window the first term did not charge" needs a per-window join that neither script prints. Since the gate
    is ≤ 0, write "2d FAILS when either term is 1 or more; the reported count is the union, joined by dispatch time".
  - A window with a won-by line, no `[Answer] full:` line and no `stream aborted by new generation` line (never
    delivered, not superseded) is charged by neither term. Make it UNRESOLVED, which gives INCOMPLETE.
  - The calibration notes cite only `[No answer` fixtures that term 1 also charges. Add the real block-only case (the
    whole 16:12 log, the window at 13:12:04Z; see "What checked out").
- **M5. Quota wording, and the control's exposure.**
  - §8 says "requests used", but `quota-ledger-today.mjs` prints lite *mentions* in the app logs (an upper bound: every
    hedge `front=` line names both models) plus a file list. Say that the mention count is compared.
  - The no-cue control runs last, so if 3.5-lite runs short (60 used + about 390 + retries), the control is lost first
    and 3c becomes INCOMPLETE with no same-day re-run. Consider allowing at most 30 before the flight.
- **M6. Rule 1(d) contradicts itself.** "the two proofs' filter sha256/16 differ" means VOID, but "(a rebuild … is not
  void by itself … the second proof decides)" says otherwise. Say: "a rebuild with an unchanged filter sha is not void;
  a changed sha is VOID".
- **M7. Rule 4's wording.**
  - 4a and 4b read as requirements, but the three-kinds text then overrides them.
  - Say "rule 4 FAILS only on a cue failure; a failed check or row explained entirely by pipeline events reads CLEAN
    NET OF PIPELINE EVENTS = PASS".
  - A "health failure … answered late" is sent to rule 5, which does not measure lateness. Report it instead.
- **M8. 5a's cause rule** is ambiguous when a loss before dispatch (R05) and one after dispatch occur in the same hour.
  Decide per item: losses before dispatch beyond the baseline's one → VOID; any loss after dispatch → FAIL (with I5's
  branch). An answer attributed to nobody is a harness miss: resolve it by hand from the dispatch's `question=`.
- **M9. The 3c adapter's calibration** never exercises the cue check.
  - Add a known case with cues: the bench's cue answer files, whose present and shaped counts per rep `cuebench-score`
    prints.
  - Add a known-bad case: a rep with five 4-line blocks → STOP.
  - Add a hole case: 3 transient errors plus 1 empty prose → not INCOMPLETE, with 1 wrong.
- **M10. Wording.**
  - br1 is "the same code on a loaded day", but it is scenario50, with answers p50 85 words against holdout40's 57. Its
    slower model clock is roster plus load.
  - §3 says "each per answer-dispatch window", but the screen clock is every first-token line in the slice, which is
    h40c's method.
  - "window" means three things (dispatch window, run window, flight window). Name them.
- **M11. The pre-hour MAIN start (§7.3)** names no commands.
  - Write `interview60.run.mjs app:start` → `probe` → `app:stop`.
  - Require proof that no Natively process remains afterwards (the single-instance lock) and quote its `PROBE READY`
    line.
- **M12. Re-runs.**
  - 3c says "otherwise 3c has no verdict"; §5 says "else the hour is re-flown". Pick one.
  - A re-run arm only fills its holes (`answers.mjs` resumes from the file), hours later. Exclude those ids from 2c.
    Grade them with the pinned grader and name them.
- **M13. 3a's noise.** 3a sits exactly on h40c's own count, so a re-fly of the unchanged baseline fails it with real
  probability (±4 noise; the in-app counts on this roster were 39, 35 and 35). §5's soft consequence is right. Decide
  now that a 3a miss with 3c PASS, and the in-app count within its own twins' band, reads as noise and leads to a
  re-fly, not a revert.

---

## The ten open questions

1. **How the twins are graded (one per arm, or blind pairs).** Keep one pinned grader per arm, with all seven agents in
   one session. Only do so with C1 and C2 fixed.
   - Graders see prose only, so cue against no-cue is blind by construction.
   - Both sides are graded fresh, so there is no grader-drift problem to pair away.
   - The band is symmetric.
   - The blind design would need a new pairs builder, its calibration and 12 more agents, for little gain here.
2. **Band gate against the floor.** Keep 3a gated and 3e reported, but correct the reason (M2). Also pre-decide the
   3a-miss reading (M13).
3. **The screen clock's p90.** Keep it reported. 2b's p90 bounds what the block adds at the tail, and C's max is
   reported. br1 is another roster, so its 11.1 s says little about holdout40's tail.
4. **2c's 0.500 s.** Do not keep it as written (I2). Gate the model-side cost on thinking tokens (about +150 tokens ≈
   0.5 s). The fallback is TTFT at 1.0 s. Drop the bench's TTFT as the first known case.
5. **2e's conditional gating.** Keep it, with three changes:
   - Add 2e FAIL to §5's cue-attributable branch.
   - Say that `hold-read` reads the whole log, probe included.
   - Cite h40c as the known no-hold case on this roster: B < 15 ms in 3 of 47 answers, with the whole stream's median
     T of 156 ms (against 312 ms on S1). A correct early close should read GONE comfortably on holdout40.
6. **The pre-hour MAIN start.** Do it. It costs about 5 requests on Thursday's quota day. It is the only crossing of
   MAIN's `.env` loader, MAIN's dist with cue mode and the single-instance lock before the hour. Name its commands
   (M11).
7. **Grading `captured-low` only on 3 or more back-leg wins.** Either choice is defensible. I would grade them always:
   the arms run anyway, so there is no API cost, only three agents, and grading no longer waits on the by-hand winner
   join. Keep "never pool".
8. **Transient holes.** Keep the symmetric rule for **true** holes (`transientError`), but exclude them from the cue
   check's n. Count empty prose (no `transientError`) as wrong on either side, the bench's rule (I3). More than 3 true
   holes gives INCOMPLETE, as drafted.
9. **The fallback day.** Confirm "the first qualifying day at 13:30", with the earlier-questions flight yielding (one
   variable per flight). First, resolve the bench/replay conflict and drop the replay precondition (I6).
10. **Replay arms.** Run the full list; nothing changes in the harness before the hour. Name the two costs of the order:
    the no-cue control runs last (2c confound, quota exposure).

## Questions the draft missed

- **A.** What "wrong" means in 3b and 3c, and whether 3c's wrong clause excludes the five follow-ups (C1, C2).
- **B.** What happens if the `opus` alias no longer resolves to `claude-opus-5-5` when grading starts (I5c). The user
  should decide now between a dated re-pin and "not validated".
- **C.** Whether a cue failure seen in an hour that is VOID for a reason unrelated to the build stops cue mode (I5f).
- **D.** Whether one extra loss before dispatch, beyond R05, should VOID the hour (a lost quota day), or read "PASS net
  of pre-dispatch losses" when 3a still holds with that item counted as not acceptable. `not-a-question` closes
  occurred 2, 3 and 1 times on h40a, h40b and h40c.
- **E.** How a re-run twin arm enters 2c and grading (M12).

## What I did not check

- The instruments that do not exist yet: `h40d-twins.mjs`, `h40d-rule3.mjs`, `guard-h40d.mjs`, `launch-h40d.cmd` and
  its dry twin, `h40d-merge.cmd`, `h40d-grader-dispatch.txt`, `h40d-precheck.ps1`, `register-h40d.ps1`.
- I ran no other script: not `check-smoke-cues.mjs`, `smoke-facts.mjs`, `dist-proof.mjs`, `quota-ledger-today.mjs` or
  `h40c-hedge-stats.mjs`. I read their code. I ran `h40d-clocks.mjs` (four folders plus the three 2d fixtures) and
  `hold-read.mjs` on h40c and br1.
- MAIN's working-tree state. This session is barred from running git inside MAIN's checkout, so I checked branch
  contents through the shared object store only.
- The merge review, the SDD reviews, the early-close and small-cues specs, `PREREGISTER-cueprobe.md`, the follow-up
  design, and the h40c grader dispatch text.
- That the combined build's `first token` fires on the first prose chunk after the block. No run of that build exists;
  I only traced the code path (`stripCueBlock` innermost at WhatToAnswerLLM.ts:390, `tapFirstToken` outermost at
  :402–435).
- Whether any `Natively-*` task (for example a Live probe) is still scheduled for Friday, and h40b's exact playback
  start.
- **The probabilities in C2** rest on six per-rep counts (h40b and h40c HIGH twins), treated as iid. The zero on the
  gated ids is an empirical zero over nine reps, not a proof. The thinking-token slope in I2 is Theil–Sen over nine reps
  with stalls present, and should be re-derived before it becomes a threshold.

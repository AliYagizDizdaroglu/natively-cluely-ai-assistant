# Spec review: turn-based follow-up context (2026-10-03, Fable)

Reviewer: Opus 5.5, read-only, 2026-10-03. No model API calls, no subagents, .env not read, no captured prompt or
question text from the run files printed (ids, lengths, counts, hashes only). Code is cited at MAIN 34fc254
(`fix/coding-style-suffix-all-gemini`, read through the filesystem).

**VERDICT: APPROVE WITH FIXES.** Critical 1, Important 5, Minor 13.

The core is sound. Using only the previous question, and only when it is missing from the prompt, does make the
recorded S2Q09F trace byte-identical. One rule in the spec brings back that same failure shape: the 60 s
`sameAnchor` ledger dedup (C1). Two more paths can still insert an older question while the real parent is
present: a supersede merge (I2) and paths the ledger never records (I1). The replay material cannot detect any of
the three (I3). Every fix below is a change to the spec, not a redesign.

Note on files: to check the claims I wrote throwaway scripts next to this report in `followup-turn/`: `cmp.mjs`,
`peek.mjs`, `numbers.mjs`, `ledger-check.mjs`, `ledger-seq.mjs`, `thoughts.mjs`, `dedup-case.mjs`. They print ids,
lengths, timings and booleans only. `dedup-case.mjs` uses invented sentences only. I changed no existing file. The
scripts can be deleted.

---

## 1. Claims about the code: checked

| Claim | Verdict | Evidence |
|---|---|---|
| Files named in the spec are byte-identical between MAIN and the whole-turn worktree | TRUE | sha1 equal for all 9 files (`cmp.mjs`): SessionTracker, IntelligenceEngine, interviewerTurn, WhatToAnswerLLM, TemporalContextBuilder, followUpParent, main, questionReconcile, ChipDeduper |
| `contextWindowDuration = 120` evicts | TRUE | SessionTracker.ts:41, evictOldEntries :504-512 (note: runWhatShouldISay asks `getContext(180)` at IntelligenceEngine.ts:299, but eviction at 120 s wins) |
| TemporalContextBuilder: ≤ 3 previews, 200 chars, 180 s, "Avoid Repetition" | TRUE | TemporalContextBuilder.ts:121-130, :163; label WhatToAnswerLLM.ts:224 |
| `sparsifyTranscript` keeps the last 6 interviewer turns past 12 | TRUE | transcriptCleaner.ts:106-133; called with 12 at IntelligenceEngine.ts:342 |
| `preparedTranscript` is final in both branches; it is a valid hook | TRUE | IntelligenceEngine.ts:328-353 (contextOverride branch :330-333, live branch :334-353) |
| `generateStream` can take one more optional argument after `onCues` | TRUE | signature WhatToAnswerLLM.ts:180-202; the only verbal call is IntelligenceEngine.ts:424 |
| Byte rule (`${block}\n\n` right before `INTERVIEWER JUST SAID:\n`) is what the push produces | TRUE, with one placement fix (m5) | fullMessage WhatToAnswerLLM.ts:237-239. Whether or not `extraContext` is empty, the result equals `insertBlock` (earlierQuestions.ref.mjs:187-192). `knowledgeQuestion` comes from `cleanedTranscript` (:240), so it does not change |
| "Byte-identical when flag off" is achievable | TRUE | the new argument is undefined, so `contextParts` is unchanged. A ledger write changes no prompt byte. `feedForDepthScoring(message)` (LLMHelper.ts:2444) sees the block only when the flag is on; design 2 §9 covers it (stub scorer) |
| `dispatch: answer` → push; `supersede` → replace by turn id; hook sites exist | PARTLY | answer: main.ts:2145-2165 (write before `void this.answerDetection(d)` at :2165). Supersede: main.ts:1008-1032; the replace must come before :1030. The R21 branch (:1016-1018) sends a supersede through dispatchDetection, where it logs as `dispatch: answer`, so the push must also replace by turn id (m9) |
| Chip click and typed questions are written at `dispatch: answer` | **FALSE** | see I1 |
| `turn.snapshot().id` is available at dispatch | TRUE | interviewerTurn.ts:314-325; in auto mode every answer is a turn dispatch (main.ts:2097-2108; decideDispatch returns `answer` only in auto, detectionDispatch.ts) |
| Supersede text = head + tail | TRUE | interviewerTurn.ts:237-242, `textOf` joins all finals :153-157 |
| "A Live-dispatched question … its pinned text is Live's rendering" | MOSTLY FALSE | in auto mode the pinned text is the turn's STT finals joined; Live text is used only when the turn has no final (interviewerTurn.ts:153-157; `turnDispatchInput` sets `question: d.text`, turnDispatch.ts:15). So the paraphrase-miss case is rarer than §4 says (m2) |
| ChipDeduper `answeredWindowMs` = 60 s | TRUE, but cited for something it does not do | see C1 |
| Flag refuses to start alongside `NATIVELY_FOLLOWUP_PARENT=1` | feasible | the pattern exists: followUpParent.ts:24-26, main.ts:259 |

## 2. Findings

### Critical

**C1. The ledger's 60 s `sameAnchor` dedup recreates the S2Q09F failure, and its cited source does not do this.**
- *Evidence.* §3.1 replaces the newest entry when the new text is `sameAnchor` to it within 60 s. `sameAnchor`
  accepts ≥ 50 % overlap in **either** direction, so a short text matches easily (questionReconcile.ts:30-34).
  Simulated with invented sentences (`dedup-case.mjs`). Ledger: grandparent at 0 s, parent at 200 s, then "Why that
  algorithm?" 30 s after the parent. Overlap of the follow-up with its parent is 0.5 on "that", so the follow-up
  REPLACES its parent. Selection then skips the follow-up (the current question) and picks the **grandparent**.
  The gate fires (`short`). The grandparent is absent, so the block carries the grandparent while the real parent
  is still in the prompt. That is S2Q09F exactly.
  - Calibration: the same events 90 s apart (no dedup) give `''`.
  - Spread: "Why that one?" is `sameAnchor` to 16 of the 50 scenario50 mains (`ledger-check.mjs`).
- *The cited provenance contradicts the rule.* ChipDeduper uses `sameAnchor` only inside its 20 s base window. It
  states why: two different questions sharing a frame clear `sameAnchor` on the frame words alone (after8 W08 at
  +49 s; ChipDeduper.ts:205-211). Past 20 s it requires ≥ 4 content words and uses containment or Jaccard 0.7
  (:212-240).
- *It is also redundant.* A real re-fire of an answered question within 60 s is already dropped before
  `dispatch: answer` (main.ts:2138-2143; `decideDispatch` drops `alreadyAnswered`). Whatever reaches the ledger
  within 60 s is therefore something the deduper judged to be a **different** question.
- *It catches none of the shapes it cites.* The re-smoke double came 76 s late and br1 61 s late (memory
  `project_not_a_question_close.md`). Both are past 60 s.
- *The replay cannot see this.* The shortest gap between consecutive roster dispatches is 65.3 s in s50m and s50l
  (`ledger-seq.mjs`). The only gap under 60 s is a 0.9 s same-turn supersede (s50l S1Q02), which replace-by-turn-id
  already covers.
- *Fix.* Delete the dedup. Keep only replace-by-turn-id for supersedes. A duplicate that slips past the deduper
  becomes a duplicate entry, which is harmless: "parent = newest entry that is not the current question" skips
  every copy of the current question. Remove "60 s" from §5 and from the §3.6 echo row. Add a state-table test
  (with the case of 90 s → `''` as its control): "distinct follow-up < 60 s after its parent, sharing a frame word →
  parent kept, block `''` when the parent is in the prompt".

### Important

**I1. Chip clicks, typed questions, "answer now" and manual "What to answer" are not written at the named hooks,
and suggest mode leaves the ledger empty.**
- *Evidence.*
  - Chip click goes `answer-detected-question` → `runWhatShouldISay` with `contextOverride` (ipcHandlers.ts:2387-2415).
  - "Answer now" goes `answer-now-fast` (:2421-2444); the manual path is `generate-what-to-say` (:2373-2385).
  - Typed chat goes `gemini-chat-stream` (:454) and never reaches `runWhatShouldISay`.
  - None of these passes through `dispatchDetection`, so the §3.1 row "chip click, typed with a pinned text" and
    §4 "Chip click / typed question: turnId null, appended" describe writes that no hook makes.
  - In suggest mode `decideDispatch` never returns `answer` (detectionDispatch.ts), so the ledger stays empty and
    the feature does nothing, without saying so.
  - The chip path's transcript is a 60 s snapshot (main.ts:2148), so its parent is absent more often than in auto mode.
- *Fix (simplest, rule 3).*
  - Write the ledger inside `runWhatShouldISay`, AFTER the block is built, for every call with a pinned question
    (`settled`), with `turnId` passed through `options` (null off the turn path).
  - Then "parent" is simply the newest entry, or the newest entry whose turn id differs from the current one on a
    supersede. No text-based current-question skip is needed (see m6), and every path that answers is covered.
  - Alternatively, scope v1 to auto mode in §2 and say that chip, typed and manual answers neither write nor get a
    block.

**I2. A follow-up merged into its parent's turn (two questions in one turn, via supersede) gets the grandparent.**
- *Evidence.*
  - When the interviewer adds a second question before the candidate's first STT final, the turn supersedes
    (`candidateSpoke` closes a turn only on a user final, main.ts:1232; supersede interviewerTurn.ts:233-243).
  - The ledger entry for that turn becomes parent + follow-up. Selection skips it as the current question and takes
    the previous turn, the grandparent.
  - The gate runs on the merged text. REFERENCE, CALLBACK and CONSTRAINT match anywhere in it
    (earlierQuestions.ref.mjs:58-61).
  - Simulated (`dedup-case.mjs` case B): cue `reference`, block = the grandparent, while both the parent and the
    follow-up sit in the pinned line.
  - The §3.6 row "supersede of the current turn … the parent is the turn before" covers only a continuation of the
    same question.
- *Fix.* On a supersede dispatch (`replaceAnswer === true`) the block is `''`: the turn's own head is already in
  the pinned line. Add the state "two questions in one turn (supersede of a different question)" to §3.6 with
  `''`. Also name the residual for a single dispatch carrying "Q1? And Q2-with-pronoun?": the gate can fire on
  Q2's words and add the previous turn.

**I3. The replay cannot detect any failure shape this design creates. "No new wrong" covers only the 4
evicted-parent items and D1–D3.**
- *Evidence.*
  - s50m and s50l have no dispatch pair of different questions under 65 s, and one same-turn supersede (s50l S1Q02,
    0.9 s).
  - Closes: 42 of 42 `continuation-expired` in each hour; 0 `not-a-question`, 0 `candidate` (`ledger-check.mjs`).
  - So the states that matter here (C1, I1, I2, a not-a-question close, a late Live echo) never occur in the
    material: clause 1 cannot fail for them.
- *Fix.*
  - Make each such state a deterministic test in §3.6 with its expected block: C1's case and its 90 s control;
    I2's merge; a re-ask; an echo at 61 s and at 76 s; a not-a-question close before a follow-up; an aborted
    parent; suggest-mode and chip paths.
  - Say in §6 that the replay measures only the label and the parent line on 4 items. The new states are proven by
    tests and observed only in the flight.
  - Before default-ON, add a short smoke with invented quick follow-ups ("Why?", "Why that one?" 20–40 s after
    their parent): neither roster has one, and that is the regime where C1 and I2 live.

**I4. The cost provenance (§3.4) cites pooled numbers that understate the cost of the blocks this design actually
keeps.**
- *Evidence.*
  - §3.4 cites TTFT +131 ms, words +3 and "blocks 284–576 chars" over 89 pooled pairs. The pooled blocks actually
    range 272–908 chars (callbacks up to 908, D-cases from 272), and most of those pairs do not exist in this design.
  - On the 4 items that keep a block (S1Q04F, S1Q06F, S2Q05F, S2Q08F, 24 pairs), design 2's own answer files give:
    thinking +74.5 tokens, TTFT +261.5 ms, words +3, all paired medians (`thoughts.mjs`).
  - The pooled thinking median was +2.
  - Per-pair thinking deltas on these items run from −341 to +348.
- *Fix.*
  - Cite the 4-item numbers as the prior.
  - Compute clauses 3–5 on the 40 roster pairs (the shape that ships) and report the 70-pair figure beside them.
    Otherwise the shorter D-case blocks dilute the medians, the same way the pooled number did here.
  - State the margins: about half the TTFT bar (≤ +500) and about half the thinking bar (≤ +150).

**I5. The gain clause rests on two items, and on one of them the replay model and the shipped app disagree about
the baseline.**
- *Evidence.*
  - Of design 2's +11 on these 4 items over 24 pairs, +10 comes from S1Q04F and S1Q06F (2026-10-03 result table;
    Thu www→YYY on both, Sat www→wYY and www→YwY).
  - Their windows are nearly identical across the two hours (result note, "What this does not show"), so the
    "2 hours" are not independent material.
  - The deep dive's flight data has S1Q06F at **8/9 acceptable in-app** with the parent absent
    (followup-aggregate.out.txt:54), yet arm A reads www on both days on 3.5-lite HIGH.
  - Part of the S1Q06F gain may therefore be a replay-model effect that the shipped hedge (3.5-lite front,
    3.1-lite LOW back) would not show.
  - Under the prior (about +18 expected over 40 pairs), the +8 bar is near-certain to pass whatever the label
    does: it confirms that the known gain survives, not that the gain generalises.
- *Fix.*
  - Say this in §7.
  - Either add the hedge's back leg (3.1-lite LOW) for the 4 roster items, at 3 reps (24 more calls, still one
    quota day), or record the decision as "front leg only".
  - Report the gain per item as well as pooled, so a pass carried by one item is visible before the build.

### Minor

- **m1.** s50l has **39** captured ids, not 40 (gate-report-s50l.out.txt:145; S1Q01 is missing in both fixtures).
  The gate fires on 8 of 39 in each hour; the gated and parity sets recompute exactly as §6 states under the new
  selector (`numbers.mjs`).
- **m2.** §4 "pinned text is Live's rendering": in auto mode it is the STT finals joined (see the table above).
  Fix the sentence; the paraphrase-duplicate residual is mainly the no-finals case.
- **m3.** The §3.6 row "parent is the current question (re-ask, double dispatch) → skipped → ''" is inaccurate.
  Skipping selects the next older entry, so a re-ask gets the question asked between, if the gate fires. State the
  real outcome.
- **m4.** §4 "closes `continuation-expired` … without dispatching": impossible. That close happens only after a
  dispatch (interviewerTurn.ts:246-248).
- **m5.** The pseudo-code `if (!isCodingForFraming && block) contextParts.push(block)` cannot sit where the spec
  places it. `contextParts` is joined at WhatToAnswerLLM.ts:227 and `isCodingForFraming` is declared at :231. Move
  the declaration up, or push before the join with `intentResult?.intent !== 'coding'`.
- **m6.** The current question is identified by normalised text containment. Under I1's fix it needs no
  identification at all. If dispatch-time writing stays, pass the entry's identity (turn id or sequence) instead.
  A text mismatch would otherwise pick the current question itself as "EARLIER QUESTION … do not answer it again".
  It is unreachable today only because both strings are `d.question` (main.ts:2194).
- **m7.** `clip` keeps the head (earlierQuestions.ref.mjs:120-126). §3.4's own provenance says the referent sits
  at the end, so any parent over 450 chars loses exactly the referent. The maximum seen is 409 chars in both hours
  (`numbers.mjs`), but whole-turn texts are joined finals and can be longer. Keep the tail (`…` + last 449), or
  head + tail.
- **m8.** The label says "already asked **and answered**", but the design deliberately records parents whose
  answer was aborted or stalled (§3.1). Use "asked earlier". It is still new bytes, so Q3 does not change.
- **m9.** The R21 supersede (main.ts:1016-1018) logs and pushes as `dispatch: answer`, so the push must also
  replace by turn id. The supersede log line carries no turn id (main.ts:1027): the replay's ledger rebuild must
  map a supersede to its entry through `replaces=` (the previous text) and say so in the registration. Log the
  turn id in the new diag line so flights can audit the ledger.
- **m10.** `LEDGER_DEPTH = 3` is justified by v2's callback distance, which is speculative under rule 3. v1 has its
  own reason: the current entry, one duplicate of it, and the parent. Cite that.
- **m11.** §5 "every loss came from a non-parent line" / "the only line that ever gained": S2Q05F's Thursday loss
  (Yoo→ooo) came from the parent line (FINDINGS.md:28), and S1Q08's +1/+1 came from a grandparent line. Reword.
- **m12.** The clause 6 "parity" precondition is tautological on bytes: `insertBlock(user, '') === user`. What it
  can actually catch is the selector returning a non-empty block for an id expected to be `''`. Restate it as:
  (a) the reference returns `''` for every non-gated id from a ledger rebuilt from the log (S2Q09F, S1Q08, S2Q08
  and S2Q01F asserted by id); (b) the gated ids' block sha256 values are frozen before the first call; (c) at build
  time, the app reproduces (a) and (b) on the fixture, and with the flag off the dist builder reproduces the
  captured bytes, as design 2's `--calibrate` did.
- **m13.** Process items:
  - Graders auto-load the project memory that names the experiment and its bar (2026-10-03 result, "What this does
    not show"). Run them from a cwd with no project memory, or name the exposure in the registration.
  - "3 reps give 24, too few for the bar" is unsupported: at 24 pairs the bar is +5 and the prior is +11.
  - Flag off: say whether the ledger is still written. Recommended: not written, so the flag-off state is
    literally today's code path.
  - Cue mode: MAIN still ships `CUE_RULE` (prompts.ts:2444) while the user's 10-02 ruling (cue mode OFF by
    default) is parked. The flight must state which shape it flies.
  - A parent counts as "present" when only a tail fragment of it survives the sparsify cut. Name it as a residual.

## 3. Derived numbers, recomputed

| Constant / claim | Spec | Recomputed | Status |
|---|---|---|---|
| Label length | 138 | 138 (old 164) | OK |
| Longest scenario50 question | 407 | 407 (S1Q04); captured max 409 in both hours | OK; m7 for > 450 |
| Gate on the roster | 11/12, 1/38, 4/4, 0/46 | same (gate-report.out.txt:35-38) | OK |
| Gate on captured text | 8/39 s50m, 8/40 s50l | 8/39 and **8/39** | m1 |
| Gated set under the new selector | block: S1Q04F S1Q06F S2Q05F S2Q08F; `''`: S1Q08 S2Q08 S2Q09F S2Q01F | identical in both hours. Parent is always the newest entry; ages of evicted parents 156–162 s; present parents 66–98 s | OK |
| S2Q09F made impossible | yes | true for the recorded trace (parent S2Q09 present → `''`); NOT for the class (C1, I2, I1) | see findings |
| Dedup 60 s | ChipDeduper | ChipDeduper uses `sameAnchor` only within 20 s | C1 |
| +150 thinking bar | h40d 2c | matches memory (cue rule +161 vs +150); prior on the 4 items +74.5 | OK, I4 |
| Stall allowance +4 | 2/39 pro rata | 2/39 × 70 = 3.6 → 4 | OK |
| Gain bars +8 / +2 | 4/21 and 1/21 scaled | 7.6 → 8; 1.9 → 2 | OK |
| 140 calls | 70 pairs × 2 | 40 + 30 = 70 pairs; under the 500/day lite cap | OK |
| Deep dive 110/227, 86 % vs 63 %, 19/20 | — | FINDINGS.md:13-15 | OK |
| "self-contained evicted follow-ups 9/9" | S1Q05F S1Q08F S2Q04F | each 9/9 in-app (followup-aggregate.out.txt:53,56,62) | OK |
| Cost "+131 ms, words +3, 284–576 chars" | pooled 89 | blocks 272–908; on the kept 4 items: TTFT +261.5, thinking +74.5, words +3 | I4 |

## 4. The replay plan

- **Soundness.** Same instrument, interleaving, graders and frozen rubric as design 2, plus a thinking clause and
  a parity precondition. Arm B = `insertBlock` of the reference block; the byte rule matches the code (see the
  table). It is sound for what it can measure: the label and the parent line on 4 evicted-parent items and 3
  wrong-parent D-cases.
- **At least as strict as design 2?** Yes. The clause order is the same, a thinking clause is added, and clause 1
  ("B ≤ A over all 70 pairs") has more pairs on which to fail.
  - The user should know the price. Assume a consensus-wrong rate of 0.5–1 % per pair per arm (design 2: 0 of 42 on
    the kept items, 1 of 89 overall) and no real effect. Then B > A still happens by chance in roughly 20–30 % of
    70-pair runs, against about 15–20 % at 42 pairs.
  - That is conservative by design, and I do not recommend loosening it. State it in the registration so a
    single-draw FAIL is read as what it is.
- **Is 4 ids × 5 reps enough?**
  - For the gain clause it is more than enough: about +18 expected against a +8 bar.
  - The bottleneck is items, not reps: 2 items carry the effect, and their windows repeat across the hours (I5).
  - Extra reps buy precision on those same items, and more chances for clause 1 to fail. They buy no
    generalisation.
- **Loopholes a reviewer would name.**
  1. "No new wrong" is declared for a design whose new failure shapes are absent from the material (I3).
  2. Latency and thinking medians pooled with D-cases dilute the shipped shape (I4).
  3. Graders who know the bar (m13).
  4. A pooled gain carried by one item, on a model whose baseline differs from the shipped app (I5).
  - None of these can be fixed by more calls. All are fixed by the edits above.
- **Parity precondition.** Meaningful only as the restated m12. As worded, the byte check cannot fail.

## 5. Scope

- **Missing states (rule 9).**
  - The chip, typed, manual and answer-now paths, and suggest mode (I1).
  - Two questions in one turn, and a supersede of a different question (I2).
  - A quick distinct follow-up within 60 s (C1).
  - An aborted or stalled parent versus the label (m8).
  - A parent over 450 chars (m7).
  - A parent present only as a fragment (m13).
  - The flag-off ledger (m13).
  - The R21 supersede (m9).
  - The hedge's back leg, which gets the same bytes, unmeasured (I5).
- **Speculative.** `LEDGER_DEPTH = 3` justified by v2 (m10); and the dedup rule (C1), which solves nothing that
  ChipDeduper does not already drop. Everything else traces to the problem.
- **Not in scope, correctly:** answers, callbacks, the dispatcher fixes, answer-dependent follow-ups.

## 6. The five open questions

1. **Record at dispatch or at completion?** Agree: not at completion.
   - Completion loses aborted streams (IntelligenceEngine.ts:464-468) and fallback phrases ("I'm not sure",
     SessionTracker.ts:255-258).
   - But record where every answering path passes and after the block is built (I1's fix: inside
     `runWhatShouldISay` for `settled`, turn id via options).
   - Supersede replaces by turn id. No `sameAnchor` dedup (C1).
   - This is "at dispatch" in substance and removes the text-identity problem (m6).
2. **5 reps or 3; s50k now or as the re-run?**
   - 5 reps are fine within the quota, but they do not fix the real weakness (2 items). Spend the difference on
     the 3.1-lite LOW back leg for the 4 items (I5) rather than on reps beyond 5.
   - Keep s50k as the allowed re-run: its windows mostly repeat s50m and s50l, so adding it now adds little.
   - Put the clause 1 false-FAIL odds (§4 above) in front of the user.
3. **New label or design 2's?** The new one. It is the only lever on S2Q05F's re-answer, even though that
   evidence is one draw (Thu Yoo→ooo, reversed Sat). Use "asked earlier" instead of "asked and answered" (m8).
   The recommendation is sound; the replay is what measures the label.
4. **Callbacks: v1 or v2?** v2, agreed. There is no roster example and the only data is descriptive, and a term
   search is the selection shape that failed. Do not keep depth 3 for v2's sake (m10).
5. **Flight after PASS; holdout40 with the flag ON or OFF?**
   - Agree: a scenario50 S1+S2 flight with the flag ON first, with holdout40 OFF until that flight passes.
   - Before default-ON, add the quick-follow-up smoke (I3), because neither roster exercises the regime where the
     new failure shapes live.
   - The flight must state the cue-mode state (m13).

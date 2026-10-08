# Revision 2 of the small-cues spec + plan (controller → Fable, 2026-09-30 ~10:35)

Three inputs since revision 1. Read each in full:
- `SP\cue-group\spike6-result.md`: spike 6 decided by the pre-registered rule.
- `SP\cue-group\spec-rereview.md`: Opus's scoped re-review of revision 1. **READY**: 0 Critical, 0 Important, 8 Minor
  (N1-N8) plus nits.
- `SP\cue-group\merge-review.md`, findings 1 and 2: now FIXED in code. The fix was committed before Task 1:
  - `1901ab6`: new `electron/llm/WhatToAnswerLLM.hedgeCues.test.ts`, and a third case in
    `electron/IntelligenceEngine.cues.test.ts`, which is now 81 lines.
  - `721c6fa`: in `flight.mjs` / `flight.test.ts`, the three no-cue twins are re-pointed to 3.5-lite HIGH as
    `captured-no-cues-high`, `-r2` and `-r3`, captured-high's same-bytes partner.
  - An Opus task review of that fix is running; if it changes anything, I will tell you.

Below are my RULINGS (binding). Revise both files, then reply briefly: what changed, and anything you could not do.

**Do not change the code or test text of Task 1 or Task 2.** Both are being dispatched now, from revision 1. Only the
status of Task 1's swap note changes (item 1).

## Rulings

1. **Spike 6: the winner is `one-first`, so there is NO swap.**
   - §3.1 records the result. On 3.5-lite HIGH, one-line-answer was 15 of 24, against 11 for strict-ex and 10 for
     cap3-min. The primary measure decided it; no arm was disqualified.
   - The plan's swap note becomes "resolved: the winner is the working wording", kept for the record. The 4th build
     marker stays `A one-part question gets exactly one line. Add a line only`.
   - §9.5 gets the empty-block counts:
     - one-first: 0 of 36 on 3.5-lite HIGH, and 0 of 72 over both models;
     - every arm: 1 of 216 (cap3-min, 3.1-lite);
     - the point estimate is 0;
     - the 95% one-sided upper bounds per answer are 8.0% (3.5-lite alone), 4.1% (both models) and 2.7% (every arm on
       3.5-lite, 0 of 108).
   - Over **22** answers (N1: the check counts the whole log), the chance of at least one absent block is therefore up
     to 84%, 60% and 46% at those bounds. The spike cannot rule an absent block out, and the rule stated before arming
     (an absent block fails) stands.
   - §9 also gets two lines:
     - One-line answers come from 3.5-lite HIGH. 3.1-lite LOW gave 0-3 of 24 under every wording, so the one-line
       behaviour holds only on hedge front-leg wins.
     - A real LaTeX cue appeared in the spike: `$O(\log n)$` on X5, 3.1-lite. So the cleanup has one live case on
       record.
2. **Merge-fix (above).**
   - Refresh the plan against HEAD `721c6fa`, especially spec §8's "64 lines" and Task 3's anchors (N4).
   - §9.7: the twins are re-pointed in code. Friday's pre-registration must still carry the method of merge-review
     finding 1(b):
     - compare each in-app item against the twin of the leg that won it;
     - read 3.1-lite wins against captured-low and never pool them;
     - carry the per-model quota budget and the ledger check;
     - the `first token` diag line now fires after the cue block, so it is not comparable with h40c's latency.
3. **N1: ruling (a). The controller makes `SP\check-smoke-cues.mjs` v3.**
   - The count becomes: cue lines = full lines + `_what_to_say stream aborted by new generation` lines. A delivered
     answer still needs its cues line.
   - It is calibrated with a superseded case (CLEAN) and an unmatched extra cues line (NOT CLEAN), beside the existing
     cases.
   - Trimmed lines are printed in full, with no 160-character cut.
   - §3.5.2: PASS = `CHECK EXIT 0` from v3. Correct the parenthetical: the 05:00 check saw 22 answers because it counts
     the whole log, including 2 answers dispatched before the timeline started. There were 0 supersedes.
4. **N2: adopt.** In Task 5 Step 6 and §9.8, the live typed check comes after the re-smoke's check has finished. It
   runs on a merged build the user starts from their own terminal, never from a Claude session (shadow AppData). The
   user types two questions: one with the Context toggle ON (the knowledge branch, `ipcHandlers.ts:557`) and one with
   it OFF (`:544`).
5. **N3: FIX `interview60.chains.mjs`**, do not merely document it.
   - Add `stripCueBlock` as the innermost filter, exactly as `interview60.answers.mjs:188` does: one import, one wrap.
   - Make it a new plan task: a Sonnet task, executed after Task 4 and before Task 5's build. Check for an existing
     test pattern for chains.mjs. If there is one, the task writes a failing test first. If there is none, it adds the
     smallest test that fails without the wrap (e.g. an exported filter composition), or says why a test is not
     possible.
   - Take `chains.mjs` off the do-not-touch list. In §3.6 / §9, say why:
     - on a cue build, the raw block would enter each stored answer, the anchor-hit proxy, and the
       `ASSISTANT (PREVIOUS SUGGESTION)` history, which the app never builds;
     - Friday's hour is the first cue hour through chains.
6. **N4: adopt.**
   - Anchor Task 3 Step 1 on the first case's title and its lines, and on "the describe's final `});`", at `721c6fa`.
   - Add `electron/llm/WhatToAnswerLLM.hedgeCues.test.ts` to Task 3 Steps 4 and 8.
7. **N5: adopt.** Add the two cases, each asserting its own trimmed line and that it is logged before the cues line:
   - dropped only: the real S1Q09 shape, 8 lines each of at most 5 words, `cut: []`;
   - cut only: one 7-word line, `dropped: []`.
8. **N6: the controller fixes the tools.**
   - The launcher comment now names the hedge default.
   - The gate probes BOTH lites (`wait-for-gemini.mjs --models`).
   - v3 prints trimmed lines in full.
   - Task 5 Step 3 and §3.5.2 / §9.2 say that the result note:
     - records the split of `verbal hedge: won by <model>` lines;
     - quotes each `[Answer] cues trimmed:` line from the run folder's `natively_debug.log`.
9. **N7: adopt.**
   - The wording becomes: "after that merge, MAIN's tip is an ancestor of the cue branch; nothing may land on MAIN
     between the merge and the fast-forward".
   - Add the rule: if MAIN carries anything beyond docs since `0ef42a0`, that merge first gets a review, the full suites
     and both tsc gates, and a stated answer on whether a re-smoke is needed, before the fast-forward.
10. **N8: adopt both guards.**
    - Task 4's pin gets `expect(src).not.toMatch(/CUE_RULE|CUES_SENTINEL|__CUES__/)`.
    - Task 5 Step 1 gets a negative marker: `dist-electron\electron\ipcHandlers.js` must NOT contain
      `VERBAL_WHAT_TO_ANSWER_PROMPT` (expected `False`).
11. **Nits: adopt all.**
    - The tsc lines become 3435/3438.
    - The Global Constraints mention Step 4(b)'s comment line.
    - The comment reads "trimCues caps; the engine logs".
    - Count INDEX's committed rows at `721c6fa`.
    - Times: SPIKE6-RULE's addendum was written at **09:21** (mtime 09:21:40), and PREREGISTER-cuebench's amendment at
      **09:28** (mtime 09:28:16). The controller makes the times-only corrections in both files now; cite those times.
12. **Order of work** (write it into the plan's execution notes):
    - Tasks 1 and 2 run now.
    - Task 3 needs revision 2 (N4, N5).
    - Task 4 needs revision 2 (N8).
    - The chains task follows.
    - No tests, builds or type checks 13:25-14:50.
    - Task 5 (the build, then the re-smoke) must be armed with a start before 18:30.

Same rules as before:
- Write only the two files.
- No git writes.
- Never read `.env` or keys.
- No subagents.
- No `node -e`.

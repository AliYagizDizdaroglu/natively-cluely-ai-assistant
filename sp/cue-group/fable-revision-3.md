# Revision 3 of the small-cues spec + plan (controller → Fable, 2026-09-30 11:18)

The Opus check of revision 2 is in `SP\cue-group\spec-recheck2.md`: **READY**, 0 Critical, 0 Important, 5 Minor
(R1-R5) plus nits. Read it in full. My RULINGS are below (binding). Revise both files, then reply briefly.

**Do not change the code or test text of Tasks 1-4.** Tasks 1 and 2 are committed, and Tasks 3 and 4 are dispatched
from revision 2's text. In Task 5, change only what nit e names. HEAD is `b649011` now:
- `4c07ae9`: Task 1.
- `949ebc2`: the merge-fix review round.
- `38da4ac`: Task 2.
- `b649011`: spike 6's pass records, `passes/PREREGISTER-spike6.md` + `passes/2026-09-30-spike6-result.md`.

## Rulings

1. **R1: option (a), made exact. No exemption in the check.**
   - A failed answer with NO cues line, or with a NON-EMPTY block, is not a cue failure. This is v3 as calibrated.
   - A failed answer whose stream ended without text logs `[Answer] cues: []`. That line fails the check
     (`malformed: []`) and the metrics row (`present === n`), exactly like an absent block.
   - The check prints a hint when a `[]` line is directly followed by a failed full line. The hint does not change the
     verdict.
   - The consequence, stated before arming. If the check is NOT CLEAN and the ONLY causes are pipeline events, the run
     is a pipeline event, not a cue failure. The pipeline events are:
     - a `[]` beside a failed answer;
     - a coding route's full line with no cues line;
     - a superseded stream with no block;
     - a count the failed or superseded answers explain.
   - In that case the result note names each one, and the re-smoke is **re-run once**. It is never re-worded into a
     pass. A second such run goes back to the spec.
   - Any malformed non-empty block, or an absent block beside a real answer, is a cue failure: the fix goes back
     through the plan's tasks.
   - The controller adds the calibration case `[cues(['a']), FULL, cues([]), FAIL_REPEAT]` → exit 1.
   - Write this into §3.5.2, §9.2 (one sentence naming the other shapes) and Task 6 Step 3.
2. **R2: adopt, exactly as the finding's Fix lists it** (Task 6 Step 6, §3.5.6, §9.8):
   - **Where:** the WORKTREE's build, started by the user with `npm start` in the worktree, MAIN's app closed first.
   - **Preconditions:** a Gemini model selected, no screenshot, a plain technical question, and a résumé loaded for the
     Context-ON question.
   - **Proof each branch ran:** the session's log lines. `[IPC] gemini-chat-stream intent: …, model=gemini-…` for
     both questions, and `[KnowledgeOrchestrator] Intent classified:` for the ON one.
   - **Consequence:** a `__CUES__` or a `1|` line in either bubble stops Thursday's merge and goes back to Task 4.
   - The readings go into the result note, in a second commit if the note is already committed.
3. **R3: adopt.**
   - Before the task is registered, the controller commits `passes/PREREGISTER-cuesmoke.md` on the cue branch. It
     holds §3.5.2's PASS verbatim with ruling 1's wording, what the note records, and the HEAD and the dist mtime that
     fly.
   - Step 3 also writes the 05:00 run's record (`2026-09-30T02-38-22-cuesmoke`), so the delta has its "before".
   - Step 7 copies every `*-cuesmoke` run folder that has a record, failed ones included, before `--index`.
   - Put all three into Task 6 (Steps 3 and 7) and §3.5.5.
4. **R4: adopt.**
   - The bench's fallback: bench not run today → no Thursday merge → the bench on the next free quota day → then the
     merge → then the validation hour.
   - The controller amends `SP\PREREGISTER-cuebench.md` before any bench call.
   - **Order today:** re-smoke → the quota-ledger check → the BENCH (the gate) → the probe. The probe (reported, not
     gating) runs before the bench only if the ledger shows at least 202 requests of headroom on 3.5-lite (150 plus
     its own 52).
   - Rewrite Task 6 Steps 4-5 and §3.5.3-§3.5.4 accordingly. The step numbers may stay; state the order.
5. **R5: adopt.**
   - §9.11 and the plan's known limits say: Task 5's wrap is proven by the pin and a parse, and it first EXECUTES in
     MAIN.
   - Task 6 Step 7 gains, after MAIN's rebuild: one chains run with `interview60.chains.json` moved aside (25 calls on
     3.1-lite, if Thursday's quota-ledger check allows), reading the stored answers for no `__CUES__`.
   - If Thursday's quota does not allow it, Friday's post-flight read checks the chains `EXIT 0` line and the section.
6. **Nits.**
   - **a:** done another way. Task 4's dispatch carries it (`.superpowers/sdd/…/task-4-additions.md`, F3), together
     with Task 1's review minors: a position pin, and the citations now pointing at `passes/PREREGISTER-spike6.md`.
     Mention in the plan's execution notes that Task 4 carries these additions.
   - **b:** say "one comment (two lines)" wherever plan or spec says "one comment line" for `ipcHandlers.ts` and
     `chains.mjs`.
   - **c:** the controller fixes its own files (the probe says Task 6 Step 4; the probe prints the dropped / cut /
     cleaned split).
   - **d:** refresh the stale references the finding lists (HEAD, the hedgeCues lines, Task 4's `prompts.ts` numbers
     2384 / 2428 and `CUE_RULE` at 228, `wait-for-gemini.mjs` rollover line).
   - **e:** in Task 5's text, "exactly as WhatToAnswerLLM composes it" becomes "innermost, as WhatToAnswerLLM places
     it". This applies to the code comment, the test's doc comment and test title, and the Interfaces line. The
     composition string and the pin's assertions do not change.
   - **f:** Task 6 Step 3 confirms the run folder named on the check's first line is this afternoon's, not the 05:00
     one.
   - **g:** Task 6 Step 7 names the review the user asked for before the merge. The SDD final whole-branch Opus review
     of `279103b..tip` is that review, and it stands beside the two gates.
   - **h:** times. The controller corrects its notes: the corrections were written at 10:33, not 10:36.

Same rules:
- Write only the two files.
- No git writes.
- Never read `.env` or keys.
- No subagents.
- No `node -e`.

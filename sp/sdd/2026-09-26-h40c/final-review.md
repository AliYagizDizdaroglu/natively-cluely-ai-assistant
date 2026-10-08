NOT READY

# Final whole-change review: 07a0e5e..e94305a (MAIN, fix/coding-style-suffix-all-gemini)

The code itself is sound. I found no Critical and no Important defect in the six commits. With both flags unset, every production path is unchanged. The only differences are one internal field that nothing reads (Minor 5) and two new log lines that no harness regex matches.

The batch is NOT READY for one reason. The user asked to "probe, test and verify changes we did recently landed as intended", and the hedge has not yet been exercised live (Important 1). Everything verified so far is unit tests, dist markers and offline replays.

Line numbers refer to e94305a. MAIN's working tree is byte-identical to e94305a for all 13 files involved (checked with cmp).

## Critical

None.

## Important

### I1. The hedge and its startup refusal have never run in the real app

**Where:** electron/LLMHelper.ts:3395-3398 and 3470-3541; electron/main.ts:3442-3448 and 2432-2440.

**What is missing.** No live exercise has crossed the seams the tests can only mock:
- NATIVELY_VERBAL_HEDGE reaching the Electron main process (launcher → run.mjs → app);
- two real @google/genai 1.44 requests racing;
- the loser aborted through its own stop signal while its request is still before response headers, or inside its first chunk (the vitest fake rejects on abort by construction);
- the `(hedge)` label arriving at main.ts's `[Main] answer source:` line;
- `app.exit(1)` refusing a junk value in a real Electron start. The first placement of this check produced a windowless zombie that held the single-instance lock (re-review N1). The fix was found by reading and has never been observed live.

**Evidence it has not run:**
- no `smoke-hedge-*.log` exists under interview60.runs;
- progress.md has Task 7 in fix round 2 after the RESUMED entry;
- check-smoke-hedge.mjs was modified at 22:04, after this review was dispatched;
- plan Task 9 lists "the smoke's three checks" as an input to the report.

**Failure scenario.** Suppose h40c is registered, or the hedge is reported as verified, on unit evidence alone. If the real SDK does not abort a loser as the fakes do, every raced answer keeps both lite requests open. That doubles lite usage on the day the paired arms spend about 245 requests on 3.5-lite and about 270 on 3.1-lite. Separately, if the label never reaches `[Main] answer source:`, h40c-hedge-stats cannot attribute winners.

This is exactly the "a new flag, a new path … still earns one live exercise before anything depends on it" case in the user's rule 7.

**Fix:**
1. Run the Task 7 smoke: the forced, default, off and refuse segments, with check-smoke-hedge per segment.
2. Report the hedge as verified only after it passes.
3. Do not register Natively-flight-h40c before it passes.

## Minor

### M1. The hedge's "empty leg" branches have no test

**Where:** LLMHelper.ts:3486 (the `empty` mapping), 3516 (`reason=front-empty`) and 3530 (`both empty → return`).

**What I measured.** I ran two mutations on a scratch copy of e94305a:
- `return; // both empty` → `throw`;
- an empty front no longer races the back.

Both survive all 16 LLMHelper.verbalHedge tests and all 15 answeringModel tests (31/31 pass). None of the tests uses a zero-chunk step.

**Failure scenario.** A later edit could make a both-empty hedge throw. The result would be a redirect of up to 4 more requests and a "[No answer — …]" bubble, where today the answer simply ends empty. A later edit could also stop racing the back after a safety-blocked, empty 3.5-lite front. Then "Could you repeat that?" is shown for a question 3.1-lite would have answered. The suite stays green in both cases. The code is correct as it stands; this gap only affects regression protection.

**Fix:** add two cases using a `[]` step:
- front `[]`, back tokens: the back wins, the log shows `reason=front-empty` and `other=empty`;
- both `[]`: drain resolves `[]` without throwing, and the warn line reads `no answer - front empty, back empty`.

### M2. The M5 environment-hygiene fix is incomplete

**What I measured.** I exported NATIVELY_VERBAL_HEDGE=1 and ran the 16 verbal-path test files that M5 did not touch. Five tests in two files fail:
- electron/LLMHelper.geminiThinking.test.ts:60, 76 and 88;
- electron/LLMHelper.verbalPrimary.test.ts:66 and 107.

Result: 5 failed out of 68. These are exactly the "flight or smoke shell" failures M5 was meant to remove.

**Fix:** add the same save / delete-in-beforeEach / restore-in-afterEach to those two files.

### M3. INDEX.md's h40b row will change at the next pass-record write

**Where:** interview60.pass-record.mjs:238-252. `writePassIndex` re-derives every row through `collectPass`, using the current pairAnswers and computeRun.

**What I measured.** I compared `passRow(collectPass(dir))` under the 07a0e5e modules and the e94305a modules over 27 run folders:
- only h40b's row changes: `delivered 43 -> 44`;
- only h40b's own record would render differently.

**When it will happen.** The h40c flight's own step 5 (flight.mjs:330) rewrites INDEX.md, and so does every `judge --verdicts` merge. The h40c commit that carries INDEX.md will therefore also change a committed h40b number.

**Why it matters.** e311019's message says "Committed pass records are not regenerated". That is true for passes/<run>.md but not for INDEX.md.

**If anyone re-runs pass-record or a judge merge on h40b itself:**
- its "Answered hands-free" and "Surfaced detections" rows flip from FAIL to PASS;
- R07F appears as dispatched but "not graded";
- a merge writes R07F as `verdict: 'error', reason: 'no verdict'` (judge.mjs:215).

**Fix:** name this change in the h40c commit that carries INDEX.md (rule 9: say what rides along), or in the h40c result note. Never re-merge h40b.

### M4. NATIVELY_FOLLOWUP_PARENT has no startup validation

**Where:** followUpParent.ts:33, called from IntelligenceEngine.ts:333. The hedge gets its startup check at main.ts:3442; the follow-up flag gets none.

**Failure scenario.** A junk value throws on every hands-free answer, mid-interview:
- the bubble shows "❌ Error (what_to_say): NATIVELY_FOLLOWUP_PARENT=… is not 1, 0 or unset";
- runWhatShouldISay returns the "Could you repeat that?" text;
- chip-click answers keep working, because the contextOverride path never calls withParentExchange.

The h40c guard catches it for the flight, because `followUpParentEnabled()` throws inside the guard. The failure only affects ordinary sessions.

**Fix (optional):** validate this flag in the same startup block, and log `[Main] follow-up parent: on|off`.

### M5. With the follow-up flag off, stored state is not byte-identical

**Where:** IntelligenceEngine.ts:452 → SessionTracker.ts:287.

**What changed.** `assistantResponseHistory[].questionContext` now stores the pinned `settled` question, where it used to store `getLastInterviewerTurn()`. This happens with the flag unset too.

**Why it is harmless today.** The only reader is the flag-gated withParentExchange (checked across electron/**/*.ts). TemporalContextBuilder reads only `.text` and `.timestamp`, classifyIntent reads only the history length, and no persistence or IPC path touches the field. Prompts and logs are unchanged.

6c50ec3's message claims only that the prompt is unchanged, which is accurate.

**Note for later:** if the follow-up work is dropped after its FAIL, revert this with the 6c50ec3 wiring. Any future reader of `questionContext` gets the pinned question, not the last STT final.

### M6. Under the hedge, the pass record misnames the in-app model and records no flag

**Where:** interview60.pass-record.mjs:78 and 171. `answerModel` is taken from "Default Model set to", so h40c's permanent record will read "gemini-3.1-flash-lite (in-app)". Most answers will be written by 3.5-lite, and nothing in the record says NATIVELY_VERBAL_HEDGE was on.

The h40c pre-registration draft (lines about 104-105) tells readers not to use this field. The per-pass record, however, is never hand-edited.

**Fix (optional, before the freeze commit):** add the `[Main] verbal hedge:` startup line and the won-by split to the record's meta.

### M7. The blind-builder fix exists only in the session scratchpad

**What exists.** `SP\flash-h40b-blind-pairs.mjs` carries the parent, proven 6/6 with blind-parent-check.

**What is still broken.** Its sibling builders still write `question: e.q` (0 hits for questionForGrader or "Follow-up to"):
- `flash-h40a-blind-pairs.mjs`
- `gemma-blind-pairs.mjs`
- `gemma-h40a-blind-pairs.mjs`
- `pass20-blind.mjs`

The repo has no blind builder at all, and the scratchpad is session-specific.

**Impact.** None on h40c, which runs no sidecar (pre-registration line 199). A future sidecar copied from one of the siblings would bring back the defect h40b's result note described.

**Fix:** commit one blind builder that uses `questionForGrader`, plus blind-parent-check, into electron/test/golden. Or at least record the requirement in README.md.

### M8. The replay's evidence is not in the repo

The 60 graded answers, the key files and the graders' reasons exist only in `SP\followup-replay\`. The committed note has per-item letters.

The user's pass-record rule asks for the questions, answers and grade comments of every pass. Once the scratchpad is cleaned, the one wrong answer that decided "FAIL by rule step 1" (S2Q07F, B rep 2) cannot be re-read.

**Fix:** commit the answers, verdicts and key files, or a rendered record, beside the result note.

### M9. Commit and document inaccuracies (the decision is unaffected)

**(a) The encoding damage is understated.** 18242df says the pre-registration's "three em dashes were mis-encoded". PREREGISTER-followup-replay.md actually holds 14 mis-encoded sequences:

| character | count |
|---|---|
| — | 3 |
| → | 5 |
| ≥ | 3 |
| ≤ | 1 |
| − | 2 |

The damaged characters include the rule's own operators, e.g. "acceptable(B) âˆ' acceptable(A) â‰¥ +5 â†' PASS". The rule can still be read, but the "verbatim from the h40c plan" claim is not true byte for byte.

**(b) The pre-registration was committed together with its result.** 51e349d landed at 19:05, after the 18:46 result. The only evidence that it preceded the run is the implementer-reported mtime of 18:28:12. h40b's pre-registration, by contrast, was committed before the hour.

**(c) A mislabelled count.** The decide line "n = 60 (item, rep) pairs graded" is really 60 answers, which is 30 pairs.

**(d) An overstated refusal.** da28f25 says a bad NATIVELY_VERBAL_HEDGE_TRIGGER_MS refuses to start. It does so only when the hedge is on, which is by design (verbalHedge.ts:53-57).

**(e) A scratchpad path cited as authoritative.** The committed pre-registration cites `SP\followup-replay-build.mjs` output as authoritative.

### M10. Known and parked residuals

These are restated so the report's residual-risk list is complete.

**Superseded answers (parked M2).** A superseded answer that has no token yet keeps both legs running until a first token. The back leg is still started at 5 s after the answer was superseded; today's race starts its fallback the same way, at 10 s.

**Both legs fail (parked M6).** The redirect re-runs the same pair, up to 4 requests. Two side effects:
- the interim `(fallback)` label names pickFallback's guess;
- the comment at WhatToAnswerLLM.ts:386-387 ("paired the way the stall race pairs them") no longer holds under the flag.

**Labels.**
- The head label says 3.1-lite until the winner's first words.
- The capture `model` field says 3.1-lite (LLMHelper.ts:2728, parked M7).

**No stall deadline after a front failure.** After the front fails before its first token, the back runs with no stall deadline. Today, a 503 redirect still gets a 10 s stall race: 3.5-lite as primary, 3.1-lite after the stall. So a 503 followed by a 3.1-lite stall (five such stalls on h40b, 13.6-29.9 s) is waited out in full.

The code matches the probed policy (hedge-live.policy.mjs:45), and the h40c pre-registration names the missing deadline (about line 273).

## What I verified

**Read.** The full diff, the three pass documents, and the plan, progress and Task 4 review for context.

**Flag-off paths traced:**

| file | flag-off behaviour |
|---|---|
| LLMHelper.ts:3395 | falls through to the unchanged race |
| WhatToAnswerLLM.ts:111-117 | HEDGE_WINNER cannot match; `(fallback)` announce strings are identical |
| IntelligenceEngine.ts:333-340 | same array, same prompt, no log |
| SessionTracker.ts:287 | M5 |
| main.ts | adds one `[Main] verbal hedge: off` line per session and one `[Main] answer source:` line per sentinel (1-3 sync appends per answer); no regex in judge, metrics, prompts, run or pass-record matches either |

**Hedge-on paths traced:**
- `leg.first`, `Promise.race` and the winner promise can never reject;
- the timer is cleared on both race outcomes;
- a loser that is still pending is aborted, and so is one that also produced a token (the M1 fix);
- a loser that already failed or ended empty is left alone;
- both legs failing throws the front's error;
- deliver closes the winner's parked generator on an early close;
- no AbortSignal.any appears in code, only in comments;
- labels are correct in every branch listed in task-4-review.

**Tests against MAIN:**
- 9 app test files: 82/82 pass;
- judge, metrics and flight tests: 75/75 pass.

**Full suite on an exact e94305a extraction (all NATIVELY_* cleared):** 777 passed, 6 skipped. The only two failing files, interviewerTurn.replay.test.ts and interview60.prompts.test.ts, fail at import, from a missing fixture file and missing dist-electron in the scratch tree. This is the known artifact pair.

**tsc (read-only):** root 0 errors; electron exactly the 6 pre-existing errors.

**Mutations: 20 on a scratch copy, 17 caught.** Survivors: both-empty-throws, front-empty-no-back (M1), and no-clearTimeout (harmless). Caught:
- M1-revert;
- throw-back-first;
- deliver-no-close;
- hedge-any-primary;
- trigger-back-only;
- label-as-fallback;
- no-hedge-branch;
- session-ignores-question;
- engine-drops-settled;
- engine-no-restore;
- parent-no-dup-check;
- parent-always-on;
- judge and metrics paraphrase-guard removal and question removal (4 mutations);
- startup-reads-trigger-when-off.

**Instrument before/after over 27 run folders,** comparing the whole computeRun output and every judge pair under the 07a0e5e and e94305a modules. Only h40b changes, and only in R07F-derived fields: answered and delivered 43 → 44, to-nobody 1 → 0, pair 8 `?` → R07F with "[Follow-up to: …]". This check is wider than the implementer's key list: it includes detectMs, every gate row and every aggregate.

**Dist.** dist-electron, built at 18:53, carries:
- the M1-fixed loser abort;
- describeVerbalHedgeAtStartup;
- `answer source:`;
- the C1 `questionContext?.trim()`.

No electron .ts file changed after 18:49.

**R09 fix.** bb94db4 is an ancestor of e94305a, and IntentClassifier and knowledge/ are untouched since.

**e94305a.** No harness path schedules or expects a Groq arm:
- ANSWER_MODELS, FOCUSED_MODELS and PAIRED_ARMS contain no `/`;
- the chains pass uses 3.1-lite;
- pass-record discovers arms from the files present, and its test's Groq ids read s50a's historical folder;
- the app's own gpt-oss-20b detector is untouched.

**Replay result note.** The per-item table reproduces the decide output: A 16/14/0 and B 22/7/1 (acceptable/weak/wrong), a gain of +6. Step 1 (1 wrong > 0 wrong) gives FAIL.

**Not verified:** the live app. Per the brief I did not start it; see I1.

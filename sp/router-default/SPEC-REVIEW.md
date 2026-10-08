# SPEC-REVIEW: router-default SPEC.md rev 3

- Reviewer: fresh Opus subagent, read-only, no model calls. Written 2026-10-06 ~19:50 TST (`date` read 19:36 at start).
- Checked against MAIN (`fix/coding-style-suffix-all-gemini`): GeminiLiveRouter.ts, main.ts 2088-2200 and 2419-2445,
  interviewerTurn.ts, WhatToAnswerLLM.ts 390-432, IntelligenceEngine.ts 450-516, interview60.run.mjs 424-582,
  src/components/NativelyInterface.tsx 826-925, src/lib/answerMessages.ts; router40 run-r.mjs, r40-common.mjs.

## Verdict: APPROVE WITH CHANGES; the hour cannot fly tonight

The spec records the approved decisions faithfully, with no unapproved scope apart from a few interpretations (F5, F7).
But the clock says 19:36, not ~08:00. Nothing is built, so by the spec's own §7.4/§11 rule the hour moves to tomorrow
night. Fix B1 to B3 and the IMPORTANT items before the plan is written.

## BLOCKING

**B1. Schedule: tonight is already lost.**
- `date` at the start of this review: Tue Oct 6 19:36 TST. The spec header itself says rev 1 was written at 19:13 and
  rev 2 at 19:28.
- §7.4 and §11 require the whole build reviewed and smoked by ~20:00. That build is a new Live module, a reader, an
  arbiter, renderer work, the failover, three fixes, the live40 roster and wav, the hour reader, the replay, the probe
  and a 15-min smoke. None of it exists.
- Change: move the hour to tomorrow night (2026-10-07), and replace "tonight" with the date in §1, §10 and the title.
- Even from 08:00 this scope would be ~12 h of TDD plus an Opus review per task. That is not realistic in one day.
  See "Scope" below.

**B2. The overlay contract for a second answer source is missing (§4.3; the renderer is not in §1's scope).**
- The renderer has one streaming answer bubble.
  - `applyAnswerToken` appends to the last streaming `what_to_answer` bubble.
  - On `suggested_answer`, the final event, `applyFinalAnswer` overwrites that bubble's `text` with `data.answer`
    (NativelyInterface.tsx ~895, "Ensure final consistency").
- Consequences:
  - If Live tokens stream into the bubble and the pipeline is then appended, the pipeline's final `suggested_answer`
    replaces the Live text with the pipeline text alone. "Live text already shown stays" (§4.3) breaks.
  - A hidden shadow's final `suggested_answer`, its `suggested_answer_source` label (session-global `sm.setSource`) and
    its first-token metrics also all reach the renderer unless main suppresses them.
  - Live itself has no final event, so its bubble never stops `isStreaming`.
- Change: specify the main→renderer event sequence for each of the three cases:
  - Live only;
  - Live + "(full answer)";
  - pipeline only, after a hold.
- That sequence must state which `suggested_answer*` events are suppressed, re-emitted or synthesized, and how the
  "(full answer)" separator is injected (a token, or a new field). Add `answerMessages.ts`/the renderer to the scope and
  to the §9 tests.

**B3. Pipeline display events carry no turn id.**
- `suggested_answer_token(token, question, confidence, replace, cues)` has no `turnId` (IntelligenceEngine.ts:50, 482,
  490).
- The arbiter must hold, release or hide "the pipeline answer's display events for the turn". With no id, it can only
  guess by recency.
- A superseded or still-streaming answer from turn k−1, or a late fallback stream, would be held, hidden or appended
  under turn k. The 20 s gap hides this in live40, but after a PASS it becomes the default app, where it will not hide.
- Change: thread `turnId` through the `suggested_answer*` emits (`runWhatShouldISay` already receives `options.turnId`)
  and key the arbiter on it. Add a test with two overlapping turns.

## IMPORTANT

**I1. A shown answer that is already known to be invalid contradicts "shown only if valid".**
- Display waits for dispatch, which is ≥ Q + 1.2 s. By then a one-token or short router turn has usually already ended.
  Router40's hard outputs were single tokens that ended at once.
- So a turn whose `checkCompleted` already fails at V gets shown and then appended. Examples:
  - `Heart.`, a mistranscribed "hard" that the hard-word rule misses;
  - a 5-word reply;
  - a completed turn carrying a marker.
- Change: if `checkCompleted` has already failed by V, show the pipeline with cues (route `invalid`, shown=pipeline)
  instead of streaming. Show-then-append stays only for failures discovered after V.
- This also closes most of the "garble that isn't a hard word" hole: the §5 Safety text check only knows hard words, so
  a shown `Heart.` is caught only by the grades.

**I2. The first-wins rule and the mid-question pause.**
- With 2 s on time, a router turn that starts in a mid-question pause pairs (the turn is open), completes its first word
  and decides the turn. That is the known premature-fire shape (memory: mid-pause premature fire). The router turn that
  follows the real question end is then logged `dup`.
- If the early turn was `interrupted` when the speaker resumed, it is shown cut and then appended.
- Change, either:
  - a router turn whose `endKind` is `interrupted` before the dispatch is discarded, so the next paired turn may decide;
  - or the deciding turn is the LAST paired turn with a complete first word by Q + 2000, with F ≥ the voice stop that
    preceded it.
- Add a pair of arbiter tests: an interrupted early turn followed by a real turn.
- This [choice] (§4.3 "Duplicates") is the least defensible of the 15.

**I3. The hidden shadow still enters the conversation history.**
- `IntelligenceEngine` calls `session.addAssistantMessage(fullAnswer)` (≈ line 504) for every non-aborted pipeline
  answer, shown or not.
- On shown=live turns, the follow-ups' prior-turn context holds an answer the user never saw, while the Live answer they
  did see is recorded nowhere.
- live40 has 16 follow-ups (QF 9, AF 7). AF items are those that "build on an earlier answer".
- Change: decide and state which text enters the history on shown=live turns. The minimum fix is to record the shown
  Live text; otherwise, record that the history diverges and treat it as a residual risk the AF grades carry.

**I4. The text capture for grading is unnamed.**
- §5 writes both texts to "the run's existing answer capture".
- auto() does not write one: `interview60.answers.json` is "a separate manual pass" (run.mjs ~565). The answers are
  extracted from the logs afterwards.
- Change: name the exact file and line format, with turn id, item mapping and the tag shown / shadow / appended. Name
  the export that feeds the blind graders. Prove in the smoke that a hidden shadow reaches it whole.
- Define what is graded for a Live answer that received a "(full answer)":
  - the Live text alone, for Safety and Quality;
  - the composite;
  - or excluded from Quality.
- Today Safety's "0 wrong Live shown" and the Quality pairing are ambiguous for cut or too-short Live text.

**I5. Ear failover can make the hour unreadable (§4.4, arbiter row 1).**
- `failed` is emitted after 3 failed quick reconnects (GeminiLiveRouter.ts:532-541).
- Once the ear is on 2.5, every later turn is `router-down` (no fail-back). A failover at minute 3 turns the rest of the
  20-minute hour into pipeline only: Routing FAILs, the hour is INCONCLUSIVE, and the one re-fly is spent.
- Change: the registration states what an ear failover does to the hour. For example, turns at ear=2.5 leave the
  Routing and Speed denominators and are reported separately, or a failover voids the hour as not spent.
- Also record two limits of the trigger:
  - It never fires on the known 3.1 silent failure (memory: 3.1 went silent with no close).
  - It never fires on quota closes, which back off and never reach `failed`.
- Reading "Backup ears only listen" as "Live is not shown while the ear is on 2.5" is an interpretation; mark it
  [choice] and confirm it with the user.

**I6. CONTEXT for the router is underspecified (§4.1).**
- "The CONTEXT block the app's answer prompt carries, read at each connect": name the function that produces it.
- If that block includes the rolling transcript or turn-dependent text, the router's system instruction changes at
  every goAway (~every 10 min) and differs from router40's static slice.
- State whether it is the static knowledge/profile context only, and log `context_sha12` (not only `context_chars`) on
  each connect, so the hour reader can show it stayed constant.

**I7. Two concurrent Live sessions on one key: the concurrency limit and the quota.**
- They are only a §14 residual. The smoke runs both, but the precheck only requires the router's connect line.
- Change: the T−6 precheck requires `[Router] session up` AND the ear connected, both at the same time.
- The hour reader counts router quota closes separately, and the registration says how many minutes of router-down
  void the hour.

## MINOR

**M1. The BLOCK_B wording (§4.1).** "BLOCK_B is r40-common.mjs lines 48–51, byte for byte" is wrong: BLOCK_B is the
joined value `[...FRAME_1_3, two lines, ...FRAME_6_7].join('\n')` (r40-common.mjs ~45-51). Say "the joined value whose
sha256 is e11c240…". The sha check makes it safe either way.

**M2. "HARD misrouted" when there is no first word.** For a HARD item with no router turn, `late` or `unpaired`, say
whether it counts as misrouted. The [choice] counts "first word not hard", which is undefined when there is none.
Suggestion: it does not count, and it is reported.

**M3. "Hour" vs ~20 min.** §1 says "one late, unattended, registered hour"; the audio is ~19.6 min. Say "flight" or
"run", so the registration does not inherit a 60-min expectation (probe deadline, gate).

**M4. Q when the turn had no VAD.** On a Live-only or transcript-only turn, `lastSpeechAt` is the final or claim time,
not a voice stop (interviewerTurn.ts:190, 198). Tag those turns in the decision line (`q_src=vad|final`), so the speed
p50 is not mixed silently.

**M5. The marker filter's placement.** "Outermost stage of 398–404" is correct only inside `filtered`, BEFORE
`nameStallSwitch` and `withVerbalFallback` re-insert the model sentinel (lines 410-432). Say that explicitly; otherwise
"outermost" invites wrapping `cutAtWordBudget`'s output, where the sentinel is live.

**M6. The 10 s cap's provenance.** The 7583 ms max is measured from clip end on synthetic audio; Q is a VAD stop, with
up to 3.7 s more before dispatch. The cap is fine; note that a cap on a 71-word answer comes after ~8.8 s of display.

**M7. Supersede after a Live show.** `replace:true` targets the last `what_to_answer` bubble. With a Live bubble plus an
appended pipeline section, say which one is replaced (it falls out of B2).

## The 15 [choice] marks

- **Defensible:**
  - the flag coverage;
  - L20d kept;
  - no resumption;
  - too-short appends (but see I1);
  - the stop at a marker or the 81st word;
  - the 10 s cap;
  - no fail-back;
  - the marker filter not flagged;
  - the 120 s harness cap;
  - the 20 s gap derivation;
  - the answer-ends-before-next-dispatch check;
  - the stricter HARD misrouted (fix M2).
- **Weak:** first-wins duplicates (I2).
- **Unmarked interpretation:** router suppressed at ear=2.5 (I5).

## Scope for tomorrow (if the user wants to cut)

Keep everything approved. If time is short, the cheapest cuts that leave the decision readable:
1. **The ear failover:** behind the flag, orthogonal to the router question, and I5 shows it can only hurt this hour. It
   is approved, so cutting it needs the user's ruling.
2. **The 2-minute standalone live probe (§9.3):** the smoke covers the same seams.
3. **The hour reader's reconnect/close tallies:** grep can stand in for one night.

Do not cut: B2/B3 (the renderer contract and the turn id), the replay, the smoke, or any Opus review.

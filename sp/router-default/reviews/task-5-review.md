# Task 5 review: arbiter, pure core (ebfd8d5 on 7123909, WT-B)

Reviewer: Opus. Read-only, per REVIEWER-RULES.md.

**Verdict: SPEC: FAIL  QUALITY: CHANGES.** No safety hole was found. Two spec deviations and one cross-task keying defect
need fixing. All three are small.

## What I ran
- The task's tests, from a temp cwd: routerArbiter 41/41, routeReader 17/17, unknownMarkerFilter 19/19 (77 passed).
- tsc for the electron config: 6 errors, the same baseline set (GeminiLiveRouter 125, ipcHandlers ×3, KnowledgeOrchestrator ×2). None are in the new files.
- Seven scratch probes (P1–P7), run against the real `routerArbiter.ts` from the scratchpad. Nothing was written into the repo.
- I read Task 2's `LiveRouterSession.ts` (live-router-a), the WT-B `main.ts` turn machine and IntelligenceEngine 455–520, and the Task 7 diff and review.

## Safety hunt (decisive bar): no path shows a garbled, wrong or invalid Live answer
These paths were checked. Each holds.
- **Hard first word.** Row 3 is read on the complete first word, and display starts at the text's start (`routerArbiter.ts:208-209`, `pumpLive`). A first word still arriving (`"Ha"`) is never complete, so the turn cannot reach row 5 on it.
- **Marker, partial marker, >80 words.**
  - `showablePrefix` stops before the first marker token, and while streaming it shows complete tokens only.
  - Row 4 rejects any marker or 81+ words already present at V.
  - The stripper never sees a marker token. P6: an `afterComplete` marker that arrives before dispatch gives row 4, and nothing Live is shown.
- **No display before dispatch.** `tryDecide` returns while `dispatchedAt === null`, and V = max(W, dispatch). This is pinned by a test, and the report's mutant confirms that test fails without the gate.
- **The displayed text comes from the decider only.**
  - `t.decider` is set only when it is null.
  - A router turn that becomes the decider after a row 1–2 decision has phase `idle`, so nothing is shown from it.
  - dup and unpaired turns never reach `pumpLive`.
- **After the Live display ends** (final, append, cap or supersede), phase is `done`, so later text is ignored.
  - P5: `afterComplete` text such as `hard <b> …` arriving after the Live final is never shown.
  - Capped turns ignore every later event.
- **Router-session stop.** Task 2 `stop()` ends the current turn as `closed` (LiveRouterSession.ts:80) before Task 10 removes the listeners. A streaming decider therefore appends with `incomplete-after-show`, and nothing is left streaming that a new session could feed.
- **Cumulative text (concern 4).** Confirmed: LiveRouterSession.ts:160-162 does `c.text += t` and emits the whole text, including on `afterComplete`. So `shownRaw` slicing is sound.

**Residual, not proven:** the arbiter ends the Live answer at `generationComplete`. If transcription text arrived after that point, the shown answer would be truncated with no append. Measured: 0 of 47 router40 replay items had a chunk after `generationCompleteMs`.

## Fallback hunt (every failure caught)
- Every dispatched turn decides by Q+2000 through the deadline timer. Rows 1–4 release everything held, in order. Every failure after V appends the held pipeline, and the cap guarantees the Live display ends.
- Weak spots found are listed below: I-2 (seq reuse, a liveness loss rather than a missed fallback), M-1 (two supersedes), and M-4 (a replacing stream with no tokens).

## Findings

### IMPORTANT

**I-1. A superseded Live stream gets no `live` capture, so shown Live text escapes the Safety grading. (concern 2; SPEC §5)**
- Where: `routerArbiter.ts:363-369` (`onSupersede`). `writeLiveCapture` runs only from `finishLive` and `append`.
- SPEC §5 asks for "one JSON debug-log line per answer text … `live`: the Live text as shown", and says "a shown Live answer is graded **as shown** … for both Safety and Quality".
- P4 confirms it: Live is streamed and then superseded, and the captures are `["shadow"]` only. The line still reads `shown=live route=easy-answer reason=-`.
- Two consequences:
  - Text the user saw is never Safety-graded.
  - The hour reader's check "capture entries per kind against decisions (must match)" fails once per such turn.
- PLAN item 15 ("`live`, at the Live final") did not foresee this. That is why it is a plan gap rather than an implementer error.
- Fix (about 3 lines):
  - In `onSupersede`, when `live.phase === 'streaming'`, call `writeLiveCapture(t)` with the text shown so far, and endMs = the supersede time.
  - Send no Live final and add no history, which the plan already requires.
  - Add a pin: case "supersede during Live" expects capture kinds `['live', 'shadow']`.
- Controller choice, optional: tag the line, for example `reason=superseded`, so that `route=easy-answer` no longer claims a final check that never ran on the shown stream.

**I-2. Router-turn `seq` is unique per session instance, not per arbiter, so after any router-session restart the new turns are swallowed. (concern 4's real risk; Review Focus 5)**
- Where: `routerArbiter.ts:121-125` keys router turns by `seq` alone.
  - Task 2: `private seq = 0` per instance (LiveRouterSession.ts:39).
  - Task 10 constructs the arbiter once (PLAN Step 1) but builds a **new** `LiveRouterSession` on every `startRouterSession()`: on meeting start, and on a mode change from off to on (PLAN 1547-1562).
- P7: meeting 1 used seq 1. In meeting 2, a valid easy router turn with seq 1 updates the old, ended record and never pairs. Results:
  - nothing Live is shown;
  - turn 2's line reads `reason=no-router-turn`, which is false;
  - no dup or unpaired line is written, so the router turn vanishes from every count.
- The display path is safe (see the stop() note above). The feature is silently off for the first N router turns of every later session, and the hour reader is misled.
- The registered run likely uses one meeting (the §7.2 probe and the run share it). That is why this is IMPORTANT rather than BLOCKING. Any meeting restart or Live-mode toggle before or during the run makes it bite.
- Fix, either one:
  - (a) in the arbiter, treat an existing record whose `firstTextAt` differs from `ev.firstTextAt` as a new router turn. `firstTextAt` is fixed per turn in Task 2. Key by `${seq}@${firstTextAt}`, or drop the stale entry.
  - (b) in Task 10, give the arbiter a session id.
- (a) is local and needs no interface change. Pin it with P7's shape.

**I-3. The router is assumed up when `setRouterUp` was never called, but SPEC §4.1 says down until `setupComplete`. (concern 3a)**
- Where: `routerArbiter.ts:66, 465-468`.
- SPEC §4.1: "Router state: `up` from `setupComplete` until the next close, and `down` otherwise."
- Task 2 starts with `up = false` and emits `state` only on a change (LiveRouterSession.ts:31, 95-97). So no `down` event ever reaches the arbiter for:
  - the window before the first setup;
  - a router that never connects (no key, or `session refused` on a sha or model mismatch).
- P2: in those windows, every dispatched turn waits until Q+2000 (2 s added to the pipeline answer), and the line says `router=up reason=no-router-turn` instead of `router=down reason=router-down` (row 1, immediate).
- The code comment's rationale ("falls to row 2 anyway") holds for safety, but costs 2 s per turn and gives a wrong `router=` field.
- Fix: default to `false`. The tests already call `setRouterUp(true, 0)` in `boot()`, and flag-off is unaffected.

### MINOR

**M-1. The stale-end drop is a boolean, not a count. (concern 1)**
- Where: `routerArbiter.ts:355, 373-378`.
- The narrowing itself is right and necessary. The plan's literal rule would drop the replacing stream's own abort whenever the old stream had already ended, and the line would never be written. The controller addition is also correct: a second end after `pipeEnded` is ignored, and `pipeEndKind`/`pipeEndAt` keep their values. Both are pinned by tests (test lines 504-526), including the realistic Task 7 order (new `completed`, then old `aborted`).
- The gap: two supersedes before any end (P1). Old stream 0's abort is dropped. Stream 1's real abort then counts as the replacing stream's end, so:
  - the line and the shadow capture are written early;
  - the shadow text is truncated (`"S2 "`);
  - stream 2's own `completed` is ignored.
- This is rare and measurement-only.
- Fix: count stale ends (`staleEnds += t.pipeEnded ? 0 : 1`), or use Task 7's `generationId`, which the end event already carries.

**M-2. A supersede while the decision is pending, followed by an append, sends a token with both `append: true` and `replace: true`.**
- P3 shows `token:New |pipeline|app|rep`.
- Under SPEC §4.5, the renderer could take `replace` as "rewrite the first bubble of this turnId", which is the Live bubble. That turns the append into a replace and loses the "(full answer)" bubble.
- Nothing of the pipeline was shown before the append, so the flag means nothing here. Clear `replace` on appended tokens, or have Task 8 give `append` precedence and pin it. It is rare, because a supersede needs a second gate inside the short pending window.

**M-3. `live_words`, and dup/unpaired `route`, are read from text that grew after the end.**
- P5: shown 10 words, line `live_words=17`.
- `afterComplete` events overwrite `r.text` after the Live final.
- Freeze the decider's text when the display ends, or ignore `afterComplete` text for the line.

**M-4. Two narrower cases.**
- A replacing stream with no tokens (the engine's fallback final only, `replace: true` on the final) never triggers `onSupersede`. In Live mode the replacement is held and hidden, and Live continues.
- An empty non-replace token that carries `cues` is dropped together with its cues (`routerArbiter.ts:317`). The engine attaches `pendingCues` to the first token emitted (IntelligenceEngine.ts:478-490).
- Both are rare. Keep empty tokens that carry `cues`.

**M-5. Records for undispatched turns are never evicted. (concern 6)**
- `evict()` removes only records whose line is written. Every closed undispatched turn, and its router turns in `rts`, stays for the process lifetime.
- At hour scale this is a few hundred small objects plus O(n) scans. It is not a leak that matters.
- No main.ts path emits a `turnId`-tagged event without first passing Task 10's `turnDispatched`:
  - turnIds come only from `turnDispatchInput`;
  - the supersede path runs only after `turnDedupId` was set in the answer branch;
  - turn ids are process-unique, because `nextTurnId` is never reset (interviewerTurn.ts:108).
- So "held forever" does not occur in practice.
- Optional: also evict closed records with `dispatchedAt === null`.

## Concerns answered
1. **The stale-end narrowing.** Correct, and safer than the plan's literal text. The double-supersede gap is M-1.
2. **Supersede during Live.** The concern is real and is I-1. Keeping `shown=live` on the line is consistent with "the router turn is not re-read", but the `live` capture must be written.
3. **Defaults.**
   - Router up: wrong per SPEC §4.1, I-3.
   - Ear 3.1: right. An ear that starts on 2.5 is covered by Task 10's `onEarModel` → `setEar('2.5')` at start (PLAN 1470, 1488), provided Task 10 calls it before the first dispatch.
   - `setEar` taking `now()`: fine. Both wiring call sites are synchronous with the event (the failover status handler, PLAN 1599), and `earAt(q)` correctly reports the ear at Q.
4. **Cumulative text.** Confirmed (LiveRouterSession.ts:160-162). The real cross-task risk is `seq` reuse, I-2.
5. **`turnClosed` before `turnDispatched`.**
   - In WT-B `main.ts`, the turn machine dispatches the open turn (`actOnTurn` 'dispatch', 1004-1009) and closes it later ('close', 1037).
   - Task 10 calls `turnClosed` only on 'close', on an identity change, or on `resetTurn`. So dispatch precedes close.
   - A late dispatch of a closed turn falls to row 2, which shows the pipeline. That is safe. No change is needed.
6. **Memory.** Negligible, and no real path holds events forever (M-5).

## Brief coverage (spec compliance)
- Every numbered behaviour 1–22 is implemented.
- Every required test is present, one `it` each. They assert the exact `sent` sequence plus the line fields.
- `routerDiag.ts` matches the plan verbatim. The interface types and `LIVE_LABEL` match PLAN 985-1022 exactly.
- Deviations from the plan text, and my ruling on each:
  - the narrowed stale-end drop: accept;
  - empty tokens dropped: accept, since it is consistent with the M3 test; add the cues exception (M-4);
  - the shown=live line also waits for the Live display to end: accept, since the cap bounds the wait;
  - a router turn pairing to a turn whose line is already written becomes dup: accept;
  - the replacing stream's source is not sent in live or appended mode: accept, since the renderer never relabels a bubble.
- **FAIL items:**
  - I-1 (SPEC §5 capture of shown Live text);
  - I-3 (SPEC §4.1 router state).
- I-2 is an interface defect between Task 2 and Task 10 that lands in the arbiter.

## Test quality
- The fake-clock harness runs due timers in order, with no vitest fake timers.
- The assertions are exact-sequence `toEqual` on signatures that include origin, append, label, replace and turnId, so a dropped or reordered event fails them.
- The report's mutants each kill at least one test: deadline 2500, no dispatch gate, no idempotent end.
- Missing pins, to add with the fixes: P4 (I-1), P7 (I-2), and the router-down default (I-3). Optionally P1 and P3.

## Not shown
- The Task 8 renderer's handling of `append` together with `replace` (M-2) was not checked. It is not built in this lane.
- The arbiter was exercised only through unit tests and probes. The live wiring (Task 10) and real router timing are not exercised here.
- Text arriving after `generationComplete` is measured at 0/47 on synthetic audio only.

## Re-review (fix round 1: 4c95c19 on ebfd8d5)

**Verdict: SPEC: PASS  QUALITY: APPROVE.** I-1, I-2, I-3 and M-1 to M-4 are resolved. M-5 is parked. The fix opens no unsafe-show path and no uncaught-failure path that I could find.

### What I ran
- The task's tests, from a temp cwd: routerArbiter 48/48, routeReader 17, unknownMarkerFilter 19 (84 passed).
- tsc for the electron config: 0 errors outside the 6-error baseline.
- The scratch probes P1–P7, re-run against the fixed code. I also added two new probes, N1 and N2, for the paths the fix created.

### Each finding
| finding | fix | probe after the fix | status |
|--|--|--|--|
| I-1 | `onSupersede` calls `writeLiveCapture` before it stops a streaming display. It sends no Live final and adds no history. | P4: captures `["live","shadow"]`. The live capture holds the 10 words shown, endMs = the supersede time. | resolved |
| I-2 | A record whose `firstTextAt` differs is treated as a new router turn. Task 2 fixes `firstTextAt` once per turn (LiveRouterSession.ts:159), so the same turn always matches. | P7: meeting 2's seq-1 turn is shown Live; line `route=easy-answer shown=live`. | resolved |
| I-3 | `routerUpAt` defaults to `false`. | P2: pipeline released at Q; `router=down reason=router-down`. | resolved |
| M-1 | The boolean became a count `staleEnds`, raised once per unfinished superseded stream and cleared at the first accepted end. | P1: two drops; the line waits for the real end; shadow text `"S2 more"`. N1 (the Task 7 order: new `completed`, then old `aborted`): no drop, one line, one capture of each kind. | resolved |
| M-2 | Appended tokens and finals carry `replace: false`. | P3: `token:New |pipeline|app` (no `rep`). | resolved |
| M-3 | The decider is frozen (`frozen`) once its display is over. `ended` still updates. | P5: `live_words=10`. | resolved |
| M-4 | A `replace:true` final with no replace token before it triggers the supersede (`replaceSeen`). An empty token that carries cues is kept. | N2: after a finished Live display, a final-only replacement is forwarded with `replace` and the line is written once. Pins M-4a and M-4b are in the suite. | resolved |

### New-path check
- **Unsafe show.**
  - `frozen` only stops text updates after the display is already `done`.
  - A new record made under I-2 can never take over an existing decider: `pair()` makes it a dup.
  - The capped-record guard still holds for a same-turn event, because its `firstTextAt` is unchanged.
  - P6 (an `afterComplete` marker before dispatch) still shows nothing Live.
- **Uncaught failure.**
  - Task 7 emits exactly one end per stream from its `finally`, so `staleEnds` can never exceed the stale ends that will actually arrive.
  - N1: the replacing stream's own final does not re-supersede, because `replaceSeen` is already set.
  - The pre-existing engine bug Task 7's reviewer flagged (a stalled old stream ending `completed`) is unchanged. It is still for the whole-branch review.

### Remaining (MINOR, no change required)
- `routerArbiter.ts:317` has a doubled trailing comment (`// filtered away; cues must survive // filtered away: …`).
- The optional `reason=superseded` tag was not added, so a superseded Live turn still reads `route=easy-answer reason=-`. Its `live` capture now exists, so the hour reader's counts match. This is the controller's call.

### Not shown
- The arbiter is still exercised only in unit tests and probes. Task 10's wiring and real router timing remain untested.
- Task 8's renderer is not built, so how it handles `replace` on a final-only replacement after a finished Live bubble (N2) is not verified.

SPEC: PASS  QUALITY: APPROVE

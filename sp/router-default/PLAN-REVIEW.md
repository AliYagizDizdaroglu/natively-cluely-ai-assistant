# PLAN-REVIEW: router-default PLAN.md (21 tasks, 4 lanes)

- Reviewer: fresh Opus subagent. Read-only apart from this file. No model calls. 2026-10-06, ~20:50–21:15 TST.
- Read: PLAN.md (all), SPEC.md rev 4c (all), SPEC-REVIEW.md (head), and these MAIN files: IntelligenceEngine.ts
  246–525, main.ts 975–1080 / 2088–2200 / grep of 2419–2445, interviewerTurn.ts (`lastSpeechAt`/`vadSeen`),
  WhatToAnswerLLM.ts 392–438, SessionTracker.ts 247–252, interview60.run.mjs 350–584, interview60.flight.mjs (arms
  185–210, 335–394), interview60.judge.mjs 1–30 and 87–92, and SP\quota-ledger-today.mjs 1–30.

## Verdict: APPROVE WITH CHANGES

The plan covers the spec closely, and its interfaces mostly line up. Two things must change before any implementer
starts:
- **B1:** the shared-worktree lane layout.
- **B2:** flag-off renderer identity.

The IMPORTANT items can be folded into the task briefs without moving the critical path much. The schedule is more
optimistic than the plan says (see S1).

---

## BLOCKING

**B1. Four concurrent implementers in ONE worktree is unsafe. Use one worktree per lane, and let the controller merge.**
- **Commit sweep.** Each implementer runs `git add <paths>` and then `git commit` with no pathspec. That commits
  everything staged, including another lane's paths that it has added but not yet committed. Two lanes committing at
  once also race on `index.lock`.
- **Gate contamination.** "A task passes when it adds no tsc errors over the baseline" stops meaning anything when
  three other lanes' half-applied stage files are in the same tree. A failing-test stage that imports a module that
  does not exist yet is enough to break it. Task 10 step 6 and Task 15 run the full suite while others edit, which the
  plan's own rule forbids.
- **Build contamination.** Task 3 runs `npm run build:electron` on WT at ~23:00, while lanes B, C and D are
  mid-edit. A half-written file elsewhere can fail the build, or get compiled into the probe's dist.
- **The only file two lanes share** is `electron/llm/unknownMarkerFilter.ts`: Task 5 stages "a verbatim copy" of
  Task 9's. If Task 9's review changes it, the copies diverge.
- **The layout that still meets the schedule:**
  1. Create four worktrees from 17d199d (`live-router-a`, `-b`, `-c`, `-d`), each with its own node_modules junction,
     plus the integration worktree `live-router` (branch `feat/live-router`). `apply-stage.mjs` takes the target WT
     as a second argument instead of hard-coding it.
  2. **Lane C runs 9 → 7 → 8.** Task 9 goes first and lands ~21:45. At ~21:50 the controller merges C's Task 9
     commit into lane B, before Task 5 starts, and Task 5 imports it. No copy.
  3. **Lane A runs 1 → 2.** Then the controller merges B's Task 4 into A, because the probe reads the built
     `routeReader.js`, an undeclared dependency today. Then Task 3 builds and probes in WT-A only.
  4. **Integration (~23:45, when Task 5 is reviewed).** Merge C, B and A into `feat/live-router`, and run Task 10 and
     Task 11 there. Merge D when it is done. Before each merge, check with `git diff --name-only` that the lanes'
     file sets do not intersect (by the plan's file table they are disjoint). Each merge then costs ~5 min.
  5. Only the controller starts a full-suite vitest, one at a time. Per-lane targeted test files are fine.
  6. Implementers commit with an explicit pathspec (`git commit -- <paths>`), even in their own worktree.

**B2. Flag off, the default app's renderer changes. That breaks spec §3 and §4.5.**
- **What the plan does.** Task 10 adds `turnId, origin:'pipeline'` to every turn event whatever the flag. Task 8's
  rules switch to the keyed path whenever `meta.turnId != null`: replace rewrites the FIRST bubble with that turnId
  and drops the later ones, and metrics move from `sm` to `bubbleMetrics`.
- **What the spec says.** With the flag off, the renderer receives today's events in today's order. "The renderer
  ignores [turnId] when no Live bubble exists."
- **Why it matters.** Today's replace semantics (R30, the first-token `replace`) and today's `sm` TTFT metrics are
  not shown to be identical to the keyed path. Nothing tests the default app's hands-free path with a turnId, and it
  ships to MAIN before the run.
- **The change:**
  - Take the keyed path only when the event is `origin:'live'` or `append`, or when a bubble with that turnId and
    `origin:'live'` already exists. Otherwise run today's code, `sm` included.
  - Add a test: a flag-off hands-free sequence (head, then supersede `replace:true`, then final, all with a turnId)
    produces exactly the messages of the same sequence without a turnId.

---

## IMPORTANT

**I1. `suggested_answer_end` is keyed only by turnId, but a supersede reuses the turnId.**
- **How it happens.** In IntelligenceEngine.ts 461–466, the old stream notices it was aborted only on its NEXT token.
  On a supersede (main.ts 1033, `replace:true`, same turnId), the old stream's `end aborted` can arrive AFTER the
  replacing stream's first token, for example when the old stream sits in a stall or hedge wait.
- **The effect.** Task 5 behaviour 14 would then mark the replacing stream as ended. That writes the decision line
  and the shadow capture early, with partial text.
- **The change.** Carry an engine generation id on the end event and on the tokens: `generationId` already exists.
  Or have the arbiter drop an `aborted` end that arrives after a `replace:true` token for that turn.
- **The test:** in Task 5, a replace token, then the old stream's aborted end, then the new tokens and the new
  completed end. Expect one line, written after the new end, and a capture holding only the new text.

**I2. The engine has exits with no `end` event, and they would hang the line and the probe wait.**
- **The exits:**
  - the cooldown return (line 275);
  - the `answerLLM` branch, which emits only `suggested_answer` (296);
  - any throw before the stream starts.
- **Why it matters.** On a dispatched turn, a missing `end` means no decision line, and §7.2's `probeSettled`
  never settles: 120 s, then "not spent".
- **The change.** Emit `end` from a `finally` that covers every exit taken when `options.turnId != null`. Pin it with
  a test.

**I3. Task 10 (the main.ts wiring) has no test, and the smoke at ~03:30 is its first exercise.**
- **What is at stake** is all main glue:
  - `turnOpened` timing in `syncTurnIdentity` (main only learns of a turn at its next `turnTick` or mark);
  - `turnClosed` on `close`, `resetTurn` and a stale replacement;
  - `turnDispatched` on the fragment-hold and live-hold resolution paths;
  - flag-off pass-through.
- **The risk.** A wiring bug found at 04:05 is a no-go.
- **The change.** Put the turn-feed and event-forward glue in a small `electron/services/routerWiring.ts`, with
  functions that take the arbiter and main's callbacks. Unit-test it (≈ 20 min): open/close/stale-replace order,
  dispatch on a resolved hold, no `turnDispatched` on the supersede path, and flag-off identity.
- **Also:** make `turnDispatched` idempotent per turn id, and pin that with a test. `dispatchCount` feeds
  `dispatches_before`, which decides VOID.

**I4. Some test-first steps fail only because the module is missing (Tasks 2, 4 and 5).**
- "All fail (the module does not exist)" shows no assertion failing for its own reason. Task 5 has a mutation check;
  Task 4 has its binding counts.
- **Task 2 has neither,** yet it holds the generation guard, failed-once, quota backoff and the context cache.
- **The change.** Stub-first: export the class or functions with no behaviour, so each test fails on its own
  assertion. Or add Task 2 mutants: drop the `gen !== this.generation` return; emit `failed` on every slow retry;
  re-read `getContext` on reconnect. Each must turn a test red.
- **Task 1.** "A late session is closed" and "stop makes late callbacks stale" are not in the expected-failure list,
  and may pass on today's code. Label them regression pins and break them once (rule 8).

**I5. The grading instruments are missing from the plan.**
- **The side-by-side export.** Spec §5 and §10 grade blind side-by-side packets built from the two capture files:
  Live as shown against its shadow, and appended answers separately. No task builds that export, or its calibration.
  The registration must fix every instrument with its sha before any data.
- **The arms filter does not reach the grader.** Task 13's `selectArms` filters the arms run. But
  `interview60.flight.mjs` 336 (moveAside) and 394 (`toGrade`) still list `ANSWER_MODELS` and every paired arm. The
  grade step would then look for pair files that do not exist.
- **The change.** Add a task (lane D, ≈ 45 min, before Task 19) for the side-by-side export and its known-answer
  calibration. Extend Task 13 so that `moveAside`, `toGrade` and the judge exports follow `selectArms`. Its dry run
  must show the grading list too.

**I6. The reader's Safety check on pipeline text uses the router's marker definition.**
- **The problem.** §4.2's marker set includes `<`, `>`, `[` and `]`. Task 14 applies "no shown text of any kind
  carries a marker" to `[Answer] full:` and the appended text. A legitimate pipeline answer with `[i]`, `List[int]` or
  `a < b` would read as a Safety FAIL. The §7.1 filter does not strip those characters, and should not.
- **The change.** For pipeline text, the registration defines "marker" as the routing or unknown-token form:
  unknown `__WORD__`, plus `<`/`[` only in router-token shapes. The reader prints both counts. If a stricter reading
  is wanted, the user rules on it before the registration.

**I7. Nothing proves before the smoke that the router's CONTEXT will be non-empty in the app.**
- **What the plan adds.** `routerPreflight` requires `context_chars>0`. The spec does not require that; the spec
  requires only the smoke's sha.
- **Two ways it can come out empty:**
  - knowledge mode off, or no active resume on this machine;
  - a race: the summary is cached once, when the router first starts at meeting start. If the orchestrator's cache is
    not filled by then (main.ts 691 enables knowledge mode at init), the cache holds `''` for the whole meeting.
- **The change:**
  - In Task 2, make `getContext` returning `''` log a line, and retry it once on the first `setupComplete`, if that
    is allowed. Otherwise record the race as a residual.
  - In Task 17, have the controller confirm that the knowledge base holds an active resume before arming the smoke.
  - State in the registration whether `context_chars=0` is a not-ready (plan) or acceptable (spec's empty case).

**I8. `probeSettled` (Task 13) can declare the probe settled while Live is still streaming.**
- **Why.** With the flag on, the probe's Live answer can outlast the pipeline answer, because a router turn can run
  past 7 s.
- **The change.** Settled requires each `[Router] dispatch turn=N` to have its `[Router] turn=N` decision line. That
  line is written only once the pipeline and the router turns have ended or the turn has closed.
- **Also.** Scope `logSinceProbe` to the LAST preflight attempt, because `probe()` can retry and replay the probe
  wav.

**I9. The gap raise is likely, and the plan does not budget for it.**
- **The arithmetic.** In the eq hour, pipeline TTFT was p90 11.25 s, plus the answer's duration. The next dispatch
  comes about 20 s, plus the next clip, plus 1.2 s after this dispatch. Some overruns are likely.
- **What a raise costs.** It means a wav rebuild after the smoke (≈ 04:15), a new `wav:check`, new sha lines, a
  longer run (47 × +Δ s) and a smaller `I60_PROBE_DEADLINE_MIN`. All of it lands inside Task 19's 25-minute
  re-check slot.
- **A second point.** The smoke would then have flown a different wav than the run.
- **The change.** Budget ~20 min for it in Task 19, and say in the registration that the smoke's wav differs only in
  gap.

**S1 (schedule). The cut line is sound, but the checkpoints contradict the critical path, and the margin is thinner
than 45 min.**
- **Checkpoint 3 contradicts the path.** With Task 11 in, the nominal path puts Task 16's end at 03:20
  (21:15 + 15 + 30 + 120 + 80 + 30 + 60 + 30), but checkpoint 3 demands the smoke armed by 03:15. The nominal plan
  misses its own checkpoint. Checkpoint 1 (23:45) is likewise ~5 min before lane A's nominal 23:50.
- **Task 15 is underestimated.** 60 min for a whole-branch Opus review of a ~2–3k-line diff, Sonnet fixes and an
  Opus re-check is optimistic; 90–120 min is realistic.
- **Task 19 assumes one round.** Its 25-minute re-check assumes APPROVE on the first pass. Every recent re-check came
  back WITH CHANGES.
- **Recommendation.**
  - Ask the user for the Task 11 cut at plan approval, not at 01:30. That gives back 30 min of margin.
  - Move checkpoint 3 to "smoke armed by 03:20 (with Task 11) or 02:50 (without)".
  - Re-estimate Task 15 at 90 min. With Task 11 cut, the path still ends ~04:45.
  - Have the Task 19 author draft everything that does not depend on the smoke by 03:30, so that the re-check after
    the smoke only covers the smoke fields.
  - Being honest: the 08:00 run is a coin flip. The 23:00 fallback should be treated as likely, not exceptional.

---

## MINOR

- **M1.** `bubbleMetrics.start(key)` is said to fire on the live-question event "under the key's turnId prefix". But
  `live-question` carries no turnId. Name the rule: start on the first event of the turn, or add `turnId` to
  `live-question`.
- **M2.** The `shadow=` field is measured from the dispatch, while the spec says "as the existing diag measures it"
  (from request send). The 5 ms p50 makes the difference small. Record it in the registration.
- **M3.** The integrity check "nothing shown = shown=pipeline with `shadow=-`" misses a pipeline-shown turn whose only
  tokens were filtered away, and a Live turn superseded into an aborted pipeline. Add "no `origin` event sent for the
  turn" as an arbiter-side counter on the decision line, for example `sent=<n>`.
- **M4.** When the pipeline has not yet sent its first token, Live tokens carry `question:''` and `confidence:1`. That
  is harmless, but say it in the case B test.
- **M5.** "The flight's `LIVE` line names 3.1" (Task 13, `routerPreflight`) does not name an actual log line. Use
  the ear's model from its connect line, or from a `[Router] ear=` line that Task 10 adds.
- **M6.** Tests that run longer than the fake-timer steps (Task 1's 20 s advance, the cap tests) need `vi.useRealTimers`
  in `afterEach`. This is the vitest abandoned-body lesson (a63dc09).
- **M7.** The smoke checks cases A–E on screen only "if the user can look". Computer-use screenshots of the overlay,
  taken while the scheduled-task app runs, would close the renderer residual without starting the app from a session.

---

## 1. Spec coverage

| Spec item | Plan | Status |
|--|--|--|
| §4.1 / §4.1a | T2 (+ T3 deviation) | covered; I4, I7 |
| §4.2 | T4 | covered (binding counts) |
| §4.3 | T5, T6 | covered; I1 |
| §4.4 | T1 (model param), T11 | covered, cuttable with ruling |
| §4.5 engine / IPC / renderer | T7, T10, T8 | covered; B2, I2, M1 |
| §4.6 history | T5, T7, T10 | covered |
| §5 lines, capture | T1, T2, T5, T13 | covered |
| §5 run reader | T14 | covered; I6, M3 |
| §5 grading export (side-by-side packets) | — | **missing (I5)** |
| §7.1–§7.4 | T9, T13, T1, T12 | covered; I8 |
| §9.1–§9.4 | T4–T13, T6, T3, T17 | covered; I3 (main glue) |
| §10 / §10.1 / §11 | T13, T18, T19, T20 | covered; I5 (`toGrade`), S1 |

**Scope beyond the spec:**
- `NATIVELY_FLIGHT_ARMS`, `q_at`, the dispatch line, `shown=-`, `routerDiag.ts`, `bubbleMetrics.ts`, `earFailover.ts`
  and `context_chars>0` in the preflight.
- All are justified and small, except `context_chars>0`, which is a new gate (I7). None adds product behaviour.

## 2. Interface consistency

- **Router turns.** `RouterTurnEvent` (T2, without `cap`) is assignable to `RouterTurnIn` (T5, with `cap`). The spec
  puts `cap` in the module's `endKind`; putting it in the arbiter is equivalent, because the cap is the arbiter's Q
  clock. OK.
- **turnId contract.**
  - Engine to main: positional last argument. Main to renderer: payload fields. Main to arbiter: `PipelineIn`.
  - The supersede path reuses the turnId with `replace:true`, and goes direct (main.ts 1033), not through
    `dispatchDetection`. So `turnDispatched` is not called twice there (good), and the R21 fallback only dispatches
    turns that never dispatched.
  - The gaps: I1 (end-event identity) and B2 (renderer keyed path when the flag is off).
- **Decision line.** It is the spec's format plus `q_at` and `shown=-`. Tasks 5, 13 and 14 all consume this one
  format.
  - `probeSettled` uses `[Router] dispatch` together with `[IntelligenceEngine] answer end turn=`. Both are produced
    in T5 and T7. OK.
- **Capture.**
  - `[RouterAnswer]` JSON (T5) feeds `buildCaptureFiles` (T13), which maps through `q_at`, the timeline and
    `OFFSET_MS`.
  - Entry `{ id, turn, text, words, firstMs, endMs, q_src, appended? }` matches spec §5. OK.
  - `[Answer] budget: words=N` exists (WhatToAnswerLLM.ts 438), so the "whole shadow" check has a source.
- **History.**
  - The sink is `(turnId, text, question?)` (T7), feeding `PipelineIn.history` (T5), feeding `addHistory` (T10),
    which feeds `IntelligenceManager.addAssistantMessage(text, q)` (T7 extends today's one-argument version). OK.
  - The judge pairs each dispatch with the next `[Answer] full:` line. On appended turns there are two `full` lines,
    Live then pipeline, and the judge takes the first. That is consistent with "the in-app arm keeps reading that
    line". The pipeline append is graded from the capture file. State this in the registration.

## 3. The plan's resolved conflicts

| Conflict | Judgement |
|--|--|
| Precheck moved into the harness preflight | **Accept.** It is necessary: `auto()` stops any app and starts its own after T (run.mjs 536–546), so the router session cannot exist at T−6. The failure path ("not ready → retry → not spent") is the right one. Conditions: the registration states the split, and the router gates are re-read just before `appPass` (after the I8 wait), not only inside `preflight()`. |
| `NATIVELY_FLIGHT_ARMS` | **Accept, with I5.** Without it, the flight runs 2 untagged arms, 13 paired arms and the chains, far over §10.1's three arms and its quota. Grading and moveAside must follow the selection. Unset must stay byte-identical (pin with a test). |
| The probe's fixture context | **Accept.** A standalone node script cannot open the Electron DB. The probe still proves the composition and sha stability over a real reconnect. The in-app non-empty proof moves to the smoke; see I7 for making that proof robust. |
| RH07/RH17 reading `late` | **Accept.** It follows §4.2 exactly: a bare `hard` is complete only at its end, and their ends came at 2173 and 2258 ms. The display outcome is the same as `hard` (pipeline plus cues). M2 keeps them out of "misrouted", and §9.2's "pipeline 27" holds. In the run this pattern will show up as `invalid/late` on HARD items: the reader should report it as its own row, and the registration should predict it. |
| `q_at` and the dispatch line | **Accept** as additive fields. Both are needed: the play-window mapping and "dispatched with no decision line" are impossible without them. The registration pins the extended format. |
| The smoke plays the whole wav | **Accept.** It is a better rehearsal at a quota cost of ~54/500, and it avoids a subset wav failing `wav:check`. It takes ~27 min of wall time, which fits the 60 min slot. Record that the smoke and the run share the roster, and that only the gap may be tuned from the smoke (I9). |

## 4. Not checked

- Task 8's exact current `applyAnswerToken` and `applyFinalAnswer` code, and today's R30 replace semantics. B2 rests
  on the plan's rules, not on a diff against today's renderer.
- `computeOffsets`' use of `level` and `topic`.
- Whether `build:electron` compiles `*.test.ts` files: B1's build-contamination risk is larger if it does.
- The contents of flight-eq's guard, precheck and register scripts that Task 18 adapts.
- Whether this machine's knowledge base holds an active resume (I7).

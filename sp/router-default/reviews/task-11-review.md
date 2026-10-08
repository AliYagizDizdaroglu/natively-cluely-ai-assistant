# Task 11 review: ear failover 3.1 -> 2.5 (143d8df on 99a6e14)

Reviewer: Opus. Read-only. Scope: Task 11's diff only (Task 10's wiring is reviewed separately).

**SPEC: PASS  QUALITY: CHANGES** (1 IMPORTANT, 3 MINOR)

## Gates re-run by the reviewer
- vitest from a temp cwd: earFailover.test.ts 14/14 and routerWiring.test.ts 23/23 = 37 pass.
- tsc on electron/tsconfig.json: 6 errors, the same pre-existing six (GeminiLiveRouter, ipcHandlers x3, KnowledgeOrchestrator x2). None in main.ts or the new files.

## Spec compliance (brief: PLAN 1572-1605; SPEC 4.4, 5, 9.1)
| Requirement | Where | Met |
|--|--|--|
| `shouldFailOver` true iff flag, model = 3.1 id, state `failed`, reason is not the no-key one, not yet failed over | earFailover.ts:173-178 | yes |
| `EAR_FAILOVER_MODEL = 'gemini-2.5-flash-native-audio-latest'` | earFailover.ts:161 | yes |
| Truth-table tests: 3.1 failed, second time, 2.5 start, flag off, reconnecting, no-key | earFailover.test.ts:138-148 | yes, plus other states, other models and the override |
| `startLiveRouter(model?)` passes the model as constructor arg 3 | main.ts:2223-2230 | yes. `undefined` falls through to the default `LIVE_ROUTER_MODEL` |
| Status handler: set the flag, write the failover line, `setEar('2.5')`, restart on 2.5 via setImmediate | main.ts:2240-2249 | yes. The line format matches SPEC 5 exactly |
| Reset `earFailedOver` in endMeeting; no fail-back | main.ts:2368 | yes |
| Decisions unchanged by the ear model | routerArbiter.setEar only pushes a log state (routerArbiter.ts:111-114) | yes |

Deviations: all three are justified and none adds behaviour outside the spec.
- `modelOverridden`: the dispatcher requires NATIVELY_LIVE_MODEL to disable the failover. SPEC 4.4 requires only that an ear started on 2.5 never fails over, so the override is stricter than the spec but consistent with it.
- The 2.5 default on a mode-change restart: without it, an off -> suggest toggle after a failover would fall back to 3.1. That would break SPEC 4.4's "No fail-back... stays on 2.5 until the meeting ends". The plan's literal code had this gap.
- `EAR_PRIMARY_MODEL` is a constant only.

## The dispatcher's checks
- **A stale or old-generation status cannot trigger the failover.**
  - In GeminiLiveRouter, `failed` is emitted from only two places:
    - `scheduleReconnect` (GeminiLiveRouter.ts:558). Its callers are `handleClose`, which returns on `stale` before reaching it (513-516) and returns on `stopping` (518), and the goAway path, which runs only for the current generation (408).
    - The no-key path, which the rule excludes.
  - `failed` fires only on the transition into slow retry (`!inSlowRetry`).
  - On top of that, main checks `this.liveRouter === router` (2240), and `stopLiveRouter` removes all listeners (2344). A router that has been replaced or stopped cannot reach the handler.
  - The 152 s goAway double-reconnect class is closed upstream: goAway bumps the generation (448), so the old onclose is stale.
- **It cannot fire twice, and it cannot fall back to 3.1.**
  - `earFailedOver` is set synchronously before the setImmediate.
  - The 2.5 router fails the model clause.
  - Every later `startLiveRouter()` defaults to 2.5 until endMeeting resets the flag.
- **NATIVELY_LIVE_MODEL disables it.**
  - `modelOverridden` is passed in (2232, 2242), and the test pins it (148).
  - The disabled line is written once per process, and only with the flag on.
  - It also disables the failover when the override is the 3.1 id. That is a literal reading of the brief, and it is noted in the report.
- **Flag off is unchanged.**
  - `shouldFailOver` returns false at its first clause.
  - The disabled line is gated on `routerEnabled`.
  - The constructor gets `undefined`, so `LIVE_ROUTER_MODEL` applies as before.
  - `earFailedOver` never becomes true.
- **The log lines match the hour reader.**
  - `[Router] ear failover from=3.1 to=2.5 reason=<r> dispatches_before=<n>` matches `router-hour-read.mjs:130` (`/^\[Router\] ear failover from=/`), and `lastBefore` finds `dispatches_before`.
  - The new `[Router] ear failover disabled reason=NATIVELY_LIVE_MODEL model=<id>` does NOT match `from=`, and no other branch claims it, so it is ignored. That is correct, and it is not counted as a failover.
  - `[Router] ear model=<id>` comes from Task 10's `onEarModel`, which `startLiveRouter` calls. The restart therefore writes the 2.5 line. Task 13's preflight reads it; the hour reader does not.
- **Can it restart the ear after the meeting ended?** Yes, in one window: see I1.

## Findings

### I1 — IMPORTANT: the deferred restart can start a 2.5 ear after endMeeting has stopped the ear (main.ts:2248)
- **Rests on:** the dispatch's "cannot restart the ear after the meeting ended", SPEC 4.4 ("until the meeting ends"), and Review Focus 5 ("no reconnect fires after stop").
- **What the guard checks.** The setImmediate guard is `this.isMeetingActive && this.liveMode !== 'off'`.
- **Why that is not enough.**
  - endMeeting calls `stopLiveRouter()` and resets `earFailedOver = false`.
  - It then awaits 250 ms *before* setting `isMeetingActive = false` (2366-2378).
  - It never resets `liveMode`.
- **How the window opens.**
  1. The ear emits `failed` from an I/O callback: a ws onclose, or a connect rejection.
  2. The endMeeting IPC runs in the same poll phase.
  3. The check phase then runs the queued setImmediate. `isMeetingActive` is still true and `liveMode` is still on, so `startLiveRouter(EAR_FAILOVER_MODEL)` runs.
- **Consequences.**
  - A 2.5 Live session runs after the meeting, unstopped. endMeeting does not stop the ear again after its await.
  - It holds a socket and Live quota until the next meeting's `startLiveRouter` or a mode-off.
  - It writes a stray `[Router] ear model=gemini-2.5…` line.
  - Its questions are dropped, because `isMeetingActive` turns false.
- **The comment is wrong.** At 2247 it says "Skipped if the meeting ended meanwhile", which this window contradicts.
- **The same gap gives a double start.** If the mode is toggled off and on inside the same window, a second, redundant restart follows, with a duplicate `ear model=` line.
- **Fix (one line):** guard on identity as well. `setImmediate(() => { if (this.liveRouter === router && this.isMeetingActive && this.liveMode !== 'off') this.startLiveRouter(EAR_FAILOVER_MODEL); })`.
  - `stopLiveRouter` nulls `liveRouter` on every stop path (endMeeting, mode off, any restart).
  - So the ear that failed being still current is exactly the condition under which a restart is wanted.
- **Likelihood and cost.** The window is narrow (one loop iteration), but the fix costs nothing, and it is the brief's named check.

### M1 — MINOR: setEar('2.5') is written even when the restart is skipped (main.ts:2246)
- The arbiter's ear says 2.5 while no ear runs.
- It affects the log only, because decisions ignore the ear.
- It is redundant with `onEarModel` on the restart, and it is kept per the plan. No change needed. Moving it into the guarded setImmediate would make it accurate.

### M2 — MINOR: a 3.1 ear with an invalid (not missing) key fails over to 2.5, which also fails
- An auth close is not the no-key reason, so it passes the rule.
- The result is one useless failover line and a red chip as before. This is harmless and in-spec, because SPEC 4.4 excludes only the no-key reason.
- Task 13's preflight ("no `[Router] ear failover` line") would catch it before a run.

### M3 — MINOR: the unit test pins "once" only through the input flag (earFailover.test.ts:140)
- The once-per-meeting property actually lives in main: the set-before-defer ordering, the endMeeting reset, and the 2.5 default.
- None of that has a seam, and this is inherent to the brief's design. It is covered by reading (above) and by the smoke obligations below.

## The main.ts glue with no unit seam: verified by reading, and what the smoke (Task 17) must observe
**Verified by reading:**
- the identity guard;
- the ordering of `earFailedOver = true` before the deferred restart;
- the reset in endMeeting;
- the 2.5 default on restart;
- the flag-off and override gates.

**The smoke cannot provoke a real 3.1 `failed`** without code: an override disables the failover, and three quick failed reconnects are not inducible from the harness. It must therefore observe the negative path, and the run reader must be able to recognise the positive one.

**Smoke, flag on, NATIVELY_LIVE_MODEL unset:**
- exactly one `[Router] ear model=gemini-3.1-flash-live-preview` per ear start;
- no `[Router] ear failover` line of either kind;
- `[Main] Live Mode status: connected`;
- after the meeting ends, no `[Router] ear model=` line and no `[LiveRouter]` connect activity.

**Smoke, flag off:** no `[Router] ear failover` line of either kind.

**If a failover happens in the hour, the expected sequence is:**
1. `[Main] Live Mode status: failed (<r>)`
2. `[Router] ear failover from=3.1 to=2.5 reason=<r> dispatches_before=<n>`, exactly once per meeting
3. `[Router] ear model=gemini-2.5-flash-native-audio-latest`, within about 1 s
4. `Live Mode status: connecting`, then `connected`
5. no later `ear model=gemini-3.1…` before the meeting ends

**Never exercised (residual risk):** the positive branch end to end, and the I1 window.

## Re-review (fix1: dae41f9 on 143d8df)

Scope: I1 and M1 only. Coordinator ruling: the `ear failover from=` line stays outside the guard. I accept the ruling. The line records the failed event and its `dispatches_before`, and the hour reader counts failovers as report-only events.

**Gates re-run by the reviewer:**
- `earFailover.test.ts` 18/18 and `routerWiring.test.ts` 23/23: 41 pass.
- electron tsc: the same 6 errors that were already there; none new.
- The worktree's `main.ts:2250-2251` contains the fix.

**I1: RESOLVED.**
- The guard is evaluated inside the `setImmediate` (main.ts:2250): `failedEarIsCurrent: this.liveRouter === router`, together with `meetingActive` and `!liveModeOff`.
- **After endMeeting:** `stopLiveRouter` (2366) sets `liveRouter` to null synchronously before the 250 ms wait. The deferred callback therefore returns, even though `isMeetingActive` is still true.
- **After a mode toggle in the same turn:** a toggle to off clears `liveRouter`; a toggle back on replaces it with a new router, which already defaults to 2.5 because `earFailedOver` is true. Either way the identity check fails, so there is no double restart and no duplicate `ear model=` line.
- **The flag's state is right on every path:**
  - Skipped because the meeting ended: endMeeting has already reset `earFailedOver` to false, so the next meeting starts on 3.1.
  - Skipped because the mode went off mid-meeting: the flag stays true, so a later mode-on restarts on 2.5 with no fail-back. That is correct.
- **Tests:** the pure predicate is pinned by 4 tests, and 3 mutants (one per clause) were killed.
- **Not unit-tested:** the call site that passes `this.liveRouter === router` is verified by reading only. The tests were written alongside the predicate, not RED first, and the mutants stand in for that. This is acceptable for a 3-clause conjunction.

**M1: RESOLVED.**
- `setEar('2.5')` now runs only on the restart path (2251).
- `onEarModel` in `startLiveRouter` then sets it again. This is harmless redundancy, kept per the plan.

**New findings:** none. The comment at 2242-2244 now describes the behaviour correctly.

**What the smoke must observe:** unchanged from the list above. The I1 window itself is still never exercised live; it is covered by reading and by the predicate tests.

**SPEC: PASS  QUALITY: APPROVE**

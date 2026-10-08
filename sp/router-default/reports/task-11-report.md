# Task 11 report: ear failover 3.1 -> 2.5

Status: DONE_WITH_CONCERNS. Commit 143d8df on feat/live-router (base 99a6e14).

Files: electron/services/earFailover.ts (new), earFailover.test.ts (new, 14 tests), electron/main.ts (+24/-2).

Tests: RED first against a stub returning false: 2 failed (the two "fails over" cases) for the right reason. Then GREEN: earFailover 14 + routerWiring 23 = 37 pass.
Mutants: each of the 6 clauses replaced by `true`: 6/6 killed. File restored.
tsc: root 0 errors; electron config 6 errors, all pre-existing (GeminiLiveRouter.ts:125, ipcHandlers.ts x3, KnowledgeOrchestrator.ts x2); none in main.ts or the new files.

Wiring (main.ts):
- startLiveRouter(model?) passes model as constructor arg 3 (connectFn arg undefined). It already calls routerWiring.onEarModel(router.getModel()), so the restarted ear writes `[Router] ear model=<id>` and calls arbiter.setEar.
- Status handler: shouldFailOver(...) guarded by `this.liveRouter === router` (a stale router is ignored). Then earFailedOver=true, diag line, arbiter.setEar('2.5'), setImmediate restart on EAR_FAILOVER_MODEL (only if the meeting is active and liveMode != off).
- endMeeting resets earFailedOver=false. No fail-back.

Log formats (exact):
- `[Router] ear failover from=3.1 to=2.5 reason=${s.reason ?? '-'} dispatches_before=${n}`
- `[Router] ear model=${model}` (existing, from onEarModel)
- `[Router] ear failover disabled reason=NATIVELY_LIVE_MODEL model=${id}` (NEW; the plan gives no format for it; logged once per process, only with the flag on)

Deviations:
1. shouldFailOver has an extra optional field `modelOverridden` (the NATIVELY_LIVE_MODEL carry); main passes `!!process.env.NATIVELY_LIVE_MODEL`.
2. startLiveRouter's default model is EAR_FAILOVER_MODEL when earFailedOver is true, so a mode-change restart (off -> suggest) after the failover stays on 2.5 (no fail-back). Not in the plan.
3. Constant EAR_PRIMARY_MODEL added beside EAR_FAILOVER_MODEL.

Not exercised: the main.ts glue itself (no unit seam; no build, app or model call allowed): the status-handler branch, the setImmediate restart and the override log are untested live.
Concerns: the override disables failover even if NATIVELY_LIVE_MODEL is set to the 3.1 id (literal reading of "override"). setEar('2.5') is redundant with onEarModel, kept per plan. The hour reader should ignore or accept the new "disabled" line.

## fix1 (review I1, M1)
- I1: the setImmediate now calls `shouldRestartEar({ failedEarIsCurrent: this.liveRouter === router, meetingActive, liveModeOff })`, a pure predicate extracted to earFailover.ts (4 new tests; 3 mutants, one per clause, all killed). Comment rewritten. Covers a restart after endMeeting or after a same-turn mode toggle.
- M1: `routerArbiter.setEar('2.5')` moved inside the guard, so it runs only when the restart runs. The `[Router] ear failover from=3.1 ...` line stays outside it, written synchronously with `earFailedOver = true`: it records the failed event and its dispatches_before; I read "its log" as setEar's. Say if the failover line should move too.
- Gates: earFailover 18 + routerWiring 23 = 41 pass; root tsc 0; electron tsc the same 6 pre-existing errors.
- Tests were written together with the predicate (not RED first); calibrated by the mutants instead. The main.ts call site is still verified by reading only.

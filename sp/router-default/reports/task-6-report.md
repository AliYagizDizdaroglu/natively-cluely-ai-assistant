# Task 6 report: offline replay on router40

Status: DONE_WITH_CONCERNS. Commit 4c7e53a on feat/live-router-b (HEAD was 4c95c19).

## Files
- `electron/services/routerArbiter.replay.test.ts` (new, 122 lines). Staged from `LAB\stage\task-6`, applied with apply-stage.

## Replay (47 items, fresh arbiter each, router up via `setRouterUp(true, -5000)`, Q = 0)
Per item: turnOpened(1,-5000), turnDispatched(1,0,0,'vad'), routerTurn per chunk (cumulative text: the fixture stores deltas),
generationComplete at generationCompleteMs, pipeline tok at 4000, fin+end('completed') at 6000, turnClosed(1,30000).
Events are applied in time order on a fake clock with timers. Exactly one decision line per item.

Result: shownLive 20, shownPipeline 27, appends 0, row4 0, hardRows 25, late = RH07, RH17, live_first max 1259 ms (all <= 2000).
All plan assertions pass. 3 tests pass.

## RED / calibration
- New test over existing code: no stub RED possible. Break check per plan step 2: fixture RE05 first chunk set to atMs 2600 gives
  shownLive 19 ("expected 19 to be 20"), pipeline 28, late = RE05,RH07,RH17, and the identity test fails too. Fixture restored
  (git status shows only the new test file).
- First attempt of the mutant did NOT fail: I delivered later chunks at their own earlier times, so the arbiter saw text at 1011 ms
  despite firstTextAt 2600. Fixed by clamping chunk delivery times to be non-decreasing from the first chunk (no effect on the real
  fixture). Then the mutant failed as expected.

## tsc
- root: clean. electron config: 6 lines of output, matching the 6 pre-existing errors (not diffed against baseline file line by line).

## Concerns
1. The 20/27 totals hold only because two items cross labels (not in the plan, whose explanation covers RH07/RH17 only):
   - RH05 (fixture HARD, class H): 71-word router answer, first word at 1178 ms; reads route=easy-answer, shown=live. A question
     the router was meant to defer is answered live.
   - RE09 (fixture EASY): a single hard token at 606 ms, complete at 759; reads route=hard, shown=pipeline.
   So live = 19 EASY + RH05; pipeline hard rows = 24 HARD + RE09. Spec 9.2 asks every difference explained; this needs the
   controller's ruling (recorded-router behaviour on router40, not an arbiter defect: the arbiter acts on what the router said).
   The test pins these identities ('per-item identities').
2. The test computes at collection time (describe body), so an arbiter exception would surface as a collection error.
3. No retries, no model call, no text printed (ids and counts only).

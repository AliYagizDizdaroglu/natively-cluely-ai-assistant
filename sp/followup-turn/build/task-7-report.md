# Task 7 report - turn id threaded through main.ts / turnDispatch; startup line

Commit: see `git -C WT log -1` on build/earlier-question (parent c94cdb5).

Changed (3 files, 24+/9-):
- electron/services/turnDispatch.ts: `turnDispatchInput(base, d, turnId: number | null)`, required; spreads `turnId` only when `!= null` (0 is a turn).
- electron/services/turnDispatch.test.ts: new describe (carries 7 and 0; no `turnId` key on null); the two existing 2-arg calls (:56, :76) now pass `null`.
- electron/main.ts: `DetectionInput.turnId?`; the three `turnDispatchInput` calls pass `this.turn.snapshot().id`; `answerDetection` forwards `turnId` to `runWhatShouldISay` (option name `turnId`, matches IntelligenceEngine/IntelligenceManager `turnId?: number | null`); import + `console.log('[Main] ${describeEarlierQuestionAtStartup()}')` inside the existing startup `try` (bad value / both flags -> existing catch logs "refusing to start", app.exit(1)).

TDD: the new "carries the turn id" test was watched failing (expected undefined to be 7) before the implementation.
Mutants (each restored, file byte-identical afterwards):
- spread dropped -> "carries the turn id" FAILS (1 failed / 8 passed)
- `turnId != null` -> `turnId ?` (truthy) -> same test FAILS (the id-0 assertion kills it)

Gates:
- turnDispatch + earlierQuestion*.test.ts + IntelligenceEngine*.test.ts (10 files): 9 passed, 1 skipped (earlierQuestion.parity.test.ts, env-gated on local fixtures), 106 tests passed / 1 skipped. stderr "Stream failed" lines come from the existing codingAdvisory mocks, unchanged.
- root tsc: no output. electron tsc: the six baseline errors, Compare-Object against SP\followup-turn\build\tsc-electron-baseline.txt printed nothing.

Not exercised (by design): the three main.ts lines and the startup line have no unit test; they are proven only by Task 10's smoke (`turn=<id>` instead of `gate=no-turn ... turn=none`; `[Main] earlier question: on|off`). `snapshot().id` is null if the turn has already closed at the call, which yields no turnId (no block), the safe direction.
Line endings: all three files LF; edits via node script with unique-anchor asserts.

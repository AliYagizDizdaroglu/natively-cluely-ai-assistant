# D1 short-followup dedup

Commit 3737dafc on fix/short-followup-dedup (worktree .claude/wt-d1, base 9d5bd9e).

Diff: ChipDeduper.ts findSimilar anchor rule now returns a match when sameAnchor is true AND (containment OR both anchors >=4 content words OR age <= CROSS_DETECTOR_MS). New test file ChipDeduper.shortFollowup.test.ts (4 tests, invented text).

RED (old code): "a 2-content-word follow-up sharing one word is admitted 19 s after its answered parent" -> expected false to be true. Other 3 pass on old code (guards). First draft pair had overlap 0.33, so the test was recalibrated to 0.50 before the fix.

GREEN: shortFollowup 4/4; ChipDeduper*, fragmentHold, interviewerTurn.replay, questionReconcile, detectionDispatch: 82 passed; liveHold + turnDispatch: 20 passed.
Full suite: 127 files passed, 1 failed (interview60.prompts.test.ts: missing dist-electron/electron/llm/promptCapture.js, unbuilt, unrelated), 1599 tests passed, 9 skipped.
tsc -p electron/tsconfig.json: 6 errors (baseline).

Not exercised: real log replay, main.ts dispatch path end to end, app. Cross-source short pair between 5 s and 20 s now admits (intended).

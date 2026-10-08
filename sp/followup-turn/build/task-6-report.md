# Task 6 report — IntelligenceEngine builds the block (commit c94cdb5 on build/earlier-question)

Status: DONE. Files: electron/IntelligenceEngine.ts (+32/-1), electron/IntelligenceManager.ts (+1), electron/IntelligenceEngine.earlierQuestion.test.ts (new, 12 tests, plan text verbatim).

## TDD
- Red (before any code): 9 failed / 3 passed. The 3 passes: "flag unset" (control, as the plan predicts), "never read" (vacuous before the change, calibrated by mutant 3), "diag line carries counts, never text" (vacuous with no diag line; the plan says every flag-on test fails, this one cannot). No expectation needed correcting.
- Green: 12/12.
- Neighbours: 15 files, 87 tests passed (all IntelligenceEngine*, WhatToAnswerLLM*, IntelligenceManager*).
- tsc: root = 0 errors; electron = exactly the six baseline errors (GeminiLiveRouter 125,44; ipcHandlers 3436,18 / 3436,38 / 3439,31; KnowledgeOrchestrator 349,35 / 351,25), none in touched files.

## Mutants (all restored; diff re-checked identical afterwards)
1. write-before-build: 4 FAIL (parent evicted, short gap, two-calls, coding-main).
2. log-before-write: 1 FAIL (ledger write throws).
3. ledger read hoisted above the flag check: 1 FAIL (flag unset: ledger never read).

## States exercised
block / parent-in-prompt / no-turn / supersede / no-question / write throws (gate=error, one line) / junk flag (gate=error) / flag unset (no read, no line, no write, first eight generateStream args pinned) / overlapping calls / coding main recorded.

## Not exercised
- turnId from main.ts (Task 7; the three main.ts lines only by the smoke).
- The coding-framing drop inside the real WhatToAnswerLLM (stubbed here; Task 5's tests cover it); `chars` is "built", not "inserted" (m3).
- The catch-branch line carries a trailing ` error="<message>"` per the plan's code (the test regex has no end anchor there); an error message could in principle include text, but only from our own code's exceptions.
- Real SDK / built dist: nothing live.

## Notes
- Implemented via node scripts with unique-anchor asserts (the Bash tool refused in this worktree session); LF kept. Scripts in SP\eq-tmp\stage\ (extract6.mjs, impl6.mjs, mut6.mjs, runt.ps1).
- Vitest left <WT>\node_modules\.vite maybe; Task 8 deletes it.
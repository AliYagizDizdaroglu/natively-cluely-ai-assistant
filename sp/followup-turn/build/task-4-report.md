# Task 4 report: SessionTracker holds the question ledger

Status: DONE. Commit eac6265 on build/earlier-question (WT eq-build), after 51d5296.

Files: electron/SessionTracker.ts (+22: import, 2 fields, recordAskedQuestion, getAskedQuestions, 2 lines in reset()), electron/SessionTracker.askedQuestions.test.ts (new, 5 tests, plan text verbatim). No other file touched.

Evidence
- Step 2 (red): 5/5 failed, "recordAskedQuestion is not a function".
- Step 4 (green): askedQuestions 5/5; SessionTracker.test.ts 5/5 (10 passed total).
- Root tsc: exit 0, no output. Electron tsc: 6 errors, identical to tsc-electron-baseline.txt (Compare-Object empty); none in SessionTracker.ts. List in build\task-4-tsc-electron.txt.
- Mutants (each run vs the test file, all caught; restored file = 5/5):
  - M1 reset() lines removed: 1 failed (reset test) - the plan's Step 5 calibration.
  - M2 reset clears ledger but not seq: 1 failed.
  - M3 seq never incremented: 2 failed.
  - M4 in-place push instead of replacing the array: 3 failed (incl. the snapshot test).
- reset() edit anchored on reset()'s own block (not clearCodingQuestion at :162).

Not shown / concerns
- The snapshot-length test is also failed by M4 together with two other tests, so it is not isolated by that single mutant.
- Blank text / turnId 0 behaviour comes from recordAsked (Task 2), not re-tested here.
- Writes went directly into WT (no stage copy needed). MAIN's working tree untouched. WT status clean after commit.

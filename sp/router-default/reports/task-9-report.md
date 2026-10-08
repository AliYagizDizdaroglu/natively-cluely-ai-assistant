# Task 9 report: unknown-marker filter (WT-C, branch feat/live-router-c)

Status: DONE. Commit d15eef5 (on 17d199d).

Files (only the three the plan names):
- electron/llm/unknownMarkerFilter.ts (new, plan's code verbatim)
- electron/llm/unknownMarkerFilter.test.ts (new, 10 tests)
- electron/llm/WhatToAnswerLLM.ts: import added after lastInterviewerTurn; `filtered` wrapped outermost in stripUnknownMarkers (model label is re-inserted outside `filtered`, by nameStallSwitch, unchanged).

Tests: unknownMarkerFilter (10) plus all WhatToAnswerLLM.* and verbalStreamFilter* test files: 12 files, 221 passed, 0 failed.
RED: stub (identity) module first; 7 of 10 failed on the right assertions (e.g. expected 'a __FOO__ b' to be 'a  b'; placement: output still contained __S1Q05__). The 3 passing on the stub were the keep/passthrough cases, as expected.
Placement tests: `["Hello __S1Q05__ world"]` and a split `["Hello __S1Q","05__ world"]` through WhatToAnswerLLM.generateStream (verbal intent); both no longer show the marker. Existing hedge/answeringModel tests stay green.

tsc: root 0 errors; electron config 6 errors (equals the baseline count; none introduced).

Deviation: the plan's "end of stream tail __ab then flush -> 'tail __ab'" is asserted as the per-call outputs ['tail ', '__ab'] (push releases 'tail ', flush releases '__ab'); concatenation is 'tail __ab'.

Not exercised: the real app / a live model stream; the hedge-winner sentinel chunk through a real hedge (covered only by the existing hedge tests staying green); a marker split such that the stripper holds a trailing `_`/`__` across a model-label chunk boundary.
Concerns: none. Stage dir task-9 contains the staged copies only.

Fix round 1: uppercase-only rule per controller ruling, plus tests (dunders, split known markers, trailing _, negotiationCoaching key, hedge-sentinel placement pin; mutation seen to fail) and the stale comment fix. 230 passed / 0 failed in 12 files; tsc 0 / 6 (baseline).

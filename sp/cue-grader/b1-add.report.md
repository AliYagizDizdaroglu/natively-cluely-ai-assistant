# b1 added to the cue grader kit (ids and counts only)

Files changed (lines now; sha256):
- lib.mjs 158 (+2): RUN_NAMES.b1, parseTag accepts b1-inapp.g1|g2, ALL_TAGS +2. 7c3f74584bafca20948dea15d68da7e7b7a1e3521f31a71c1107589926673afc
- extract.mjs 148 (+0 net, 2 lines edited): b1 uses the r1 Router-turn join; answerGrades(b1) reads sp\bundle-1\flight\grade\verdicts\verdicts.inapp.g1|g2.json. 76703d84385b4dfd0bcf61b97f28a744676d8ce78a1f73a817f79668f48164ce
- export.mjs 105 (+2): EXPECTED_REAL.b1 = {inapp:27}; arms skipped when no expected count; trim version check skipped for inapp-only runs; CLI accepts b1. 18f3001032e19a1cc443697114f30d4ba496ceb9c247f322429b08768904d432
- score-cue.mjs 220 (+2): --real loads b1 and its answer grades; b1 section reported informational (build facts like r1, no bare-arm lines); b1 EXCLUDED from the pooled reading (readRuns); row logic untouched. c5ff3d249b2cf6d35e1102c8ee93505454eaaea11af3d8305a7ae89af6579220
- cal-kit.mjs 414 (2 labels/counts): tag count 22 -> 24, 13 -> 14 files. b42e7eb9328400554b743d119f28daf311b9bd5b6688657e81427d6eea6368b9
- cal-launch-grader-cue.mjs 325 (1 line): plan lists 22 -> 24 tags. 56c02ba469e7b84016dc0aef9b0179ec190d3d714cf3c96fcf65983425d77a2d
Untouched: rubric.md, SPEC, thresholds.*, *.sha, dispatch (hashes verified equal to the frozen *.sha), launch-grader-cue.mjs, trim.mjs.

Calibration (fake claude only):
- before: cal-kit 82/88 (6 FAIL), cal-launch 94/94
- after (with the two 22->24 count edits): cal-kit 82/88 (the SAME 6 FAIL lines, none new), cal-launch 94/94
- the 6 cal-kit FAILs are PRE-EXISTING and not caused by this change: trimCues identical-builds check (MAIN dist trimCues now differs: bundle-1 cue-trim), plants S1Q03F/cut, export/scorer/freeze "no exception" (null .split/.lab), freeze K2 (thresholds now confirmed).
- before my 22->24 fix the same run showed 81/88 and 93/94 (the two hard-coded tag counts).
- r1 score-cue --real output unchanged (body equals report.md).

export real b1: exit 0. b1-inapp: 16 blocks, pairs sha12 8e5bde6d764c, file p-ed37f610.json; counts {"inapp":{"blocks":27,"graded":16,"empty":11}}; key keyhold\key.b1-inapp.json. (Re-run refuses: never overwrites.)
Count note: the log has 48 cue lines, 24 non-empty. 20 shown=live (shadow, excluded), 28 pipeline-shown: 1 unjoined (turn 2, no judge-pair answer match), 27 joined = 16 with cues + 11 empty arrays. So 16 are gradable, not 24. All 27 joined answers are graded acceptable by the flight.
Note: export's trimCues version check (MAIN dist differs from r1/h40d/eq builds) was skipped for b1, since it guards bare-arm trimming only and b1 exports no arms. r1/h40d export still runs it (and would currently refuse).

Dry run: node launch-grader-cue.mjs b1-inapp.g1 --model-id claude-opus-5-5 --dry-run exit 0: 2 graders, 16 items, fresh cwd, sessions so far 12 of 26, probe gate: OK (no fresh probes needed), hashes OK. Nothing launched.
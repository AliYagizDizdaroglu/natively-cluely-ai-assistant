# b1r2 added to the cue grader kit (ids and counts only)

Run folder 2026-10-13T03-23-31-b1-final-r2, in-app only, tags b1r2-inapp.g1|g2, informational like b1, never pooled.

Files changed (lines now; sha256):
- lib.mjs 160: RUN_NAMES.b1r2, parseTag accepts b1r2-inapp.g1|g2, ALL_TAGS +2 (now 26). 704dc9b2405910f0a63b678562cba5ddd34221fae78c91c171c17806e472fbdc
- extract.mjs 148: b1r2 uses the Router-turn join; answerGrades(b1r2) reads sp\bundle-1\flight\grade-r2\verdicts\verdicts.inapp.g1|g2.json. 0005d7d2f42cbcb2c638b5e1e12fd14e62c3602e0aa7d7595314be49ebac46e5
- export.mjs 105: EXPECTED_REAL.b1r2 = {inapp:28}; CLI accepts b1r2. 87c03bffbb8e1bbff546b5c04d7aee0061fe0e017eab5ff34c910959a8657286
- score-cue.mjs 221: INFO = [b1, b1r2] (informational, excluded from the pooled reading); --real loads b1r2 and its answer grades; a missing grade file (ENOENT) prints "not yet" instead of failing. b20d511da818e41b8ddc3ae68a1949298f7d7bef00e4c5a247821214a6dc4763
- cal-kit.mjs 414 (2 labels/counts): tags 24 -> 26, files 14 -> 15. bd79aea922cf0bb509f819c1433000ad433760aa2a7bac46fce0d93f5eb2cccd
- cal-launch-grader-cue.mjs 325 (label + hard-coded count 24 -> 26). feaee2d973b5f1b1cda740643a6f47e2264016e29d6961d03e9bd54032cad0f1
Untouched: rubric.md, SPEC, thresholds.*, *.sha, dispatch (rubric/spec/thresholds sha prefixes equal the frozen *.sha), launch-grader-cue.mjs, trim.mjs.

Join and "not yet": b1's join did NOT tolerate missing grade files (answerGrades threw ENOENT inside --real). Now score-cue catches ENOENT only and reports "not yet". The branch was NOT exercised live: at run time grade-r2\verdicts already existed (46 grades; b1r2 blocks join 27 acceptable, 1 weak, 0 unjoined-by-grade). ENOENT code confirmed for a missing file, but the printed "not yet" line was never produced. Also b1r2 does not appear in score-cue --real until its cue verdicts exist (same as b1 before grading).

Count note: 49 cue lines / 49 fulls / 49 routers; 30 pipeline-shown, 19 live-shown (excluded). Joined 28 (not 27 as for b1), unjoined 2 (no judge-pair answer match), 11 empty, 17 gradable.

Calibration (fake claude only):
- cal-kit 82/88, the SAME 6 pre-existing FAIL lines as after b1 (trimCues identical-builds, plants S1Q03F/cut, export/scorer/freeze "no exception", freeze K2); none new.
- cal-launch 94/94 (first run 93/94: a second hard-coded 24 at line 297, fixed to 26).

export real b1r2: exit 0. b1r2-inapp: 17 blocks, pairs sha12 cc2cfa0a6729, file p-10b195cf.json; counts {"inapp":{"blocks":28,"graded":17,"empty":11}}. (Re-run refuses: never overwrites.)

Dry run: node launch-grader-cue.mjs b1r2-inapp.g1 --model-id claude-opus-5-5 --dry-run exit 0: 2 graders, 17 items, fresh cwd, probe gate OK. Nothing launched.

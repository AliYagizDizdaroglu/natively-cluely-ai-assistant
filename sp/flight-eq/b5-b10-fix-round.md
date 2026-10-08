# b5 / b10 fix round (00:59 TST), after b5-b10-review.md

New shas: b5 `eq-flight-read.mjs` 53151846367b, cal txt c895b360fbc8 (90 PASS / 0 FAIL), 30 of 30 mutants flip.
b10 `eq-cues-export.mjs` 952182ae4eea, cal txt 16fce1aae09e (101 PASS / 0 FAIL), 16 of 16 mutants flip.
Leak scan of every output (680 cue strings, 59 smoke-prompt samples): 0 hits.

B1 flag off / absent startup -> VOID 1(a) + 1(c), exit 1. B2 errors print class + file:line only; a malformed cues line is a named refusal. I1 twins checked against prompts.json keys (else timeline items). I2 superseded only for the same id. I3 unread cueBlocks = INCOMPLETE. I4 INCOMPLETE counts in exit code and summary. I5 dropped capture lines = INCOMPLETE. I6 every LABEL capture is 5d-read. I7 cause keyed by log line. I8 4d/4e text by cause. I9 referent printed for mains. I10 verbal-diag route line is the fast-route signature. m3, m4 done; m7 override flags refused unless EQ_CAL_OVERRIDES=1.
Not done: I11 leak checker, m2 (an extend continuation still refuses the whole export), m5, m6.

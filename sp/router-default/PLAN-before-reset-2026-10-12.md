# Plan to the weekly quota reset (Mon 2026-10-12 16:00 TST) — approved by the user 2026-10-07 23:03

Goal: remove pipeline defects without regressions or added latency, then one final flight graded before the reset.
Budget: Claude weekly ~80% used at 23:00 Wed; plan spends ~13-15%, no slack for a second fix round.

| When | Item | Done means |
|---|---|---|
| Running (own session) | #1 harness prompt-matching fix (task_8b76dce8) | failing test first, fix, Opus review, prompts.json check detects a shift |
| Wed night | #2 cue line cut mid-phrase -> trim at a phrase boundary or drop the line | test first; Opus review; cue checks still pass |
| Wed night | #3 offline routing probe: would "Live says easy AND classifier says easy" catch RH04/05/07/08 without blocking easy? | counts only; decides #5's design |
| Thu 8, after 10:00 | #4 3.8 Flash retry (probe one request first; resume built in) | graded A/B, defect vs ceiling table |
| Thu 8 | ONE combined spec (Opus) + review (Opus) + build (Sonnet) + code review (Opus): #5 two-key routing; #6 short-answer rule (1-2-word answer first + one sentence, ~15-25 words; pipeline + Live instruction); #7 cues by type (none on 1-2-word and easy-short, on for hard/many-part; cue rule not sent when not needed; bold the first words); #8 cue line per asked part (max 3, grouped); silent-listener detection (no ear text for N s while Deepgram hears speech -> treat as failed -> 2.5 failover) | all gates green, typecheck baseline unchanged |
| Fri 9 | Replay bench on r1 captured prompts (needs #1): quality, words, thinking tokens, TTFT; offline routing replay on smoke + r1 recordings | pre-registered bars: no quality loss, no latency increase |
| Sat 10 | App smoke via scheduled task + FAULT DRILL: kill the router mid-run (pipeline takes over within one question, router reconnects); force the ear to failed (2.5 failover live) | clean smoke + both drills pass |
| Sun 11 03:00 | Final flight (pre-registered: no regression, no latency increase, routing, safety, cue grading of its blocks) | flown, graded Sun morning, result note + pass record committed |
| After the reset | #9 long-but-incomplete answers; #10 Live answer depth; #11 h40d cue grading; #12 flight-eq re-fly + follow-up add-on set (4 easy + 4 hard, parent > 120 s); paid 3.8 Flash on hard answers | |

Stop rules: a failed bench or smoke stops the chain (root cause, fix, re-check); if that costs the slack, the flight moves after the reset. Nothing ships without its bars.

## Update 2026-10-07 23:2x: #3 probe result
The two-key rule on the pipeline classifiers is NOT viable: no difficulty/multi-part detector exists offline; regex catches 0 of 4 misroutes, the keyword label 2 of 4 but blocks 6-7 of 20 easy. Best offline proxy: question length (<= 12 words: 3 of 4 caught on roster text, 1 of 20 easy blocked) but the cutoff was picked after seeing the data (fitted). #5 for Thursday's spec becomes: a stricter hard bias in the Live router instruction and/or a length guard, tuned on live40 and VALIDATED on scenario50 audio (never holdout) via the offline Live runner before the flight.

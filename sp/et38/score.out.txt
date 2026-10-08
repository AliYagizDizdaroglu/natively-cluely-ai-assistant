# ET38 result: 3.8 Live Extended Thinking, low and medium, against the app's 3.5-flash-lite HIGH (br1), 38 scenario50 items

Rule: PREREGISTER-et38.md (written before any ET38 audio). Graders: eight claude-opus-5-5 agents, two per packet, blind, frozen s50k rubric; agreement on acceptable 147/155.

| sample | rate, answered only | acceptable of 38 (holes = not) | hard 10 | normal 28 | consensus-wrong | holes |
|---|---|---|---|---|---|---|
| br1-inapp | 0.649 | 24.0 | 0.600 | 0.667 | 0 | 1 |
| et-low-r1 | 0.600 | 18.0 | 0.643 | 0.587 | 1 | 8 |
| et-low-r2 | 0.517 | 15.5 | 0.357 | 0.565 | 1 | 8 |
| et-low-r3 | 0.724 | 21.0 | 0.571 | 0.773 | 0 | 9 |
| et-medium-r1 | 0.741 | 21.5 | 0.688 | 0.762 | 0 | 9 |

**The anchor:** br1 graded again reads 0.649; L20c read it 0.770; the anchor DOES NOT HOLD (within 0.05). L20c's app samples: mean 0.752, worst 0.658 (not graded again). br1's consensus-wrong now: 0.

## ET-low

1. quality: mean rate 0.614 >= br1 0.649 - 0.05 = 0.599 -> PASS; >= 0.702 (L20c's app mean - 0.05) -> not read
2. band: worst run 0.517 >= 0.658 (the app's worst sample in L20c) -> not read
3. safety: consensus-wrong 2 <= 1 -> FAIL
4. reliability: answered 89/114, need >= 110 -> FAIL
5. speed: first word of the real answer p50 2.2 s <= 6.6 s and p90 11.4 s <= 14.6 s (answered items with a normal feed: 89) -> PASS

**Verdict, ET-low: STOP: its answers are not good enough to replace or race the app's.**

Reported: last word of the answer p50 30.7 s, p90 49.9 s (the app's text is complete within about a second of its first token; br1's first token: p50 6.6 s, p90 14.6 s).
- et-low-r1: answered 30/38; holes S1Q05F S1Q07 S1Q07F S1Q03F S1Q06F S2Q08F S1Q10F S2Q05F (system-error apologies: S1Q05F S1Q07 S1Q07F S1Q03F S1Q06F S2Q08F S1Q10F S2Q05F); abnormal sessions 0 of 19; first word p50 2.2 s; a holding line on 8/30; slow feed none; started 2026-09-30T21:11:51.951Z
- et-low-r2: answered 30/38; holes S1Q04F S1Q05F S1Q07 S2Q01F S1Q08F S2Q03F S2Q05 S2Q07F (system-error apologies: S1Q04F S1Q05F S1Q07 S2Q01F S1Q08F S2Q03F S2Q05 S2Q07F); abnormal sessions 0 of 19; first word p50 2.0 s; a holding line on 7/30; slow feed none; started 2026-09-30T21:46:24.742Z
- et-low-r3: answered 29/38; holes S1Q02F S1Q04F S2Q02F S1Q06 S1Q06F S1Q09 S2Q03F S2Q06 S2Q06F (system-error apologies: S1Q02F S1Q04F S2Q02F S1Q06 S1Q06F S1Q09 S2Q03F S2Q06 S2Q06F); abnormal sessions 0 of 19; first word p50 5.9 s; a holding line on 15/29; slow feed none; started 2026-09-30T22:18:43.018Z

## ET-medium

1. quality: mean rate 0.741 >= br1 0.649 - 0.05 = 0.599 -> PASS; >= 0.702 (L20c's app mean - 0.05) -> not read
2. band: worst run 0.741 >= 0.658 (the app's worst sample in L20c) -> not read
3. safety: consensus-wrong 0 <= 1 -> PASS
4. reliability: answered 29/38 after 1 run(s) -> not read
5. speed: first word of the real answer p50 9.5 s <= 6.6 s and p90 16.7 s <= 14.6 s (answered items with a normal feed: 29) -> FAIL

**Verdict, ET-medium: STOP on reliability (stopped early: 9 holes after 1 run(s), so 110 of 114 is out of reach); its 1 run(s) are reported below.**

Reported: last word of the answer p50 33.0 s, p90 61.9 s (the app's text is complete within about a second of its first token; br1's first token: p50 6.6 s, p90 14.6 s).
- et-medium-r1: answered 29/38; holes S1Q04 S1Q04F S1Q08F S2Q03 S2Q03F S2Q05 S2Q05F S2Q06F S2Q10F (system-error apologies: S1Q04 S1Q04F S1Q08F S2Q03 S2Q03F S2Q05 S2Q05F S2Q06F S2Q10F); abnormal sessions 1 of 20; first word p50 9.5 s; a holding line on 17/29; slow feed none; started 2026-09-30T22:55:49.193Z

## Outside the rule

- holes (not graded): et-low-r3 S1Q09, et-low-r3 S2Q02F, br1-inapp S1Q08, et-low-r2 S1Q08F, et-medium-r1 S1Q08F, et-low-r1 S2Q08F, et-low-r2 S2Q01F, et-medium-r1 S2Q03, et-low-r2 S2Q03F, et-low-r3 S2Q03F, et-medium-r1 S2Q03F, et-low-r2 S2Q07F, et-low-r3 S2Q06, et-low-r3 S2Q06F, et-medium-r1 S2Q06F, et-low-r1 S1Q03F, et-low-r1 S1Q07, et-low-r2 S1Q07, et-low-r1 S1Q07F, et-low-r1 S1Q10F, et-low-r3 S1Q02F, et-medium-r1 S2Q10F, et-low-r2 S2Q05, et-medium-r1 S2Q05, et-low-r1 S2Q05F, et-medium-r1 S2Q05F, et-medium-r1 S1Q04, et-low-r2 S1Q04F, et-low-r3 S1Q04F, et-medium-r1 S1Q04F, et-low-r1 S1Q05F, et-low-r2 S1Q05F, et-low-r3 S1Q06, et-low-r1 S1Q06F, et-low-r3 S1Q06F

## Per question (acceptable grades of 2 per sample)

| id | group | br1-inapp | et-low-r1 | et-low-r2 | et-low-r3 | et-medium-r1 |
|---|---|---|---|---|---|---|
| S1Q02 | hard | 2 | 1 | 1 | 0 | 1 |
| S1Q02F | hard | 2 | 2 | 0 | hole | 2 |
| S1Q04 | hard | 2 | 2 | 0 | 0 | hole |
| S1Q04F | hard | 0 | 0 | hole | hole | hole |
| S1Q05 | hard | 2 | 2 | 0 | 2 | 2 |
| S1Q05F | hard | 0 | hole | hole | 2 | 2 |
| S1Q07 | hard | 2 | hole | hole | 0 | 0 |
| S1Q07F | hard | 2 | hole | 2 | 2 | 2 |
| S2Q02 | hard | 0 | 0 | 0 | 2 | 2 |
| S2Q02F | hard | 0 | 2 | 2 | hole | 0 |
| S1Q03 | normal | 0 | 0 | 2 | 0 | 2 |
| S1Q03F | normal | 2 | hole | 2 | 2 | 2 |
| S1Q06 | normal | 0 | 2 | 2 | hole | 2 |
| S1Q06F | normal | 0 | hole | 2 | hole | 2 |
| S2Q01 | normal | 2 | 0 | 0 | 0 | 0 |
| S2Q01F | normal | 0 | 0 | hole | 2 | 2 |
| S2Q08 | normal | 2 | 2 | 2 | 2 | 2 |
| S2Q08F | normal | 0 | hole | 2 | 2 | 2 |
| S2Q09 | normal | 2 | 2 | 2 | 2 | 2 |
| S2Q09F | normal | 0 | 2 | 2 | 1 | 2 |
| S1Q08 | normal | hole | 2 | 0 | 0 | 0 |
| S1Q08F | normal | 2 | 2 | hole | 2 | hole |
| S1Q09 | normal | 2 | 0 | 0 | hole | 0 |
| S1Q09F | normal | 0 | 2 | 2 | 2 | 2 |
| S1Q10 | normal | 2 | 2 | 0 | 2 | 2 |
| S1Q10F | normal | 2 | hole | 0 | 2 | 2 |
| S2Q03 | normal | 2 | 0 | 0 | 2 | hole |
| S2Q03F | normal | 2 | 0 | hole | hole | hole |
| S2Q04 | normal | 2 | 0 | 1 | 2 | 0 |
| S2Q04F | normal | 2 | 0 | 2 | 2 | 2 |
| S2Q05 | normal | 2 | 2 | hole | 2 | hole |
| S2Q05F | normal | 0 | hole | 0 | 2 | hole |
| S2Q06 | normal | 2 | 2 | 2 | hole | 2 |
| S2Q06F | normal | 0 | 0 | 0 | hole | hole |
| S2Q07 | normal | 2 | 1 | 1 | 1 | 2 |
| S2Q07F | normal | 2 | 2 | hole | 2 | 2 |
| S2Q10 | normal | 2 | 2 | 0 | 2 | 0 |
| S2Q10F | normal | 2 | 2 | 2 | 0 | hole |

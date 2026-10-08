# ET38 result: 3.8 Live Extended Thinking, low and medium, against the app's 3.5-flash-lite HIGH (br1), 38 scenario50 items

Rule: PREREGISTER-et38.md (written before any ET38 audio). Graders: eight claude-opus-5-5 agents, two per packet, blind, frozen s50k rubric; agreement on acceptable 180/180.

| sample | rate, answered only | acceptable of 38 (holes = not) | hard 10 | normal 28 | consensus-wrong | holes |
|---|---|---|---|---|---|---|
| br1-inapp | 0.757 | 28.0 | 0.400 | 0.889 | 0 | 1 |
| et-low-r1 | 1.000 | 35.0 | 1.000 | 1.000 | 0 | 3 |
| et-low-r2 | 0.579 | 22.0 | 0.200 | 0.714 | 0 | 0 |
| et-low-r3 | 1.000 | 38.0 | 1.000 | 1.000 | 0 | 0 |
| et-medium-r1 | 1.000 | 32.0 | 1.000 | 1.000 | 0 | 6 |

**The anchor:** br1 graded again reads 0.757; L20c read it 0.770; the anchor HOLDS (within 0.05). L20c's app samples: mean 0.752, worst 0.658 (not graded again). br1's consensus-wrong now: 0.

## ET-low

1. quality: mean rate 0.860 >= br1 0.757 - 0.05 = 0.707 -> PASS; >= 0.702 (L20c's app mean - 0.05) -> PASS
2. band: worst run 0.579 >= 0.658 (the app's worst sample in L20c) -> FAIL
3. safety: consensus-wrong 0 <= 1 -> PASS
4. reliability: answered 111/114, need >= 110 -> PASS
5. speed: first word of the real answer p50 1.7 s <= 6.6 s and p90 4.0 s <= 14.6 s (answered items with a normal feed: 111) -> PASS

**Verdict, ET-low: STOP: its answers are not good enough to replace or race the app's.**

Reported: last word of the answer p50 7.2 s, p90 14.2 s (the app's text is complete within about a second of its first token; br1's first token: p50 6.6 s, p90 14.6 s).
- et-low-r1: answered 35/38; holes S1Q02 S1Q02F S1Q09F; abnormal sessions 3 of 21; first word p50 1.7 s; a holding line on 0/35; slow feed none; started 2026-09-29T14:21:45.292Z
- et-low-r2: answered 38/38; holes none; abnormal sessions 0 of 19; first word p50 1.6 s; a holding line on 0/38; slow feed none; started 2026-09-29T14:39:20.136Z
- et-low-r3: answered 38/38; holes none; abnormal sessions 0 of 19; first word p50 2.0 s; a holding line on 0/38; slow feed none; started 2026-09-29T14:57:18.170Z

## ET-medium

1. quality: mean rate 1.000 >= br1 0.757 - 0.05 = 0.707 -> PASS; >= 0.702 (L20c's app mean - 0.05) -> PASS
2. band: worst run 1.000 >= 0.658 (the app's worst sample in L20c) -> PASS
3. safety: consensus-wrong 0 <= 1 -> PASS
4. reliability: answered 32/38 after 1 run(s) -> not read
5. speed: first word of the real answer p50 1.7 s <= 6.6 s and p90 4.2 s <= 14.6 s (answered items with a normal feed: 32) -> PASS

**Verdict, ET-medium: STOP on reliability (stopped early: 6 holes after 1 run(s), so 110 of 114 is out of reach); its 1 run(s) are reported below.**

Reported: last word of the answer p50 7.8 s, p90 10.9 s (the app's text is complete within about a second of its first token; br1's first token: p50 6.6 s, p90 14.6 s).
- et-medium-r1: answered 32/38; holes S1Q02 S1Q02F S1Q09F S1Q10 S2Q03 S2Q10 (system-error apologies: S1Q10 S2Q03 S2Q10); abnormal sessions 3 of 21; first word p50 1.7 s; a holding line on 0/32; slow feed none; started 2026-09-29T14:21:45.292Z

## Outside the rule

- holes (not graded): et-low-r1 S1Q09F, et-medium-r1 S1Q09F, br1-inapp S1Q08, et-medium-r1 S2Q03, et-medium-r1 S1Q10, et-low-r1 S1Q02, et-medium-r1 S1Q02, et-low-r1 S1Q02F, et-medium-r1 S1Q02F, et-medium-r1 S2Q10

## Per question (acceptable grades of 2 per sample)

| id | group | br1-inapp | et-low-r1 | et-low-r2 | et-low-r3 | et-medium-r1 |
|---|---|---|---|---|---|---|
| S1Q02 | hard | 0 | hole | 0 | 2 | hole |
| S1Q02F | hard | 0 | hole | 0 | 2 | hole |
| S1Q04 | hard | 0 | 2 | 0 | 2 | 2 |
| S1Q04F | hard | 0 | 2 | 0 | 2 | 2 |
| S1Q05 | hard | 0 | 2 | 0 | 2 | 2 |
| S1Q05F | hard | 0 | 2 | 0 | 2 | 2 |
| S1Q07 | hard | 2 | 2 | 0 | 2 | 2 |
| S1Q07F | hard | 2 | 2 | 0 | 2 | 2 |
| S2Q02 | hard | 2 | 2 | 2 | 2 | 2 |
| S2Q02F | hard | 2 | 2 | 2 | 2 | 2 |
| S1Q03 | normal | 0 | 2 | 0 | 2 | 2 |
| S1Q03F | normal | 0 | 2 | 0 | 2 | 2 |
| S1Q06 | normal | 0 | 2 | 0 | 2 | 2 |
| S1Q06F | normal | 2 | 2 | 0 | 2 | 2 |
| S2Q01 | normal | 2 | 2 | 2 | 2 | 2 |
| S2Q01F | normal | 2 | 2 | 2 | 2 | 2 |
| S2Q08 | normal | 2 | 2 | 2 | 2 | 2 |
| S2Q08F | normal | 2 | 2 | 2 | 2 | 2 |
| S2Q09 | normal | 2 | 2 | 2 | 2 | 2 |
| S2Q09F | normal | 2 | 2 | 2 | 2 | 2 |
| S1Q08 | normal | hole | 2 | 0 | 2 | 2 |
| S1Q08F | normal | 2 | 2 | 0 | 2 | 2 |
| S1Q09 | normal | 2 | 2 | 0 | 2 | 2 |
| S1Q09F | normal | 2 | hole | 0 | 2 | hole |
| S1Q10 | normal | 2 | 2 | 2 | 2 | hole |
| S1Q10F | normal | 2 | 2 | 2 | 2 | 2 |
| S2Q03 | normal | 2 | 2 | 2 | 2 | hole |
| S2Q03F | normal | 2 | 2 | 2 | 2 | 2 |
| S2Q04 | normal | 2 | 2 | 2 | 2 | 2 |
| S2Q04F | normal | 2 | 2 | 2 | 2 | 2 |
| S2Q05 | normal | 2 | 2 | 2 | 2 | 2 |
| S2Q05F | normal | 2 | 2 | 2 | 2 | 2 |
| S2Q06 | normal | 2 | 2 | 2 | 2 | 2 |
| S2Q06F | normal | 2 | 2 | 2 | 2 | 2 |
| S2Q07 | normal | 2 | 2 | 2 | 2 | 2 |
| S2Q07F | normal | 2 | 2 | 2 | 2 | 2 |
| S2Q10 | normal | 2 | 2 | 2 | 2 | hole |
| S2Q10F | normal | 2 | 2 | 2 | 2 | 2 |

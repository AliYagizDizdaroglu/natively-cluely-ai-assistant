# L20d result: 3.8 Live with a short instruction, against the app (s50m: in-app and captured-high r1-r3), 38 scenario50 items

Rule: PREREGISTER-l20d.md. Graders: eight claude-opus-5-5 agents, two per packet, blind, frozen s50k rubric; agreement on acceptable 373/373. Every rate is from this one batch.

| sample | rate, graded items | acceptable of 38 (holes = not) | rate, holes = not (/38) | hard 10 | normal 28 | consensus-wrong | graded | holes |
|---|---|---|---|---|---|---|---|---|
| l20d-r1 | 1.000 | 35.0 | 0.921 | 1.000 | 1.000 | 0 | 35 | 3 |
| l20d-r2 | 0.974 | 37.0 | 0.974 | 1.000 | 0.964 | 1 | 38 | 0 |
| l20d-r3 | 1.000 | 38.0 | 1.000 | 1.000 | 1.000 | 0 | 38 | 0 |
| app35-inapp | 0.789 | 30.0 | 0.789 | 0.400 | 0.929 | 0 | 38 | 0 |
| app35-twin1 | 0.789 | 30.0 | 0.789 | 0.400 | 0.929 | 0 | 38 | 0 |
| app35-twin2 | 0.784 | 29.0 | 0.763 | 0.400 | 0.926 | 0 | 37 | 1 |
| app35-twin3 | 0.789 | 30.0 | 0.789 | 0.400 | 0.929 | 0 | 38 | 0 |
| live38-r1 (anchor, reported only) | 1.000 | 35.0 | 0.921 | 1.000 | 1.000 | 0 | 35 | 3 |
| live38-r2 (anchor, reported only) | 1.000 | 38.0 | 1.000 | 1.000 | 1.000 | 0 | 38 | 0 |
| live38-r3 (anchor, reported only) | 1.000 | 38.0 | 1.000 | 1.000 | 1.000 | 0 | 38 | 0 |

Means (graded-items rate): new Live 0.991; app 0.788; anchor (29 Sep's Live, long prompt) 1.000.

## Decision (pre-registered)

1. quality: new Live mean rate 0.991 >= app mean rate 0.788 - 0.05 = 0.738 -> PASS
2. band: new Live worst rep 0.974 >= app worst sample 0.784 -> PASS
3. safety: new Live consensus-wrong 1 (111 graded answers) <= 1 + floor(0 x 0.75) = 1 (app: 151 graded answers of 152 slots) -> PASS
4. reliability: answered 111/114, need >= 110 -> PASS
5. speed: first word p50 1.8 s <= 3.0 s and p90 6.8 s <= 6.6 s over 114 slots (3 without a first word; 0 slow-feed answered items left out) -> FAIL

**Verdict: WAIT (clause 5 fails): the answers are good enough, but a starter without reliability or speed has no point; nothing is built; a re-test needs its own registration.**

## Reported outside the rule

- holes-as-not-acceptable read (no verdict comes from it): new Live mean 0.965, app mean 0.783; clause 1 would read PASS; worst rep 0.921 vs app worst 0.763: clause 2 would read PASS.
- the anchor: new Live - old Live = -0.009 (tonight's short instruction vs 29 Sep's long prompt, graded in one session); old Live - app = 0.212. L20c's old Live holes: live38-r1 S1Q02, live38-r1 S1Q02F, live38-r1 S1Q09F.
- holes (not graded): l20d-r1 S1Q02, live38-r1 S1Q02, l20d-r1 S1Q02F, live38-r1 S1Q02F, app35-twin2 S2Q06, l20d-r1 S1Q09F, live38-r1 S1Q09F
- app in-app answers served by the 3.1-lite stall fallback in s50m: S1Q03F, S1Q04, S1Q05, S1Q05F (kept, as the app ran).
- rep l20d-r1: window 2026-09-29T14:21:45.292Z; answered 35/38; holes S1Q02 S1Q02F S1Q09F; abnormal sessions 3 of 21; retried pairs S1Q02 S1Q04; quota closes 0; slow feed none
- rep l20d-r2: window 2026-09-29T14:39:20.136Z; answered 38/38; holes none; abnormal sessions 0 of 19; retried pairs none; quota closes 0; slow feed none
- rep l20d-r3: window 2026-09-29T14:57:18.170Z; answered 38/38; holes none; abnormal sessions 0 of 19; retried pairs none; quota closes 0; slow feed none
- starter reads (event timestamps, no grader): words of each answer arrived by 6.6 s after the question: p50 51 (n 111); last word p50 7.3 s, p90 14.2 s; words per answer p50 65 (L20c: 63-67 Live, 74-82 app); thought tokens per answer p50 256 (L20c: 91-952; the one-sentence probe 310); holding lines on 0 answers; premature output on 5 answers.
- words per graded answer, by arm (median): l20d-r1 69; l20d-r2 63; l20d-r3 66; app35-inapp 79; app35-twin1 83; app35-twin2 81; app35-twin3 76; live38-r1 69; live38-r2 63; live38-r3 66.
- grader agreement on acceptable, per packet: A 96/96; B 99/99; C 100/100; D 78/78.

## Per question (acceptable grades of 2 per sample)

| id | group | l20d-r1 | l20d-r2 | l20d-r3 | app35-inapp | app35-twin1 | app35-twin2 | app35-twin3 | live38-r1 | live38-r2 | live38-r3 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| S1Q02 | hard | hole | 2 | 2 | 0 | 0 | 0 | 0 | hole | 2 | 2 |
| S1Q02F | hard | hole | 2 | 2 | 0 | 0 | 0 | 0 | hole | 2 | 2 |
| S1Q04 | hard | 2 | 2 | 2 | 0 | 0 | 0 | 0 | 2 | 2 | 2 |
| S1Q04F | hard | 2 | 2 | 2 | 0 | 0 | 0 | 0 | 2 | 2 | 2 |
| S1Q05 | hard | 2 | 2 | 2 | 0 | 0 | 0 | 0 | 2 | 2 | 2 |
| S1Q05F | hard | 2 | 2 | 2 | 0 | 0 | 0 | 0 | 2 | 2 | 2 |
| S1Q07 | hard | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 |
| S1Q07F | hard | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 |
| S2Q02 | hard | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 |
| S2Q02F | hard | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 |
| S1Q03 | normal | 2 | 2 | 2 | 0 | 0 | 0 | 0 | 2 | 2 | 2 |
| S1Q03F | normal | 2 | 2 | 2 | 0 | 0 | 0 | 0 | 2 | 2 | 2 |
| S1Q06 | normal | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 |
| S1Q06F | normal | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 |
| S2Q01 | normal | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 |
| S2Q01F | normal | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 |
| S2Q08 | normal | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 |
| S2Q08F | normal | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 |
| S2Q09 | normal | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 |
| S2Q09F | normal | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 |
| S1Q08 | normal | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 |
| S1Q08F | normal | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 |
| S1Q09 | normal | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 |
| S1Q09F | normal | hole | 2 | 2 | 2 | 2 | 2 | 2 | hole | 2 | 2 |
| S1Q10 | normal | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 |
| S1Q10F | normal | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 |
| S2Q03 | normal | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 |
| S2Q03F | normal | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 |
| S2Q04 | normal | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 |
| S2Q04F | normal | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 |
| S2Q05 | normal | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 |
| S2Q05F | normal | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 |
| S2Q06 | normal | 2 | 2 | 2 | 2 | 2 | hole | 2 | 2 | 2 | 2 |
| S2Q06F | normal | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 |
| S2Q07 | normal | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 |
| S2Q07F | normal | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 |
| S2Q10 | normal | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 |
| S2Q10F | normal | 2 | 0 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 |

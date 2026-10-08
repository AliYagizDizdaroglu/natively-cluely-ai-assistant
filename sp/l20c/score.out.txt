# L20c result — 3.8 Live (bare) vs the app with 3.5-flash-lite HIGH first, 38 scenario50 items

Rule: PREREGISTER-l20c.md (written before any L20c audio and before any grading). Graders: eight claude-opus-5-5 agents, two per packet, blind, frozen s50k rubric; agreement on acceptable 290/299.

| sample | rate, answered only | acceptable of 38 (holes = not) | hard 10 | normal 28 | consensus-wrong | holes |
|---|---|---|---|---|---|---|
| app35-inapp | 0.658 | 25.0 | 0.700 | 0.643 | 0 | 0 |
| app35-twin1 | 0.763 | 29.0 | 0.600 | 0.821 | 0 | 0 |
| app35-twin2 | 0.784 | 29.0 | 0.600 | 0.852 | 0 | 1 |
| app35-twin3 | 0.803 | 30.5 | 0.750 | 0.821 | 0 | 0 |
| live38-r1 | 0.600 | 21.0 | 0.500 | 0.630 | 0 | 3 |
| live38-r2 | 0.566 | 21.5 | 0.300 | 0.661 | 0 | 0 |
| live38-r3 | 0.684 | 26.0 | 0.650 | 0.696 | 1 | 0 |
| br1-inapp (reported only) | 0.770 | 28.5 | 0.600 | 0.833 | 0 | 1 |

Means (answered-only rate): Live 0.617; app 0.752.

## Decision (pre-registered)

1. quality: Live mean rate 0.617 ≥ app mean rate 0.752 − 0.05 → FAIL
2. band: Live worst rep 0.566 ≥ app worst sample 0.658 → FAIL
3. safety: Live consensus-wrong 1 ≤ 1 + ⌊0 × 0.75⌋ = 1 → PASS
4. reliability tonight: L20c answered 53/54, need ≥ 52 → PASS
5. the scheduled 3-day gate: PENDING
   - 2026-09-29 04:30 PASS 5/5 answered, 0 abnormal (2026-09-29T01-30-04-215Z.json)
   - 2026-09-29 10:00 PASS 5/5 answered, 0 abnormal (2026-09-29T07-00-01-345Z.json)
   - 2026-09-29 20:00 PASS 5/5 answered, 0 abnormal (2026-09-29T17-00-01-280Z.json)
   - 2026-09-30 04:30 PASS 5/5 answered, 0 abnormal (2026-09-30T01-30-03-850Z.json)
   - 2026-09-30 10:00 PASS 5/5 answered, 0 abnormal (2026-09-30T07-00-01-163Z.json)
   - 2026-09-30 20:00 PENDING not yet
   - 2026-10-01 04:30 PENDING not yet
   - 2026-10-01 10:00 PENDING not yet
   - 2026-10-01 20:00 PENDING not yet

**Verdict: STOP — Live answers are not good enough to be shown first; no racer.**

## Timing (reported, not a condition; after the question ends)

- app, s50m in-app (3.5-lite HIGH first), first token on the 38 items: p50 6.1 s, p90 14.3 s (n=38)
- Live, first word over 114 (a hole = no first word): p50 1.8 s, p90 6.4 s

## Outside the rule

- holes (not graded): br1-inapp S1Q08, live38-r1 S1Q02, live38-r1 S1Q02F, live38-r1 S1Q09F, app35-twin2 S2Q06

## Per question (acceptable grades of 2 per sample)

| id | group | app35-inapp | app35-twin1 | app35-twin2 | app35-twin3 | live38-r1 | live38-r2 | live38-r3 | br1-inapp |
|---|---|---|---|---|---|---|---|---|---|
| S1Q02 | hard | 2 | 2 | 2 | 2 | hole | 0 | 0 | 2 |
| S1Q02F | hard | 2 | 2 | 2 | 2 | hole | 2 | 2 | 2 |
| S1Q04 | hard | 2 | 0 | 0 | 1 | 2 | 0 | 0 | 2 |
| S1Q04F | hard | 0 | 0 | 0 | 0 | 2 | 2 | 2 | 0 |
| S1Q05 | hard | 2 | 2 | 2 | 2 | 2 | 0 | 2 | 0 |
| S1Q05F | hard | 2 | 2 | 0 | 2 | 0 | 0 | 1 | 2 |
| S1Q07 | hard | 2 | 2 | 2 | 2 | 0 | 0 | 2 | 2 |
| S1Q07F | hard | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 |
| S2Q02 | hard | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| S2Q02F | hard | 0 | 0 | 2 | 2 | 0 | 0 | 2 | 0 |
| S1Q03 | normal | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 |
| S1Q03F | normal | 0 | 2 | 2 | 2 | 2 | 2 | 2 | 2 |
| S1Q06 | normal | 0 | 0 | 0 | 0 | 2 | 2 | 2 | 0 |
| S1Q06F | normal | 1 | 0 | 2 | 2 | 2 | 0 | 2 | 2 |
| S2Q01 | normal | 1 | 2 | 2 | 2 | 1 | 1 | 0 | 2 |
| S2Q01F | normal | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 |
| S2Q08 | normal | 0 | 2 | 2 | 2 | 0 | 2 | 2 | 2 |
| S2Q08F | normal | 0 | 2 | 2 | 2 | 2 | 2 | 2 | 0 |
| S2Q09 | normal | 2 | 2 | 2 | 2 | 2 | 0 | 2 | 2 |
| S2Q09F | normal | 2 | 2 | 2 | 2 | 0 | 2 | 2 | 2 |
| S1Q08 | normal | 2 | 2 | 2 | 2 | 0 | 0 | 0 | hole |
| S1Q08F | normal | 2 | 2 | 2 | 2 | 0 | 2 | 2 | 2 |
| S1Q09 | normal | 2 | 2 | 2 | 2 | 2 | 0 | 0 | 2 |
| S1Q09F | normal | 0 | 2 | 2 | 2 | hole | 2 | 2 | 0 |
| S1Q10 | normal | 2 | 2 | 2 | 2 | 2 | 2 | 1 | 2 |
| S1Q10F | normal | 2 | 2 | 2 | 0 | 2 | 2 | 2 | 2 |
| S2Q03 | normal | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 |
| S2Q03F | normal | 2 | 2 | 2 | 2 | 0 | 0 | 0 | 2 |
| S2Q04 | normal | 2 | 2 | 2 | 2 | 2 | 2 | 0 | 2 |
| S2Q04F | normal | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 |
| S2Q05 | normal | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 |
| S2Q05F | normal | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| S2Q06 | normal | 2 | 2 | hole | 2 | 2 | 2 | 2 | 2 |
| S2Q06F | normal | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| S2Q07 | normal | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 |
| S2Q07F | normal | 0 | 0 | 0 | 0 | 0 | 2 | 2 | 2 |
| S2Q10 | normal | 2 | 2 | 2 | 2 | 0 | 0 | 0 | 2 |
| S2Q10F | normal | 0 | 2 | 2 | 2 | 1 | 0 | 2 | 2 |

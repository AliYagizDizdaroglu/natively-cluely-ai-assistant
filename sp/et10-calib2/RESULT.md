# ET10b result — Extended Thinking medium and gemini-3.8-live bare vs the app, 10 hardest scenario50 items

Rule: PREREGISTER-et10b.md (written before the runs). Graders: two independent claude-opus-5-5 agents, blind, frozen rubric. Grader agreement on acceptable: 60/80.

| arm | acceptable g1 | g2 | mean | wrong (g1/g2) | delivery 0 (g1/g2) |
|---|---|---|---|---|---|
| app-inapp | 10 | 10 | 10.0 | 0/0 | 0/0 |
| app-twin1 | 10 | 10 | 10.0 | 0/0 | 0/0 |
| app-twin2 | 10 | 10 | 10.0 | 0/0 | 0/0 |
| app-twin3 | 10 | 10 | 10.0 | 0/0 | 0/0 |
| et-low | 10 | 10 | 10.0 | 0/0 | 0/0 |
| et-high | 10 | 10 | 10.0 | 0/0 | 0/0 |
| et-medium | 10 | 0 | 5.0 | 0/0 | 0/10 |
| live38 | 0 | 10 | 5.0 | 10/0 | 0/0 |

Best app arm mean: 10.0 of 10.

## Timing (question end → first word of the real answer)

- app (s50k in-app, 3.1-lite LOW): p50 7.5 s, p90 9.4 s (whole answer then streams in at text speed)
- et-low: real answer p50 6.2 s, p90 9.4 s; holding line on 5/10 at p50 1.4 s; last word p50 29.8 s, p90 56.4 s; words p50 84; thought tokens p50 2080; system-error/empty: none
- et-high: real answer p50 10.1 s, p90 17.1 s; holding line on 7/10 at p50 1.3 s; last word p50 31.4 s, p90 60.6 s; words p50 63; thought tokens p50 3720; system-error/empty: S1Q04F, S1Q07
- et-medium: real answer p50 11.5 s, p90 20.3 s; holding line on 8/10 at p50 1.9 s; last word p50 17.9 s, p90 62.7 s; words p50 17; thought tokens p50 447; system-error/empty: S1Q02F, S1Q04, S1Q05, S1Q07F, S2Q02F
- live38: real answer p50 1.9 s, p90 4.3 s; holding line on 0/10 at p50 —; last word p50 7.1 s, p90 12.6 s; words p50 66; thought tokens p50 462; system-error/empty: none

## Decision (pre-registered, all three per arm)

- et-medium: quality FAIL (5.0 vs best app 10.0), safety FAIL, speed FAIL → FAIL
- live38: quality FAIL (5.0 vs best app 10.0), safety FAIL, speed PASS → FAIL

**Verdict (each arm on its own): et-medium NOT VIABLE; live38 NOT VIABLE.**

## Per question (g1 g2: A acceptable, w weak, X wrong)

| id | app-inapp | app-twin1 | app-twin2 | app-twin3 | et-low | et-high | et-medium | live38 | ET-low ttft | ET-high ttft | ET-medium ttft | live38 ttft |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S1Q02 | AA | AA | AA | AA | AA | AA | Aw | XA | 1.8 | 2.0 | 1.7 | 1.9 |
| S1Q02F | AA | AA | AA | AA | AA | AA | Aw | XA | 0.7 | 9.8 | 7.0 | 0.8 |
| S1Q04 | AA | AA | AA | AA | AA | AA | Aw | XA | 1.3 | 16.8 | 11.5 | 1.2 |
| S1Q04F | AA | AA | AA | AA | AA | AA | Aw | XA | 9.4 | 8.6 | 14.5 | 2.2 |
| S1Q05 | AA | AA | AA | AA | AA | AA | Aw | XA | 3.0 | 2.2 | 13.7 | 4.3 |
| S1Q05F | AA | AA | AA | AA | AA | AA | Aw | XA | 9.3 | 1.3 | 20.3 | 1.5 |
| S1Q07 | AA | AA | AA | AA | AA | AA | Aw | XA | 6.5 | 10.1 | 1.4 | 2.2 |
| S1Q07F | AA | AA | AA | AA | AA | AA | Aw | XA | 6.2 | 11.8 | 8.6 | 0.6 |
| S2Q02 | AA | AA | AA | AA | AA | AA | Aw | XA | 2.3 | 17.1 | 12.1 | 1.9 |
| S2Q02F | AA | AA | AA | AA | AA | AA | Aw | XA | 7.3 | 13.4 | 9.8 | 2.0 |

## Grader reasons for the ET answers

- et-medium S1Q02: g1 "calibration" · g2 "calibration"
- et-medium S1Q02F: g1 "calibration" · g2 "calibration"
- et-medium S1Q04: g1 "calibration" · g2 "calibration"
- et-medium S1Q04F: g1 "calibration" · g2 "calibration"
- et-medium S1Q05: g1 "calibration" · g2 "calibration"
- et-medium S1Q05F: g1 "calibration" · g2 "calibration"
- et-medium S1Q07: g1 "calibration" · g2 "calibration"
- et-medium S1Q07F: g1 "calibration" · g2 "calibration"
- et-medium S2Q02: g1 "calibration" · g2 "calibration"
- et-medium S2Q02F: g1 "calibration" · g2 "calibration"
- live38 S1Q02: g1 "calibration" · g2 "calibration"
- live38 S1Q02F: g1 "calibration" · g2 "calibration"
- live38 S1Q04: g1 "calibration" · g2 "calibration"
- live38 S1Q04F: g1 "calibration" · g2 "calibration"
- live38 S1Q05: g1 "calibration" · g2 "calibration"
- live38 S1Q05F: g1 "calibration" · g2 "calibration"
- live38 S1Q07: g1 "calibration" · g2 "calibration"
- live38 S1Q07F: g1 "calibration" · g2 "calibration"
- live38 S2Q02: g1 "calibration" · g2 "calibration"
- live38 S2Q02F: g1 "calibration" · g2 "calibration"

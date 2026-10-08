# ET10 result — gemini-3.8-live-extended-thinking vs the app, 10 hardest scenario50 items

Rule: PREREGISTER-et10.md (written before the runs). Graders: two independent claude-opus-5-5 agents, blind, frozen rubric. Grader agreement on acceptable: 40/60.

| arm | acceptable g1 | g2 | mean | wrong (g1/g2) | delivery 0 (g1/g2) |
|---|---|---|---|---|---|
| app-inapp | 10 | 10 | 10.0 | 0/0 | 0/0 |
| app-twin1 | 10 | 10 | 10.0 | 0/0 | 0/0 |
| app-twin2 | 10 | 10 | 10.0 | 0/0 | 0/0 |
| app-twin3 | 10 | 10 | 10.0 | 0/0 | 0/0 |
| et-low | 0 | 10 | 5.0 | 10/0 | 0/0 |
| et-high | 10 | 0 | 5.0 | 0/0 | 0/10 |

Best app arm mean: 10.0 of 10.

## Timing (question end → first word of the real answer)

- app (s50k in-app, 3.1-lite LOW): p50 7.5 s, p90 9.4 s (whole answer then streams in at text speed)
- et-low: real answer p50 6.2 s, p90 9.4 s; holding line on 5/10 at p50 1.4 s; last word p50 29.8 s, p90 56.4 s; words p50 84; thought tokens p50 2080; system-error/empty: none
- et-high: real answer p50 10.1 s, p90 17.1 s; holding line on 7/10 at p50 1.3 s; last word p50 31.4 s, p90 60.6 s; words p50 63; thought tokens p50 3720; system-error/empty: S1Q04F, S1Q07

## Decision (pre-registered, all three per arm)

- et-low: quality FAIL (5.0 vs best app 10.0), safety FAIL, speed PASS → FAIL
- et-high: quality FAIL (5.0 vs best app 10.0), safety FAIL, speed FAIL → FAIL

**Verdict: NOT VIABLE — no app path; closed until a new model version.**

## Per question (g1 g2: A acceptable, w weak, X wrong)

| id | app-inapp | app-twin1 | app-twin2 | app-twin3 | et-low | et-high | ET-low ttft | ET-high ttft |
|---|---|---|---|---|---|---|---|---|
| S1Q02 | AA | AA | AA | AA | XA | Aw | 1.8 | 2.0 |
| S1Q02F | AA | AA | AA | AA | XA | Aw | 0.7 | 9.8 |
| S1Q04 | AA | AA | AA | AA | XA | Aw | 1.3 | 16.8 |
| S1Q04F | AA | AA | AA | AA | XA | Aw | 9.4 | 8.6 |
| S1Q05 | AA | AA | AA | AA | XA | Aw | 3.0 | 2.2 |
| S1Q05F | AA | AA | AA | AA | XA | Aw | 9.3 | 1.3 |
| S1Q07 | AA | AA | AA | AA | XA | Aw | 6.5 | 10.1 |
| S1Q07F | AA | AA | AA | AA | XA | Aw | 6.2 | 11.8 |
| S2Q02 | AA | AA | AA | AA | XA | Aw | 2.3 | 17.1 |
| S2Q02F | AA | AA | AA | AA | XA | Aw | 7.3 | 13.4 |

## Grader reasons for the ET answers

- et-low S1Q02: g1 "calibration" · g2 "calibration"
- et-low S1Q02F: g1 "calibration" · g2 "calibration"
- et-low S1Q04: g1 "calibration" · g2 "calibration"
- et-low S1Q04F: g1 "calibration" · g2 "calibration"
- et-low S1Q05: g1 "calibration" · g2 "calibration"
- et-low S1Q05F: g1 "calibration" · g2 "calibration"
- et-low S1Q07: g1 "calibration" · g2 "calibration"
- et-low S1Q07F: g1 "calibration" · g2 "calibration"
- et-low S2Q02: g1 "calibration" · g2 "calibration"
- et-low S2Q02F: g1 "calibration" · g2 "calibration"
- et-high S1Q02: g1 "calibration" · g2 "calibration"
- et-high S1Q02F: g1 "calibration" · g2 "calibration"
- et-high S1Q04: g1 "calibration" · g2 "calibration"
- et-high S1Q04F: g1 "calibration" · g2 "calibration"
- et-high S1Q05: g1 "calibration" · g2 "calibration"
- et-high S1Q05F: g1 "calibration" · g2 "calibration"
- et-high S1Q07: g1 "calibration" · g2 "calibration"
- et-high S1Q07F: g1 "calibration" · g2 "calibration"
- et-high S2Q02: g1 "calibration" · g2 "calibration"
- et-high S2Q02F: g1 "calibration" · g2 "calibration"

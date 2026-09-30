# ET10b result — Extended Thinking medium and gemini-3.8-live bare vs the app, 10 hardest scenario50 items

Rule: PREREGISTER-et10b.md (written before the runs). Graders: two independent claude-opus-5-5 agents, blind, frozen rubric. Grader agreement on acceptable: 74/80.

| arm | acceptable g1 | g2 | mean | wrong (g1/g2) | delivery 0 (g1/g2) |
|---|---|---|---|---|---|
| app-inapp | 5 | 5 | 5.0 | 0/0 | 0/0 |
| app-twin1 | 4 | 5 | 4.5 | 0/0 | 0/0 |
| app-twin2 | 4 | 4 | 4.0 | 1/0 | 0/1 |
| app-twin3 | 4 | 5 | 4.5 | 0/0 | 0/0 |
| et-low | 7 | 7 | 7.0 | 1/0 | 0/0 |
| et-high | 7 | 7 | 7.0 | 3/3 | 2/2 |
| et-medium | 3 | 3 | 3.0 | 7/6 | 6/6 |
| live38 | 6 | 6 | 6.0 | 0/0 | 0/0 |

Best app arm mean: 5.0 of 10.

## Timing (question end → first word of the real answer)

- app (s50k in-app, 3.1-lite LOW): p50 7.5 s, p90 9.4 s (whole answer then streams in at text speed)
- et-low: real answer p50 6.2 s, p90 9.4 s; holding line on 5/10 at p50 1.4 s; last word p50 29.8 s, p90 56.4 s; words p50 84; thought tokens p50 2080; system-error/empty: none
- et-high: real answer p50 10.1 s, p90 17.1 s; holding line on 7/10 at p50 1.3 s; last word p50 31.4 s, p90 60.6 s; words p50 63; thought tokens p50 3720; system-error/empty: S1Q04F, S1Q07
- et-medium: real answer p50 11.5 s, p90 20.3 s; holding line on 8/10 at p50 1.9 s; last word p50 17.9 s, p90 62.7 s; words p50 17; thought tokens p50 447; system-error/empty: S1Q02F, S1Q04, S1Q05, S1Q07F, S2Q02F
- live38: real answer p50 1.9 s, p90 4.3 s; holding line on 0/10 at p50 —; last word p50 7.1 s, p90 12.6 s; words p50 66; thought tokens p50 462; system-error/empty: none

## Decision (pre-registered, all three per arm)

- et-medium: quality FAIL (3.0 vs best app 5.0), safety FAIL, speed FAIL → FAIL
- live38: quality PASS (6.0 vs best app 5.0), safety PASS, speed PASS → PASS

**Verdict (each arm on its own): et-medium NOT VIABLE; live38 WORTH AN IN-APP PROTOTYPE on its own pre-registered hour.**

## Per question (g1 g2: A acceptable, w weak, X wrong)

| id | app-inapp | app-twin1 | app-twin2 | app-twin3 | et-low | et-high | et-medium | live38 | ET-low ttft | ET-high ttft | ET-medium ttft | live38 ttft |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S1Q02 | ww | wA | Xw | wA | Xw | XX | Xw | wA | 1.8 | 2.0 | 1.7 | 1.9 |
| S1Q02F | AA | AA | AA | ww | AA | AA | XX | ww | 0.7 | 9.8 | 7.0 | 0.8 |
| S1Q04 | AA | ww | Aw | ww | AA | AA | XX | ww | 1.3 | 16.8 | 11.5 | 1.2 |
| S1Q04F | ww | ww | ww | ww | AA | XX | AA | AA | 9.4 | 8.6 | 14.5 | 2.2 |
| S1Q05 | ww | ww | ww | AA | AA | AA | XX | AA | 3.0 | 2.2 | 13.7 | 4.3 |
| S1Q05F | ww | AA | ww | ww | ww | AA | AA | AA | 9.3 | 1.3 | 20.3 | 1.5 |
| S1Q07 | AA | AA | ww | AA | AA | XX | XX | AA | 6.5 | 10.1 | 1.4 | 2.2 |
| S1Q07F | AA | AA | AA | AA | AA | AA | XX | AA | 6.2 | 11.8 | 8.6 | 0.6 |
| S2Q02 | AA | ww | wA | ww | ww | AA | AA | Aw | 2.3 | 17.1 | 12.1 | 1.9 |
| S2Q02F | ww | ww | AA | AA | AA | AA | XX | ww | 7.3 | 13.4 | 9.8 | 2.0 |

## Grader reasons for the ET answers

- et-medium S1Q02: g1 "Selects 5,000 yet predicts 4,750 inside the band, a contradiction; never estimates 57% band precision; wrongly concludes the metrics are consistent." · g2 "TP and recall right, but backs out 4,750 predictions 'inside' a 5,000 band instead of computing 57% precision; flawed consistency argument."
- et-medium S1Q02F: g1 "System error message instead of an answer." · g2 "System error message instead of an answer."
- et-medium S1Q04: g1 "System error message instead of an answer." · g2 "System error message instead of an answer."
- et-medium S1Q04F: g1 "Correct: quickselect or argpartition, pairing scores with original row index or a heap on score and negative index." · g2 "Quickselect or argpartition, or a size-K heap keyed on score and negative row index, correctly preserves ties by original order."
- et-medium S1Q05: g1 "System error message instead of an answer." · g2 "System error message instead of an answer."
- et-medium S1Q05F: g1 "Excellent: legitimate for recurring scoring if windows do not cross the split; holdout for new subscribers or identity leakage." · g2 "Strong: repeated scoring mirrors production if windows do not cross the split; customer holdout for new subscribers or identity leakage."
- et-medium S1Q07: g1 "Four-word fragment with no content." · g2 "Four-word fragment; no answer to the design question."
- et-medium S1Q07F: g1 "System error message instead of an answer." · g2 "System error message instead of an answer."
- et-medium S2Q02: g1 "Rigorous: F1 denominator as gold plus predicted, claim-level hallucinations, intervals consistent with sample sizes. Too long." · g2 "Thorough: units, correct F1 denominator, dataset construction, intervals and kappa for each metric; figures unverifiable. About 120 words."
- et-medium S2Q02F: g1 "System error message instead of an answer." · g2 "System error message instead of an answer."
- live38 S1Q02: g1 "Correct 2,850 TP and 57% precision, but hand-waves 57 versus 60 as rounding; recall never stated explicitly." · g2 "Correct chain: 9,500 churners, 5,000 band, 2,850 TP, 57% precision; sensibly judges closeness to 60% within rounding. Concise and speakable."
- live38 S1Q02F: g1 "Directionally right but vague: asserts meaningful predictive power without the base-rate comparison; mentions offer cost versus revenue and band lift." · g2 "Right direction but no base-rate comparison; 'meaningful predictive power' is asserted, not shown. Offer cost and band lift are relevant needs."
- live38 S1Q04: g1 "Tie-break correct, but returns zeros even for invalid K, masking errors; lift phrasing divides true positives by prevalence." · g2 "Correct score-descending, index-ascending tie-break and metrics, but returning zeros for invalid k or empty input silently masks caller errors."
- live38 S1Q04F: g1 "Correct: heap keyed on score and negated index prefers the lower row index on ties; brief but accurate." · g2 "Heap-based partial selection keyed on score and negated index correctly prefers the lower row index on ties. Brief but correct."
- live38 S1Q05: g1 "Chronological split separated by the 30-day window; imputation, scaling and encoding fit only on train in one Pipeline. Correct." · g2 "Separates train and test by the 30-day window; imputation, scaling and encoding fit on training only inside a Pipeline. Correct."
- live38 S1Q05F: g1 "Correct: point-in-time rows are legitimate; customer-level holdout for generalization to completely new users." · g2 "Point-in-time rows are legitimate; customer holdout when evaluating generalization to new users by isolating IDs. Correct and concise."
- live38 S1Q07: g1 "Reasonable design with shared feature store and registry; omits ingestion. Slightly over length." · g2 "Compact correct design: shared feature store and registry, batch job plus FastAPI, Postgres, monitoring; ingestion and training thin. About 100 words."
- live38 S1Q07F: g1 "Tracking table of processed IDs plus registry-pinned model version for resume. Correct and concise." · g2 "Tracking table of processed IDs plus model version pinned for the whole batch. Correct, though brief."
- live38 S2Q02: g1 "Systematically defines unit and denominator for each metric; uncertainty and dataset construction generic but correct. Too long." · g2 "Correct units and denominators, but dataset construction and uncertainty are generic, with no sizes or interval methods. Long."
- live38 S2Q02F: g1 "Vague OCR ablation against a fallback layer; omits orchestration; judge checks via human annotations and position bias are fine." · g2 "OCR ablation vague ('fallback layer') and orchestration missing; judge bias checks thin."

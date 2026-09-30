# ET10 result — gemini-3.8-live-extended-thinking vs the app, 10 hardest scenario50 items

Rule: PREREGISTER-et10.md (written before the runs). Graders: two independent claude-opus-5-5 agents, blind, frozen rubric. Grader agreement on acceptable: 58/60.

| arm | acceptable g1 | g2 | mean | wrong (g1/g2) | delivery 0 (g1/g2) |
|---|---|---|---|---|---|
| app-inapp | 5 | 5 | 5.0 | 0/0 | 0/0 |
| app-twin1 | 5 | 5 | 5.0 | 0/0 | 0/0 |
| app-twin2 | 5 | 3 | 4.0 | 1/0 | 0/1 |
| app-twin3 | 4 | 4 | 4.0 | 0/0 | 0/0 |
| et-low | 8 | 8 | 8.0 | 0/1 | 0/0 |
| et-high | 7 | 7 | 7.0 | 3/3 | 2/2 |

Best app arm mean: 5.0 of 10.

## Timing (question end → first word of the real answer)

- app (s50k in-app, 3.1-lite LOW): p50 7.5 s, p90 9.4 s (whole answer then streams in at text speed)
- et-low: real answer p50 6.2 s, p90 9.4 s; holding line on 5/10 at p50 1.4 s; last word p50 29.8 s, p90 56.4 s; words p50 84; thought tokens p50 2080; system-error/empty: none
- et-high: real answer p50 10.1 s, p90 17.1 s; holding line on 7/10 at p50 1.3 s; last word p50 31.4 s, p90 60.6 s; words p50 63; thought tokens p50 3720; system-error/empty: S1Q04F, S1Q07

## Decision (pre-registered, all three per arm)

- et-low: quality PASS (8.0 vs best app 5.0), safety FAIL, speed PASS → FAIL
- et-high: quality PASS (7.0 vs best app 5.0), safety FAIL, speed FAIL → FAIL

**Verdict: NOT VIABLE — no app path; closed until a new model version.**

## Per question (g1 g2: A acceptable, w weak, X wrong)

| id | app-inapp | app-twin1 | app-twin2 | app-twin3 | et-low | et-high | ET-low ttft | ET-high ttft |
|---|---|---|---|---|---|---|---|---|
| S1Q02 | ww | AA | Xw | ww | wX | XX | 1.8 | 2.0 |
| S1Q02F | AA | AA | AA | ww | AA | AA | 0.7 | 9.8 |
| S1Q04 | AA | ww | Aw | ww | AA | AA | 1.3 | 16.8 |
| S1Q04F | ww | ww | ww | ww | AA | XX | 9.4 | 8.6 |
| S1Q05 | ww | ww | ww | AA | AA | AA | 3.0 | 2.2 |
| S1Q05F | ww | AA | ww | ww | AA | AA | 9.3 | 1.3 |
| S1Q07 | AA | AA | ww | AA | AA | XX | 6.5 | 10.1 |
| S1Q07F | AA | AA | AA | AA | AA | AA | 6.2 | 11.8 |
| S2Q02 | AA | ww | Aw | ww | ww | AA | 2.3 | 17.1 |
| S2Q02F | ww | ww | AA | AA | AA | AA | 7.3 | 13.4 |

## Grader reasons for the ET answers

- et-low S1Q02: g1 "Back-solves 4,750 predictions against a 5,000 band and asserts consistency within rounding; never computes 57% precision or 30% recall." · g2 "Says the band flags 5,000, then 4,750 predictions at 60% precision; self-contradictory, never computes 57%, wrongly concludes consistent."
- et-low S1Q02F: g1 "Correct imbalance reading, about 4x over base rate, cost trade-offs and thresholds; slightly misattributes lift to the risk band." · g2 "Correct imbalance point and roughly 4x lift over base rate; slightly misattributes it to the risk band; cost and threshold named."
- et-low S1Q04: g1 "Validates empty input, k bounds and no positives; stable descending sort keeps ties; correct precision, recall and lift." · g2 "Stable descending sort, correct precision, recall and lift; validates empty input, k bounds and no positives up front. Concise."
- et-low S1Q04F: g1 "Composite key of negated score and row index preserves the tie rule under quickselect or heap; heap cost loosely stated." · g2 "Quickselect or heap on composite key (negated score, row index) preserves the tie rule exactly; minor heap complexity imprecision."
- et-low S1Q05: g1 "Buffer so test starts after training labels mature; ColumnTransformer fitted on train only; natural length." · g2 "Buffer for the label window, ColumnTransformer fit on train, Pipeline; correct and compact despite run-together words."
- et-low S1Q05F: g1 "Legitimate for temporal dynamics; customer split or temporal gap, especially with identity-correlated features; nuanced and concise." · g2 "Offers customer split or temporal gap and flags identity-correlated static features; reasonably nuanced though phrasing is muddled."
- et-low S1Q07: g1 "Strong shared elements (transforms, schemas, model artifact); omits ingestion and says 'Evidentially'; too long." · g2 "Strong shared elements (transform code, schemas, model artifact); omits ingestion after mishearing; 'Evidentially' typo; too long."
- et-low S1Q07F: g1 "Pins model and run ID, idempotent upsert keyed by run and customer, actions only after terminal success; excellent." · g2 "Pins model and run ID, idempotent upsert or write-audit-publish, actions only after success. Excellent and complete."
- et-low S2Q02: g1 "Correct F1 denominator formula, but offers kappa and cross-validation as uncertainty; dataset construction vague." · g2 "Correct F1 denominator formula and bootstrap, but kappa and cross-validation folds misused for uncertainty; construction vague."
- et-low S2Q02F: g1 "Oracle inputs isolate OCR and classification; retrieval variants; position, length and kappa checks; merges prompting with orchestration." · g2 "Oracle ablations for OCR and classification, retrieval grid, merged prompting/orchestration; good bias checks; past tense implies done."
- et-high S1Q02: g1 "TP 2,850 is right, but it flags 5,000 then 4,750 and calls the metrics perfectly consistent; never computes the 57% precision." · g2 "TP 2,850 right, but says 5,000 flagged then 4,750; never computes 57% precision; 'perfectly consistent' is false."
- et-high S1Q02F: g1 "Accurate and tight: imbalance explains the gap, 4x lift, payoff matrix and capacity; garbled 'R-O-C-U-C' acronyms need fixing." · g2 "Sound content: imbalance, 4x lift, payoff matrix, capacity. Garbled acronyms 'R-O-C-U-C' and 'P-R-U-C' need fixing before speaking."
- et-high S1Q04: g1 "Clear: ValueError for empty, mismatched or out-of-range k; stable sort for ties; zero recall and lift without positives." · g2 "Raises on empty, length mismatch, k outside 1..N; stable sort for ties; correct metrics; explicit no-positive handling."
- et-high S1Q04F: g1 "System error message; no answer to the question." · g2 "System error message instead of an answer."
- et-high S1Q05: g1 "Chronological split with a 30-day gap for label windows, Pipeline fitted on train only; concise and correct." · g2 "Chronological split with a 30-day gap so training labels never overlap test; pipeline fit on train only. Correct and concise."
- et-high S1Q05F: g1 "Legitimate for evolving behavior; customer holdout to generalize to unseen individuals; correct if brief." · g2 "Evolving behavior justifies repeats; customer-level holdout to generalize to unseen individuals. Correct and tight."
- et-high S1Q07: g1 "System error message; no answer to the question." · g2 "System error message instead of an answer."
- et-high S1Q07F: g1 "Pinned registry version, run-scoped idempotent staging, campaign triggers after an atomic completion check; precise." · g2 "Pins artifact version, run-scoped idempotent staging, campaign triggers only after an atomic completion check. Precise."
- et-high S2Q02: g1 "Defines unit, denominator, dataset and interval for all three; Wilson plus-minus 3% at n=300 checks out; slightly long." · g2 "Unit, denominator, construction and interval for each metric; bootstrap and Wilson intervals plausible; about 100 words, dense."
- et-high S2Q02F: g1 "Oracle OCR text and context, separate prompting and orchestration ablations; position, length and kappa checks; slightly long." · g2 "All five ablations incl. oracle OCR and retrieval; position, length and kappa checks. Excellent, slightly over 100 words."

// Verdict rows: [key, correctness, on_topic, delivery, reason]
export default [
  ['S1Q08#1', 1, 2, 1, 'Handles label maturity and point-in-time joins, but no experiment assignment design and ignores offers contaminating labels; 105 words.'],
  ['S1Q08#2', 2, 2, 2, 'Append-only logging, deterministic hash assignment, request-ID join with offer tag, and propensity weighting cover all four parts.'],
  ['S1Q08#3', 2, 2, 1, 'Immutable logging, hashed assignment, thirty-day delayed join, and training mainly on the untreated control group; 94 words.'],
  ['S1Q08#4', 1, 2, 1, 'Logging, join and filtering treated samples are fine, but assignment is only recorded, never designed or randomized; 92 words.'],
  ['S1Q08#5', 2, 2, 1, 'Feature-snapshot logging, hashed assignment, delayed left join, and filtering or propensity-weighting treated rows; 100 words.'],
  ['S1Q08#6', 2, 2, 2, 'Snapshot-hash logging, sticky hashed assignment, thirty-day join, and propensity weighting for treated users cover every part.'],
  ['S1Q08#7', 1, 2, 1, 'Good time-shifted join and exclusion of offer acceptors, but experiment assignment is logged rather than designed; 103 words.'],

  ['S1Q08F#1', 2, 2, 2, 'Feedback loop stated precisely: saved churners look like survivors so risk signals appear protective; gives mitigation.'],
  ['S1Q08F#2', 2, 2, 2, 'Identifies intervention-driven label contamination correctly, though brief and silent on the compounding loop.'],
  ['S1Q08F#3', 2, 2, 2, 'Offers suppress churn so vulnerable customers look stable and risk is underestimated; correct and concise.'],
  ['S1Q08F#4', 2, 2, 2, 'Feedback loop where saved high-risk subscribers teach risk factors as loyalty; treatment flags as mitigation.'],
  ['S1Q08F#5', 2, 2, 2, 'Correct feedback loop: saved users make risk traits look like staying, blinding the model to baseline churners.'],
  ['S1Q08F#6', 1, 2, 2, 'Right that labels reflect intervention response, but the claimed result, prioritising easily retained users, is backwards.'],
  ['S1Q08F#7', 2, 2, 2, 'Treatment-selection feedback loop explained over time, with need to control for prior interventions.'],
  ['S1Q08F#8', 2, 2, 2, 'Saved subscribers teach risk features as retention; treatment flags or uplift modelling break the loop.'],

  ['S1Q05#1', 2, 2, 1, 'Chronological split with thirty-day gap, train-only ColumnTransformer pipeline, dropped id/date, XGBoost and out-of-time PR-AUC; 112 words.'],
  ['S1Q05#2', 2, 2, 2, 'Chronological split with thirty-day buffer and ColumnTransformer pipeline fitted on train only before validation; no metric named.'],
  ['S1Q05#3', 1, 2, 1, 'Leakage handling and unknown-category encoding are right, but no estimator or evaluation step is described; 101 words.'],
  ['S1Q05#4', 2, 2, 1, 'Cutoff with thirty-day buffer and preprocessing plus model in one pipeline fitted on train only; 86 words.'],
  ['S1Q05#5', 2, 2, 2, 'Thirty-day gap, train-only pipeline, XGBoost with time-series cross-validation and PR-AUC for imbalance.'],
  ['S1Q05#6', 2, 2, 2, 'Buffered chronological split, ColumnTransformer fitted on train only, XGBoost chained and evaluated on a time-series split.'],
  ['S1Q05#7', 1, 2, 2, 'Correct thirty-day gap and train-only preprocessing, but no classifier or evaluation metric, so training and evaluation are missing.'],
  ['S1Q05#8', 2, 2, 1, 'Buffered chronological split and preprocessing chained into a classifier fitted on train only; 108 words.'],
];

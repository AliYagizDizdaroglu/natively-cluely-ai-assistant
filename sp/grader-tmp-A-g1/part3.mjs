// Verdict rows: [key, correctness, on_topic, delivery, reason]
export default [
  ['S1Q05F#1', 1, 2, 2, 'Holdout for generalising to new customers is right, but "tracking evolution over time" never states what makes repeats legitimate.'],
  ['S1Q05F#2', 1, 1, 2, 'Explains customer-level splitting only; never says when repeated snapshots are legitimate.'],
  ['S1Q05F#3', 1, 2, 2, 'Legitimate case is fine, but the holdout condition is muddled: same user across test windows rather than train and test.'],
  ['S1Q05F#4', 2, 2, 2, 'Point-in-time monthly snapshots are legitimate; holdout when traits persist because row-level splits let the model memorise customers.'],
  ['S1Q05F#5', 2, 2, 2, 'Legitimate under strict temporal separation; customer holdout when generalising to new users or behaviour is highly consistent.'],
  ['S1Q05F#6', 2, 2, 2, 'Legitimate with strict time split; holdout to measure generalisation to new subscribers, else metrics are inflated.'],
  ['S1Q05F#7', 2, 2, 2, 'Time-ordered split makes repeats legitimate; holdout for correlated snapshots so unseen users are tested.'],
  ['S1Q05F#8', 1, 2, 2, 'Lagged features make repeats legitimate, but the holdout condition is circular: any user in both train and test.'],

  ['S1Q02#1', 2, 2, 2, 'Correct: 9,500 churners, 3,000 true positives from precision versus 2,850 from recall, consistent within rounding.'],
  ['S1Q02#2', 1, 2, 2, 'Arithmetic is right, but derives 4,750 flagged against the 5,000 band and calls it a perfect reconciliation.'],
  ['S1Q02#3', 2, 2, 2, 'Correct: 2,850 true positives, 57 percent precision, 30 percent recall, consistent with reported 60 within rounding.'],
  ['S1Q02#4', 1, 2, 2, 'Gets 2,850 true positives and recall, but asserts a perfect precision match without computing the 3,000 or 57 percent.'],
  ['S1Q02#5', 2, 2, 2, 'Correct: 2,850 true positives, 57 percent precision, 30 percent recall, consistent with reported 60.'],
  ['S1Q02#6', 2, 2, 2, 'Correct: 3,000 true positives at 60 percent precision gives 31.6 percent recall, consistent with 30.'],
  ['S1Q02#7', 2, 2, 2, 'Correct: 3,000 true positives, recall about 31.6 percent, matches the reported 30 within rounding.'],

  ['S1Q02F#1', 2, 2, 2, 'ROC optimistic under imbalance, PR-AUC about four times the base rate, and cost-benefit needed; correct.'],
  ['S1Q02F#2', 2, 2, 2, 'Correct reading of both metrics given the low base rate, plus intervention cost versus lifetime value; somewhat thin.'],
  ['S1Q02F#3', 2, 2, 2, 'PR-AUC four times base rate, strong discrimination, and need for cost-benefit and threshold selection.'],
  ['S1Q02F#4', 2, 2, 2, 'ROC inflated by imbalance, PR-AUC four times random, and names false-positive, missed-churner and conversion economics.'],
  ['S1Q02F#5', 2, 2, 2, 'Correct interpretation against the 9.5 percent base rate and net ROI versus lifetime value saved.'],
  ['S1Q02F#6', 2, 2, 2, 'Correct metric reading plus intervention cost, campaign capacity and net ROI as the missing evidence.'],
  ['S1Q02F#7', 2, 2, 2, 'Correct metric reading and asks for uplift or cost-benefit evidence that incentives are incremental.'],
];

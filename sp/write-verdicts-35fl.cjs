const fs = require('fs');
const path = require('path');

const dir = 'C:/Users/sotka/OneDrive/Masa\u00fcst\u00fc/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-09T15-00-55-s50a';
const pairsPath = path.join(dir, 'interview60.judge.pairs.gemini-3.5-flash-lite.json');
const outPath = path.join(dir, 'interview60.judge.verdicts.gemini-3.5-flash-lite.json');

const verdicts = {
  S1Q01: { correctness: 2, on_topic: 2, delivery: 2,
    reason: 'Correct on tabular fit, missing-value handling and inference speed, and names a logistic regression baseline.' },
  S1Q02: { correctness: 2, on_topic: 2, delivery: 2,
    reason: 'Arithmetic is exact (9,500 churners, 5,000 flagged, 3,000 true positives, 31.6% recall) and the rounding caveat is fair.' },
  S1Q03: { correctness: 2, on_topic: 2, delivery: 2,
    reason: 'Matched holdout under the same calendar window is the right way to strip seasonality and mix effects.' },
  S1Q04: { correctness: 1, on_topic: 1, delivery: 0,
    reason: 'Code is correct with stable tie-breaking, but never states the invalid-k, empty and no-positive behaviour the question explicitly asked for.' },
  S1Q05: { correctness: 2, on_topic: 2, delivery: 1,
    reason: 'Correct embargo gap, chronological split and train-only ColumnTransformer fit; at 106 words it runs long for speech.' },
  S1Q06: { correctness: 2, on_topic: 2, delivery: 0,
    reason: 'SQL is right: filter in the LEFT JOIN ON clause preserves zero-call customers, with the ingestion cutoff applied.' },
  S1Q07: { correctness: 2, on_topic: 2, delivery: 1,
    reason: 'Covers all seven stages and names shared feature definitions as the batch/online overlap; 123 words is too long to say.' },
  S1Q08: { correctness: 1, on_topic: 2, delivery: 2,
    reason: 'Logging predictions to a feature store is misplaced, and inverse propensity weighting is described as downweighting treated non-churners.' },
  S1Q09: { correctness: 1, on_topic: 1, delivery: 2,
    reason: 'Service mapping is sound but the explicitly requested operational reasons are absent, and App Insights does not do drift detection.' },
  S1Q10: { correctness: 2, on_topic: 2, delivery: 1,
    reason: 'Managed identity, scoped RBAC, Key Vault and per-environment networks are all correct; 88 words is slightly long.' },
  S2Q01: { correctness: 2, on_topic: 2, delivery: 1,
    reason: 'Walks every stage from layout-aware parsing to cross-encoder reranking and token-budgeted assembly; 93 words runs long.' },
  S2Q02: { correctness: 1, on_topic: 2, delivery: 1,
    reason: 'Sound metric framing but a wall of invented precision, and five-fold cross-validation is the wrong variance estimator for a fixed benchmark.' },
  S2Q03: { correctness: 2, on_topic: 2, delivery: 1,
    reason: 'Sharp contrast of the three approaches on conditional dependence versus cost; 113 words is too long for speech.' },
  S2Q04: { correctness: 2, on_topic: 2, delivery: 0,
    reason: 'Reciprocal rank fusion is correct with one-based ranks, configurable c and deterministic id tie-breaking, but it is raw code.' },
  S2Q05: { correctness: 2, on_topic: 2, delivery: 0,
    reason: 'Greedy selection honours budget skipping, id dedup and the two-per-document cap correctly, but it is raw code.' },
  S2Q06: { correctness: 1, on_topic: 2, delivery: 2,
    reason: 'Says worker pool then describes fixed batches of eight, which is a different mechanism with a barrier between batches.' },
  S2Q07: { correctness: 2, on_topic: 2, delivery: 1,
    reason: 'Tenant-isolated indexes, ACL filters pushed into the query, citation ids and golden-set evaluation are all right; 110 words is long.' },
  S2Q08: { correctness: 1, on_topic: 2, delivery: 1,
    reason: 'Dual-write and reader-pointer cutover are right, but cosine similarity cannot compare spaces of different dimensionality as a quality check.' },
  S2Q09: { correctness: 1, on_topic: 1, delivery: 2,
    reason: 'Good service choices and managed-versus-custom reasoning, but telemetry, an explicitly listed component, is never placed.' },
  S2Q10: { correctness: 2, on_topic: 2, delivery: 2,
    reason: 'Peek-lock plus a durable processed-id record written with the result is the correct idempotency pattern for repeated delivery.' }
};

const pairs = JSON.parse(fs.readFileSync(pairsPath, 'utf8'));
const keys = pairs.items.map((i) => i.key);
const missing = keys.filter((k) => !(k in verdicts));
const extra = Object.keys(verdicts).filter((k) => !keys.includes(k));
if (missing.length || extra.length) {
  console.error('MISMATCH missing=' + JSON.stringify(missing) + ' extra=' + JSON.stringify(extra));
  process.exit(1);
}

// Preserve pairs order.
const ordered = {};
for (const k of keys) ordered[k] = verdicts[k];
fs.writeFileSync(outPath, JSON.stringify(ordered, null, 2) + '\n', 'utf8');

// Verify by re-reading.
const back = JSON.parse(fs.readFileSync(outPath, 'utf8'));
const n = Object.keys(back).length;
let both2 = 0, anyZero = 0;
const totals = {};
for (const [k, v] of Object.entries(back)) {
  if (v.correctness === 2 && v.on_topic === 2) both2++;
  if (v.correctness === 0 || v.on_topic === 0) anyZero++;
  const t = v.correctness + v.on_topic + v.delivery;
  totals[k] = t;
}
console.log('items in pairs: ' + keys.length);
console.log('keys written+reparsed: ' + n);
console.log('correctness2 AND on_topic2: ' + both2);
console.log('correctness0 OR on_topic0: ' + anyZero);
const dist = (f) => [0, 1, 2].map((s) => s + ':' + Object.values(back).filter((v) => v[f] === s).length).join(' ');
console.log('correctness ' + dist('correctness'));
console.log('on_topic    ' + dist('on_topic'));
console.log('delivery    ' + dist('delivery'));
const lowest = Object.entries(totals).sort((a, b) => a[1] - b[1]).slice(0, 5);
console.log('lowest five (key/total): ' + lowest.map((e) => e[0] + '=' + e[1]).join(', '));

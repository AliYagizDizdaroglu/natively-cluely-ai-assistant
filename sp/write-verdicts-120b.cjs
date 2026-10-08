const fs = require('fs');
const path = require('path');

const dir = 'C:\\Users\\sotka\\OneDrive\\Masa\u00fcst\u00fc\\natively-cluely-ai-assistant\\electron\\test\\golden\\interview60.runs\\2026-09-09T15-00-55-s50a';
const pairsPath = path.join(dir, 'interview60.judge.pairs.openai_gpt-oss-120b.json');
const outPath = path.join(dir, 'interview60.judge.verdicts.openai_gpt-oss-120b.json');

const verdicts = {
  S1Q01: { correctness: 2, on_topic: 2, delivery: 2, reason: 'Correct on missing-value handling, regularization and latency, and names the logistic-regression baseline that was asked for.' },
  S1Q02: { correctness: 2, on_topic: 2, delivery: 1, reason: 'Arithmetic all correct and rightly flags 57 percent versus the reported 60; symbol-heavy fractions need small edits to speak.' },
  S1Q03: { correctness: 2, on_topic: 2, delivery: 2, reason: 'Randomized holdout plus difference-in-differences with seasonal and segment covariates is the right way to strip the confounders.' },
  S1Q04: { correctness: 2, on_topic: 2, delivery: 1, reason: 'Metrics, tie-breaking and all three edge cases covered; over ninety words with inline formula notation.' },
  S1Q05: { correctness: 2, on_topic: 2, delivery: 0, reason: 'Chronological split with a 30-day gap and train-only ColumnTransformer is right, but it is a raw code block.' },
  S1Q06: { correctness: 2, on_topic: 2, delivery: 0, reason: 'Predicates in the LEFT JOIN preserve zero-call customers and ingested_at is respected; delivered as bare SQL.' },
  S1Q07: { correctness: 1, on_topic: 2, delivery: 2, reason: 'Names every requested area but stays generic: no batch/online feature parity mechanism, no scale or latency reasoning.' },
  S1Q08: { correctness: 1, on_topic: 2, delivery: 2, reason: 'Logging, hashed assignment and joins are sound, but "overriding the label" when an offer was shown is not a real mechanism.' },
  S1Q09: { correctness: 1, on_topic: 2, delivery: 2, reason: 'Service mapping is accurate throughout, but the explicitly asked operational reasons shrink to three nouns.' },
  S1Q10: { correctness: 2, on_topic: 2, delivery: 2, reason: 'Managed identity, Entra tokens to Blob and Postgres, RBAC, Key Vault and per-environment isolation cover all four sub-parts.' },
  S2Q01: { correctness: 1, on_topic: 2, delivery: 2, reason: 'Walks every named stage but with no specifics on chunking, embedding model, top-k or hybrid retrieval.' },
  S2Q02: { correctness: 1, on_topic: 2, delivery: 1, reason: 'Defines F1 as correct spans over gold entities, which is recall; dataset construction is barely addressed; telegraphic register.' },
  S2Q03: { correctness: 1, on_topic: 2, delivery: 2, reason: 'Contrasts the three approaches only restating them; never names the cost side that "justify its complexity" asks about.' },
  S2Q04: { correctness: 2, on_topic: 2, delivery: 2, reason: 'Reciprocal rank fusion stated correctly with one-based ranks, summed contributions and a deterministic id tie-break.' },
  S2Q05: { correctness: 2, on_topic: 2, delivery: 2, reason: 'Greedy relevance-first pass honours dedup, the two-per-document cap, the budget and the skip-do-not-stop rule.' },
  S2Q06: { correctness: 2, on_topic: 2, delivery: 1, reason: 'Semaphore, wait_for and index-keyed results give bounded concurrency, order and isolated failures; inline call syntax reads awkwardly aloud.' },
  S2Q07: { correctness: 2, on_topic: 2, delivery: 2, reason: 'Tenant-partitioned index, Postgres metadata with row-level security, async reindex worker and a concrete evaluation set.' },
  S2Q08: { correctness: 2, on_topic: 2, delivery: 2, reason: 'Dual-write plus backfill, parity check and keep-old rollback are right; comparing cosine similarity across dimensionalities is loose.' },
  S2Q09: { correctness: 2, on_topic: 2, delivery: 2, reason: 'Every component placed on a plausible Azure service, plus a real reason a custom worker layer would be justified.' },
  S2Q10: { correctness: 2, on_topic: 2, delivery: 2, reason: 'Dedup key, idempotent upsert and complete-after-write with lock expiry is the right pattern; "exactly-once" is an overclaim.' }
};

const pairs = JSON.parse(fs.readFileSync(pairsPath, 'utf8'));
const keys = pairs.items.map((i) => i.key);
const missing = keys.filter((k) => !(k in verdicts));
const extra = Object.keys(verdicts).filter((k) => !keys.includes(k));
if (missing.length || extra.length) {
  console.error('KEY MISMATCH missing=' + JSON.stringify(missing) + ' extra=' + JSON.stringify(extra));
  process.exit(1);
}

const ordered = {};
for (const k of keys) ordered[k] = verdicts[k];
fs.writeFileSync(outPath, JSON.stringify(ordered, null, 2) + '\n', 'utf8');
console.log('wrote ' + outPath);

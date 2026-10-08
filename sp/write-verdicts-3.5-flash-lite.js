const fs = require('fs');

const DIR = 'C:/Users/sotka/OneDrive/Masa\u00fcst\u00fc/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-05T13-50-01-after6';
const PAIRS = DIR + '/interview60.judge.pairs.gemini-3.5-flash-lite.json';
const OUT = DIR + '/interview60.judge.verdicts.gemini-3.5-flash-lite.json';

const V = (c, o, d, reason) => ({ correctness: c, on_topic: o, delivery: d, reason });

const verdicts = {
  W01: V(2, 2, 2, 'Image as static blueprint versus running instance, with recipe analogy and immutability point; accurate, natural, well-sized spoken answer.'),
  W02: V(2, 2, 2, 'Correct layer caching explanation plus the practical ordering rule of dependencies before code; concise and natural to speak.'),
  W03: V(2, 2, 2, 'Correctly contrasts active training access against archived retraining data, naming latency and cost tradeoffs; well-paced spoken answer.'),
  W04: V(2, 2, 2, 'Accurate: managed real-time inference endpoint hosting containerised artifacts plus inference code, with instance and scaling management noted.'),
  W05: V(2, 2, 2, 'Directed acyclic graph defined correctly and Airflow rationale explained through deterministic ordering, parallelism and debuggability; natural delivery.'),
  W06: V(2, 2, 2, 'Reproducibility, rollback and matched weights-plus-code argument is exactly the point; tight, confident, easy to say aloud.'),
  W07: V(2, 2, 2, 'Pod as smallest deployable unit versus deployment controller managing replicas, rolling updates and self-healing; correct and cleanly spoken.'),
  W08: V(2, 2, 2, 'Correctly separates input distribution shift from a changed input-output relationship, with a concrete example of each; good length.'),
  W09: V(2, 2, 2, 'Names drift, reproducibility, environment parity and reviewable rollback-able changes; accurate and natural first-person delivery.'),
  W10: V(2, 2, 2, 'Practical layout: raw versus processed split, ISO-dated weekly prefixes, staging before finalising, lineage and rollback rationale.'),
  W11: V(2, 2, 2, 'Builder and runtime stages, venv copied to slim base, smaller image and reduced attack surface; correct and well delivered.'),
  W12: V(2, 2, 2, 'Sensors correctly framed as operators that wait on a condition, with a file-landing example; accurate and natural.'),
  M01: V(2, 2, 2, 'Feature-distribution tests (KS, PSI) plus prediction drift against baseline with alerting; real production practice, well sized.'),
  M02: V(2, 2, 2, 'Pipelines, processing and training steps, conditional evaluation against baseline, Model Registry; EventBridge/Lambda scheduling phrasing slightly muddled but sound.'),
  M03: V(2, 2, 2, 'HPA on custom RPS/GPU metrics, minimum replicas for cold start, stabilization windows, Karpenter for node capacity; strong.'),
  M04: V(2, 2, 2, 'Auditability, reproducibility, review before production and staging-production parity; concise, confident and easy to deliver aloud.'),
  M05: V(2, 2, 2, 'KMS CMKs, block public access, least-privilege IAM and VPC endpoints are right; Macie masking is overstated, it only detects.'),
  M06: V(2, 2, 2, 'Unit and integration tests, data schema validation, plus holdout performance and bias evaluation; correctly scoped to ML CI.'),
  M07: V(2, 2, 2, 'Retries with exponential backoff, alert callbacks, trigger rules or short-circuiting, and idempotent design for backfill; accurate.'),
  M08: V(1, 2, 2, 'Alpine is the wrong first move for a Python GPU training image; misses CUDA runtime and wheel bloat as real drivers.'),
  M09: V(2, 2, 2, 'Latency-sensitive per-request inference versus offline bulk scoring, with the right deciding question; clear concrete examples.'),
  M10: V(2, 2, 2, 'Three sensible pillars: ranking quality (NDCG, CTR), system health, and drift. Slightly short at 38 words but complete.'),
  M11: V(2, 2, 2, 'Namespace quotas, priority-queue schedulers like Volcano or KubeRay, and utilization monitoring with idle reclaim; realistic multi-team answer.'),
  M12: V(2, 2, 2, 'Canary at five percent with automated latency and error-rate checks and automatic rollback; correct low-risk rollout story.'),
  M13: V(2, 2, 2, 'Secrets in Vault or Secrets Manager, templates hold only references, runtime injection with temporary credentials; exactly right.'),
  M14: V(2, 2, 2, 'Parallel multipart reads, record-based streaming formats, same-region compute, NVMe caching and async prefetch so GPUs never starve.'),
  M15: V(2, 2, 2, 'Correct pattern: write payload to object storage, pass only the URI through XCom, keeping the metadata database lean.'),
  M16: V(2, 2, 2, 'Registry as versioning and approval gate whose approval status triggers promotion; captures the governance handoff accurately.'),
  M17: V(2, 2, 2, 'Proxy signals (feature distributions, output stability) as early warning, retrospective true-up once labels land; the right approach.'),
  M18: V(2, 2, 2, 'Vendor CUDA base images, NVIDIA Container Toolkit bridging host drivers, pinned tags and build-time checks; host-version matching slightly overstated.'),
  M19: V(2, 2, 2, 'Liveness for process health versus readiness gated on model weights loaded; correctly avoids restart loops during slow warmup.'),
  M20: V(2, 2, 2, 'Tests logic not values: schema contracts and data expectations, plus integration tests on deterministic fixtures with edge cases.'),
  M21: V(2, 2, 2, 'Isolated identical stacks, config injected not hardcoded, ephemeral dev, staging mirroring production, immutable production with rollback; sound.'),
  M22: V(2, 2, 2, 'Multi-fidelity approach: cheap random search to prune, Hyperband or PBT early stopping, full training only for winners.'),
  M23: V(2, 2, 2, 'Correctly ties the retrain decision to measured performance or business-metric degradation rather than distribution shift alone.'),
  M24: V(2, 2, 2, 'Chunked sequential partitions, lower priority weights and concurrency limits to protect production runs; practical and correct.'),
  M25: V(2, 2, 2, 'Lineage by identifier, hard delete propagated via tombstones to analytics stores, and crypto-shredding for immutable object storage.'),
  M26: V(2, 2, 2, 'Centralised rebuild pipeline, scheduled scans, automated dependency PRs, tests then canary rollout; Dependabot targeting the registry is loosely worded.'),
  M27: V(2, 2, 2, 'Balanced: mTLS, traffic shifting and multi-cluster justify a mesh; sidecar latency and complexity argue against it for lean low-latency serving.'),
  M28: V(2, 2, 2, 'Shared declarative transformations in a feature store computing offline and online features identically; directly addresses train-serve skew.'),
  H01: V(2, 2, 2, 'Right instinct: distribution shift or nulls despite a stable schema, then compare feature statistics between baseline and failing traffic.'),
  H02: V(2, 2, 2, 'Splits ModelLatency versus OverheadLatency in CloudWatch, checks resource saturation, then scales out and optimises with TorchScript or ONNX.'),
  H03: V(2, 2, 2, 'Drift-triggered continuous training, held-out validation including fairness, shadow deployment, automated rollback and schema constraints as guardrails.'),
  H04: V(2, 2, 2, 'Starts from the actual eviction reason, distinguishes OOM from node pressure, then load-tests a replica and adds production profiling.'),
  H05: V(2, 2, 2, 'Critical-path task timings, data volume growth or upstream delay, then worker resource pressure; the correct triage order.'),
  H06: V(2, 2, 2, 'Correctly diagnoses per-prefix request-rate limits and fixes with key randomisation and local caching; 3,500 is the write, not read, figure.'),
  H07: V(2, 2, 2, 'Traces lineage to the feature store for schema or null-fill bugs before concluding genuine drift; exactly the right discriminator.'),
  H08: V(2, 2, 2, 'Compares image digests, then runtime env vars, resource caps, drivers and CPU architecture, then reproduces locally with production settings.'),
  H09: V(1, 2, 2, 'Answers in Terraform terms - state file, targeted refresh, state locks - which do not exist in CloudFormation; drift detection never mentioned.'),
  H10: V(2, 2, 1, 'Correct two-front plan: shift traffic back, halt downstream consumers, then restore or backfill corrupted records. At 95 words, needs trimming.'),
  H11: V(2, 2, 2, 'Checks GPU utilization and memory first, then reviews the diff and compares profiler traces between cheap and expensive runs.'),
  H12: V(2, 2, 2, 'Active-active regions, health-check based DNS failover, stateless autoscaled serving and replicated data; no-data-loss claim slightly overstated.'),
};

const pairs = JSON.parse(fs.readFileSync(PAIRS, 'utf8'));
const pairKeys = pairs.items.map((i) => i.key);
const vKeys = Object.keys(verdicts);

const missing = pairKeys.filter((k) => !vKeys.includes(k));
const extra = vKeys.filter((k) => !pairKeys.includes(k));
if (missing.length || extra.length) {
  console.error('KEY MISMATCH missing=' + JSON.stringify(missing) + ' extra=' + JSON.stringify(extra));
  process.exit(1);
}

const bad = [];
for (const [k, v] of Object.entries(verdicts)) {
  for (const f of ['correctness', 'on_topic', 'delivery']) {
    if (![0, 1, 2].includes(v[f])) bad.push(k + '.' + f);
  }
  const w = v.reason.trim().split(/\s+/).length;
  if (w > 25) bad.push(k + '.reason(' + w + ' words)');
  if (!/^[\x20-\x7E]*$/.test(v.reason)) bad.push(k + '.reason(non-ascii)');
}
if (bad.length) {
  console.error('BAD FIELDS: ' + bad.join(', '));
  process.exit(1);
}

// preserve pairs-file order
const ordered = {};
for (const k of pairKeys) ordered[k] = verdicts[k];
fs.writeFileSync(OUT, JSON.stringify(ordered, null, 1) + '\n', 'utf8');
console.log('WROTE ' + OUT);

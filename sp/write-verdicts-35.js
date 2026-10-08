const fs = require('fs');
const path = require('path');

const dir = 'C:\\Users\\sotka\\OneDrive\\Masa\u00fcst\u00fc\\natively-cluely-ai-assistant\\electron\\test\\golden\\interview60.runs\\2026-09-07T08-14-12-after8';
const pairsPath = path.join(dir, 'interview60.judge.pairs.gemini-3.5-flash-lite.json');
const outPath = path.join(dir, 'interview60.judge.verdicts.gemini-3.5-flash-lite.json');

const v = (c, o, d, reason) => ({ correctness: c, on_topic: o, delivery: d, reason });

const verdicts = {
  W01: v(2, 2, 2, 'Accurate image-versus-container distinction with a clear analogy; natural spoken length and phrasing.'),
  W02: v(2, 2, 2, 'Correct on layer caching and instruction ordering; concrete payoff stated; clean spoken delivery.'),
  W03: v(2, 2, 2, 'Correct Standard-for-active-training versus Glacier-for-archive tradeoff, framed by access pattern and cost.'),
  W04: v(2, 2, 2, 'Correctly describes managed real-time HTTPS endpoint hosting a container with model artifacts and inference script.'),
  W05: v(2, 2, 2, 'Correct DAG definition and sound rationale: deterministic scheduling, parallelism, dependency resolution. Natural delivery.'),
  W06: v(2, 2, 2, 'Correct reproducibility, drift-prevention and rollback rationale tying artifact to commit. Well-paced spoken answer.'),
  W07: v(2, 2, 2, 'Accurate pod-versus-deployment distinction including ephemerality, desired state, self-healing and rolling updates.'),
  W08: v(2, 2, 2, 'Correct definitions of both drift types plus a clean illustrating example. Natural spoken length.'),
  W09: v(2, 2, 2, 'Correctly names configuration drift, environment parity and provisioning speed as the problems solved.'),
  W10: v(2, 2, 2, 'Sensible date-prefixed weekly snapshots, raw/processed separation, partitioning for parallel reads, lifecycle tiering.'),
  W11: v(2, 2, 2, 'Correct multi-stage rationale: heavy build stage, slim runtime, wheels copied, compilers left behind.'),
  W12: v(2, 2, 2, 'Correct that a sensor is a specialised operator that waits on a condition; good examples.'),
  M01: v(2, 2, 2, 'Solid: baseline comparison, PSI and Wasserstein, thresholded alerts, plus delayed ground-truth performance tracking.'),
  M02: v(1, 2, 2, 'Good EventBridge, Processing, Training, Model steps, but a TransformStep runs batch inference; it does not deploy an endpoint.'),
  M03: v(2, 2, 2, 'Correct: custom-metric HPA over Prometheus, KEDA for event-driven scale, cluster autoscaler underneath.'),
  M04: v(2, 2, 2, 'Correct repeatability, drift-tracking, single-source-of-truth and disaster-recovery arguments against console ClickOps.'),
  M05: v(2, 2, 2, 'Strong: KMS customer-managed keys, block public access, least-privilege IAM, VPC endpoints, CloudTrail and Macie.'),
  M06: v(2, 2, 2, 'Correct ML-specific CI additions: schema validation, tiny smoke training run, latency and memory budgets.'),
  M07: v(2, 2, 1, 'Right approach with exponential backoff retries, but the spoken kwarg retry_exponential_backoff equals True needs editing before saying aloud.'),
  M08: v(1, 2, 2, 'Generic advice misapplied: Alpine and compiled-binary framing suits neither CUDA nor Python training images; misses framework base layer.'),
  M09: v(2, 2, 2, 'Correct latency-versus-throughput tradeoff with apt user-facing and scheduled-scoring examples.'),
  M10: v(2, 2, 2, 'Good layering of offline ranking, online engagement, system health and business metrics. Slightly long but natural.'),
  M11: v(2, 2, 2, 'Correct: device plugin with namespace quotas, GPU sharing for small jobs, scale-from-zero node pools.'),
  M12: v(2, 2, 2, 'Correct progressive canary with staged traffic shifts, automated health checks and instant rollback path.'),
  M13: v(2, 2, 2, 'Correct: external secret store, runtime references, nothing in version control or state; access audited via IAM.'),
  M14: v(2, 2, 2, 'Right levers: sharded record formats, prefetching data loaders, FSx for Lustre or S3 Express. Calling TFRecord columnar is loose.'),
  M15: v(2, 2, 2, 'Textbook claim-check pattern: payload to object storage, URI through XCom, keeping the metadata database lean.'),
  M16: v(2, 2, 2, 'Correct: registry as system of record with metadata, lineage and approval status gating the deployment step.'),
  M17: v(2, 2, 2, 'Correct proxy monitoring of feature and prediction drift, then retrospective evaluation once labels land.'),
  M18: v(2, 2, 2, 'Correct: NVIDIA Container Toolkit exposes the host driver; container CUDA must stay within driver support.'),
  M19: v(2, 2, 2, 'Excellent: liveness lightweight, readiness runs real prediction on a fixture, startup probe covers slow model load.'),
  M20: v(2, 2, 2, 'Correct emphasis on schema contracts, invariants and distribution diffs rather than exact-output assertions.'),
  M21: v(1, 1, 2, 'Answers CI promotion, not stack structure; no stack decomposition, parameterisation or account separation, and branch-per-environment is contested.'),
  M22: v(2, 2, 2, 'Correct: random search then Bayesian with early stopping, spot instances plus checkpoints for cost control.'),
  M23: v(2, 2, 2, 'Correct distinction: retrain on concept drift, alert on transient shifts; judged by degrading business metrics.'),
  M24: v(2, 2, 2, 'Correct: chunked time windows, dedicated pool with concurrency limits, idempotent tasks for safe retries.'),
  M25: v(2, 2, 1, 'Sound crypto-shredding design with an auditable deletion log, but at eighty-eight dense words it needs trimming before speaking.'),
  M26: v(2, 2, 1, 'Correct central rebuild, scan and automated rolling redeploy, but at thirty-five words it is too thin to speak as-is.'),
  M27: v(2, 2, 2, 'Balanced both ways: mesh for mTLS, traffic shifting and telemetry at scale; sidecar overhead otherwise.'),
  M28: v(2, 2, 2, 'Correct feature-store answer with online and offline stores, point-in-time correctness and shared versioned transforms.'),
  H01: v(2, 2, 2, 'Good debugging path: compare live and training distributions, look for silent coercion, validate a fix in shadow.'),
  H02: v(2, 2, 2, 'Correct diagnosis order: CloudWatch resource metrics, model server worker logs, then scale up or out on invocation metrics.'),
  H03: v(2, 2, 2, 'Answers both halves: full automated loop plus concrete guardrails of shadow testing, schema validation and auto rollback.'),
  H04: v(2, 2, 2, 'Correct: production profiling, QoS class and memory request-to-limit ratios, payload limits before scaling replicas.'),
  H05: v(2, 2, 2, 'Right first split of longer runtime versus delayed start, then task-level resource and data-volume growth. Slightly thin.'),
  H06: v(2, 2, 1, 'Correct per-prefix request limits and prefix-spreading fix, but stray dollar signs around the numbers need cleaning up.'),
  H07: v(2, 2, 2, 'Sharp test: stable outputs with shifting inputs implies a broken pipeline; checks null rates and schema logs.'),
  H08: v(2, 2, 2, 'Correct order: compare image digests, then architecture and environment differences, then runtime limits and security context.'),
  H09: v(1, 2, 2, 'Reaches for Terraform import in a CloudFormation stack scenario, and import alone does not reconcile the drift.'),
  H10: v(2, 2, 2, 'Complete: shift traffic to stable, pause ingestion, remediate written records, then fix validation to prevent recurrence.'),
  H11: v(2, 2, 2, 'Sensible: diff the change around data loading, batch size and architecture, then check utilisation for thrashing.'),
  H12: v(2, 2, 2, 'Correct active-active multi-region design with global routing, health-check draining and single-primary writes to avoid split-brain.')
};

const pairs = JSON.parse(fs.readFileSync(pairsPath, 'utf8'));
const pairKeys = pairs.items.map(i => i.key);
const vKeys = Object.keys(verdicts);

// Order verdicts to match the pairs order.
const ordered = {};
for (const k of pairKeys) ordered[k] = verdicts[k];

fs.writeFileSync(outPath, JSON.stringify(ordered, null, 2) + '\n', 'utf8');

// Verification
const back = JSON.parse(fs.readFileSync(outPath, 'utf8'));
const a = new Set(pairKeys), b = new Set(Object.keys(back));
const missing = [...a].filter(k => !b.has(k));
const extra = [...b].filter(k => !a.has(k));
const bad = Object.entries(back).filter(([k, o]) =>
  ![0, 1, 2].includes(o.correctness) || ![0, 1, 2].includes(o.on_topic) ||
  ![0, 1, 2].includes(o.delivery) || typeof o.reason !== 'string' ||
  o.reason.trim().split(/\s+/).length > 25);

console.log('parsed OK:', typeof back === 'object');
console.log('pairs items:', pairKeys.length, 'verdict keys:', Object.keys(back).length,
  'duplicates in source verdicts:', vKeys.length !== new Set(vKeys).size);
console.log('missing:', JSON.stringify(missing), 'extra:', JSON.stringify(extra));
console.log('key sets equal:', missing.length === 0 && extra.length === 0 && pairKeys.length === Object.keys(back).length);
console.log('malformed entries:', JSON.stringify(bad.map(([k, o]) => [k, o.reason.trim().split(/\s+/).length])));
const vals = Object.values(back);
console.log('on_topic 0:', vals.filter(x => x.on_topic === 0).length);
console.log('correctness 0:', vals.filter(x => x.correctness === 0).length);
console.log('correctness 2 AND on_topic 2:', vals.filter(x => x.correctness === 2 && x.on_topic === 2).length);
console.log('delivery histogram:', JSON.stringify([0, 1, 2].map(n => vals.filter(x => x.delivery === n).length)));
console.log('out:', outPath);

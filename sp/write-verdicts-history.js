const fs = require('fs');
const path = require('path');

const dir = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/spike-run';
const pairsPath = path.join(dir, 'interview60.judge.pairs.3.1-history.json');
const outPath = path.join(dir, 'interview60.judge.verdicts.3.1-history.json');

const v = (c, o, d, reason) => ({ correctness: c, on_topic: o, delivery: d, reason });

const verdicts = {
  W01: v(2, 2, 2, 'Accurate image-versus-container distinction with a clean analogy; natural length and phrasing.'),
  W02: v(2, 2, 2, 'Correctly explains independent layer caching and ordering instructions least to most frequently changed.'),
  W03: v(2, 2, 2, 'Correct access-frequency split with the retrieval-latency versus storage-cost tradeoff.'),
  W04: v(2, 2, 2, 'Correctly describes a managed inference endpoint hosting model artifacts plus an inference container.'),
  W05: v(2, 2, 2, 'Defines DAG correctly and explains why acyclicity gives predictable ordering and parallelism.'),
  W06: v(2, 2, 2, 'Correct reproducibility and rollback reasoning tying weights to the training code that made them.'),
  W07: v(2, 2, 2, 'Accurate pod-versus-deployment distinction covering replicas, rolling updates and self-healing.'),
  W08: v(2, 2, 2, 'Textbook distinction: input distribution shift versus a changed input-to-target relationship.'),
  W09: v(2, 2, 2, 'Correct on configuration drift, reproducibility and auditability; natural spoken framing.'),
  W10: v(2, 2, 1, 'Sound date-prefix layout with lineage metadata, but the literal S3 URI is awkward to read aloud.'),
  W11: v(2, 2, 2, 'Correct builder and runtime split with the image-size and attack-surface rationale.'),
  W12: v(2, 2, 2, 'Correct: a sensor is a specialised operator that waits on a condition before downstream tasks.'),
  M01: v(2, 2, 2, 'Correct baseline comparison with named divergence tests, real tools and alert thresholds.'),
  M02: v(2, 2, 2, 'Correct step sequence through the registry; PipelineSchedule is a real scheduling mechanism.'),
  M03: v(2, 2, 2, 'Correct HPA on custom latency metrics paired with Cluster Autoscaler for node capacity.'),
  M04: v(2, 2, 2, 'Correct version-control, repeatability and configuration-drift argument against console clicks.'),
  M05: v(1, 2, 2, 'Leads with S3 Bucket Keys, a cost feature; omits least-privilege IAM and block-public-access basics.'),
  M06: v(2, 2, 2, 'Correctly extends past unit tests to schema, pipeline integration and model regression checks.'),
  M07: v(2, 2, 2, 'Correct retry with backoff, downstream short-circuit, and alerting only after the final retry.'),
  M08: v(1, 2, 2, 'Multi-stage is right, but layer caching cuts build time not size, and Alpine is poor for Python ML.'),
  M09: v(2, 2, 2, 'Correct latency-versus-throughput and cost tradeoff between real-time and batch transform.'),
  M10: v(2, 2, 2, 'Good split of endpoint health metrics against top-k quality and business impact metrics.'),
  M11: v(2, 2, 2, 'Correct quotas, taints and affinity plus named fair-share schedulers; shows real depth.'),
  M12: v(2, 2, 2, 'Correct canary rollout with metric comparison and an automated rollback trigger.'),
  M13: v(2, 2, 2, 'Correct: external secret store referenced by ARN, injected at runtime, governed by IAM.'),
  M14: v(2, 2, 2, 'Correct sharded formats, prefetch overlapping compute, and caching to raise throughput.'),
  M15: v(2, 2, 2, 'Canonical answer: write the payload to S3 and pass only the object key through XCom.'),
  M16: v(2, 2, 2, 'Correct: versioning, lineage back to the training job, and approval status gating deployment.'),
  M17: v(2, 2, 2, 'Correct proxy-metric strategy with prediction-drift monitoring and sampled manual audits.'),
  M18: v(1, 2, 2, 'Claims CUDA base images align the driver, but drivers live on the host; omits the NVIDIA container toolkit.'),
  M19: v(2, 2, 2, 'Exactly right: liveness for the process, readiness gated on model weights being loaded.'),
  M20: v(2, 2, 2, 'Correct: deterministic synthetic fixtures for logic plus replay against historical snapshots.'),
  M21: v(2, 2, 2, 'Correct modular base with environment-specific parameters and staging parity; standard and sound.'),
  M22: v(2, 2, 2, 'Correct Bayesian search, early stopping and spot instances; the savings figure is realistic.'),
  M23: v(2, 2, 2, 'Correct trigger: drift correlating with proxy performance loss, weighed against compute cost.'),
  M24: v(2, 2, 2, 'Correct chunking, idempotent runs and a separate lower-priority pool protecting production traffic.'),
  M25: v(2, 2, 2, 'Correct: locate records via an ID-to-location map and cascade deletion into derived features and caches.'),
  M26: v(2, 2, 2, 'Correct centralised hardened base image with automated rebuild and scan of downstream images.'),
  M27: v(2, 2, 2, 'Answers both halves correctly, including sidecar overhead ruling it out for low-latency serving.'),
  M28: v(2, 2, 2, 'Correct feature-store answer naming training-serving skew and distribution validation.'),
  H01: v(2, 2, 2, 'Right instincts: silent data-quality failures, feature-statistic comparison, then recent deploys.'),
  H02: v(2, 2, 1, 'Correct diagnosis path and fixes, but at eighty-seven words it runs long for live delivery.'),
  H03: v(2, 2, 1, 'Correct champion-challenger design with a real circuit-breaker guardrail; ninety-four words is long to speak.'),
  H04: v(1, 2, 2, 'OOMKilled and load-repro path is reasonable, but eviction hinges on requests, limits and QoS, never mentioned.'),
  H05: v(2, 2, 2, 'Good triage: task duration versus queue delay, compared against historical baselines.'),
  H06: v(1, 2, 2, 'Prefix distribution is right, but Transfer Acceleration does not help in-region training reads; FSx is the real fix.'),
  H07: v(2, 2, 2, 'Strong discriminator: nulls and default spikes versus gradual shift; single-feature claim slightly overstated.'),
  H08: v(2, 2, 1, 'Excellent: env and mount differences, dive on layers, cgroup and architecture mismatches; eighty-five words is long.'),
  H09: v(1, 2, 2, 'Drift detection is the right concept, but terraform plan and kubectl diff are wrong tools for a stack.'),
  H10: v(2, 2, 2, 'Correct: divert traffic first, then reconcile and point-in-time recover the corrupted downstream data.'),
  H11: v(2, 2, 2, 'Correct cost triage: utilisation comparison, loop profiling, then checkpoint and logging overhead.'),
  H12: v(2, 2, 2, 'Correct active-active multi-region design with global routing and health-check failover.')
};

// sanity: reason word limit and score domain
const pairs = JSON.parse(fs.readFileSync(pairsPath, 'utf8'));
const pairKeys = pairs.items.map(i => i.key);
let bad = 0;
for (const [k, val] of Object.entries(verdicts)) {
  const wc = val.reason.trim().split(/\s+/).length;
  if (wc > 25) { console.log('REASON TOO LONG', k, wc); bad++; }
  for (const f of ['correctness', 'on_topic', 'delivery']) {
    if (![0, 1, 2].includes(val[f])) { console.log('BAD SCORE', k, f); bad++; }
  }
}
const missing = pairKeys.filter(k => !(k in verdicts));
const extra = Object.keys(verdicts).filter(k => !pairKeys.includes(k));
if (missing.length) { console.log('MISSING', missing.join(',')); bad++; }
if (extra.length) { console.log('EXTRA', extra.join(',')); bad++; }
if (bad) { console.log('ABORT: ' + bad + ' problems'); process.exit(1); }

// preserve pairs-file order
const ordered = {};
for (const k of pairKeys) ordered[k] = verdicts[k];
fs.writeFileSync(outPath, JSON.stringify(ordered, null, 1) + '\n', 'utf8');
console.log('wrote', outPath, Object.keys(ordered).length, 'keys');

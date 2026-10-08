const fs = require('fs');
const path = require('path');

const RUN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-06T08-14-21-after7';
const PAIRS = path.join(RUN, 'interview60.judge.pairs.gemini-3.1-flash-lite.json');
const OUT = path.join(RUN, 'interview60.judge.verdicts.gemini-3.1-flash-lite.json');

const V = (c, o, d, reason) => ({ correctness: c, on_topic: o, delivery: d, reason });

const verdicts = {
  W01: V(2, 2, 2, "Accurate image-versus-container distinction with the class/object analogy and writable layer; clean natural spoken length."),
  W02: V(2, 2, 2, "Correctly explains layer caching and ordering instructions least-to-most-changed to maximise cache hits; direct and well paced."),
  W03: V(2, 2, 2, "Correct latency and access-pattern tradeoff between Standard and Glacier, applied specifically to training data."),
  W04: V(2, 2, 2, "Accurately describes the managed HTTPS inference endpoint, S3 model artifacts, instance hosting, scaling and load balancing."),
  W05: V(2, 2, 2, "Correct definition of directed acyclic graph plus why acyclicity enables ordering and parallel execution."),
  W06: V(2, 2, 2, "Correctly ties artifacts to data, hyperparameters and preprocessing for reproducibility and rollback; strong spoken answer."),
  W07: V(2, 2, 2, "Correct pod-versus-deployment distinction covering replicas, rollouts and rollbacks; concise and natural."),
  W08: V(2, 2, 2, "Correctly separates input distribution shift from a change in the input-target relationship; crisp and complete."),
  W09: V(2, 2, 2, "Names drift, manual error, reproducibility and version control; directly answers what infrastructure as code solves."),
  W10: V(2, 2, 2, "Sensible dataset and version prefix layout with raw, processed and metadata separation plus lifecycle transitions."),
  W11: V(2, 2, 2, "Correct multi-stage rationale: build dependencies in one stage, copy artifacts into a slim runtime, smaller attack surface."),
  W12: V(2, 2, 2, "Correct: a sensor is a specialised operator that waits on a condition before the workflow proceeds."),

  M01: V(2, 2, 2, "Names KS and PSI distribution comparison against a training baseline with thresholded alerting; exactly the expected answer."),
  M02: V(2, 2, 2, "Correct SageMaker pipeline shape: EventBridge schedule, processing, training, registry step, then gated deployment."),
  M03: V(2, 2, 2, "Correct: HPA on custom latency and GPU metrics via Prometheus Adapter, plus Cluster Autoscaler for nodes."),
  M04: V(2, 2, 2, "Correctly cites snowflake environments, repeatability, version control, teardown and drift prevention."),
  M05: V(2, 2, 2, "Covers KMS encryption at rest, least-privilege IAM, Block Public Access, Object Lock and CloudTrail auditing."),
  M06: V(2, 2, 2, "Correctly spans code, data schema, an integration training run and evaluation thresholds before deploy."),
  M07: V(2, 2, 2, "Correct retry with exponential backoff, transient-versus-permanent handling and SLA alerting; slightly long but deliverable."),
  M08: V(1, 2, 2, "Multi-stage and cache cleanup are right, but distroless or Alpine is wrong advice for a CUDA Python training image."),
  M09: V(2, 2, 2, "Correct latency-versus-throughput and cost tradeoff, with apt examples for each serving mode."),
  M10: V(2, 2, 2, "Good three-tier dashboard: business CTR and conversion, ranking quality via MRR and coverage, latency and volume."),
  M11: V(2, 2, 2, "Quotas, fair-share scheduling and MIG partitioning are the right levers; MIG is loosely called a scheduler."),
  M12: V(2, 2, 2, "Canary with baseline comparison and automatic rollback directly answers how to derisk the rollout."),
  M13: V(2, 2, 2, "Correct: external secret manager with runtime references rather than hardcoded values in templates."),
  M14: V(1, 2, 2, "Express One Zone and same-region are valid, but S3 Select does not help training loads; omits sharding, FastFile, FSx."),
  M15: V(2, 2, 2, "Exactly the canonical answer: stage the payload in object storage and pass only the URI."),
  M16: V(2, 2, 2, "Correct: versioning, lineage and approval status gating promotion through CI/CD to endpoints."),
  M17: V(2, 2, 2, "Right two-tier approach: real-time proxy drift signals plus backfilled labels for delayed performance metrics."),
  M18: V(2, 2, 2, "Correctly names the NVIDIA Container Toolkit injecting host driver libraries at runtime; compatibility phrasing slightly overstated."),
  M19: V(2, 2, 2, "Correct liveness-versus-readiness split, with readiness gated on a real inference proving weights are loaded."),
  M20: V(2, 2, 2, "Strong: schema and contract tests, property-based checks, and a versioned golden dataset for logic verification."),
  M21: V(2, 2, 2, "Same template with per-environment config, isolated accounts, and one artifact promoted through the pipeline."),
  M22: V(2, 2, 2, "Bayesian search, early stopping of weak trials and spot instances directly address cost without losing quality."),
  M23: V(2, 2, 2, "Correctly distinguishes an alert as a signal from sustained distribution shift as the trigger to retrain."),
  M24: V(2, 2, 2, "Chunked backfill with catchup, concurrency limits and pools keeps the scheduler responsive; directly answers."),
  M25: V(2, 2, 2, "Workable design: registry mapping records to shards, asynchronous purge, audit trail; ends on an off-key user-experience note."),
  M26: V(2, 2, 2, "Centralised hardened base image, automatic downstream rebuilds and scanning; exactly the expected fleet-patching answer."),
  M27: V(2, 2, 2, "Answers both halves: traffic splitting and mTLS justify a mesh, latency and overhead argue against."),
  M28: V(2, 2, 2, "Correct: shared transformation library or feature store applied identically at train and serve, avoiding skew."),

  H01: V(2, 2, 2, "Right approach: distribution comparison for out-of-distribution input plus auditing the pipeline for silent upstream failures."),
  H02: V(2, 2, 2, "Excellent SageMaker-specific split of ModelLatency versus OverheadLatency, then utilisation, compilation and serialisation."),
  H03: V(2, 2, 2, "Covers automation and guardrails: tests, shadow deployment against baseline, and threshold-gated automatic promotion."),
  H04: V(2, 2, 2, "Correctly separates OOMKill from pressure eviction and uses node metrics plus tracing for load-only reproduction."),
  H05: V(2, 2, 2, "Sensible: compare task durations against history, check start-time drift, resource contention and data volume growth."),
  H06: V(2, 2, 2, "Correct per-prefix request-rate limits with accurate numbers, plus prefix spreading and FSx for Lustre as fixes."),
  H07: V(2, 2, 2, "Right order: rule out upstream breakage first, then compare distributions and hunt silent transformation failures."),
  H08: V(2, 2, 2, "Exactly right: compare digests, then environment variables and mounts, then architecture and library versions."),
  H09: V(2, 2, 2, "Drift detection, importing the change and re-applying is workable; running a plan is Terraform vocabulary for a stack."),
  H10: V(2, 2, 2, "Covers both halves: roll back serving traffic, then isolate and repair downstream records, plus prevention."),
  H11: V(1, 2, 2, "Profiling is reasonable but misses the first move: diff the change and compare instance type, count and job duration."),
  H12: V(2, 2, 2, "Multi-region active-active with health-checked global routing and replication; ensuring consistency via async replication is loose.")
};

// sanity: reasons <= 25 words, scores in range
for (const [k, v] of Object.entries(verdicts)) {
  const wc = v.reason.trim().split(/\s+/).length;
  if (wc > 25) throw new Error(`reason too long for ${k}: ${wc} words`);
  for (const f of ['correctness', 'on_topic', 'delivery']) {
    if (![0, 1, 2].includes(v[f])) throw new Error(`bad ${f} for ${k}`);
  }
}

fs.writeFileSync(OUT, JSON.stringify(verdicts, null, 1) + '\n', 'utf8');
console.log('wrote', OUT);

const fs = require('fs');

const V = {
  W01: [2, 2, 2, "Correctly distinguishes the read-only template from the running writable instance, with a clean class-object analogy."],
  W02: [2, 2, 2, "Names independent layer caching and least-to-most-changed instruction ordering as the mechanism; accurate and well paced."],
  W03: [2, 2, 2, "Right latency-versus-archival tradeoff with realistic retrieval times, applied specifically to training data."],
  W04: [2, 2, 2, "Accurately describes the managed HTTPS inference interface hosting S3 model artifacts on managed instances."],
  W05: [2, 2, 2, "Correct DAG definition plus the real reasons Airflow needs acyclicity: dependency ordering and parallelism."],
  W06: [2, 2, 2, "Ties artifacts to data, hyperparameters and preprocessing for reproducibility and rollback; solid reasoning."],
  W07: [2, 2, 2, "Correct pod-versus-deployment split covering replica count, rolling updates and rollbacks."],
  W08: [2, 2, 2, "Cleanly separates input-distribution shift from a changed input-to-target relationship."],
  W09: [2, 2, 2, "Names environment drift, manual configuration error and reproducibility; the standard correct answer."],
  W10: [2, 2, 1, "Correct versioned prefix layout and lifecycle policy, but the written 'version/' folder reads as a path aloud."],
  W11: [2, 2, 2, "Correct multi-stage rationale: build wheels in stage one, copy artifacts into a minimal runtime image."],
  W12: [2, 2, 2, "Correctly frames a sensor as a specialised operator that blocks until an external condition is met."],
  M01: [2, 2, 2, "Names Kolmogorov-Smirnov and PSI against a training baseline with thresholded alerting; the right mechanism."],
  M02: [2, 2, 2, "Accurate SageMaker pipeline shape: EventBridge schedule, processing, training, then a registry approval gate."],
  M03: [2, 2, 2, "Custom-metric HPA via Prometheus Adapter plus Cluster Autoscaler; correct two-level scaling."],
  M04: [2, 2, 2, "Correctly contrasts hand-built snowflake environments with versioned, repeatable, drift-free stacks."],
  M05: [2, 2, 2, "KMS server-side encryption, least-privilege IAM, Block Public Access, Object Lock and CloudTrail; all accurate."],
  M06: [2, 2, 2, "Covers code, data schema and model-quality gates, including a small end-to-end training run."],
  M07: [2, 2, 2, "Exponential-backoff retries, transient-versus-permanent error discrimination and SLA alerting; practical and correct."],
  M08: [2, 2, 2, "Multi-stage build, slimmer base image and a layer audit; the standard correct size levers."],
  M09: [2, 2, 2, "Correct latency-versus-throughput and cost tradeoff between real-time endpoints and batch transform."],
  M10: [2, 2, 2, "Sensible three-tier dashboard: business impact, ranking quality with coverage, and serving health."],
  M11: [1, 2, 2, "Namespace quotas and Volcano are right, but calls NVIDIA MIG a scheduler; MIG is GPU partitioning."],
  M12: [2, 2, 2, "Canary rollout with baseline metric comparison and automatic rollback; directly answers the safe-rollout question."],
  M13: [2, 2, 2, "Correct: external secret store referenced by dynamic lookup or runtime injection, nothing committed."],
  M14: [2, 2, 2, "Express One Zone, server-side filtering and region locality are valid speedups, though parallel sharding goes unmentioned."],
  M15: [2, 2, 2, "The canonical answer: stage the payload in object storage and pass only the reference through XCom."],
  M16: [2, 2, 2, "Correctly identifies versioning, lineage and approval status as the gate on CI/CD deployment."],
  M17: [2, 2, 2, "Proxy drift metrics now plus backfilled labels later; exactly the right two-tier strategy for delayed truth."],
  M18: [1, 2, 2, "Toolkit and runtime are right, but claims it ensures CUDA compatibility and says host kernel, not driver."],
  M19: [2, 2, 2, "Correct liveness-versus-readiness split with a dummy inference confirming weights are actually loaded."],
  M20: [2, 2, 2, "Tests logic rather than values via schema, contract and property tests plus a frozen golden dataset."],
  M21: [2, 2, 2, "Same template with per-environment config, isolated accounts, and one promoted artifact; correct parity approach."],
  M22: [2, 2, 2, "Bayesian search over grid, early stopping of dead trials, and spot instances; the right cost levers."],
  M23: [2, 2, 2, "Gives a real threshold: sustained degradation from a genuine distribution shift, not a transient alert."],
  M24: [2, 2, 2, "Chunked backfill with catchup and a pool concurrency limit; keeps the scheduler responsive."],
  M25: [2, 2, 2, "Concrete design: user-to-shard metadata registry, asynchronous purge, and tamper-proof completion audit."],
  M26: [2, 2, 2, "Central hardened base image with automatic downstream rebuilds and vulnerability scanning; correct and complete."],
  M27: [2, 2, 2, "Answers both sides: mTLS and traffic splitting for it, added latency and overhead against it."],
  M28: [2, 2, 2, "Names training-serving skew and the shared-library or feature-store fix; precisely on point."],
  H01: [2, 2, 2, "Right debugging order: compare feature distributions first, then hunt silent inference-pipeline failures."],
  H02: [2, 2, 2, "Uses the real ModelLatency-versus-OverheadLatency split, then utilisation and serialisation; strong diagnosis and fixes."],
  H03: [2, 2, 2, "Automated tests, shadow deployment and threshold-gated promotion; the guardrails sub-part is explicitly answered."],
  H04: [2, 2, 2, "Correctly separates OOMKills from node-pressure evictions and hunts load-only memory growth staging misses."],
  H05: [2, 2, 2, "Compares task durations against history, then looks at contention and data growth; the right starting point."],
  H06: [2, 2, 1, "Correct per-prefix rate limits and fixes, but opens in second person, breaking the candidate's voice."],
  H07: [2, 2, 2, "Good discriminator: upstream job and schema checks first, then distributions versus silent transform failures."],
  H08: [2, 2, 2, "Compares image digests first, then environment, mounts and host architecture; exactly the right sequence."],
  H09: [2, 2, 2, "Drift detection, reconciling code with the changed resource, then verifying before applying; sound recovery."],
  H10: [2, 2, 2, "Covers both halves: immediate version rollback and targeted downstream cleanup, plus a prevention gate."],
  H11: [2, 2, 2, "Profiles the training loop and diffs utilisation against the prior baseline to localise the cost spike."],
  H12: [2, 2, 2, "Active-active multi-region with health-check routing, async replication and fast failover; correct design."],
};

const out = {};
for (const [k, [correctness, on_topic, delivery, reason]] of Object.entries(V)) {
  out[k] = { correctness, on_topic, delivery, reason };
}

const dest = process.argv[2];
fs.writeFileSync(dest, JSON.stringify(out, null, 1) + '\n', 'utf8');
console.log('wrote', Object.keys(out).length, 'verdicts to', dest);

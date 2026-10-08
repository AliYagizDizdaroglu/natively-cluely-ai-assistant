import fs from 'node:fs';

const v = {
  W01: [2, 2, 2, "Accurate image-versus-container distinction, natural spoken length."],
  W02: [2, 2, 2, "Correct on layer caching and instruction ordering for build speed."],
  W03: [2, 2, 2, "Correct access-pattern and cost tradeoff between Standard and Glacier."],
  W04: [2, 2, 1, "Answers both what it is and what it hosts, but runs to 86 words."],
  W05: [2, 2, 1, "Correct DAG definition and scheduler rationale; 90 words is long for speech."],
  W06: [2, 2, 2, "Correct reproducibility and rollback rationale for versioning artifacts with code."],
  W07: [2, 2, 2, "Correct pod-versus-deployment distinction including scaling and self-healing."],
  W08: [2, 2, 2, "Correctly separates input-distribution shift from a change in the input-target relationship."],
  W09: [2, 2, 2, "Names the real problem: configuration drift and unreproducible manual environments."],
  W10: [2, 2, 0, "Sound layout, but reads a raw s3:// URI aloud, which is unusable as speech."],
  W11: [2, 2, 2, "Correct build-versus-runtime split and why it shrinks the image."],
  W12: [2, 2, 2, "Correct operator-versus-sensor distinction with a concrete waiting example."],
  M01: [1, 2, 2, "Right method and thresholds, but names MLflow as an alerting destination, which it is not."],
  M02: [2, 2, 2, "Correct pipeline steps with conditional registration against the champion."],
  M03: [2, 2, 2, "Correct HPA on custom latency or GPU metrics scraped by Prometheus."],
  M04: [2, 2, 2, "Correct case for version-controlled, repeatable infrastructure over console clicks."],
  M05: [2, 2, 2, "Correct layered controls: KMS encryption, least-privilege policies, VPC endpoints."],
  C01: [2, 2, 0, "Bucket-sort solution is correct, but delivered as a code block with markdown and Time/Space lines."],
  C01F1: [2, 2, 2, "Correctly states linear time and why it cannot be improved."],
  C01F2: [0, 2, 2, "Claims the frequency array blows up on large values; its buckets are indexed by frequency, bounded by n."],
  M06: [2, 2, 2, "Correct layered CI: schema checks, training integration tests, slice-based evaluation."],
  M07: [2, 2, 2, "Correct retry with backoff plus a sensor gating downstream tasks."],
  M08: [2, 2, 2, "Correct approach: multi-stage build, slim base, layer analysis to find the bloat."],
  M09: [2, 2, 2, "Correct latency-versus-throughput tradeoff for real-time against batch transform."],
  M10: [2, 2, 2, "Well-structured business, model and system metrics for a ranking model."],
  M11: [2, 2, 2, "Correct combination of quotas, requests/limits, autoscaling and priority classes."],
  M12: [2, 2, 2, "Correct canary or blue-green rollout with monitored automated rollback."],
  M13: [2, 2, 2, "Correct runtime injection via a secrets manager and pipeline-scoped credentials."],
  M14: [2, 2, 2, "Correct throughput levers: parallel multipart reads, sharding, columnar formats."],
  M15: [2, 2, 2, "Correct pattern: store the payload in S3 and pass only the reference through XCom."],
  M16: [2, 2, 2, "Correct role of the registry as versioned gatekeeper between CI and production."],
  M17: [2, 2, 2, "Correct shift to proxy signals and input drift while labels are pending."],
  M18: [2, 2, 2, "Correct use of NGC base images, pinned versions and the NVIDIA Container Toolkit."],
  C02: [2, 2, 0, "Correct sorted-key grouping, but markdown, code block and Time/Space lines cannot be spoken."],
  C02F1: [2, 2, 1, "Correct canonical-key argument and per-string cost; a stray LaTeX cdot token needs editing out."],
  C02F2: [2, 2, 2, "Correctly raises Unicode normalization and notes the complexity is unchanged."],
  M19: [2, 2, 2, "Correct liveness-versus-readiness split with a model-loaded readiness check."],
  M20: [2, 2, 2, "Correct: schema invariants, drift alerts and golden datasets for regression."],
  M21: [1, 1, 2, "Never says how stacks are structured or parameterized; drifts to containers and data namespaces."],
  M22: [2, 2, 2, "Correct: Bayesian or Hyperband search, ephemeral jobs, warm start to cut cost."],
  M23: [2, 2, 2, "Correctly ties the retrain decision to persistent, performance-linked shift, not noise."],
  M24: [2, 2, 2, "Correct chunked, idempotent backfill with controlled concurrency and per-partition retry."],
  M25: [2, 2, 2, "Correct partitioned layout plus an index for targeted, auditable deletion."],
  M26: [2, 2, 2, "Correct centralized hardened base image with automated rebuild and vulnerability scanning."],
  M27: [2, 2, 1, "Covers both when to use a mesh and when to avoid it, but runs to 96 words."],
  M28: [2, 2, 2, "Correctly names a feature store and shared transformation logic to kill training-serving skew."],
  H01: [2, 2, 2, "Right instinct: check distributions first, then upstream changes that keep the schema valid."],
  H02: [1, 1, 2, "Only diagnoses; never gives the fix the question explicitly asked for."],
  H03: [2, 2, 2, "Compact but complete: drift trigger, automated evaluation gate, champion comparison, blue-green deploy."],
  C03: [0, 0, 1, "Answers a drift-and-retraining question instead of the ring buffer on screen, with an invented complexity claim."],
  C03F1: [0, 1, 2, "Describes a distributed queue service with workers and health checks, not the buffer's full-versus-empty test."],
  C03F2: [2, 2, 2, "Correct thread-safety answer: lock the check-and-update so two threads cannot pop the same item."],
  H04: [2, 2, 2, "Correct eviction triage: OOMKilled events, probe timeouts under load, node contention."],
  H05: [2, 2, 2, "Correct starting points: task logs, scheduler health, upstream delays, concurrency limits."],
  H06: [1, 2, 2, "Misses the actual mechanism, S3 per-prefix request-rate throttling, and drifts into databases and feature stores."],
  H07: [2, 2, 1, "Cross-referencing pipeline health logs answers it well, but 98 words is long for speech."],
  H08: [2, 2, 2, "Correct parity triage: compare digests and environment, then reproduce the cluster runtime locally."],
  H09: [1, 2, 2, "Right instinct to reconcile from source of truth, but answers a CloudFormation stack question with Terraform, Kubernetes and \"cluster\"."],
  H10: [2, 2, 1, "Covers both the traffic rollback and downstream data reconciliation; 103 words runs long."],
  H11: [2, 2, 2, "Correct method: compare utilization against the baseline run, then profile the changed code."],
  H12: [2, 2, 2, "Correct multi-region active-active design with DNS health checks and cross-region replication."],
  L01: [1, 1, 2, "Covers only the training pipeline; skips the validation and rollout parts that were explicitly asked."],
  "L01#2": [1, 1, 2, "Good shadow-then-canary answer, but omits the training pipeline half of the question."],
  L01F1: [2, 2, 2, "Correct fallback to the previous day's model with alerting on the missed window."],
  L01F2: [2, 2, 2, "Correct segment-level metric breakdown with per-cohort thresholds and rollback."],
  L02: [2, 2, 2, "Addresses layout, per-workload autoscaling and cost with spot for the batch job."],
  "L02#2": [2, 2, 2, "Correct taints and affinity for isolation, HPA on queue depth, spot capacity for batch."],
  L02F1: [2, 2, 2, "Correct fix: priority classes, quotas and limits to protect the latency budget."],
  L02F2: [2, 2, 1, "Right signals, but reading four snake_case Prometheus metric names aloud needs editing."],
  L03: [1, 1, 2, "Sets up centralized monitoring but omits who gets paged and how false alarms stay low."],
  "L03#2": [1, 1, 2, "Good tiered-alerting answer, but covers only the alert-fatigue part of a multi-part design question."],
  L03F1: [2, 2, 2, "Cleanly splits real-time infrastructure and prediction signals from daily feature statistics."],
  L03F2: [2, 2, 2, "Correct self-service onboarding via template, manifest and automatic registration."],
  L04: [1, 1, 2, "Handles late data and corrections only; skips backfill and training-serving consistency."],
  "L04#2": [1, 1, 2, "Answers only the training-serving consistency part, in two sentences."],
  L04F1: [1, 2, 2, "Credits the feature store with automatic recomputation, skipping the Airflow partition re-run that actually does it."],
  L04F2: [2, 2, 2, "Correct online store choice with batch writes and key-value lookups at serving."],
  L05: [1, 1, 2, "Covers adoption and parameterization but never says how a change reaches production safely."],
  "L05#2": [1, 2, 1, "Strong import-and-modularize plan, but the promotion path stops at dev and it runs to 87 words."],
  L05F1: [2, 2, 2, "Correct: plan for drift, import the hand-made resources, then reconcile against the modules."],
  L05F2: [2, 2, 2, "Correct control: remove production write access and force changes through the reviewed pipeline."],
  L06: [1, 2, 1, "Covers every part asked, but names MLflow as a CI/CD tool and calls blue-green a gradual traffic shift; 90 words."],
  L06F1: [2, 2, 2, "Sensible split of hard blocks from warnings with a clear rationale."],
  L06F2: [2, 2, 2, "Realistic estimate that correctly flags training time as the main variable."]
};

const pairsPath = process.argv[2];
const outPath = process.argv[3];
const pairs = JSON.parse(fs.readFileSync(pairsPath, 'utf8'));
const keys = pairs.items.map(i => i.key);

const missing = keys.filter(k => !(k in v));
const extra = Object.keys(v).filter(k => !keys.includes(k));
if (missing.length) throw new Error('missing verdicts for: ' + missing.join(','));
if (extra.length) throw new Error('extra verdicts: ' + extra.join(','));

const out = {};
for (const k of keys) {
  const [c, t, d, reason] = v[k];
  for (const s of [c, t, d]) if (!Number.isInteger(s) || s < 0 || s > 2) throw new Error('bad score for ' + k);
  const words = reason.trim().split(/\s+/).length;
  if (words > 25) throw new Error('reason too long (' + words + ') for ' + k);
  out[k] = { correctness: c, on_topic: t, delivery: d, reason };
}
fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n', 'utf8');
console.log('wrote', outPath, 'entries:', Object.keys(out).length, 'items:', keys.length);

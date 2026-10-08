const fs = require('fs');
const path = require('path');

const RUN = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-06T08-14-21-after7';
const PAIRS = path.join(RUN, 'interview60.judge.pairs.json');
const OUT = path.join(RUN, 'interview60.judge.verdicts.json');

const V = {};
const put = (key, c, t, d, reason) => { V[key] = { correctness: c, on_topic: t, delivery: d, reason }; };

put('W01', 2, 2, 2, 'Accurate image-versus-container distinction with a clean class/object analogy; concise and natural to say aloud.');
put('W02', 2, 2, 2, 'Correctly explains layer caching and Dockerfile ordering to maximise cache hits; tight, natural spoken answer.');
put('W03', 2, 2, 2, 'Correct Standard-versus-Glacier trade-off with access-pattern and retrieval-time reasoning; natural spoken delivery.');
put('W04', 2, 2, 2, 'Correctly describes managed hosting, instances, autoscaling and REST inference; directly answers what an endpoint hosts.');
put('W05', 2, 2, 2, 'Correct DAG definition and explains why acyclic ordering suits Airflow workflows; natural spoken length.');
put('W06', 2, 2, 1, 'Correct reproducibility, rollback and lineage reasoning; slightly over the spoken band and would need trimming.');
put('W07', 2, 2, 2, 'Accurate pod-versus-deployment distinction covering replicas, rolling updates and rollbacks; natural spoken answer.');
put('W08', 2, 2, 1, 'Correct and clear distinction with good examples, but at 106 words it runs past the spoken band.');
put('W09', 2, 2, 2, 'Correctly names configuration drift, environment parity and repeatable provisioning; concise and natural.');
put('W10', 2, 1, 2, 'Layout zones and lifecycle are correct, but it never addresses the weekly versioning the question asked about.');
put('W11', 2, 2, 2, 'Correct builder-plus-slim-runtime pattern with size, security and deploy-speed rationale; natural spoken length.');
put('W12', 2, 2, 2, 'Correct operator-versus-sensor distinction with concrete polling examples; natural first-person delivery.');

put('M01', 2, 2, 2, 'Correct baseline comparison with PSI and Jensen-Shannon plus alerting and retrain trigger; concise and natural.');
put('M02', 2, 2, 1, 'Correct SageMaker Pipelines structure: processing, training, registry gate, EventBridge schedule. Slightly long for speech.');
put('M03', 2, 2, 2, 'Correct HPA on custom latency and GPU metrics via Prometheus Adapter; specific and natural to say aloud.');
put('M04', 2, 2, 2, 'Correct reproducibility, drift-elimination and multi-environment reasoning; concise, natural first-person delivery.');
put('M04#2', 2, 2, 2, 'Same correct CloudFormation reasoning as the first answer; concise and natural to say aloud.');
put('M05', 2, 2, 1, 'Correct KMS, block-public-access, least-privilege IAM, Access Points and CloudTrail auditing; a little long for speech.');
put('C01', 0, 1, 0, 'Fabricates a dedup algorithm for a problem it never saw, and delivers it as a numbered list.');

put('M06', 2, 2, 1, 'Correct three layers: code tests, data validation, model behaviour checks. Slightly past the spoken band.');
put('M07', 2, 2, 1, 'Correct retries with backoff plus decoupling transient failures from schema changes; a little long for speech.');
put('M08', 2, 2, 1, 'Correct layer audit, multi-stage build and leaner base image; slightly over the spoken length band.');
put('M09', 2, 2, 2, 'Correct latency-versus-throughput trade-off with concrete real-time and batch examples; natural spoken answer.');
put('M10', 2, 2, 2, 'Correct mix of ranking quality, latency and throughput, and business KPIs; natural spoken length.');
put('M11', 2, 2, 2, 'Correct namespace quotas, Volcano scheduling, requests and limits, and utilisation tracking; concise and natural.');
put('M12', 2, 2, 2, 'Correct blue-green with canary traffic shifting and automated rollback triggers; natural spoken length.');
put('M13', 2, 2, 2, 'Correct secret manager plus runtime injection, gitignore and pre-commit scanning; natural spoken answer.');
put('M14', 1, 2, 1, 'FSx for Lustre and parallel fetch are right, but it leads with S3 Select, wrong for bulk loading.');
put('M15', 2, 2, 2, 'Correct pattern: write the payload to S3 and pass only the URI through XCom. Natural delivery.');
put('M16', 2, 2, 1, 'Correct registry role: versioning, lineage, approval gate feeding CI/CD promotion. Runs past the spoken band.');
put('M17', 2, 2, 1, 'Correct pivot to proxy metrics, prediction drift and shadow comparison when labels lag; slightly long.');
put('M18', 2, 2, 2, 'Correct NVIDIA Container Toolkit, pinned CUDA base images, host driver compatibility and GPU exposure flag.');
put('C02', 0, 1, 0, 'Invents a batching and throughput answer for an unseen problem and delivers it as a numbered list.');

put('M19', 2, 2, 2, 'Correct liveness-versus-readiness split with a model-loaded readiness check; natural spoken answer.');
put('M20', 2, 2, 1, 'Correct schema and distribution testing with Great Expectations plus drift alerts; at 115 words, needs trimming.');
put('M21', 2, 1, 1, 'Correct parity and isolation points, but drifts into CI/CD and model rollout rather than stack structure.');
put('M22', 2, 2, 2, 'Correct Bayesian and Hyperband pruning, managed tuning limits and spot instances; natural spoken length.');
put('M23', 2, 2, 2, 'Correct persistence-versus-transient reasoning for choosing retraining over alerting; concise and natural.');
put('M24', 2, 2, 2, 'Correct chunked time-partitioned backfill with concurrency limits and load monitoring; natural spoken length.');
put('M25', 2, 2, 2, 'Correct propagation of deletion across raw, feature and cache layers with GDPR framing; natural delivery.');
put('M26', 2, 2, 2, 'Correct central registry, automated rebuilds, vulnerability scanning and safe rollout; natural spoken length.');
put('M27', 2, 1, 1, 'Correct reasons to adopt a mesh, but never covers the second half asking when you would not.');
put('M27#2', 2, 1, 2, 'Correct overhead and complexity reasons to avoid a mesh, but covers only half the question asked.');
put('M28', 2, 2, 1, 'Correct feature store plus shared transformation libraries to prevent training-serving skew; slightly long for speech.');

put('H01', 2, 2, 2, 'Sensible order: distribution comparison first, then silent upstream pipeline failures and null quality issues.');
put('H02', 2, 2, 1, 'Correct isolation of inference versus overhead via CloudWatch and X-Ray, then scaling, batching, caching. Slightly long.');
put('H03', 2, 2, 2, 'Correct automated flow with holdout validation, baseline comparison and shadow gating as guardrails; natural length.');
put('C03', 0, 0, 0, 'Describes an MLOps pipeline instead of the coding problem, gives no time complexity, uses a numbered list.');
put('H04', 2, 2, 1, 'Correct focus on node memory pressure, OOMKills and requests versus limits; at 117 words it needs trimming.');
put('H05', 2, 2, 1, 'Correct scheduler, pool, duration-history and downstream contention checks for a newly missed window; slightly long.');
put('H06', 2, 2, 1, 'Correctly names the per-prefix request limits and fixes with prefix spreading and FSx for Lustre.');
put('H07', 1, 2, 1, 'Single-feature versus systemic heuristic is weak: a broken upstream pipeline can shift every feature at once.');
put('H08', 2, 2, 2, 'Correct parity, driver and preprocessing checks, ending with layer-by-layer output comparison; natural spoken length.');
put('H09', 1, 2, 1, 'Right concepts, drift detection and import, but names terraform plan and kubectl diff for a CloudFormation stack.');
put('H10', 2, 2, 2, 'Correct rollback first, then cleanup of data written in the incident window, then prevention; natural length.');
put('H11', 2, 2, 2, 'Correct baseline comparison of utilisation plus profiling for inefficient data loading or batching; natural length.');
put('H12', 2, 2, 2, 'Correct multi-region active-active with global load balancer, Global Tables and S3 cross-region replication.');

// --- self-checks before writing ---
const pairs = JSON.parse(fs.readFileSync(PAIRS, 'utf8'));
const pairKeys = pairs.items.map(i => i.key);
const dupPairKeys = pairKeys.filter((k, i) => pairKeys.indexOf(k) !== i);
if (dupPairKeys.length) throw new Error('duplicate keys in pairs file: ' + dupPairKeys.join(','));

const vKeys = Object.keys(V);
const missing = pairKeys.filter(k => !(k in V));
const extra = vKeys.filter(k => !pairKeys.includes(k));
if (missing.length) throw new Error('missing verdicts for: ' + missing.join(','));
if (extra.length) throw new Error('extra verdict keys: ' + extra.join(','));

for (const [k, v] of Object.entries(V)) {
  for (const f of ['correctness', 'on_topic', 'delivery']) {
    if (![0, 1, 2].includes(v[f])) throw new Error(k + ' bad ' + f + ': ' + v[f]);
  }
  const words = v.reason.trim().split(/\s+/).filter(Boolean).length;
  if (words > 25) throw new Error(k + ' reason too long: ' + words + ' words');
  if (!v.reason.trim()) throw new Error(k + ' empty reason');
}

// preserve the pairs file's item order
const ordered = {};
for (const k of pairKeys) ordered[k] = V[k];

fs.writeFileSync(OUT, JSON.stringify(ordered, null, 1) + '\n', 'utf8');
console.log('wrote', OUT, 'keys=', Object.keys(ordered).length);

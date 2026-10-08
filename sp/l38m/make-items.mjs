// L38M: writes items.json (the 64-turn mixed router set of SET-draft.md, approved by the user 2026-10-02 00:5x):
// chains in interview order (E1 chain, H1 chain, E2 chain, ...), per-id class, text, and the pre-registered answer
// terms for the E and QF items. Refuses to overwrite.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'items.json');
if (fs.existsSync(OUT)) { console.log('REFUSED: items.json exists'); process.exit(2); }
const ON = String.raw`O\s*\(\s*n\s*\)|\blinear\b|\bO of n\b|\bo n\b|\border of n\b(?!\s*log)`;
// [id, class, text, terms (E/QF only)]
const E = [
    ['E01', 'For a heavily imbalanced churn classifier, would you report accuracy or PR-AUC?', String.raw`PR[- ]?AUC|precision[- ]recall|\bP R\b`, ['E01F', 'AF', 'Why that one?']],
    ['E02', 'In XGBoost, what does the learning rate scale?', String.raw`contribution|step|shrink|weight|each tree|new tree|tree|update|gradient`],
    ['E03', 'In top-k retrieval for RAG, what does k control?', String.raw`number of|how many|chunks|documents|passages|results`, ['E03F', 'QF', 'And what happens to recall as k grows?', String.raw`increas|rise|goes up|higher|improv|better`]],
    ['E04', 'Which HTTP status should your gateway return when the downstream model times out?', String.raw`504`, ['E04F', 'QF', 'And for a malformed client payload?', String.raw`400|422`]],
    ['E05', 'What does a Kubernetes readiness probe gate?', String.raw`traffic|request|service|endpoint|load ?balanc`],
    ['E06', 'Is a ConfigMap the right place for an API key?', String.raw`\bno\b|secret`, ['E06F', 'QF', "How are a Secret's values encoded?", String.raw`base ?-?64`]],
    ['E07', 'Which S3 storage class would you use for training data you read once a year?', String.raw`glacier|deep archive`],
    ['E08', 'In Airflow, what does catchup equals false do?', String.raw`skip|backfill|past|missed|historical|latest|only the most recent`],
    ['E09', "Does a Docker container share the host's kernel?", String.raw`\byes\b|shares`],
    ['E10', "Which Dockerfile instruction sets the container's default command?", String.raw`\bCMD\b|\bC M D\b|\bcommand\b`],
    ['E11', 'Which SageMaker feature serves many models from one endpoint?', String.raw`multi[- ]?model`, ['E11F', 'AF', 'Have you used that in production?']],
    ['E12', 'Which statistical test would you reach for to detect drift in a numeric feature?', String.raw`Kolmogorov|\bK[- ]?S\b|Smirnov|\bPSI\b|population stability|Wasserstein`, ['E12F', 'QF', 'And for a categorical feature?', String.raw`chi|χ|\bPSI\b|population stability|Jensen|\bJS\b`]],
    ['E13', 'When a CloudFormation stack is deleted, what happens to its resources by default?', String.raw`delet|removed|destroy`],
    ['E14', 'Which CI step should block a merge: unit tests or model retraining?', String.raw`unit test`],
    ['E15', 'In a token-bucket rate limiter, what does the refill rate bound?', String.raw`sustain|average|long[- ](run|term)|steady|throughput|request rate|rate of requests|requests per`],
    ['E16', 'What is the average time complexity of a Python dict lookup?', String.raw`O\s*\(\s*1\s*\)|\bconstant\b|\bO of (one|1)\b|\border of (one|1)\b`, ['E16F', 'QF', 'And the worst case?', ON]],
    ['E17', 'For nightly churn scoring of ten million customers, batch or online inference?', String.raw`batch`, ['E17F', 'AF', 'Is that still right at ten times the volume?']],
    ['E18', 'Which Kubernetes object gives pods a stable network identity: a Deployment or a StatefulSet?', String.raw`stateful ?set`],
    ['E19', "Which sampling temperature makes an LLM's output most deterministic?", String.raw`\bzero\b|\b0\b`],
    ['E20', 'Which Postgres extension stores vector embeddings?', String.raw`pg ?vector`, ['E20F', 'AF', 'How confident are you in that choice?']],
];
const H = [
    ['H01', "Your churn model's PR-AUC fell from 0.62 to 0.48 in production this month. Walk me through how you would find out whether it is data drift, concept drift or a pipeline bug.", ['H01F', 'HF', 'Which of those would you rule out first, and how?']],
    ['H02', 'How do you choose between XGBoost and logistic regression for churn when the business needs a reason code for every customer?', ['H02F', 'AF', 'Does your choice change at five hundred million rows?']],
    ['H03', 'Design the chunking and retrieval for fifty thousand PDF contracts where clauses reference other clauses.', ['H03F', 'AF', 'What latency budget does your design assume?']],
    ['H04', "How would you evaluate a RAG system's answers without human labels for every question?", ['H04F', 'AF', 'Which failure would that evaluation miss?']],
    ['H05', 'Design a Python AI gateway that fronts three LLM providers, with failover, per-tenant rate limits and cost tracking.', ['H05F', 'AF', "What's the time complexity of your rate limiter?"]],
    ['H06', "A FastAPI service's p99 latency doubles under load while CPU stays at thirty percent. What do you check, and in what order?", ['H06F', 'AF', 'Which of those checks would you automate?']],
    ['H07', 'How would you autoscale a GPU inference service on Kubernetes when requests arrive in bursts and a cold start takes ninety seconds?', ['H07F', 'AF', 'Where does your approach break first?']],
    ['H08', 'Explain the difference between requests and limits for a model-serving pod, and what happens when the pod exceeds each.'],
    ['H09', 'Design an A/B test for a new recommendation model on a retail site where purchases are rare and seasonal.', ['H09F', 'AF', 'How long would you run it?']],
    ['H10', 'How would you detect and handle a feedback loop where the recommender keeps showing only the items it has already recommended?'],
    ['H11', 'Compare a SageMaker real-time endpoint, serverless inference and batch transform for a model called two thousand times a day with a two-second SLA.'],
    ['H12', 'Set up monitoring for a deployed credit model: which signals, which thresholds, and who gets paged for what?', ['H12F', 'AF', 'How would you avoid alert fatigue with that setup?']],
    ['H13', 'Design the S3 layout and lifecycle policy for training data that arrives daily, is reprocessed weekly and must be kept for seven years for audit.'],
    ['H14', 'A CloudFormation update fails halfway and rolls back, but the rollback fails too. What do you do?', ['H14F', 'HF', 'How would you prevent that next time?']],
    ['H15', 'An Airflow DAG with two hundred tasks takes six hours, but its critical path is only two hours. How would you find and fix the bottleneck?'],
    ['H16', 'Your training image is nine gigabytes and builds take forty minutes. How would you cut both without breaking reproducibility?', ['H16F', 'AF', 'Which of your changes gives the most for the least risk?']],
    ['H17', 'Design a CI/CD pipeline for an ML model where retraining is triggered by drift, with a human approval before promotion.', ['H17F', 'AF', "What's your rollback story?"]],
    ['H18', 'Write a function that returns the longest window of a time series in which the maximum minus the minimum stays under a threshold, and tell me its complexity.', ['H18F', 'AF', 'Can you do it in a single pass?']],
    ['H19', 'Given tables customers and payments, write the SQL for each customer\'s second-highest payment and the month it happened.'],
    ['H20', 'Tell me about a model you shipped that hurt a business metric, and what you changed afterwards.', ['H20F', 'AF', 'Was that the right call, in hindsight?']],
];
const items = { class: {}, text: {}, terms: {}, parent: {}, chains: [] };
for (let k = 0; k < 20; k++) {
    const [eid, et, eterms, ef] = E[k];
    items.class[eid] = 'E'; items.text[eid] = et; items.terms[eid] = eterms;
    const ec = [eid];
    if (ef) { const [fid, fc, ft, fterms] = ef; items.class[fid] = fc; items.text[fid] = ft; items.parent[fid] = eid; if (fterms) items.terms[fid] = fterms; ec.push(fid); }
    items.chains.push(ec);
    const [hid, ht, hf] = H[k];
    items.class[hid] = 'H'; items.text[hid] = ht;
    const hc = [hid];
    if (hf) { const [fid, fc, ft] = hf; items.class[fid] = fc; items.text[fid] = ft; items.parent[fid] = hid; hc.push(fid); }
    items.chains.push(hc);
}
const ids = items.chains.flat();
const count = (c) => ids.filter((id) => items.class[id] === c).length;
console.log(`turns ${ids.length}, chains ${items.chains.length}: E ${count('E')}, QF ${count('QF')}, AF ${count('AF')}, H ${count('H')}, HF ${count('HF')}`);
// The draft said 64 turns and 17 AF: an arithmetic slip; the questions as written give 63 and 16.
if (ids.length !== 63 || count('E') !== 20 || count('H') !== 20 || count('QF') !== 5 || count('AF') !== 16 || count('HF') !== 2) { console.log('REFUSED: counts differ from the set'); process.exit(2); }
for (const id of ids) if (['E', 'QF'].includes(items.class[id])) new RegExp(items.terms[id], 'i');
fs.writeFileSync(OUT, JSON.stringify(items, null, 1));
console.log('wrote items.json');

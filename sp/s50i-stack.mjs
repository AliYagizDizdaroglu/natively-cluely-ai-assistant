// Throwaway: the real question behind "context vs bare" — does the answer name technologies the
// candidate has actually used? Builds a vocabulary of named tools from the captured SYSTEM prompt
// (the résumé/knowledge block the app sends) and counts, per arm, how many answers name a tool
// that is NOT in it. Counts only; no résumé text is printed.
import fs from 'node:fs';
import path from 'node:path';
const PROJ = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant';
const RUN = path.join(PROJ, 'electron/test/golden/interview60.runs/2026-09-18T08-22-57-s50i');
const prompts = JSON.parse(fs.readFileSync(path.join(RUN, 'interview60.prompts.json'), 'utf8'));
const pairs = Object.fromEntries(JSON.parse(fs.readFileSync(path.join(RUN, 'interview60.judge.pairs.json'), 'utf8')).items.map((p) => [p.id, p.answer ?? '']));
const bare = JSON.parse(fs.readFileSync(path.join(RUN, 'interview60.answers.gemini-3.1-flash-lite_low.json'), 'utf8'));
const capl = JSON.parse(fs.readFileSync(path.join(RUN, 'interview60.answers.gemini-3.1-flash-lite_captured-low.json'), 'utf8'));

// A broad vocabulary of named MLOps technologies; which of these the candidate actually uses is
// decided by the captured system prompt, not by me.
const TOOLS = ['Spark', 'MLflow', 'Kubeflow', 'Airflow', 'Dagster', 'Prefect', 'Databricks', 'Snowflake', 'BigQuery',
    'Redshift', 'PostgreSQL', 'Postgres', 'MySQL', 'MongoDB', 'Cassandra', 'DynamoDB', 'Redis', 'Kafka', 'Kinesis',
    'RabbitMQ', 'Feast', 'Tecton', 'SageMaker', 'Vertex AI', 'Azure ML', 'Databricks', 'Ray', 'Dask', 'Flink',
    'Beam', 'dbt', 'Great Expectations', 'Evidently', 'WhyLabs', 'Arize', 'Weights & Biases', 'Neptune', 'Comet',
    'Seldon', 'KServe', 'BentoML', 'Triton', 'TorchServe', 'ONNX', 'Kubernetes', 'Docker', 'Terraform', 'Helm',
    'Prometheus', 'Grafana', 'Datadog', 'Splunk', 'Elasticsearch', 'Pinecone', 'Weaviate', 'Qdrant', 'Milvus',
    'Chroma', 'FAISS', 'LangChain', 'LlamaIndex', 'LangSmith', 'Logfire', 'Cosmos', 'Blob Storage', 'S3', 'GCS'];

const sys = Object.values(prompts).map((p) => p.system).join('\n');
const inStack = new Set(TOOLS.filter((t) => new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\&]/g, '\\$&')}\\b`, 'i').test(sys)));
const offStack = TOOLS.filter((t) => !inStack.has(t));
console.log(`tool vocabulary: ${TOOLS.length} names;  present in the app's own context block: ${inStack.size};  absent: ${offStack.length}\n`);

const ids = Object.keys(bare).filter((id) => bare[id]?.spoken && pairs[id]);
const hit = (txt, list) => list.filter((t) => new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\&]/g, '\\$&')}\\b`, 'i').test(txt));
console.log(`over the ${ids.length} mains all three answered:`);
console.log('arm                            answers naming an OFF-CONTEXT tool   the tools they named');
for (const [name, get] of [['in-app (live, app context)', (id) => pairs[id]],
                           ['offline twin (app context)', (id) => capl[id]?.spoken ?? ''],
                           ['bare (no context)', (id) => bare[id]?.spoken ?? '']]) {
    const named = new Map();
    let n = 0;
    for (const id of ids) {
        const h = hit(get(id), offStack);
        if (h.length) { n++; for (const t of h) named.set(t, (named.get(t) ?? 0) + 1); }
    }
    const top = [...named.entries()].sort((a, b) => b[1] - a[1]).map(([t, c]) => `${t}×${c}`).join(', ');
    console.log(`${name.padEnd(30)} ${String(n).padStart(2)}/${ids.length}                            ${top || '—'}`);
}

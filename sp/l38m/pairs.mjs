// Builds a blind pairs file for the frozen grader prompt (L38H's shape: s50m captured-high's rubric, anonymous keys,
// shuffled). A follow-up's question carries its parent question and the parent answer the candidate showed.
//   node pairs.mjs pipeline                 -> blind/pipeline-pairs.json (all 63 pipeline answers)
//   node pairs.mjs reask <model> <ids,...>  -> blind/reask-pairs.json (originals + re-asks of those ids, mixed)
// Keys go to keyhold/. Refuses to overwrite. Prints counts only.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const I = JSON.parse(fs.readFileSync(path.join(HERE, 'items.json'), 'utf8'));
const T = JSON.parse(fs.readFileSync('C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-22T08-22-50-s50m/interview60.judge.pairs.gemini-3.5-flash-lite_captured-high.json', 'utf8'));
const PIPE = JSON.parse(fs.readFileSync(path.join(HERE, 'runs', 'pipeline.json'), 'utf8')).records;
const mode = process.argv[2];
const question = (id) => {
    const par = I.parent[id];
    if (!par) return I.text[id];
    return `(Follow-up.) Earlier the interviewer asked: "${I.text[par]}" The candidate answered: "${PIPE[par]?.spoken ?? '(no answer)'}" Now the interviewer asks: "${I.text[id]}"`;
};
let entries;
if (mode === 'pipeline') entries = I.chains.flat().map((id) => ({ tag: id, id, answer: PIPE[id]?.spoken ?? '' }));
else if (mode === 'reask') {
    const model = process.argv[3], ids = (process.argv[4] ?? '').split(',').filter(Boolean);
    const R = JSON.parse(fs.readFileSync(path.join(HERE, 'runs', `reask-${model}.json`), 'utf8')).records;
    entries = ids.flatMap((id) => [{ tag: `${id}|lite`, id, answer: PIPE[id]?.spoken ?? '' }, ...(R[id]?.spoken ? [{ tag: `${id}|${model}`, id, answer: R[id].spoken }] : [])]);
} else { console.log('usage: pairs.mjs pipeline | reask <model> <ids>'); process.exit(2); }
const tag = mode === 'reask' ? `reask-${process.argv[3]}` : mode;
const out = path.join(HERE, 'blind', `${tag}-pairs.json`), keyOut = path.join(HERE, 'keyhold', `${tag}-key.json`);
if (fs.existsSync(out)) { console.log(`REFUSED: ${out} exists`); process.exit(2); }
fs.mkdirSync(path.dirname(out), { recursive: true }); fs.mkdirSync(path.dirname(keyOut), { recursive: true });
let seed = 20261002; const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
for (let i = entries.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [entries[i], entries[j]] = [entries[j], entries[i]]; }
const key = {}, items = entries.map((e, n) => { const k = `k${String(n + 1).padStart(2, '0')}`; key[k] = e.tag; return { key: k, question: question(e.id), answer: e.answer }; });
fs.writeFileSync(out, JSON.stringify({ model: 'anonymous', rubric: T.rubric, items }, null, 1));
fs.writeFileSync(keyOut, JSON.stringify(key, null, 1));
console.log(`${items.length} items (${items.filter((x) => !x.answer).length} empty answers); rubric ${T.rubric.length} chars`);

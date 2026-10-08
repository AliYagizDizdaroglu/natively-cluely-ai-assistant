// Unblinds the pipeline grading: per id the two graders' correctness/on-topic, acceptable (correctness 2 and on-topic 2),
// wrong (correctness 0), per class; and the 3.8 Flash re-ask list by the pre-registered rule (H/HF/AF with
// correctness <= 1 in BOTH graders, most erroneous first, at most 10).  node unblind.mjs pipeline
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const J = (p) => JSON.parse(fs.readFileSync(path.join(HERE, p), 'utf8'));
const I = J('items.json'), key = J('keyhold/pipeline-key.json'), g = [J('blind/verdicts.g1.json'), J('blind/verdicts.g2.json')];
for (const v of g) if (Object.keys(v).length !== 63 || Object.keys(key).some((k) => !v[k])) { console.log('REFUSED: verdicts incomplete'); process.exit(2); }
const P = J('runs/pipeline.json').records;
const byId = {}; for (const [k, id] of Object.entries(key)) byId[id] = g.map((v) => v[k]);
const acc = (s) => s.correctness === 2 && s.on_topic === 2;
const rows = {};
for (const id of I.chains.flat()) {
    const c = I.class[id], s = byId[id];
    const r = (rows[c] ??= { n: 0, g1: 0, g2: 0, both: 0, wrong: 0, ids1: [] });
    r.n++; r.g1 += acc(s[0]); r.g2 += acc(s[1]); r.both += acc(s[0]) && acc(s[1]); r.wrong += s.some((x) => x.correctness === 0);
    if (!(acc(s[0]) && acc(s[1]))) r.ids1.push(`${id}(${s.map((x) => x.correctness).join('/')})`);
}
for (const [c, r] of Object.entries(rows)) console.log(`${c.padEnd(3)} n ${String(r.n).padStart(2)}  acceptable g1 ${r.g1} g2 ${r.g2} both ${r.both}  wrong(any grader) ${r.wrong}  not both-acceptable: ${r.ids1.join(' ') || '-'}`);
const hard = ['H', 'HF', 'AF'];
const t = (ids) => { const a = ids.map((id) => P[id].ttft).filter(Number.isFinite).sort((x, y) => x - y); return `p50 ${a[Math.floor(a.length / 2)]} ms, p90 ${a[Math.floor(a.length * 0.9)]} ms`; };
console.log(`first token, E+QF ${t(I.chains.flat().filter((id) => !hard.includes(I.class[id])))}; H+HF+AF ${t(I.chains.flat().filter((id) => hard.includes(I.class[id])))}`);
const cand = I.chains.flat().filter((id) => hard.includes(I.class[id]) && byId[id].every((s) => s.correctness <= 1))
    .sort((a, b) => (byId[a][0].correctness + byId[a][1].correctness) - (byId[b][0].correctness + byId[b][1].correctness) || (byId[a][0].on_topic + byId[a][1].on_topic) - (byId[b][0].on_topic + byId[b][1].on_topic)).slice(0, 10);
console.log(`3.8 Flash re-ask list (H/HF/AF, correctness <= 1 in both): ${cand.join(',') || '(none)'}`);
const easyWeak = I.chains.flat().filter((id) => !hard.includes(I.class[id]) && byId[id].every((s) => s.correctness <= 1));
console.log(`E/QF weak in both (reported, not in the rule's list): ${easyWeak.join(',') || '(none)'}`);

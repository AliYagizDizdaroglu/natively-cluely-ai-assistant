// Opus grading of 3.8 Live's OWN replies in L38M (2026-10-02 evening, user: "yes grade them with opus, report the
// performance and latency"). Graded = every turn where the router put an answer on screen: the reader's RIGHT and
// UNSAFE lines (v1.read.txt / v2.read.txt). Not graded: "hard" (a routing decision; the pipeline answers) and
// "nothing". The grader's question for each id is EXACTLY the one the pipeline graders saw (blind/pipeline-pairs.json,
// mapped through keyhold/pipeline-key.json): follow-ups carry the earlier question and the on-screen (pipeline)
// answer. V1 and V2 replies shuffled together by a seeded rng; key kept in keyhold/. Prints counts only.
//   node live-blind.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT_PAIRS = path.join(HERE, 'blind', 'live-pairs.json'), OUT_KEY = path.join(HERE, 'keyhold', 'live-key.json');
if (fs.existsSync(OUT_PAIRS)) { console.log('REFUSED: blind/live-pairs.json exists'); process.exit(2); }
const pp = JSON.parse(fs.readFileSync(path.join(HERE, 'blind', 'pipeline-pairs.json'), 'utf8'));
const pk = JSON.parse(fs.readFileSync(path.join(HERE, 'keyhold', 'pipeline-key.json'), 'utf8'));
const qOf = {}; for (const it of pp.items) { const id = pk[it.key]; if (!id) { console.log(`REFUSED: ${it.key} not in the pipeline key`); process.exit(2); } qOf[id] = it.question; }
const items = JSON.parse(fs.readFileSync(path.join(HERE, 'items.json'), 'utf8'));
const set = [];
for (const v of ['v1', 'v2']) {
    const A = JSON.parse(fs.readFileSync(path.join(HERE, 'runs', `l38m-${v}.answers.json`), 'utf8'));
    for (const line of fs.readFileSync(path.join(HERE, 'runs', `${v}.read.txt`), 'utf8').split('\n')) {
        const m = line.match(/^  ([EH]\d{2}F?)\s+(\S+)\s+(RIGHT|UNSAFE|hard|nothing)\b/);
        if (!m || !['RIGHT', 'UNSAFE'].includes(m[3])) continue;
        const id = m[1], a = A[id];
        const answer = String(a?.answer ?? '').trim();
        if (!answer) { console.log(`REFUSED: ${v} ${id} labelled ${m[3]} but answers.json has no answer text`); process.exit(2); }
        if (!qOf[id]) { console.log(`REFUSED: no pipeline question for ${id}`); process.exit(2); }
        set.push({ variant: v, id, cls: items.class[id], label: m[3], ttftMs: a.ttftMs ?? null, answer });
    }
}
let h = 2166136261; for (const c of 'blind:l38m-live') { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
const r = () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
for (let i = set.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [set[i], set[j]] = [set[j], set[i]]; }
const key = {}, out = set.map((e, i) => { const k = `L${String(i + 1).padStart(2, '0')}`; key[k] = { variant: e.variant, id: e.id, cls: e.cls, label: e.label, ttftMs: e.ttftMs }; return { key: k, question: qOf[e.id], answer: e.answer }; });
fs.writeFileSync(OUT_PAIRS, JSON.stringify({ model: pp.model, rubric: pp.rubric, items: out }, null, 1));
fs.writeFileSync(OUT_KEY, JSON.stringify(key, null, 1));
console.log(`live-pairs.json: ${out.length} replies (v1 ${set.filter((e) => e.variant === 'v1').length}, v2 ${set.filter((e) => e.variant === 'v2').length}); classes ${JSON.stringify(set.reduce((m, e) => (m[e.cls] = (m[e.cls] ?? 0) + 1, m), {}))}; same rubric as the pipeline grading: ${pp.rubric ? 'yes' : 'no'}`);

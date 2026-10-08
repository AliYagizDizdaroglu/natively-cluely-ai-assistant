// Unblinds today's 3.8 Flash re-ask grading (one blind batch: the 3.5-lite HIGH original + the 3.8 Flash answer of
// H09F, H19, H20F, E06, H12). Per item and arm: each grader's correctness/on_topic/delivery, acceptable (both graders
// correctness 2 and on_topic 2), first token and words. Prints scores and numbers only, never answer text.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const J = (p) => JSON.parse(fs.readFileSync(path.join(HERE, p), 'utf8'));
const key = J('keyhold/reask-gemini-3.8-flash-satall-key.json');
const vA = J('blind/reask-satall.verdicts.gA.json'), vB = J('blind/reask-satall.verdicts.gB.json');
const PIPE = J('runs/pipeline.json').records, R = J('runs/reask-gemini-3.8-flash-satall.json').records;
const get = (v, k) => v[k] ?? v.verdicts?.[k] ?? (Array.isArray(v) ? v.find((x) => x.key === k) : undefined);
const s = (x) => (x ? `${x.correctness}/${x.on_topic}/${x.delivery}` : '?');
const acc = (x) => x && x.correctness === 2 && x.on_topic === 2;
const rows = {};
for (const [k, tag] of Object.entries(key)) {
    const [id, arm] = tag.split('|');
    const a = get(vA, k), b = get(vB, k);
    const rec = arm === 'lite' ? PIPE[id] : R[id];
    (rows[id] ??= {})[arm === 'lite' ? 'lite' : 'f38'] = { a: s(a), b: s(b), accN: [a, b].filter(acc).length, wrong: [a, b].filter((x) => x?.correctness === 0).length, ttft: rec?.ttft, words: rec?.words };
}
console.log('item  | 3.5-lite HIGH (gA, gB c/o/d) acc ttft words | 3.8 Flash (gA, gB) acc ttft words');
for (const id of Object.keys(rows).sort()) {
    const l = rows[id].lite, f = rows[id].f38;
    console.log(`${id.padEnd(5)} | ${l.a} ${l.b} acc ${l.accN}/2${l.wrong ? ` wrong ${l.wrong}` : ''} ${l.ttft} ms ${l.words}w | ${f.a} ${f.b} acc ${f.accN}/2${f.wrong ? ` wrong ${f.wrong}` : ''} ${f.ttft} ms ${f.words}w`);
}

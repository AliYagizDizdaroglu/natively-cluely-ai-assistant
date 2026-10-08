import { readFileSync } from 'node:fs';
const [pairsPath, verdictsPath] = process.argv.slice(2);
const pairs = JSON.parse(readFileSync(pairsPath, 'utf8'));
const raw = readFileSync(verdictsPath, 'utf8');
const v = JSON.parse(raw); // throws if invalid JSON
const itemKeys = pairs.items.map((i) => i.key);
const vKeys = Object.keys(v);
console.log('items:', itemKeys.length, 'verdict keys:', vKeys.length);
const missing = itemKeys.filter((k) => !(k in v));
const extra = vKeys.filter((k) => !itemKeys.includes(k));
console.log('missing:', JSON.stringify(missing), 'extra:', JSON.stringify(extra));
const dims = ['correctness', 'on_topic', 'delivery'];
const dist = { correctness: [0, 0, 0], on_topic: [0, 0, 0], delivery: [0, 0, 0] };
let bad = 0, solid = 0, fail = 0;
for (const k of vKeys) {
  const e = v[k];
  for (const d of dims) {
    if (!Number.isInteger(e[d]) || e[d] < 0 || e[d] > 2) { bad++; console.log('BAD score', k, d, e[d]); }
    else dist[d][e[d]]++;
  }
  const extraFields = Object.keys(e).filter((f) => ![...dims, 'reason'].includes(f));
  if (extraFields.length) { bad++; console.log('EXTRA fields', k, extraFields); }
  if (typeof e.reason !== 'string' || !e.reason.trim()) { bad++; console.log('BAD reason', k); }
  const rw = e.reason.trim().split(/\s+/).length;
  if (rw > 25) { bad++; console.log('LONG reason', k, rw); }
  if (e.correctness === 2 && e.on_topic === 2) solid++;
  if (e.correctness === 0 || e.on_topic === 0) fail++;
}
console.log('bad:', bad);
console.log('dist:', JSON.stringify(dist));
console.log('C2&O2:', solid, 'C0|O0:', fail, 'other:', vKeys.length - solid - fail);
const lowest = vKeys
  .map((k) => ({ k, s: v[k].correctness + v[k].on_topic + v[k].delivery, c: v[k].correctness, o: v[k].on_topic }))
  .sort((a, b) => a.s - b.s || a.c - b.c || a.o - b.o)
  .slice(0, 6);
console.log('lowest:', JSON.stringify(lowest));

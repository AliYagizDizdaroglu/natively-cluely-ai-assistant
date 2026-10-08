import { readFileSync } from 'node:fs';
const pairs = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const raw = readFileSync(process.argv[3], 'utf8');
const v = JSON.parse(raw); // throws if invalid JSON
const itemKeys = pairs.items.map((i) => i.key);
const vKeys = Object.keys(v);
console.log('items', itemKeys.length, 'verdict keys', vKeys.length);
const missing = itemKeys.filter((k) => !(k in v));
const extra = vKeys.filter((k) => !itemKeys.includes(k));
console.log('missing', JSON.stringify(missing), 'extra', JSON.stringify(extra));
let bad = 0;
for (const k of vKeys) {
  const e = v[k];
  for (const f of ['correctness', 'on_topic', 'delivery']) {
    if (!Number.isInteger(e[f]) || e[f] < 0 || e[f] > 2) { bad++; console.log('BAD SCORE', k, f, e[f]); }
  }
  const words = String(e.reason || '').trim().split(/\s+/).filter(Boolean).length;
  if (!e.reason || words > 25) { bad++; console.log('BAD REASON', k, words); }
  const extraFields = Object.keys(e).filter((f) => !['correctness', 'on_topic', 'delivery', 'reason'].includes(f));
  if (extraFields.length) { bad++; console.log('EXTRA FIELDS', k, extraFields); }
}
console.log('bad', bad);
const solid = vKeys.filter((k) => v[k].correctness === 2 && v[k].on_topic === 2);
const fail = vKeys.filter((k) => v[k].correctness === 0 || v[k].on_topic === 0);
const other = vKeys.filter((k) => !solid.includes(k) && !fail.includes(k));
console.log('c2&t2', solid.length, 'c0|t0', fail.length, 'other', other.length);
console.log('fail', JSON.stringify(fail), 'other', JSON.stringify(other));
const dist = { correctness: [0, 0, 0], on_topic: [0, 0, 0], delivery: [0, 0, 0] };
for (const k of vKeys) for (const f of Object.keys(dist)) dist[f][v[k][f]]++;
console.log('dist [0,1,2]', JSON.stringify(dist));
const ranked = vKeys
  .map((k) => ({ k, s: v[k].correctness + v[k].on_topic + v[k].delivery, c: v[k].correctness, t: v[k].on_topic }))
  .sort((a, b) => (Math.min(a.c, a.t) - Math.min(b.c, b.t)) || (a.s - b.s));
console.log('lowest', ranked.slice(0, 8).map((r) => `${r.k}:${r.c}/${r.t}/${r.s}`).join(' '));

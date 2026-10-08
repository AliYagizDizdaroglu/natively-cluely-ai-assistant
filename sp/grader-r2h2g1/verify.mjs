import { readFileSync } from 'node:fs';
const [pairsPath, verdictsPath] = process.argv.slice(2);
const pairs = JSON.parse(readFileSync(pairsPath, 'utf8'));
const v = JSON.parse(readFileSync(verdictsPath, 'utf8'));
const itemKeys = pairs.items.map((i) => i.key);
const vKeys = Object.keys(v);
console.log('items', itemKeys.length, 'verdict keys', vKeys.length);
const missing = itemKeys.filter((k) => !(k in v));
const extra = vKeys.filter((k) => !itemKeys.includes(k));
console.log('missing', JSON.stringify(missing), 'extra', JSON.stringify(extra));
let bad = 0;
const dist = { correctness: [0, 0, 0], on_topic: [0, 0, 0], delivery: [0, 0, 0] };
let solid = 0, wrong = 0, other = 0;
for (const k of itemKeys) {
  const e = v[k];
  for (const f of ['correctness', 'on_topic', 'delivery']) {
    if (!Number.isInteger(e[f]) || e[f] < 0 || e[f] > 2) { bad++; console.log('BAD score', k, f, e[f]); }
    else dist[f][e[f]]++;
  }
  const n = String(e.reason || '').trim().split(/\s+/).filter(Boolean).length;
  if (!e.reason || n > 25) { bad++; console.log('BAD reason', k, n); }
  if (e.correctness === 2 && e.on_topic === 2) solid++;
  else if (e.correctness === 0 || e.on_topic === 0) wrong++;
  else other++;
}
console.log('bad', bad);
console.log('dist', JSON.stringify(dist));
console.log('C2&T2', solid, 'C0|T0', wrong, 'other', other);

import { readFileSync } from 'node:fs';
const [pairsPath, verdictsPath] = process.argv.slice(2);
const pairs = JSON.parse(readFileSync(pairsPath, 'utf8'));
const raw = readFileSync(verdictsPath, 'utf8');
const v = JSON.parse(raw); // throws if not valid JSON
const itemKeys = pairs.items.map((i) => i.key);
const vKeys = Object.keys(v);
console.log('items', itemKeys.length, 'verdict keys', vKeys.length);
const missing = itemKeys.filter((k) => !(k in v));
const extra = vKeys.filter((k) => !itemKeys.includes(k));
console.log('missing', JSON.stringify(missing), 'extra', JSON.stringify(extra));
let bad = 0, solid = 0, wrong = 0, other = 0;
const dist = { correctness: [0, 0, 0], on_topic: [0, 0, 0], delivery: [0, 0, 0] };
for (const k of itemKeys) {
  const e = v[k];
  for (const f of ['correctness', 'on_topic', 'delivery']) {
    if (!Number.isInteger(e[f]) || e[f] < 0 || e[f] > 2) { bad++; console.log('BAD', k, f, e[f]); }
    else dist[f][e[f]]++;
  }
  const words = String(e.reason || '').trim().split(/\s+/).filter(Boolean).length;
  if (!e.reason || words > 25) { bad++; console.log('REASON', k, words); }
  if (e.correctness === 2 && e.on_topic === 2) solid++;
  else if (e.correctness === 0 || e.on_topic === 0) wrong++;
  else other++;
}
console.log('bad', bad);
console.log('c2&o2', solid, 'c0|o0', wrong, 'other', other);
console.log('dist', JSON.stringify(dist));

import fs from 'node:fs';
const [pairsPath, verdictsPath] = process.argv.slice(2);
const pairs = JSON.parse(fs.readFileSync(pairsPath, 'utf8'));
const raw = fs.readFileSync(verdictsPath, 'utf8');
const v = JSON.parse(raw); // throws if not valid JSON
const itemKeys = pairs.items.map(i => i.key);
const vKeys = Object.keys(v);
console.log('items', itemKeys.length, 'verdict keys', vKeys.length);
const missing = itemKeys.filter(k => !(k in v));
const extra = vKeys.filter(k => !itemKeys.includes(k));
console.log('missing', JSON.stringify(missing), 'extra', JSON.stringify(extra));
let bad = 0;
const dist = { correctness: [0, 0, 0], on_topic: [0, 0, 0], delivery: [0, 0, 0] };
let both2 = 0, any0 = 0, other = 0, longReason = 0;
for (const k of vKeys) {
  const e = v[k];
  for (const f of ['correctness', 'on_topic', 'delivery']) {
    if (!Number.isInteger(e[f]) || e[f] < 0 || e[f] > 2) { bad++; console.log('BAD', k, f, e[f]); }
    else dist[f][e[f]]++;
  }
  if (typeof e.reason !== 'string' || !e.reason.trim()) { bad++; console.log('BAD reason', k); }
  const words = e.reason.trim().split(/\s+/).length;
  if (words > 25) { longReason++; console.log('LONG reason', k, words); }
  if (e.correctness === 2 && e.on_topic === 2) both2++;
  else if (e.correctness === 0 || e.on_topic === 0) any0++;
  else other++;
}
console.log('bad fields', bad, 'reasons over 25 words', longReason);
console.log('dist', JSON.stringify(dist));
console.log('c2&o2', both2, 'c0|o0', any0, 'other', other);

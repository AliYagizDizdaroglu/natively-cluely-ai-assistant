import fs from 'node:fs';
const [pairsPath, verdictsPath] = process.argv.slice(2);
const pairs = JSON.parse(fs.readFileSync(pairsPath, 'utf8'));
const v = JSON.parse(fs.readFileSync(verdictsPath, 'utf8'));
const itemKeys = pairs.items.map((i) => i.key);
const vKeys = Object.keys(v);
console.log('items', itemKeys.length, 'verdicts', vKeys.length);
const missing = itemKeys.filter((k) => !(k in v));
const extra = vKeys.filter((k) => !itemKeys.includes(k));
console.log('missing', JSON.stringify(missing), 'extra', JSON.stringify(extra));
const dims = ['correctness', 'on_topic', 'delivery'];
let bad = 0;
const dist = { correctness: [0, 0, 0], on_topic: [0, 0, 0], delivery: [0, 0, 0] };
let both2 = 0, anyZero = 0;
for (const k of vKeys) {
  const e = v[k];
  for (const d of dims) {
    if (!Number.isInteger(e[d]) || e[d] < 0 || e[d] > 2) { bad++; console.log('bad score', k, d, e[d]); }
    else dist[d][e[d]]++;
  }
  if (typeof e.reason !== 'string' || !e.reason.trim()) { bad++; console.log('bad reason', k); }
  const rw = e.reason.trim().split(/\s+/).length;
  if (rw > 25) console.log('reason over 25 words', k, rw);
  if (e.correctness === 2 && e.on_topic === 2) both2++;
  if (e.correctness === 0 || e.on_topic === 0) anyZero++;
}
console.log('bad', bad);
console.log('dist [0,1,2]', JSON.stringify(dist));
console.log('correctness2&on_topic2', both2, 'correctness0|on_topic0', anyZero, 'other', vKeys.length - both2 - anyZero);

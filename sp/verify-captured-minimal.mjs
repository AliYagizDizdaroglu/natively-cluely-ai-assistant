import fs from 'node:fs';
const [pairsPath, verdictsPath] = process.argv.slice(2);
const pairs = JSON.parse(fs.readFileSync(pairsPath, 'utf8'));
const raw = fs.readFileSync(verdictsPath, 'utf8');
const v = JSON.parse(raw); // throws if invalid JSON
const itemKeys = pairs.items.map((i) => i.key);
const vKeys = Object.keys(v);
console.log('items', itemKeys.length, 'verdict keys', vKeys.length);
const missing = itemKeys.filter((k) => !(k in v));
const extra = vKeys.filter((k) => !itemKeys.includes(k));
console.log('missing', JSON.stringify(missing), 'extra', JSON.stringify(extra));
let bad = 0;
const dist = { correctness: [0, 0, 0], on_topic: [0, 0, 0], delivery: [0, 0, 0] };
let solid = 0, zero = 0, partial = 0;
const scored = [];
for (const k of itemKeys) {
  const e = v[k];
  if (!e) continue;
  for (const f of ['correctness', 'on_topic', 'delivery']) {
    if (!Number.isInteger(e[f]) || e[f] < 0 || e[f] > 2) { bad++; console.log('BAD', k, f, e[f]); }
    else dist[f][e[f]]++;
  }
  const words = String(e.reason || '').trim().split(/\s+/).filter(Boolean).length;
  if (!e.reason || words > 25) { bad++; console.log('REASON', k, words); }
  const fieldsOk = Object.keys(e).sort().join(',') === 'correctness,delivery,on_topic,reason';
  if (!fieldsOk) { bad++; console.log('FIELDS', k, Object.keys(e)); }
  if (e.correctness === 2 && e.on_topic === 2) solid++;
  else if (e.correctness === 0 || e.on_topic === 0) zero++;
  else partial++;
  scored.push([k, e.correctness + e.on_topic + e.delivery, e.correctness, e.on_topic, e.delivery]);
}
console.log('bad', bad);
console.log('dist', JSON.stringify(dist));
console.log('c2&o2', solid, 'c0|o0', zero, 'other', partial);
scored.sort((a, b) => a[1] - b[1] || a[2] - b[2] || a[3] - b[3]);
console.log('lowest', JSON.stringify(scored.slice(0, 7)));

import fs from 'node:fs';
const [pairsPath, verdictsPath] = process.argv.slice(2);
const pairs = JSON.parse(fs.readFileSync(pairsPath, 'utf8'));
const raw = fs.readFileSync(verdictsPath, 'utf8');
const v = JSON.parse(raw); // throws if invalid JSON
const itemKeys = pairs.items.map((i) => i.key);
const vKeys = Object.keys(v);
const missing = itemKeys.filter((k) => !(k in v));
const extra = vKeys.filter((k) => !itemKeys.includes(k));
console.log('items', itemKeys.length, 'verdicts', vKeys.length, 'missing', missing, 'extra', extra);
const dist = { correctness: [0, 0, 0], on_topic: [0, 0, 0], delivery: [0, 0, 0] };
let bad = 0, both2 = 0, anyZero = 0;
for (const k of itemKeys) {
  const r = v[k];
  for (const f of ['correctness', 'on_topic', 'delivery']) {
    if (!Number.isInteger(r[f]) || r[f] < 0 || r[f] > 2) { console.log('BAD score', k, f, r[f]); bad++; }
    else dist[f][r[f]]++;
  }
  const words = String(r.reason).trim().split(/\s+/).length;
  if (typeof r.reason !== 'string' || words > 25) { console.log('BAD reason', k, words); bad++; }
  if (r.correctness === 2 && r.on_topic === 2) both2++;
  if (r.correctness === 0 || r.on_topic === 0) anyZero++;
}
console.log('bad', bad);
console.log('dist', JSON.stringify(dist));
console.log('c2&o2', both2, 'c0|o0', anyZero, 'partial (neither)', itemKeys.length - both2 - anyZero);
const scored = itemKeys.map((k) => ({ k, s: v[k].correctness + v[k].on_topic + v[k].delivery, c: v[k].correctness }));
scored.sort((a, b) => a.s - b.s || a.c - b.c);
console.log('lowest', scored.slice(0, 6).map((x) => x.k + '=' + x.s).join(' '));

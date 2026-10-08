// Throwaway: verify the verdicts file against the pairs file (read-only on both).
import fs from 'node:fs';
const [pairsPath, verdictsPath] = process.argv.slice(2);
const pairs = JSON.parse(fs.readFileSync(pairsPath, 'utf8'));
const raw = fs.readFileSync(verdictsPath, 'utf8');
const v = JSON.parse(raw); // throws if invalid JSON
const itemKeys = pairs.items.map((it) => it.key);
const vKeys = Object.keys(v);
console.log('items', itemKeys.length, 'verdicts', vKeys.length);
const missing = itemKeys.filter((k) => !(k in v));
const extra = vKeys.filter((k) => !itemKeys.includes(k));
console.log('missing', JSON.stringify(missing), 'extra', JSON.stringify(extra));
let bad = 0;
const tally = { correctness: [0, 0, 0], on_topic: [0, 0, 0], delivery: [0, 0, 0] };
let both2 = 0, anyZero = 0;
for (const k of itemKeys) {
  const e = v[k];
  if (!e) continue;
  for (const f of ['correctness', 'on_topic', 'delivery']) {
    if (!Number.isInteger(e[f]) || e[f] < 0 || e[f] > 2) { bad++; console.log('BAD', k, f, e[f]); }
    else tally[f][e[f]]++;
  }
  const rw = String(e.reason || '').trim().split(/\s+/).filter(Boolean).length;
  if (!e.reason || rw > 25) { bad++; console.log('REASON', k, rw); }
  if (Object.keys(e).sort().join(',') !== 'correctness,delivery,on_topic,reason') { bad++; console.log('FIELDS', k); }
  if (e.correctness === 2 && e.on_topic === 2) both2++;
  if (e.correctness === 0 || e.on_topic === 0) anyZero++;
}
console.log('bad', bad);
console.log('tally', JSON.stringify(tally));
console.log('c2&o2', both2, 'c0|o0', anyZero);
const lowest = itemKeys
  .map((k) => ({ k, s: v[k].correctness + v[k].on_topic + v[k].delivery, c: v[k].correctness }))
  .sort((a, b) => a.s - b.s || a.c - b.c)
  .slice(0, 8);
console.log('lowest', JSON.stringify(lowest));

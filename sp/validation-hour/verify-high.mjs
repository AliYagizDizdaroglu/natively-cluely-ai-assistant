// Verify the verdicts file against the pairs file (both read-only here).
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
const tally = { correctness: {}, on_topic: {}, delivery: {} };
let both2 = 0, any0 = 0, bad = [];
for (const k of vKeys) {
  const e = v[k];
  for (const d of ['correctness', 'on_topic', 'delivery']) {
    if (!Number.isInteger(e[d]) || e[d] < 0 || e[d] > 2) bad.push(k + ':' + d);
    tally[d][e[d]] = (tally[d][e[d]] || 0) + 1;
  }
  if (typeof e.reason !== 'string' || !e.reason.trim()) bad.push(k + ':reason');
  const rw = e.reason.trim().split(/\s+/).length;
  if (rw > 25) bad.push(k + ':reason-words=' + rw);
  if (e.correctness === 2 && e.on_topic === 2) both2++;
  if (e.correctness === 0 || e.on_topic === 0) any0++;
}
console.log('bad', JSON.stringify(bad));
console.log('tally', JSON.stringify(tally));
console.log('c2&o2', both2, 'c0|o0', any0);

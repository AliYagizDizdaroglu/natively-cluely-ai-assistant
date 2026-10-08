// Throwaway: verify the r3 h2 g1 verdicts file against its pairs file (read-only on both).
import { readFileSync } from 'node:fs';
const [pairsPath, verdictsPath] = process.argv.slice(2);
const pairs = JSON.parse(readFileSync(pairsPath, 'utf8'));
const raw = readFileSync(verdictsPath, 'utf8');
const v = JSON.parse(raw); // throws if invalid JSON
const itemKeys = pairs.items.map((i) => i.key);
const vKeys = Object.keys(v);
const missing = itemKeys.filter((k) => !(k in v));
const extra = vKeys.filter((k) => !itemKeys.includes(k));
const bad = [];
const dist = { correctness: [0, 0, 0], on_topic: [0, 0, 0], delivery: [0, 0, 0] };
let c2o2 = 0, c0o0 = 0;
for (const k of vKeys) {
  const e = v[k];
  for (const f of ['correctness', 'on_topic', 'delivery']) {
    if (!Number.isInteger(e[f]) || e[f] < 0 || e[f] > 2) bad.push(`${k}.${f}=${e[f]}`);
    else dist[f][e[f]]++;
  }
  if (typeof e.reason !== 'string' || !e.reason.trim()) bad.push(`${k}.reason empty`);
  const words = (e.reason || '').trim().split(/\s+/).length;
  if (words > 25) bad.push(`${k}.reason ${words} words`);
  if (e.correctness === 2 && e.on_topic === 2) c2o2++;
  if (e.correctness === 0 || e.on_topic === 0) c0o0++;
}
console.log('items', itemKeys.length, 'verdicts', vKeys.length, 'unique item keys', new Set(itemKeys).size);
console.log('missing', JSON.stringify(missing), 'extra', JSON.stringify(extra), 'bad', JSON.stringify(bad));
console.log('dist [0,1,2]', JSON.stringify(dist));
console.log('c2&o2', c2o2, 'c0|o0', c0o0);
const combos = {};
for (const k of vKeys) { const e = v[k]; const c = `c${e.correctness}o${e.on_topic}d${e.delivery}`; combos[c] = (combos[c] || 0) + 1; }
console.log('combos', JSON.stringify(combos));

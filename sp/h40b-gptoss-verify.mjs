// Throwaway: verify the gpt-oss verdicts file against its pairs file (read-only on both).
import { readFileSync } from 'node:fs';
const [pairsPath, verdictsPath] = process.argv.slice(2);
const pairs = JSON.parse(readFileSync(pairsPath, 'utf8'));
const v = JSON.parse(readFileSync(verdictsPath, 'utf8')); // throws if not valid JSON
const itemKeys = pairs.items.map((i) => i.key);
const vKeys = Object.keys(v);
const missing = itemKeys.filter((k) => !(k in v));
const extra = vKeys.filter((k) => !itemKeys.includes(k));
console.log('items', itemKeys.length, 'verdicts', vKeys.length, 'missing', missing, 'extra', extra);
const hist = { correctness: [0, 0, 0], on_topic: [0, 0, 0], delivery: [0, 0, 0] };
let solid = 0, fail = 0, other = 0, bad = [];
for (const k of itemKeys) {
  const e = v[k];
  if (!e) continue;
  for (const f of ['correctness', 'on_topic', 'delivery']) {
    if (!Number.isInteger(e[f]) || e[f] < 0 || e[f] > 2) bad.push(`${k}.${f}=${e[f]}`);
    else hist[f][e[f]]++;
  }
  const words = String(e.reason || '').trim().split(/\s+/).filter(Boolean).length;
  if (!e.reason || words > 25) bad.push(`${k}.reason words=${words}`);
  if (e.correctness === 2 && e.on_topic === 2) solid++;
  else if (e.correctness === 0 || e.on_topic === 0) fail++;
  else other++;
}
console.log('bad', bad);
console.log('hist', JSON.stringify(hist));
console.log('c2&o2', solid, 'c0|o0', fail, 'other', other);
const lowest = itemKeys
  .map((k) => ({ k, s: v[k].correctness + v[k].on_topic + v[k].delivery }))
  .sort((a, b) => a.s - b.s)
  .slice(0, 5);
console.log('lowest', lowest.map((x) => `${x.k}:${x.s}`).join(' '));

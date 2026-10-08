// Throwaway: verify the verdicts file parses, matches the pairs keys 1:1, and tally classes.
import { readFileSync } from 'node:fs';
const [pairsPath, verdictsPath] = process.argv.slice(2);
const pairs = JSON.parse(readFileSync(pairsPath, 'utf8'));
const raw = readFileSync(verdictsPath, 'utf8');
const v = JSON.parse(raw); // throws if invalid JSON
const itemKeys = pairs.items.map(i => i.key);
const vKeys = Object.keys(v);
console.log('items', itemKeys.length, 'verdicts', vKeys.length);
const missing = itemKeys.filter(k => !(k in v));
const extra = vKeys.filter(k => !itemKeys.includes(k));
console.log('missing', JSON.stringify(missing), 'extra', JSON.stringify(extra));
const tally = { correctness: [0, 0, 0], on_topic: [0, 0, 0], delivery: [0, 0, 0] };
let solid = 0, wrong = 0, bad = 0;
for (const k of vKeys) {
  const e = v[k];
  for (const f of ['correctness', 'on_topic', 'delivery']) {
    if (!Number.isInteger(e[f]) || e[f] < 0 || e[f] > 2) { bad++; console.log('BAD', k, f, e[f]); }
    else tally[f][e[f]]++;
  }
  if (typeof e.reason !== 'string' || !e.reason) { bad++; console.log('NO REASON', k); }
  const rw = e.reason.split(/\s+/).filter(Boolean).length;
  if (rw > 25) console.log('LONG REASON', k, rw);
  if (e.correctness === 2 && e.on_topic === 2) solid++;
  if (e.correctness === 0 || e.on_topic === 0) wrong++;
}
console.log('bad', bad);
console.log('tally [0,1,2]', JSON.stringify(tally));
console.log('c2&o2', solid, 'c0|o0', wrong);
const sum = k => v[k].correctness + v[k].on_topic + v[k].delivery;
const lowest = [...vKeys].sort((a, b) => sum(a) - sum(b) || v[a].correctness - v[b].correctness).slice(0, 8);
for (const k of lowest) console.log('low', k, v[k].correctness, v[k].on_topic, v[k].delivery);

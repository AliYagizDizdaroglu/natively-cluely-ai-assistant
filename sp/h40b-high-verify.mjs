// Throwaway: verify the verdicts file parses, covers every pairs key exactly, and tally classes.
import { readFileSync } from 'node:fs';
const [pairsPath, verdictsPath] = process.argv.slice(2);
const pairs = JSON.parse(readFileSync(pairsPath, 'utf8'));
const verdicts = JSON.parse(readFileSync(verdictsPath, 'utf8')); // throws if invalid JSON
const itemKeys = pairs.items.map((it) => it.key);
const vKeys = Object.keys(verdicts);
const missing = itemKeys.filter((k) => !(k in verdicts));
const extra = vKeys.filter((k) => !itemKeys.includes(k));
console.log('items:', itemKeys.length, 'verdict keys:', vKeys.length, 'missing:', missing, 'extra:', extra);
let solid = 0, zero = 0, other = 0;
const dist = { correctness: [0, 0, 0], on_topic: [0, 0, 0], delivery: [0, 0, 0] };
const problems = [];
for (const k of vKeys) {
  const v = verdicts[k];
  for (const f of ['correctness', 'on_topic', 'delivery']) {
    if (!Number.isInteger(v[f]) || v[f] < 0 || v[f] > 2) problems.push(`${k}.${f}=${v[f]}`);
    else dist[f][v[f]]++;
  }
  const words = String(v.reason ?? '').trim().split(/\s+/).filter(Boolean).length;
  if (!v.reason || words > 25) problems.push(`${k}.reason words=${words}`);
  if (v.correctness === 2 && v.on_topic === 2) solid++;
  else if (v.correctness === 0 || v.on_topic === 0) zero++;
  else other++;
}
console.log('problems:', problems);
console.log('c2&o2:', solid, ' c0|o0:', zero, ' other:', other);
console.log('dist [0,1,2]:', JSON.stringify(dist));

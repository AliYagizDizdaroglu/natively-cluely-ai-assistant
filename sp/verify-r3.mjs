import { readFileSync } from 'node:fs';

const [pairsPath, verdictsPath] = process.argv.slice(2);
const items = JSON.parse(readFileSync(pairsPath, 'utf8')).items;
const raw = readFileSync(verdictsPath, 'utf8');
const v = JSON.parse(raw); // throws if invalid JSON
const itemKeys = items.map((i) => i.key);
const vKeys = Object.keys(v);
console.log('items:', itemKeys.length, 'verdict keys:', vKeys.length);
const missing = itemKeys.filter((k) => !(k in v));
const extra = vKeys.filter((k) => !itemKeys.includes(k));
console.log('missing:', JSON.stringify(missing), 'extra:', JSON.stringify(extra));
let bad = 0;
const dist = { correctness: [0, 0, 0], on_topic: [0, 0, 0], delivery: [0, 0, 0] };
let solid = 0, wrong = 0, other = 0;
for (const k of vKeys) {
  const e = v[k];
  for (const f of ['correctness', 'on_topic', 'delivery']) {
    if (!Number.isInteger(e[f]) || e[f] < 0 || e[f] > 2) { bad++; console.log('BAD score', k, f, e[f]); }
    else dist[f][e[f]]++;
  }
  const words = String(e.reason || '').trim().split(/\s+/).length;
  if (!e.reason || words > 25) { bad++; console.log('BAD reason', k, words); }
  const extraFields = Object.keys(e).filter((f) => !['correctness', 'on_topic', 'delivery', 'reason'].includes(f));
  if (extraFields.length) { bad++; console.log('EXTRA fields', k, extraFields); }
  if (e.correctness === 2 && e.on_topic === 2) solid++;
  else if (e.correctness === 0 || e.on_topic === 0) wrong++;
  else other++;
}
console.log('bad:', bad);
console.log('dist [0,1,2]:', JSON.stringify(dist));
console.log('c2&o2:', solid, ' c0|o0:', wrong, ' other:', other);
const low = vKeys
  .map((k) => ({ k, s: v[k].correctness + v[k].on_topic + v[k].delivery }))
  .sort((a, b) => a.s - b.s)
  .slice(0, 7);
console.log('lowest:', JSON.stringify(low));

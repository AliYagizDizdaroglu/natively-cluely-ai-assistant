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
const bad = [];
const dist = { correctness: [0, 0, 0], on_topic: [0, 0, 0], delivery: [0, 0, 0] };
let solid = 0, fail = 0, middle = 0;
for (const k of vKeys) {
  const e = v[k];
  for (const f of ['correctness', 'on_topic', 'delivery']) {
    if (!Number.isInteger(e[f]) || e[f] < 0 || e[f] > 2) bad.push(`${k}.${f}=${e[f]}`);
    else dist[f][e[f]]++;
  }
  const words = String(e.reason || '').trim().split(/\s+/).filter(Boolean).length;
  if (!e.reason || words > 25) bad.push(`${k}.reason words=${words}`);
  const extraFields = Object.keys(e).filter((f) => !['correctness', 'on_topic', 'delivery', 'reason'].includes(f));
  if (extraFields.length) bad.push(`${k} extra fields ${extraFields}`);
  if (e.correctness === 2 && e.on_topic === 2) solid++;
  else if (e.correctness === 0 || e.on_topic === 0) fail++;
  else middle++;
}
console.log('bad', JSON.stringify(bad));
console.log('dist [0,1,2]', JSON.stringify(dist));
console.log('c2&o2', solid, 'middle', middle, 'c0|o0', fail);

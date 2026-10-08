// Throwaway: verify the bare31 verdicts file parses, matches the pairs keys, and tally classes.
const fs = require('fs');
const [pairsPath, verdictsPath] = process.argv.slice(2);
const pairs = JSON.parse(fs.readFileSync(pairsPath, 'utf8'));
const raw = fs.readFileSync(verdictsPath, 'utf8');
const v = JSON.parse(raw); // throws if invalid
const itemKeys = pairs.items.map((i) => i.key);
const vKeys = Object.keys(v);
console.log('items', itemKeys.length, 'verdictKeys', vKeys.length);
const missing = itemKeys.filter((k) => !(k in v));
const extra = vKeys.filter((k) => !itemKeys.includes(k));
console.log('missing', JSON.stringify(missing), 'extra', JSON.stringify(extra));
let bad = 0;
const hist = { correctness: [0, 0, 0], on_topic: [0, 0, 0], delivery: [0, 0, 0] };
let solid = 0, fail = 0, other = 0;
for (const k of vKeys) {
  const e = v[k];
  for (const d of ['correctness', 'on_topic', 'delivery']) {
    if (!Number.isInteger(e[d]) || e[d] < 0 || e[d] > 2) { bad++; console.log('BAD', k, d, e[d]); }
    else hist[d][e[d]]++;
  }
  const rw = String(e.reason || '').trim().split(/\s+/).filter(Boolean).length;
  if (!e.reason || rw > 25) { bad++; console.log('BAD reason', k, rw); }
  const extraFields = Object.keys(e).filter((f) => !['correctness', 'on_topic', 'delivery', 'reason'].includes(f));
  if (extraFields.length) { bad++; console.log('BAD fields', k, extraFields); }
  if (e.correctness === 2 && e.on_topic === 2) solid++;
  else if (e.correctness === 0 || e.on_topic === 0) fail++;
  else other++;
}
console.log('bad', bad);
console.log('hist', JSON.stringify(hist));
console.log('c2&o2', solid, 'c0|o0', fail, 'other', other);
const lowest = vKeys
  .map((k) => ({ k, s: v[k].correctness + v[k].on_topic + v[k].delivery }))
  .sort((a, b) => a.s - b.s || a.k.localeCompare(b.k))
  .slice(0, 5);
console.log('lowest', JSON.stringify(lowest));

import { readFileSync } from 'node:fs';
const [pairsPath, verdictsPath] = process.argv.slice(2);
const pairs = JSON.parse(readFileSync(pairsPath, 'utf8'));
const v = JSON.parse(readFileSync(verdictsPath, 'utf8'));
const itemKeys = pairs.items.map((i) => i.key);
const vKeys = Object.keys(v);
const problems = [];
if (vKeys.length !== itemKeys.length) problems.push(`count ${vKeys.length} vs items ${itemKeys.length}`);
for (const k of itemKeys) if (!(k in v)) problems.push(`missing ${k}`);
for (const k of vKeys) if (!itemKeys.includes(k)) problems.push(`extra ${k}`);
const hist = { correctness: [0, 0, 0], on_topic: [0, 0, 0], delivery: [0, 0, 0] };
let both2 = 0, any0 = 0, other = 0;
for (const [k, e] of Object.entries(v)) {
  for (const f of ['correctness', 'on_topic', 'delivery']) {
    const s = e[f];
    if (!Number.isInteger(s) || s < 0 || s > 2) problems.push(`${k}.${f}=${s}`);
    else hist[f][s]++;
  }
  const words = String(e.reason || '').trim().split(/\s+/).filter(Boolean).length;
  if (!e.reason || words > 25) problems.push(`${k} reason words ${words}`);
  const extra = Object.keys(e).filter((f) => !['correctness', 'on_topic', 'delivery', 'reason'].includes(f));
  if (extra.length) problems.push(`${k} extra fields ${extra}`);
  if (e.correctness === 2 && e.on_topic === 2) both2++;
  else if (e.correctness === 0 || e.on_topic === 0) any0++;
  else other++;
}
console.log('keys', vKeys.length, 'items', itemKeys.length);
console.log('problems', problems.length ? problems : 'none');
console.log('hist', JSON.stringify(hist));
console.log('both2', both2, 'any0', any0, 'other', other);

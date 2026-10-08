// Throwaway: verify the verdicts file against the pairs file (read-only on both).
import { readFileSync } from 'node:fs';
const [pairsPath, verdictsPath] = process.argv.slice(2);
const pairs = JSON.parse(readFileSync(pairsPath, 'utf8'));
const raw = readFileSync(verdictsPath, 'utf8');
const v = JSON.parse(raw); // throws if invalid JSON
const itemKeys = pairs.items.map((i) => i.key);
const vKeys = Object.keys(v);
const problems = [];
if (vKeys.length !== itemKeys.length) problems.push(`count ${vKeys.length} != items ${itemKeys.length}`);
for (const k of itemKeys) if (!(k in v)) problems.push(`missing ${k}`);
for (const k of vKeys) if (!itemKeys.includes(k)) problems.push(`extra ${k}`);
const dist = { correctness: [0, 0, 0], on_topic: [0, 0, 0], delivery: [0, 0, 0] };
let solid = 0, fail = 0, partial = 0;
const rows = [];
for (const k of itemKeys) {
  const e = v[k];
  if (!e) continue;
  for (const f of ['correctness', 'on_topic', 'delivery']) {
    if (!Number.isInteger(e[f]) || e[f] < 0 || e[f] > 2) problems.push(`${k}.${f} bad: ${e[f]}`);
    else dist[f][e[f]]++;
  }
  const extraFields = Object.keys(e).filter((f) => !['correctness', 'on_topic', 'delivery', 'reason'].includes(f));
  if (extraFields.length) problems.push(`${k} extra fields ${extraFields}`);
  const words = String(e.reason ?? '').trim().split(/\s+/).filter(Boolean).length;
  if (!e.reason || words > 25) problems.push(`${k} reason words=${words}`);
  if (e.correctness === 2 && e.on_topic === 2) solid++;
  else if (e.correctness === 0 || e.on_topic === 0) fail++;
  else partial++;
  rows.push([k, e.correctness + e.on_topic + e.delivery, e.correctness, e.on_topic, e.delivery]);
}
console.log('parsed OK; keys', vKeys.length, 'items', itemKeys.length);
console.log('problems:', problems.length ? problems : 'none');
console.log('dist', JSON.stringify(dist));
console.log('solid(c2&o2)', solid, 'partial', partial, 'fail(c0|o0)', fail);
rows.sort((a, b) => a[1] - b[1] || a[2] - b[2]);
console.log('lowest:', rows.slice(0, 6).map((r) => r.join('/')).join('  '));

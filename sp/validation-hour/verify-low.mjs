// Read-only verification of a verdicts file against its pairs file.
import { readFileSync } from 'node:fs';
const [pairsPath, verdictsPath] = process.argv.slice(2);
const pairs = JSON.parse(readFileSync(pairsPath, 'utf8'));
const raw = readFileSync(verdictsPath, 'utf8');
const v = JSON.parse(raw); // throws if not valid JSON
const itemKeys = pairs.items.map((i) => i.key);
const vKeys = Object.keys(v);
const problems = [];
if (vKeys.length !== itemKeys.length) problems.push(`count ${vKeys.length} != items ${itemKeys.length}`);
for (const k of itemKeys) if (!(k in v)) problems.push(`missing ${k}`);
for (const k of vKeys) if (!itemKeys.includes(k)) problems.push(`extra ${k}`);
const dims = ['correctness', 'on_topic', 'delivery'];
const dist = Object.fromEntries(dims.map((d) => [d, { 0: 0, 1: 0, 2: 0 }]));
let both2 = 0, zero = 0;
for (const [k, e] of Object.entries(v)) {
  for (const d of dims) {
    if (!Number.isInteger(e[d]) || e[d] < 0 || e[d] > 2) problems.push(`${k}.${d} bad: ${e[d]}`);
    else dist[d][e[d]]++;
  }
  if (typeof e.reason !== 'string' || !e.reason.trim()) problems.push(`${k} no reason`);
  else if (e.reason.trim().split(/\s+/).length > 25) problems.push(`${k} reason > 25 words`);
  const extra = Object.keys(e).filter((x) => ![...dims, 'reason'].includes(x));
  if (extra.length) problems.push(`${k} extra fields ${extra}`);
  if (e.correctness === 2 && e.on_topic === 2) both2++;
  if (e.correctness === 0 || e.on_topic === 0) zero++;
}
console.log('parsed OK; keys', vKeys.length, 'items', itemKeys.length);
console.log('problems', problems.length ? problems : 'none');
console.log('dist', JSON.stringify(dist));
console.log('c2&o2', both2, 'c0|o0', zero, 'other', vKeys.length - both2 - zero);
const lowest = Object.entries(v)
  .map(([k, e]) => [k, e.correctness + e.on_topic + e.delivery, e.correctness, e.on_topic, e.delivery])
  .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))
  .slice(0, 5);
console.log('lowest5', JSON.stringify(lowest));

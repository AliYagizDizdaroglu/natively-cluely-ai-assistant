// Throwaway: verify a verdicts file against its pairs file (read-only on both).
import { readFileSync } from 'node:fs';
const [pairsPath, verdictsPath] = process.argv.slice(2);
const pairs = JSON.parse(readFileSync(pairsPath, 'utf8'));
const raw = readFileSync(verdictsPath, 'utf8');
const v = JSON.parse(raw); // throws if invalid JSON
const itemKeys = pairs.items.map((i) => i.key);
const vKeys = Object.keys(v);
const missing = itemKeys.filter((k) => !(k in v));
const extra = vKeys.filter((k) => !itemKeys.includes(k));
const problems = [];
for (const k of vKeys) {
  const e = v[k];
  for (const f of ['correctness', 'on_topic', 'delivery']) {
    if (!Number.isInteger(e[f]) || e[f] < 0 || e[f] > 2) problems.push(`${k}.${f}=${e[f]}`);
  }
  if (typeof e.reason !== 'string' || !e.reason.trim()) problems.push(`${k}.reason empty`);
  const rw = (e.reason || '').split(/\s+/).filter(Boolean).length;
  if (rw > 25) problems.push(`${k}.reason ${rw} words`);
  const extraFields = Object.keys(e).filter((f) => !['correctness', 'on_topic', 'delivery', 'reason'].includes(f));
  if (extraFields.length) problems.push(`${k} extra fields ${extraFields}`);
}
console.log('items:', itemKeys.length, 'verdict keys:', vKeys.length, 'missing:', missing, 'extra:', extra, 'problems:', problems);
const dist = (f) => [0, 1, 2].map((s) => vKeys.filter((k) => v[k][f] === s).length);
console.log('correctness 0/1/2:', dist('correctness'));
console.log('on_topic    0/1/2:', dist('on_topic'));
console.log('delivery    0/1/2:', dist('delivery'));
const full = vKeys.filter((k) => v[k].correctness === 2 && v[k].on_topic === 2).length;
const fail = vKeys.filter((k) => v[k].correctness === 0 || v[k].on_topic === 0).length;
console.log('c2&o2:', full, 'c0|o0:', fail, 'other:', vKeys.length - full - fail);
const lowest = [...vKeys].sort((a, b) => {
  const s = (k) => v[k].correctness + v[k].on_topic + v[k].delivery;
  return s(a) - s(b) || v[a].correctness - v[b].correctness;
}).slice(0, 5);
for (const k of lowest) console.log('low:', k, v[k].correctness, v[k].on_topic, v[k].delivery);

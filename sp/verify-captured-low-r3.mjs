// Read-only check of the verdicts file against the pairs file.
import { readFileSync } from 'node:fs';
const pairsPath = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\electron\\test\\golden\\interview60.runs\\2026-09-29T11-42-00-h40c\\interview60.judge.pairs.gemini-3.1-flash-lite_captured-low-r3.json';
const verdictsPath = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-lab\\sp\\h40c-verdicts-captured-low-r3.json';
const pairs = JSON.parse(readFileSync(pairsPath, 'utf8'));
const v = JSON.parse(readFileSync(verdictsPath, 'utf8'));
const itemKeys = pairs.items.map(i => i.key);
const vKeys = Object.keys(v);
console.log('items', itemKeys.length, 'verdicts', vKeys.length);
console.log('missing', itemKeys.filter(k => !(k in v)));
console.log('extra', vKeys.filter(k => !itemKeys.includes(k)));
const dims = ['correctness', 'on_topic', 'delivery'];
const dist = Object.fromEntries(dims.map(d => [d, { 0: 0, 1: 0, 2: 0 }]));
let bad = 0, good = 0, invalid = 0;
const totals = [];
for (const k of vKeys) {
  const e = v[k];
  for (const d of dims) {
    if (![0, 1, 2].includes(e[d])) invalid++;
    else dist[d][e[d]]++;
  }
  if (typeof e.reason !== 'string' || !e.reason.trim()) invalid++;
  const rw = e.reason.split(/\s+/).filter(Boolean).length;
  if (rw > 25) console.log('reason over 25 words', k, rw);
  if (e.correctness === 2 && e.on_topic === 2) good++;
  if (e.correctness === 0 || e.on_topic === 0) bad++;
  totals.push([k, e.correctness + e.on_topic + e.delivery, e.correctness, e.on_topic, e.delivery]);
}
console.log('invalid', invalid);
console.log('dist', JSON.stringify(dist));
console.log('c2&o2', good, 'c0|o0', bad);
totals.sort((a, b) => a[1] - b[1] || a[2] - b[2]);
console.log('lowest', JSON.stringify(totals.slice(0, 7)));

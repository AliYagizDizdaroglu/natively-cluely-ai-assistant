// Throwaway: verify the verdicts file against the pairs file (read-only on both).
import { readFileSync } from 'node:fs';
const pairsPath = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\electron\\test\\golden\\interview60.runs\\2026-09-26T11-39-51-h40b\\interview60.judge.pairs.gemini-3.5-flash-lite_captured-high.json';
const verdictsPath = process.argv[2];
const pairs = JSON.parse(readFileSync(pairsPath, 'utf8'));
const raw = readFileSync(verdictsPath, 'utf8');
const v = JSON.parse(raw); // throws if invalid JSON
const itemKeys = pairs.items.map(i => i.key);
const vKeys = Object.keys(v);
const missing = itemKeys.filter(k => !(k in v));
const extra = vKeys.filter(k => !itemKeys.includes(k));
console.log('items:', itemKeys.length, 'verdict keys:', vKeys.length, 'missing:', missing, 'extra:', extra);
let bad = 0;
const dist = { correctness: [0, 0, 0], on_topic: [0, 0, 0], delivery: [0, 0, 0] };
for (const k of vKeys) {
  const e = v[k];
  for (const f of ['correctness', 'on_topic', 'delivery']) {
    if (!Number.isInteger(e[f]) || e[f] < 0 || e[f] > 2) { console.log('BAD score', k, f, e[f]); bad++; }
    else dist[f][e[f]]++;
  }
  const words = String(e.reason || '').trim().split(/\s+/).filter(Boolean).length;
  if (!e.reason || words > 25) { console.log('BAD reason', k, words); bad++; }
  const extraFields = Object.keys(e).filter(f => !['correctness', 'on_topic', 'delivery', 'reason'].includes(f));
  if (extraFields.length) { console.log('EXTRA fields', k, extraFields); bad++; }
}
const solid = vKeys.filter(k => v[k].correctness === 2 && v[k].on_topic === 2).length;
const fail = vKeys.filter(k => v[k].correctness === 0 || v[k].on_topic === 0).length;
console.log('dist (count of 0/1/2):', JSON.stringify(dist));
console.log('c2&o2:', solid, 'c0|o0:', fail, 'other:', vKeys.length - solid - fail, 'bad:', bad);
const low = vKeys.map(k => [k, v[k].correctness + v[k].on_topic + v[k].delivery]).sort((a, b) => a[1] - b[1]).slice(0, 6);
console.log('lowest:', JSON.stringify(low));

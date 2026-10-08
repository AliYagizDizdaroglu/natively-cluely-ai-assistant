import fs from 'node:fs';
const pairsPath = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\electron\\test\\golden\\interview60.runs\\2026-09-29T11-42-00-h40c\\interview60.judge.pairs.gemini-3.5-flash-lite_captured-high.json';
const verdictsPath = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-lab\\sp\\h40c-verdicts-captured-high.json';
const pairs = JSON.parse(fs.readFileSync(pairsPath, 'utf8'));
const v = JSON.parse(fs.readFileSync(verdictsPath, 'utf8'));
const itemKeys = pairs.items.map((i) => i.key);
const vKeys = Object.keys(v);
console.log('items', itemKeys.length, 'verdicts', vKeys.length);
const missing = itemKeys.filter((k) => !(k in v));
const extra = vKeys.filter((k) => !itemKeys.includes(k));
console.log('missing', JSON.stringify(missing), 'extra', JSON.stringify(extra));
let bad = 0;
let solid = 0, wrong = 0, acceptable = 0;
const dist = { correctness: [0, 0, 0], on_topic: [0, 0, 0], delivery: [0, 0, 0] };
for (const k of vKeys) {
  const e = v[k];
  const fields = Object.keys(e).sort().join(',');
  if (fields !== 'correctness,delivery,on_topic,reason') { console.log('BAD FIELDS', k, fields); bad++; }
  for (const f of ['correctness', 'on_topic', 'delivery']) {
    if (!Number.isInteger(e[f]) || e[f] < 0 || e[f] > 2) { console.log('BAD SCORE', k, f, e[f]); bad++; }
    else dist[f][e[f]]++;
  }
  const w = String(e.reason).trim().split(/\s+/).length;
  if (typeof e.reason !== 'string' || w > 25) { console.log('BAD REASON', k, w); bad++; }
  if (e.correctness === 2 && e.on_topic === 2) solid++;
  else if (e.correctness === 0 || e.on_topic === 0) wrong++;
  else acceptable++;
}
console.log('bad', bad);
console.log('solid(c2&o2)', solid, 'acceptable(rest)', acceptable, 'wrong(c0|o0)', wrong);
console.log('dist', JSON.stringify(dist));
const lowest = vKeys
  .map((k) => ({ k, s: v[k].correctness + v[k].on_topic + v[k].delivery, c: v[k].correctness, o: v[k].on_topic }))
  .sort((a, b) => a.s - b.s || a.c - b.c || a.o - b.o)
  .slice(0, 5)
  .map((x) => `${x.k}:${x.s}`);
console.log('lowest5', lowest.join(' '));

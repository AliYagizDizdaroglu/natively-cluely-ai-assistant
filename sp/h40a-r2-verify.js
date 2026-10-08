// Throwaway: verify the verdicts file against the pairs file (read-only on both).
const fs = require('fs');
const pairsPath = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\electron\\test\\golden\\interview60.runs\\2026-09-24T08-20-12-h40a\\interview60.judge.pairs.gemini-3.5-flash-lite_captured-high-r2.json';
const verdictsPath = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-lab\\sp\\h40a-verdicts-captured-high-r2.json';

const pairKeys = JSON.parse(fs.readFileSync(pairsPath, 'utf8')).items.map((i) => i.key);

function validate(v) {
  const errs = [];
  const vk = Object.keys(v);
  if (vk.length !== pairKeys.length) errs.push(`key count ${vk.length} != items ${pairKeys.length}`);
  for (const k of pairKeys) if (!(k in v)) errs.push(`missing ${k}`);
  for (const k of vk) if (!pairKeys.includes(k)) errs.push(`extra ${k}`);
  for (const [k, e] of Object.entries(v)) {
    for (const f of ['correctness', 'on_topic', 'delivery']) {
      if (!Number.isInteger(e[f]) || e[f] < 0 || e[f] > 2) errs.push(`${k}.${f} bad: ${e[f]}`);
    }
    if (typeof e.reason !== 'string' || !e.reason.trim()) errs.push(`${k}.reason empty`);
    else if (e.reason.trim().split(/\s+/).length > 25) errs.push(`${k}.reason > 25 words`);
    const extra = Object.keys(e).filter((f) => !['correctness', 'on_topic', 'delivery', 'reason'].includes(f));
    if (extra.length) errs.push(`${k} extra fields ${extra}`);
  }
  return errs;
}

// Calibration: a deliberately broken copy must fail.
const raw = fs.readFileSync(verdictsPath, 'utf8');
const broken = JSON.parse(raw);
delete broken[pairKeys[0]];
broken[pairKeys[1]].delivery = 3;
console.log('calibration (expect errors):', validate(broken));

// Real check.
const v = JSON.parse(raw); // throws if not valid JSON
const errs = validate(v);
console.log('real file errors:', errs.length ? errs : 'none');
console.log('keys in file:', Object.keys(v).length, '| items in pairs:', pairKeys.length);

const dist = { correctness: [0, 0, 0], on_topic: [0, 0, 0], delivery: [0, 0, 0] };
let solid = 0, fail = 0, partial = 0;
for (const e of Object.values(v)) {
  for (const f of Object.keys(dist)) dist[f][e[f]]++;
  if (e.correctness === 2 && e.on_topic === 2) solid++;
  else if (e.correctness === 0 || e.on_topic === 0) fail++;
  else partial++;
}
console.log('c2&o2:', solid, '| c0|o0:', fail, '| other:', partial);
console.log('distribution [0,1,2]:', JSON.stringify(dist));
const lowest = Object.entries(v)
  .map(([k, e]) => [k, e.correctness + e.on_topic + e.delivery, e])
  .sort((a, b) => a[1] - b[1])
  .slice(0, 5);
for (const [k, s, e] of lowest) console.log('low', k, s, `c${e.correctness} o${e.on_topic} d${e.delivery}`);

// Throwaway: verify the qwen verdicts file against the pairs file (read-only on both).
import fs from 'node:fs';
const pairsPath = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\electron\\test\\golden\\interview60.runs\\2026-09-26T11-39-51-h40b\\interview60.judge.pairs.qwen_qwen3.8-27b.json';
const verdictsPath = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-lab\\sp\\h40b-verdicts-qwen.json';

const items = JSON.parse(fs.readFileSync(pairsPath, 'utf8')).items;
const keys = items.map(i => i.key);

function validate(v) {
  const errs = [];
  const vk = Object.keys(v);
  if (vk.length !== keys.length) errs.push(`key count ${vk.length} != items ${keys.length}`);
  for (const k of keys) if (!(k in v)) errs.push(`missing ${k}`);
  for (const k of vk) if (!keys.includes(k)) errs.push(`extra ${k}`);
  for (const [k, e] of Object.entries(v)) {
    for (const f of ['correctness', 'on_topic', 'delivery']) {
      if (!Number.isInteger(e[f]) || e[f] < 0 || e[f] > 2) errs.push(`${k}.${f} bad: ${e[f]}`);
    }
    if (typeof e.reason !== 'string' || !e.reason.trim()) errs.push(`${k}.reason empty`);
    else if (e.reason.trim().split(/\s+/).length > 25) errs.push(`${k}.reason >25 words`);
    const extra = Object.keys(e).filter(f => !['correctness', 'on_topic', 'delivery', 'reason'].includes(f));
    if (extra.length) errs.push(`${k} extra fields ${extra}`);
  }
  return errs;
}

// Calibration: the check must flag a known-bad copy.
const raw = fs.readFileSync(verdictsPath, 'utf8');
const v = JSON.parse(raw); // throws if not valid JSON
const bad = JSON.parse(raw);
delete bad[keys[0]];
bad[keys[1]].delivery = 3;
const badErrs = validate(bad);
console.log('calibration (expect >=2 errors):', badErrs.length, badErrs.slice(0, 3));

const errs = validate(v);
console.log('real file errors:', errs.length ? errs : 'none');
console.log('verdict keys', Object.keys(v).length, 'items', keys.length);

const dist = f => [0, 1, 2].map(s => `${s}:${Object.values(v).filter(e => e[f] === s).length}`).join(' ');
console.log('correctness', dist('correctness'));
console.log('on_topic   ', dist('on_topic'));
console.log('delivery   ', dist('delivery'));
const vals = Object.values(v);
console.log('c2&o2', vals.filter(e => e.correctness === 2 && e.on_topic === 2).length);
console.log('c0|o0', vals.filter(e => e.correctness === 0 || e.on_topic === 0).length);

// Read-only check of the captured-high verdicts file against the pairs file.
import { readFileSync } from 'node:fs';

const PAIRS = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-cluely-ai-assistant\\electron\\test\\golden\\interview60.runs\\2026-09-24T08-20-12-h40a\\interview60.judge.pairs.gemini-3.5-flash-lite_captured-high.json';
const VERDICTS = 'C:\\Users\\sotka\\OneDrive\\Masaüstü\\natively-lab\\sp\\h40a-verdicts-captured-high.json';

const items = JSON.parse(readFileSync(PAIRS, 'utf8')).items;
const v = JSON.parse(readFileSync(VERDICTS, 'utf8')); // throws if not valid JSON
const itemKeys = items.map(i => i.key);
const vKeys = Object.keys(v);
const problems = [];
if (vKeys.length !== itemKeys.length) problems.push(`count ${vKeys.length} != ${itemKeys.length}`);
for (const k of itemKeys) if (!(k in v)) problems.push(`missing ${k}`);
for (const k of vKeys) if (!itemKeys.includes(k)) problems.push(`extra ${k}`);
for (const [k, r] of Object.entries(v)) {
  for (const f of ['correctness', 'on_topic', 'delivery']) {
    if (!Number.isInteger(r[f]) || r[f] < 0 || r[f] > 2) problems.push(`${k}.${f}=${r[f]}`);
  }
  if (typeof r.reason !== 'string' || !r.reason.trim()) problems.push(`${k} no reason`);
  const w = r.reason.trim().split(/\s+/).length;
  if (w > 25) problems.push(`${k} reason ${w} words`);
  const extra = Object.keys(r).filter(f => !['correctness', 'on_topic', 'delivery', 'reason'].includes(f));
  if (extra.length) problems.push(`${k} extra fields ${extra}`);
}
const rows = Object.entries(v);
const tally = f => [0, 1, 2].map(n => `${n}:${rows.filter(([, r]) => r[f] === n).length}`).join(' ');
console.log('parsed OK; verdict keys', vKeys.length, 'items', itemKeys.length);
console.log('problems', problems.length ? problems : 'none');
console.log('correctness', tally('correctness'));
console.log('on_topic   ', tally('on_topic'));
console.log('delivery   ', tally('delivery'));
console.log('c2&o2', rows.filter(([, r]) => r.correctness === 2 && r.on_topic === 2).length);
console.log('c0|o0', rows.filter(([, r]) => r.correctness === 0 || r.on_topic === 0).length);
const lowest = rows
  .map(([k, r]) => [k, r.correctness + r.on_topic + r.delivery, r])
  .sort((a, b) => a[1] - b[1] || a[2].correctness - b[2].correctness)
  .slice(0, 9);
for (const [k, s, r] of lowest) console.log(k, s, `${r.correctness}/${r.on_topic}/${r.delivery}`);

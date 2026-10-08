import fs from 'node:fs';
const [pairsPath, verdictsPath] = process.argv.slice(2);
const pairs = JSON.parse(fs.readFileSync(pairsPath, 'utf8'));
const raw = fs.readFileSync(verdictsPath, 'utf8');
const v = JSON.parse(raw); // throws if invalid JSON
const itemKeys = pairs.items.map((it) => it.key);
const vKeys = Object.keys(v);
const problems = [];
if (vKeys.length !== itemKeys.length) problems.push(`count mismatch: verdicts ${vKeys.length} vs items ${itemKeys.length}`);
for (const k of itemKeys) if (!(k in v)) problems.push(`missing key ${k}`);
for (const k of vKeys) if (!itemKeys.includes(k)) problems.push(`extra key ${k}`);
for (const [k, r] of Object.entries(v)) {
  for (const f of ['correctness', 'on_topic', 'delivery']) {
    if (!Number.isInteger(r[f]) || r[f] < 0 || r[f] > 2) problems.push(`${k}.${f} bad: ${r[f]}`);
  }
  if (typeof r.reason !== 'string' || !r.reason.trim()) problems.push(`${k} missing reason`);
  const w = r.reason.trim().split(/\s+/).length;
  if (w > 25) problems.push(`${k} reason ${w} words`);
  const extra = Object.keys(r).filter((f) => !['correctness', 'on_topic', 'delivery', 'reason'].includes(f));
  if (extra.length) problems.push(`${k} extra fields ${extra}`);
}
const vals = Object.values(v);
const solid = vals.filter((r) => r.correctness === 2 && r.on_topic === 2).length;
const wrong = vals.filter((r) => r.correctness === 0 || r.on_topic === 0).length;
const partial = vals.length - solid - wrong;
const dist = (f) => [0, 1, 2].map((s) => `${s}:${vals.filter((r) => r[f] === s).length}`).join(' ');
console.log('parsed OK; items', itemKeys.length, 'verdicts', vKeys.length);
console.log('problems', problems.length ? problems : 'none');
console.log('c2&o2', solid, '| c0|o0', wrong, '| other', partial);
console.log('correctness', dist('correctness'));
console.log('on_topic   ', dist('on_topic'));
console.log('delivery   ', dist('delivery'));
const lowest = Object.entries(v)
  .map(([k, r]) => [k, r.correctness + r.on_topic + r.delivery, r])
  .sort((a, b) => a[1] - b[1])
  .slice(0, 7);
for (const [k, s, r] of lowest) console.log(k, s, `${r.correctness}/${r.on_topic}/${r.delivery}`);

// Throwaway: verify a verdicts file against its pairs file. Read-only on both.
import { readFileSync } from 'node:fs';
const [pairsPath, verdictsPath] = process.argv.slice(2);
const pairs = JSON.parse(readFileSync(pairsPath, 'utf8'));
const raw = readFileSync(verdictsPath, 'utf8');

function check(v) {
  const errs = [];
  const itemKeys = pairs.items.map((i) => i.key);
  const vKeys = Object.keys(v);
  if (vKeys.length !== itemKeys.length) errs.push(`key count ${vKeys.length} != items ${itemKeys.length}`);
  for (const k of itemKeys) if (!(k in v)) errs.push(`missing ${k}`);
  for (const k of vKeys) if (!itemKeys.includes(k)) errs.push(`extra ${k}`);
  for (const [k, e] of Object.entries(v)) {
    for (const f of ['correctness', 'on_topic', 'delivery']) {
      if (!Number.isInteger(e[f]) || e[f] < 0 || e[f] > 2) errs.push(`${k}.${f} bad: ${e[f]}`);
    }
    if (typeof e.reason !== 'string' || !e.reason.trim()) errs.push(`${k} no reason`);
    else if (e.reason.trim().split(/\s+/).length > 25) errs.push(`${k} reason > 25 words`);
    const extra = Object.keys(e).filter((f) => !['correctness', 'on_topic', 'delivery', 'reason'].includes(f));
    if (extra.length) errs.push(`${k} extra fields ${extra}`);
  }
  return errs;
}

// Calibration: a known-broken copy must fail.
const broken = JSON.parse(raw);
delete broken[Object.keys(broken)[0]];
broken[Object.keys(broken)[1]].delivery = 3;
const be = check(broken);
console.log('calibration (expect errors):', be.length ? be.join('; ') : 'NO ERRORS - CHECK IS BLIND');

const v = JSON.parse(raw); // throws if the file is not valid JSON
const errs = check(v);
console.log('real file:', errs.length ? errs.join('; ') : 'OK');
console.log('items in pairs:', pairs.items.length, 'keys in verdicts:', Object.keys(v).length);

const e = Object.values(v);
const both2 = e.filter((x) => x.correctness === 2 && x.on_topic === 2).length;
const any0 = e.filter((x) => x.correctness === 0 || x.on_topic === 0).length;
console.log('correctness 2 and on_topic 2:', both2);
console.log('correctness 0 or on_topic 0:', any0);
console.log('neither (a 1, no 0):', e.length - both2 - any0);
for (const f of ['correctness', 'on_topic', 'delivery']) {
  const d = [0, 1, 2].map((s) => e.filter((x) => x[f] === s).length);
  console.log(`${f} 0/1/2:`, d.join('/'));
}
const low = Object.entries(v)
  .map(([k, x]) => [k, x.correctness + x.on_topic + x.delivery])
  .sort((a, b) => a[1] - b[1])
  .slice(0, 7);
console.log('lowest totals:', low.map(([k, s]) => `${k}=${s}`).join(' '));

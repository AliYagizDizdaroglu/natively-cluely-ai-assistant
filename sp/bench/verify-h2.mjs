import fs from 'node:fs';
import path from 'node:path';

const dir = path.dirname(new URL(import.meta.url).pathname.replace(/^\//, ''));
const pairsPath = path.join(dir, 'pairs.controlr1-vs-scaffoldr1.h2.json');
const verdictsPath = path.join(dir, 'verdicts.controlr1-vs-scaffoldr1.h2.json');

const pairs = JSON.parse(fs.readFileSync(pairsPath, 'utf8'));
const verdicts = JSON.parse(fs.readFileSync(verdictsPath, 'utf8'));

const itemKeys = pairs.items.map((i) => i.key);
const vKeys = Object.keys(verdicts);

const missing = itemKeys.filter((k) => !vKeys.includes(k));
const extra = vKeys.filter((k) => !itemKeys.includes(k));

let bad = [];
for (const [k, v] of Object.entries(verdicts)) {
  for (const f of ['correctness', 'on_topic', 'delivery']) {
    if (!Number.isInteger(v[f]) || v[f] < 0 || v[f] > 2) bad.push(k + ':' + f);
  }
  if (typeof v.reason !== 'string' || v.reason.length === 0) bad.push(k + ':reason');
}

const both2 = vKeys.filter((k) => verdicts[k].correctness === 2 && verdicts[k].on_topic === 2);
const anyZero = vKeys.filter((k) => verdicts[k].correctness === 0 || verdicts[k].on_topic === 0);

const totals = vKeys
  .map((k) => ({ k, t: verdicts[k].correctness + verdicts[k].on_topic + verdicts[k].delivery }))
  .sort((a, b) => a.t - b.t);

console.log('items in pairs:', itemKeys.length);
console.log('keys in verdicts:', vKeys.length);
console.log('missing keys:', JSON.stringify(missing));
console.log('extra keys:', JSON.stringify(extra));
console.log('bad fields:', JSON.stringify(bad));
console.log('correctness 2 AND on_topic 2:', both2.length);
console.log('correctness 0 OR on_topic 0:', anyZero.length, JSON.stringify(anyZero));
console.log('lowest ten by total:', totals.slice(0, 10).map((x) => x.k + '=' + x.t).join(', '));

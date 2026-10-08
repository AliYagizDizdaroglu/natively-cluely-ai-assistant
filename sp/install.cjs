const fs = require('fs');
const [, , pairsPath, srcPath, destPath] = process.argv;

const pairs = JSON.parse(fs.readFileSync(pairsPath, 'utf8'));
const raw = fs.readFileSync(srcPath, 'utf8');
const v = JSON.parse(raw); // throws on trailing commas / bad JSON

const itemKeys = pairs.items.map(i => i.key);
const vKeys = Object.keys(v);

const missing = itemKeys.filter(k => !(k in v));
const extra = vKeys.filter(k => !itemKeys.includes(k));
if (missing.length || extra.length) {
  console.log('MISSING', missing, 'EXTRA', extra);
  process.exit(1);
}

const wc = s => s.trim().split(/\s+/).filter(Boolean).length;
let bad = 0;
for (const k of itemKeys) {
  const e = v[k];
  for (const f of ['correctness', 'on_topic', 'delivery']) {
    if (!Number.isInteger(e[f]) || e[f] < 0 || e[f] > 2) { console.log('BAD SCORE', k, f, e[f]); bad++; }
  }
  if (typeof e.reason !== 'string' || !e.reason) { console.log('BAD REASON', k); bad++; }
  if (wc(e.reason) > 25) { console.log('REASON TOO LONG', k, wc(e.reason)); bad++; }
}
if (bad) process.exit(1);

fs.writeFileSync(destPath, JSON.stringify(v, null, 1) + '\n', 'utf8');

// re-read what was actually written, as the proof
const back = JSON.parse(fs.readFileSync(destPath, 'utf8'));
const bk = Object.keys(back);
console.log('WROTE', destPath);
console.log('parses: yes | keys:', bk.length, '| items:', itemKeys.length, '| match:', bk.length === itemKeys.length);

const clean = bk.filter(k => back[k].correctness === 2 && back[k].on_topic === 2).length;
const zero = bk.filter(k => back[k].correctness === 0 || back[k].on_topic === 0).length;
console.log('correctness2+on_topic2:', clean);
console.log('correctness0 or on_topic0:', zero);

const tot = k => back[k].correctness + back[k].on_topic + back[k].delivery;
console.log('--- lowest total scores ---');
bk.slice().sort((a, b) => tot(a) - tot(b)).slice(0, 8)
  .forEach(k => console.log(tot(k), k, JSON.stringify([back[k].correctness, back[k].on_topic, back[k].delivery]), back[k].reason));

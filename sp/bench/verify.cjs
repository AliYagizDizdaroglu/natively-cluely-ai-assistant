const fs = require('fs');
const base = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/bench/';
const pairs = JSON.parse(fs.readFileSync(base + 'pairs.controlr2-vs-scaffoldr2.h1.json', 'utf8'));
const raw = fs.readFileSync(base + 'verdicts.controlr2-vs-scaffoldr2.h1.json', 'utf8');
const v = JSON.parse(raw);

const itemKeys = pairs.items.map(i => i.key);
const vKeys = Object.keys(v);
console.log('items in pairs :', itemKeys.length);
console.log('keys in verdict:', vKeys.length);

const missing = itemKeys.filter(k => !(k in v));
const extra = vKeys.filter(k => !itemKeys.includes(k));
console.log('missing keys   :', missing.length ? missing.join(',') : 'none');
console.log('extra keys     :', extra.length ? extra.join(',') : 'none');

let bad = [];
for (const [k, s] of Object.entries(v)) {
  for (const f of ['correctness', 'on_topic', 'delivery']) {
    if (!Number.isInteger(s[f]) || s[f] < 0 || s[f] > 2) bad.push(k + '.' + f + '=' + s[f]);
  }
  if (typeof s.reason !== 'string' || !s.reason.length) bad.push(k + '.reason');
}
console.log('bad fields     :', bad.length ? bad.join(',') : 'none');

const both2 = vKeys.filter(k => v[k].correctness === 2 && v[k].on_topic === 2);
const anyZero = vKeys.filter(k => v[k].correctness === 0 || v[k].on_topic === 0);
console.log('correctness2+on_topic2 :', both2.length);
console.log('correctness0 or on_topic0:', anyZero.length, anyZero.join(','));

const ranked = vKeys
  .map(k => ({ k, t: v[k].correctness + v[k].on_topic + v[k].delivery }))
  .sort((a, b) => a.t - b.t || a.k.localeCompare(b.k));
console.log('lowest 10 by total:', ranked.slice(0, 10).map(r => r.k + '(' + r.t + ')').join(' '));

// calibration: a deliberately corrupted copy must be caught
const corrupt = JSON.parse(raw);
delete corrupt[itemKeys[0]];
console.log('CALIBRATION (drop one key) -> detected missing:',
  itemKeys.filter(k => !(k in corrupt)).length === 1);

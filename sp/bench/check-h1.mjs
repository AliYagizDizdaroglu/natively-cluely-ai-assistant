import { readFileSync } from 'node:fs';

const base = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/bench/';
const pairs = JSON.parse(readFileSync(base + 'pairs.controlr3-vs-coverager3.h1.json', 'utf8'));
const v = JSON.parse(readFileSync(base + 'verdicts.controlr3-vs-coverager3.h1.json', 'utf8'));

const itemKeys = pairs.items.map(i => i.key);
const vKeys = Object.keys(v);
console.log('items:', itemKeys.length, 'verdict keys:', vKeys.length);
console.log('missing:', itemKeys.filter(k => !(k in v)).join(',') || 'none');
console.log('extra:', vKeys.filter(k => !itemKeys.includes(k)).join(',') || 'none');

let bad = 0;
for (const [k, s] of Object.entries(v)) {
  for (const f of ['correctness', 'on_topic', 'delivery']) {
    if (!Number.isInteger(s[f]) || s[f] < 0 || s[f] > 2) { console.log('BAD SCORE', k, f, s[f]); bad++; }
  }
  if (typeof s.reason !== 'string' || !s.reason.length) { console.log('BAD REASON', k); bad++; }
}
console.log('bad fields:', bad);

const both2 = vKeys.filter(k => v[k].correctness === 2 && v[k].on_topic === 2);
const anyZero = vKeys.filter(k => v[k].correctness === 0 || v[k].on_topic === 0);
console.log('correctness2+on_topic2:', both2.length);
console.log('correctness0 or on_topic0:', anyZero.length, anyZero.join(','));

const ranked = vKeys
  .map(k => ({ k, t: v[k].correctness + v[k].on_topic + v[k].delivery, c: v[k].correctness, o: v[k].on_topic, d: v[k].delivery }))
  .sort((a, b) => a.t - b.t || a.c - b.c || a.o - b.o);
console.log('lowest 8:', ranked.slice(0, 8).map(r => `${r.k}=${r.t}(c${r.c}/o${r.o}/d${r.d})`).join('  '));

const wc = s => s.trim().split(/\s+/).length;
console.log('reasons over 25 words:', vKeys.filter(k => wc(v[k].reason) > 25).join(',') || 'none');

const fs = require('fs');
const p = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/s50j-verdicts-low.json';
const s = 'C:/Users/sotka/OneDrive/Masa\u00fcst\u00fc/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-19T08-22-41-s50j/interview60.judge.pairs.gemini-3.1-flash-lite_low.json';
const v = JSON.parse(fs.readFileSync(p, 'utf8'));
const src = JSON.parse(fs.readFileSync(s, 'utf8'));
const keys = Object.keys(v);
console.log('parsed OK; verdict keys', keys.length, '| items', src.items.length);
console.log('missing:', src.items.map(i => i.key).filter(k => !(k in v)).join(',') || 'none');
console.log('extra:', keys.filter(k => !src.items.some(i => i.key === k)).join(',') || 'none');
let both2 = 0, anyzero = 0;
for (const k of keys) {
  const e = v[k];
  for (const f of ['correctness', 'on_topic', 'delivery']) {
    if (!Number.isInteger(e[f]) || e[f] < 0 || e[f] > 2) console.log('BAD', k, f, e[f]);
  }
  if (typeof e.reason !== 'string' || !e.reason.length) console.log('BAD reason', k);
  if (e.correctness === 2 && e.on_topic === 2) both2++;
  if (e.correctness === 0 || e.on_topic === 0) anyzero++;
}
console.log('correctness2+on_topic2:', both2);
console.log('correctness0 or on_topic0:', anyzero);
const tot = keys.map(k => [k, v[k].correctness + v[k].on_topic + v[k].delivery]).sort((a, b) => a[1] - b[1]);
console.log('lowest six by total:', JSON.stringify(tot.slice(0, 6)));

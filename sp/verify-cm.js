const fs = require('fs');
const vp = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/s50j-verdicts-captured-minimal.json';
const sp = 'C:/Users/sotka/OneDrive/Masaüstü/natively-cluely-ai-assistant/electron/test/golden/interview60.runs/2026-09-19T08-22-41-s50j/interview60.judge.pairs.gemini-3.1-flash-lite_captured-minimal.json';
const v = JSON.parse(fs.readFileSync(vp, 'utf8'));
const src = JSON.parse(fs.readFileSync(sp, 'utf8'));
const keys = src.items.map(i => i.key);
console.log('parsed OK; verdict keys', Object.keys(v).length, '| items', keys.length);
console.log('missing:', keys.filter(k => !(k in v)).join(',') || 'none');
console.log('extra:', Object.keys(v).filter(k => !keys.includes(k)).join(',') || 'none');
let both = 0, zero = 0;
const tot = [];
for (const k of keys) {
  const e = v[k];
  for (const f of ['correctness', 'on_topic', 'delivery']) {
    if (!Number.isInteger(e[f]) || e[f] < 0 || e[f] > 2) console.log('BAD SCORE', k, f, e[f]);
  }
  if (!e.reason) console.log('NO REASON', k);
  if (e.correctness === 2 && e.on_topic === 2) both++;
  if (e.correctness === 0 || e.on_topic === 0) zero++;
  tot.push([k, e.correctness + e.on_topic + e.delivery]);
}
console.log('correctness2+on_topic2:', both);
console.log('correctness0 or on_topic0:', zero);
tot.sort((a, b) => a[1] - b[1]);
console.log('lowest eight:', JSON.stringify(tot.slice(0, 8)));

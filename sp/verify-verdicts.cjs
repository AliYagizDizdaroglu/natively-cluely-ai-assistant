const fs = require('fs');
const dir = 'C:/Users/sotka/OneDrive/Masaüstü/natively-lab/sp/';
const pairs = JSON.parse(fs.readFileSync(dir + 'spike-repeat.pairs.json', 'utf8'));
const v = JSON.parse(fs.readFileSync(dir + 'spike-repeat.verdicts.json', 'utf8'));

const pairKeys = pairs.items.map(i => i.key);
const vKeys = Object.keys(v);
console.log('items in pairs:', pairKeys.length);
console.log('keys in verdicts:', vKeys.length);

const missing = pairKeys.filter(k => !(k in v));
const extra = vKeys.filter(k => !pairKeys.includes(k));
console.log('missing:', JSON.stringify(missing));
console.log('extra:', JSON.stringify(extra));

// schema check
let bad = [];
for (const k of vKeys) {
  const e = v[k];
  for (const f of ['correctness', 'on_topic', 'delivery']) {
    if (!Number.isInteger(e[f]) || e[f] < 0 || e[f] > 2) bad.push(k + ':' + f);
  }
  if (typeof e.reason !== 'string' || e.reason.length === 0) bad.push(k + ':reason');
  const wc = String(e.reason).trim().split(/\s+/).length;
  if (wc > 25) bad.push(k + ':reason_words=' + wc);
}
console.log('schema problems:', JSON.stringify(bad));

// tallies, in first-appearance order
const order = [];
const tally = {};
for (const k of pairKeys) {
  const qid = k.split('|')[0];
  if (!(qid in tally)) { tally[qid] = { pass: 0, total: 0 }; order.push(qid); }
  tally[qid].total++;
  const e = v[k];
  if (e.correctness === 2 && e.on_topic === 2) tally[qid].pass++;
}
console.log('TALLY: ' + order.map(q => q + ' ' + tally[q].pass + '/' + tally[q].total).join(', '));

// score distribution
const dist = { correctness: {}, on_topic: {}, delivery: {} };
for (const k of vKeys) for (const f of Object.keys(dist)) dist[f][v[k][f]] = (dist[f][v[k][f]] || 0) + 1;
console.log('distribution:', JSON.stringify(dist));

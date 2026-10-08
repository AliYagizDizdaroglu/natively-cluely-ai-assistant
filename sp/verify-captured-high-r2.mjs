import fs from 'node:fs';
const [pairsPath, verdictsPath] = process.argv.slice(2);
const pairs = JSON.parse(fs.readFileSync(pairsPath, 'utf8'));
const raw = fs.readFileSync(verdictsPath, 'utf8');
const v = JSON.parse(raw); // throws if invalid JSON
const itemKeys = pairs.items.map((i) => i.key);
const vKeys = Object.keys(v);
console.log('items in pairs:', itemKeys.length, '| keys in verdicts:', vKeys.length);
const missing = itemKeys.filter((k) => !(k in v));
const extra = vKeys.filter((k) => !itemKeys.includes(k));
console.log('missing:', JSON.stringify(missing), '| extra:', JSON.stringify(extra));
let bad = 0;
const dist = { correctness: [0, 0, 0], on_topic: [0, 0, 0], delivery: [0, 0, 0] };
let c2o2 = 0, c0o0 = 0;
const totals = [];
for (const k of vKeys) {
  const e = v[k];
  for (const f of ['correctness', 'on_topic', 'delivery']) {
    if (!Number.isInteger(e[f]) || e[f] < 0 || e[f] > 2) { bad++; console.log('BAD score', k, f, e[f]); }
    else dist[f][e[f]]++;
  }
  if (typeof e.reason !== 'string' || !e.reason.trim()) { bad++; console.log('BAD reason', k); }
  const words = e.reason.trim().split(/\s+/).length;
  if (words > 25) { bad++; console.log('reason over 25 words', k, words); }
  if (e.correctness === 2 && e.on_topic === 2) c2o2++;
  if (e.correctness === 0 || e.on_topic === 0) c0o0++;
  totals.push([k, e.correctness + e.on_topic + e.delivery, e.correctness, e.on_topic, e.delivery]);
}
console.log('bad entries:', bad);
console.log('distribution (index = score 0/1/2):', JSON.stringify(dist));
console.log('c2&o2:', c2o2, '| c0|o0:', c0o0, '| other:', vKeys.length - c2o2 - c0o0);
totals.sort((a, b) => a[1] - b[1] || a[2] - b[2]);
console.log('lowest:', totals.slice(0, 12).map((t) => t.join(':')).join(' '));
